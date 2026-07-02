"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    Call,
    CallingState,
    StreamCall,
    StreamVideo,
    StreamVideoClient,
} from "@stream-io/video-react-sdk";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";

interface Props {
    meetingId: string;
    meetingName: string;
    streamCallId: string | null;
    userId: string;
    userName: string;
    userImage: string;
}

export const CallConnect = ({
    meetingId,
    meetingName,
    streamCallId,
    userId,
    userName,
    userImage,
}: Props) => {
    const trpc = useTRPC();
    const { mutateAsync: generateToken } = useMutation(
        trpc.meetings.generateToken.mutationOptions()
    );

    const [client, setClient] = useState<StreamVideoClient>();
    const [call, setCall] = useState<Call>();
    const callCreated = useRef(false); // Tracks if call has already been created

    // Initialize Stream client
    useEffect(() => {
        let isCancelled = false;

        const initClient = async () => {
            const token = await generateToken();
            if (isCancelled) return;

            const _client = new StreamVideoClient({
                apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                user: { id: userId, name: userName, image: userImage },
                token,
            });

            if (isCancelled) return;
            setClient(_client);
        };

        void initClient();

        return () => {
            isCancelled = true;
            client?.disconnectUser();
        };
    }, [userId, userName, userImage, generateToken]);

    // Initialize Stream call
    useEffect(() => {
        if (!client || !streamCallId || callCreated.current) return;

        console.log("🔄 CallConnect useEffect triggered:", {
            hasClient: !!client,
            streamCallId,
            meetingId,
        });

        const callId = streamCallId.includes(":") ? streamCallId.split(":")[1] : streamCallId;
        const _call = client.call("default", callId);

        _call.camera.disable();
        _call.microphone.disable();

        setCall(_call);
        callCreated.current = true;

        console.log("✅ Stream call instance created:", {
            callId: _call.id,
            state: _call.state.callingState,
        });

        return () => {
            console.log("🧹 Cleaning up call instance");
            if (_call.state.callingState !== CallingState.LEFT) {
                _call.leave();
                _call.endCall();
            }
            callCreated.current = false;
            setCall(undefined);
        };
    }, [client, streamCallId, meetingId]);

    if (!client || !call) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white" />
            </div>
        );
    }

    return (
        <StreamVideo client={client}>
            <div className="h-full">
                <StreamCall call={call}>
                    <CallUI meetingName={meetingName} />
                </StreamCall>
            </div>
        </StreamVideo>
    );
};
