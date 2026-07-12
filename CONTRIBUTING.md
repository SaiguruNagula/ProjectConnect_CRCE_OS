# Contributing to CRCE OS

CRCE OS is a long-term product, not a coursework project. Every change must follow the
engineering constitution in `docs/CLAUDE.md` and the phase order in `docs/ProjectRoadmap.md`.

## Golden Rules

- **Do not redesign** the architecture or the UI. Implement the documented system.
- **Do not introduce new technologies** beyond the fixed stack (see `docs/DECISIONS.md`).
- **Reuse before creating** — components, services, repositories, endpoints.
- The **Credit Engine is the single source of truth** for scoring. Leaderboard and Portfolio
  only read from it. Never write scores elsewhere.
- **Backend before frontend** within every feature.
- When documentation conflicts with code, follow the priority order
  (CLAUDE.md → Architecture → TRD → PRD → Roadmap). If the fix would change architecture,
  a business rule, or the data model — **ask first**.

## Branch Strategy

| Branch          | Purpose |
|-----------------|---------|
| `main`          | Production-ready code |
| `develop`       | Integration branch |
| `feature/<name>`| Individual features (branch from `develop`) |
| `bugfix/<name>` | Bug fixes |
| `hotfix/<name>` | Production fixes (branch from `main`) |

One phase from the implementation plan = one focused, reviewable commit/PR.

## Commit Messages

Use Conventional Commits:

```
feat(auth): implement JWT authentication
fix(portfolio): correct credit aggregation
refactor(api): thin out project route
docs(readme): document repository layout
chore(setup): scaffold repository foundation
```

Avoid vague messages like `update`, `changes`, `fix`, `done`.

## Definition of Done

A feature is complete only when: requirements implemented, backend + API + database +
frontend connected, responsive, accessible (WCAG 2.1 AA), loading/empty/error/success states
handled, unit + manual tested, docs updated, and no console/TypeScript/lint errors.
