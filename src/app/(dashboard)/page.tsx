import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import Homeview from "@/modules/home/ui/views/home-view";
import { caller } from "@/trpc/server";

const page = async () => {
  const data = await caller.hello({text: "Antonio server"})
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if(!session) {
    redirect('/sign-in');
  }

  return <p>{data.greeting} </p>
  return <Homeview />
}

export default page