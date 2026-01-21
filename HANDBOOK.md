# SprintDesk (MERN) Handbook

This handbook collects the planned work for the repository. It focuses on the phased delivery plan and the commit-level roadmap.

## Libraries and Technologies Used

### Backend

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Auth: JWT (`jsonwebtoken`), password hashing (`bcryptjs`)
- Google ID token verification: `google-auth-library`
- Validation: `zod`
- Rate limiting: `express-rate-limit`
- Realtime: `socket.io`
- Cookies/CORS/env: `cookie-parser`, `cors`, `dotenv`

### Frontend

- React + Vite + TypeScript
- Routing: `react-router-dom`
- Server state: `@tanstack/react-query`
- Forms/validation: `react-hook-form` + `@hookform/resolvers` + `zod`
- Client state: `zustand`
- API client: `axios`
- Markdown: `react-markdown`, `remark-gfm`, `remark-breaks`
- Realtime + toasts: `socket.io-client`, `sonner`
- UI primitives: `@radix-ui/react-dialog`
- UI utilities: Tailwind CSS, `@tailwindcss/typography`, `clsx`, `tailwind-merge`
- shadcn/ui setup via `components.json`

### Infra/Tooling

- Docker + docker-compose
- Dev runner: `tsx`
- Redis (running in compose, optional for later Socket.IO scaling)

## Phased Plan (5 Days)

Each day is a runnable, shippable slice. Branch and PR names are included for clarity.

### Day 1 — Phase 1 Setup

- Branch: `setup`
- PR Title: Scaffold repo, docker, base apps
- Commits:
  1. `chore: add gitignore` (done)
  2. `feat(backend): init Express TS app + health route`
  3. `feat(frontend): init Vite + Tailwind + shadcn base`
  4. `chore: add docker-compose and dev scripts`
  5. `docs: add minimal README + env examples`
- Deliverable: Backend and frontend boot, Docker Compose runs all services, basic health check works.

### Day 2 — Phase 2 Auth

- Branch: `auth`
- PR Title: Auth flows and session management
- Commits:
  1. `feat(backend): user + refresh token models`
  2. `feat(backend): auth routes + refresh rotation`
  3. `feat(backend): zod validation + rate limit`
  4. `feat(frontend): auth pages + RHF/Zod`
  5. `feat(frontend): axios client + refresh on 401`
  6. `feat(api): /users/me + session bootstrap`
- Deliverable: Register/login/logout/refresh flows working end-to-end with secure cookies.

### Day 3 — Phase 3 Workspaces + RBAC

- Branch: `workspaces`
- PR Title: Workspaces + RBAC
- Commits:
  1. `feat(backend): workspace/membership/invite models`
  2. `feat(backend): membership + role middleware + routes`
  3. `feat(frontend): workspace switcher + join flow`
  4. `feat(frontend): members/settings UI`
  5. `chore: seed demo data`
- Deliverable: Workspace creation/invite/join flows with role-based enforcement.

### Day 4 — Phase 4 Issues + Realtime

- Branch: `issues`
- PR Title: Issues, comments, realtime
- Commits:
  1. `feat(backend): issue/comment/activity models + CRUD`
  2. `feat(backend): filters + pagination`
  3. `feat(realtime): socket.io rooms + events`
  4. `feat(frontend): issues list + create dialog`
  5. `feat(frontend): issue detail sheet + comments + toasts`
- Deliverable: Issue tracking and realtime updates wired to the UI.

### Day 5 — Phase 5 Knowledge Base + Docs

- Branch: `kb-docs`
- PR Title: Knowledge base + docs polish
- Commits:
  1. `feat(backend): articles CRUD + issue links`
  2. `feat(frontend): KB list + editor/preview`
  3. `feat(ui): loading/empty states`
  4. `docs: README + HANDBOOK`
  5. `chore: env examples + cleanup`
- Deliverable: Knowledge base complete with markdown editor and finalized docs.

## Implementation Log (Days 1–5)

### Day 1 — Setup

- Backend scaffold: Express + TypeScript with `/api/health` in `backend/src/index.ts`.
- Frontend scaffold: Vite + Tailwind base in `frontend/src/App.tsx`, `frontend/src/index.css`.
- Docker Compose: Mongo, Redis, backend, frontend in `docker-compose.yml`.
- Dockerfiles: `backend/Dockerfile`, `frontend/Dockerfile` plus `.dockerignore`.
- Docs: `README.md` and `.env.example` files.

### Day 2 — Auth

