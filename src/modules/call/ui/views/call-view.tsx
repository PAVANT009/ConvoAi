"use client"

import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CallProvider } from "../components/call-provider";

interface Props {
    meetingId: string;
};

export const CallView = ({
    meetingId
}: Props) => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.meetings.getOne.queryOptions({ id: meetingId }));

    console.log("📋 CallView rendered with data:", {
        meetingId,
        meetingName: data.name,
        streamCallId: data.streamCallId,
        status: data.status,
        hasStreamCallId: !!data.streamCallId
    });

    if(data.status === "completed") {
        console.log("⚠️ Meeting is completed, showing error state");
        return (
            <div className="flex h-screen items-center justify-center">
                <ErrorState 
                    title="Meeting has ended"
                    description="You can no longer join this meeting"
                />
            </div>
        )
    }

    if (!data.streamCallId) {
        console.log("❌ No streamCallId found for meeting:", meetingId);
        return (
            <div className="flex h-screen items-center justify-center">
                <ErrorState 
                    title="Call not available"
                    description="Stream call ID is missing. Please try refreshing the page."
                />
            </div>
        )
    }

    return (
        <div className="h-screen">
            <CallProvider 
                meetingId={meetingId} 
                meetingName={data.name} 
                streamCallId={data.streamCallId}
            />
        </div>

    )
}