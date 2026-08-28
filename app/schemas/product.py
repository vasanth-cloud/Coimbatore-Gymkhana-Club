from pydantic import BaseModel, ConfigDict


# =========================================================
# CREATE PRODUCT
# =========================================================

class ProductCreateRequest(BaseModel):
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: int


# =========================================================
# UPDATE PRODUCT PRICE
# =========================================================

class ProductUpdateRequest(BaseModel):
    selling_price: int


# =========================================================
# PRODUCT RESPONSE
# =========================================================

class ProductResponse(BaseModel):
    id: int
    brand_id: int
    name: str
    category: str
    volume_ml: int
    unit: str
    selling_price: int
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True
    )