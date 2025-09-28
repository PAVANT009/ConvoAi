import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import Homeview from "@/modules/home/ui/views/home-view";
import { caller } from "@/trpc/server";

export const dynamic = 'force-dynamic';

const page = async () => {
  // Check session FIRST
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if(!session) {
    redirect('/sign-in');
  }

  // Now call the protected procedure after confirming auth
  const data = await caller.agents.getMany({}); 

  return <Homeview data={data.items} />
}

export default page