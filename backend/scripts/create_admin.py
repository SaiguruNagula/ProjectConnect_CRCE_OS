"""Bootstrap an institution and its first ADMIN user.

There is no self-service signup, so without this the database has no account to
log in with. The password is read from a prompt, never from an argument, so it
never lands in shell history or a process listing.

    python -m scripts.create_admin --institution CRCE --email admin@crce.edu.in
"""

from __future__ import annotations

import argparse
import sys
from getpass import getpass

from app.common.enums import InstitutionStatus, UserRole, UserStatus
from app.core.security import MAX_PASSWORD_BYTES, hash_password
from app.db.session import SessionFactory
from app.modules.institutions import repository as institution_repo
from app.modules.institutions.models import Institution
from app.modules.users import repository as user_repo
from app.modules.users.models import User


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--institution", required=True, help="institution code, e.g. CRCE")
    parser.add_argument("--institution-name", default=None, help="full name, if creating it")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Administrator")
    args = parser.parse_args()

    if sys.stdin.isatty():
        password = getpass("Password: ")
        if password != getpass("Confirm password: "):
            print("Passwords do not match.", file=sys.stderr)
            return 1
    else:
        # Piped input, e.g. from a provisioning script. Still not an argument:
        # a pipe does not appear in shell history or `ps`.
        password = sys.stdin.readline().rstrip("\n")
    if not 8 <= len(password.encode()) <= MAX_PASSWORD_BYTES:
        print(f"Password must be 8-{MAX_PASSWORD_BYTES} bytes.", file=sys.stderr)
        return 1

    with SessionFactory() as db:
        institution = institution_repo.get_by_code(db, args.institution)
        if institution is None:
            institution = Institution(
                name=args.institution,
                full_name=args.institution_name or args.institution,
                code=args.institution,
                type="Engineering College",
                city="",
                state="",
                status=InstitutionStatus.ACTIVE,
            )
            db.add(institution)
            db.flush()

        if user_repo.get_by_email(db, args.email) is not None:
            print("A user with that email already exists.", file=sys.stderr)
            return 1

        db.add(
            User(
                institution_id=institution.id,
                email=user_repo.normalize_email(args.email),
                password_hash=hash_password(password),
                name=args.name,
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
            )
        )
        db.commit()

    print(f"Created admin {args.email} for {args.institution}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
