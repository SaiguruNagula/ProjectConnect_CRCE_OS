# CRCE OS — Frontend

React 19 + TypeScript + Vite application for CRCE OS (Campus Operating System).
UI is migrated pixel-faithfully from the approved Stitch prototypes in
`frontend/crce_os_*/`; design tokens live in `tailwind.config.js`.

## Commands

```bash
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b --noEmit
npm run lint       # oxlint
```

## Environment

Copy `.env.example` to `.env.local`:

| Variable            | Purpose                         | Default   |
| ------------------- | ------------------------------- | --------- |
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend | `/api/v1` |

No secrets belong in this app — it ships as a public browser bundle.

## Architecture

```
Page  →  Hook  →  Service  →  Repository  →  Mock data (today) / API client → FastAPI (later)
```

| Layer        | Location            | Responsibility                                         |
| ------------ | ------------------- | ------------------------------------------------------ |
| Pages        | `src/pages/`        | Route-level composition, loading/empty/error states     |
| Feature UI   | `src/features/`     | Domain-specific presentational components               |
| Shared UI    | `src/components/`   | Chrome, feedback boundaries, generic UI primitives      |
| Hooks        | `src/hooks/`        | Feature state, data loading, form/UI orchestration      |
| Services     | `src/services/`     | Domain operations; depend only on repository contracts  |
| Repositories | `src/repositories/` | Data access boundary (`types.ts` is the contract)       |
| API client   | `src/api/client.ts` | The only place `fetch` is called                        |
| Mocks        | `src/mocks/`        | Fixture data, reachable **only** through repositories   |

**The swap point is `src/repositories/index.ts`.** It currently binds
`mockRepositories`. To go live, add a `src/repositories/api/` implementation of
the same `Repositories` interface (built on `apiClient`) and change that one
line — services, hooks, pages and components stay untouched.

## Roles and routing

Four roles: `student`, `faculty`, `admin`, `principal`. Routes are declared in
`src/routes/AppRouter.tsx`, canonical paths in `src/constants/routes.ts`, and
menus in `src/constants/navigation.ts` — never hardcode a path in a component.

`ProtectedRoute` is **demo-only UI gating**; real authorization is enforced by
the backend (DECISIONS.md §6). `AuthProvider` owns the session and pushes the
access token into the API client, so JWT auth drops in without changing
consumers.

## Documentation

`docs/` at the repository root is the source of truth: `trd.md`,
`UI_UX_GUIDELINES.md`, `ProjectRoadmap.md`, `DECISIONS.md`,
`DATABASE_SCHEMA.md`, `API_SPEC.md`, `Migration_Map.md`.
