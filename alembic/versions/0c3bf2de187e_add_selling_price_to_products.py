"""add selling price to products

Revision ID: 0c3bf2de187e
Revises: fcf64971d208
Create Date: 2026-08-28 01:27:30.983122

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = "0c3bf2de187e"
down_revision: Union[str, Sequence[str], None] = "fcf64971d208"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # Add selling_price with a temporary default.
    # Existing products will receive 0.
    op.add_column(
        "products",
        sa.Column(
            "selling_price",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Remove the database-level default after existing
    # rows have been populated.
    op.alter_column(
        "products",
        "selling_price",
        server_default=None,
    )


def downgrade() -> None:

    op.drop_column(
        "products",
        "selling_price",
    )