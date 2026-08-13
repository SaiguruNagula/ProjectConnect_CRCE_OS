"""The review engine (BACKEND_ARCHITECTURE.md §21).

There is deliberately no `models.py`: a review is not an entity of its own. It
is the verdict columns Phase 3 provisioned on `stage_submissions`, plus the
selection columns on `projects` — one live submission per project per stage,
one reviewer (ADR-3), one verdict, no history.
"""
