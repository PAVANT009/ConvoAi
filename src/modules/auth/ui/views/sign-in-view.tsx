"use client"

import {z} from "zod";
import Link from "next/link";
import { OctagonAlertIcon } from "lucide-react";
import {zodResolver} from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { 
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";
import Image from "next/image"
import { useForm } from "react-hook-form";
import { useState } from "react";

const formsSchema = z.object({
    email: z.email(),
    password: z.string().min(1,{message: "Password is required"})
});


const SignInView = () => {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form  = useForm<z.infer<typeof formsSchema>>({
        resolver: zodResolver(formsSchema),
        defaultValues: {
        email: "",
        password: "",
    },
    })

    const onSubmit = async (data: z.infer<typeof formsSchema>) => {
        setError(null);
        setLoading(true);
        await authClient.signIn.email(
            {
                email: data.email,
                password: data.password,
            },
            {
                onSuccess: () => {
                    setLoading(false);
                    router.push("/");
                },
                onError: ({error}) => {
                    setLoading(false);
                    setError(error.message)
                }
            }
        );
    }
  return (
    <div className="flex flex-col gap-6">
        <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center text-center">
                                <h1 className="text-2xl font-bold"> 
                                    Welcome back
                                </h1>
                                <p className="text-muted-foreground text-balance">
                                    Login to your account
                                </p>
                            </div>
                            <div className="grid gap-3">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input 
                                                type="email"
                                                placeholder="example@gmail.com" {...field}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid gap-3">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input 
                                                type="password"
                                                placeholder="**********" {...field}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {!!error && (
                                <Alert className="bg-destructive/10 border-none">
                                <OctagonAlertIcon className="h-5 w-5 !text-destructive"/>
                                <AlertTitle>{error}</AlertTitle>
                                </Alert>
                            )}
                            <Button disabled={loading} className="w-full" type="submit">
                                Sign in
                            </Button>
                            <div className="after:border-border relative text-center after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                                <span className="bg-card text-muted-foreground relative z-10 px-2 text-sm">
                                    Or continue with
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button disabled={loading} variant="outline" className="w-full" type="button"> Google </Button>
                                <Button disabled={loading} variant="outline" className="w-full" type="button"> Github </Button>
                            </div>
                            <div className="text-center text-sm">
                                Don&apos;t have an account?{" "} <Link className="underline underline-offset-4" href={"/sign-up"}> Sign up</Link>
                            </div>
                        </div>
                    </form>
                </Form>
                <div
                className="bg-radial from-green-700 to-green-900 relative hidden md:flex flex-col gap-y-4 items-center justify-center">
                    <Image  src="/logo.svg" alt="Image" width="92" height={92}/>
                    <p className="text-2xl font-semibold text-white">
                        Convo./AI
                    </p>
                </div>
            </CardContent>
        </Card>
        <div className="text-muted-foreground *[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
            By signing in you agree to our{" "} <a href="#">Terms of Service</a> <a href="#">Privacy Policy </a>
        </div>
    </div>
  )
}

export default SignInView
