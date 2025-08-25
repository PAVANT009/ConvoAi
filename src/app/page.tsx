"use client"

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
 const { data: session } = authClient.useSession() 
  const [name, setName] = useState("");        
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = () => {
    authClient.signUp.email(
      { email, name, password },
      {
        onError: (err) => {
          window.alert(err.error.message);
        },
        onSuccess: () => {
          window.alert("User created successfully");
        },
      }
    );
  };
  const onLogin = () => {
    authClient.signIn.email(
      { email, password },
      {
        onError: (err) => {
          window.alert(err.error.message);
        },
        onSuccess: () => {
          window.alert("Logged in successfully");
        },
      }
    );
  };


  if(session) {
    return <div className="p-4">
      You are logged in as {session.user.email}
      <Button onClick={ async ()=> authClient.signOut()}>
        Sign out
      </Button>
      </div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="flex flex-col gap-2 p-4">
        
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <Button onClick={onSubmit}>Create user</Button>
      </div>
      <div>

      </div>
      <div className="flex flex-col gap-2 p-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <Button onClick={onLogin}>Login user</Button>
      </div>
      <div>

      </div>
    </div>
  );
}


