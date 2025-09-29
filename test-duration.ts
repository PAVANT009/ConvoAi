// // test-duration.ts
// import "dotenv/config";
// import { db } from "@/db";               
// import { meetings } from "@/db/schema";  

// async function main() {
//   const rows = await db.select().from(meetings).limit(5);

//   for (const row of rows) {
//     console.log({
//       id: row.id,
//       duration: row.duration,
//       type: typeof row.duration,
//       startedAt: row.startedAt,
//       endedAt: row.endedAt,
//     });
//   }

//   process.exit(0);
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
