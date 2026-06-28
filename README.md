# SchoolQuest

Next.js web app for school events. Students claim booth points, helpers bulk-award on iPads, and workshops can generate content via AI.

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS — deployed on Vercel
- **Database & auth:** Firebase Firestore + Auth (Blaze plan)
- **Backend worker:** Node.js Express on Render (`server/` — Recraft + DeepSeek AI proxy)

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm
- A Firebase project on the Blaze plan

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local` with values from the [Firebase console](https://console.firebase.google.com/):
   - **Client config:** Project settings → Your apps → Web app
   - **Admin SDK:** Project settings → Service accounts → Generate new private key (paste JSON as `FIREBASE_SERVICE_ACCOUNT_KEY`)

4. Run the development server (Turbopack is the default bundler in Next.js 16):

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3001](http://localhost:3001).

## Project structure

```
src/
  app/              # App Router pages and layouts
  lib/
    firebaseClient.ts   # Client SDK (browser)
    firebaseAdmin.ts    # Admin SDK (server only)
```

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start dev server         |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Environment variables

See `.env.example` for the full list. Never commit real keys — `.env.local` is gitignored.

## Firebase setup

Deploy Firestore security rules after cloning:

```bash
firebase deploy --only firestore:rules
```

Requires the [Firebase CLI](https://firebase.google.com/docs/cli) and `firebase login`. Anonymous Auth must be enabled in the Firebase console.

## Status

Student login, dashboard, booth/checkpoint code claiming, workshop pages with slide carousel and feature activities, helper bulk-award, and admin Student Works review are implemented. AI generation runs through the Render service in `server/` when `NEXT_PUBLIC_AI_SERVICE_URL` is set. Seedance video generation returns a friendly “coming soon” response until that API is wired.

### AI service setup

1. Copy `server/.env.example` to `server/.env` and add your API keys.
2. Run the AI service locally: `cd server && npm install && npm run dev`
3. Set `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:10000` in `.env.local`.
4. For production, deploy `server/` to Render and point Vercel at the deployed URL.
