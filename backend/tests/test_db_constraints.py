"""Security-relevant guarantees enforced by the database, not by Python.

Application checks can be bypassed by a future code path; these cannot.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.modules.institutions.models import Institution
from app.modules.users.models import User
from tests.conftest import make_user


def test_email_is_unique_platform_wide(db: Session, institution_a, institution_b):
    make_user(db, institution=institution_a, email="shared@crce.edu.in")
    with pytest.raises(IntegrityError):
        make_user(db, institution=institution_b, email="shared@crce.edu.in")


def test_institution_code_is_unique(db: Session, institution_a):
    db.add(
        Institution(
            name="CRCE",
            full_name="Duplicate code",
            code=institution_a.code,
            type="Engineering College",
            city="Mumbai",
            state="Maharashtra",
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()


def test_a_user_cannot_reference_a_missing_institution(db: Session):
    db.add(
        User(
            institution_id=uuid.uuid4(),
            email="ghost@nowhere.edu",
            password_hash="x",
            name="Ghost",
            role=UserRole.STUDENT,
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()


def test_deleting_an_institution_with_users_is_restricted(db: Session, institution_a):
    make_user(db, institution=institution_a, email="asha@crce.edu.in")
    db.flush()
    db.delete(institution_a)
    with pytest.raises(IntegrityError):
        db.flush()


def test_role_column_rejects_an_unknown_value(db: Session, institution_a):
    """The native enum is the last line of defence against an injected role."""
    with pytest.raises((DataError, IntegrityError)):
        db.execute(
            text(
                "INSERT INTO users (id, institution_id, email, password_hash, name, role, "
                "status, failed_login_attempts) VALUES (:id, :inst, :email, 'x', 'X', "
                "'superadmin', 'active', 0)"
            ),
            {"id": uuid.uuid4(), "inst": institution_a.id, "email": "evil@crce.edu.in"},
        )


def test_email_is_normalized_to_lowercase(db: Session, institution_a):
    user = make_user(db, institution=institution_a, email="  Mixed.Case@CRCE.edu.in ")
    assert user.email == "mixed.case@crce.edu.in"
