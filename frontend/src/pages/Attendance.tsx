import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../api/services';
import { AttendanceSummary, AttendanceEmployee } from '../types';
import {
  ClipboardList,
  CalendarCheck2,
  Coins,
  FileSpreadsheet,
  Plus,
  Loader2,
  CheckCircle2,
  UserPlus,
  IndianRupee,
  Search,
  Check,
  X,
  User,
} from 'lucide-react';

export const Attendance: React.FC = () => {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'payroll' | 'add'>('matrix');

  // Form states
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedEmpForAdv, setSelectedEmpForAdv] = useState<number | null>(null);

  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDesig, setEmpDesig] = useState('');
  const [empWage, setEmpWage] = useState(800);

  const [advAmt, setAdvAmt] = useState(1000);
  const [advNotes, setAdvNotes] = useState('');

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getSummary(selectedMonth, selectedYear);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load attendance summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedMonth, selectedYear]);

  const handleToggleStatus = async (empId: number, day: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'P' ? 'A' : currentStatus === 'A' ? 'L' : 'P';
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      await attendanceApi.markAttendance({
        employee_id: empId,
        date: dateStr,
        status: nextStatus,
      });

      // Optimistic local update
      if (summary) {
        const updatedEmployees = summary.employees.map((emp) => {
          if (emp.employee_id === empId) {
            const dayStr = String(day).padStart(2, '0');
            const newDaily = { ...emp.daily_status, [dayStr]: nextStatus };
            return { ...emp, daily_status: newDaily };
          }
          return emp;
        });
        setSummary({ ...summary, employees: updatedEmployees });
      }
    } catch (err) {
      console.error('Failed to mark attendance:', err);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await attendanceApi.createEmployee({
        employee_code: empCode.toUpperCase(),
        name: empName.toUpperCase(),
        designation: empDesig.toUpperCase(),
        daily_wage: Number(empWage),
      });
      setMsg({ type: 'success', text: `Added staff employee ${empName}!` });
      setShowAddEmpModal(false);
      setEmpCode('');
      setEmpName('');
      setEmpDesig('');
      loadSummary();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to create employee.' });
    }
  };

  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAdv) return;
    try {
      await attendanceApi.recordAdvance({
        employee_id: selectedEmpForAdv,
        amount: Number(advAmt),
        notes: advNotes,
      });
      setMsg({ type: 'success', text: `Recorded advance payment of ₹${advAmt}!` });
      setShowAdvanceModal(false);
      loadSummary();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to record advance.' });
    }
  };

  const filteredEmployees = summary
    ? summary.employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
          e.designation.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-400" />
            <span>Staff Attendance & Salary Payroll</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily Attendance Register (P/A/L) • Daily Wage Salary Calculation • Salary Advances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddEmpModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ADD STAFF EMPLOYEE</span>
          </button>

          <a
            href={attendanceApi.downloadExcel(selectedMonth, selectedYear)}
            download
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>DOWNLOAD PAYROLL EXCEL</span>
          </a>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Staff Employees:</span>
          <h4 className="text-xl font-black text-slate-100 font-mono mt-1">{summary?.total_employees || 0} Staff Members</h4>
        </div>
        <div className="bg-[#161b22] border border-emerald-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Earned Monthly Payroll:</span>
          <h4 className="text-xl font-black text-emerald-400 font-mono mt-1">₹{(summary?.total_payroll || 0).toLocaleString()}</h4>
        </div>
        <div className="bg-[#161b22] border border-amber-500/30 p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Total Salary Advances Paid:</span>
          <h4 className="text-xl font-black text-amber-400 font-mono mt-1">₹{(summary?.total_advances || 0).toLocaleString()}</h4>
        </div>
        <div className="bg-[#161b22] border border-sky-500/40 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">Net Salary Payable:</span>
          <h4 className="text-xl font-black text-sky-400 font-mono mt-1">
            ₹{Math.max(0, (summary?.total_payroll || 0) - (summary?.total_advances || 0)).toLocaleString()}
          </h4>
        </div>
      </div>

      {/* Filter & View Tabs */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">Select Month / Year:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            >
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff name, code, designation..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-t border-[#21262d] pt-3">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1117]'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Monthly Attendance Matrix (01-31)</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1117]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Salary Payroll & Advances</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MONTHLY ATTENDANCE MATRIX TABLE */}
      {activeTab === 'matrix' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
              Daily Attendance Status (Click cell to toggle: P = Present, A = Absent, L = Leave)
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">P = Present</span>
              <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">A = Absent</span>
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">L = Leave</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading staff attendance matrix...</span>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-3 px-3 font-sans">Emp ID</th>
                    <th className="py-3 px-3 font-sans">Employee Name</th>
                    <th className="py-3 px-3 font-sans">Designation</th>
                    <th className="py-3 px-2 text-right font-sans">Wage</th>

                    {Array.from({ length: summary?.total_days || 31 }, (_, i) => i + 1).map((day) => (
                      <th key={day} className="py-3 px-1.5 text-center border-l border-[#21262d]/50">
                        {String(day).padStart(2, '0')}
                      </th>
                    ))}

                    <th className="py-3 px-2 text-center text-emerald-400 border-l border-[#30363d]">Present</th>
                    <th className="py-3 px-2 text-center text-rose-400">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-amber-400">{emp.employee_code}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-100 font-sans">{emp.name}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">{emp.designation}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-400">₹{emp.daily_wage}</td>

                      {Array.from({ length: summary?.total_days || 31 }, (_, i) => i + 1).map((day) => {
                        const dayStr = String(day).padStart(2, '0');
                        const st = emp.daily_status[dayStr] || 'P';

                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleStatus(emp.employee_id, day, st)}
                            className={`py-2 px-1 text-center font-bold border-l border-[#21262d]/50 cursor-pointer select-none transition-colors ${
                              st === 'P'
                                ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20'
                                : st === 'A'
                                ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/25'
                                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/25'
                            }`}
                          >
                            {st}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-center font-black text-emerald-400 border-l border-[#30363d] bg-emerald-500/5">
                        {emp.present_days}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-rose-400 bg-rose-500/5">
                        {emp.absent_days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SALARY PAYROLL & ADVANCES TABLE */}
      {activeTab === 'payroll' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
              Staff Monthly Salary Payroll & Advances Breakdown
            </h3>
          </div>

          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                  <th className="py-3 px-3">Emp ID</th>
                  <th className="py-3 px-3">Employee Name</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-right">Daily Wage</th>
                  <th className="py-3 px-3 text-center text-emerald-400">Present Days</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Earned Salary</th>
                  <th className="py-3 px-3 text-right text-amber-400">Advance Taken</th>
                  <th className="py-3 px-3 text-right text-sky-400">Net Payable</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-slate-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-[#0d1117]/60 transition-colors font-mono">
                    <td className="py-3 px-3 font-bold text-amber-400">{emp.employee_code}</td>
                    <td className="py-3 px-3 font-bold text-slate-100 font-sans">{emp.name}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{emp.designation}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">₹{emp.daily_wage}</td>
                    <td className="py-3 px-3 text-center font-black text-emerald-400 bg-emerald-500/5">
                      {emp.present_days} Days
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400">
                      ₹{emp.earned_salary.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-400">
                      ₹{emp.advance_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sky-400 text-sm">
                      ₹{emp.net_payable.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedEmpForAdv(emp.employee_id);
                          setShowAdvanceModal(true);
                        }}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold rounded-lg text-[10px] font-sans transition-colors"
                      >
                        + Record Advance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <button
              onClick={() => setShowAddEmpModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Add New Staff Employee</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Enter staff details and daily wage rate</p>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Emp ID Code:</label>
                <input
                  type="text"
                  required
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  placeholder="e.g. EMP012"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Employee Name:</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. KARTHIK"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Designation:</label>
                <input
                  type="text"
                  required
                  value={empDesig}
                  onChange={(e) => setEmpDesig(e.target.value)}
                  placeholder="e.g. CASH, SUPERVISOR, FEND"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Daily Wage (₹):</label>
                <input
                  type="number"
                  required
                  value={empWage}
                  onChange={(e) => setEmpWage(Number(e.target.value))}
                  placeholder="e.g. 800"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD SALARY ADVANCE MODAL */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <button
              onClick={() => setShowAdvanceModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Record Advance Salary Payment</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Log advance amount given to staff</p>
            </div>

            <form onSubmit={handleRecordAdvance} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Advance Amount (₹):</label>
                <input
                  type="number"
                  required
                  value={advAmt}
                  onChange={(e) => setAdvAmt(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-300 block mb-1">Notes / Reason:</label>
                <input
                  type="text"
                  value={advNotes}
                  onChange={(e) => setAdvNotes(e.target.value)}
                  placeholder="e.g. Advance for festival / personal"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  Record Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
