"use client"

import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query";


const Homeview = () => {
  const trpc = useTRPC();
  const  {data} =useQuery(trpc.hello.queryOptions({ text: "Antonio"}))
  return (
    <div>
      {data?.greeting}
    </div>
  )
}

export default Homeview