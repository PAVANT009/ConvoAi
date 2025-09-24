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
  return (
    payload?.call?.custom?.meetingId ||
    (payload?.call_cid && payload.call_cid.split(":")[1])
  );
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const eventType = payload?.type;

  if (eventType === "test") {
    return NextResponse.json({ status: "ok", message: "Test webhook working" });
  }

  // -------------------------
  // CALL SESSION STARTED
  // -------------------------
  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = getMeetingId(event);
    const callId = event.call.cid;
    if (!meetingId)
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 }
      );

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
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
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
    if (!existingAgent)
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const extractedCallId = callId.includes(":")
      ? callId.split(":")[1]
      : callId;

    if (process.env.OPENAI_API_KEY) {
      try {
        const call = streamVideo.video.call("default", extractedCallId);
        const realtimeClient = await streamVideo.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: existingAgent.id,
          model: "gpt-4o-realtime-preview",
        });

        const basePrompt =
          existingAgent.prompt ||
          "You are a helpful AI meeting assistant. Speak naturally and professionally in English.";

        await realtimeClient.updateSession({
          instructions: basePrompt,
          voice:
            (process.env.OPENAI_REALTIME_VOICE as
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

        if (typeof (realtimeClient as any).createResponse === "function") {
          await (realtimeClient as any).createResponse({
            instructions: greeting,
            modalities: ["audio"],
            conversation: true,
          });
        } else if (
          typeof (realtimeClient as any).response?.create === "function"
        ) {
          await (realtimeClient as any).response.create({
            instructions: greeting,
            modalities: ["audio"],
            conversation: true,
          });
        } else if (typeof (realtimeClient as any).send === "function") {
          await (realtimeClient as any).send({
            type: "response.create",
            response: {
              instructions: greeting,
              modalities: ["audio"],
              conversation: true,
            },
          });
        }
      } catch (err) {
        console.error("Failed to connect OpenAI realtime:", err);
      }
    }

    return NextResponse.json({ status: "ok" });
  }

  // -------------------------
  // CALL PARTICIPANT LEFT
  // -------------------------
  if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const callId = event.call_cid && event.call_cid.split(":")[1];
    if (!callId)
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 }
      );

    try {
      await streamVideo.video.call("default", callId).end();
    } catch (err) {
      console.error("Error ending call:", err);
    }

    return NextResponse.json({ status: "ok" });
  }

  // -------------------------
  // CALL SESSION ENDED
  // -------------------------
  if (eventType === "call.session_ended") {
    const event = payload as CallEndedEvent;
    const meetingId = getMeetingId(event);
    if (!meetingId)
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 }
      );

    await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

    return NextResponse.json({ status: "ok" });
  }

  // -------------------------
  // CALL TRANSCRIPTION READY (Inngest Trigger)
  // -------------------------
  if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = getMeetingId(event);
    if (!meetingId)
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 }
      );

    const [updatedMeeting] = await db
      .update(meetings)
      .set({ transcriptUrl: event.call_transcription.url })
      .where(eq(meetings.id, meetingId))
      .returning();

    // DEDUPLICATION GUARD
    if (updatedMeeting.status !== "completed") {
      if (updatedMeeting.status !== "processing") {
        await db
          .update(meetings)
          .set({ status: "processing" })
          .where(eq(meetings.id, updatedMeeting.id));
      }
      const res = await inngest.send({
        name: "meetings/processing",
        data: {
          meetingId: updatedMeeting.id,
          transcriptUrl: updatedMeeting.transcriptUrl!,
        },
      });
      console.log("Inngest send response:", res);
    }

    return NextResponse.json({ status: "ok" }); // ✅ added
  }

  // -------------------------
  // CALL RECORDING READY
  // -------------------------
  if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = getMeetingId(event);
    if (!meetingId)
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 }
      );

    await db
      .update(meetings)
      .set({ recordingUrl: event.call_recording.url })
      .where(eq(meetings.id, meetingId));

    return NextResponse.json({ status: "ok" });
  }

  // -------------------------
  // UNKNOWN EVENT
  // -------------------------
  console.warn("Unknown webhook event type:", eventType);
  return NextResponse.json({ status: "ok" });
}
