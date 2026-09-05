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
        from sync_master_products import sync_products
        sync_products()
    except Exception as e:
        print(f"Startup product sync error: {e}")

    try:
        from app.core.database import SessionLocal
        from app.models.stock_receipt import StockReceipt
        from app.models.stock_transaction import StockTransaction
        db = SessionLocal()
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
        print(f"Startup stock sync error: {e}")


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Bar Management System API",
    }