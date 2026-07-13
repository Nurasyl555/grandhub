"""add_user_interests

Revision ID: 6fd8e3c5399c
Revises: 80126c75752b
Create Date: 2026-07-12 19:56:53.933896

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6fd8e3c5399c'
down_revision: Union[str, Sequence[str], None] = '80126c75752b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("interests", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "interests")
