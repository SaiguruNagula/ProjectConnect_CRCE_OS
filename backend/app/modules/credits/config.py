"""Credit Engine configuration — one place, read by everything.

Levels, badges, category labels and the award ceiling all live here. Nothing
else in the codebase may compute a level or a tier: a leaderboard badge and a
student's level name have to agree, so they read the same ladder.

Provenance of the numbers (nothing here is invented):
* the ladder's `Innovator` → `Mastership` step at 300 → 400 and the
  `pctToNext = total / nextMilestone` formula are read off the frozen frontend
  fixture `mocks/credits.ts::CREDIT_SUMMARY` (total 320 ⇒ level 4, Innovator,
  next Mastership at 400, 80 to go, 80%); the tiers above and below extend the
  same spacing.
* rule points come from `mocks/credits.ts::CREDIT_RULES`.
* the ceiling multiplier is the one deliberate product knob — see below.
"""

from __future__ import annotations

# Label shown next to the summary. This engine's own version, not the mock's.
ENGINE_VERSION = "V1.0"

# UD-11: a mentor types the five components by hand, and the frontend caps
# nothing. `problems.base_credits` is the reward the problem was published with,
# so it is the yardstick: an award may reach twice it — enough room for an
# exceptional project plus a bonus, not enough to distort a leaderboard.
AWARD_CEILING_MULTIPLIER = 2

# (credits required, tier name). Index + 1 is the level number.
LEVELS: tuple[tuple[int, str], ...] = (
    (0, "Newcomer"),
    (100, "Contributor"),
    (200, "Builder"),
    (300, "Innovator"),
    (400, "Mastership"),
    (600, "Luminary"),
)

# --- sources ---------------------------------------------------------------------

# The ledger `source` for a project award — the label the student reads.
SOURCE_PROJECT_COMPLETION = "Project Completion"

# Rule event → the label used on the ledger and the rules list.
EVENT_LABELS: dict[str, str] = {
    "PROJECT_COMPLETION": SOURCE_PROJECT_COMPLETION,
    "PROBLEM_PUBLISHED": "Problem Published",
    "REVIEW_COMPLETED": "Faculty Review",
    "MENTORED_PROJECT_COMPLETED": "Mentorship",
}

# Presentation only: which card a source falls under, and its Material icon.
# Configuration, not data — there is no icon table.
CATEGORIES: dict[str, tuple[str, str]] = {
    SOURCE_PROJECT_COMPLETION: ("Projects", "code"),
    "Problem Published": ("Innovation", "lightbulb"),
    "Faculty Review": ("Campus", "location_city"),
    "Mentorship": ("Mentorship", "group"),
}
UNCATEGORISED = ("Other", "workspace_premium")


def level_of(total: int) -> tuple[int, str, str, int]:
    """(level, tier name, next tier name, next milestone) for a credit total."""
    index = 0
    for position, (threshold, _) in enumerate(LEVELS):
        if total >= threshold:
            index = position
    _, name = LEVELS[index]
    if index + 1 < len(LEVELS):
        next_milestone, next_name = LEVELS[index + 1]
    else:
        # At the top of the ladder there is nothing left to climb toward.
        next_milestone, next_name = LEVELS[index][0], name
    return index + 1, name, next_name, next_milestone


def category_of(source: str) -> tuple[str, str]:
    return CATEGORIES.get(source, UNCATEGORISED)


def award_ceiling(base_credits: int) -> int:
    """The most a mentor may award for a project (UD-11)."""
    return base_credits * AWARD_CEILING_MULTIPLIER
