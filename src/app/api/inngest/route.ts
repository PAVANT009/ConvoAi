import { NextResponse } from "next/server";
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { meetingsProcessing } from "@/inngest/functions";

const handler = serve({
  client: inngest,
  baseUrl: "http://localhost:8288",
  functions: [meetingsProcessing],
});

export async function PUT(req: Request) {
  if (req.headers.get("content-length") === "0") {
    return new NextResponse("OK", { status: 200 });
  }
  try {
    return await handler.PUT(req as any, new NextResponse());
  } catch (err) {
    console.error("Inngest PUT error:", err);
    return new NextResponse("Invalid JSON body", { status: 400 });
  }
}

export async function POST() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
export async function PATCH() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}