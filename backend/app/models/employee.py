from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Employee(BaseModel):
    __tablename__ = "employees"

    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    designation = Column(String(100), nullable=False)
    daily_wage = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    advances = relationship("SalaryAdvance", back_populates="employee", cascade="all, delete-orphan")
