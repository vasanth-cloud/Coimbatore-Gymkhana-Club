import openpyxl
from datetime import date
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.base import BaseModel
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance

print("Creating attendance PostgreSQL tables...")
BaseModel.metadata.create_all(bind=engine)

excel_path = r"C:\Icons\Desktop\CGC SEPTEMBER 26.xlsx"
print(f"Loading sheet 'ATTENDANCE' from {excel_path}...")

wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb['ATTENDANCE']

db = SessionLocal()

# Seed / Update Employees from Rows 5 to 15
employees_data = [
    ("EMP001", "GOWRISHANKAR", "CLUB MANAGER", 1000),
    ("EMP002", "VINODH", "SUPERVISOR", 1000),
    ("EMP003", "MADAVAN", "CASH", 800),
    ("EMP004", "NAGARAJ", "CASH", 800),
    ("EMP005", "PRADEEP", "CASH", 800),
    ("EMP006", "MARISEKAR", "CASH", 700),
    ("EMP007", "SUBASH", "CASH", 600),
    ("EMP008", "BALA(PT)", "FEND", 800),
    ("EMP009", "DHAMU(PT)", "FEND", 800),
    ("EMP010", "SIDDARTH", "FEND", 500),
    ("EMP011", "KARUPPU", "FEND", 800),
]

emp_map = {}

for code, name, desig, wage in employees_data:
    emp = db.query(Employee).filter(Employee.employee_code == code).first()
    if not emp:
        emp = Employee(
            employee_code=code,
            name=name,
            designation=desig,
            daily_wage=wage,
            is_active=True
        )
        db.add(emp)
        db.flush()
    else:
        emp.name = name
        emp.designation = desig
        emp.daily_wage = wage
    emp_map[name] = emp

db.commit()

# Seed Advances (Rows 17-23)
advances_data = [
    ("GOWRISHANKAR", 5650),
    ("VINODH", 9500),
    ("MARISEKAR", 0),
    ("SUBASH", 10000),
    ("BALA(PT)", 11000),
    ("DHAMU(PT)", 11000),
    ("KARUPPU", 8000),
]

for emp_name, adv_amt in advances_data:
    emp = emp_map.get(emp_name)
    if emp and adv_amt > 0:
        existing = db.query(SalaryAdvance).filter(SalaryAdvance.employee_id == emp.id).first()
        if not existing:
            adv = SalaryAdvance(
                employee_id=emp.id,
                amount=adv_amt,
                advance_date=date.today(),
                notes="Initial Excel Advance Import"
            )
            db.add(adv)
        else:
            existing.amount = adv_amt

db.commit()
print("ALL EMPLOYEES AND SALARY ADVANCE DATA SEEDED SUCCESSFULLY!")
