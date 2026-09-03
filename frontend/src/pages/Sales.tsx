import React, { useEffect, useState } from 'react';
import { productApi, saleApi, customerApi } from '../api/services';
import { DailyProductSale, Product, DetailedSale, Customer } from '../types';
import {
  Wine,
  Check,
  Loader2,
  Zap,
  Search,
  X,
  CheckCircle2,
  Plus,
  Minus,
  Receipt,
  Download,
  CreditCard,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export const Sales: React.FC = () => {
  const [detailedSales, setDetailedSales] = useState<DetailedSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dailySales, setDailySales] = useState<DailyProductSale[]>([]);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Form Filter & Search States (Touch POS Grid)
  const [posCategoryPill, setPosCategoryPill] = useState<string>('ALL');
  const [posSearch, setPosSearch] = useState<string>('');

  // Persistent Member Card Selector State (Stays active across multiple drink sales!)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [showMemberDropdown, setShowMemberDropdown] = useState<boolean>(false);

  // Multi-Item Cart Basket State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detSales, prodList, custList, dailyData] = await Promise.all([
        saleApi.getDetailedSales(500),
        productApi.getProducts(),
        customerApi.getCustomers(),
        saleApi.getDailySales(reportDate),
      ]);
      setDetailedSales(detSales);
      setProducts(prodList);
      setCustomers(custList);
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

  // Filter customers for Member Search Dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.customer_code.toLowerCase().includes(memberSearch.toLowerCase()) ||
      c.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      c.phone.includes(memberSearch)
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Add Item to Multi-Item Cart Basket
  const handleAddToCart = (product: Product, qty: number = 1) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  // Submit Cart Order (Records each drink item under the selected member card!)
  const handleCheckoutCart = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // If cart has items, process cart items
    if (cartItems.length > 0) {
      setSubmitting(true);
      try {
        let totalCount = 0;
        for (const item of cartItems) {
          await saleApi.createSale({
            product_id: item.product.id,
            quantity: item.quantity,
            customer_id: selectedCustomerId || null,
          });
          totalCount += item.quantity;
        }

        const memberBadge = selectedCustomer
          ? ` Member #${selectedCustomer.customer_code} (${selectedCustomer.full_name})`
          : '';
        setMsg({
          type: 'success',
          text: `Recorded ${cartItems.length} items (${totalCount} bottles) for${memberBadge} — Total: ₹${cartTotalAmount}`,
        });

        setCartItems([]);
        await loadData();
      } catch (err: any) {
        console.error(err);
        setMsg({
          type: 'error',
          text: err.response?.data?.detail || 'Failed to record sales. Check stock availability.',
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Quick single item sale fallback
    if (!selectedProductId) {
      setMsg({ type: 'error', text: 'Please select a drink or add items to cart' });
      return;
    }

    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      await saleApi.createSale({
        product_id: selectedProductId,
        quantity,
        customer_id: selectedCustomerId || null,
      });

      const memberBadge = selectedCustomer
        ? ` Member #${selectedCustomer.customer_code} (${selectedCustomer.full_name})`
        : '';
      setMsg({
        type: 'success',
        text: `Recorded ${quantity}x ${selectedProduct.name} for${memberBadge} — Total: ₹${selectedProduct.selling_price * quantity}`,
      });

      setQuantity(1);
      // NOTE: DO NOT CLEAR MEMBER CARD! Keep selected member active for next items/visits!
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to record sale. Insufficient stock?',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Export Sales Log to CSV / Excel File (Without any 'Walk-in' text!)
  const exportSalesLogCSV = () => {
    if (detailedSales.length === 0) {
      alert('No sales log records available to export');
      return;
    }

    const headers = [
      'Sale ID',
      'Date & Time',
      'Member Card #',
      'Member Name',
      'Phone',
      'Liquor Product',
      'Brand',
      'Category',
      'Volume (ml)',
      'Quantity',
      'Unit Price (INR)',
      'Total Amount (INR)',
    ];

    const rows = detailedSales.map((s) => [
      s.id,
      s.sale_date ? `"${new Date(s.sale_date).toLocaleString()}"` : 'N/A',
      s.customer_code ? `"#${s.customer_code}"` : '""',
      s.customer_name ? `"${s.customer_name}"` : '""',
      s.phone ? `"${s.phone}"` : '""',
      `"${s.product_name}"`,
      `"${s.brand_name || 'N/A'}"`,
      `"${s.category}"`,
      s.volume_ml,
      s.quantity,
      s.unit_price,
      s.total_price,
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Coimbatore_Gymkhana_Sales_Log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-4 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Wine className="w-5 h-5 text-amber-400" />
            <span>Bar POS Counter & Sales Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select Member Card once to record multiple drinks (Beer, Whisky...) • Itemized sales log download
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportSalesLogCSV}
            disabled={detailedSales.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD SALES EXCEL LOG</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        
        {/* Left Column: Bar POS Counter & Drink Picker (7 cols) */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          
          {/* Persistent Member Card Linker Selector Box */}
          <div className="bg-[#161b22] border border-amber-500/30 rounded-2xl p-4 shadow-lg relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Step 1: Select Member Card (Stays Active for Multiple Drinks)</span>
              </label>
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setMemberSearch('');
                  }}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30"
                >
                  <X className="w-3.5 h-3.5" /> Clear Member Card
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="bg-[#0d1117] border border-amber-500/50 p-3 rounded-xl flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black font-mono text-base shadow-sm">
                    #{selectedCustomer.customer_code}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-100">{selectedCustomer.full_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Phone: {selectedCustomer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full font-black uppercase tracking-wider block">
                    Active Member Card
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    All drinks will be recorded for #{selectedCustomer.customer_code}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onFocus={() => setShowMemberDropdown(true)}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setShowMemberDropdown(true);
                    }}
                    placeholder="Search Member Card # (e.g. 100, 55), Name, or Phone..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Dropdown Options */}
                {showMemberDropdown && memberSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-[#21262d]">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-slate-500 text-xs text-center">No member card found</div>
                    ) : (
                      filteredCustomers.slice(0, 10).map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setShowMemberDropdown(false);
                          }}
                          className="w-full p-2.5 text-left hover:bg-[#21262d] flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-mono font-bold text-amber-400 text-xs mr-2">
                              #{cust.customer_code}
                            </span>
                            <span className="font-bold text-slate-200 text-xs">{cust.full_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{cust.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Touch POS Drink Picker */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Step 2: Select Liquor Items & Cart</span>
                </h3>
                <p className="text-[11px] text-slate-400">Tap drink card to add to order cart</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Filter liquor name..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Horizontal Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setPosCategoryPill('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  posCategoryPill === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                }`}
              >
                ALL ({products.length})
              </button>

              {allCategories.map((cat) => {
                const count = products.filter((p) => p.category.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPosCategoryPill(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      posCategoryPill === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Drink Grid */}
            {filteredPosProducts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No products found matching filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredPosProducts.map((p) => {
                  const isSelected = selectedProductId === p.id;
                  const cartCount = cartItems.find((item) => item.product.id === p.id)?.quantity || 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 scale-[0.98]'
                          : 'bg-[#0d1117] border-[#21262d] hover:border-slate-600 hover:bg-[#161b22]'
                      }`}
                    >
                      {cartCount > 0 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] font-mono">
                          {cartCount} in Cart
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] font-bold font-mono text-amber-400/80 uppercase block">
                          {p.category} • {p.volume_ml}ml
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 truncate mt-0.5">{p.name}</h4>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-[#21262d] pt-1.5">
                        <span className="text-xs font-black text-amber-400 font-mono">₹{p.selling_price}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p, 1);
                          }}
                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart Basket Summary Box (Multi-Item Order Checkout) */}
            {cartItems.length > 0 && (
              <div className="bg-[#0d1117] border border-amber-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold text-slate-100 uppercase tracking-wider">
                      Current Cart Basket ({cartItems.length} Drinks)
                    </span>
                  </div>
                  <button
                    onClick={() => setCartItems([])}
                    className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Cart
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 divide-y divide-[#21262d]">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-100 block">{item.product.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.product.category} • {item.product.volume_ml}ml
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded-lg">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                setCartItems((prev) =>
                                  prev.map((i) =>
                                    i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i
                                  )
                                );
                              } else {
                                handleRemoveFromCart(item.product.id);
                              }
                            }}
                            className="text-slate-400 hover:text-slate-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-amber-400 px-1">{item.quantity}</span>
                          <button
                            onClick={() => {
                              setCartItems((prev) =>
                                prev.map((i) =>
                                  i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i
                                )
                              );
                            }}
                            className="text-slate-400 hover:text-slate-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-black text-amber-400">₹{item.product.selling_price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Cart Button */}
                <button
                  type="button"
                  onClick={handleCheckoutCart}
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Cart Sale...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        RECORD CART SALE ({cartItems.length} ITEMS) — TOTAL ₹{cartTotalAmount}
                        {selectedCustomer ? ` FOR #${selectedCustomer.customer_code}` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Quick Single Item Sale Checkout Panel (When cart is empty) */}
            {cartItems.length === 0 && selectedProduct && (
              <form onSubmit={handleCheckoutCart} className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Selected Bottle</span>
                    <h4 className="text-sm font-extrabold text-slate-100">
                      {selectedProduct.name} ({selectedProduct.volume_ml}ml)
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Unit Price</span>
                    <span className="text-sm font-black text-amber-400 font-mono">₹{selectedProduct.selling_price}</span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center justify-between bg-[#161b22] border border-[#21262d] p-2 rounded-xl">
                  <span className="text-xs font-bold text-slate-300">Bottles / Drinks Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-lg bg-[#21262d] text-slate-200 flex items-center justify-center hover:bg-[#30363d]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-black text-amber-400 font-mono">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-7 h-7 rounded-lg bg-[#21262d] text-slate-200 flex items-center justify-center hover:bg-[#30363d]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Submit Quick Sale Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Sale...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        RECORD SALE — TOTAL ₹{selectedProduct.selling_price * quantity}
                        {selectedCustomer ? ` FOR #${selectedCustomer.customer_code}` : ''}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}

            {msg && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Itemized Sales Log (5 cols) */}
        <div className="xl:col-span-5 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 flex flex-col shadow-lg min-w-0">
          <div className="flex items-center justify-between mb-4 border-b border-[#21262d] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Sales Log ({detailedSales.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">Live itemized sales linked to member cards</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading sales log...</span>
            </div>
          ) : detailedSales.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No sales recorded yet today.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Member Card</th>
                    <th className="py-2.5 px-3">Liquor Item</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/70 text-slate-200">
                  {detailedSales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#0d1117]/60 transition-colors text-[11px]">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {s.sale_date ? new Date(s.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {s.customer_code ? (
                          <div>
                            <span className="font-mono font-black text-amber-400">#{s.customer_code}</span>
                            <span className="block text-[10px] text-slate-300 truncate max-w-[90px]" title={s.customer_name || ''}>
                              {s.customer_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-100 block truncate max-w-[120px]">{s.product_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {s.quantity}x @ ₹{s.unit_price} ({s.volume_ml}ml)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400">
                        ₹{s.total_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
