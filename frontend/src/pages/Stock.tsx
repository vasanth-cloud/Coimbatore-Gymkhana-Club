import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { productApi, stockApi } from '../api/services';
import { CurrentStock, Product, StockTransaction } from '../types';
import {
  PackagePlus,
  PackageCheck,
  AlertTriangle,
  Check,
  Loader2,
  Filter,
  Search,
  X,
  History,
  TrendingUp,
  Wine,
  FileSpreadsheet,
  Download,
  Calendar,
  Upload,
  IndianRupee,
  BadgePercent,
  Coins,
} from 'lucide-react';

export const Stock: React.FC = () => {
  const [stockList, setStockList] = useState<CurrentStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Main Tab: 'ledger' | 'grid' | 'logs'
  const [activeTab, setActiveTab] = useState<'ledger' | 'grid' | 'logs'>('ledger');

  // Daily Opening/Purchase/Sale/Closing Ledger States
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Filter & Search States
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Receive Stock Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveMode, setReceiveMode] = useState<'single' | 'excel'>('single');
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Excel Import States
  const [parsedItems, setParsedItems] = useState<{ productId: number; productName: string; qty: number; status: 'matched' | 'unmatched' }[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  const loadStockData = async () => {
    try {
      setLoading(true);
      const [currentStock, prodList, txList] = await Promise.all([
        stockApi.getAllCurrentStock(),
        productApi.getProducts(),
        stockApi.getTransactions(),
      ]);
      setStockList(currentStock);
      setProducts(prodList);
      setTransactions(txList);
      if (prodList.length > 0 && selectedProductId === 0) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err) {
      console.error('Failed to load stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLedgerData = async () => {
    try {
      setLedgerLoading(true);
      const data = await stockApi.getStockLedger(ledgerDate);
      setLedgerData(data || []);
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadLedgerData();
    }
  }, [activeTab, ledgerDate]);

  // Single Item Receive Stock Submit
  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedProductId) {
      setMsg({ type: 'error', text: 'Please select a drink' });
      return;
    }
    setSubmitting(true);
    try {
      await stockApi.receiveStock({ product_id: selectedProductId, quantity });
      const p = products.find((prod) => prod.id === selectedProductId);
      setMsg({
        type: 'success',
        text: `Received ${quantity} bottles of ${p?.name || 'drink'}! Stock updated.`,
      });
      setQuantity(12);
      await loadStockData();
      if (activeTab === 'ledger') await loadLedgerData();
      setTimeout(() => setShowReceiveModal(false), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to record stock entry' });
    } finally {
      setSubmitting(false);
    }
  };

  // Excel / CSV File Upload Parser Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
          setMsg({ type: 'error', text: 'Excel sheet is empty' });
          return;
        }

        const items: { productId: number; productName: string; qty: number; status: 'matched' | 'unmatched' }[] = [];

        rawData.forEach((row) => {
          const nameVal = row['Product Name'] || row['Item Name'] || row['Product'] || row['Item'] || row['Name'] || Object.values(row)[0];
          const qtyVal = row['Quantity'] || row['Qty'] || row['Bottles'] || row['Cases'] || Object.values(row)[1];

          if (nameVal && qtyVal) {
            const searchStr = String(nameVal).trim().toLowerCase();
            const qtyNum = parseInt(String(qtyVal)) || 1;

            const matched = products.find(
              (p) =>
                p.name.toLowerCase() === searchStr ||
                p.name.toLowerCase().includes(searchStr) ||
                searchStr.includes(p.name.toLowerCase())
            );

            if (matched) {
              items.push({
                productId: matched.id,
                productName: matched.name,
                qty: qtyNum,
                status: 'matched',
              });
            } else {
              items.push({
                productId: 0,
                productName: String(nameVal),
                qty: qtyNum,
                status: 'unmatched',
              });
            }
          }
        });

        setParsedItems(items);
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        setMsg({ type: 'error', text: 'Failed to read Excel file. Please use standard format.' });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit Bulk Imported Excel Stock Items
  const handleBulkSubmit = async () => {
    const validItems = parsedItems.filter((i) => i.status === 'matched');
    if (validItems.length === 0) {
      setMsg({ type: 'error', text: 'No matched products found in uploaded sheet' });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const payload = validItems.map((i) => ({
        product_id: i.productId,
        quantity: i.qty,
      }));

      await stockApi.bulkReceiveStock(payload);

      setMsg({
        type: 'success',
        text: `Successfully imported stock for ${validItems.length} items from Excel sheet!`,
      });

      setParsedItems([]);
      setExcelFileName('');
      await loadStockData();
      if (activeTab === 'ledger') await loadLedgerData();
      setTimeout(() => setShowReceiveModal(false), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to save bulk stock import' });
    } finally {
      setSubmitting(false);
    }
  };

  // Download Sample Excel Import Template
  const downloadSampleTemplate = () => {
    const headers = ['Product Name', 'Quantity'];
    const sampleRows = [
      ['10000 VOLTS SUPER STRONG 750ml', 24],
      ['1848 Premium Grain 180ml', 48],
      ['AMSTEL PREMIUM BEER 650ml', 12],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Import_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Daily Opening / Purchase / Sale / Closing Ledger CSV
  const exportLedgerCSV = () => {
    if (ledgerData.length === 0) {
      alert('No ledger data available to export');
      return;
    }

    const headers = [
      'Product Name',
      'Category',
      'Volume (ml)',
      'Pack Size (Btts/Case)',
      'Sales Rate (INR)',
      'Basic Purchase Rate (INR)',
      'MRP Rate (INR)',
      'OPENING (Cases + Bottles)',
      'OPENING TOTAL BOTTLES',
      'PURCHASES (Cases + Bottles)',
      'PURCHASES TOTAL BOTTLES',
      'SALES (Cases + Bottles)',
      'SALES TOTAL BOTTLES',
      'CLOSING (Cases + Bottles)',
      'CLOSING TOTAL BOTTLES',
      'CLOSING TOTAL SALES VALUE (INR)',
      'CLOSING TOTAL BASIC COST VALUE (INR)',
      'CLOSING TOTAL MRP VALUE (INR)',
    ];

    const rows = filteredLedgerItems.map((item) => [
      `"${item.product_name}"`,
      `"${item.category}"`,
      item.volume_ml,
      item.pack_size,
      item.selling_price,
      item.basic_rate,
      item.mrp,
      `"${item.opening_str}"`,
      item.opening_stock,
      `"${item.purchase_str}"`,
      item.purchase_qty,
      `"${item.sale_str}"`,
      item.sale_qty,
      `"${item.closing_str}"`,
      item.closing_stock,
      item.closing_sales_value,
      item.closing_cost_value,
      item.closing_mrp_value,
    ]);

    const csvContent =
      '\uFEFF' +
      [`Daily Opening-Purchase-Sale-Closing Stock Ledger - Date: ${ledgerDate}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Ledger_Cases_Bottles_Rates_${ledgerDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Ledger Items
  const filteredLedgerItems = ledgerData.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchesPill =
      selectedCategoryPill === 'ALL' ||
      item.category.toLowerCase() === selectedCategoryPill.toLowerCase();
    return matchesSearch && matchesPill;
  });

  // Filtered Live Stock Items
  const filteredStockList = stockList.filter((item) =>
    item.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOpeningBottles = filteredLedgerItems.reduce((sum, item) => sum + item.opening_stock, 0);
  const totalPurchaseBottles = filteredLedgerItems.reduce((sum, item) => sum + item.purchase_qty, 0);
  const totalSaleBottles = filteredLedgerItems.reduce((sum, item) => sum + item.sale_qty, 0);
  const totalClosingBottles = filteredLedgerItems.reduce((sum, item) => sum + item.closing_stock, 0);

  // Total Evening Valuations
  const totalClosingSalesVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_sales_value, 0);
  const totalClosingCostVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_cost_value, 0);
  const totalClosingMrpVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_mrp_value, 0);

  // Unique categories for pills
  const allCategories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-amber-400" />
            <span>Stock Inventory & Ledger (Cases & Bottles)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cases (C) + Loose Bottles (B) • Sales Rate • Basic Rate • MRP • Evening Valuation
          </p>
        </div>

        {/* Action Buttons & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowReceiveModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ RECEIVE STOCK</span>
          </button>

          <button
            onClick={exportLedgerCSV}
            disabled={ledgerData.length === 0}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>EXPORT LEDGER EXCEL</span>
          </button>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center gap-2 border-b border-[#21262d] pb-1">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Opening / Purchase / Sale / Closing Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('grid')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'grid'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <Wine className="w-4 h-4" />
          <span>Live Available Stock Grid</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Entry Logs</span>
        </button>
      </div>

      {/* TAB 1: DAILY OPENING / PURCHASE / SALE / CLOSING LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Report Date:</span>
                <input
                  type="date"
                  value={ledgerDate}
                  onChange={(e) => setLedgerDate(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter liquor drink name..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategoryPill('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategoryPill === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                }`}
              >
                ALL ({ledgerData.length})
              </button>

              {allCategories.map((cat) => {
                const count = ledgerData.filter((i) => i.category.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryPill(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategoryPill === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Metric Cards for Bottle Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Opening Stock (Yesterday Closing):</span>
              <h4 className="text-xl font-black text-slate-100 font-mono mt-1">{totalOpeningBottles.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Purchases (Stock IN Today):</span>
              <h4 className="text-xl font-black text-emerald-400 font-mono mt-1">+{totalPurchaseBottles.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-rose-500/30 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Sales (POS OUT Today):</span>
              <h4 className="text-xl font-black text-rose-400 font-mono mt-1">-{totalSaleBottles.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-amber-500/40 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Closing Stock Balance:</span>
              <h4 className="text-xl font-black text-amber-400 font-mono mt-1">{totalClosingBottles.toLocaleString()} Bottles</h4>
            </div>
          </div>

          {/* EVENING REMAINING STOCK TOTAL RATE / VALUATION BANNER */}
          <div className="bg-[#0d1117] border border-amber-500/40 p-5 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span>Evening Total Stock Valuation ({ledgerDate})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total monetary value of all {totalClosingBottles.toLocaleString()} remaining closing bottles
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full xl:w-auto">
              <div className="bg-[#161b22] p-3 rounded-xl border border-[#30363d]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Total Sales Value (Bar Price):</span>
                <h3 className="text-lg font-black text-amber-400 font-mono mt-0.5">₹{totalClosingSalesVal.toLocaleString()}</h3>
              </div>

              <div className="bg-[#161b22] p-3 rounded-xl border border-[#30363d]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">Total Basic Cost Value (Purchase):</span>
                <h3 className="text-lg font-black text-sky-400 font-mono mt-0.5">₹{totalClosingCostVal.toLocaleString()}</h3>
              </div>

              <div className="bg-[#161b22] p-3 rounded-xl border border-[#30363d]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Total MRP Value:</span>
                <h3 className="text-lg font-black text-emerald-400 font-mono mt-0.5">₹{totalClosingMrpVal.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          {/* Ledger Table with Cases (C) & Loose Bottles (B) */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg">
            {ledgerLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Calculating daily opening, purchase, sale, closing cases & rates...</span>
              </div>
            ) : filteredLedgerItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No stock ledger items found for selected date or filter.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Volume</th>
                      <th className="py-3 px-3 text-center">Pack</th>
                      <th className="py-3 px-3 text-right text-emerald-400">MRP</th>
                      <th className="py-3 px-3 text-right text-sky-400">Basic Rate</th>
                      <th className="py-3 px-3 text-right text-amber-400">Sales Rate</th>
                      <th className="py-3 px-3 text-center bg-[#0d1117] text-slate-200 border-l border-[#21262d]">
                        OPENING (C+B)
                      </th>
                      <th className="py-3 px-3 text-center bg-emerald-500/10 text-emerald-400">
                        PURCHASES (+)
                      </th>
                      <th className="py-3 px-3 text-center bg-rose-500/10 text-rose-400">
                        SALES (-)
                      </th>
                      <th className="py-3 px-3 text-center bg-amber-500/10 text-amber-400 border-r border-[#21262d]">
                        CLOSING (C+B)
                      </th>
                      <th className="py-3 px-3 text-right text-amber-400">Closing Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-slate-200">
                    {filteredLedgerItems.map((item) => (
                      <tr key={item.product_id} className="hover:bg-[#0d1117]/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-100">{item.product_name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{item.category}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.volume_ml}ml</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{item.pack_size}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">₹{item.mrp}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-400 font-bold">₹{item.basic_rate}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-extrabold">₹{item.selling_price}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200 border-l border-[#21262d]">
                          {item.opening_str}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5">
                          {item.purchase_qty > 0 ? `+${item.purchase_str}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400 bg-rose-500/5">
                          {item.sale_qty > 0 ? `-${item.sale_str}` : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-amber-400 bg-amber-500/5 border-r border-[#21262d]">
                          {item.closing_str}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400">
                          ₹{item.closing_sales_value.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE AVAILABLE STOCK GRID CARDS VIEW */}
      {activeTab === 'grid' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-400" />
                <span>Live Bottle Inventory Cards ({filteredStockList.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">Available bottle stock in real-time</p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bottle name..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading available stock inventory...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStockList.map((item) => (
                <div key={item.product_id} className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-100">{item.product_name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Product #{item.product_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-400 font-mono block">{item.current_stock} Bottles</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">In Stock</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STOCK ENTRY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Stock Entry Audit History ({transactions.length})</span>
          </h3>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No stock entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Transaction Type</th>
                    <th className="py-3 px-3">Product ID</th>
                    <th className="py-3 px-3 text-right">Quantity (Bottles)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400">{new Date(tx.transaction_date).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          tx.transaction_type === 'IN' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                        }`}>
                          {tx.transaction_type === 'IN' ? 'INCOMING RECEIPT (TASMAC)' : 'POS SALE OUT'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">Product #{tx.product_id}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">{tx.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEIVE INCOMING STOCK MODAL DIALOG WITH EXCEL / CSV IMPORT */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-xl w-full relative shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowReceiveModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                <span>Record Incoming Stock (TASMAC Delivery)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add single drink quantity or import full delivery Excel / CSV invoice sheet
              </p>
            </div>

            {/* Mode Tabs: Single Item vs Bulk Excel Import */}
            <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
              <button
                type="button"
                onClick={() => setReceiveMode('single')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  receiveMode === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Drink Entry
              </button>
              <button
                type="button"
                onClick={() => setReceiveMode('excel')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  receiveMode === 'excel'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Import Excel / CSV</span>
              </button>
            </div>

            {receiveMode === 'single' ? (
              /* MODE 1: SINGLE ITEM ENTRY FORM */
              <form onSubmit={handleReceiveStock} className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Select Liquor Drink:
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume_ml}ml) — ₹{p.selling_price}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Quantity Received (Bottles):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>CONFIRM STOCK RECEIPT</span>
                  </button>
                </div>
              </form>
            ) : (
              /* MODE 2: BULK IMPORT EXCEL / CSV SHEET */
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Format: Product Name, Quantity</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <Download className="w-3 h-3" /> Download Template
                  </button>
                </div>

                {/* Upload File Input */}
                <div className="border-2 border-dashed border-[#30363d] hover:border-amber-500/50 rounded-2xl p-5 text-center bg-[#0d1117] transition-all">
                  <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <label className="cursor-pointer block">
                    <span className="text-xs font-bold text-slate-200 block">
                      Click to upload Excel / CSV File (.xlsx, .csv)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {excelFileName || 'Drag and drop or select delivery file'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview Parsed Items Table */}
                {parsedItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Parsed Items Preview ({parsedItems.length} rows):</span>
                      <span className="text-emerald-400 font-mono">
                        {parsedItems.filter((i) => i.status === 'matched').length} Matched
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-[#30363d] rounded-xl divide-y divide-[#21262d] bg-[#0d1117]">
                      {parsedItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className={`font-bold block ${item.status === 'matched' ? 'text-slate-100' : 'text-rose-400'}`}>
                              {item.productName}
                            </span>
                            {item.status === 'unmatched' && (
                              <span className="text-[9px] text-rose-400 block">Product not found in database</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">{item.qty} Bottles</span>
                            {item.status === 'matched' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <X className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={submitting || parsedItems.filter((i) => i.status === 'matched').length === 0}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>
                      IMPORT {parsedItems.filter((i) => i.status === 'matched').length} MATCHED ITEMS
                    </span>
                  </button>
                </div>
              </div>
            )}

            {msg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                msg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
