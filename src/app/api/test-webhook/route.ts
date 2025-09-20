import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  console.log("🧪 Test webhook endpoint called");
  return NextResponse.json({ 
    status: "ok", 
    message: "Test webhook endpoint is working",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  console.log("🧪 Test webhook POST called");
  
  try {
    const body = await req.text();
    console.log("📦 Test webhook body:", body);
    
    return NextResponse.json({ 
      status: "ok", 
      message: "Test webhook POST received",
      body: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Test webhook error:", error);
    return NextResponse.json({ 
      status: "error", 
      message: "Test webhook failed",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
