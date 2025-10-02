import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function GET() {
  const res = await inngest.send({
    name: "debug/hello",
    data: { source: "manual-trigger" },
  });

  return NextResponse.json({
    status: "sent",
    event: "debug/hello",
    inngest: res,
  });
}

export async function POST() {
  return GET();
}
