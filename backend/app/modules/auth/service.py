"""Authentication flows: login, refresh rotation, logout.

Every failure here is deliberately indistinguishable to the caller. The reason
is recorded in the audit log, not returned in the response, so that a stranger
cannot use error text to learn which email addresses exist.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.common.audit import record_audit
from app.common.errors import AuthenticationError
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth import repository as token_repo
from app.modules.auth.schemas import TokenPair
from app.modules.institutions import repository as institution_repo
from app.modules.users import repository as user_repo
from app.modules.users.models import User
from app.modules.users.schemas import UserOut

INVALID_CREDENTIALS = "Invalid email or password."
INACTIVE_ACCOUNT = "This account is not active. Contact your institution administrator."
INACTIVE_INSTITUTION = "This ProjectConnect deployment is not active. Contact your administrator."

# Verified against when no user row exists, so a missing account costs the same
# ~100ms of bcrypt as a wrong password and cannot be spotted by response timing.
_DUMMY_HASH = hash_password("timing-equalizer-not-a-credential")


def _issue_pair(db: Session, user: User) -> TokenPair:
    access_token, _ = create_access_token(
        user_id=user.id, role=user.role, institution_id=user.institution_id
    )
    refresh_token, jti, expires_at = create_refresh_token(
        user_id=user.id, role=user.role, institution_id=user.institution_id
    )
    token_repo.store(db, user_id=user.id, jti=jti, expires_at=expires_at)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


def _institution_active(db: Session, user: User) -> bool:
    """Institution status is the deployment's local lifecycle gate (ADR-9).

    A suspended institution must not be able to authenticate, and the check is
    a local row read — never a call to an external service, so the college
    deployment keeps working when ProjectConnect's future central services do not.
    """
    institution = institution_repo.get_by_id(db, user.institution_id)
    return institution is not None and institution.is_active


def _is_locked(user: User) -> bool:
    return user.locked_until is not None and user.locked_until > datetime.now(UTC)


def _register_failure(db: Session, user: User) -> None:
    settings = get_settings()
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= settings.max_failed_logins:
        user.locked_until = datetime.now(UTC) + timedelta(minutes=settings.lockout_minutes)
        user.failed_login_attempts = 0


def login(db: Session, *, email: str, password: str) -> TokenPair:
    user = user_repo.get_by_email(db, email)

    if user is None:
        verify_password(password, _DUMMY_HASH)
        # No user row to attribute the event to; the attempted address is not
        # stored because a mistyped password often lands in the email field.
        record_audit(db, action="login.failed", entity="user", meta={"reason": "unknown_user"})
        db.commit()
        raise AuthenticationError(INVALID_CREDENTIALS)

    if _is_locked(user):
        record_audit(
            db,
            action="login.blocked",
            entity="user",
            entity_id=str(user.id),
            actor_id=user.id,
            institution_id=user.institution_id,
            meta={"reason": "locked"},
        )
        db.commit()
        # Same message as a wrong password: "account locked" would confirm the
        # address exists to anyone willing to spend five guesses.
        raise AuthenticationError(INVALID_CREDENTIALS)

    if not verify_password(password, user.password_hash):
        _register_failure(db, user)
        record_audit(
            db,
            action="login.failed",
            entity="user",
            entity_id=str(user.id),
            actor_id=user.id,
            institution_id=user.institution_id,
            meta={"reason": "bad_password"},
        )
        db.commit()
        raise AuthenticationError(INVALID_CREDENTIALS)

    if not user.is_active:
        # The password was correct, so the caller already owns the account:
        # naming the real reason here leaks nothing new and saves a support call.
        record_audit(
            db,
            action="login.denied",
            entity="user",
            entity_id=str(user.id),
            actor_id=user.id,
            institution_id=user.institution_id,
            meta={"reason": "inactive", "status": user.status.value},
        )
        db.commit()
        raise AuthenticationError(INACTIVE_ACCOUNT)

    if not _institution_active(db, user):
        # Also after the password check: the caller owns the account, so the
        # real reason costs nothing and prevents a pointless support ticket.
        record_audit(
            db,
            action="login.denied",
            entity="user",
            entity_id=str(user.id),
            actor_id=user.id,
            institution_id=user.institution_id,
            meta={"reason": "institution_inactive"},
        )
        db.commit()
        raise AuthenticationError(INACTIVE_INSTITUTION)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(UTC)
    pair = _issue_pair(db, user)
    record_audit(
        db,
        action="login.succeeded",
        entity="user",
        entity_id=str(user.id),
        actor_id=user.id,
        institution_id=user.institution_id,
    )
    db.commit()
    return pair


def refresh(db: Session, *, refresh_token: str) -> TokenPair:
    claims = decode_token(refresh_token, expected_type="refresh")
    stored = token_repo.get_by_jti(db, claims.jti)

    if stored is None:
        raise AuthenticationError("Invalid or expired token.")

    if stored.revoked_at is not None:
        # A revoked token being replayed means the family leaked. Kill all of
        # them so the legitimate holder is forced to log in again.
        token_repo.revoke_all_for_user(db, stored.user_id)
        record_audit(
            db,
            action="token.reuse_detected",
            entity="refresh_token",
            entity_id=stored.jti,
            actor_id=stored.user_id,
        )
        db.commit()
        raise AuthenticationError("Invalid or expired token.")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active or not _institution_active(db, user):
        # Suspending an institution therefore ends every session within one
        # access-token lifetime rather than one refresh-token lifetime.
        raise AuthenticationError("Invalid or expired token.")

    # The token's own claims are not trusted for role/institution: a user
    # demoted or moved since issue must not keep the old privileges for 14 days.
    token_repo.revoke(db, stored)
    pair = _issue_pair(db, user)
    db.commit()
    return pair


def logout(db: Session, *, refresh_token: str) -> None:
    """Idempotent: an already-revoked or unknown token is not an error."""
    try:
        claims = decode_token(refresh_token, expected_type="refresh")
    except AuthenticationError:
        return

    stored = token_repo.get_by_jti(db, claims.jti)
    if stored is not None:
        token_repo.revoke(db, stored)
        record_audit(
            db,
            action="logout",
            entity="user",
            entity_id=str(stored.user_id),
            actor_id=stored.user_id,
        )
        db.commit()
