import { ResponsiveDialog } from "@/components/responsive-dialog";
import { useRouter } from "next/navigation";
import { MeetingForm } from "./meeting-form";

interface NewMeetingDialogProps {
    open: boolean;
    onOPenChange: (open: boolean) => void;
}

export const NewMeetingDialog = ({
    open,
    onOPenChange,
}: NewMeetingDialogProps) => {
    const router = useRouter()
    return (
        <ResponsiveDialog
        title="New Agent"
        description="Create a new Meeting"
        onOpenChange={onOPenChange}
        open={open}
        >
            <MeetingForm
                onSuccess={(id) => {
                    onOPenChange(false)
                    router.push(`/meetings/${id}`)
                }}
                onCancel={() => onOPenChange}
            />
        </ResponsiveDialog>
    )
}