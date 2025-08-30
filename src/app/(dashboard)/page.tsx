import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import Homeview from "@/modules/home/ui/views/home-view";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if(!session) {
    redirect('/sign-in');
  }
  return <Homeview />
}

export default page