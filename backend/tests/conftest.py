"""Test fixtures.

Tests run against a real PostgreSQL database (`<name>_test`, created on demand)
because the behavior under test — unique constraints, FK restrictions, native
enums, cross-tenant queries — is database behavior. SQLite would prove nothing.

Each test gets a connection-level transaction that is rolled back afterwards, so
service code can call `commit()` for real without leaking rows between tests.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session

from app.common.enums import InstitutionStatus, ProblemStatus, UserRole, UserStatus
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.modules.institutions.models import Institution
from app.modules.problems.models import Problem
from app.modules.users.models import User

TEST_PASSWORD = "correct-horse-battery"


def _ensure_test_database(url) -> None:
    """CREATE DATABASE if absent, connecting to the maintenance database."""
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database}
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    url = make_url(get_settings().database_url)
    url = url.set(database=f"{url.database}_test")
    _ensure_test_database(url)

    engine = create_engine(url)
    # create_all rather than `alembic upgrade`: the migration is verified
    # separately against the real database, and tests should fail on model
    # changes immediately rather than wait for a migration to be written.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(test_engine: Engine) -> Iterator[Session]:
    connection = test_engine.connect()
    transaction = connection.begin()
    # create_savepoint: a commit() inside the application code becomes a
    # savepoint release, so the outer rollback still undoes everything.
    session = Session(
        bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False
    )
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def institution_a(db: Session) -> Institution:
    return _make_institution(db, "CRCE", "Fr. C. Rodrigues Institute of Technology")


@pytest.fixture
def institution_b(db: Session) -> Institution:
    return _make_institution(db, "OTHER", "Other Institute of Technology")


def _make_institution(db: Session, code: str, full_name: str) -> Institution:
    institution = Institution(
        name=code,
        full_name=full_name,
        code=code,
        type="Engineering College",
        city="Mumbai",
        state="Maharashtra",
        # The enum, not "active": a flushed-but-not-reloaded row keeps whatever
        # was assigned, and `Institution.is_active` compares enum identity.
        status=InstitutionStatus.ACTIVE,
    )
    db.add(institution)
    db.flush()
    return institution


def make_user(
    db: Session,
    *,
    institution: Institution,
    email: str,
    role: UserRole = UserRole.STUDENT,
    status: UserStatus = UserStatus.ACTIVE,
    password: str = TEST_PASSWORD,
) -> User:
    user = User(
        institution_id=institution.id,
        email=email,
        password_hash=hash_password(password),
        name=email.split("@")[0].replace(".", " ").title(),
        role=role,
        status=status,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def faculty(db: Session, institution_a: Institution) -> User:
    return make_user(
        db, institution=institution_a, email="neha.kulkarni@crce.edu", role=UserRole.FACULTY
    )


@pytest.fixture
def student(db: Session, institution_a: Institution) -> User:
    return make_user(db, institution=institution_a, email="aarav.sharma@crce.edu")


@pytest.fixture
def other_student(db: Session, institution_a: Institution) -> User:
    return make_user(db, institution=institution_a, email="isha.patil@crce.edu")


@pytest.fixture
def problem(db: Session, institution_a: Institution, faculty: User) -> Problem:
    return make_problem(db, institution=institution_a, author=faculty)


def make_problem(
    db: Session,
    *,
    institution: Institution,
    author: User,
    title: str = "Smart Attendance System",
    department: str = "Computer Engineering",
    base_credits: int = 200,
    team_size: int = 4,
    status: ProblemStatus = ProblemStatus.OPEN,
) -> Problem:
    today = date.today()
    problem = Problem(
        institution_id=institution.id,
        created_by=author.id,
        title=title,
        summary="On-device face recognition for automated lecture attendance.",
        statement="Manual attendance wastes ten minutes of every lecture on campus.",
        department=department,
        difficulty="Intermediate",
        required_skills=["Python", "Computer Vision"],
        tools=[],
        team_size=team_size,
        allow_individual=True,
        start_date=today,
        end_date=today + timedelta(days=84),
        base_credits=base_credits,
        status=status,
        attachments=[],
    )
    db.add(problem)
    db.flush()
    return problem


def login(client: TestClient, email: str, password: str = TEST_PASSWORD) -> dict:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def auth_header(client: TestClient, email: str, password: str = TEST_PASSWORD) -> dict[str, str]:
    return {"Authorization": f"Bearer {login(client, email, password)['access_token']}"}
