"""sync_types

Revision ID: 80126c75752b
Revises: f2252695ac00
Create Date: 2026-07-02 15:50:30.965346

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '80126c75752b'
down_revision: Union[str, Sequence[str], None] = 'f2252695ac00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
