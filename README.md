# SprintDesk (MERN)

Multi-tenant issue tracker + knowledge base. This repo is built in phased commits, keeping each day runnable.

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

## shadcn/ui Setup

The frontend is pre-configured for shadcn/ui. To add components, run:

```bash
cd frontend
npx shadcn@latest add button card dialog sheet table tabs badge dropdown-menu input textarea separator skeleton
```

This uses the `components.json` already included in the repo.
