# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Mood Tracker - A privacy-first mood tracking app with a "Bring Your Own Storage" (BYOS) architecture where users sync data to their own Google Drive or Dropbox.

## Architecture

This is a **transitional monorepo** with two separate applications:

- **Root level**: Next.js backend (in development) - authentication, database, API routes
- **`client/` directory**: Vite + React SPA (production) - the current deployed frontend

The client app uses localStorage for data persistence, with cloud sync to user-owned storage (Google Drive) already implemented. See `GDPR_ANALYSIS.md` for the BYOS/BYOK privacy reasoning.

### Key Data Flow
- Mood entries stored in localStorage key: `mood-tracker.daily.entries`
- Entry format: `{ [dateString]: MoodEntry }` where MoodEntry has `firstMood`, optional `secondMood`, and optional `note`

## Commands

### Client (Vite SPA) - Primary Development
```bash
cd client
npm run dev          # Dev server on port 5173
npm run build        # Build to client/dist
npm run lint         # ESLint
npm run test         # Run tests: tsx --test src/utils/__tests__/*.test.ts
```

### Root (Next.js Backend) - Future Development
```bash
npm run dev          # Dev server on port 3000
npm run build        # Build Next.js
npm run lint         # ESLint
npm run type-check   # TypeScript checking (tsc --noEmit)
```

## Tech Stack

**Client**: React 19, Vite 7, TypeScript, Tailwind CSS 4, Framer Motion, Recharts

**Backend** (planned): Next.js 16, NextAuth v5, Prisma, PostgreSQL

## Client Structure

```
client/src/
├── components/     # React UI (DailyMoodSelector, DailyMoodGrid, MonthlyMoodChart, etc.)
├── utils/          # Helpers and types (appHelpers.ts, data.ts, dateHelpers.ts, types.ts)
├── constants/      # Mood definitions (moods.ts, moodWeights.ts, breakpoints.ts)
└── App.tsx         # Main component with state management
```

## Database Schema (Prisma)

Key model for mood data:
- `MoodEntry`: userId, entryDate, firstMood, secondMood (optional), note (optional)
- Unique constraint on `[userId, entryDate]`

## Environment Variables

Client-side (prefix with `VITE_`):
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth for Drive sync
- `VITE_DROPBOX_CLIENT_ID` - Dropbox OAuth

Server-side (see `.env.example`):
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`

## Deployment

Vercel deploys the client SPA from `client/dist` (configured in `vercel.json`).
