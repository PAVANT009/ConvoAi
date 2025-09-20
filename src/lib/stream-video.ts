import "server-only"

import { StreamClient } from "@stream-io/node-sdk";

// Prefer server-side API key; fall back to NEXT_PUBLIC if needed.
const SERVER_STREAM_API_KEY =
  process.env.STREAM_VIDEO_API_KEY || process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;

if (!SERVER_STREAM_API_KEY) {
  // This will surface clearly in logs if misconfigured.
  throw new Error("STREAM_VIDEO_API_KEY (or NEXT_PUBLIC_STREAM_VIDEO_API_KEY) is not set");
}

if (!process.env.STREAM_VIDEO_SECRET_KEY) {
  throw new Error("STREAM_VIDEO_SECRET_KEY is not set");
}

export const streamVideo = new StreamClient(
  SERVER_STREAM_API_KEY,
  process.env.STREAM_VIDEO_SECRET_KEY
);