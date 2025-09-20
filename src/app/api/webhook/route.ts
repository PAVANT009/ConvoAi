import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  console.log("📩 Webhook received");
  console.log("📩 Headers:", {
    signature: req.headers.get("x-signature"),
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent")
  });

  const signature = req.headers.get("x-signature");

  if (!signature) {
    console.log("❌ Missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  if (!verifySignatureWithSDK(body, signature))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = payload?.type;
  console.log("👉 Event type:", eventType);
  console.log("📦 Full payload:", JSON.stringify(payload, null, 2));

  // Handle test events
  if (eventType === "test") {
    console.log("🧪 Test webhook received");
    return NextResponse.json({ status: "ok", message: "Test webhook working" });
  }

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId;
    const callId = event.call.cid; // <-- Use call.cid instead of call.id

    console.log("🎉 Call session started webhook:", {
      meetingId,
      callId,
      customData: event.call.custom,
      callCid: event.call.cid
    });

    if (!meetingId) {
      console.log("❌ Missing meeting ID in webhook");
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
      console.log("❌ Meeting not found in database:", meetingId);
      
      // Debug: Check if meeting exists with any status
      const [anyMeeting] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));
        
      if (anyMeeting) {
        console.log("🔍 Meeting exists but with wrong status:", {
          id: anyMeeting.id,
          status: anyMeeting.status,
          streamCallId: anyMeeting.streamCallId
        });
        
        // If meeting exists but has wrong status, try to update it
        if (anyMeeting.status === "upcoming") {
          console.log("🔄 Updating meeting status from upcoming to active");
          const [updatedMeeting] = await db
            .update(meetings)
            .set({
              status: "active",
              startedAt: new Date(),
              streamCallId: callId,
            })
            .where(eq(meetings.id, meetingId))
            .returning();
            
          console.log("✅ Meeting updated successfully:", updatedMeeting);
          meetingToProcess = updatedMeeting;
        } else {
          return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }
      } else {
        console.log("🔍 Meeting does not exist at all in database");
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
    }

    console.log("📊 Found existing meeting:", {
      meetingId: meetingToProcess.id,
      currentStatus: meetingToProcess.status,
      currentStreamCallId: meetingToProcess.streamCallId
    });

    // Mark meeting active and save Stream call ID (if not already done)
    if (meetingToProcess.status !== "active") {
      console.log("🔄 Updating meeting status to active and saving call ID:", callId);
      await db
        .update(meetings)
        .set({
          status: "active",
          startedAt: new Date(),
          streamCallId: callId, // <-- save Stream call.id here
        })
        .where(eq(meetings.id, meetingId));

      console.log("✅ Meeting updated successfully");
    } else {
      console.log("✅ Meeting already active, skipping status update");
    }

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, meetingToProcess.agentId));

    if (!existingAgent) {
      console.log("❌ Agent not found for ID:", meetingToProcess.agentId);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    console.log("🤖 Found agent:", {
      id: existingAgent.id,
      name: existingAgent.name,
      agentId: existingAgent.agentId,
      prompt: existingAgent.prompt,
      hasPrompt: !!existingAgent.prompt
    });

    // Extract call ID from full call ID (remove type prefix if present)
    const extractedCallId = callId.includes(':') ? callId.split(':')[1] : callId;
    console.log("🔧 Webhook: Extracted call ID for AI agent:", {
      original: callId,
      extracted: extractedCallId
    });

    // Only attempt AI connection if OpenAI key is available
    if (process.env.OPENAI_API_KEY) {
      const call = streamVideo.video.call("default", extractedCallId);

      try {
        console.log("🤖 Attempting to connect AI agent:", {
          agentId: existingAgent.id,
          callId: extractedCallId,
          hasOpenAIKey: !!process.env.OPENAI_API_KEY
        });

        const realtimeClient = await streamVideo.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: existingAgent.id,
          model:"gpt-4o-realtime-preview"
        });

        console.log("🤖 Realtime client connected successfully");

        const prompt = existingAgent.prompt || "You are a helpful AI meeting assistant. You should be friendly, professional, and helpful in meetings. Respond naturally to questions and provide useful insights. Always respond with your voice, not text.";
        console.log("🤖 Using AI prompt:", prompt);
        
        // Configure the AI for voice responses
        // Set modalities to include audio and choose a default voice
        await realtimeClient.updateSession({
          instructions: prompt,
          // Common voice names: 'alloy', 'verse', 'aria' (depends on OpenAI Realtime support)
          voice: (process.env.OPENAI_REALTIME_VOICE as any) || 'verse',
          modalities: ['text', 'audio'] as any,
          // Encourage the model to detect when a human finishes speaking and respond
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 200,
            silence_duration_ms: 700,
          } as any,
        });
        console.log("✅ AI session updated with instructions");
        
        // Proactively greet participants so users can hear the agent without speaking first
        const greeting = process.env.OPENAI_REALTIME_GREETING 
          || "Hi everyone, I'm your AI meeting assistant. I'm here to help with summaries and questions.";

        try {
          // Try known SDK shapes to trigger a response with audio
          const anyClient: any = realtimeClient as any;
          let resp: any | undefined;

          if (typeof anyClient.createResponse === 'function') {
            resp = await anyClient.createResponse({
              instructions: greeting,
              modalities: ['audio'],
              conversation: true,
            });
          } else if (typeof anyClient.response?.create === 'function') {
            resp = await anyClient.response.create({
              instructions: greeting,
              modalities: ['audio'],
              conversation: true,
            });
          } else if (typeof anyClient.send === 'function') {
            // Fallback to raw protocol event compatible with OpenAI Realtime
            await anyClient.send({
              type: 'response.create',
              response: {
                instructions: greeting,
                modalities: ['audio'],
                conversation: true,
              },
            });
            resp = { type: 'response.create', response: { instructions: greeting } };
          } else {
            console.warn("⚠️ Proactive greeting method not found on realtime client; skipping initial speak");
          }

          if (resp) {
            console.log("🗣️ Proactive greeting triggered:", resp);
          }
        } catch (greetErr) {
          console.error("❌ Failed to trigger proactive greeting:", greetErr);
        }
        
        // Add event listeners to track AI behavior
        realtimeClient.on('response', (response: any) => {
          console.log("🤖 AI Response received:", response);
        });
        
        realtimeClient.on('speech_start', () => {
          console.log("🎤 AI started speaking");
        });
        
        realtimeClient.on('speech_end', () => {
          console.log("🔇 AI finished speaking");
        });
        
        realtimeClient.on('transcription', (transcription: any) => {
          console.log("📝 User speech transcribed:", transcription);
        });
        
        realtimeClient.on('error', (error: any) => {
          console.error("🤖 AI Error:", error);
        });
        
        realtimeClient.on('status', (status: any) => {
          console.log("🤖 AI Status:", status);
        });
      } catch (error) {
        console.error("❌ Failed to connect AI agent:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error
        });
        
        // Don't fail the webhook if AI connection fails
        console.log("⚠️ Continuing without AI agent connection");
      }
    } else {
      console.log("⚠️ No OpenAI API key found, skipping AI agent connection");
    }
  }

  else if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1];
    const callId = event.call_cid.split(":")[1]; // Extract call ID from call_cid
    
    console.log("👋 Participant left webhook:", {
      meetingId,
      callId,
      callCid: event.call_cid
    });
    
    if (!meetingId) return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });

    const call = streamVideo.video.call("default", callId);
    await call.end();
    console.log("✅ Call ended for meeting:", meetingId);
  }

  return NextResponse.json({ status: "ok" });
}
