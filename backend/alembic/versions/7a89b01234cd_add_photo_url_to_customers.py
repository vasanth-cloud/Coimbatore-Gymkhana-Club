"""add photo_url to customers

Revision ID: 7a89b01234cd
Revises: 1a77b905cba5
Create Date: 2026-09-05 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a89b01234cd'
down_revision: Union[str, Sequence[str], None] = '1a77b905cba5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('customers', 'photo_url')
