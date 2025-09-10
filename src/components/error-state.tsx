import { AlertCircleIcon } from "lucide-react";
 
interface Props {
    title: string;
    description: string;
}

export const ErrorState = ({
    title,
    description
}: Props) => {
    return (
        <div className="py-4 px-8 flex flex-1 items-center justify-center">
            <div className="flex py-4 px-8 flex-col items-center justify-center gap-y-6 bg-background rounded-lg">
                <AlertCircleIcon className="size-6  text-red-500" />
                <div className="flex flex-col gap-y-2 text-center">
                    <h6 className="text-lg font-medium text-center">{title}</h6>
                    <p className="text-sm">{description}</p>
                </div>
            </div>
        </div>
    )
}
