# NFP Chart Tracker

Web-first symptothermal fertility tracker for Natural Family Planning (NFP).

## Stack

- Next.js App Router + TypeScript
- Prisma ORM + SQLite
- Email/password auth with Argon2
- Cookie-based server sessions
- Vitest (unit + integration) and Playwright (e2e)

## Core MVP Features

- Single-user deployment (first registration only)
- Daily observation logging
  - Creighton mucus fields:
    - stretch score (`0`, `2`, `6`, `8`, `10`)
    - transparency (`C` cloudy, `K` clear)
    - slipperiness (`N` non-lubricative, `L` lubricative)
  - Cervix position
  - Bleeding level
  - Intercourse flag
  - Notes
- Rule-based symptothermal interpretation
  - Fertile start: day 6 or first fertile-quality mucus
  - Temperature shift: 3-over-6 threshold rule
  - Post-ovulatory infertile: later of `Peak + 3` and `Temp shift + 3`
  - Uncertain status with reason codes for missing/contradictory observations
- Manual per-day override with required reason
- Dashboard, chart, entries, and settings pages
- Educational-only medical disclaimer acceptance

## Environment

Copy `.env.example` to `.env` for local development.

```bash
DATABASE_URL="file:./dev.db"
SESSION_TTL_HOURS="720"
```

For Coolify (or Docker), use:

```bash
SQLITE_FILE_PATH="/var/lib/nfp/nfp.db"
SESSION_TTL_HOURS="720"
```

Attach a persistent volume mounted at `/var/lib/nfp`.

## Local Setup

```bash
npm install
./node_modules/.bin/prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start local dev server (webpack mode)
- `npm run build`: production build
- `npm run start`: start production server
- `npm run start:prod`: run Prisma migrate deploy, then start server
- `npm run lint`: ESLint
- `npm test`: Vitest unit + integration tests
- `npm run test:e2e`: Playwright tests
- `npm run seed:account`: manually seed/update the single account (requires env vars)
- `npm run seed:data:creighton`: manually seed Creighton-only cycle data for existing account

## Manual Seeding

Account seed (required first):

```bash
SEED_EMAIL="you@example.com" SEED_PASSWORD="your-password" npm run seed:account
```

Then seed two full Creighton cycles for that account:

```bash
SEED_EMAIL="you@example.com" npm run seed:data:creighton
```

Notes:
- Seeding is manual only. No seed command runs automatically in app startup or runtime.
- Data seed is Creighton-only (`BBT` intentionally omitted/null).

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### Tracking

- `GET /api/cycles/current`
- `GET /api/cycles`
- `POST /api/cycles`
- `GET /api/cycles/:cycleId`
- `PATCH /api/cycles/:cycleId`
- `GET /api/cycles/:cycleId/days`
- `PUT /api/cycles/:cycleId/days/:date`
- `PATCH /api/cycles/:cycleId/days/:date/override`
- `POST /api/cycles/:cycleId/recompute`

### Settings and Ops

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/health`

## Coolify Deployment

1. Deploy with included `Dockerfile`.
2. Add persistent volume mounted to `/var/lib/nfp`.
3. Set `SQLITE_FILE_PATH=/var/lib/nfp/nfp.db`.
4. Expose port `3000`.
5. Keep start command as default (`npm run start:prod`).

## Docker Run Example

```bash
docker build -t nfp-tracker .
docker run -d \
  --name nfp-tracker \
  -p 3000:3000 \
  -v nfp_data:/var/lib/nfp \
  -e SQLITE_FILE_PATH=/var/lib/nfp/nfp.db \
  -e SESSION_TTL_HOURS=720 \
  nfp-tracker
```

## Safety Positioning

This app is educational and charting-only. It does not diagnose or treat medical conditions.
