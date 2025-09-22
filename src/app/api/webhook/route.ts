import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  CallEndedEvent,
  CallRecordingReadyEvent,
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
  CallTranscriptionReadyEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { inngest } from "@/inngest/client";

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

// Helper to extract meetingId from payload
function getMeetingId(payload: any): string | undefined {
  // Prefer custom.meetingId if present, else try splitting call_cid
  return payload?.call?.custom?.meetingId ||
    (payload?.call_cid && payload.call_cid.split(":")[1]);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = payload?.type;

  if (eventType === "test") {
    return NextResponse.json({ status: "ok", message: "Test webhook working" });
  }

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = getMeetingId(event);
    const callId = event.call.cid;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    const [existingMeeting] = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, meetingId),
          not(eq(meetings.status, "completed")),
          not(eq(meetings.status, "cancelled"))
        )
      );

    let meetingToProcess = existingMeeting;

    if (!existingMeeting) {
      const [anyMeeting] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));

      if (anyMeeting && anyMeeting.status === "upcoming") {
        const [updatedMeeting] = await db
          .update(meetings)
          .set({
            status: "active",
            startedAt: new Date(),
            streamCallId: callId,
          })
          .where(eq(meetings.id, meetingId))
          .returning();

        meetingToProcess = updatedMeeting;
      } else {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
    }

    if (meetingToProcess.status !== "active") {
      await db
        .update(meetings)
        .set({
          status: "active",
          startedAt: new Date(),
          streamCallId: callId,
        })
        .where(eq(meetings.id, meetingId));
    }

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, meetingToProcess.agentId));

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const extractedCallId = callId.includes(":") ? callId.split(":")[1] : callId;

    if (process.env.OPENAI_API_KEY) {
      const call = streamVideo.video.call("default", extractedCallId);

      try {
        const realtimeClient = await streamVideo.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: existingAgent.id,
          model: "gpt-4o-realtime-preview",
        });

        const basePrompt =
          existingAgent.prompt ||
          "You are a helpful AI meeting assistant. You should be friendly, professional, and helpful in meetings. Respond naturally to questions and provide useful insights. Always respond with your voice, not text.";

        // Enforce English-only speech output for the realtime session
        const prompt = `${basePrompt}\n\nLanguage policy: Speak only in English (en-US). Do not switch languages. If the user speaks another language, politely ask them in English to continue in English.`;

        await realtimeClient.updateSession({
          instructions: prompt,
          voice: (process.env.OPENAI_REALTIME_VOICE as
            | "verse"
            | "alloy"
            | "ash"
            | "ballad"
            | "coral"
            | "echo"
            | "sage"
            | "shimmer"
            | undefined) || "verse",
          modalities: ["text", "audio"],
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 200,
            silence_duration_ms: 700,
          },
        });

        const greeting =
          process.env.OPENAI_REALTIME_GREETING ||
          "Hi everyone, I'm your AI meeting assistant. I'm here to help with summaries and questions.";

        const anyClient: any = realtimeClient;

        if (typeof anyClient.createResponse === "function") {
          await anyClient.createResponse({
            instructions: greeting,
            modalities: ["audio"],
            conversation: true,
          });
        } else if (typeof anyClient.response?.create === "function") {
          await anyClient.response.create({
            instructions: greeting,
            modalities: ["audio"],
            conversation: true,
          });
        } else if (typeof anyClient.send === "function") {
          await anyClient.send({
            type: "response.create",
            response: {
              instructions: greeting,
              modalities: ["audio"],
              conversation: true,
            },
          });
        }

        realtimeClient.on("response", () => {});
        realtimeClient.on("speech_start", () => {});
        realtimeClient.on("speech_end", () => {});
        realtimeClient.on("transcription", () => {});
        realtimeClient.on("error", (err: any) => {
          console.error("Realtime client error:", err);
        });
        realtimeClient.on("status", () => {});
      } catch (err) {
        console.error("Failed to connect OpenAI realtime:", err);
      }
    }
    return NextResponse.json({ status: "ok" });
  }

  if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const callId = event.call_cid && event.call_cid.split(":")[1];

    if (!callId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    try {
      const call = streamVideo.video.call("default", callId);
      await call.end();
    } catch (err) {
      console.error("Error ending call:", err);
    }
    return NextResponse.json({ status: "ok" });
  }

  if (eventType === "call.session_ended") {
    const event = payload as CallEndedEvent;
    const meetingId = getMeetingId(event);

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    await db
      .update(meetings)
      .set({
        status: "processing",
        endedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));
    return NextResponse.json({ status: "ok" });
  }

  if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = getMeetingId(event);

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    const [updatedMeeting] = await db
      .update(meetings)
      .set({
        transcriptUrl: event.call_transcription.url,
      })
      .where(eq(meetings.id, meetingId))
      .returning();

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await inngest.send({
      name: "meetings/processing",
      data: {
        meetingId: updatedMeeting.id,
        transcriptUrl: updatedMeeting.transcriptUrl!,
      }
    })

    return NextResponse.json({ status: "ok" });
  }

  if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = getMeetingId(event);

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }
    await db
      .update(meetings)
      .set({
        recordingUrl: event.call_recording.url,
      })
      .where(eq(meetings.id, meetingId));
    return NextResponse.json({ status: "ok" });
  }

  // Unknown event type
  console.warn("Unknown webhook event type:", eventType);
  return NextResponse.json({ status: "ok" });
}