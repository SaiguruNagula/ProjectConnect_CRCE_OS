# CRCE OS — Campus Operating System

> **Where Ideas Become Impact.**

An Innovation Operating System for Fr. Conceicao Rodrigues College of Engineering (CRCE).
CRCE OS transforms institutional problems into student-led innovation through a single
connected lifecycle: **Problem → Team → Project → Review → Credit → Leaderboard → Portfolio**.

This is not an LMS, ERP, or project-submission portal. See `docs/prd.md` for the product
definition and `docs/CLAUDE.md` for the engineering constitution.

---

## Repository Layout

```
backend/          FastAPI service (Route → Service → Repository → Model)
  app/
    api/          Thin routes (validation, auth, response shaping)
    services/     Business logic (single source of truth)
    repositories/ Database access only
    models/       SQLAlchemy models
    schemas/      Pydantic request/response schemas
    core/         Config, security, DB, logging, exceptions
    utils/
frontend/         React + TypeScript + Vite app
  _archive/       Non-canonical Stitch mockups (design reference only)
docs/             PRD, TRD, Architecture, Decisions, Schema, API spec, Roadmap
infrastructure/   NGINX and deployment config
scripts/          Operational scripts
```

The 108 original Stitch design mockups are design references. The canonical page inventory
(22 routes) is defined in `frontend/crce_os_integration_map.md`.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React, TypeScript, Vite, TailwindCSS, shadcn/ui, React Router, TanStack Query, Zustand |
| Backend   | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database  | PostgreSQL |
| Deploy    | Docker, Docker Compose, NGINX |

The stack is fixed for Version 1.0. Do not introduce new technologies (see `docs/DECISIONS.md`).

## Development Status

**Pre-implementation → Foundation (Phase 0).** Backend and frontend applications are being
scaffolded. Development follows the sequential phases in `docs/ProjectRoadmap.md`.

## Getting Started

```bash
cp .env.example .env      # fill in local values
docker compose up         # starts postgres, backend, frontend, nginx
```

## Contributing

See `CONTRIBUTING.md` for branch strategy, commit conventions, and the Definition of Done.
