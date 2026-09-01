import React, { useEffect, useState } from 'react';
import { productApi, saleApi } from '../api/services';
import { DailyProductSale, Product, Sale } from '../types';
import {
  Wine,
  Calendar,
  Check,
  Loader2,
  Zap,
  Search,
  X,
  CheckCircle2,
  FolderTree,
  Layers,
  Plus,
  Minus,
  Receipt,
  BarChart3,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export const Sales: React.FC = () => {
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dailySales, setDailySales] = useState<DailyProductSale[]>([]);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Right Panel Tab State: 'receipts' (individual transactions) | 'summary' (aggregated tally)
  const [rightPanelTab, setRightPanelTab] = useState<'receipts' | 'summary'>('receipts');

  // Form Filter & Search States (Touch POS Grid)
  const [posCategoryPill, setPosCategoryPill] = useState<string>('ALL');
  const [posSearch, setPosSearch] = useState<string>('');

  // Sales Summary Grouping & Pill Filter States
  const [summaryGroupBy, setSummaryGroupBy] = useState<'category' | 'size'>('category');
  const [summaryPill, setSummaryPill] = useState<string>('ALL');

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allSales, prodList, dailyData] = await Promise.all([
        saleApi.getSales(),
        productApi.getProducts(),
        saleApi.getDailySales(reportDate),
      ]);
      setSalesList(allSales);
      setProducts(prodList);
      setDailySales(dailyData);
      if (prodList.length > 0 && selectedProductId === 0) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportDate]);

  // Unique categories for horizontal pills
  const allCategories = Array.from(new Set(products.map((p) => p.category)));

  // Filter products for the Touch POS Drink Picker Grid
  const filteredPosProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(posSearch.toLowerCase()) ||
      `${p.volume_ml}ml`.toLowerCase().includes(posSearch.toLowerCase());

    const matchesPill =
      posCategoryPill === 'ALL' ||
      p.category.toLowerCase() === posCategoryPill.toLowerCase();

    return matchesSearch && matchesPill;
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const unitPrice = selectedProduct?.selling_price ?? 0;
  const totalPrice = unitPrice * quantity;

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedProductId) {
      setMsg({ type: 'error', text: 'Please tap a drink card to select' });
      return;
    }
    setSubmitting(true);

    try {
      const result = await saleApi.createSale({
        product_id: selectedProductId,
        quantity: Number(quantity),
      });
      setMsg({
        type: 'success',
        text: `Logged sale of ${result.quantity} bottle(s) of ${selectedProduct?.name || 'drink'} (Total: ₹${totalPrice})!`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Could not record sale' });
    } finally {
      setSubmitting(false);
    }
  };

  // Enrich daily sales items with product category & volume size
  const enrichedDailySales = dailySales.map((s) => {
    const prod = products.find((p) => p.id === s.product_id);
    return {
      ...s,
      category: prod?.category || 'Other',
      volume_ml: prod?.volume_ml || 750,
      unit_price: prod?.selling_price || 0,
    };
  });

  const summaryCategoryPills = Array.from(new Set(enrichedDailySales.map((s) => s.category)));
  const summarySizePills = Array.from(new Set(enrichedDailySales.map((s) => s.volume_ml))).sort((a, b) => a - b);

  // Filter daily sales summary by summaryPill
  const filteredDailySales = enrichedDailySales.filter((s) => {
    if (summaryPill === 'ALL') return true;
    if (summaryGroupBy === 'category') return s.category === summaryPill;
    return `${s.volume_ml}` === summaryPill;
  });

  const totalBottlesSoldToday = dailySales.reduce((sum, item) => sum + item.quantity_sold, 0);

  const renderSalesCard = (item: (typeof enrichedDailySales)[0]) => (
    <div
      key={item.product_id}
      className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl flex items-center justify-between"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
            {item.category}
          </span>
          <span className="text-[10px] font-bold font-mono text-slate-300 bg-[#21262d] px-2 py-0.5 rounded">
            {item.volume_ml} ml
          </span>
        </div>
        <h4 className="text-base font-extrabold text-slate-100">{item.product_name}</h4>
        <span className="text-[11px] font-mono text-slate-400">Rate: ₹{item.unit_price} / bottle</span>
      </div>

      <div className="text-right">
        <span className="text-2xl font-black font-mono text-amber-400 block">
          {item.quantity_sold}
        </span>
        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Total Sold Today</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">Bar Sales Counter</h2>
        <p className="text-sm text-slate-400 mt-1">1-Tap visual touch POS sale logger with individual receipt history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAST VISUAL TOUCH POS SALE ENTRY BOX */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <h3 className="text-base font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-5 h-5 fill-amber-400" /> 1-Tap Touch POS Sale Entry
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              Tap drink card then adjust quantity (+ / -)
            </span>
          </div>

          {msg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {msg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          {/* Quick Search & Horizontal Category Filter Pills Bar */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Quick search drink name (e.g. Black Label, Beer, 750ml)..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
              {posSearch && (
                <button
                  onClick={() => setPosSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setPosCategoryPill('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                  posCategoryPill === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                }`}
              >
                🌟 ALL DRINKS ({products.length})
              </button>

              {allCategories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPosCategoryPill(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
                      posCategoryPill.toLowerCase() === cat.toLowerCase()
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* VISUAL DRINK TOUCH CARDS GRID */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase">
              Step 1: Tap to Select Drink ({filteredPosProducts.length} items):
            </span>

            {filteredPosProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No drinks match "{posSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredPosProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProductId(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                          : 'bg-[#0d1117] border-[#21262d] hover:border-slate-500'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 absolute top-2.5 right-2.5" />
                      )}
                      <div>
                        <span className="text-[9px] font-extrabold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                          {p.category} • {p.volume_ml}ml
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-100 mt-1 line-clamp-2">
                          {p.name}
                        </h4>
                      </div>
                      <div className="mt-2 pt-1 border-t border-[#21262d] flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-amber-400">
                          ₹{p.selling_price ?? 0}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase font-mono">Tap Select</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: PLUS (+) / MINUS (-) QUANTITY STEPPER & PRESETS */}
          <form onSubmit={handleRecordSale} className="space-y-4 pt-2 border-t border-[#21262d]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Step 2: Tap Plus (+) / Minus (-) to Adjust Quantity
                </label>
                {selectedProduct && (
                  <span className="text-xs font-bold text-amber-400 font-serif">
                    Selected: {selectedProduct.name}
                  </span>
                )}
              </div>

              {/* Stepper + Quick Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Plus / Minus Stepper */}
                <div className="flex items-center gap-2 bg-[#0d1117] p-1.5 rounded-2xl border border-[#30363d]">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-11 h-11 rounded-xl bg-[#161b22] hover:bg-rose-500/20 hover:text-rose-400 text-amber-400 border border-[#30363d] flex items-center justify-center transition-all active:scale-95 shadow shrink-0"
                    title="Decrease Quantity (-)"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      min={1}
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent text-center text-xl font-black font-mono text-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                      {quantity === 1 ? 'Bottle' : 'Bottles'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-11 h-11 rounded-xl bg-[#161b22] hover:bg-emerald-500/20 hover:text-emerald-400 text-amber-400 border border-[#30363d] flex items-center justify-center transition-all active:scale-95 shadow shrink-0"
                    title="Increase Quantity (+)"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`flex-1 py-3 rounded-xl text-xs font-extrabold font-mono border transition-colors ${
                        quantity === num
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Bill Summary */}
            {selectedProduct && (
              <div className="bg-[#0d1117] border border-amber-500/40 p-4 rounded-xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">
                    {selectedProduct.name}
                  </span>
                  <span className="text-xs font-mono text-amber-400">
                    {quantity} bottle(s) × ₹{unitPrice}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                    Total Amount
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-400">
                    ₹{totalPrice}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedProductId}
              className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all tracking-wide"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wine className="w-5 h-5" />}
              <span>LOG BOTTLE SALE NOW</span>
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: INDIVIDUAL TRANSACTIONS RECEIPT LOG vs DAILY SUMMARY TALLY */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg flex flex-col space-y-4">
          
          {/* Top Panel View Selector: Individual Receipts vs Daily Summary */}
          <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
            <button
              type="button"
              onClick={() => setRightPanelTab('receipts')}
              className={`flex-1 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === 'receipts'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Sales Receipts ({salesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('summary')}
              className={`flex-1 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                rightPanelTab === 'summary'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Daily Tally</span>
            </button>
          </div>

          {/* VIEW 1: INDIVIDUAL SALES TRANSACTIONS RECEIPT HISTORY LOG */}
          {rightPanelTab === 'receipts' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                    Recent Sale Transactions Log
                  </h3>
                  <p className="text-[11px] text-slate-400">Each purchase saved separately with timestamp & bill</p>
                </div>
              </div>

              {salesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                  No sales recorded yet. Log a sale on the left!
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
                  {salesList.map((s) => {
                    const matchedProd = products.find((p) => p.id === s.product_id);
                    const unitRate = matchedProd?.selling_price ?? 0;
                    const transactionTotal = unitRate * s.quantity;

                    return (
                      <div
                        key={s.id}
                        className="bg-[#0d1117] border border-[#21262d] p-3.5 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition-all shadow-sm"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                              Sale #{s.id}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(s.sale_date).toLocaleString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-100 mt-1">
                            {matchedProd?.name || `Drink #${s.product_id}`}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400 block">
                            {s.quantity} bottle(s) × ₹{unitRate}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black font-mono text-amber-400 block">
                            ₹{transactionTotal}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                            Total Bill
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: DAILY AGGREGATED SUMMARY TALLY */}
          {rightPanelTab === 'summary' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="border-b border-[#21262d] pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
                    Aggregated Daily Tally
                  </h3>
                  <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Total: <span className="text-amber-400 font-bold font-mono">{totalBottlesSoldToday} bottles</span> sold on {reportDate}
                </p>

                {/* Toggle: Category vs Size */}
                <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                  <button
                    onClick={() => {
                      setSummaryGroupBy('category');
                      setSummaryPill('ALL');
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      summaryGroupBy === 'category'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FolderTree className="w-3 h-3" />
                    <span>By Category</span>
                  </button>

                  <button
                    onClick={() => {
                      setSummaryGroupBy('size');
                      setSummaryPill('ALL');
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      summaryGroupBy === 'size'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>By Size</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Pills for Summary */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSummaryPill('ALL')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap border transition-all ${
                    summaryPill === 'ALL'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-[#0d1117] text-slate-300 border-[#30363d]'
                  }`}
                >
                  ALL ({enrichedDailySales.length})
                </button>

                {summaryGroupBy === 'category'
                  ? summaryCategoryPills.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSummaryPill(cat)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap border transition-all ${
                          summaryPill === cat
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))
                  : summarySizePills.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSummaryPill(`${sz}`)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap border transition-all ${
                          summaryPill === `${sz}`
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-[#0d1117] text-slate-300 border-[#30363d]'
                        }`}
                      >
                        {sz} ml
                      </button>
                    ))}
              </div>

              {/* Daily Sales List */}
              {loading ? (
                <div className="py-12 flex justify-center text-slate-400 gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  <span>Fetching sales tally...</span>
                </div>
              ) : filteredDailySales.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                  No sales logged for this date.
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[440px] pr-1">
                  {filteredDailySales.map((item) => renderSalesCard(item))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
