import { useRef, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";

import { useTRPC } from "@/trpc/client";

import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
import { CallLobby } from "./call-lobby";

interface Props {
    meetingId: string;
    meetingName: string;
}

export const CallUI = ({ meetingId, meetingName }: Props) => {
    const call = useCall();
    const trpc = useTRPC();
    const { mutateAsync: connectAgent } = useMutation(
        trpc.meetings.connectAgent.mutationOptions()
    );
    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
    const agentConnectionRequested = useRef(false);

    const requestAgentConnection = async () => {
        if (agentConnectionRequested.current) {
            return;
        }

        agentConnectionRequested.current = true;

        try {
            const result = await connectAgent({ id: meetingId });
            console.log("AI agent connection requested:", {
                meetingId,
                status: result.status,
                model: result.model,
            });
        } catch (error) {
            agentConnectionRequested.current = false;
            console.error("Failed to connect AI agent:", error);
        }
    };

    const handleJoin = async () => {
        if (!call) {
            console.log("No call instance available for join");
            return;
        }

        const state = call.state.callingState;
        console.log("Attempting to join call:", {
            callId: call.id,
            currentState: state,
            meetingName,
        });

        if (state === "joining" || state === "joined" || state === "reconnecting") {
            console.log("Call already in progress, skipping join");
            setShow("call");
            void requestAgentConnection();
            return;
        }

        try {
            console.log("Joining call...");
            await call.join();
            console.log("Successfully joined call");

            setShow("call");
            console.log("Call joined, requesting AI agent...");
            void requestAgentConnection();
        } catch (error) {
            console.error("Failed to join call:", error);
        }
    };

    const handleLeave = () => {
        setShow("ended");
    };

    return (
        <StreamTheme className="h-full">
            {show === "lobby" && <CallLobby onJoin={handleJoin} />}
            {show === "call" && (
                <CallActive onLeave={handleLeave} meetingName={meetingName} />
            )}
            {show === "ended" && <CallEnded />}
        </StreamTheme>
    );
};
