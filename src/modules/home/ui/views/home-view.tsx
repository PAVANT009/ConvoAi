"use client"

import type { InferModel } from "drizzle-orm";
import { agents } from "@/db/schema";

// Single row type
type Agent = InferModel<typeof agents>;

type HomeviewProps = {
  data: Agent[];
};

const Homeview = ({ data }: HomeviewProps) => {
  return (
    <div>
      {data.map((agent) => (
        <div key={agent.id}>
          <p>{agent.name}</p>
          <p>{agent.instructions}</p>
          <p>{agent.createdAt.toString()}</p>
        </div>
      ))}
    </div>
  )
}

export default Homeview;
