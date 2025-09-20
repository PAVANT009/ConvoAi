// ai-test.js
import { StreamClient } from "@stream-io/node-sdk";
import "dotenv/config";

// Make sure your .env has these keys
const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const STREAM_SECRET_KEY = process.env.STREAM_VIDEO_SECRET_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Use a valid callId: only lowercase letters, numbers, _ or -
const CALL_ID = "d8kpCdJX1GTowFGzMAqDQ"; // change to match your frontend callId

async function main() {
  const client = new StreamClient(STREAM_API_KEY, STREAM_SECRET_KEY);

  const call = client.video.call("default", CALL_ID);

  try {
    console.log("🔌 Connecting AI agent...");

    const realtimeClient = await client.video.connectOpenAi({
      call,
      openAiApiKey: OPENAI_API_KEY,
      agentUserId: "ai-agent-1", // must be a string
    });

    console.log("✅ AI agent connected");

    // Configure AI voice & behavior
    await realtimeClient.updateSession({
      instructions:
        "You are a helpful AI meeting assistant. Respond naturally in voice only.",
      voice: "verse", // choose available Stream TTS voice
      modalities: ["audio"], // ensures AI speaks
    });

    // Listen to AI status and errors
    realtimeClient.on("status", (status) => console.log("🤖 AI Status:", status));
    realtimeClient.on("error", (error) => console.error("❌ AI Error:", error));
  } catch (err) {
    console.error("❌ Failed:", err);
  }
}

main();
