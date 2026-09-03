import React, { useEffect, useState } from 'react';
import { productApi, stockApi } from '../api/services';
import { CurrentStock, Product, StockTransaction } from '../types';
import {
  PackagePlus,
  PackageCheck,
  AlertTriangle,
  Check,
  Loader2,
  ArrowUpRight,
  Filter,
  Layers,
  FolderTree,
  Plus,
  Minus,
  Search,
  X,
  History,
  TrendingUp,
  Wine,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';

export const Stock: React.FC = () => {
  const [stockList, setStockList] = useState<CurrentStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Top Page Tab State: 'stock' | 'ledger' | 'logs'
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger' | 'logs'>('stock');
  const [showAddForm, setShowAddForm] = useState(false);

  // Daily Opening/Purchase/Sale/Closing Ledger States
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Grouping & Search & Filter States
  const [groupBy, setGroupBy] = useState<'category' | 'size'>('category');
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>('ALL');

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        text: `Received ${quantity} bottles of ${p?.name || 'drink'}! Available stock updated.`,
      });
      setQuantity(12);
      await loadStockData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to record stock entry' });
    } finally {
      setSubmitting(false);
    }
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
      'Unit Price (INR)',
      'OPENING STOCK (Yesterday Closing)',
      'PURCHASES (Stock IN Today)',
      'SALES (POS OUT Today)',
      'CLOSING STOCK (End of Day)',
    ];

    const rows = filteredLedgerItems.map((item) => [
      `"${item.product_name}"`,
      `"${item.category}"`,
      item.volume_ml,
      item.unit_price,
      item.opening_stock,
      item.purchase_qty,
      item.sale_qty,
      item.closing_stock,
    ]);

    const csvContent =
      '\uFEFF' +
      [`Daily Opening-Purchase-Sale-Closing Stock Ledger - Date: ${ledgerDate}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Ledger_Opening_Closing_${ledgerDate}.csv`;
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

  const totalOpening = filteredLedgerItems.reduce((sum, item) => sum + item.opening_stock, 0);
  const totalPurchases = filteredLedgerItems.reduce((sum, item) => sum + item.purchase_qty, 0);
  const totalSales = filteredLedgerItems.reduce((sum, item) => sum + item.sale_qty, 0);
  const totalClosing = filteredLedgerItems.reduce((sum, item) => sum + item.closing_stock, 0);

  // Unique categories for pills
  const allCategories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-amber-400" />
            <span>Stock Inventory & Daily Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track Opening Stock, Purchases, Sales, and Closing Stock balances automatically
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0d1117] p-1.5 rounded-xl border border-[#30363d] shrink-0">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Available Stock
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Opening / Purchase / Sale / Closing Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Entry History</span>
          </button>
        </div>
      </div>

      {/* TAB 2: DAILY OPENING / PURCHASE / SALE / CLOSING LEDGER */}
      {activeTab === 'ledger' ? (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Select Report Date:</span>
                  <input
                    type="date"
                    value={ledgerDate}
                    onChange={(e) => setLedgerDate(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 mt-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product name..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={exportLedgerCSV}
                  disabled={ledgerData.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>EXPORT LEDGER EXCEL</span>
                </button>
              </div>
            </div>

            {/* Category Pills */}
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
                ALL PRODUCTS ({ledgerData.length})
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

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Opening Stock (Yesterday Closing):</span>
              <h4 className="text-xl font-black text-slate-100 font-mono mt-1">{totalOpening.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Purchases (Stock IN Today):</span>
              <h4 className="text-xl font-black text-emerald-400 font-mono mt-1">+{totalPurchases.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-rose-500/30 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Sales (POS OUT Today):</span>
              <h4 className="text-xl font-black text-rose-400 font-mono mt-1">-{totalSales.toLocaleString()} Bottles</h4>
            </div>
            <div className="bg-[#161b22] border border-amber-500/40 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Closing Stock Balance:</span>
              <h4 className="text-xl font-black text-amber-400 font-mono mt-1">{totalClosing.toLocaleString()} Bottles</h4>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg">
            {ledgerLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Calculating daily opening, purchase, sale, and closing balances...</span>
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
                      <th className="py-3 px-3 text-right">Unit Price</th>
                      <th className="py-3 px-3 text-center bg-[#161b22] text-slate-300 border-l border-[#30363d]">
                        OPENING STOCK
                      </th>
                      <th className="py-3 px-3 text-center bg-emerald-500/10 text-emerald-400">
                        PURCHASES (+)
                      </th>
                      <th className="py-3 px-3 text-center bg-rose-500/10 text-rose-400">
                        SALES (-)
                      </th>
                      <th className="py-3 px-3 text-center bg-amber-500/10 text-amber-400 border-r border-[#30363d]">
                        CLOSING STOCK
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-slate-200">
                    {filteredLedgerItems.map((item) => (
                      <tr key={item.product_id} className="hover:bg-[#0d1117]/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-100">{item.product_name}</td>
                        <td className="py-3 px-3 text-slate-400">{item.category}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{item.volume_ml}ml</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">₹{item.unit_price}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-100 bg-[#0d1117]/40 border-l border-[#30363d]">
                          {item.opening_stock}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5">
                          {item.purchase_qty > 0 ? `+${item.purchase_qty}` : '0'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-400 bg-rose-500/5">
                          {item.sale_qty > 0 ? `-${item.sale_qty}` : '0'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-amber-400 bg-amber-500/5 border-r border-[#30363d]">
                          {item.closing_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        /* TAB 3: STOCK ENTRY HISTORY LOGS */
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
      ) : (
        /* TAB 1: LIVE AVAILABLE STOCK VIEW */
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-400" />
                <span>Live Available Bottle Stock Inventory ({stockList.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">Current available bottle count for bar POS sales</p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ RECEIVE INCOMING STOCK</span>
            </button>
          </div>

          {/* Quick Receive Form Modal / Drawer */}
          {showAddForm && (
            <form onSubmit={handleReceiveStock} className="bg-[#0d1117] border border-amber-500/40 p-4 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Record Incoming Stock Receipt (TASMAC Delivery)
                </h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Liquor Drink:</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume_ml}ml) — ₹{p.selling_price}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Quantity Received (Bottles):</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>CONFIRM STOCK RECEIPT</span>
              </button>

              {msg && (
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                  msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                  <span>{msg.text}</span>
                </div>
              )}
            </form>
          )}

          {/* Current Stock Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading current stock inventory...</span>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3 text-right">Available Stock (Bottles)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {stockList.map((item) => (
                    <tr key={item.product_id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-100">{item.product_name}</td>
                      <td className="py-3 px-3 text-right font-black text-amber-400">
                        {item.current_stock} Bottles
                      </td>
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
