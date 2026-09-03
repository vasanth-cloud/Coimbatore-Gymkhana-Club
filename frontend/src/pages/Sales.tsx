import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  Camera,
  FileSpreadsheet,
  Banknote,
  Smartphone,
  Calculator,
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

  // Card Entry Method: 'camera' | 'search'
  const [cardEntryMethod, setCardEntryMethod] = useState<'camera' | 'search'>('search');
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Form Filter & Search States (Touch POS Grid)
  const [posCategoryPill, setPosCategoryPill] = useState<string>('ALL');
  const [posSearch, setPosSearch] = useState<string>('');

  // Persistent Member Card Selector State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [showMemberDropdown, setShowMemberDropdown] = useState<boolean>(false);

  // Payment Mode & Paytm / Cash Denomination States
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'PAYTM_UPI'>('CASH');
  const [paytmOrderId, setPaytmOrderId] = useState<string>('');
  const [showDenominations, setShowDenominations] = useState<boolean>(false);

  // Cash Denomination note counts
  const [cash500, setCash500] = useState<number>(0);
  const [cash200, setCash200] = useState<number>(0);
  const [cash100, setCash100] = useState<number>(0);
  const [cash50, setCash50] = useState<number>(0);
  const [cash20, setCash20] = useState<number>(0);
  const [cash10, setCash10] = useState<number>(0);

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

  // Camera QR Scanner Initialization
  const startCameraScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      if (!scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'pos-qr-reader',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            handleScanOrFindCustomer(decodedText);
          },
          (errorMessage) => {
            // handle scan error silently
          }
        );
        scannerRef.current = scanner;
      }
    }, 100);
  };

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((e) => console.error(e));
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (cardEntryMethod === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [cardEntryMethod]);

  // Scan or find customer by QR Token or Card # / Phone
  const handleScanOrFindCustomer = (tokenOrCode: string) => {
    if (!tokenOrCode) return;
    const term = tokenOrCode.trim().toLowerCase();

    // Find customer matching QR Token, Card #, or Phone
    const matched = customers.find(
      (c) =>
        c.qr_token === tokenOrCode.trim() ||
        c.customer_code.toLowerCase() === term ||
        c.phone === term
    );

    if (matched) {
      setSelectedCustomerId(matched.id);
      setMsg({
        type: 'success',
        text: `Linked Member Card #${matched.customer_code} (${matched.full_name})! Select liquor drinks below.`,
      });
      stopCameraScanner();
      setCardEntryMethod('search');
    } else {
      setMsg({
        type: 'error',
        text: `No active member card found for "${tokenOrCode}". Try searching Card # or Name.`,
      });
    }
  };

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

  // Total cash calculated from denominations
  const totalCashCalculated =
    cash500 * 500 +
    cash200 * 200 +
    cash100 * 100 +
    cash50 * 50 +
    cash20 * 20 +
    cash10 * 10;

  // Submit Cart Order
  const handleCheckoutCart = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const payloadPayment: any = {
      payment_mode: paymentMode,
      paytm_order_id: paymentMode === 'PAYTM_UPI' ? (paytmOrderId.trim() || null) : null,
      cash_500: paymentMode === 'CASH' ? cash500 : 0,
      cash_200: paymentMode === 'CASH' ? cash200 : 0,
      cash_100: paymentMode === 'CASH' ? cash100 : 0,
      cash_50: paymentMode === 'CASH' ? cash50 : 0,
      cash_20: paymentMode === 'CASH' ? cash20 : 0,
      cash_10: paymentMode === 'CASH' ? cash10 : 0,
    };

    // Process Cart Basket items
    if (cartItems.length > 0) {
      setSubmitting(true);
      try {
        let totalCount = 0;
        for (const item of cartItems) {
          await saleApi.createSale({
            product_id: item.product.id,
            quantity: item.quantity,
            customer_id: selectedCustomerId || null,
            ...payloadPayment,
          });
          totalCount += item.quantity;
        }

        const memberBadge = selectedCustomer
          ? ` Member #${selectedCustomer.customer_code} (${selectedCustomer.full_name})`
          : '';
        setMsg({
          type: 'success',
          text: `Recorded ${cartItems.length} items (${totalCount} bottles) via ${paymentMode} for${memberBadge} — Total: ₹${cartTotalAmount}`,
        });

        setCartItems([]);
        setPaytmOrderId('');
        setCash500(0); setCash200(0); setCash100(0); setCash50(0); setCash20(0); setCash10(0);
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
    if (!selectedProductId || !selectedProduct) {
      setMsg({ type: 'error', text: 'Please select a drink or add items to cart' });
      return;
    }

    setSubmitting(true);
    try {
      await saleApi.createSale({
        product_id: selectedProductId,
        quantity,
        customer_id: selectedCustomerId || null,
        ...payloadPayment,
      });

      const memberBadge = selectedCustomer
        ? ` Member #${selectedCustomer.customer_code} (${selectedCustomer.full_name})`
        : '';
      setMsg({
        type: 'success',
        text: `Recorded ${quantity}x ${selectedProduct.name} via ${paymentMode} for${memberBadge} — Total: ₹${selectedProduct.selling_price * quantity}`,
      });

      setQuantity(1);
      setPaytmOrderId('');
      setCash500(0); setCash200(0); setCash100(0); setCash50(0); setCash20(0); setCash10(0);
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

  // EXCEL REPORT TYPE 1: Member Card Liquor Purchase Details Report
  const exportMemberLiquorSalesCSV = () => {
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
      'Payment Mode',
      'Paytm Order ID / Txn ID',
      'Cash Denominations (500/200/100/50/20/10)',
    ];

    const rows = detailedSales.map((s) => {
      const denomStr = s.payment_mode === 'CASH'
        ? `"500x${s.cash_500 || 0}, 200x${s.cash_200 || 0}, 100x${s.cash_100 || 0}, 50x${s.cash_50 || 0}, 20x${s.cash_20 || 0}, 10x${s.cash_10 || 0}"`
        : '"N/A"';

      return [
        s.id,
        s.sale_date ? `"${new Date(s.sale_date).toLocaleString()}"` : 'N/A',
        s.customer_code ? `"#${s.customer_code}"` : '"N/A"',
        s.customer_name ? `"${s.customer_name}"` : '"N/A"',
        s.phone ? `"${s.phone}"` : '"N/A"',
        `"${s.product_name}"`,
        `"${s.brand_name || 'N/A'}"`,
        `"${s.category}"`,
        s.volume_ml,
        s.quantity,
        s.unit_price,
        s.total_price,
        `"${s.payment_mode || 'CASH'}"`,
        `"${s.paytm_order_id || 'N/A'}"`,
        denomStr,
      ];
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Member_Liquor_Purchases_Report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXCEL REPORT TYPE 2: General Bottle Sales Log Report (NO Member Details)
  const exportGeneralBottleSalesCSV = () => {
    if (detailedSales.length === 0) {
      alert('No sales log records available to export');
      return;
    }

    const headers = [
      'Sale ID',
      'Date & Time',
      'Bottle / Product Name',
      'Brand Name',
      'Category',
      'Volume (ml)',
      'Quantity Sold',
      'Unit Price (INR)',
      'Total Sales Amount (INR)',
      'Payment Mode',
      'Paytm Order ID / Txn ID',
    ];

    const rows = detailedSales.map((s) => [
      s.id,
      s.sale_date ? `"${new Date(s.sale_date).toLocaleString()}"` : 'N/A',
      `"${s.product_name}"`,
      `"${s.brand_name || 'N/A'}"`,
      `"${s.category}"`,
      s.volume_ml,
      s.quantity,
      s.unit_price,
      s.total_price,
      `"${s.payment_mode || 'CASH'}"`,
      `"${s.paytm_order_id || 'N/A'}"`,
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `General_Bottle_Sales_Summary_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Bar with TWO Separate Excel Export Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#161b22] p-4 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Wine className="w-5 h-5 text-amber-400" />
            <span>Bar POS Counter & Sales Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan Member QR Card • Record Cash Denominations (500,200,100...) or Paytm Txn ID
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={exportMemberLiquorSalesCSV}
            disabled={detailedSales.length === 0}
            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
            title="Download Excel Sheet with Member Card IDs, Names & Liquor Bought"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. MEMBER LIQUOR EXCEL</span>
          </button>

          <button
            onClick={exportGeneralBottleSalesCSV}
            disabled={detailedSales.length === 0}
            className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download General Bottle Sales Report (No Member Details)"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>2. BOTTLE SALES EXCEL (NO MEMBER INFO)</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        
        {/* Left Column: Bar POS Counter & Drink Picker (7 cols) */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          
          {/* Member Card Camera & Search Selector Box */}
          <div className="bg-[#161b22] border border-amber-500/30 rounded-2xl p-4 shadow-lg relative">
            <div className="flex items-center justify-between mb-3 border-b border-[#21262d] pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Step 1: Scan Member Card (Camera or Scanner)</span>
              </label>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setCardEntryMethod('search')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    cardEntryMethod === 'search'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Search / USB
                </button>
                <button
                  type="button"
                  onClick={() => setCardEntryMethod('camera')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    cardEntryMethod === 'camera'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3 h-3" /> Camera Scan
                </button>
              </div>
            </div>

            {/* Active Member Card Banner */}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                    Member Linked
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setMemberSearch('');
                    }}
                    className="p-1 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 transition-colors"
                    title="Unlink Card"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : cardEntryMethod === 'camera' ? (
              /* Camera QR Scanner Box */
              <div className="flex flex-col items-center p-2 bg-[#0d1117] border border-[#30363d] rounded-xl">
                <div id="pos-qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden" />
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Hold member QR card in front of camera to scan automatically
                </p>
              </div>
            ) : (
              /* Search Input & Dropdown */
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanOrFindCustomer(memberSearch);
                      }
                    }}
                    placeholder="Scan QR or enter Member Card # (e.g. 100, 55), Name, Phone..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-2 text-amber-400 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
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

          {/* Step 2: Touch POS Drink Picker Grid */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Step 2: Select Liquor Items & Payment Method</span>
                </h3>
                <p className="text-[11px] text-slate-400">Tap drink card to add to cart, select Cash / Paytm payment</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
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

            {/* Payment Mode Selector & Cash Denominations Box */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Payment Method & Denominations
                </span>

                {/* Payment Mode Toggle */}
                <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-xl border border-[#30363d]">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      paymentMode === 'CASH'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> CASH
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('PAYTM_UPI')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      paymentMode === 'PAYTM_UPI'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> PAYTM / UPI
                  </button>
                </div>
              </div>

              {/* Mode Specific Inputs */}
              {paymentMode === 'PAYTM_UPI' ? (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Paytm Order ID / Transaction ID (Scanned or Typed from Paytm Machine)
                  </label>
                  <input
                    type="text"
                    value={paytmOrderId}
                    onChange={(e) => setPaytmOrderId(e.target.value)}
                    placeholder="e.g. AX19ad80/89c79a495691ae1ca42a2c370c..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-sky-300 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              ) : (
                /* Cash Denominations Counter Grid */
                <div className="space-y-2 border-t border-[#21262d] pt-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5" /> Cash Denominations Breakdown (Notes Count):
                    </span>
                    <span className="font-mono font-black text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      Total Cash: ₹{totalCashCalculated}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs font-mono">
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹500 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash500 || ''}
                        onChange={(e) => setCash500(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹200 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash200 || ''}
                        onChange={(e) => setCash200(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹100 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash100 || ''}
                        onChange={(e) => setCash100(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹50 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash50 || ''}
                        onChange={(e) => setCash50(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹20 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash20 || ''}
                        onChange={(e) => setCash20(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="bg-[#161b22] border border-[#21262d] p-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">₹10 x</span>
                      <input
                        type="number"
                        min={0}
                        value={cash10 || ''}
                        onChange={(e) => setCash10(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-[#0d1117] text-center font-black text-amber-400 py-1 rounded-lg border border-[#30363d] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                        RECORD CART SALE ({cartItems.length} ITEMS) — TOTAL ₹{cartTotalAmount} ({paymentMode})
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
                        RECORD SALE — TOTAL ₹{selectedProduct.selling_price * quantity} ({paymentMode})
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
              <p className="text-[11px] text-slate-400">Live itemized sales linked to member cards & payment mode</p>
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
                    <th className="py-2.5 px-3 text-right">Payment & Amount</th>
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
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono font-black text-amber-400 block text-xs">
                          ₹{s.total_price}
                        </span>
                        <span className={`text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded ${
                          s.payment_mode === 'PAYTM_UPI' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {s.payment_mode === 'PAYTM_UPI' ? 'PAYTM' : 'CASH'}
                        </span>
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
