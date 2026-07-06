# Daily Mood Tracker

A privacy-first mood tracking app that runs entirely in your browser. Log how you feel each day using a simple color-coded system, then look back at your weeks, months, and year to spot patterns in your emotional well-being. No accounts, no servers, no tracking — your data stays yours.

## Link
https://daily-mood-tracker-blue.vercel.app/

## App Screenshot
<img width="1509" height="819" alt="Screenshot 2026-03-18 at 11 17 15" src="https://github.com/user-attachments/assets/093c01b7-6833-4ea1-baa2-04190e9d4ccc" />

## Features

### Mood Logging

- **Five mood levels** — Great (blue), Good (green), Okay (yellow), Bad (red), and Awful (black). Each mood is mapped to a distinct color that carries through every visualization in the app.
- **Split-day tracking** — Toggle "Split this day between two moods" to record a morning mood and an afternoon mood separately. Split days render as a diagonal two-color cell in the year grid.
- **Daily notes** — Attach an optional note (up to 500 characters) to any day. Notes are preserved during merges and backups, with per-entry conflict resolution when two versions of the same note collide.
- **Edit any past day** — Click any cell in the year-at-a-glance grid to jump to that day's entry. The selector updates to show the selected date and lets you change the mood or note. Clicking anywhere outside the grid or selector resets back to today.

### Yearly Overview

Toggle "Show yearly overview" to expand a full analytics dashboard for the selected year:

- **Year-at-a-glance grid** — A color-coded grid showing every day of the year. Available in two orientations:
  - **12x31** (months as rows, days as columns) — compact, fits the full year horizontally
  - **31x12** (days as rows, months as columns) — wider cells, easier to read individual months

  Each cell shows the mood color (or a diagonal split for dual-mood days), highlights today with a ring, and marks the currently selected day. Days with only a note (no mood) display a subtle note-only indicator. Hovering a cell shows a tooltip with the date and mood(s).

- **Insight pills** — Automatic highlights calculated from your data:
  - **Best month** — the month with the highest weighted mood average (prioritizes fully-completed months when available)
  - **Toughest month** — the month with the lowest weighted mood average
  - **Total days tracked** — total entries logged for the selected year

  Mood scoring uses weighted values (Great = highest, Awful = lowest) divided by the number of days tracked that month.

- **Mood accumulation table** — A heat-mapped table showing the count of each mood per month, with a totals row at the bottom. Cell colors intensify proportionally — a month where every day was "Great" shows a fully saturated blue cell, while a month with only a few "Great" days shows a lighter tint. Text color automatically adjusts for contrast against the background.

- **Distribution by month chart** — A 100% stacked bar chart (built with Recharts) showing the percentage breakdown of each mood per month. Useful for spotting shifts in mood distribution across the year.

- **Mood legend** — Color-coded legend displayed alongside the overview for quick reference.

### Multi-Year Support

- Navigate between years using the year selector. The selector dynamically shows all years that have at least one entry, plus the current year.
- All visualizations (grid, chart, table, insight pills) update to reflect the selected year.

### Data Management

All data operations are accessible through the settings menu (hamburger icon in the top corner):

- **Backup** — Export all mood entries to a timestamped JSON file (`mood-tracker-backup-YYYY-MM-DD.json`). The backup includes a version field and the complete entries map.
- **Restore** — Import a previously exported JSON backup. The restore process:
  1. Validates the file format and version
  2. Shows a confirmation modal with the number of incoming entries
  3. Merges incoming entries with existing data (incoming moods overwrite, existing notes are preserved by default)
  4. For each note conflict (both sides have a different note for the same date), prompts with a side-by-side comparison to choose "Use Incoming" or "Keep Current"
  5. Reports success or failure via modal
- **Clear** — Delete all entries after a confirmation prompt showing exactly how many entries will be removed.

### Cloud Sync (BYOS — Bring Your Own Storage)

Sync mood data across devices using your own cloud storage. Data is written directly to your personal Google Drive — it never passes through any intermediary server.

- **Google Drive** — Authenticates via Google's OAuth redirect flow (no popups, so it works reliably on mobile browsers and with strict cross-origin policies), stores data as `mood-tracker-data.json` in Drive's hidden `appDataFolder` (invisible in your Drive UI, scoped only to this app). Tokens persist in localStorage with expiry checking and automatic reconnection on reload.
- **Dropbox** — Provider implemented with PKCE OAuth flow (currently disabled in the UI while the callback handler is being finalized).
- **Backup to Drive** — Pushes your current local entries to Drive, overwriting the remote file.
- **Restore from Drive** — Pulls the remote file and merges it with local entries using the same merge strategy as JSON restore, including per-note conflict resolution.
- **Status indicators** — Real-time badge showing sync state: Idle, Syncing, Synced, or Error, along with last sync timestamp.
- **Connect/Disconnect** — Connect to a provider from the Cloud Sync panel in settings. Disconnect at any time to revoke access and clear stored tokens.

### UI & Accessibility

- **Dark mode** — Automatically follows system preference via `prefers-color-scheme: dark`. All components, badges, and grid cells adapt their colors for dark backgrounds.
- **Responsive layout** — Breakpoints at 640px and 768px adjust the grid, chart, and selector layouts for tablet and mobile screens.
- **Keyboard accessible** — The settings menu uses Headless UI for proper focus management, arrow-key navigation, and Escape to close. The confirmation modal traps focus and supports Escape to dismiss.
- **Animations** — Framer Motion provides smooth transitions for interactive elements.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and builds
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Framer Motion](https://motion.dev/) for animations
- [Recharts](https://recharts.org/) for charts
- [Headless UI](https://headlessui.com/) for accessible menus and modals
- [Phosphor Icons](https://phosphoricons.com/) for UI icons

## Getting Started

```bash
# Clone the repo
git clone https://github.com/jorge-ramirez-dev/Daily-Mood-Tracker.git
cd Daily-Mood-Tracker/client

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Cloud Sync Setup (optional)

To enable Google Drive sync:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Drive API
3. Configure an OAuth consent screen (External, add `drive.appdata` scope)
4. Create an OAuth Client ID (Web application) with your origins (`http://localhost:5173` for dev, your production URL for deployed)
5. Copy the client ID into `client/.env`:

```bash
cp client/.env.example client/.env
# Edit .env and set VITE_GOOGLE_CLIENT_ID
```

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `npm run dev`    | Start the development server |
| `npm run build`  | Build for production         |
| `npm run lint`   | Run ESLint                   |
| `npm run test`   | Run unit tests               |

## Deployment

The app is deployed on [Vercel](https://vercel.com/) as a static SPA from the `client/dist` directory.
