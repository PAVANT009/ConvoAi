import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import Homeview from "@/modules/home/ui/views/home-view";
import { caller } from "@/trpc/server";

export const dynamic = 'force-dynamic';

const page = async () => {
  const data = await caller.agents.getMany({}); 
  console.log(data);

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if(!session) {
    redirect('/sign-in');
  }

  return <Homeview data={data.items} />
}

export default page