import { useTRPC } from "@/trpc/client";
import { AgentGetOne } from "../../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Textarea } from "@/components/ui/textarea";
import { GenerateAvatar } from "@/components/generated-avatar";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

import { agentsInsertSchema } from "../../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Router from "next/router";

interface AgentFormProps {
    onSuccess? : () => void;
    onCancel? : () => void;
    initialValues?: AgentGetOne;
};

export const AgentForm = ({
    onSuccess,
    onCancel,
    initialValues,
}:AgentFormProps) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createAgent = useMutation(
        trpc.agents.create.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(
                    trpc.agents.getMany.queryOptions({})
                );
                await queryClient.invalidateQueries(
                    trpc.premium.getFreeUsage.queryOptions(),
                );

                onSuccess?.()
            },
            onError: (error) => {
                toast.error(error.message);

                if(error.data?.code === "FORBIDDEN") {
                    Router.push("/upgrade");
                }
            },
        })
    );

    const updateAgent = useMutation(
        trpc.agents.update.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries(
                    trpc.agents.getMany.queryOptions({})
                );

                if (initialValues?.id) {
                    queryClient.invalidateQueries(
                        trpc.agents.getOne.queryOptions({
                            id: initialValues.id
                        })

                    )
                }
                onSuccess?.()
            },
            onError: (error) => {
                toast.error(error.message);

                //TODO: Check if error code is "FORBIDDEN", redirect to "/upgrade"
            },
        })
    );

    const form = useForm<z.infer<typeof agentsInsertSchema>>({
        resolver: zodResolver(agentsInsertSchema),
        defaultValues: {
            name: initialValues?.name ?? "",
            agentId: initialValues?.agentId ?? "",
            prompt: initialValues?.prompt ?? "You are a helpful AI voice assistant for meetings. Speak naturally and conversationally. Be friendly, professional, and helpful. Keep responses concise and engaging. Always respond with your voice, not text.",
        }
    });
    const isEdit = !!initialValues?.id;
    const isPending = createAgent.isPending || updateAgent.isPending;

    const onSubmit = (values: z.infer<typeof agentsInsertSchema>) => {
        if(isEdit) {
            updateAgent.mutate({
                ...values, id: initialValues.id
            })
        }else {
            createAgent.mutate(values);
        }
    }

    return (
        <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <GenerateAvatar
                    seed={form.watch("name")}
                    Variant="botttsNeutral"
                    className="border size-16"
                />
                <FormField
                    name="name"
                    control={form.control}
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="Rakesh" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    name="agentId"
                    control={form.control}
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Agent ID</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="agent-123" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    name="prompt"
                    control={form.control}
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>AI Prompt</FormLabel>
                            <FormControl>
                                <Textarea 
                                    {...field} 
                                    placeholder="You are a helpful AI voice assistant for meetings. Speak naturally and conversationally. Be friendly, professional, and helpful. Keep responses concise and engaging. Always respond with your voice, not text."
                                    className="min-h-[100px]"
                                />
                            </FormControl>
                            <FormDescription>
                                Customize how the AI agent behaves in meetings
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div
                    className="flex justify-between gap-x-2"
                >
                    {onCancel && (
                        <Button
                            variant={"ghost"}
                            disabled={isPending}
                            type="button"
                            onClick={() => onCancel()}
                            
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        disabled = {isPending}
                        type="submit"
                    >
                        {isEdit ? "Update" : "Create"}
                    </Button>
                </div>
            </form>
        </Form>
    )
} 

