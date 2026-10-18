# College Fest Hunt Frontend

Mobile-first React client for participants and organizers of the college fest QR treasure hunt. It
is independently deployed and communicates with the backend only through `/api/v1`.

## Requirements and setup

- Node.js 22.12+
- npm 11+

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

On macOS/Linux use `cp .env.example .env`. Set `VITE_API_BASE_URL` to the backend API base, such as
`http://localhost:3000/api/v1`. This is public build-time configuration and must not contain a
secret.

## Included experiences

- Participant/admin role-aware login using a server-managed HttpOnly session
- Team dashboard, official start, eight-step progress, reconnect/refresh recovery
- QR token route, stable assignment restoration, server-timed attempt lifecycle, cooldown states
- Current clue, personal attempt history, team completion, and public leaderboard
- Eight isolated, touch-friendly game modules behind a typed registry: Tetris, Snake, Brick
  Breaker, Memory Match, Chess Puzzle, Number Merge, Space Invaders, and Pattern Recall. Each
  module owns its component and gameplay engine.
- Organizer event controls, teams, participants, checkpoints/QR links, rounds/clues, game levels,
  live team state, attempt reports, and CSV export
- Controlled unknown-game, loading, empty, error, unauthorized, and 404 states

Browser timers and game state are presentation aids. The backend remains authoritative for
assignment, timestamps, result acceptance, retry eligibility, and progression.

Games are intentionally not selectable from the organizer screen. A participant starts the hunt,
scans the QR for the current checkpoint, and receives a stable randomized no-repeat assignment;
the assignment page then loads the matching game module.

The organizer setup generates an individual QR image for every checkpoint. Each image can be
previewed and downloaded as PNG. Replacing a QR rotates its bearer token and invalidates the old
image. QRs can be replaced while the hunt is running or paused, which immediately invalidates the
previous image. Participants cannot type checkpoint tokens or select games manually.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
npm run test:e2e
```

Vitest covers components and the typed game registry. Playwright runs the login smoke flow in
desktop and Pixel 7 Chromium profiles. Install the local browser once with
`npx playwright install chromium` before running E2E tests.

## Deployment

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 -t college-fest-hunt-frontend .
docker run --rm -p 8080:80 college-fest-hunt-frontend
```

The final image serves static assets through nginx with SPA route fallback and immutable hashed
asset caching. Use HTTPS, deploy the backend separately, and configure its exact frontend origin.

## Pilot checklist

- Test each game on current Android Chrome and iOS Safari with touch input.
- Scan every printed QR using multiple devices and verify the location/round mapping.
- Exercise reconnect, repeated scans, duplicate taps, failed attempts, cooldowns, and team-member
  handoff.
- Verify visible focus, keyboard access for non-game controls, contrast, and common screen sizes.
- Run a production-like concurrent checkpoint simulation before configuration is frozen.
