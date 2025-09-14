import { and, eq, not} from "drizzle-orm";
import { NextRequest, NextResponse} from "next/server";

import {
    CallEndedEvent,
    MessageNewEvent,
    CallTranscriptionReadyEvent,
    CallSessionParticipantLeftEvent,
    CallRecordingReadyEvent,
    CallSessionStartedEvent
} from "@stream-io/node-sdk";

import { db } from "@/lib/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";

function verifySignatureWithSDK(body: string, signature: string): boolean {
    return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
    const signature = req.headers.get("x-signature") ;
    const apiKey = req.headers.get("x-api-key");

    if(!signature || !apiKey) {
        return NextResponse.json(
            { error: "Missing signature or API key" },
            { status: 400 }
        );
    }

    const body = await req.text();

    if(!verifySignatureWithSDK(body, signature)) {
        return NextResponse.json(
            { error: "Invalid signature" }, 
            { status: 401 });
    }

    let payload: unknown;
    try { 
        payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const evenType = (payload as Record<string, unknown>)?.type;

    if(evenType ===  "call.session_started") {
        const event = payload as CallSessionStartedEvent;
        const meetingId = event.call.custom?.meetingId;

        if(!meetingId) {
            return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
        }

        const [existingMeeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, meetingId),
                    not(eq(meetings.status, "completed")),
                    not(eq(meetings.status, "active")),
                    not(eq(meetings.status, "cancelled")),
                    not(eq(meetings.status, "processing"))
                )
            );
        
        if(!existingMeeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        await db
            .update(meetings)
            .set({
                status: "active",
                startedAt: new Date(),
            })
            .where(eq(meetings.id, meetingId));

        const [existingAgent] = await db
            .select()
            .from(agents)
            .where(eq(agents.id, existingMeeting.agentId));

        if(!existingAgent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const call = streamVideo.video.call("default",meetingId);
        const realtimeClient = await streamVideo.video.connectOpenAi({
            call,
            openAiApiKey: process.env.OPENAPIKEY!,
            agentUserId: existingAgent.id
        })
    }

    return NextResponse.json({ status: "ok" })
}

// app/api/webhook/route.ts


// import { and, eq, not } from "drizzle-orm";
// import { NextRequest, NextResponse } from "next/server";
// import {
//   CallEndedEvent,
//   MessageNewEvent,
//   CallTranscriptionReadyEvent,
//   CallSessionParticipantLeftEvent,
//   CallRecordingReadyEvent,
//   CallSessionStartedEvent
// } from "@stream-io/node-sdk";

// import { db } from "@/lib/db";
// import { agents, meetings } from "@/db/schema";
// import { streamVideo } from "@/lib/stream-video";
// import { chatWithGeminiOpenAI } from "@/lib/geminiClient";  // if using Gemini client

// function verifySignatureWithSDK(body: string, signature: string): boolean {
//   return streamVideo.verifyWebhook(body, signature);
// }

// export async function POST(req: NextRequest) {
//   const signature = req.headers.get("x-signature");
//   const apiKey = req.headers.get("x-api-key");

//   if (!signature || !apiKey) {
//     return NextResponse.json({ error: "Missing signature or API key" }, { status: 400 });
//   }

//   const body = await req.text();

//   if (!verifySignatureWithSDK(body, signature)) {
//     return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
//   }

//   let payload: any;
//   try {
//     payload = JSON.parse(body);
//   } catch (err) {
//     return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
//   }

//   const eventType = payload?.type;

//   if (eventType === "call.session_started") {
//     const event = payload as CallSessionStartedEvent;
//     const meetingId = event.call?.custom?.meetingId;

//     if (!meetingId) {
//       return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
//     }

//     const [existingMeeting] = await db
//       .select()
//       .from(meetings)
//       .where(
//         and(
//           eq(meetings.id, meetingId),
//           not(eq(meetings.status, "completed")),
//           not(eq(meetings.status, "active")),
//           not(eq(meetings.status, "cancelled")),
//           not(eq(meetings.status, "processing"))
//         )
//       );

//     if (!existingMeeting) {
//       return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
//     }

//     await db
//       .update(meetings)
//       .set({ status: "active", startedAt: new Date() })
//       .where(eq(meetings.id, meetingId));

//     const [existingAgent] = await db
//       .select()
//       .from(agents)
//       .where(eq(agents.id, existingMeeting.agentId));

//     if (!existingAgent) {
//       return NextResponse.json({ error: "Agent not found" }, { status: 404 });
//     }

//     const call = streamVideo.video.call("default", meetingId);

//     // Use Gemini client
//     const realtimeClient = await streamVideo.video.connectOpenAi({
//       call,
//       agentUserId: existingAgent.id,
//       openAiApiKey: process.env.GEMINI_API_KEY!,
//       // if needed: model or baseURL override
//     });

//     // after connecting, maybe do something more...
//   }

//   // handle other event types, e.g. message.new
//   // etc.

//   return NextResponse.json({ status: "ok" });
// }
