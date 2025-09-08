import { ResponsiveDialog } from "@/components/responsive-dialog";
import { MeetingForm } from "./meeting-form";
import { MeetingGetOne } from "../../types";

interface UpdateMeetingDialogProps {
    open: boolean;
    onOPenChange: (open: boolean) => void;
    initialValues?: MeetingGetOne;
}

export const UpdateMeetingDialog = ({
    open,
    onOPenChange,
    initialValues,
}: UpdateMeetingDialogProps) => {
    return (
        <ResponsiveDialog
        title="Edit Agent"
        description="Edit the meeting details"
        onOpenChange={onOPenChange}
        open={open}
        >
            <MeetingForm
                onSuccess={() => {
                    onOPenChange(false)
                }}
                onCancel={() => onOPenChange(false)}
                initialValues={initialValues}
            />
        </ResponsiveDialog>
    )
}