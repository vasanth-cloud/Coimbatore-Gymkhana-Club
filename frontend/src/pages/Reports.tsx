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
  const [reportType, setReportType] = useState<'entries' | 'stock' | 'sales'>('entries');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  
  // Date states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Data states
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = async () => {
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

  // Export to CSV Function
  const exportToCSV = () => {
    if (!reportData || !reportData.items || reportData.items.length === 0) {
      alert('No data available to export');
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    const timeLabel = period === 'daily' ? selectedDate : `${MONTHS.find(m => m.value === selectedMonth)?.label}_${selectedYear}`;

    if (reportType === 'entries') {
      headers = ['Entry ID', 'Customer Code', 'Member Name', 'Additional Guests', 'Total Footfall', 'Entry Timestamp'];
      rows = reportData.items.map((item: any) => [
        item.entry_id,
        item.customer_code,
        `"${item.customer_name}"`,
        item.additional_guests,
        item.total_people,
        item.entry_time ? `"${new Date(item.entry_time).toLocaleString()}"` : 'N/A',
      ]);
      filename = `Customer_Entries_Report_${period}_${timeLabel}.csv`;
    } else if (reportType === 'stock') {
      headers = ['Transaction ID', 'Drink Name', 'Category', 'Volume (ml)', 'Bottles Received (+Qty)', 'Restock Timestamp'];
      rows = reportData.items.map((item: any) => [
        item.transaction_id,
        `"${item.product_name}"`,
        `"${item.category}"`,
        item.volume_ml,
        item.quantity,
        item.transaction_date ? `"${new Date(item.transaction_date).toLocaleString()}"` : 'N/A',
      ]);
      filename = `Stock_Inventory_Report_${period}_${timeLabel}.csv`;
    } else if (reportType === 'sales') {
      headers = ['Sale ID', 'Drink Name', 'Category', 'Volume (ml)', 'Bottles Sold', 'Unit Price (INR)', 'Total Revenue (INR)', 'Sale Timestamp'];
      rows = reportData.items.map((item: any) => [
        item.sale_id,
        `"${item.product_name}"`,
        `"${item.category}"`,
        item.volume_ml,
        item.quantity,
        item.unit_price,
        item.total_amount,
        item.sale_date ? `"${new Date(item.sale_date).toLocaleString()}"` : 'N/A',
      ]);
      filename = `Sales_Log_Report_${period}_${timeLabel}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter items by local search term
  const filteredItems = (reportData?.items || []).filter((item: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (reportType === 'entries') {
      return (
        item.customer_code.toLowerCase().includes(term) ||
        item.customer_name.toLowerCase().includes(term)
      );
    } else if (reportType === 'stock' || reportType === 'sales') {
      return (
        item.product_name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Title and CSV Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-amber-400" />
            <span>Reports & Analytics Hub</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Day-wise and Month-wise downloadable reports for Entries, Stock & Sales logs
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={!reportData || !reportData.items || reportData.items.length === 0}
          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 text-xs tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>📥 DOWNLOAD REPORT (CSV)</span>
        </button>
      </div>

      {/* Report Module Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setReportType('entries')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'entries'
              ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-lg'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5" />
            <span className="font-extrabold text-sm">Customer Entries</span>
          </div>
          <p className="text-xs opacity-80">Guest footfall & additional people log</p>
        </button>

        <button
          onClick={() => setReportType('stock')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'stock'
              ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-lg'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <PackageCheck className="w-5 h-5" />
            <span className="font-extrabold text-sm">Stock & Inventory</span>
          </div>
          <p className="text-xs opacity-80">Shipments received & bottle restocks</p>
        </button>

        <button
          onClick={() => setReportType('sales')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            reportType === 'sales'
              ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-lg'
              : 'bg-[#161b22] border-[#21262d] text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5" />
            <span className="font-extrabold text-sm">Sales & Revenue</span>
          </div>
          <p className="text-xs opacity-80">Drink sales, rate & revenue tally</p>
        </button>
      </div>

      {/* Date & Period Controls Bar */}
      <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle Period: Daily vs Monthly */}
        <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              period === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Day-Wise (Daily)
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              period === 'monthly'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📆 Month-Wise (Monthly)
          </button>
        </div>

        {/* Date Selector Inputs */}
        <div className="flex items-center gap-3">
          {period === 'daily' ? (
            <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl">
                <span className="text-xs font-bold text-slate-300">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#161b22]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl">
                <span className="text-xs font-bold text-slate-300">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none font-mono"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#161b22]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportType === 'entries' && (
            <>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Total Members Entered</span>
                <p className="text-2xl font-black text-slate-100 mt-1 font-mono">{reportData.total_customers}</p>
              </div>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Additional Guests</span>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">+{reportData.total_additional_guests}</p>
              </div>
              <div className="bg-[#161b22] border border-amber-500/30 p-4 rounded-2xl bg-amber-500/5">
                <span className="text-xs font-bold uppercase text-amber-400">Total Footfall Count</span>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{reportData.total_footfall} People</p>
              </div>
            </>
          )}

          {reportType === 'stock' && (
            <>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Restock Shipments</span>
                <p className="text-2xl font-black text-slate-100 mt-1 font-mono">{reportData.total_shipments}</p>
              </div>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Total Bottles Added</span>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">+{reportData.total_bottles_added}</p>
              </div>
              <div className="bg-[#161b22] border border-amber-500/30 p-4 rounded-2xl bg-amber-500/5">
                <span className="text-xs font-bold uppercase text-amber-400">Inventory Status</span>
                <p className="text-xl font-extrabold text-amber-400 mt-1">Active Restocks</p>
              </div>
            </>
          )}

          {reportType === 'sales' && (
            <>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Sales Receipts</span>
                <p className="text-2xl font-black text-slate-100 mt-1 font-mono">{reportData.total_transactions}</p>
              </div>
              <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-slate-400">Total Bottles Sold</span>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{reportData.total_bottles_sold} Bottles</p>
              </div>
              <div className="bg-[#161b22] border border-amber-500/30 p-4 rounded-2xl bg-amber-500/5">
                <span className="text-xs font-bold uppercase text-amber-400">Total Revenue</span>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">₹{reportData.total_revenue}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Report Table Container */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg space-y-4">
        {/* Table Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
          <h3 className="text-base font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>
              {reportType === 'entries' && 'Customer Footfall & Additional People Logs'}
              {reportType === 'stock' && 'Stock & Inventory Arrivals Log'}
              {reportType === 'sales' && 'Bar Sales Receipts & Revenue Log'}
            </span>
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter report rows..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Data Table View */}
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span>Generating report...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
            No records found for the selected {period} filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#21262d] text-slate-400 uppercase font-mono text-[11px]">
                  {reportType === 'entries' && (
                    <>
                      <th className="py-3 px-4">Member ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4 text-center">Additional Guests</th>
                      <th className="py-3 px-4 text-center">Total Footfall</th>
                      <th className="py-3 px-4 text-right">Entry Time</th>
                    </>
                  )}
                  {reportType === 'stock' && (
                    <>
                      <th className="py-3 px-4">Drink / Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-center">Quantity Added</th>
                      <th className="py-3 px-4 text-right">Restock Date</th>
                    </>
                  )}
                  {reportType === 'sales' && (
                    <>
                      <th className="py-3 px-4">Sale ID</th>
                      <th className="py-3 px-4">Drink / Product</th>
                      <th className="py-3 px-4 text-center">Quantity Sold</th>
                      <th className="py-3 px-4 text-right">Unit Rate</th>
                      <th className="py-3 px-4 text-right">Total Bill</th>
                      <th className="py-3 px-4 text-right">Sale Timestamp</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]/60 text-slate-200 font-medium">
                {filteredItems.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#0d1117]/60 transition-colors">
                    {reportType === 'entries' && (
                      <>
                        <td className="py-3 px-4 font-mono text-amber-400 font-bold">{item.customer_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-100">{item.customer_name}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {item.additional_guests > 0 ? (
                            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                              +{item.additional_guests} Guests
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-100">{item.total_people}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {item.entry_time ? new Date(item.entry_time).toLocaleString() : 'N/A'}
                        </td>
                      </>
                    )}

                    {reportType === 'stock' && (
                      <>
                        <td className="py-3 px-4 font-bold text-slate-100">{item.product_name}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-mono">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{item.volume_ml} ml</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-400">
                          +{item.quantity} Bottles
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {item.transaction_date ? new Date(item.transaction_date).toLocaleString() : 'N/A'}
                        </td>
                      </>
                    )}

                    {reportType === 'sales' && (
                      <>
                        <td className="py-3 px-4 font-mono text-slate-500">#{item.sale_id}</td>
                        <td className="py-3 px-4 font-bold text-slate-100">{item.product_name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">
                          {item.quantity} Bottles
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">₹{item.unit_price}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-400">₹{item.total_amount}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {item.sale_date ? new Date(item.sale_date).toLocaleString() : 'N/A'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
