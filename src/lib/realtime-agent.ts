import "server-only";

import type { RealtimeClient } from "@stream-io/openai-realtime-api";

import { streamVideo } from "@/lib/stream-video";

type EnsureRealtimeAgentConnectedParams = {
  meetingId: string;
  callId: string;
  agentId: string;
  agentPrompt?: string | null;
};

type EnsureRealtimeAgentConnectedResult =
  | { status: "connected"; model: string }
  | { status: "already_connected"; model: string };

const realtimeAgentConnections = new Map<string, RealtimeClient>();
const realtimeAgentConnectionAttempts = new Map<
  string,
  Promise<EnsureRealtimeAgentConnectedResult>
>();

export const ensureRealtimeAgentConnected = async ({
  meetingId,
  callId,
  agentId,
  agentPrompt,
}: EnsureRealtimeAgentConnectedParams): Promise<EnsureRealtimeAgentConnectedResult> => {
  const existingAttempt = realtimeAgentConnectionAttempts.get(meetingId);
  if (existingAttempt) {
    return existingAttempt;
  }

  const connectionAttempt = (async () => {
    const realtimeModel = process.env.OPENAI_REALTIME_MODEL?.trim();
    const resolvedModel = realtimeModel || "sdk-default";

    const existingConnection = realtimeAgentConnections.get(meetingId);
    if (existingConnection?.isConnected()) {
      return {
        status: "already_connected" as const,
        model: resolvedModel,
      };
    }

    existingConnection?.disconnect();

    const greeting =
      process.env.OPENAI_REALTIME_GREETING?.trim() ||
      "Hi everyone, I'm your AI meeting assistant. I'm here to help with summaries and questions.";

    const basePrompt =
      agentPrompt ||
      "You are a helpful AI meeting assistant. Speak naturally and professionally in English.";

    const sessionInstructions = `${basePrompt}

When you first join the call, immediately greet the participants once with a short spoken introduction. Use this greeting as the starting point: "${greeting}".
After the initial greeting, continue assisting naturally and do not repeat the greeting unless someone explicitly asks you to reintroduce yourself.`;

    const call = streamVideo.video.call("default", callId);
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: agentId,
      ...(realtimeModel ? { model: realtimeModel } : {}),
    });

    await realtimeClient.updateSession({
      instructions: sessionInstructions,
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

    realtimeClient.createResponse();
    realtimeAgentConnections.set(meetingId, realtimeClient);

    return {
      status: "connected" as const,
      model: resolvedModel,
    };
  })();

  realtimeAgentConnectionAttempts.set(meetingId, connectionAttempt);

  try {
    return await connectionAttempt;
  } finally {
    if (realtimeAgentConnectionAttempts.get(meetingId) === connectionAttempt) {
      realtimeAgentConnectionAttempts.delete(meetingId);
    }
  }
};
