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
  GlassWater,
  FileSpreadsheet,
  Download,
  Calendar,
  Upload,
  IndianRupee,
  BadgePercent,
  Coins,
  Receipt,
  FileText,
  Plus,
  Trash2,
  Eye,
  Building2,
  Truck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TasmacFormItem {
  id: string;
  productId: number;
  productName: string;
  packSize: number;
  cases: number;
  looseBottles: number;
  ratePerCase: number;
  addedValuePercent: number;
  mrp: number;
  sellingPrice: number;
}

export const Stock: React.FC = () => {
  const [stockList, setStockList] = useState<CurrentStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Main Tab: 'ledger' | 'grid' | 'tasmac_import' | 'receipts' | 'logs'
  const [activeTab, setActiveTab] = useState<'ledger' | 'grid' | 'tasmac_import' | 'receipts' | 'logs'>('ledger');

  // Daily Opening/Purchase/Sale/Closing Ledger States
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Filter & Search States
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>('ALL');
  const [selectedGridCategoryPill, setSelectedGridCategoryPill] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Receive Stock Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveMode, setReceiveMode] = useState<'single' | 'excel'>('single');
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Excel Import States (Legacy Modal)
  const [parsedItems, setParsedItems] = useState<{ productId: number; productName: string; qty: number; status: 'matched' | 'unmatched' }[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  // TASMAC BULK STOCK IMPORT TAB STATES
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`TASMAC-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}`);
  const [depotName, setDepotName] = useState<string>('TASMAC COIMBATORE (SOUTH)');
  const [supplierName, setSupplierName] = useState<string>('TASMAC LTD');
  const [importFileName, setImportFileName] = useState<string>('');
  
  const [formItems, setFormItems] = useState<TasmacFormItem[]>([
    {
      id: '1',
      productId: 0,
      productName: '',
      packSize: 24,
      cases: 1,
      looseBottles: 0,
      ratePerCase: 3500,
      addedValuePercent: 220,
      mrp: 0,
      sellingPrice: 0,
    },
  ]);

  const [pasteText, setPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [importingSubmitting, setImportingSubmitting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Receipt Detail View Modal
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

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

  const loadReceiptsData = async () => {
    try {
      const data = await stockApi.getReceipts();
      setReceipts(data || []);
    } catch (err) {
      console.error('Failed to load arrival receipts:', err);
    }
  };

  useEffect(() => {
    loadStockData();
    loadReceiptsData();
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadLedgerData();
    }
    if (activeTab === 'receipts') {
      loadReceiptsData();
    }
  }, [activeTab, ledgerDate]);

  // SINGLE ITEM STOCK RECEIVE HANDLER
  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setSubmitting(true);
    setMsg(null);

    try {
      await stockApi.receiveStock({
        product_id: selectedProductId,
        quantity,
      });

      setMsg({ type: 'success', text: `Successfully added ${quantity} bottles to inventory!` });
      await loadStockData();
      if (activeTab === 'ledger') await loadLedgerData();

      setTimeout(() => {
        setShowReceiveModal(false);
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to record stock receipt' });
    } finally {
      setSubmitting(false);
    }
  };

  // LEGACY FILE UPLOAD HANDLER FOR MODAL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        const parsed: { productId: number; productName: string; qty: number; status: 'matched' | 'unmatched' }[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawName = String(row[0] || row[1] || '').trim();
          const rawQty = parseInt(row[1] || row[2] || '0', 10);

          if (!rawName || isNaN(rawQty) || rawQty <= 0) continue;

          const matchedProd = products.find(
            (p) => p.name.toLowerCase() === rawName.toLowerCase() || p.name.toLowerCase().includes(rawName.toLowerCase())
          );

          parsed.push({
            productId: matchedProd ? matchedProd.id : 0,
            productName: rawName,
            qty: rawQty,
            status: matchedProd ? 'matched' : 'unmatched',
          });
        }

        setParsedItems(parsed);
      } catch (err) {
        console.error('Failed to parse file:', err);
        alert('Invalid file format. Please upload a valid Excel or CSV file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // MULTI-FORMAT FILE UPLOAD HANDLER FOR TASMAC BULK IMPORT TAB (.xlsx, .xls, .csv, .txt)
  const handleTasmacFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Pick best sheet
        const sheetName = wb.SheetNames.find((s) => s.includes('Sheet3') || s.includes('Sheet1')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        const newFormItems: TasmacFormItem[] = [];

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 2) continue;

          // Find item name
          let name = '';
          let packSize = 24;
          let cases = 0;
          let looseBottles = 0;
          let rateCase = 0;
          let addedValue = 220;

          // Search row cells for product text and numbers
          for (let j = 0; j < r.length; j++) {
            const val = r[j];
            if (typeof val === 'string' && val.length > 3 && !['Item', 'SubProduct', 'Product', 'S.No.', 'INVOICE', 'COIMBATORE'].includes(val.trim())) {
              if (!name) name = val.trim();
            }
          }

          if (!name || name.startsWith('FROM:') || name.startsWith('Basic Purchase')) continue;

          // Extract numeric values from row
          const nums = r.filter((x: any) => typeof x === 'number' && !isNaN(x));
          if (nums.length >= 1) {
            // Check if pack size
            if (name.toLowerCase().includes('180')) packSize = 48;
            else if (name.toLowerCase().includes('375')) packSize = 24;
            else packSize = 12;

            cases = nums[0] || 1;
            rateCase = nums[1] || nums[0] || 3500;
          }

          // Match product from DB list if available
          const matchedProd = products.find(
            (p) => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase())
          );

          newFormItems.push({
            id: Math.random().toString(),
            productId: matchedProd ? matchedProd.id : 0,
            productName: name,
            packSize: matchedProd ? matchedProd.volume_ml === 180 ? 48 : matchedProd.volume_ml === 375 ? 24 : 12 : packSize,
            cases: cases > 0 ? cases : 1,
            looseBottles: 0,
            ratePerCase: rateCase > 0 ? rateCase : 3500,
            addedValuePercent: addedValue,
            mrp: matchedProd ? matchedProd.mrp || 0 : 0,
            sellingPrice: matchedProd ? matchedProd.selling_price || 0 : 0,
          });
        }

        if (newFormItems.length > 0) {
          setFormItems(newFormItems);
          setImportMsg({ type: 'success', text: `Loaded ${newFormItems.length} items from ${file.name}!` });
        }
      } catch (err) {
        console.error('File parse error:', err);
        alert('Could not parse file. Try uploading standard Excel/CSV or pasting text.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // PARSE BULK PASTED TEXT
  const handleParsePastedText = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split('\n');
    const newItems: TasmacFormItem[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const parts = line.split(/[\t,;|]/).map((p) => p.trim()).filter(Boolean);
      
      if (parts.length >= 1) {
        const name = parts[0];
        const cases = parseInt(parts[1] || '1', 10) || 1;
        const rateCase = parseFloat(parts[2] || '3500') || 3500;
        const pack = name.toLowerCase().includes('180') ? 48 : name.toLowerCase().includes('375') ? 24 : 12;

        const matched = products.find((p) => p.name.toLowerCase().includes(name.toLowerCase()));

        newItems.push({
          id: Math.random().toString(),
          productId: matched ? matched.id : 0,
          productName: name,
          packSize: matched ? matched.volume_ml === 180 ? 48 : matched.volume_ml === 375 ? 24 : 12 : pack,
          cases: cases,
          looseBottles: 0,
          ratePerCase: rateCase,
          addedValuePercent: 220,
          mrp: matched ? matched.mrp || 0 : 0,
          sellingPrice: matched ? matched.selling_price || 0 : 0,
        });
      }
    });

    if (newItems.length > 0) {
      setFormItems(newItems);
      setShowPasteModal(false);
      setPasteText('');
      setImportMsg({ type: 'success', text: `Parsed ${newItems.length} items from text paste!` });
    }
  };

  // ADD / REMOVE / UPDATE LIVE TASMAC FORM ITEM
  const handleAddFormRow = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: products.length > 0 ? products[0].id : 0,
        productName: products.length > 0 ? products[0].name : '',
        packSize: 24,
        cases: 1,
        looseBottles: 0,
        ratePerCase: 3500,
        addedValuePercent: 220,
        mrp: 0,
        sellingPrice: 0,
      },
    ]);
  };

  const handleRemoveFormRow = (id: string) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateFormRow = (id: string, field: keyof TasmacFormItem, value: any) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const prod = products.find((p) => p.id === Number(value));
          if (prod) {
            updated.productName = prod.name;
            updated.packSize = prod.volume_ml === 180 ? 48 : prod.volume_ml === 375 ? 24 : 12;
            updated.mrp = prod.mrp || 0;
            updated.sellingPrice = prod.selling_price || 0;
          }
        }
        return updated;
      })
    );
  };

  // TASMAC FORMULA CALCULATOR PER ROW
  const calculateRowCosts = (item: TasmacFormItem) => {
    const pack = item.packSize > 0 ? item.packSize : 24;
    const totalBottles = item.cases * pack + item.looseBottles;
    const baseAmount = (item.ratePerCase / pack) * totalBottles;
    const addedValueAmt = baseAmount * (item.addedValuePercent / 100);
    const tcsAmt = (baseAmount + addedValueAmt) * 0.02;
    const totalLineCost = baseAmount + addedValueAmt + tcsAmt;
    const perBottleBasic = totalBottles > 0 ? totalLineCost / totalBottles : 0;

    return {
      totalBottles,
      baseAmount,
      addedValueAmt,
      tcsAmt,
      totalLineCost,
      perBottleBasic,
    };
  };

  // SUBMIT FULL TASMAC BULK IMPORT TO BACKEND
  const handleSubmitTasmacImport = async () => {
    const validItems = formItems.filter((i) => i.productName.trim() !== '' && (i.cases > 0 || i.looseBottles > 0));
    if (validItems.length === 0) {
      alert('Please add at least one valid item with cases or bottles.');
      return;
    }

    setImportingSubmitting(true);
    setImportMsg(null);

    try {
      const payload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        depot_name: depotName,
        supplier_name: supplierName,
        file_name: importFileName || 'TASMAC Direct Import',
        items: validItems.map((item) => ({
          product_id: item.productId > 0 ? item.productId : undefined,
          product_name: item.productName,
          pack_size: item.packSize,
          cases: item.cases,
          loose_bottles: item.looseBottles,
          rate_per_case: item.ratePerCase,
          added_value_percent: item.addedValuePercent,
          mrp: item.mrp,
          selling_price: item.sellingPrice,
        })),
      };

      const res = await stockApi.importTasmacStock(payload);

      setImportMsg({
        type: 'success',
        text: `Successfully recorded stock arrival for Invoice #${invoiceNumber}! Total: ${res.total_cases} Cases (${res.total_bottles} Bottles) — ₹${res.total_amount.toLocaleString()}`,
      });

      await loadStockData();
      await loadReceiptsData();
      if (activeTab === 'ledger') await loadLedgerData();

      // Reset form
      setFormItems([
        {
          id: Math.random().toString(),
          productId: 0,
          productName: '',
          packSize: 24,
          cases: 1,
          looseBottles: 0,
          ratePerCase: 3500,
          addedValuePercent: 220,
          mrp: 0,
          sellingPrice: 0,
        },
      ]);
    } catch (err: any) {
      setImportMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to import TASMAC stock arrival.' });
    } finally {
      setImportingSubmitting(false);
    }
  };

  // Download Sample Template for Bulk Import
  const downloadSampleTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Product Name', 'Pack Size', 'Cases (C)', 'Loose Bottles (B)', 'Rate per Case (RS)', 'Added Value %'],
      ['DIAMOND BRANDY 375ml', 24, 2, 0, 3515.85, 220],
      ['OAK VAT MATURED RUM 180ml', 48, 11, 0, 4355.06, 220],
      ['MGM ORANGE MEDIUM VODKA 180ml', 48, 1, 0, 4390.45, 220],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_TASMAC_Invoice');
    XLSX.writeFile(wb, 'TASMAC_Stock_Import_Template.xlsx');
  };

  const handleBulkSubmit = async () => {
    const matched = parsedItems.filter((i) => i.status === 'matched');
    if (matched.length === 0) return;

    setSubmitting(true);
    try {
      const payload = matched.map((i) => ({
        product_id: i.productId,
        quantity: i.qty,
      }));

      await stockApi.bulkReceiveStock(payload);
      setMsg({ type: 'success', text: `Bulk imported stock for ${matched.length} drinks!` });
      await loadStockData();
      if (activeTab === 'ledger') await loadLedgerData();

      setTimeout(() => {
        setShowReceiveModal(false);
        setParsedItems([]);
        setExcelFileName('');
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to process bulk import.' });
    } finally {
      setSubmitting(false);
    }
  };

  const exportLedgerCSV = () => {
    if (ledgerData.length === 0) return;
    const headers = [
      'Product Name',
      'Category',
      'Volume (ml)',
      'Pack Size',
      'Basic Purchase Rate (INR)',
      'MRP Rate (INR)',
      'Sales Rate (INR)',
      'OB (Cases)',
      'OB (Bottles)',
      'OB Total Bottles',
      'PUR (Cases)',
      'PUR (Bottles)',
      'PUR Total Bottles',
      'SALE (Cases)',
      'SALE (Bottles)',
      'SALE Total Bottles',
      'CB (Cases)',
      'CB (Bottles)',
      'CB Total Bottles',
      'CLOSING TOTAL BASIC COST VALUE (INR)',
      'CLOSING TOTAL MRP VALUE (INR)',
      'CLOSING TOTAL SALES VALUE (INR)',
    ];

    const rows = ledgerData.map((item) => [
      `"${item.product_name}"`,
      `"${item.category}"`,
      item.volume_ml,
      item.pack_size,
      item.basic_rate,
      item.mrp,
      item.selling_price,
      item.opening_cases,
      item.opening_bottles,
      item.opening_stock,
      item.purchase_cases,
      item.purchase_bottles,
      item.purchase_qty,
      item.sale_cases,
      item.sale_bottles,
      item.sale_qty,
      item.closing_cases,
      item.closing_bottles,
      item.closing_stock,
      item.closing_basic_value,
      item.closing_mrp_value,
      item.closing_sales_value,
    ]);

    const csvContent =
      '\uFEFF' + [`DAILY STOCK LEDGER REPORT - Date: ${ledgerDate}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daily_Stock_Ledger_${ledgerDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Ledger items
  const filteredLedgerItems = ledgerData.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      `${item.volume_ml}ml`.toLowerCase().includes(search.toLowerCase());

    const matchesPill = selectedCategoryPill === 'ALL' || item.category.toLowerCase() === selectedCategoryPill.toLowerCase();
    return matchesSearch && matchesPill;
  });

  const ledgerCategoryPills = Array.from(new Set(ledgerData.map((i) => i.category)));

  // Filter Grid List
  const filteredStockList = stockList.filter((item) => {
    const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase());
    const prod = products.find((p) => p.id === item.product_id);
    const matchesPill =
      selectedGridCategoryPill === 'ALL' || (prod && prod.category.toLowerCase() === selectedGridCategoryPill.toLowerCase());
    return matchesSearch && matchesPill;
  });

  const gridCategoryPills = Array.from(
    new Set(
      stockList
        .map((i) => {
          const prod = products.find((p) => p.id === i.product_id);
          return prod?.category;
        })
        .filter(Boolean)
    )
  );

  const totalStockValuation = stockList.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.product_id);
    return sum + item.current_stock * (prod?.selling_price || 0);
  }, 0);

  const totalClosingSalesVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_sales_value, 0);
  const totalClosingBasicVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_basic_value, 0);
  const totalClosingMrpVal = filteredLedgerItems.reduce((sum, item) => sum + item.closing_mrp_value, 0);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-2xl border border-[#21262d] shadow-lg">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-amber-400" />
            <span>Stock Inventory & TASMAC Bulk Import</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cases (C) + Loose Bottles (B) • Sales Rate • Basic Rate • TASMAC Cost Engine • Arrival History
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setActiveTab('tasmac_import');
            }}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>BULK STOCK IMPORT</span>
          </button>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ QUICK RECEIVE STOCK</span>
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
      <div className="flex items-center gap-2 border-b border-[#21262d] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Stock Ledger (C & B)</span>
        </button>

        <button
          onClick={() => setActiveTab('grid')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'grid'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <Wine className="w-4 h-4" />
          <span>Available Bottle Grid</span>
        </button>

        <button
          onClick={() => setActiveTab('tasmac_import')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'tasmac_import'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <Upload className="w-4 h-4 text-sky-400" />
          <span>📦 Bulk Stock Import & TASMAC Calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'receipts'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>📋 Arrival Audit Logs ({receipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Raw Tx Logs</span>
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
                  placeholder="Search drink name..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-[#21262d] pt-3">
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
              {ledgerCategoryPills.map((cat) => (
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
                  {cat} ({ledgerData.filter((i) => i.category === cat).length})
                </button>
              ))}
            </div>
          </div>

          {/* Valuation Summary Banner Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">Total Basic Cost Value:</span>
              <h3 className="text-xl font-black text-sky-400 font-mono mt-1">₹{totalClosingBasicVal.toLocaleString()}</h3>
            </div>
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Total MRP Value:</span>
              <h3 className="text-xl font-black text-emerald-400 font-mono mt-1">₹{totalClosingMrpVal.toLocaleString()}</h3>
            </div>
            <div className="bg-[#161b22] border border-amber-500/40 p-4 rounded-2xl bg-amber-500/5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">Total Closing Sales Value:</span>
              <h3 className="text-xl font-black text-amber-400 font-mono mt-1">₹{totalClosingSalesVal.toLocaleString()}</h3>
            </div>
          </div>

          {/* Detailed Ledger Table */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 shadow-lg space-y-4">
            {ledgerLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Loading stock ledger records...</span>
              </div>
            ) : filteredLedgerItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No stock ledger items found for date {ledgerDate}.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                      <th className="py-3 px-3 min-w-[180px]">Product Name</th>
                      <th className="py-3 px-2">Cat</th>
                      <th className="py-3 px-2">Vol</th>
                      <th className="py-3 px-2 text-center">Pack</th>
                      <th className="py-3 px-2 text-right text-emerald-400">MRP</th>
                      <th className="py-3 px-2 text-right text-sky-400">Basic</th>
                      <th className="py-3 px-2 text-right text-amber-400">Sales</th>
                      
                      {/* Opening Stock C, B & Total */}
                      <th className="py-3 px-2 text-center bg-[#0d1117]/80 text-slate-300 border-l border-[#30363d]">OB (C)</th>
                      <th className="py-3 px-2 text-center bg-[#0d1117]/80 text-slate-300">OB (B)</th>
                      <th className="py-3 px-2 text-center bg-[#0d1117]/90 text-slate-100 font-black">OB Total</th>
                      
                      {/* Purchases C, B & Total */}
                      <th className="py-3 px-2 text-center bg-emerald-500/10 text-emerald-400 border-l border-[#30363d]">PUR (C)</th>
                      <th className="py-3 px-2 text-center bg-emerald-500/10 text-emerald-400">PUR (B)</th>
                      <th className="py-3 px-2 text-center bg-emerald-500/10 text-emerald-300 font-black">PUR Total</th>
                      
                      {/* Sales C, B & Total */}
                      <th className="py-3 px-2 text-center bg-rose-500/10 text-rose-400 border-l border-[#30363d]">SALE (C)</th>
                      <th className="py-3 px-2 text-center bg-rose-500/10 text-rose-400">SALE (B)</th>
                      <th className="py-3 px-2 text-center bg-rose-500/10 text-rose-300 font-black">SALE Total</th>
                      
                      {/* Closing Stock C, B & Total */}
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-400 border-l border-[#30363d]">CB (C)</th>
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-400">CB (B)</th>
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-300 font-black border-r border-[#30363d]">CB Total</th>
                      
                      <th className="py-3 px-3 text-right text-amber-400">Closing Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-slate-200">
                    {filteredLedgerItems.map((item) => (
                      <tr key={item.product_id} className="hover:bg-[#0d1117]/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-100">{item.product_name}</td>
                        <td className="py-2.5 px-2 text-slate-400 text-[11px]">{item.category}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-400">{item.volume_ml}ml</td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-400">{item.pack_size}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-400 font-bold">₹{Number(item.mrp || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-sky-400 font-bold">₹{Number(item.basic_rate || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-amber-400 font-extrabold">₹{Number(item.selling_price || 0).toFixed(2)}</td>
                        
                        {/* Opening Stock C, B & Total */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-200 border-l border-[#30363d] bg-[#0d1117]/40">
                          {item.opening_cases}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-200 bg-[#0d1117]/40">
                          {item.opening_bottles}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-slate-100 bg-[#0d1117]/60">
                          {item.opening_stock}
                        </td>
                        
                        {/* Purchases C, B & Total */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5 border-l border-[#30363d]">
                          {item.purchase_cases}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5">
                          {item.purchase_bottles}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-300 bg-emerald-500/10">
                          {item.purchase_qty}
                        </td>
                        
                        {/* Sales C, B & Total */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-400 bg-rose-500/5 border-l border-[#30363d]">
                          {item.sale_cases}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-400 bg-rose-500/5">
                          {item.sale_bottles}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-rose-300 bg-rose-500/10">
                          {item.sale_qty}
                        </td>
                        
                        {/* Closing Stock C, B & Total */}
                        <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 bg-amber-500/5 border-l border-[#30363d]">
                          {item.closing_cases}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 bg-amber-500/5">
                          {item.closing_bottles}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-amber-300 bg-amber-500/10 border-r border-[#30363d]">
                          {item.closing_stock}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-400" />
                <span>Live Bottle Inventory Cards ({filteredStockList.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">Available bottle stock in real-time by category</p>
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

          {/* Horizontal Category Filter Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#21262d] pb-3">
            <button
              type="button"
              onClick={() => setSelectedGridCategoryPill('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedGridCategoryPill === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
              }`}
            >
              ALL ({stockList.length})
            </button>
            {gridCategoryPills.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedGridCategoryPill(cat || 'Other')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedGridCategoryPill === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#0d1117] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                }`}
              >
                {cat} ({
                  stockList.filter((i) => {
                    const prod = products.find((p) => p.id === i.product_id);
                    return prod?.category === cat;
                  }).length
                })
              </button>
            ))}
          </div>

          {/* Stock Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStockList.map((item) => {
              const prod = products.find((p) => p.id === item.product_id);
              const packSize = prod?.volume_ml === 180 ? 48 : prod?.volume_ml === 375 ? 24 : 12;
              const cases = Math.floor(item.current_stock / packSize);
              const loose = item.current_stock % packSize;

              return (
                <div
                  key={item.product_id}
                  className="bg-[#0d1117] border border-[#21262d] p-4 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {prod?.category || 'Liquor'} • {prod?.volume_ml}ml
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.current_stock > 12 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {item.current_stock > 12 ? 'In Stock' : 'Low Stock'}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-100 line-clamp-1">{item.product_name}</h4>

                  <div className="grid grid-cols-2 gap-2 text-center bg-[#161b22] p-2.5 rounded-xl border border-[#30363d]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Cases (C)</span>
                      <span className="text-base font-black font-mono text-amber-400">{cases} Cases</span>
                    </div>
                    <div className="border-l border-[#30363d]">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Bottles (B)</span>
                      <span className="text-base font-black font-mono text-slate-100">{loose} Bottles</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#21262d]">
                    <span className="text-slate-400 text-[10px]">Total Available:</span>
                    <span className="font-mono font-black text-amber-400 text-sm">{item.current_stock} Bottles</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DEDICATED TASMAC BULK STOCK IMPORT & COST CALCULATOR ENGINE */}
      {activeTab === 'tasmac_import' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 space-y-6 shadow-xl">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <span>TASMAC Bulk Stock Import & Per-Bottle Cost Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload TASMAC Excel/CSV invoices or paste line items to calculate exact per-bottle basic costs and update inventory.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Quick Bulk Paste</span>
              </button>

              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Sample Template</span>
              </button>
            </div>
          </div>

          {importMsg && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
              importMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              {importMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
              <span>{importMsg.text}</span>
            </div>
          )}

          {/* Invoice Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">TASMAC Invoice #</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. S040172371"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">TASMAC Depot Name</label>
              <input
                type="text"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Multi-Format Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-[#0d1117] rounded-2xl p-6 text-center space-y-2 transition-all">
            <Upload className="w-10 h-10 text-sky-400 mx-auto" />
            <div>
              <label className="cursor-pointer">
                <span className="text-sm font-extrabold text-slate-100 block">
                  Click or Drag & Drop TASMAC Invoice File (.xlsx, .xls, .csv, .txt)
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Supports all Excel formats, CSV files, and copied line sheets
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleTasmacFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {importFileName && (
              <span className="inline-block bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold px-3 py-1 rounded-lg">
                Uploaded: {importFileName}
              </span>
            )}
          </div>

          {/* Interactive Live Invoice Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Invoice Line Items ({formItems.length}) — Real-Time Per-Bottle Basic Cost Calculation</span>
              </h4>

              <button
                type="button"
                onClick={handleAddFormRow}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-amber-400 border border-[#30363d] font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#30363d] rounded-2xl bg-[#0d1117]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#161b22] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                    <th className="py-3 px-3 min-w-[220px]">Liquor Item Name</th>
                    <th className="py-3 px-2 text-center w-24">Pack Size</th>
                    <th className="py-3 px-2 text-center w-24">Cases (C)</th>
                    <th className="py-3 px-2 text-center w-24">Loose (B)</th>
                    <th className="py-3 px-2 text-center w-28">Total Bottles</th>
                    <th className="py-3 px-2 text-right min-w-[120px]">Rate per Case (₹)</th>
                    <th className="py-3 px-2 text-center w-28">Added Val %</th>
                    <th className="py-3 px-2 text-right min-w-[110px]">TCS (2%)</th>
                    <th className="py-3 px-2 text-right min-w-[120px]">Line Total (₹)</th>
                    <th className="py-3 px-2 text-right min-w-[130px] text-sky-400 font-black">Basic Cost / Bottle</th>
                    <th className="py-3 px-2 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {formItems.map((item) => {
                    const costs = calculateRowCosts(item);

                    return (
                      <tr key={item.id} className="hover:bg-[#161b22]/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleUpdateFormRow(item.id, 'productName', e.target.value)}
                            placeholder="e.g. DIAMOND BRANDY 375ml"
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 px-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={item.packSize}
                            onChange={(e) => handleUpdateFormRow(item.id, 'packSize', parseInt(e.target.value))}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 px-1 text-center text-xs font-bold text-slate-200 focus:outline-none"
                          >
                            <option value={48}>48 (180ml)</option>
                            <option value={24}>24 (375ml)</option>
                            <option value={12}>12 (750ml/1L)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.cases || ''}
                            onChange={(e) => handleUpdateFormRow(item.id, 'cases', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 text-center text-xs font-bold text-amber-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.looseBottles || ''}
                            onChange={(e) => handleUpdateFormRow(item.id, 'looseBottles', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 text-center text-xs font-bold text-slate-100 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-100">{costs.totalBottles}</td>
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.ratePerCase || ''}
                            onChange={(e) => handleUpdateFormRow(item.id, 'ratePerCase', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 px-2 text-right text-xs font-bold text-emerald-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.addedValuePercent || ''}
                            onChange={(e) => handleUpdateFormRow(item.id, 'addedValuePercent', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 text-center text-xs font-bold text-purple-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">₹{costs.tcsAmt.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-100">₹{costs.totalLineCost.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-black text-sky-400 bg-sky-500/10 rounded-lg">
                          ₹{costs.perBottleBasic.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFormRow(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Calculated Total Banner */}
          <div className="bg-[#0d1117] border border-amber-500/40 p-5 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full xl:w-auto">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Cases Received:</span>
                <h4 className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {formItems.reduce((sum, i) => sum + (i.cases || 0), 0)} Cases
                </h4>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Bottles Received:</span>
                <h4 className="text-xl font-black text-slate-100 font-mono mt-0.5">
                  {formItems.reduce((sum, i) => sum + calculateRowCosts(i).totalBottles, 0)} Bottles
                </h4>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TCS (2%) Tax:</span>
                <h4 className="text-xl font-black text-purple-400 font-mono mt-0.5">
                  ₹{formItems.reduce((sum, i) => sum + calculateRowCosts(i).tcsAmt, 0).toFixed(2)}
                </h4>
              </div>
              <div className="border-l border-[#30363d] pl-4 sm:pl-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Total Invoice Landed Cost:</span>
                <h3 className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  ₹{formItems.reduce((sum, i) => sum + calculateRowCosts(i).totalLineCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitTasmacImport}
              disabled={importingSubmitting}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all shrink-0"
            >
              {importingSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing & Saving Stock Arrival...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>IMPORT & RECORD TASMAC STOCK ARRIVAL</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK ARRIVAL HISTORY & AUDIT LOGS VIEW */}
      {activeTab === 'receipts' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Stock Arrival Audit Logs & Invoices ({receipts.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Historical log of all imported TASMAC deliveries & stock arrivals</p>
            </div>
          </div>

          {receipts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No stock arrival receipts logged yet. Click "Bulk Stock Import" to add incoming stock.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-3 px-3">Arrival Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Depot / Supplier</th>
                    <th className="py-3 px-3 text-center">Cases (C)</th>
                    <th className="py-3 px-3 text-center">Bottles (B)</th>
                    <th className="py-3 px-3 text-right">Total Amount (₹)</th>
                    <th className="py-3 px-3">Received By</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {receipts.map((rc) => (
                    <tr key={rc.id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-amber-400">{rc.invoice_date}</td>
                      <td className="py-3 px-3 font-bold text-slate-100">{rc.invoice_number || 'N/A'}</td>
                      <td className="py-3 px-3 text-slate-400">{rc.depot_name || rc.supplier_name}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-400">{rc.total_cases} Cases</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-100">{rc.total_bottles} Bottles</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-400">
                        ₹{Number(rc.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{rc.received_by || 'Staff'}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(rc)}
                          className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-sky-400 font-bold rounded-lg text-xs flex items-center gap-1 mx-auto transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Log</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RAW TRANSACTION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Raw Stock Transaction Audit Trail ({transactions.length})</span>
          </h3>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
              No stock transaction records logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-3 px-3">Tx ID</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Product ID</th>
                    <th className="py-3 px-3 text-right">Quantity (Bottles)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-amber-400">#{tx.id}</td>
                      <td className="py-3 px-3 text-slate-400">{new Date(tx.transaction_date).toLocaleString()}</td>
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

      {/* QUICK BULK PASTE MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-xl w-full relative shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <span>Quick Bulk Copy-Paste Stock Import</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste raw lines directly from Excel or text file (e.g. `Item Name, Cases, RatePerCase`)
              </p>
            </div>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste line items here, e.g.:&#10;DIAMOND BRANDY 375ml, 2, 3515.85&#10;OAK VAT MATURED RUM 180ml, 11, 4355.06&#10;MGM ORANGE VODKA 180ml, 1, 4390.45"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-5 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Check className="w-4 h-4" />
                <span>PARSE & PRE-FILL GRID</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT DETAIL VIEW MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-4xl w-full relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setViewingReceipt(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#21262d] pb-3">
              <span className="text-[10px] font-extrabold uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                TASMAC STOCK ARRIVAL RECEIPT LOG
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-1">
                Invoice #{viewingReceipt.invoice_number} — {viewingReceipt.invoice_date}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Depot: {viewingReceipt.depot_name} • Supplier: {viewingReceipt.supplier_name} • Received By: {viewingReceipt.received_by}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Cases</span>
                <span className="text-base font-black font-mono text-amber-400">{viewingReceipt.total_cases} Cases</span>
              </div>
              <div className="border-l border-[#30363d]">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Bottles</span>
                <span className="text-base font-black font-mono text-slate-100">{viewingReceipt.total_bottles} Bottles</span>
              </div>
              <div className="border-l border-[#30363d]">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Invoice Cost</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  ₹{Number(viewingReceipt.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#30363d] rounded-xl bg-[#0d1117]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#161b22] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 text-center">Pack</th>
                    <th className="py-2.5 px-2 text-center">Cases</th>
                    <th className="py-2.5 px-2 text-center">Loose</th>
                    <th className="py-2.5 px-2 text-center">Total</th>
                    <th className="py-2.5 px-2 text-right">Rate/Case</th>
                    <th className="py-2.5 px-2 text-center">Added Val</th>
                    <th className="py-2.5 px-2 text-right">Line Total</th>
                    <th className="py-2.5 px-2 text-right text-sky-400 font-black">Basic Cost/Bottle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {viewingReceipt.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[#161b22]/50">
                      <td className="py-2 px-3 font-bold text-slate-100">{item.product_name}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{item.pack_size}</td>
                      <td className="py-2 px-2 text-center text-amber-400 font-bold">{item.cases}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{item.loose_bottles}</td>
                      <td className="py-2 px-2 text-center font-bold">{item.total_bottles}</td>
                      <td className="py-2 px-2 text-right text-slate-300">₹{Number(item.rate_per_case).toFixed(2)}</td>
                      <td className="py-2 px-2 text-center text-purple-400">{item.added_value_percent}%</td>
                      <td className="py-2 px-2 text-right text-slate-100 font-bold">₹{Number(item.total_line_cost).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-black text-sky-400 bg-sky-500/10">₹{Number(item.calculated_basic_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
