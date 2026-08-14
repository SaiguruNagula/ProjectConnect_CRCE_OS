"""Profile tables — the role-specific half of a person's identity.

The half both roles share already exists on `users`: name, email, role,
institution and department. Nothing here repeats it, and nothing here is
computed — avatar initials come from the name, credits from the ledger, rank
from the leaderboard query, verified work from `projects`.

Two tables rather than thirty nullable columns on `users`, because the two field
sets barely overlap: a student has a roll number and a batch, a faculty has a
designation and a mentorship capacity, and neither means anything for the other.
This matches BACKEND_ARCHITECTURE.md §11 (`users 1─1 student_profiles |
faculty_profiles`).

A row is created on first write, not on first read, so a `GET` never writes.
Every column is nullable or defaulted: an account that has never opened its
profile page is a valid account with an empty profile.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import FACULTY_VISIBILITY_ENUM, FacultyVisibility
from app.db.base import Base, Timestamped, UUIDPrimaryKey


class StudentProfile(UUIDPrimaryKey, Timestamped, Base):
    """domain.ts `StudentProfile` + `ProfileVisibility`, less the shared fields."""

    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    headline: Mapped[str | None] = mapped_column(String(160))
    tagline: Mapped[str | None] = mapped_column(String(200))
    bio: Mapped[str | None] = mapped_column(String(2000))
    batch: Mapped[str | None] = mapped_column(String(60))
    roll_number: Mapped[str | None] = mapped_column(String(60))
    pronouns: Mapped[str | None] = mapped_column(String(40))
    location: Mapped[str | None] = mapped_column(String(120))

    # Handles, not URLs: the frontend renders them as `@name` and never as a
    # link, so a scheme could not be followed even if one were stored.
    github: Mapped[str | None] = mapped_column(String(80))
    linkedin: Mapped[str | None] = mapped_column(String(80))

    # Self-declared, and never mixed with the skills a project verified.
    personal_skills: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list)

    # Private until the owner says otherwise. No endpoint reads these yet — the
    # public portfolio route they gate does not exist — so the safe default is
    # the one a later phase can honour without leaking anything retroactively.
    public_profile: Mapped[bool] = mapped_column(Boolean, default=False)
    show_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    show_socials: Mapped[bool] = mapped_column(Boolean, default=False)


class FacultyProfile(UUIDPrimaryKey, Timestamped, Base):
    """domain.ts `FacultyProfile`, less the shared fields."""

    __tablename__ = "faculty_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    # The institution's employee number. Displayed, never editable by its owner
    # — issuing it is user administration, which this phase does not implement.
    faculty_id: Mapped[str | None] = mapped_column(String(60))

    designation: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    bio: Mapped[str | None] = mapped_column(String(2000))
    teaching_focus: Mapped[str | None] = mapped_column(String(200))
    innovation_focus: Mapped[str | None] = mapped_column(String(200))
    office_location: Mapped[str | None] = mapped_column(String(120))
    experience_years: Mapped[int] = mapped_column(Integer, default=0)

    research_domains: Mapped[list[str]] = mapped_column(ARRAY(String(120)), default=list)
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list)

    # Stated availability, not a rule: nothing in project selection reads these,
    # and making them a limit would change who can mentor whom.
    max_teams: Mapped[int] = mapped_column(Integer, default=1)
    open_for_mentorship: Mapped[bool] = mapped_column(Boolean, default=True)

    visibility: Mapped[FacultyVisibility] = mapped_column(
        FACULTY_VISIBILITY_ENUM, default=FacultyVisibility.INSTITUTIONAL
    )

    github: Mapped[str | None] = mapped_column(String(80))
    linkedin: Mapped[str | None] = mapped_column(String(80))
