# Iffert Media Dashboard — TikTok Creator Community

A premium dark-mode Expo app for a TikTok creator event. Neon pink (#FF0050) + electric cyan (#00F2FE) on deep black. **All phones share one live leaderboard via the backend.**

## How identity works
On first launch each phone registers a creator (name + handle) via `POST /api/community/creators`. The returned creator id is stored locally (`src/lib/state/device-store.ts`), so the user only onboards once. Tapping the leave icon on the Me screen clears it and returns to onboarding.

## Approval ("limbo")
New signups start with `status: "Pending"` and land in a waiting screen (`src/components/PendingApproval.tsx`) — they are **not** on the leaderboard and can't use the tabs until a host approves them. `(tabs)/_layout.tsx` gates the tabs on the creator's status: Approved → tabs, Pending/Rejected → the limbo screen (rejected users can start over with a new handle). A host approves/rejects from the **Approvals** card in the Admin console.

## Navigation (4 bottom tabs)
- **Me** (`(tabs)/index.tsx`) — profile, live point balance, rank, and personal activity log. Gated behind onboarding until registered.
- **Rewards** (`(tabs)/rewards.tsx`) — challenges from the backend; "Claim" awards points (haptics + toast).
- **Leaderboard** (`(tabs)/leaderboard.tsx`) — podium for top 3 + ranked list of every creator across all phones. Auto-refreshes every 5s.
- **Admin** (`(tabs)/admin.tsx`) — passcode-protected host console (passcode: `6504`). Approve/reject pending creators, create challenges, manage challenges (end so they stop accepting submissions, or delete with confirmation), award/deduct points, review submissions, reset the event.

## Data layer
- `src/lib/api/community.ts` — React Query hooks (queries auto-refetch to keep the shared board live; mutations invalidate caches).
- `src/lib/api/api.ts` — fetch wrapper; unwraps `{ data }` envelope and throws on error responses.
- `src/lib/api/types.ts` — Creator / Challenge / PointLog / CreatorDetail types.

## Backend (../backend)
Hono + Prisma (SQLite). See `backend/README` notes below. Routes under `/api/community`:
- `GET /leaderboard` (Approved creators only), `GET /creators/pending` (limbo queue), `GET /creators/:id` (with rank + logs), `GET /challenges` (Active only; `?all=1` includes Ended)
- `POST /creators` (register → Pending), `POST /creators/:id/approve`, `POST /creators/:id/reject`, `POST /complete`, `POST /award`, `POST /challenges`, `POST /reset`
- `POST /challenges/:id/end` (mark Ended), `DELETE /challenges/:id` (delete + cascade its submissions)

Tables: **Creator** (handle, name, totalPoints, avatarColor, status: Pending|Approved|Rejected), **Challenge** (title, description, rewardPoints, icon, status: Active|Ended), **PointLog** (creatorId, action, pointsChanged, timestamp).
