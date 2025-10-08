
# ConvoAI

An AI-powered conversational platform built with Next.js 15 that integrates real-time chat/video, background agents, and modern auth. The app leverages OpenAI/Google GenAI, Stream (chat/video), Inngest (events/agents), Drizzle ORM with Neon Postgres, and tRPC for type-safe APIs.

## Features

- **Next.js 15 App Router** with React 19 and Tailwind CSS v4.
- **Type-safe APIs** using `tRPC` and `zod`.
- **DB with Drizzle ORM** (Neon Postgres) and handy dev tools (`drizzle-kit studio`).
- **Background jobs & agents** powered by `inngest` and `@inngest/agent-kit`.
- **LLM integrations**: `openai` and `@google/genai`.
- **Realtime chat & video** via Stream (`stream-chat`, `@stream-io/video-react-sdk`).
- **Authentication** with `better-auth` and UI utilities.
- **Observability** with `winston` and OpenTelemetry transport.

## Tech Stack

- **Front-end**: Next.js 15, React 19, Tailwind CSS v4
- **Server**: Next.js API Routes (`src/app/api/**`), tRPC
- **Database**: Drizzle ORM, Neon Postgres
- **Background**: Inngest events/functions (`src/inngest/**`)
- **Realtime**: Stream Chat/Video SDKs
- **Auth**: better-auth, @polar-sh/better-auth
- **AI**: OpenAI SDK, Google GenAI SDK

## Project Structure

- `src/app/` — Next.js routes and UI
- `src/app/api/` — API routes (e.g., `webhook/route.ts`, `debug/hello/route.ts`)
- `src/inngest/` — Inngest `client.ts` and event `functions.ts`
- `src/modules/meetings/` — Feature modules (e.g., `server/procedures.ts`)

## Prerequisites

- Node.js 20+
- A Postgres database (Neon recommended)
- Accounts/keys for: OpenAI and/or Google GenAI, Stream, and (optionally) ngrok for webhooks

## Environment Variables

Create a `.env.local` at repo root. Only include the vars you use:

```ini
# Database (Neon example)
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require

# Auth
AUTH_SECRET=your-strong-random-secret

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Google GenAI (optional)
GOOGLE_API_KEY=...

# Stream (if using chat/video)
STREAM_API_KEY=...
STREAM_API_SECRET=...
STREAM_APP_ID=...

# Inngest (optional for cloud)
INNGEST_EVENT_KEY=...

# Next.js public config (examples)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Tip: Prefix client-exposed variables with `NEXT_PUBLIC_`.

## Setup

1. **Install deps**
   ```bash
   npm install
   ```
2. **Configure env** in `.env.local`.
3. **Prepare database**
   - Push schema: `npm run db:push`
   - Explore data: `npm run db:studio`

## Development

- **Run the app**: `npm run dev`
- App runs at `http://localhost:3000`

### Webhooks / Tunnels

If you need a public webhook URL during local dev, start ngrok (adjust script/host as needed):

```bash
npm run db:webhook
```

Update your providers (e.g., Stream, Inngest, auth callbacks) with the public URL.

### Inngest

- Client: `src/inngest/client.ts`
- Functions: `src/inngest/functions.ts`

Emit and handle events for background processing and AI agents. For cloud usage, set `INNGEST_EVENT_KEY` and configure your Inngest environment. For local dev, you can run the app and functions locally—refer to Inngest docs if you host the Inngest dev server.

### Stream (Chat/Video)

Configure keys in `.env.local`. Use the React SDKs to build real-time messaging and video. Ensure server-side token issuance is implemented where required.

## Scripts

- `dev` — Start Next.js dev server
- `build` — Build production bundle
- `start` — Start production server
- `lint` — Run ESLint
- `db:push` — Apply Drizzle migrations to DB
- `db:studio` — Launch Drizzle Studio
- `db:webhook` — Launch ngrok tunnel (customizable)

## Build & Deploy

1. Ensure env vars are set in your hosting provider.
2. Build: `npm run build`
3. Start: `npm run start`

This app works well on platforms like Vercel, Fly.io, or Render. If you use Vercel, add your env vars in the dashboard and make sure database and external services are reachable.

## Troubleshooting

- **DB connection issues**: Verify `DATABASE_URL` and Neon IP allowlist/SSL params.
- **Auth errors**: Ensure `AUTH_SECRET` is set and callback URLs match your domain.
- **LLM errors**: Check `OPENAI_API_KEY` / `GOOGLE_API_KEY` and model availability.
- **Stream tokens**: Server token generation must match the client initialization.
- **Events not firing**: Confirm Inngest keys/env and that functions are registered.

## License

Proprietary – internal project. Do not distribute without permission.