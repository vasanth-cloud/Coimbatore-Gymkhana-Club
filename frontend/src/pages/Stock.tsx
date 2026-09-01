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
} from 'lucide-react';

export const Stock: React.FC = () => {
  const [stockList, setStockList] = useState<CurrentStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Top Page Tab State: 'stock' | 'logs'
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');

  // Layout & Form Toggle
  const [showAddForm, setShowAddForm] = useState(false);

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

  useEffect(() => {
    loadStockData();
  }, []);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedProductId) {
      setMsg({ type: 'error', text: 'Please select a drink' });
      return;
    }
    setSubmitting(true);

    try {
      const selectedItem = products.find((p) => p.id === selectedProductId);
      const result = await stockApi.receiveStock({
        product_id: selectedProductId,
        quantity: Number(quantity),
      });
      setMsg({
        type: 'success',
        text: `Added +${result.quantity} bottles to ${selectedItem?.name || 'stock'}!`,
      });
      loadStockData();
      setShowAddForm(false); // Close form after submission
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Could not record stock arrival' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products for the form based on category filter
  const filteredFormProducts = formCategoryFilter === 'ALL'
    ? products
    : products.filter((p) => p.category === formCategoryFilter || `${p.volume_ml}ml` === formCategoryFilter);

  // Filter stock list for display
  const baseStock = filterLowOnly
    ? stockList.filter((s) => s.current_stock <= 5)
    : stockList;

  const lowStockCount = stockList.filter((s) => s.current_stock <= 5).length;

  // Enrich stock item with product details (category & volume_ml)
  const enrichedStock = baseStock.map((s) => {
    const prod = products.find((p) => p.id === s.product_id);
    return {
      ...s,
      category: prod?.category || 'Other',
      volume_ml: prod?.volume_ml || 750,
      unit: prod?.unit || 'bottle',
    };
  });

  // Filter stock transactions of type 'IN' for the Recent Stock Arrivals Log
  const stockArrivals = transactions.filter((tx) => tx.transaction_type === 'IN');

  // Unique categories & bottle sizes list
  const categoryPillList = Array.from(new Set(enrichedStock.map((s) => s.category)));
  const sizePillList = Array.from(new Set(enrichedStock.map((s) => s.volume_ml))).sort((a, b) => a - b);
  const allCategoryList = Array.from(new Set(products.map((p) => p.category)));

  // Filter enriched stock by search term AND selected horizontal pill
  const filteredStock = enrichedStock.filter((s) => {
    const matchesSearch =
      s.product_name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      `${s.volume_ml}ml`.toLowerCase().includes(search.toLowerCase());

    const matchesPill =
      selectedCategoryPill === 'ALL' ||
      (groupBy === 'category' && s.category === selectedCategoryPill) ||
      (groupBy === 'size' && `${s.volume_ml}` === selectedCategoryPill);

    return matchesSearch && matchesPill;
  });

  // Helper card renderer
  const renderStockCard = (item: (typeof enrichedStock)[0]) => {
    const isZero = item.current_stock === 0;
    const isLow = item.current_stock > 0 && item.current_stock <= 5;
    return (
      <div
        key={item.product_id}
        className={`p-4 rounded-2xl border flex items-center justify-between transition-all shadow-sm ${
          isZero
            ? 'bg-rose-500/10 border-rose-500/40'
            : isLow
            ? 'bg-amber-500/10 border-amber-500/40'
            : 'bg-[#0d1117] border-[#21262d] hover:border-amber-500/40'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
              {item.category}
            </span>
            <span className="text-[10px] font-bold font-mono text-slate-300 bg-[#21262d] px-2 py-0.5 rounded-md">
              {item.volume_ml} ml
            </span>
          </div>
          <h4 className="text-base font-extrabold text-slate-100">{item.product_name}</h4>
          <div>
            {isZero ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" /> Out of Stock!
              </span>
            ) : isLow ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" /> Running Low
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                In Stock
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span
            className={`text-2xl font-black font-mono block ${
              isZero ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {item.current_stock}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Bottles Left</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Bar Stock & Inventory</h2>
          <p className="text-sm text-slate-400 mt-1">Horizontal classified stock inventory & restock log</p>
        </div>

        {/* Action Button: Record Stock Arrival Toggle */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2 transition-all w-fit"
        >
          {showAddForm ? <Minus className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
          <span>{showAddForm ? 'CLOSE ARRIVAL FORM' : '+ RECORD STOCK ARRIVAL'}</span>
        </button>
      </div>

      {/* Collapsible Record Stock Arrival Form */}
      {showAddForm && (
        <div className="bg-[#161b22] border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4 border-b border-[#21262d] pb-3">
            <h3 className="text-lg font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <PackagePlus className="w-5 h-5" /> Record Stock Arrival / Restock
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {msg && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {msg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleReceiveStock} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Filter Form Menu By
              </label>
              <select
                value={formCategoryFilter}
                onChange={(e) => {
                  setFormCategoryFilter(e.target.value);
                  const list = e.target.value === 'ALL'
                    ? products
                    : products.filter((p) => p.category === e.target.value || `${p.volume_ml}ml` === e.target.value);
                  if (list.length > 0) setSelectedProductId(list[0].id);
                }}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Show All Drinks ({products.length})</option>
                <optgroup label="By Category">
                  {allCategoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} Category
                    </option>
                  ))}
                </optgroup>
                <optgroup label="By Volume Size">
                  <option value="180ml">180 ml (Quarter/Nip)</option>
                  <option value="375ml">375 ml (Half/Pint)</option>
                  <option value="750ml">750 ml (Full/Quart)</option>
                  <option value="1000ml">1000 ml (1 Liter)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Select Bottle / Drink
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-500"
              >
                {filteredFormProducts.length === 0 ? (
                  <option value={0}>-- No drinks match filter --</option>
                ) : (
                  filteredFormProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category} • {p.volume_ml}ml)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Quantity Added (Bottles)
              </label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2 text-slate-100 font-mono font-black text-lg focus:outline-none focus:border-amber-500 mb-1"
              />

              {/* Quick Presets */}
              <div className="flex gap-2">
                {[6, 12, 24, 48].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    className={`flex-1 py-1 rounded-lg text-xs font-extrabold font-mono border transition-colors ${
                      quantity === num
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#0d1117] text-slate-400 border-[#30363d] hover:text-slate-200'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || filteredFormProducts.length === 0}
                className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck className="w-5 h-5" />}
                <span>CONFIRM STOCK ADDITION</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Page View Tabs: Stock Levels vs Recent Arrivals Log */}
      <div className="flex items-center justify-between bg-[#161b22] p-1.5 rounded-2xl border border-[#21262d]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wine className="w-4 h-4 stroke-[2.5]" />
            <span>Current Stock Levels ({enrichedStock.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 stroke-[2.5]" />
            <span>Recent Arrivals Log</span>
          </button>
        </div>

        <button
          onClick={() => setFilterLowOnly(!filterLowOnly)}
          className={`hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors items-center gap-1.5 mr-1 ${
            filterLowOnly
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-[#0d1117] text-slate-400 border-[#30363d] hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Low Stock Alert ({lowStockCount})</span>
        </button>
      </div>

      {/* VIEW 1: CURRENT STOCK LEVELS (With Horizontal Classification Pills Bar) */}
      {activeTab === 'stock' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg space-y-5">
          
          {/* Controls Bar: Search + Group Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drink stock name..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toggle: By Category vs By Bottle Size */}
            <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] shrink-0">
              <button
                onClick={() => {
                  setGroupBy('category');
                  setSelectedCategoryPill('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  groupBy === 'category'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Classify By Category</span>
              </button>

              <button
                onClick={() => {
                  setGroupBy('size');
                  setSelectedCategoryPill('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  groupBy === 'size'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Classify By Bottle Size</span>
              </button>
            </div>
          </div>

          {/* HORIZONTAL CLASSIFICATION PILLS BAR */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 block font-mono">
              Horizontal Filter ({groupBy === 'category' ? 'By Category' : 'By Bottle Size'}):
            </span>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryPill('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                  selectedCategoryPill === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                }`}
              >
                🌟 ALL ITEMS ({enrichedStock.length})
              </button>

              {groupBy === 'category'
                ? categoryPillList.map((cat) => {
                    const count = enrichedStock.filter((s) => s.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategoryPill(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                          selectedCategoryPill === cat
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })
                : sizePillList.map((sz) => {
                    const count = enrichedStock.filter((s) => s.volume_ml === sz).length;
                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedCategoryPill(`${sz}`)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                          selectedCategoryPill === `${sz}`
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                        }`}
                      >
                        {sz} ml Bottles ({count})
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Stock Display Grid */}
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span>Checking inventory...</span>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
              No stock items match your search or selected pill filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredStock.map((item) => renderStockCard(item))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: RECENT ARRIVALS LOG (Sleek Timeline Cards) */}
      {activeTab === 'logs' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-md">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-100 uppercase tracking-wider">
                  Recent Stock Arrivals Log
                </h3>
                <p className="text-xs text-slate-400">Live timeline of restock shipments received</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold bg-[#0d1117] px-3.5 py-2 rounded-xl border border-[#30363d] text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Total Receipts: {stockArrivals.length}
            </span>
          </div>

          {stockArrivals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
              No stock arrivals recorded yet. Click "+ RECORD STOCK ARRIVAL" to add restock!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockArrivals.map((tx) => {
                const matchedProduct = products.find((p) => p.id === tx.product_id);
                return (
                  <div
                    key={tx.id}
                    className="bg-[#0d1117] border border-[#21262d] p-4 rounded-2xl flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0 border border-emerald-500/30">
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-100">
                          {matchedProduct?.name || `Product #${tx.product_id}`}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {matchedProduct?.category || 'Drink'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(tx.transaction_date).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xl font-black font-mono text-emerald-400 block">
                        +{tx.quantity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Bottles Added
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
