// import { serve } from "inngest/next";
// import { inngest } from "@/inngest/client";
// import { meetingsProcessing } from "@/inngest/functions";

// export const { GET, POST, PUT } = serve({
//   client: inngest,
//   // baseUrl: "http://localhost:3000/api/inngest",
//   functions: [meetingsProcessing],
// });

// // export const config = {
// //   api: {
// //     bodyParser: false, 
// //   },
// // };

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { meetingsProcessing } from "@/inngest/functions";

const handler = serve({
  client: inngest,
  functions: [meetingsProcessing],
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;