"use client";

import { LoaderIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { CallConnect } from "./call-connect";
import { generateAvatarUri } from "@/lib/avatar";
// import { generateAvatarUri } from "@/lib/avatar";

interface Props {
    meetingId: string;
    meetingName: string;
    streamCallId: string | null;
}

export const CallProvider = ({ meetingId, meetingName, streamCallId}: Props) => {
    const { data, isPending} = authClient.useSession();

    console.log("👤 CallProvider rendered:", {
        meetingId,
        meetingName,
        streamCallId,
        hasUserData: !!data,
        isPending
    });

    if(!data || isPending) {
        console.log("⏳ Waiting for user session...");
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white"/>
            </div>
        )
    }

    console.log("✅ User session loaded, passing data to CallConnect:", {
        userId: data.user.id,
        userName: data.user.name,
        streamCallId
    });

    return (
        <CallConnect
            meetingId={meetingId}
            meetingName={meetingName}
            streamCallId={streamCallId}
            userId={data.user.id}
            userName={data.user.name}
            userImage= {
                data.user.image ??
                generateAvatarUri({ seed: data.user.name, variant: "initials"})
            }
        />
    )
}