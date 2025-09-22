"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
    Call,
    CallingState,
    StreamCall,
    StreamVideo,
    StreamVideoClient,
} from "@stream-io/video-react-sdk";

import { useTRPC } from "@/trpc/client";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useMutation } from "@tanstack/react-query";
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
    userImage
}: Props) => {
    const trpc = useTRPC();
    const generateTokenMutation = useMutation(trpc.meetings.generateToken.mutationOptions());
    const generateToken = useCallback(() => generateTokenMutation.mutateAsync(), [generateTokenMutation]);

    const [client, setClient] = useState<StreamVideoClient>();
    useEffect(() => {
        let isCancelled = false;

        const init = async () => {
            const token = await generateToken();
            if (isCancelled) return;

            const _client = new StreamVideoClient({
                apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                user: {
                    id: userId,
                    name: userName,
                    image: userImage,
                },
                token,
            });

            if (isCancelled) return;
            setClient(_client);
        };

        void init();

        return () => {
            isCancelled = true;
            if (client) {
                client.disconnectUser();
            }
            setClient(undefined);
        }
    },[userId, userName, userImage, generateToken]);

    const [call, setCall] = useState<Call>();
    useEffect(() => {
        console.log("🔄 CallConnect useEffect triggered:", {
            hasClient: !!client,
            streamCallId,
            meetingId
        });

        if(!client || !streamCallId) {
            console.log("❌ Missing client or streamCallId:", { hasClient: !!client, streamCallId });
            return;
        }

        console.log("📞 Creating Stream call with ID:", streamCallId);
        console.log("🔍 StreamCallId format check:", {
            original: streamCallId,
            hasColon: streamCallId.includes(':'),
            parts: streamCallId.split(':')
        });
        
        // Extract call ID from full call ID (remove type prefix if present)
        const callId = streamCallId.includes(':') ? streamCallId.split(':')[1] : streamCallId;
        console.log("🔧 Extracted call ID:", callId);
        
        const _call = client.call("default", callId);
        _call.camera.disable();
        _call.microphone.disable();
        setCall(_call);
        
        console.log("✅ Stream call instance created:", {
            callId: _call.id,
            state: _call.state.callingState
        });

        return () => {
            console.log("🧹 Cleaning up call instance");
            if(_call.state.callingState !== CallingState.LEFT) {
                _call.leave();
                _call.endCall();
                setCall(undefined);
            }
        }

    },[client, streamCallId]);

    if(!client || !call) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white" />
            </div> 
        )
    }
    return (
        <StreamVideo client={client}>
            <div className="h-full">
                <StreamCall call={call}>
                    <CallUI meetingName={meetingName}/>
                </StreamCall>
            </div>
        </StreamVideo>           
    )
}

