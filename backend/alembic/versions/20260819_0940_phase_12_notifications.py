"""phase 12 notifications

One table. `audit_logs` already exists from the security-and-identity
foundation and every module already writes to it, so Phase 12 adds no audit
schema at all — it only reads what is there.

Notifications could not reuse it. An audit row records *who acted*; a
notification records *who must be told*, and those are usually different people
(a faculty member decides, a student is notified). An audit row is also
immutable by design, while a notification carries read state that changes after
the fact. Writing read state onto the audit log would make the audit log
mutable, which is the one property it exists to keep.

The unique constraint on `(user_id, event_key)` is what makes raising a
notification idempotent: a retried mutation cannot notify the same person twice
about the same event. `event_key` is nullable and Postgres treats NULLs as
distinct, so actions with no one-shot meaning are never blocked by it.

Revision ID: b2f4c9e1a730
Revises: 9f41c07a2d18
Create Date: 2026-08-19 09:40:00.000000+00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'b2f4c9e1a730'
down_revision: str | None = '9f41c07a2d18'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('institution_id', sa.UUID(), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('entity', sa.String(length=80), nullable=True),
        sa.Column('entity_id', sa.String(length=80), nullable=True),
        sa.Column('event_key', sa.String(length=160), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ['institution_id'],
            ['institutions.id'],
            name=op.f('fk_notifications_institution_id_institutions'),
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name=op.f('fk_notifications_user_id_users'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications')),
        sa.UniqueConstraint('user_id', 'event_key', name='uq_notifications_user_id_event_key'),
    )
    # The only query the feed makes: one recipient's rows, newest first.
    op.create_index(
        'ix_notifications_user_id_created_at',
        'notifications',
        ['user_id', 'created_at'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_user_id_created_at', table_name='notifications')
    op.drop_table('notifications')