- Models: User + RefreshToken in `backend/src/models/User.ts` and `backend/src/models/RefreshToken.ts`.
- Auth routes: register/login/refresh/logout in `backend/src/routes/auth.ts`.
- JWT + token utilities in `backend/src/utils/tokens.ts` and config in `backend/src/config.ts`.
- Zod validation + auth rate limiting in `backend/src/middleware/validate.ts` and `backend/src/middleware/rateLimit.ts`.
- Session endpoint `/api/users/me` in `backend/src/routes/users.ts` + `backend/src/middleware/auth.ts`.
- Frontend auth pages in `frontend/src/pages/Login.tsx` and `frontend/src/pages/Register.tsx`.
- Axios client + refresh handling in `frontend/src/lib/api.ts`, auth store in `frontend/src/stores/auth.ts`.

### Add-on — Google Login (ID Token)

- Backend: `POST /api/auth/google` verifies ID tokens and issues JWTs via existing logic.
- User model: `provider` + `googleId` for linking existing emails.
- Frontend: Google Identity Services button on login posts `credential` to backend.
- Env: `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend).

### Day 3 — Workspaces + RBAC

- Models: Workspace, Membership, Invite in `backend/src/models`.
- Workspace routes + membership/role middleware in `backend/src/routes/workspaces.ts` and `backend/src/middleware/workspace.ts`.
- Workspace UI: switcher + join/create flows in `frontend/src/pages/Workspaces.tsx` and `frontend/src/components/WorkspaceSwitcher.tsx`.
- Settings UI: members list and role updates in `frontend/src/pages/Settings.tsx`.
- Seed script: `backend/src/seed.ts` (`npm run seed`).
- Seed fix: ensure memberships are created with required fields.
- Role guard fix: admins can access admin-level workspace routes.

### Day 4 — Issues + Realtime

- Models: Issue, Comment, Activity in `backend/src/models`.
- Issue CRUD + comments in `backend/src/routes/issues.ts` and `backend/src/routes/comments.ts`.
- Filters + pagination on issue list.
- Socket.IO server in `backend/src/socket.ts` emitting issue/comment events.
- Frontend issues list + create dialog in `frontend/src/pages/Issues.tsx`.
- Issue detail sheet + comments + toasts in `frontend/src/components/IssueDetailSheet.tsx`.
- Realtime client hook in `frontend/src/hooks/useWorkspaceSocket.ts`.

### Day 5 — Knowledge Base + Docs

- Articles model and CRUD routes in `backend/src/models/Article.ts` and `backend/src/routes/articles.ts`.
- Knowledge base UI with list + editor + markdown preview in `frontend/src/pages/KnowledgeBase.tsx`.
- Linked issues selector for KB articles.
- README updated with feature highlights.

## Auth Details (How It Works)

### Zod Validation (Backend)

- Schemas live in `backend/src/routes/auth.ts` using Zod.
- `validateBody` in `backend/src/middleware/validate.ts` runs `schema.safeParse(req.body)`.
- On failure, it returns `400` with `errors` per field; on success it replaces `req.body` with the parsed data.
- This keeps route handlers small and guarantees data shape early.

### Token Creation and Storage

- Access tokens are JWTs created in `backend/src/utils/tokens.ts` via `jsonwebtoken`.
  - `createAccessToken(userId)` signs `{ sub: userId }` with `JWT_SECRET`.
  - TTL is `ACCESS_TOKEN_TTL_MIN` (default 15 minutes).
  - The access token is returned in the JSON response body.
- Refresh tokens are random values, not JWTs.
  - `createRefreshToken()` creates a 32-byte random hex string.
  - `hashToken()` stores only a SHA-256 hash in MongoDB (`RefreshToken.tokenHash`).
  - Raw refresh token never goes to the DB.
  - The refresh token is set as an `httpOnly` cookie (`refresh_token`) via `refreshCookieOptions` in `backend/src/config.ts`.
  - Cookie lifetime is `REFRESH_TOKEN_TTL_DAYS` (default 7 days).

### Refresh Rotation

- `/api/auth/refresh` reads the cookie, hashes it, and looks up the token in MongoDB.
- If valid (not revoked, not expired), it:
  1. Marks the old refresh token as revoked.
  2. Creates a brand-new refresh token and stores its hash.
  3. Sets the new token in the `httpOnly` cookie.
  4. Returns a new access token in JSON.

### Logout

- `/api/auth/logout` hashes the cookie value and marks that token as revoked in MongoDB.
- The refresh cookie is cleared.

### Frontend Token Handling

- Access token is kept in memory only (`frontend/src/lib/api.ts` module variable).
- Zustand `useAuthStore` holds `accessToken` + `user` for UI (`frontend/src/stores/auth.ts`).
- Axios interceptor attaches `Authorization: Bearer <token>` if present.
- On `401`, the interceptor calls `/api/auth/refresh` (cookie-based), updates the access token, and retries the original request.

### Session Bootstrap

- `App` calls `bootstrap()` on load (`frontend/src/App.tsx`).
- `bootstrap()` hits `/api/users/me`:
  - If access token is missing/expired, the `401` triggers refresh.
  - Successful refresh retries `/api/users/me` and hydrates the user.

### Google Login (ID Token)

- Frontend loads Google Identity Services and renders a login button.
- Google returns an ID token in `credential`; frontend posts it to `POST /api/auth/google`.
- Backend verifies the token using `google-auth-library` and `GOOGLE_CLIENT_ID`.
- Users are linked by `googleId` or email; new users get `provider="google"`.
- JWT access + refresh tokens are issued with the same helper used by `/login`.

## Auth Testing (Curl)

Register:

```bash
curl -i -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"secret123\"}" \
  -c cookies.txt
