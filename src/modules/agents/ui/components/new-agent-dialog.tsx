import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";

interface NewAgentDialogProps {
    open: boolean;
    onOPenChange: (open: boolean) => void;
}

export const NewAgentDialog = ({
    open,
    onOPenChange,
}: NewAgentDialogProps) => {
    return (
        <ResponsiveDialog
        title="New Agent"
        description="Create a new Agent"
        onOpenChange={onOPenChange}
        open={open}
        >
            <AgentForm
                onSuccess={() => onOPenChange(false)}
                onCancel={() => onOPenChange(false)}
            />
        </ResponsiveDialog>
    )
}