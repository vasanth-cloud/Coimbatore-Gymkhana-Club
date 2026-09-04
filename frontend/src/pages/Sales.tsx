import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from 'html5-qrcode';
import { productApi, saleApi, customerApi, stockApi } from '../api/services';
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
  QrCode,
  AlertCircle,
  IndianRupee,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form Filter & Search States (Touch POS Grid)
  const [posCategoryPill, setPosCategoryPill] = useState<string>('ALL');
  const [posSearch, setPosSearch] = useState<string>('');

  // Persistent Member Card Selector State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [showMemberDropdown, setShowMemberDropdown] = useState<boolean>(false);

  // Multi-Item Cart Basket State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stockList, setStockList] = useState<Array<{ product_id: number; product_name: string; current_stock: number }>>([]);

  // 3 QR Payment Display Modal State
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Denominations Counter & Sales Cross-Verification States
  const [cash500, setCash500] = useState<number>(0);
  const [cash200, setCash200] = useState<number>(0);
  const [cash100, setCash100] = useState<number>(0);
  const [cash50, setCash50] = useState<number>(0);
  const [cash20, setCash20] = useState<number>(0);
  const [cash10, setCash10] = useState<number>(0);
  const [cash5, setCash5] = useState<number>(0);
  const [cash2, setCash2] = useState<number>(0);
  const [cash1, setCash1] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseReason, setExpenseReason] = useState<string>('');
  const [showDenomModal, setShowDenomModal] = useState<boolean>(false);

  const totalSalesLogAmount = detailedSales.reduce((sum, s) => sum + s.total_price, 0);

  const totalCalculatedCashNotes =
    cash500 * 500 +
    cash200 * 200 +
    cash100 * 100 +
    cash50 * 50 +
    cash20 * 20 +
    cash10 * 10 +
    cash5 * 5 +
    cash2 * 2 +
    cash1 * 1;

  const totalDenominationsReceived = totalCalculatedCashNotes + upiAmount + cardAmount + expenseAmount;
  const denominationDiff = totalDenominationsReceived - totalSalesLogAmount;

  const loadData = async () => {
    try {
      setLoading(true);
      const [detSales, prodList, custList, dailyData, stocks] = await Promise.all([
        saleApi.getDetailedSales(500).catch((err) => { console.error('getDetailedSales error:', err); return []; }),
        productApi.getProducts().catch((err) => { console.error('getProducts error:', err); return []; }),
        customerApi.getCustomers().catch((err) => { console.error('getCustomers error:', err); return []; }),
        saleApi.getDailySales(reportDate).catch((err) => { console.error('getDailySales error:', err); return []; }),
        stockApi.getAllCurrentStock().catch((err) => { console.error('getAllCurrentStock error:', err); return []; }),
      ]);
      setDetailedSales(detSales);
      setProducts(prodList);
      setCustomers(custList);
      setDailySales(dailyData);
      setStockList(stocks);
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

  // Scan or find customer by QR Token or Card # / Phone / Name
  const handleScanOrFindCustomer = async (tokenOrCode: string) => {
    if (!tokenOrCode) return;
    const raw = tokenOrCode.trim();
    const term = raw.toLowerCase();

    // 1. Try finding customer in memory first
    let matched = customers.find(
      (c) =>
        (c.qr_token && (c.qr_token === raw || c.qr_token.toLowerCase() === term || raw.includes(c.qr_token))) ||
        c.customer_code.toLowerCase() === term ||
        c.phone === term ||
        c.full_name.toLowerCase() === term
    );

    // 2. If not found in memory, query PostgreSQL backend lookup API directly!
    if (!matched) {
      try {
        matched = await customerApi.lookupCustomer(raw);
      } catch (e) {
        console.warn('Backend customer lookup failed:', e);
      }
    }

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);

    try {
      const html5QrCode = new Html5Qrcode('sales-qr-file-temp-element');
      const decodedText = await html5QrCode.scanFile(file, false);
      handleScanOrFindCustomer(decodedText);
    } catch (err: any) {
      console.error('File QR Scan error:', err);
      setMsg({
        type: 'error',
        text: 'Could not detect a valid QR code in the captured photo. Please try again.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    const stockItem = stockList.find((s) => s.product_id === product.id);
    const availStock = stockItem ? stockItem.current_stock : 0;

    if (availStock <= 0) {
      setMsg({
        type: 'error',
        text: `Cannot add "${product.name}" - OUT OF STOCK (0 Available)! Receive stock first.`,
      });
      return;
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + qty;
        if (newQty > availStock) {
          setMsg({
            type: 'error',
            text: `Cannot add ${newQty} bottles of "${product.name}" - Only ${availStock} available in stock!`,
          });
          return prev;
        }
        updated[existingIdx].quantity = newQty;
        return updated;
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => setCartItems([]);

  const handleUpdateCartQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    const stockItem = stockList.find((s) => s.product_id === productId);
    const availStock = stockItem ? stockItem.current_stock : 0;
    if (newQty > availStock) {
      setMsg({
        type: 'error',
        text: `Cannot set ${newQty} bottles — Only ${availStock} available in stock!`,
      });
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const cartTotalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  // Submit Cart Order (Fast 1-click POS checkout)
  const handleCheckoutCart = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

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
      });

      const memberBadge = selectedCustomer
        ? ` Member #${selectedCustomer.customer_code} (${selectedCustomer.full_name})`
        : '';
      setMsg({
        type: 'success',
        text: `Recorded ${quantity}x ${selectedProduct.name} for${memberBadge} — Total: ₹${selectedProduct.selling_price * quantity}`,
      });

      setQuantity(1);
      // NOTE: DO NOT CLEAR MEMBER CARD! Stays active for subsequent drinks!
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
    ];

    const rows = detailedSales.map((s) => [
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
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const statusText =
      denominationDiff === 0
        ? '"VERIFIED & MATCHED (BALANCED - ₹0 Difference)"'
        : denominationDiff > 0
        ? `"${'DISCREPANCY: EXCESS CASH/ONLINE BY ₹' + denominationDiff}"`
        : `"${'DISCREPANCY: SHORTAGE BY ₹' + Math.abs(denominationDiff)}"`;

    const summaryRows = [
      [''],
      ['TOTAL SALES LOG AMOUNT (INR)', '', '', '', '', '', '', '', '', '', '', totalSalesLogAmount],
      [''],
      ['--- DENOMINATIONS RECEIVED & EXPENSES CROSS-VERIFICATION AUDIT ---', '', '', '', '', '', '', '', '', '', '', ''],
      ['Category / Denomination Note', 'Count / Payment Source', 'Calculated Total Amount (INR)'],
      ['₹500 Notes', cash500, cash500 * 500],
      ['₹200 Notes', cash200, cash200 * 200],
      ['₹100 Notes', cash100, cash100 * 100],
      ['₹50 Notes', cash50, cash50 * 50],
      ['₹20 Notes', cash20, cash20 * 20],
      ['₹10 Notes', cash10, cash10 * 10],
      ['₹5 Notes/Coins', cash5, cash5 * 5],
      ['₹2 Notes/Coins', cash2, cash2 * 2],
      ['₹1 Notes/Coins', cash1, cash1 * 1],
      ['Total Cash Notes Collection', 'Cash Drawer', totalCalculatedCashNotes],
      ['Online Paytm / PhonePe / UPI Total', 'QR Collection', upiAmount],
      ['POS Card Machine Collection Total', 'Card Terminal', cardAmount],
      ['BAR EXPENSES PAID FROM SALES CASH', `"${expenseReason ? expenseReason : 'Bar Expenses / Purchases'}"`, expenseAmount],
      ['TOTAL ACCOUNTED COLLECTION (INR)', 'Cash + Online + Card + Expenses', totalDenominationsReceived],
      ['CROSS-VERIFICATION MATCH STATUS', 'Sales Log vs Accounted Collection', statusText],
    ];

    const csvContent =
      '\uFEFF' +
      [
        `"COIMBATORE GYMKHANA CLUB - MEMBER SALES & DENOMINATION AUDIT REPORT (${dateStr})"`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        ...summaryRows.map((r) => r.join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Member_Liquor_Sales_And_Denominations_${dateStr}.csv`;
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
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const statusText =
      denominationDiff === 0
        ? '"VERIFIED & MATCHED (BALANCED - ₹0 Difference)"'
        : denominationDiff > 0
        ? `"${'DISCREPANCY: EXCESS CASH/ONLINE BY ₹' + denominationDiff}"`
        : `"${'DISCREPANCY: SHORTAGE BY ₹' + Math.abs(denominationDiff)}"`;

    const summaryRows = [
      [''],
      ['TOTAL SALES LOG AMOUNT (INR)', '', '', '', '', '', '', '', totalSalesLogAmount],
      [''],
      ['--- DENOMINATIONS RECEIVED & EXPENSES CROSS-VERIFICATION AUDIT ---', '', '', '', '', '', '', '', ''],
      ['Category / Denomination Note', 'Count / Payment Source', 'Calculated Total Amount (INR)'],
      ['₹500 Notes', cash500, cash500 * 500],
      ['₹200 Notes', cash200, cash200 * 200],
      ['₹100 Notes', cash100, cash100 * 100],
      ['₹50 Notes', cash50, cash50 * 50],
      ['₹20 Notes', cash20, cash20 * 20],
      ['₹10 Notes', cash10, cash10 * 10],
      ['₹5 Notes/Coins', cash5, cash5 * 5],
      ['₹2 Notes/Coins', cash2, cash2 * 2],
      ['₹1 Notes/Coins', cash1, cash1 * 1],
      ['Total Cash Notes Collection', 'Cash Drawer', totalCalculatedCashNotes],
      ['Online Paytm / PhonePe / UPI Total', 'QR Collection', upiAmount],
      ['POS Card Machine Collection Total', 'Card Terminal', cardAmount],
      ['BAR EXPENSES PAID FROM SALES CASH', `"${expenseReason ? expenseReason : 'Bar Expenses / Purchases'}"`, expenseAmount],
      ['TOTAL ACCOUNTED COLLECTION (INR)', 'Cash + Online + Card + Expenses', totalDenominationsReceived],
      ['CROSS-VERIFICATION MATCH STATUS', 'Sales Log vs Accounted Collection', statusText],
    ];

    const csvContent =
      '\uFEFF' +
      [
        `"COIMBATORE GYMKHANA CLUB - BOTTLE SALES & DENOMINATION AUDIT REPORT (${dateStr})"`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        ...summaryRows.map((r) => r.join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `General_Bottle_Sales_And_Denominations_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sales Log Modal State
  const [showSalesLogModal, setShowSalesLogModal] = useState<boolean>(false);

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Bar with Action Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#161b22] p-4 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Wine className="w-5 h-5 text-amber-400" />
            <span>Bar POS Counter & Sales Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan Member QR Card with camera • Itemized liquor sales log with 1-tap Excel download
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDenomModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
            title="Open Cash Denominations & Sales Cross-Verification Tool"
          >
            <Calculator className="w-4 h-4 stroke-[2.5]" />
            <span>CASH DENOMINATIONS & VERIFY</span>
          </button>

          {/* Prominent Sales Log View Button */}
          <button
            onClick={() => setShowSalesLogModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all"
            title="Open Sales Log History Window"
          >
            <Receipt className="w-4 h-4 stroke-[2.5]" />
            <span>VIEW SALES LOG ({detailedSales.length})</span>
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/10 transition-all"
            title="Display Paytm, PhonePe, and Google Pay QR Codes"
          >
            <QrCode className="w-4 h-4" />
            <span>UPI PAYMENT QRs</span>
          </button>
        </div>
      </div>

      {/* Full-Width Minimalist Bar POS Counter Container */}
      <div className="w-full space-y-5 min-w-0">
        
        {/* Step 1: Member Card Camera & Search Selector Box */}
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
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#21262d] rounded-lg transition-colors"
                  title="Unlink Customer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {cardEntryMethod === 'camera' ? (
                <div className="space-y-3">
                  {/* Hidden HTML5QR element for scanning snapshots */}
                  <div id="sales-qr-file-temp-element" className="hidden" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Mobile Camera Snapshot Button - Works over HTTP without browser blocking */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>SNAP & SCAN MEMBER QR WITH PHONE CAMERA</span>
                  </button>

                  <div className="border-t border-[#21262d] pt-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Or Live Stream Video Scanner:
                    </span>
                    {!scannerActive ? (
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="w-full py-2.5 bg-[#21262d] hover:bg-[#30363d] text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-[#30363d] transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>START LIVE VIDEO SCANNER</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCameraScanner}
                        className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all mb-2"
                      >
                        <X className="w-4 h-4" />
                        <span>STOP LIVE SCANNER</span>
                      </button>
                    )}
                    <div
                      id="pos-qr-reader"
                      className="overflow-hidden rounded-xl bg-black border border-[#30363d] min-h-[160px] flex items-center justify-center text-slate-500 text-xs mt-2"
                    />
                  </div>

                  {!window.isSecureContext && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs space-y-1 text-left">
                      <span className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        Mobile HTTP Security Policy
                      </span>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        Mobile browsers block live video streams over plain HTTP links. Use the <b>"SNAP & SCAN MEMBER QR WITH PHONE CAMERA"</b> button above to scan instantly without restrictions!
                      </p>
                    </div>
                  )}
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
          )}
        </div>

        {/* Step 2: Touch POS Drink Picker Grid (Spacious Full Width) */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Step 2: Select Drink & Quantity</span>
              </h3>
              <p className="text-[11px] text-slate-400">Tap drink card to select for checkout</p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Filter liquor drink name..."
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

          {/* Drink Grid (Spacious 4 Columns) */}
          {filteredPosProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No products found matching filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 max-h-96 overflow-y-auto pr-1">
              {filteredPosProducts.map((p) => {
                const isSelected = selectedProductId === p.id;
                const cartCount = cartItems.find((item) => item.product.id === p.id)?.quantity || 0;
                const stockItem = stockList.find((s) => s.product_id === p.id);
                const availStock = stockItem ? stockItem.current_stock : 0;
                const isOutOfStock = availStock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative shadow-sm ${
                      isOutOfStock
                        ? 'bg-[#0d1117]/60 border-[#21262d] opacity-75'
                        : isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 scale-[0.98]'
                        : 'bg-[#0d1117] border-[#21262d] hover:border-slate-600 hover:bg-[#161b22]'
                    }`}
                  >
                    {cartCount > 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] font-mono z-10">
                        {cartCount} in Cart
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold font-mono text-amber-400/80 uppercase block">
                          {p.category} • {p.volume_ml}ml
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded font-mono uppercase">
                            NO STOCK
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                            {availStock} Left
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-100 truncate">{p.name}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#21262d] pt-2">
                      <span className="text-sm font-black text-amber-400 font-mono">₹{p.selling_price}</span>
                      {isOutOfStock ? (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 bg-[#21262d] text-rose-400 font-bold text-[10px] rounded-lg cursor-not-allowed opacity-75"
                        >
                          NO STOCK
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p, 1);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-xl transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
                        </button>
                      )}
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
                    Selected Cart Items ({cartItems.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear Cart
                </button>
              </div>

              {/* Itemized Cart List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 divide-y divide-[#21262d]/50">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between pt-1.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{item.product.name} ({item.product.volume_ml}ml)</span>
                      <span className="text-[10px] text-slate-400 font-mono">₹{item.product.selling_price} each</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#161b22] px-2 py-1 rounded-lg border border-[#21262d]">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.product.id, item.quantity - 1)}
                          className="text-slate-400 hover:text-amber-400 p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black text-amber-400 font-mono px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.product.id, item.quantity + 1)}
                          className="text-slate-400 hover:text-amber-400 p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-black text-amber-400 font-mono w-16 text-right">
                        ₹{item.product.selling_price * item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Grand Total & Record Sale Action Button */}
              <div className="border-t border-[#21262d] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Cart Grand Total</span>
                  <h3 className="text-xl font-black text-amber-400 font-mono">₹{cartTotalAmount}</h3>
                </div>

                <button
                  type="button"
                  onClick={handleCheckoutCart}
                  disabled={submitting}
                  className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
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
                      </span>
                    </>
                  )}
                </button>
              </div>
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

      {/* SALES LOG POPUP MODAL */}
      {showSalesLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-4xl w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowSalesLogModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <span>Itemized Sales Log History ({detailedSales.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Live itemized liquor sales linked to member cards</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowDenomModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  title="Open Cash Denominations & Sales Verification Modal"
                >
                  <Calculator className="w-4 h-4 stroke-[2.5]" />
                  <span>Denominations & Verify</span>
                </button>

                <button
                  onClick={exportMemberLiquorSalesCSV}
                  disabled={detailedSales.length === 0}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Member Excel</span>
                </button>

                <button
                  onClick={exportGeneralBottleSalesCSV}
                  disabled={detailedSales.length === 0}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Bottle Excel</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading sales log...</span>
              </div>
            ) : detailedSales.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No sales recorded yet today.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0 flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                      <th className="py-3 px-3">Date / Time</th>
                      <th className="py-3 px-3">Member Card</th>
                      <th className="py-3 px-3">Liquor Item</th>
                      <th className="py-3 px-3 text-right">Amount</th>
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
                              <span className="block text-[10px] text-slate-300 truncate max-w-[150px]" title={s.customer_name || ''}>
                                {s.customer_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-100 block">{s.product_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {s.quantity}x @ ₹{s.unit_price} ({s.volume_ml}ml)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400 text-sm">
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
      )}

      {/* 3 UPI PAYMENT QR DISPLAY MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-2xl w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                <span>Coimbatore Gymkhana Club — Official Payment QR Codes</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan with Paytm, PhonePe, or Google Pay to complete payment
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Paytm BHIM UPI Official Standee QR Box */}
              <div className="bg-[#0d1117] border border-sky-500/50 p-4 rounded-xl text-center space-y-2">
                <span className="text-xs font-black text-sky-400 uppercase tracking-wider block">
                  Official Paytm BHIM UPI QR Standee
                </span>
                <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-lg border border-sky-500/30">
                  <img
                    src="/paytm_qr.png"
                    alt="Paytm Preferred BHIM UPI QR Code"
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-300 bg-[#161b22] py-1 px-2 rounded-lg border border-[#30363d] flex items-center justify-between">
                  <span className="text-slate-400 font-bold">UPI ID:</span>
                  <span className="font-bold text-amber-400">paytm.s22ambe@pty</span>
                </div>
              </div>

              {/* UPI Merchant Details & Transaction Auto-Fetch Guide */}
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider mb-2">
                    Merchant Details & Transaction History
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2 font-mono">
                    <li className="flex items-center justify-between border-b border-[#21262d] pb-1">
                      <span className="text-slate-400">Merchant Name:</span>
                      <span className="font-bold text-slate-100">Coimbatore Gymkhana Club</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-[#21262d] pb-1">
                      <span className="text-slate-400">Paytm MID:</span>
                      <span className="font-bold text-slate-100">ZlxyfM20106557428761</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-[#21262d] pb-1">
                      <span className="text-slate-400">Accepted Apps:</span>
                      <span className="font-bold text-sky-400">Paytm / PhonePe / GPay / Any UPI</span>
                    </li>
                  </ul>

                  <div className="mt-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-sky-300 block">⚡ Automatic Transaction Logging</span>
                    <p className="text-[10px] text-slate-400">
                      When customers scan this Paytm QR and pay, Paytm sends the 12-digit UTR Transaction ID to automatically record payment in reports!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASH DENOMINATIONS & CROSS-VERIFICATION MODAL */}
      {showDenomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-amber-500/40 rounded-2xl p-6 max-w-3xl w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDenomModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Closing Audit Tool
              </span>
              <h3 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <span>Cash Denomination & Sales Cross-Verification</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter currency note counts & received payments to verify against today's total sales log
              </p>
            </div>

            {/* Verification Comparison Banner */}
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#161b22] p-3 rounded-xl border border-[#21262d]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Sales Log Today:
                </span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  ₹{totalSalesLogAmount.toLocaleString()}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">{detailedSales.length} Transactions Recorded</span>
              </div>

              <div className="bg-[#161b22] p-3 rounded-xl border border-[#21262d]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Accounted & Entered:
                </span>
                <span className="text-xl font-black text-sky-400 font-mono">
                  ₹{totalDenominationsReceived.toLocaleString()}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Cash (₹{totalCalculatedCashNotes.toLocaleString()}) + Online + Card + Expenses (₹{expenseAmount.toLocaleString()})
                </span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                denominationDiff === 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : denominationDiff > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  Cross-Verification Status:
                </span>
                <span className="text-xs font-black font-mono mt-1">
                  {denominationDiff === 0
                    ? '✅ PERFECT MATCH (₹0 Diff)'
                    : denominationDiff > 0
                    ? `⚠️ EXCESS: +₹${denominationDiff.toLocaleString()}`
                    : `❌ SHORTAGE: -₹${Math.abs(denominationDiff).toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Note Denomination Inputs */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span>Cash Note Denomination Breakdown (Note Counts)</span>
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { label: '₹500 Note', val: cash500, setVal: setCash500, mult: 500, color: 'text-emerald-400' },
                  { label: '₹200 Note', val: cash200, setVal: setCash200, mult: 200, color: 'text-amber-400' },
                  { label: '₹100 Note', val: cash100, setVal: setCash100, mult: 100, color: 'text-sky-400' },
                  { label: '₹50 Note', val: cash50, setVal: setCash50, mult: 50, color: 'text-purple-400' },
                  { label: '₹20 Note', val: cash20, setVal: setCash20, mult: 20, color: 'text-pink-400' },
                  { label: '₹10 Note', val: cash10, setVal: setCash10, mult: 10, color: 'text-slate-300' },
                  { label: '₹5 Note/Coin', val: cash5, setVal: setCash5, mult: 5, color: 'text-slate-400' },
                  { label: '₹2 Note/Coin', val: cash2, setVal: setCash2, mult: 2, color: 'text-slate-400' },
                  { label: '₹1 Note/Coin', val: cash1, setVal: setCash1, mult: 1, color: 'text-slate-400' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl text-center space-y-1">
                    <span className={`text-[11px] font-mono font-bold block ${item.color}`}>{item.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={item.val || ''}
                      onChange={(e) => item.setVal(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1.5 text-center text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 font-mono block">₹{item.val * item.mult}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Online & Card Payment Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0d1117] border border-sky-500/40 p-3.5 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                  Online UPI (Paytm / GPay / PhonePe) Total (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={upiAmount || ''}
                  onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 15000"
                  className="w-full bg-[#161b22] border border-sky-500/30 rounded-lg py-2 px-3 text-sm font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-[#0d1117] border border-purple-500/40 p-3.5 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                  POS Card Machine Collection Total (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cardAmount || ''}
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 8000"
                  className="w-full bg-[#161b22] border border-purple-500/30 rounded-lg py-2 px-3 text-sm font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Bar Expenses Paid Section */}
            <div className="bg-[#0d1117] border border-amber-500/40 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  <span>Bar Expenses Paid from Sales Cash / Collection (INR)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  e.g. Card printer machine, supplies, ice, lemons
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Expense Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 10"
                    className="w-full bg-[#161b22] border border-amber-500/30 rounded-xl py-2 px-3 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Expense Description / Reason
                  </label>
                  <input
                    type="text"
                    value={expenseReason}
                    onChange={(e) => setExpenseReason(e.target.value)}
                    placeholder="e.g. Bought card printer machine, ribbon, lemons, ice..."
                    className="w-full bg-[#161b22] border border-amber-500/30 rounded-xl py-2 px-3 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#21262d] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportMemberLiquorSalesCSV}
                  disabled={detailedSales.length === 0}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>EXPORT MEMBER EXCEL (WITH DENOMINATIONS)</span>
                </button>
                <button
                  type="button"
                  onClick={exportGeneralBottleSalesCSV}
                  disabled={detailedSales.length === 0}
                  className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>EXPORT BOTTLE EXCEL</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDenomModal(false)}
                className="px-5 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
