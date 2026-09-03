from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SalaryAdvance(BaseModel):
    __tablename__ = "salary_advances"

    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    amount = Column(Integer, default=0, nullable=False)
    advance_date = Column(Date, nullable=True)
    notes = Column(String(255), nullable=True)

    employee = relationship("Employee", back_populates="advances")
