import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";
import { AgentGetOne } from "../../types";

interface UpdateAgentDialog {
    open: boolean;
    onOPenChange: (open: boolean) => void;
    initialValues: AgentGetOne;
}

export const UpdateAgentDialog = ({
    open,
    onOPenChange,
    initialValues
}: UpdateAgentDialog) => {
    return (
        <ResponsiveDialog
        title="Edit Agent"
        description="Edit the agent details"
        onOpenChange={onOPenChange}
        open={open}
        >
            <AgentForm
                onSuccess={() => onOPenChange(false)}
                onCancel={() => onOPenChange(false)}
                initialValues={initialValues}
            />
        </ResponsiveDialog>
    )
}