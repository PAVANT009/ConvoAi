import { useState } from "react";

import { StreamTheme, useCall } from "@stream-io/video-react-sdk";
import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
interface Props {
    meetingName: string;
}

export const CallUI = ({ meetingName}: Props) => {
    const call = useCall();
    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");

    const handleJoin = async () => {
    if(!call) {
        console.log("❌ No call instance available for join");
        return;
    }

    const state = call.state.callingState;
    console.log("🔄 Attempting to join call:", {
        callId: call.id,
        currentState: state,
        meetingName
    });

    // Avoid calling join more than once
    if (state === "joining" || state === "joined" || state === "reconnecting") {
        console.log("⚠️ Call already in progress, skipping join");
        setShow("call");
        return;
    }

    try {
        console.log("📞 Joining call...");
        await call.join();
        console.log("✅ Successfully joined call");
        
        // Add a small delay to let the webhook process
        setTimeout(() => {
            console.log("🔄 Call joined, checking for AI agent...");
        }, 2000);
        
        setShow("call");
    } catch (error) {
        console.error("❌ Failed to join call:", error);
    }
    };

    const handleLeave = () => {
        if(!call) return;

        call.endCall();
        setShow("ended");
    };

    return (
        <StreamTheme className="h-full">
            {show === "lobby" && <CallLobby onJoin={handleJoin}/>}
            {show === "call" && <CallActive onLeave={handleLeave} meetingName={meetingName} />}
            {show === "ended" && <CallEnded/>}
        </StreamTheme>
    )

}