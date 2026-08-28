from pydantic import BaseModel
from typing import List


class DailyEntryReport(BaseModel):
    report_date: str
    customers_entered: int
    additional_guests: int
    total_people_entered: int


class BrandSalesReport(BaseModel):
    brand_id: int
    brand_name: str
    quantity_sold: int


class ProductSalesReport(BaseModel):
    product_id: int
    product_name: str
    brand_name: str
    quantity_sold: int


class DailySummaryResponse(BaseModel):
    report_date: str

    customers_entered: int
    additional_guests: int
    total_people_entered: int

    total_bottles_sold: int

    brands: List[BrandSalesReport]
    products: List[ProductSalesReport]