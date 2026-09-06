from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.customers import router as customers_router
from app.api.routes.entries import router as entries_router
from app.api.routes.reports import router as reports_router
from app.api.routes.brands import router as brands_router
from app.api.routes.products import router as products_router
from app.api.routes.stock import router as stock_router
from app.api.routes.sales import router as sales_router
from app.api.routes.attendance import router as attendance_router


app = FastAPI(
    title="Bar Management System",
    description="Digital Bar Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix="/api",
)

app.include_router(
    users_router,
    prefix="/api",
)

app.include_router(
    customers_router,
    prefix="/api",
)

app.include_router(
    entries_router,
    prefix="/api",
)

app.include_router(
    reports_router,
    prefix="/api",
)

app.include_router(
    brands_router,
    prefix="/api",
)

app.include_router(
    products_router,
    prefix="/api",
)

app.include_router(
    stock_router,
    prefix="/api",
)

app.include_router(
    sales_router,
    prefix="/api",
)

app.include_router(
    attendance_router,
    prefix="/api",
)


@app.on_event("startup")
def on_startup():
    try:
        from app.core.database import engine, Base
        import app.models.user
        import app.models.product
        import app.models.brand
        import app.models.stock_receipt
        import app.models.stock_transaction
        import app.models.sale
        import app.models.customer
        import app.models.entry
        import app.models.attendance
        import app.models.daily_tally

        # Ensure all database tables exist
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Startup create_all error: {e}")

    try:
        from app.core.database import engine
        from sqlalchemy import text
        cols = [
            'imfs_subtotal NUMERIC(12,2) DEFAULT 0.0',
            'beer_subtotal NUMERIC(12,2) DEFAULT 0.0',
            'second_sale_tax NUMERIC(12,2) DEFAULT 0.0',
            'grand_total NUMERIC(12,2) DEFAULT 0.0',
            'tcs_tax NUMERIC(12,2) DEFAULT 0.0',
            'net_amount NUMERIC(12,2) DEFAULT 0.0'
        ]
        item_cols = [
            'added_value_percent',
            'rate_per_case',
            'tcs_amount',
            'total_line_cost',
            'calculated_basic_cost',
            'mrp',
            'selling_price'
        ]
        with engine.begin() as conn:
            for col in cols:
                try:
                    conn.execute(text(f'ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS {col};'))
                except Exception:
                    pass
            for col in item_cols:
                try:
                    conn.execute(text(f'ALTER TABLE stock_receipt_items ALTER COLUMN {col} TYPE NUMERIC(12,2);'))
                except Exception:
                    pass
    except Exception as e:
        print(f"Startup stock_receipts alter table error: {e}")

    try:
        from app.core.database import SessionLocal
        from app.core.security import hash_password
        from app.models.user import User, UserRole
        from app.models.stock_receipt import StockReceipt
        from app.models.stock_transaction import StockTransaction

        db = SessionLocal()

        # Automatically seed default admin users if not present
        emails_to_seed = ["admin@gymkhanaclub.com", "avasanth081@gmail.com"]
        for target_email in emails_to_seed:
            usr = db.query(User).filter(User.email.ilike(target_email)).first()
            if not usr:
                usr = User(
                    full_name="Admin User" if "admin" in target_email else "Vasanth",
                    email=target_email,
                    password_hash=hash_password("admin123"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(usr)
                print(f"Seeded admin user: {target_email} with default password 'admin123'")
            else:
                # Ensure password is reset to admin123 if account was inactive
                usr.password_hash = hash_password("admin123")
                usr.is_active = True
                db.add(usr)
        db.commit()

        rc_count = db.query(StockReceipt).count()
        if rc_count == 0:
            db.query(StockTransaction).filter(
                StockTransaction.transaction_type == "IN",
                StockTransaction.is_deleted == False
            ).update({"is_deleted": True}, synchronize_session=False)
            db.commit()
            print("Cleared orphan stock IN transactions as 0 arrival receipts exist.")
        db.close()
    except Exception as e:
        print(f"Startup user seed / stock sync error: {e}")


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Bar Management System API",
    }