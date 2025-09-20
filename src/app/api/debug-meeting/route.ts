import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');
  
  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId parameter" }, { status: 400 });
  }

  try {
    console.log("🔍 Debug: Fetching meeting data for:", meetingId);
    
    // Get meeting data
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Get agent data
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, meeting.agentId));

    console.log("🔍 Debug: Meeting data:", meeting);
    console.log("🔍 Debug: Agent data:", agent);

    return NextResponse.json({
      meeting,
      agent,
      hasStreamCallId: !!meeting.streamCallId,
      hasAgentPrompt: !!agent?.prompt,
      status: "ok"
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json({ 
      error: "Debug failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
