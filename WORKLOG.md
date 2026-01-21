# Work Log

## Day 1 — Setup

- Created branch `setup`.
- Backend scaffold: Express + TypeScript with `/api/health`.
- Frontend scaffold: Vite + Tailwind base + shadcn config.
- Docker Compose stack: MongoDB, Redis, backend, frontend.
- Added Dockerfiles and minimal docs/env examples.

## Day 2 — Auth

- Created branch `auth`.
- Added User + RefreshToken models.
- Implemented auth routes with refresh rotation and logout revoke.
- Added Zod validation and auth rate limiting.
- Added `/api/users/me` with JWT middleware.
- Built login/register pages with RHF + Zod.
- Added axios client with refresh retry + auth store bootstrap.

## Add-on — Google Login (ID Token)

- Created branch `feat/google-auth`.
- Added `/api/auth/google` with ID token verification and JWT issuance.
- Added `provider` + `googleId` to the User model for account linking.
- Added Google Identity Services button to the login UI.
- Added `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` env examples.

## Day 3 — Workspaces + RBAC

- Created branch `workspaces`.
- Added Workspace, Membership, Invite models.
- Implemented workspace routes + membership/role middleware.
- Added workspace switcher and join/create flows in the UI.
- Added members/settings UI for role management.
- Added demo seed script (`npm run seed`).
- Fixed seed script to create memberships with required fields.
- Fixed workspace role guard to allow admin actions.

## Day 4 — Issues + Realtime

- Created branch `issues`.
- Added Issue, Comment, Activity models with CRUD routes.
- Added filters and pagination on issue list.
- Added Socket.IO rooms + events.
- Built issues list + create dialog.
- Added issue detail sheet, comments, and realtime toasts.

## Day 5 — Knowledge Base + Docs

- Created branch `kb-docs`.
- Added KB articles model + CRUD routes.
- Built KB list, editor, and markdown preview UI.
- Added linked issues selector for KB.
- Updated README feature list.
- Added workspace keys and ticket IDs (`KEY-COUNT`) with KB linking by ID.
- Added notifications unread badge + auto-read on inbox view.

## Chore — UI Refactor + Notifications

- Created branch `chore-refactor-ui`.
- Refreshed layout colors (blue/green gradient, blue primary buttons).
- Rebuilt issue list + detail to be full-page with better visual hierarchy.
- Replaced missing icons with inline SVG for back/assignee.
- Highlighted ticket ID on issue detail and colored tags/priorities.
- Added unread badge in sidebar and auto-read-on-visit in notifications.
- Clicking a notification now routes to the related issue.
