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


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Bar Management System API",
    }