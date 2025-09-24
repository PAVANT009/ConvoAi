// test-meetings.ts
import "dotenv/config";
import { db } from "@/db"; // adjust import if your db file path differs
import { meetings } from "@/db/schema";
import { desc } from "drizzle-orm";

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let result = `${hours}h`;
  if (remainingMinutes > 0) result += ` ${remainingMinutes}m`;
  if (remainingSeconds > 0) result += ` ${remainingSeconds}s`;

  return result;
}

async function main() {
  const rows = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.startedAt))
    .limit(5);

  const formatted = rows.map(row => {
  if (!row.startedAt || !row.endedAt) {
    return {
      id: row.id,
      name: row.name,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      duration: "N/A", // or whatever you want when missing
    };
  }

  const started = new Date(row.startedAt);
  const ended = new Date(row.endedAt);

  const durationSeconds = Math.floor(
    (ended.getTime() - started.getTime()) / 1000
  );

  return {
    id: row.id,
    name: row.name,
    startedAt: started,
    endedAt: ended,
    duration: formatDuration(durationSeconds),
  };
});

  console.log("🕒 Meetings with formatted durations:");
  formatted.forEach(m => console.log(m));
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
