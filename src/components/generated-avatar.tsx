import { createAvatar} from "@dicebear/core";
import { botttsNeutral, initials} from "@dicebear/collection";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

interface GenerateAvatarProps {
    seed: string;
    className?: string;
    Variant: "botttsNeutral" | "initials";
}

export const GenerateAvatar = ({
    seed,
    className,
    Variant
}: GenerateAvatarProps) => {
    let avatar;

    if(Variant === "botttsNeutral") {
        avatar = createAvatar(botttsNeutral, {
            seed,
        })
    } else {
        avatar = createAvatar(initials, {
            seed,
            fontWeight: 500,
            fontSize: 42
        })
    }
    return (
        <Avatar className={cn(className)}>
            <AvatarImage src={avatar.toDataUri()} alt="Avatar"/>
            <AvatarFallback>
                {seed.charAt(0).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    )
}