import JSNOL from "jsonl-parse-stringify"; 

import { inngest } from "@/inngest/client";
import { StreamTranscriptItem } from "@/modules/meetings/types";
import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { agents, meetings, user } from "@/db/schema";
import { createAgent, openai, TextMessage} from "@inngest/agent-kit";

const summarizer = createAgent({
    name: "summarizer",
    system: `You are an expert summarizer. You write readable, concise, simple content. You are given a transcript of a meeting and you need to summarize it.

Use the following markdown structure for every output:

### Overview
Provide a detailed, engaging summary of the session's content. Focus on major features, user workflows, and any key takeaways. Write in a narrative style, using full sentences. Highlight unique or powerful aspects of the product, platform, or discussion.

### Notes
Break down key content into thematic sections with timestamp ranges. Each section should summarize key points, actions, or demos in bullet format.

Example:
#### Section Name
- Main point or demo shown here
- Another key insight or interaction
- Follow-up tool or explanation provided

#### Next Section
- Feature X automatically does Y
- Mention of integration with Z
`.trim(),
    model: openai({model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY!})
})

export const meetingsProcessing = inngest.createFunction(
    { id: "meetings/processing" },
    { event: "meetings/processing" },
    async ({ event, step }) => {
        // 1) Fetch transcript
        const response = await step.run("fetch-transcript", async () => {
            console.log("[meetings/processing] fetch-transcript: starting", {
                meetingId: event.data.meetingId,
                url: event.data.transcriptUrl,
            });
            const res = await fetch(event.data.transcriptUrl);
            console.log("[meetings/processing] fetch-transcript: response", {
                meetingId: event.data.meetingId,
                status: res.status,
                ok: res.ok,
                contentType: res.headers.get("content-type"),
            });
            const text = await res.text();
            console.log("[meetings/processing] fetch-transcript: body preview", {
                meetingId: event.data.meetingId,
                length: text.length,
                preview: text.slice(0, 200),
            });
            if (!res.ok) {
                console.error("[meetings/processing] fetch-transcript: non-OK response", {
                    meetingId: event.data.meetingId,
                    status: res.status,
                    url: event.data.transcriptUrl,
                });
            }
            return text;
        });

        // 2) Parse transcript (JSONL). If parsing fails, fall back to raw text lines.
        const transcript = await step.run("parse-transcript", async () => {
            try {
                const parsed = JSNOL.parse<StreamTranscriptItem>(response);
                console.log("[meetings/processing] parse-transcript: parsed JSONL items", {
                    meetingId: event.data.meetingId,
                    count: Array.isArray(parsed) ? parsed.length : 0,
                    sample: Array.isArray(parsed) && parsed[0] ? parsed[0] : null,
                });
                return parsed;
            } catch (err) {
                // Fallback: treat each non-empty line as a transcript item with unknown speaker
                console.warn("[meetings/processing] parse-transcript: JSONL parse failed, using fallback lines", {
                    meetingId: event.data.meetingId,
                    error: (err as Error)?.message,
                });
                const fallback = response
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((content, idx) => ({
                        id: String(idx),
                        content, // not part of StreamTranscriptItem spec, but used as emergency fallback
                        speaker_id: "unknown",
                        start_ts: 0 as unknown as number,
                        stop_ts: 0 as unknown as number,
                        type: "segment" as unknown as string,
                    })) as unknown as StreamTranscriptItem[];
                console.log("[meetings/processing] parse-transcript: fallback items", {
                    meetingId: event.data.meetingId,
                    count: fallback.length,
                });
                return fallback;
            }
        });

        // 3) Join with speaker names, if available. Unknown if not found.
        const transcripWithSpeakers = await step.run("add-speakers", async () => {
            const speakerIds = [
                ...new Set(transcript.map((item) => item.speaker_id))
            ];
            console.log("[meetings/processing] add-speakers: unique speakerIds", {
                meetingId: event.data.meetingId,
                count: speakerIds.length,
                sample: speakerIds.slice(0, 5),
            });
            const userSpeakers = await db
                .select()
                .from(user)
                .where(inArray(user.id, speakerIds))
                .then((users) => 
                    users.map((user) => ({
                        ...user,
                    }))
                );
            const agentSpeakers = await db
                .select()
                .from(agents)
                .where(inArray(agents.id, speakerIds))
                .then((users) => 
                    users.map((user) => ({
                        ...user,
                    }))
                );
            const speakers = [...userSpeakers, ...agentSpeakers];
            console.log("[meetings/processing] add-speakers: fetched speakers", {
                meetingId: event.data.meetingId,
                userCount: userSpeakers.length,
                agentCount: agentSpeakers.length,
                total: speakers.length,
            });

            return transcript.map((item) => {
                const speaker = speakers.find(
                    (speaker) => speaker.id === item.speaker_id
                );

                if(!speaker) {
                    return {
                        ...item,
                        user: {
                            name: "Unknown",
                        }
                    }
                }

                return {
                    ...item,
                    user: {
                        name: speaker.name,
                    }
                }
            })
        });

        // 4) Summarize with robust error handling so we never leave status stuck in "processing"
        const { summary, error } = await step.run("summarize", async () => {
            try {
                console.log("[meetings/processing] summarize: starting", {
                    meetingId: event.data.meetingId,
                    transcriptItems: Array.isArray(transcripWithSpeakers) ? transcripWithSpeakers.length : 0,
                });
                const { output } = await summarizer.run(
                    "summarize the following transcript: " + JSON.stringify(transcripWithSpeakers)
                );
                const content = (output[0] as TextMessage).content as string;
                console.log("[meetings/processing] summarize: success", {
                    meetingId: event.data.meetingId,
                    contentPreview: content.slice(0, 120),
                });
                return { summary: content, error: null as unknown };
            } catch (err) {
                console.error("[meetings/processing] summarize: failed", {
                    meetingId: event.data.meetingId,
                    error: (err as Error)?.message,
                });
                return { summary: null as unknown as string, error: err };
            }
        });

        // 5) Save summary and ALWAYS mark completed; if summarization failed, save a fallback summary
        await step.run("save-summary", async () => {
            const fallbackSummary =
                typeof error !== "undefined" && error
                    ? "Summary generation failed. Transcript has been processed, but no summary could be generated."
                    : "No summary available.";

            await db
                .update(meetings)
                .set({
                    summary: summary || fallbackSummary,
                    status: "completed",
                })
                .where(eq(meetings.id, event.data.meetingId));
            console.log("[meetings/processing] save-summary: completed", {
                meetingId: event.data.meetingId,
                usedFallback: Boolean(!summary),
            });
        })
    },
);