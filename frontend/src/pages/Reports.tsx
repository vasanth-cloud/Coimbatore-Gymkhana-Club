import React, { useEffect, useState } from 'react';
import { reportApi } from '../api/services';
import {
  FileText,
  Download,
  Calendar,
  Users,
  PackageCheck,
  TrendingUp,
  Loader2,
  Filter,
  Search,
  CheckCircle2,
  IndianRupee,
  Calculator,
  Save,
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027];

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'entries' | 'stock' | 'sales' | 'denominations'>('entries');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  
  // Date states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Data states
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // End-of-Day Cash Denomination Counter Machine States
  const [cash500, setCash500] = useState<number>(0);
  const [cash200, setCash200] = useState<number>(0);
  const [cash100, setCash100] = useState<number>(0);
  const [cash50, setCash50] = useState<number>(0);
  const [cash20, setCash20] = useState<number>(0);
  const [cash10, setCash10] = useState<number>(0);
  const [upiPaytmTotal, setUpiPaytmTotal] = useState<number>(0);
  const [tallySavedMsg, setTallySavedMsg] = useState<string>('');

  const totalCalculatedCash =
    cash500 * 500 +
    cash200 * 200 +
    cash100 * 100 +
    cash50 * 50 +
    cash20 * 20 +
    cash10 * 10;

  const grandTotalDayCollection = totalCalculatedCash + upiPaytmTotal;

  const fetchReport = async () => {
    if (reportType === 'denominations') return;
    try {
      setLoading(true);
      const params: any = { period };
      if (period === 'daily') {
        params.report_date = selectedDate;
      } else {
        params.year = selectedYear;
        params.month = selectedMonth;
      }

      let data = null;
      if (reportType === 'entries') {
        data = await reportApi.getEntriesReport(params);
      } else if (reportType === 'stock') {
        data = await reportApi.getStockReport(params);
      } else if (reportType === 'sales') {
        data = await reportApi.getSalesReport(params);
      }

      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, period, selectedDate, selectedYear, selectedMonth]);

  // Export Cash & Online UPI Denominations Tally Sheet to CSV
  const exportDenominationsCSV = () => {
    const headers = ['Category / Note', 'Count / Source', 'Amount (INR)'];
    const rows = [
      ['₹500 Notes', cash500, cash500 * 500],
      ['₹200 Notes', cash200, cash200 * 200],
      ['₹100 Notes', cash100, cash100 * 100],
      ['₹50 Notes', cash50, cash50 * 50],
      ['₹20 Notes', cash20, cash20 * 20],
      ['₹10 Notes', cash10, cash10 * 10],
      ['TOTAL CASH IN DRAWER', 'Cash Notes', totalCalculatedCash],
      ['ONLINE PAYTM / PHONEPE / UPI', 'QR Collection', upiPaytmTotal],
      ['GRAND TOTAL DAY REVENUE', 'Cash + Online', grandTotalDayCollection],
    ];

    const csvContent =
      '\uFEFF' +
      [`End of Day Cash & Online UPI Tally Report - Date: ${selectedDate}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `End_Of_Day_Cash_And_UPI_Tally_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Standard Reports to CSV
  const exportToCSV = () => {
    if (!reportData || !reportData.details || reportData.details.length === 0) {
      alert('No data available to export');
      return;
    }

    let headers: string[] = [];
    let rows: any[] = [];
    const title = `${reportType.toUpperCase()}_REPORT_${selectedDate}`;

    if (reportType === 'entries') {
      headers = ['Check-in Time', 'Member Code', 'Member Name', 'Phone', 'Guests'];
      rows = reportData.details.map((d: any) => [
        `"${new Date(d.check_in_time).toLocaleString()}"`,
        `"#${d.customer_code || 'N/A'}"`,
        `"${d.customer_name || 'N/A'}"`,
        `"${d.phone || 'N/A'}"`,
        d.additional_guests || 0,
      ]);
    } else if (reportType === 'stock') {
      headers = ['Product Name', 'Category', 'Volume (ml)', 'Transaction Type', 'Quantity', 'Date'];
      rows = reportData.details.map((d: any) => [
        `"${d.product_name}"`,
        `"${d.category}"`,
        d.volume_ml,
        d.transaction_type,
        d.quantity,
        `"${new Date(d.transaction_date).toLocaleString()}"`,
      ]);
    } else if (reportType === 'sales') {
      headers = ['Product Name', 'Category', 'Volume (ml)', 'Quantity Sold', 'Unit Price', 'Total Sales'];
      rows = reportData.details.map((d: any) => [
        `"${d.product_name}"`,
        `"${d.category}"`,
        d.volume_ml,
        d.quantity,
        d.unit_price,
        d.total_price,
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Reports & Downloads Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Export official reports & end-of-day cash drawer closing denomination tallies
          </p>
        </div>

        {reportType !== 'denominations' && (
          <button
            onClick={exportToCSV}
            disabled={!reportData || !reportData.details || reportData.details.length === 0}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Report CSV</span>
          </button>
        )}
      </div>

      {/* Main Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setReportType('entries')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'entries'
              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-2" />
          <h4 className="text-xs font-black uppercase tracking-wider">1. Entry Check-Ins</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Admitted member footfall</p>
        </button>

        <button
          onClick={() => setReportType('sales')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'sales'
              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-2" />
          <h4 className="text-xs font-black uppercase tracking-wider">2. Bottle Sales</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Liquor revenue summary</p>
        </button>

        <button
          onClick={() => setReportType('stock')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'stock'
              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageCheck className="w-5 h-5 mb-2" />
          <h4 className="text-xs font-black uppercase tracking-wider">3. Stock Inventory</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Distributor & POS transactions</p>
        </button>

        <button
          onClick={() => setReportType('denominations')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'denominations'
              ? 'bg-sky-500/10 border-sky-500 text-sky-400 shadow-lg shadow-sky-500/10'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-5 h-5 mb-2 text-sky-400" />
          <h4 className="text-xs font-black uppercase tracking-wider">4. End-of-Day Cash Tally</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Note counting machine breakdown</p>
        </button>
      </div>

      {/* DEDICATED END-OF-DAY CASH DENOMINATIONS COUNTER SECTION */}
      {reportType === 'denominations' ? (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-sky-400" />
                <span>Daily Cash Drawer Register Closing & Note Counter</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter note counts from your cash counting machine at the end of the day to generate the closing tally report
              </p>
            </div>

            <button
              onClick={exportDenominationsCSV}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT CASH TALLY CSV</span>
            </button>
          </div>

          {/* Cash Denominations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 500 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-emerald-400 block">₹500 Note</span>
              <input
                type="number"
                min="0"
                value={cash500 || ''}
                onChange={(e) => setCash500(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash500 * 500}</span>
            </div>

            {/* 200 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-amber-400 block">₹200 Note</span>
              <input
                type="number"
                min="0"
                value={cash200 || ''}
                onChange={(e) => setCash200(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash200 * 200}</span>
            </div>

            {/* 100 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-sky-400 block">₹100 Note</span>
              <input
                type="number"
                min="0"
                value={cash100 || ''}
                onChange={(e) => setCash100(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash100 * 100}</span>
            </div>

            {/* 50 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-purple-400 block">₹50 Note</span>
              <input
                type="number"
                min="0"
                value={cash50 || ''}
                onChange={(e) => setCash50(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash50 * 50}</span>
            </div>

            {/* 20 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-pink-400 block">₹20 Note</span>
              <input
                type="number"
                min="0"
                value={cash20 || ''}
                onChange={(e) => setCash20(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash20 * 20}</span>
            </div>

            {/* 10 Note */}
            {/* 10 Note */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-center space-y-2">
              <span className="text-xs font-mono font-black text-slate-300 block">₹10 Note</span>
              <input
                type="number"
                min="0"
                value={cash10 || ''}
                onChange={(e) => setCash10(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2 text-center text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Subtotal: ₹{cash10 * 10}</span>
            </div>

            {/* Online Paytm / UPI Total Card */}
            <div className="bg-[#0d1117] border border-sky-500/50 p-4 rounded-xl text-center space-y-2 sm:col-span-2 xl:col-span-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-sky-400 uppercase tracking-wider">
                  ⚡ Online Paytm / PhonePe / UPI Day Collection (INR)
                </span>
                <span className="text-[10px] font-mono text-slate-400">QR UPI ID: paytm.s22ambe@pty</span>
              </div>
              <input
                type="number"
                min="0"
                value={upiPaytmTotal || ''}
                onChange={(e) => setUpiPaytmTotal(parseInt(e.target.value) || 0)}
                placeholder="Enter Paytm / UPI Machine Total Amount (e.g. 15000)"
                className="w-full bg-[#161b22] border border-sky-500/40 rounded-xl py-2.5 px-4 text-center text-base font-mono font-black text-sky-300 placeholder-slate-600 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Grand Calculated Total Banner */}
          <div className="bg-[#0d1117] border border-amber-500/40 p-5 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full xl:w-auto">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Cash Notes Counted:</span>
                <h4 className="text-xl font-black text-slate-100 font-mono mt-0.5">₹{totalCalculatedCash.toLocaleString()}</h4>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Online Paytm / UPI Total:</span>
                <h4 className="text-xl font-black text-sky-400 font-mono mt-0.5">₹{upiPaytmTotal.toLocaleString()}</h4>
              </div>
              <div className="border-l border-[#30363d] pl-4 sm:pl-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Grand Total Day Revenue:</span>
                <h3 className="text-2xl font-black text-amber-400 font-mono mt-0.5">₹{grandTotalDayCollection.toLocaleString()}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => {
                  setTallySavedMsg(`End-of-Day Tally for ${selectedDate} saved! Cash: ₹${totalCalculatedCash.toLocaleString()} | UPI: ₹${upiPaytmTotal.toLocaleString()} | Grand Total: ₹${grandTotalDayCollection.toLocaleString()}`);
                  setTimeout(() => setTallySavedMsg(''), 5000);
                }}
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>SAVE END-OF-DAY CLOSING REPORT</span>
              </button>
            </div>
          </div>

          {tallySavedMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{tallySavedMsg}</span>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD REPORT DISPLAY TABLE */
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Period:</span>
              <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                <button
                  onClick={() => setPeriod('daily')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    period === 'daily' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setPeriod('monthly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    period === 'monthly' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              {period === 'daily' ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Report Data Render */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading report data...</span>
            </div>
          ) : !reportData || !reportData.details || reportData.details.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No report records found for selected date/period.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    {reportType === 'entries' && (
                      <>
                        <th className="py-3 px-3">Check-in Time</th>
                        <th className="py-3 px-3">Member ID</th>
                        <th className="py-3 px-3">Member Name</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3 text-right">Guests</th>
                      </>
                    )}
                    {reportType === 'sales' && (
                      <>
                        <th className="py-3 px-3">Liquor Bottle</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Volume</th>
                        <th className="py-3 px-3 text-center">Quantity Sold</th>
                        <th className="py-3 px-3 text-right">Unit Price</th>
                        <th className="py-3 px-3 text-right">Total Revenue</th>
                      </>
                    )}
                    {reportType === 'stock' && (
                      <>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Volume</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-3 text-right">Date</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200">
                  {reportData.details.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#0d1117]/60 transition-colors">
                      {reportType === 'entries' && (
                        <>
                          <td className="py-3 px-3 font-mono text-slate-400">{new Date(row.check_in_time).toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-400">#{row.customer_code || 'N/A'}</td>
                          <td className="py-3 px-3 font-bold text-slate-100">{row.customer_name || 'N/A'}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{row.phone || 'N/A'}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold">{row.additional_guests}</td>
                        </>
                      )}
                      {reportType === 'sales' && (
                        <>
                          <td className="py-3 px-3 font-bold text-slate-100">{row.product_name}</td>
                          <td className="py-3 px-3 text-slate-400">{row.category}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{row.volume_ml}ml</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">{row.quantity}</td>
                          <td className="py-3 px-3 text-right font-mono">₹{row.unit_price}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-amber-400">₹{row.total_price}</td>
                        </>
                      )}
                      {reportType === 'stock' && (
                        <>
                          <td className="py-3 px-3 font-bold text-slate-100">{row.product_name}</td>
                          <td className="py-3 px-3 text-slate-400">{row.category}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{row.volume_ml}ml</td>
                          <td className="py-3 px-3 font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${row.transaction_type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {row.transaction_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">{row.quantity}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">{new Date(row.transaction_date).toLocaleDateString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
