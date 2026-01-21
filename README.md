# SprintDesk (MERN)

Multi-tenant issue tracker + knowledge base. This repo is built in phased commits, keeping each day runnable.

## MVP Features

- Auth with refresh token rotation (access token in memory, refresh in httpOnly cookie)
- Workspaces + RBAC (owner/admin/member/viewer)
- Issues with comments, assignees, and realtime updates
- Knowledge base articles with markdown preview and linked issues
- Notifications inbox for assignments and mentions

## Quick Start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api/health

## Local Dev (No Docker)

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Environment

- `backend/.env.example`
- `frontend/.env.example`

Google login requires:
- Backend: `GOOGLE_CLIENT_ID`
- Frontend: `VITE_GOOGLE_CLIENT_ID`

Email OTP login requires SMTP settings in `backend/.env`:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

Demo mode:
- `DEMO_MODE=true` enables `/api/auth/demo` for demo logins.
- `DEMO_SEED_ON_START=true` seeds demo users/workspace on startup.

## shadcn/ui Setup

The frontend is pre-configured for shadcn/ui. To add components, run:

```bash
cd frontend
npx shadcn@latest add button card dialog sheet table tabs badge dropdown-menu input textarea separator skeleton
```

This uses the `components.json` already included in the repo.