```

Login:

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"secret123\"}" \
  -c cookies.txt
```

Profile:

```bash
curl -i http://localhost:4000/api/users/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -b cookies.txt
```

Refresh (rotation):

```bash
curl -i -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

Logout:

```bash
curl -i -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## Workspaces + RBAC (How It Works)

### Roles and Permissions

- OWNER: full control; can invite members and change roles (including admins).
- ADMIN: can invite members; cannot change roles.
- MEMBER: standard access; no admin actions.
- VIEWER: read-only access; no admin actions.

### Workspace Flow

- Create workspace: `POST /api/workspaces` creates the workspace, stores a unique `key`, and creates the OWNER membership.
- List workspaces: `GET /api/workspaces` returns memberships for the current user.
- Invite: `POST /api/workspaces/:id/invite` generates an invite code and link (OWNER/ADMIN).
- Join: `POST /api/workspaces/join` consumes invite code and creates a MEMBER membership if missing.
- Members list: `GET /api/workspaces/:id/members` requires membership.
- Role update: `PATCH /api/workspaces/:id/members/:memberId` requires OWNER.

### Workspace Key + Ticket IDs

- Each workspace has a short `key` (e.g., `ACME`).
- On issue creation the backend increments `issueCounter` and generates `ticketId` as `KEY-<count>`.
- Ticket ID is stored on the issue and returned in list/detail responses.
- You can filter issues by `ticketId` via `GET /api/workspaces/:id/issues?ticketId=ACME-12`.

### RBAC Enforcement (Backend)

- `requireWorkspaceMember` checks membership and attaches `workspaceId` + `workspaceRole` to the request.
- `requireWorkspaceRole` enforces minimum role per route.
- These live in `backend/src/middleware/workspace.ts` and are applied in `backend/src/routes/workspaces.ts`.

## Seed Data

Seed is a script that creates demo users, a workspace, and an invite code.

Run:

```bash
cd backend
npm run seed
```

Defaults created by `backend/src/seed.ts`:

- Owner: `demo@sprintdesk.dev` / `demo1234`
- Member: `member@sprintdesk.dev` / `demo1234`
- Workspace: `Demo Workspace`
- Invite code: `DEMO1234`

The script reads `MONGO_URL` from `.env` or uses `mongodb://localhost:27017/sprintdesk`.

## Workspace Testing (UI)

- Register or login with the auth UI.
- Go to `/app/workspaces`, create a workspace and verify you are OWNER.
- Go to `/app/settings`, generate an invite and copy the code.
- Log in as another user, join using the invite code.
- Confirm both users appear in the members list.
- As OWNER, change member role; verify it updates.
- As MEMBER/VIEWER, ensure invite generation and role change are blocked.

## Workspace Testing (Curl)

Create workspace:

```bash
curl -i -X POST http://localhost:4000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"name\":\"My Workspace\"}"
```

List workspaces:

```bash
curl -i http://localhost:4000/api/workspaces \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Create invite:

```bash
curl -i -X POST http://localhost:4000/api/workspaces/<WORKSPACE_ID>/invite \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Join via invite:

```bash
curl -i -X POST http://localhost:4000/api/workspaces/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"code\":\"<INVITE_CODE>\"}"
```

List members:

