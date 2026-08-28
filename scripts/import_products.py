import sys
from pathlib import Path

import pandas as pd

# Add backend directory to Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.product import Product


# =========================================================
# CONFIGURATION
# =========================================================

EXCEL_FILE = BASE_DIR / "data" / "products.xlsx"


# =========================================================
# HELPERS
# =========================================================

def clean_text(value):
    if pd.isna(value):
        return ""

    return str(value).strip()


def clean_int(value, default=0):

    if pd.isna(value):
        return default

    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


# =========================================================
# IMPORT
# =========================================================

def import_products():

    if not EXCEL_FILE.exists():

        print(
            f"Excel file not found:\n{EXCEL_FILE}"
        )

        return

    print(
        f"Reading Excel:\n{EXCEL_FILE}"
    )

    df = pd.read_excel(
        EXCEL_FILE
    )

    print(
        f"Found {len(df)} rows"
    )

    print(
        "Columns found:"
    )

    print(
        list(df.columns)
    )

    db = SessionLocal()

    created_brands = 0
    existing_brands = 0

    created_products = 0
    updated_products = 0
    skipped_products = 0

    try:

        for index, row in df.iterrows():

            row_number = index + 2

            # -------------------------------------------------
            # READ EXCEL VALUES
            # -------------------------------------------------

            brand_name = clean_text(
                row["Brand"]
            )

            product_name = clean_text(
                row["Product"]
            )

            category = clean_text(
                row["Category"]
            )

            volume_ml = clean_int(
                row["Volume ML"]
            )

            unit = clean_text(
                row["Unit"]
            )

            selling_price = clean_int(
                row["Selling Price"]
            )

            # -------------------------------------------------
            # VALIDATION
            # -------------------------------------------------

            if not brand_name:

                print(
                    f"Row {row_number}: "
                    f"Skipping - brand is empty"
                )

                skipped_products += 1
                continue

            if not product_name:

                print(
                    f"Row {row_number}: "
                    f"Skipping - product is empty"
                )

                skipped_products += 1
                continue

            if not category:

                print(
                    f"Row {row_number}: "
                    f"Skipping - category is empty"
                )

                skipped_products += 1
                continue

            if volume_ml <= 0:

                print(
                    f"Row {row_number}: "
                    f"Skipping - invalid volume"
                )

                skipped_products += 1
                continue

            if selling_price <= 0:

                print(
                    f"Row {row_number}: "
                    f"Skipping - invalid selling price"
                )

                skipped_products += 1
                continue

            # -------------------------------------------------
            # FIND / CREATE BRAND
            # -------------------------------------------------

            brand = (
                db.query(Brand)
                .filter(
                    Brand.name == brand_name,
                    Brand.is_deleted == False,
                )
                .first()
            )

            if brand:

                existing_brands += 1

            else:

                brand = Brand(
                    name=brand_name,
                    is_active=True,
                )

                db.add(brand)

                db.flush()

                created_brands += 1

                print(
                    f"Created brand: {brand_name}"
                )

            # -------------------------------------------------
            # FIND EXISTING PRODUCT
            # -------------------------------------------------

            product = (
                db.query(Product)
                .filter(
                    Product.brand_id == brand.id,
                    Product.name == product_name,
                    Product.is_deleted == False,
                )
                .first()
            )

            # -------------------------------------------------
            # UPDATE EXISTING PRODUCT
            # -------------------------------------------------

            if product:

                product.category = category
                product.volume_ml = volume_ml
                product.unit = unit
                product.selling_price = selling_price

                updated_products += 1

                print(
                    f"Updated: "
                    f"{brand_name} - "
                    f"{product_name} - "
                    f"₹{selling_price}"
                )

            # -------------------------------------------------
            # CREATE NEW PRODUCT
            # -------------------------------------------------

            else:

                product = Product(
                    brand_id=brand.id,
                    name=product_name,
                    category=category,
                    volume_ml=volume_ml,
                    unit=unit,
                    selling_price=selling_price,
                    is_active=True,
                )

                db.add(product)

                created_products += 1

                print(
                    f"Created: "
                    f"{brand_name} - "
                    f"{product_name} - "
                    f"₹{selling_price}"
                )

        # -----------------------------------------------------
        # COMMIT EVERYTHING
        # -----------------------------------------------------

        db.commit()

        print("\n===================================")
        print("IMPORT COMPLETED")
        print("===================================")

        print(
            f"Brands created   : {created_brands}"
        )

        print(
            f"Brands existing  : {existing_brands}"
        )

        print(
            f"Products created : {created_products}"
        )

        print(
            f"Products updated : {updated_products}"
        )

        print(
            f"Products skipped : {skipped_products}"
        )

        print("===================================")

    except Exception as e:

        db.rollback()

        print(
            "\nIMPORT FAILED"
        )

        print(
            f"Error: {e}"
        )

        raise

    finally:

        db.close()


if __name__ == "__main__":

    import_products()