from io import BytesIO
from calendar import monthrange
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel as PyBaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from app.api.dependencies.auth import require_admin, require_staff_or_admin

router = APIRouter(prefix="/attendance", tags=["Attendance & Payroll"])


class MarkAttendanceRequest(PyBaseModel):
    employee_id: int
    date: str  # YYYY-MM-DD
    status: str  # 'P', 'A', 'L'


class EmployeeCreateRequest(PyBaseModel):
    employee_code: str
    name: str
    designation: str
    daily_wage: int


class AdvanceRequest(PyBaseModel):
    employee_id: int
    amount: int
    notes: Optional[str] = None


@router.get("/summary")
def get_attendance_summary(
    month: int = Query(default=9),
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    num_days = monthrange(year, month)[1]
    employees = db.query(Employee).filter(Employee.is_deleted == False).order_by(Employee.employee_code.asc()).all()

    summary_list = []
    total_payroll = 0
    total_advances = 0

    for emp in employees:
        # Fetch attendances for month
        attendances = (
            db.query(Attendance)
            .filter(
                Attendance.employee_id == emp.id,
                func.extract("month", Attendance.date) == month,
                func.extract("year", Attendance.date) == year,
                Attendance.is_deleted == False,
            )
            .all()
        )

        daily_status = {}
        present_days = 0
        absent_days = 0
        leave_days = 0

        for att in attendances:
            day_str = f"{att.date.day:02d}"
            daily_status[day_str] = att.status
            if att.status == "P":
                present_days += 1
            elif att.status == "A":
                absent_days += 1
            elif att.status == "L":
                leave_days += 1

        # Fetch total advance
        advances = (
            db.query(SalaryAdvance)
            .filter(SalaryAdvance.employee_id == emp.id, SalaryAdvance.is_deleted == False)
            .all()
        )
        advance_total = sum([adv.amount for adv in advances])

        earned_salary = present_days * emp.daily_wage
        net_payable = max(0, earned_salary - advance_total)

        total_payroll += earned_salary
        total_advances += advance_total

        summary_list.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "name": emp.name,
            "designation": emp.designation,
            "daily_wage": emp.daily_wage,
            "present_days": present_days,
            "absent_days": absent_days,
            "leave_days": leave_days,
            "earned_salary": earned_salary,
            "advance_amount": advance_total,
            "net_payable": net_payable,
            "daily_status": daily_status,
        })

    return {
        "month": month,
        "year": year,
        "total_days": num_days,
        "total_employees": len(employees),
        "total_payroll": total_payroll,
        "total_advances": total_advances,
        "employees": summary_list,
    }


@router.post("/mark")
def mark_attendance(
    req: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        att_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    emp = db.query(Employee).filter(Employee.id == req.employee_id, Employee.is_deleted == False).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    att = (
        db.query(Attendance)
        .filter(Attendance.employee_id == req.employee_id, Attendance.date == att_date)
        .first()
    )

    if not att:
        att = Attendance(
            employee_id=req.employee_id,
            date=att_date,
            status=req.status.upper(),
        )
        db.add(att)
    else:
        att.status = req.status.upper()
        att.is_deleted = False

    db.commit()
    return {"status": "success", "message": f"Marked {emp.name} as {req.status} on {req.date}"}


@router.post("/employee")
def create_employee(
    req: EmployeeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Employee).filter(Employee.employee_code == req.employee_code).first()
    if existing:
        existing.name = req.name
        existing.designation = req.designation
        existing.daily_wage = req.daily_wage
        existing.is_deleted = False
        db.commit()
        return {"status": "success", "message": f"Updated employee {req.name}"}

    emp = Employee(
        employee_code=req.employee_code,
        name=req.name,
        designation=req.designation,
        daily_wage=req.daily_wage,
    )
    db.add(emp)
    db.commit()
    return {"status": "success", "message": f"Created employee {req.name}"}


@router.post("/advance")
def record_advance(
    req: AdvanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")

    adv = SalaryAdvance(
        employee_id=req.employee_id,
        amount=req.amount,
        advance_date=date.today(),
        notes=req.notes or "Advance Salary Payment"
    )
    db.add(adv)
    db.commit()
    return {"status": "success", "message": f"Recorded advance ₹{req.amount} for {emp.name}"}


@router.get("/export")
def export_attendance_excel(
    month: int = Query(default=9),
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    import openpyxl

    summary_data = get_attendance_summary(month=month, year=year, db=db, current_user=current_user)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Attendance_{month:02d}_{year}"

    headers = ["Emp ID", "Employee Name", "Designation", "Daily Wage"]
    for day in range(1, summary_data["total_days"] + 1):
        headers.append(f"{day:02d}")
    headers.extend(["Present Days", "Total Earned Salary", "Advance Taken", "Net Payable Salary"])

    ws.append(headers)

    for emp in summary_data["employees"]:
        row = [
            emp["employee_code"],
            emp["name"],
            emp["designation"],
            emp["daily_wage"],
        ]
        for day in range(1, summary_data["total_days"] + 1):
            day_str = f"{day:02d}"
            row.append(emp["daily_status"].get(day_str, "P"))
        
        row.extend([
            emp["present_days"],
            emp["earned_salary"],
            emp["advance_amount"],
            emp["net_payable"],
        ])
        ws.append(row)

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"Staff_Attendance_Payroll_{year}_{month:02d}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
