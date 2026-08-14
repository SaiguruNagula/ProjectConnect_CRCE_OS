"""Profile contracts (domain.ts `StudentProfile` / `FacultyProfile`).

Every `*In` schema forbids unknown fields. That is the whole defence against a
client writing something it does not own: `role`, `institution_id`,
`total_credits`, `rank`, `published` and every other server-owned fact are not
listed below, so sending one is a 422 rather than a silent no-op.

Two fields *are* listed but still cannot be changed — `email` on the faculty
patch, and `avatar_initials` on both. The frozen edit forms echo them back
unchanged with the rest of the draft, so forbidding them outright would reject
an otherwise valid save. See `service` for what happens to each.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.common.enums import FacultyVisibility

# A social account name, never a link: the frontend prints it as `@name`. The
# pattern admits no colon and no slash, so no scheme — `javascript:` included —
# can reach a template that later decides to make it clickable.
Handle = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,78}$")]

Skill = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Domain = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
Department = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]


class Patch(BaseModel):
    """Base for every profile patch: unknown fields are an error, not an edit."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class VisibilityOut(BaseModel):
    """domain.ts `ProfileVisibility`."""

    model_config = ConfigDict(from_attributes=True)

    public_profile: bool
    show_contact: bool
    show_socials: bool


class VisibilityIn(BaseModel):
    """Sent whole by the frozen toggle handler, so every flag is required."""

    model_config = ConfigDict(extra="forbid")

    public_profile: bool
    show_contact: bool
    show_socials: bool


class StudentProfileOut(BaseModel):
    """domain.ts `StudentProfile`. Identity only — no credits, rank or projects."""

    user_id: uuid.UUID
    name: str
    avatar_initials: str
    # The account address. Not settable here: it is the login credential.
    institutional_email: str
    department: str | None = None

    headline: str | None = None
    tagline: str | None = None
    bio: str | None = None
    batch: str | None = None
    roll_number: str | None = None
    pronouns: str | None = None
    location: str | None = None
    github: str | None = None
    linkedin: str | None = None
    personal_skills: list[str] = Field(default_factory=list)

    visibility: VisibilityOut


class StudentProfileIn(Patch):
    """Exactly the fields StudentProfilePage saves. Absent means unchanged."""

    name: Name | None = None
    headline: str | None = Field(default=None, max_length=160)
    tagline: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=2000)
    department: Department | None = None
    batch: str | None = Field(default=None, max_length=60)
    roll_number: str | None = Field(default=None, max_length=60)
    pronouns: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    github: Handle | None = None
    linkedin: Handle | None = None
    personal_skills: list[Skill] | None = Field(default=None, max_length=50)
    visibility: VisibilityIn | None = None

    # Derived from the name; accepted because the edit drawer echoes it back.
    avatar_initials: str | None = Field(default=None, max_length=8)


class FacultyProfileOut(BaseModel):
    """domain.ts `FacultyProfile`."""

    user_id: uuid.UUID
    name: str
    avatar_initials: str
    email: str
    department: str | None = None
    # Issued by the institution, shown read-only by the frozen page.
    faculty_id: str | None = None

    designation: str | None = None
    phone: str | None = None
    bio: str | None = None
    teaching_focus: str | None = None
    innovation_focus: str | None = None
    office_location: str | None = None
    experience_years: int = 0
    research_domains: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    max_teams: int = 1
    open_for_mentorship: bool = True
    visibility: FacultyVisibility = FacultyVisibility.INSTITUTIONAL
    github: str | None = None
    linkedin: str | None = None


class FacultyProfileIn(Patch):
    """Exactly the fields the faculty edit drawer saves."""

    name: Name | None = None
    designation: str | None = Field(default=None, max_length=120)
    department: Department | None = None
    phone: str | None = Field(default=None, max_length=40)
    bio: str | None = Field(default=None, max_length=2000)
    teaching_focus: str | None = Field(default=None, max_length=200)
    innovation_focus: str | None = Field(default=None, max_length=200)
    office_location: str | None = Field(default=None, max_length=120)
    experience_years: int | None = Field(default=None, ge=0, le=70)
    research_domains: list[Domain] | None = Field(default=None, max_length=30)
    skills: list[Skill] | None = Field(default=None, max_length=50)
    max_teams: int | None = Field(default=None, ge=1, le=100)
    open_for_mentorship: bool | None = None
    visibility: FacultyVisibility | None = None
    github: Handle | None = None
    linkedin: Handle | None = None

    # Echoed by the drawer, rejected by the service if actually changed.
    email: EmailStr | None = None
    avatar_initials: str | None = Field(default=None, max_length=8)