```bash
curl -i http://localhost:4000/api/workspaces/<WORKSPACE_ID>/members \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Update role (OWNER only):

```bash
curl -i -X PATCH http://localhost:4000/api/workspaces/<WORKSPACE_ID>/members/<MEMBER_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"role\":\"ADMIN\"}"
```

## Issues + Comments (How It Works)

- Issues live under workspaces and are enforced by `requireWorkspaceMember`.
- Roles OWNER/ADMIN/MEMBER can create/update/delete issues; VIEWER is read-only.
- Comments are stored by issue id and are visible to any workspace member.
- Activity entries are recorded for issue create/update/delete and comment added.
- Each issue has a `ticketId` generated from the workspace key.

## Realtime Events

Server emits to a workspace room:

- `issue_created` with `{ issueId, title }`
- `issue_updated` with `{ issueId, fields }`
- `comment_added` with `{ issueId, commentId }`
- `notification_created` with `{ message }` to a user-specific room.

Client joins a workspace room after login and workspace selection, then invalidates React Query caches and shows toasts on events (`frontend/src/hooks/useWorkspaceSocket.ts`).

## Knowledge Base (How It Works)

- **Storage model:** articles are stored in MongoDB as plain markdown (`Article.body`) with `title`, `linkedIssueIds[]`, `createdBy`, and timestamps.
- **Create/update flow:** the KB editor (`frontend/src/pages/KnowledgeBase.tsx`) posts to `POST /api/workspaces/:id/articles` or `PATCH /api/workspaces/:id/articles/:articleId` with `{ title, body, linkedIssueIds }`.
- **Read flow:** list and select articles via `GET /api/workspaces/:id/articles`; the selected article is edited in-place and previewed.
- **Markdown rendering:** preview uses `react-markdown` with `remark-gfm` + `remark-breaks`, styled via Tailwind Typography (`prose` classes).
- **Linking issues:** you can search and link issues by ID/title; `linkedIssueIds` are stored with the article.
- **Issue → KB links:** issue details fetch KB items via `GET /api/workspaces/:id/articles?issueId=<issueId>` and link to `/app/kb?articleId=<articleId>` for deep linking.

## Dark Theme Toggle (How It Works)

- The toggle lives in the app header (`frontend/src/components/AppShell.tsx`).
- Clicking the toggle flips a local `theme` state between `light` and `dark`.
- The new theme is persisted to `localStorage` under the `theme` key.
- A `useEffect` applies the theme by adding or removing the `dark` class on `<html>`.
- Tailwind `dark:` variants (e.g., `dark:bg-slate-900`) take effect when that class is present.
- On app boot (`frontend/src/App.tsx`), the saved theme is read and applied before the UI renders, with `prefers-color-scheme` as a fallback.
## Notifications (Unread Count + Auto Read)

- **Data model:** notifications store `readAt` (null = unread) plus `issueId` when the alert is tied to an issue.
- **Unread badge:** the sidebar runs `GET /api/notifications?unread=true` and renders the count as a red pill.
- **Auto-read on visit:** when `/app/notifications` loads, the client calls `PATCH /api/notifications/read-all` to stamp `readAt` for unread items.
- **Manual read:** each row offers `PATCH /api/notifications/:id/read` as a fallback.
- **Routing:** clicking a row navigates to `/app/issues/:issueId` when a related issue exists.
- **Realtime sync:** `notification_created` socket events invalidate `["notifications"]` and `["notifications", "unread"]` so the badge updates instantly.

## Issues Testing (UI)

- In `/app/issues`, create an issue with title/status/priority/labels.
- Click a row to open the detail sheet and update status/priority.
- Add a comment and confirm it appears in the list.
- Open the same workspace in another browser and confirm realtime toasts appear.

## Issues Testing (Curl)

Create issue:

```bash
curl -i -X POST http://localhost:4000/api/workspaces/<WORKSPACE_ID>/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"title\":\"API timeout\",\"description\":\"Calls timing out\",\"status\":\"OPEN\",\"priority\":\"HIGH\",\"labels\":[\"api\"]}"
```

List issues:

```bash
curl -i http://localhost:4000/api/workspaces/<WORKSPACE_ID>/issues?status=OPEN&priority=HIGH&page=1&limit=10 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Update issue:

```bash
curl -i -X PATCH http://localhost:4000/api/workspaces/<WORKSPACE_ID>/issues/<ISSUE_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"status\":\"IN_PROGRESS\"}"
```

Add comment:

```bash
curl -i -X POST http://localhost:4000/api/issues/<ISSUE_ID>/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"body\":\"I can take this\"}"
```
