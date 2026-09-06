import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Tesseract from 'tesseract.js';
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
  Pencil,
  Camera,
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
  const [hideZeroLedger, setHideZeroLedger] = useState(false);

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
  const [ocrScanning, setOcrScanning] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parsed Invoice Summary from Excel File
  const [excelSummary, setExcelSummary] = useState<{
    totalCases: number;
    totalAmount: number;
    imfsCases: number;
    imfsSubtotal: number;
    beerCases: number;
    beerSubtotal: number;
    secondSaleTax: number;
    grandTotal: number;
    tcsTax: number;
    netAmount: number;
  } | null>(null);

  // Receipt Detail View Modal
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  // Edit Product & Rates Modal States
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editVolume, setEditVolume] = useState<number>(750);
  const [editPackSize, setEditPackSize] = useState<number>(12);
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editBasicRate, setEditBasicRate] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditName(item.product_name || item.name || '');
    setEditCategory(item.category || 'SPIRITS');
    setEditVolume(item.volume_ml || 750);
    setEditPackSize(item.pack_size || 12);
    setEditMrp(item.mrp || 0);
    setEditBasicRate(item.basic_rate || 0);
    setEditSellingPrice(item.selling_price || 0);
    setEditMsg(null);
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const prodId = editingItem.product_id || editingItem.id;
    if (!prodId) return;

    setEditSubmitting(true);
    setEditMsg(null);

    try {
      await productApi.updateProduct(prodId, {
        name: editName,
        category: editCategory,
        volume_ml: editVolume,
        pack_size: editPackSize,
        mrp: editMrp,
        basic_rate: editBasicRate,
        selling_price: editSellingPrice,
      });

      setEditMsg({ type: 'success', text: 'Product rates & specs updated successfully!' });
      await loadStockData();
      if (activeTab === 'ledger') await loadLedgerData();

      setTimeout(() => {
        setEditingItem(null);
        setEditMsg(null);
      }, 1200);
    } catch (err: any) {
      setEditMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update product details' });
    } finally {
      setEditSubmitting(false);
    }
  };

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

  // OCR PARSER FOR PHOTO INVOICES (JPG, PNG, WEBP)
  const parseOcrInvoiceText = (ocrText: string, fileName: string) => {
    if (!ocrText || !ocrText.trim()) {
      setImportMsg({ type: 'error', text: `Could not detect text in photo (${fileName}).` });
      return;
    }

    const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);

    // Meta fields extraction
    lines.forEach((l) => {
      const lower = l.toLowerCase();
      if (lower.includes('invoice') || lower.includes('inv')) {
        const m = l.match(/[S0-9]{7,12}/i);
        if (m) setInvoiceNumber(m[0]);
      }
      if (lower.includes('depot')) {
        setDepotName(l.toUpperCase());
      }
    });

    const newItems: TasmacFormItem[] = [];

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (['invoice', 'depot', 'total', 'subtotal', 'grand total', 'tax', 's.no', 'added value', 'license'].some((k) => lower.includes(k))) return;

      const nums = line.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      const cleanName = line.replace(/[\d.,₹%()]/g, '').trim();
      if (!cleanName || cleanName.length < 3) return;

      const matched = products.find((p) => p.name.toLowerCase().includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(p.name.toLowerCase()));

      let cases = 1;
      let rateCase = 3500;
      if (nums.length >= 2) {
        cases = nums[0] < 500 ? Math.max(1, Math.floor(nums[0])) : 1;
        rateCase = nums.find((n) => n > 500 && n < 20000) || 3500;
      } else if (nums.length === 1) {
        if (nums[0] > 500) rateCase = nums[0];
        else cases = Math.max(1, Math.floor(nums[0]));
      }

      const pack = matched ? (matched.volume_ml === 180 ? 48 : matched.volume_ml === 375 ? 24 : 12) : 12;

      newItems.push({
        id: Math.random().toString(),
        productId: matched ? matched.id : 0,
        productName: matched ? matched.name : cleanName.toUpperCase(),
        packSize: pack,
        cases,
        looseBottles: 0,
        ratePerCase: rateCase,
        addedValuePercent: 220,
        mrp: matched ? matched.mrp || 0 : 0,
        sellingPrice: matched ? matched.selling_price || 0 : 0,
      });
    });

    if (newItems.length > 0) {
      setFormItems(newItems);
      setImportMsg({
        type: 'success',
        text: `📷 OCR Photo Scan Complete! Loaded ${newItems.length} line items from photo (${fileName}).`
      });
    } else {
      setImportMsg({
        type: 'error',
        text: `Scanned photo (${fileName}), but could not auto-detect line items. You can paste lines manually or upload Excel.`
      });
    }
  };

  // MULTI-FORMAT FILE UPLOAD HANDLER FOR TASMAC BULK IMPORT TAB (.xlsx, .xls, .csv, .txt, .jpg, .png)
  const handleTasmacFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    // Check for Image Upload (JPG, PNG, WEBP, BMP)
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext || '')) {
      setImportFileName(file.name);
      setOcrScanning(true);
      setImportMsg({
        type: 'success',
        text: `📷 Scanning photo invoice (${file.name}) via OCR text extraction... Please wait.`
      });

      Tesseract.recognize(file, 'eng')
        .then(({ data: { text } }) => {
          setOcrScanning(false);
          parseOcrInvoiceText(text, file.name);
        })
        .catch((err) => {
          setOcrScanning(false);
          console.error('OCR Error:', err);
          setImportMsg({
            type: 'error',
            text: `Could not process photo invoice (${file.name}). Please ensure photo is clear or upload Excel/CSV.`
          });
        });
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Pick best sheet
        const sheetName = wb.SheetNames.find((s) => s.includes('Invoice') || s.includes('Sheet1') || s.includes('Sheet3')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        if (!rows || rows.length === 0) {
          alert('Uploaded sheet is empty.');
          return;
        }

        // 1. Scan Metadata Header
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const r = rows[i];
          if (!r) continue;
          for (let j = 0; j < r.length; j++) {
            const cellVal = String(r[j] || '').trim();
            if (cellVal.toLowerCase().includes('invoice number') || cellVal.toLowerCase().includes('invoice no')) {
              const val = String(r[j + 1] || r[j + 2] || '').trim();
              if (val) setInvoiceNumber(val);
            }
            if (cellVal.toLowerCase() === 'depot') {
              const val = String(r[j + 1] || '').trim();
              if (val) setDepotName(`TASMAC ${val.toUpperCase()}`);
            }
            if (cellVal.toLowerCase() === 'date') {
              const val = r[j + 1];
              if (val) {
                if (typeof val === 'number') {
                  const d = XLSX.SSF.parse_date_code(val);
                  if (d) setInvoiceDate(`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`);
                } else {
                  const strD = String(val).split('T')[0];
                  if (strD && strD.length >= 8) setInvoiceDate(strD);
                }
              }
            }
          }
        }

        // Dynamic Column Header Mapping for exact 9 TASMAC bill headers
        let colMap = {
          sno: 0,
          itemDesc: 1,
          packSize: 2,
          cases: 3,
          bottles: 4,
          rateCase: 5,
          addedValRs: 6,
          addedValPct: 7,
          amount: 8,
        };

        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const r = rows[i];
          if (!r || !Array.isArray(r)) continue;
          let matchCount = 0;
          r.forEach((cellVal: any, colIdx: number) => {
            const txt = String(cellVal || '').toLowerCase().trim();
            if (txt.includes('item description') || txt.includes('liquor item') || txt.includes('product name')) {
              colMap.itemDesc = colIdx;
              matchCount++;
            } else if (txt.includes('pack size') || txt.includes('vol') || txt.includes('ml')) {
              colMap.packSize = colIdx;
              matchCount++;
            } else if (txt.includes('quantity cases') || txt.includes('cases (c)') || txt.includes('cases')) {
              colMap.cases = colIdx;
              matchCount++;
            } else if (txt.includes('quantity bottles') || txt.includes('bottles (b)') || txt.includes('loose')) {
              colMap.bottles = colIdx;
              matchCount++;
            } else if (txt.includes('rate per case') || txt.includes('rate/case')) {
              colMap.rateCase = colIdx;
              matchCount++;
            } else if (txt.includes('added value rs') || txt.includes('added value (rs)') || txt.includes('added val rs')) {
              colMap.addedValRs = colIdx;
              matchCount++;
            } else if (txt.includes('added value %') || txt.includes('added value percent') || txt.includes('added val %')) {
              colMap.addedValPct = colIdx;
              matchCount++;
            } else if (txt === 'amount (rs.)' || txt === 'amount(rs.)' || txt.includes('amount')) {
              colMap.amount = colIdx;
              matchCount++;
            }
          });
          if (matchCount >= 3) break;
        }

        // Helper for Token Normalization
        const normalizeTokens = (txt: string) => {
          let t = String(txt || '').toLowerCase();
          ['(qmb)', '(can)', 'deluxe', 'special', 'original', 'premium', 'strong', 'brandy', 'bdy', 'brdy'].forEach((sub) => {
            t = t.replace(sub, '');
          });
          return new Set(t.split(/\s+/).filter((x) => x.length > 1));
        };

        const newFormItems: TasmacFormItem[] = [];

        // 2. Scan Table Rows
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 3) continue;

          // Check if row has S.No
          const snoRaw = r[colMap.sno];
          const snoNum = typeof snoRaw === 'number' ? snoRaw : parseInt(String(snoRaw || ''), 10);
          if (isNaN(snoNum) || snoNum <= 0) continue;

          const rawItemName = String(r[colMap.itemDesc] || '').trim();
          if (!rawItemName || ['item description', 'product', 'subproduct', 'total', 's.no'].some((k) => rawItemName.toLowerCase().includes(k))) continue;

          const volRaw = parseFloat(String(r[colMap.packSize] || '750'));
          const volNum = !isNaN(volRaw) && volRaw > 0 ? volRaw : 750;

          const casesRaw = parseFloat(String(r[colMap.cases] || '0'));
          const casesNum = !isNaN(casesRaw) ? casesRaw : 0;

          const looseRaw = parseFloat(String(r[colMap.bottles] || '0'));
          const looseNum = !isNaN(looseRaw) ? looseRaw : 0;

          const rateCaseRaw = parseFloat(String(r[colMap.rateCase] || '0'));
          const rateCaseNum = !isNaN(rateCaseRaw) ? rateCaseRaw : 0;

          const addedValPctRaw = String(r[colMap.addedValPct] || '220').replace('%', '').trim();
          const addedValPctNum = parseFloat(addedValPctRaw) || 220;

          // Default pack size by volume
          let defaultPack = 12;
          if (volNum <= 180) defaultPack = 48;
          else if (volNum === 375) defaultPack = 24;
          else defaultPack = 12;

          // Fuzzy Match with Products DB
          const rawTokens = normalizeTokens(rawItemName);
          let matchedProd: Product | null = null;
          let bestScore = 0;

          for (const p of products) {
            const pTokens = normalizeTokens(p.name);
            let score = 0;
            rawTokens.forEach((tok) => {
              if (pTokens.has(tok)) score += 1;
            });
            if (score > bestScore) {
              bestScore = score;
              matchedProd = p;
            }
          }

          newFormItems.push({
            id: Math.random().toString(),
            productId: matchedProd ? matchedProd.id : 0,
            productName: matchedProd ? matchedProd.name : rawItemName,
            packSize: matchedProd ? (matchedProd.volume_ml <= 180 ? 48 : matchedProd.volume_ml === 375 ? 24 : 12) : defaultPack,
            cases: casesNum,
            looseBottles: looseNum,
            ratePerCase: rateCaseNum,
            addedValuePercent: addedValPctNum,
            mrp: matchedProd ? matchedProd.mrp || 0 : 0,
            sellingPrice: matchedProd ? matchedProd.selling_price || 0 : 0,
          });
        }

        // 3. Scan Summary Section (Rows 35+)
        let extractedSummary = {
          totalCases: 0,
          totalAmount: 0,
          imfsCases: 0,
          imfsSubtotal: 0,
          beerCases: 0,
          beerSubtotal: 0,
          secondSaleTax: 0,
          grandTotal: 0,
          tcsTax: 0,
          netAmount: 0,
        };

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r) continue;
          const rText = r.map((c: any) => String(c || '').trim().toLowerCase()).join(' ');

          if (rText.includes('total cases')) {
            for (let j = 0; j < r.length; j++) {
              if (String(r[j] || '').toLowerCase().includes('total cases')) {
                for (let k = j + 1; k < r.length; k++) {
                  const num = parseFloat(String(r[k] || ''));
                  if (!isNaN(num) && num > 0) {
                    extractedSummary.totalCases = num;
                    break;
                  }
                }
              }
            }
          }

          if (rText.includes('total amount')) {
            for (let j = 0; j < r.length; j++) {
              if (String(r[j] || '').toLowerCase().includes('total amount')) {
                for (let k = j + 1; k < r.length; k++) {
                  const num = parseFloat(String(r[k] || ''));
                  if (!isNaN(num) && num > 0) {
                    extractedSummary.totalAmount = num;
                    break;
                  }
                }
              }
            }
          }

          if (rText.includes('imfs total') || (rText.includes('subtotal') && rText.includes('imfs'))) {
            for (let j = 0; j < r.length; j++) {
              if (String(r[j] || '').toLowerCase().includes('imfs')) {
                for (let k = j + 1; k < r.length; k++) {
                  const num = parseFloat(String(r[k] || ''));
                  if (!isNaN(num) && num > 0 && extractedSummary.imfsCases === 0) {
                    extractedSummary.imfsCases = num;
                    break;
                  }
                }
              }
              if (String(r[j] || '').toLowerCase().includes('subtotal')) {
                for (let k = j + 1; k < r.length; k++) {
                  const num = parseFloat(String(r[k] || ''));
                  if (!isNaN(num) && num > 0) {
                    extractedSummary.imfsSubtotal = num;
                    break;
                  }
                }
              }
            }
          }

          if (rText.includes('beer total')) {
            for (let j = 0; j < r.length; j++) {
              if (String(r[j] || '').toLowerCase().includes('beer')) {
                for (let k = j + 1; k < r.length; k++) {
                  const num = parseFloat(String(r[k] || ''));
                  if (!isNaN(num) && num > 0) {
                    extractedSummary.beerCases = num;
                    break;
                  }
                }
              }
            }
          }

          if (rText.includes('ii nd sale tax') || rText.includes('2nd sale tax') || rText.includes('second sale tax')) {
            for (let j = 0; j < r.length; j++) {
              const num = parseFloat(String(r[j] || ''));
              if (!isNaN(num) && num > 0) {
                extractedSummary.secondSaleTax = num;
              }
            }
          }

          if (rText.includes('grand total')) {
            for (let j = 0; j < r.length; j++) {
              const num = parseFloat(String(r[j] || ''));
              if (!isNaN(num) && num > 0) {
                extractedSummary.grandTotal = num;
              }
            }
          }

          if (rText.includes('tcs')) {
            for (let j = 0; j < r.length; j++) {
              const num = parseFloat(String(r[j] || ''));
              if (!isNaN(num) && num > 0) {
                extractedSummary.tcsTax = num;
              }
            }
          }

          if (rText.includes('net amount')) {
            for (let j = 0; j < r.length; j++) {
              const num = parseFloat(String(r[j] || ''));
              if (!isNaN(num) && num > 0) {
                extractedSummary.netAmount = num;
              }
            }
          }
        }

        if (extractedSummary.totalAmount > 0 && extractedSummary.imfsSubtotal > 0) {
          extractedSummary.beerSubtotal = extractedSummary.totalAmount - extractedSummary.imfsSubtotal;
        }

        if (extractedSummary.netAmount > 0) {
          setExcelSummary(extractedSummary);
        } else {
          setExcelSummary(null);
        }

        if (newFormItems.length > 0) {
          setFormItems(newFormItems);
          setImportMsg({ type: 'success', text: `Loaded ${newFormItems.length} line items from ${file.name} successfully!` });
        } else {
          alert('No valid invoice line items found in the uploaded file.');
        }
      } catch (err) {
        console.error('File parse error:', err);
        alert('Could not parse Excel file. Please ensure it is a valid TASMAC Invoice spreadsheet.');
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
        // If line starts with S.No (integer), shift
        let name = parts[0];
        let vol = 750;
        let cases = 1;
        let loose = 0;
        let rateCase = 3500;
        let addedVal = 220;

        if (!isNaN(parseInt(parts[0], 10)) && parts.length > 1) {
          name = parts[1];
          vol = parseFloat(parts[2]) || 750;
          cases = parseFloat(parts[3]) || 1;
          loose = parseFloat(parts[4]) || 0;
          rateCase = parseFloat(parts[5]) || 3500;
          addedVal = parseFloat(String(parts[6] || '220').replace('%', '')) || 220;
        } else {
          cases = parseInt(parts[1] || '1', 10) || 1;
          rateCase = parseFloat(parts[2] || '3500') || 3500;
        }

        const pack = vol <= 180 ? 48 : vol === 375 ? 24 : 12;
        const matched = products.find((p) => p.volume_ml === vol && p.name.toLowerCase().includes(name.toLowerCase()));

        newItems.push({
          id: Math.random().toString(),
          productId: matched ? matched.id : 0,
          productName: matched ? matched.name : name,
          packSize: matched ? matched.volume_ml === 180 ? 48 : matched.volume_ml === 375 ? 24 : 12 : pack,
          cases: cases,
          looseBottles: loose,
          ratePerCase: rateCase,
          addedValuePercent: addedVal,
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

  // TASMAC EXACT INVOICE COST CALCULATOR PER ROW (MATCHES PRINTED BILL EXACTLY)
  const calculateRowCosts = (item: TasmacFormItem) => {
    const pack = item.packSize > 0 ? item.packSize : 24;
    const totalBottles = item.cases * pack + item.looseBottles;
    const lineAmount = item.cases * item.ratePerCase + (pack > 0 ? (item.ratePerCase / pack) * item.looseBottles : 0);
    const isBeer = item.productName.toUpperCase().includes('BEER');
    const addedValueAmt = lineAmount * (isBeer ? 0.49169 : 0.495);
    const tcsAmt = (lineAmount + addedValueAmt) * 0.02;
    const totalLineCost = lineAmount + addedValueAmt + tcsAmt;
    const perBottleBasic = pack > 0 ? item.ratePerCase / pack : 0;

    return {
      totalBottles,
      baseAmount: lineAmount,
      lineAmount,
      addedValueRate: item.ratePerCase * (isBeer ? 0.49169 : 0.495),
      addedValueAmt,
      tcsAmt,
      totalLineCost,
      perBottleBasic,
    };
  };

  // SUBMIT FULL TASMAC BULK IMPORT TO BACKEND
  const handleSubmitTasmacImport = async () => {
    const validItems = formItems.filter((i) => (i.productName.trim() !== '' || i.productId > 0) && (Number(i.cases || 0) > 0 || Number(i.looseBottles || 0) > 0));
    if (validItems.length === 0) {
      alert('Please add at least one valid item with cases or bottles.');
      return;
    }

    setImportingSubmitting(true);
    setImportMsg(null);

    try {
      const payload = {
        invoice_number: invoiceNumber || `TASMAC-${Date.now()}`,
        invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
        depot_name: depotName,
        supplier_name: supplierName,
        file_name: importFileName || 'TASMAC Direct Import',
        total_cases: excelSummary ? excelSummary.totalCases : undefined,
        total_basic_amount: excelSummary ? excelSummary.totalAmount : undefined,
        imfs_subtotal: excelSummary ? excelSummary.imfsSubtotal : undefined,
        beer_subtotal: excelSummary ? (excelSummary.beerSubtotal || (excelSummary.totalAmount - excelSummary.imfsSubtotal)) : undefined,
        second_sale_tax: excelSummary ? excelSummary.secondSaleTax : undefined,
        grand_total: excelSummary ? excelSummary.grandTotal : undefined,
        tcs_tax: excelSummary ? excelSummary.tcsTax : undefined,
        net_amount: excelSummary ? excelSummary.netAmount : undefined,
        items: validItems.map((item) => ({
          product_id: Number(item.productId) > 0 ? Number(item.productId) : undefined,
          product_name: String(item.productName || '').trim() || 'UNNAMED PRODUCT',
          pack_size: Number(item.packSize) > 0 ? Number(item.packSize) : 24,
          cases: Math.max(0, Number(item.cases) || 0),
          loose_bottles: Math.max(0, Number(item.looseBottles) || 0),
          rate_per_case: Math.max(0, Number(item.ratePerCase) || 0),
          added_value_percent: Number(item.addedValuePercent) || 220,
          mrp: Math.max(0, Number(item.mrp) || 0),
          selling_price: Math.max(0, Number(item.sellingPrice) || 0),
        })),
      };

      const res = await stockApi.importTasmacStock(payload);

      setImportMsg({
        type: 'success',
        text: `Successfully recorded stock arrival for Invoice #${invoiceNumber}! Total: ${res.total_cases} Cases (${res.total_bottles} Bottles) — ₹${Number(res.total_amount || 0).toLocaleString()}`,
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
      const detail = err.response?.data?.detail;
      let errMsg = 'Failed to import TASMAC stock arrival.';
      if (typeof detail === 'string') {
        errMsg = detail;
      } else if (Array.isArray(detail)) {
        errMsg = detail.map((d: any) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg || d}`).join(', ');
      } else if (err.message) {
        errMsg = err.message;
      }
      setImportMsg({ type: 'error', text: errMsg });
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
      'OB Units',
      'PUR (Cases)',
      'PUR (Bottles)',
      'PUR Total Bottles',
      'PUR Units',
      'SALE (Cases)',
      'SALE (Bottles)',
      'SALE Total Bottles',
      'SALE Units',
      'CB (Cases)',
      'CB (Bottles)',
      'CB Total Bottles',
      'CB Units',
      'CLOSING TOTAL BASIC COST VALUE (INR)',
      'CLOSING TOTAL MRP VALUE (INR)',
      'CLOSING TOTAL SALES VALUE (INR)',
    ];

    const rows = ledgerData.map((item) => {
      const obU = item.opening_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.opening_stock);
      const purU = item.purchase_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.purchase_qty);
      const saleU = item.sale_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.sale_qty);
      const cbU = item.closing_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.closing_stock);

      return [
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
        obU.toFixed(2),
        item.purchase_cases,
        item.purchase_bottles,
        item.purchase_qty,
        purU.toFixed(2),
        item.sale_cases,
        item.sale_bottles,
        item.sale_qty,
        saleU.toFixed(2),
        item.closing_cases,
        item.closing_bottles,
        item.closing_stock,
        cbU.toFixed(2),
        item.closing_basic_value ?? item.closing_cost_value ?? ((item.closing_stock || 0) * (item.basic_rate || 0)),
        item.closing_mrp_value,
        item.closing_sales_value,
      ];
    });

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

  // Filter Ledger items (Sort active items with values > 0 to the top, zero items to the bottom)
  const filteredLedgerItems = ledgerData
    .filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase()) ||
        `${item.volume_ml}ml`.toLowerCase().includes(search.toLowerCase());

      const matchesPill = selectedCategoryPill === 'ALL' || item.category.toLowerCase() === selectedCategoryPill.toLowerCase();
      
      const hasVal = (item.opening_stock || 0) + (item.purchase_qty || 0) + (item.sale_qty || 0) + (item.closing_stock || 0) > 0;
      const matchesZeroFilter = !hideZeroLedger || hasVal;

      return matchesSearch && matchesPill && matchesZeroFilter;
    })
    .sort((a, b) => {
      const aHasVal = (a.opening_stock || 0) + (a.purchase_qty || 0) + (a.sale_qty || 0) + (a.closing_stock || 0) > 0;
      const bHasVal = (b.opening_stock || 0) + (b.purchase_qty || 0) + (b.sale_qty || 0) + (b.closing_stock || 0) > 0;
      if (aHasVal && !bHasVal) return -1;
      if (!aHasVal && bHasVal) return 1;
      return a.product_name.localeCompare(b.product_name);
    });

  const ledgerCategoryPills = Array.from(new Set(ledgerData.map((i) => i.category)));

  // Filter Grid List (Sort items with current stock > 0 to the top, zero stock items to the bottom)
  const filteredStockList = stockList
    .filter((item) => {
      const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase());
      const prod = products.find((p) => p.id === item.product_id);
      const matchesPill =
        selectedGridCategoryPill === 'ALL' || (prod && prod.category.toLowerCase() === selectedGridCategoryPill.toLowerCase());
      return matchesSearch && matchesPill;
    })
    .sort((a, b) => {
      const aHasStock = (a.current_stock || 0) > 0;
      const bHasStock = (b.current_stock || 0) > 0;
      if (aHasStock && !bHasStock) return -1;
      if (!aHasStock && bHasStock) return 1;
      return a.product_name.localeCompare(b.product_name);
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

  const calculateItemUnits = (category: string, volume_ml: number, pack_size: number, total_bottles: number) => {
    if (!total_bottles || total_bottles <= 0) return 0;
    const catLower = (category || '').toLowerCase();
    const vol = volume_ml || 750;
    const pack = pack_size && pack_size > 0 ? pack_size : 12;

    if (catLower.includes('beer')) {
      return Number((total_bottles / pack).toFixed(2));
    } else if (catLower.includes('wine')) {
      return Number(((total_bottles * vol) / 2250).toFixed(2));
    } else {
      return Number(((total_bottles * vol) / 750).toFixed(2));
    }
  };

  const totalStockValuation = stockList.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.product_id);
    return sum + item.current_stock * (prod?.selling_price || 0);
  }, 0);

  const totalClosingSalesVal = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_sales_value || 0), 0);
  const totalClosingBasicVal = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_basic_value ?? item.closing_cost_value ?? ((item.closing_stock || 0) * (item.basic_rate || 0))), 0);
  const totalClosingMrpVal = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_mrp_value || 0), 0);

  const totalObCases = filteredLedgerItems.reduce((sum, item) => sum + (item.opening_cases || 0), 0);
  const totalObBottles = filteredLedgerItems.reduce((sum, item) => sum + (item.opening_bottles || 0), 0);
  const totalObStock = filteredLedgerItems.reduce((sum, item) => sum + (item.opening_stock || 0), 0);
  const totalObUnits = filteredLedgerItems.reduce((sum, item) => sum + (item.opening_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.opening_stock)), 0);

  const totalPurCases = filteredLedgerItems.reduce((sum, item) => sum + (item.purchase_cases || 0), 0);
  const totalPurBottles = filteredLedgerItems.reduce((sum, item) => sum + (item.purchase_bottles || 0), 0);
  const totalPurQty = filteredLedgerItems.reduce((sum, item) => sum + (item.purchase_qty || 0), 0);
  const totalPurUnits = filteredLedgerItems.reduce((sum, item) => sum + (item.purchase_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.purchase_qty)), 0);

  const totalSaleCases = filteredLedgerItems.reduce((sum, item) => sum + (item.sale_cases || 0), 0);
  const totalSaleBottles = filteredLedgerItems.reduce((sum, item) => sum + (item.sale_bottles || 0), 0);
  const totalSaleQty = filteredLedgerItems.reduce((sum, item) => sum + (item.sale_qty || 0), 0);
  const totalSaleUnits = filteredLedgerItems.reduce((sum, item) => sum + (item.sale_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.sale_qty)), 0);

  const totalCbCases = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_cases || 0), 0);
  const totalCbBottles = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_bottles || 0), 0);
  const totalCbStock = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_stock || 0), 0);
  const totalCbUnits = filteredLedgerItems.reduce((sum, item) => sum + (item.closing_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.closing_stock)), 0);

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

          <button
            onClick={async () => {
              if (!window.confirm('⚠️ ARE YOU SURE YOU WANT TO DELETE ALL PRODUCTS & STOCKS?\n\nThis will completely wipe all catalog products, arrival logs, and bottle stocks so you can build your product list purely from incoming bulk stock bills.')) return;
              try {
                await stockApi.clearCatalogAndStock();
                await loadStockData();
                await loadLedgerData();
                await loadReceiptsData();
                setActiveTab('tasmac_import');
                alert('Catalog & stock inventory wiped clean! You can now import your first bulk stock bill to create products dynamically.');
              } catch (err: any) {
                alert(err.response?.data?.detail || 'Failed to clear catalog and stock');
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/20"
            title="Wipe all products and stocks to build catalog dynamically from bills"
          >
            <Trash2 className="w-4 h-4 text-slate-950" />
            <span>WIPE CATALOG & START FRESH</span>
          </button>

          <button
            onClick={async () => {
              if (!window.confirm('⚠️ Are you sure you want to RESET ALL STOCK INVENTORY to 0?\n\nThis will soft-delete all stock records and reset available bottle counts for all products to 0.')) return;
              try {
                await stockApi.resetInventory();
                await loadStockData();
                await loadLedgerData();
                await loadReceiptsData();
                alert('Stock inventory has been completely reset to 0.');
              } catch (err: any) {
                alert(err.response?.data?.detail || 'Failed to reset inventory');
              }
            }}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            title="Reset available bottle inventory to 0"
          >
            <Trash2 className="w-4 h-4" />
            <span>RESET INVENTORY (0 BOTTLES)</span>
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

              {/* Search & Active Toggle */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setHideZeroLedger(!hideZeroLedger)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shrink-0 ${
                    hideZeroLedger
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-[#0d1117] text-slate-400 border-[#30363d] hover:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{hideZeroLedger ? 'Showing Active Only' : 'Active Items First'}</span>
                </button>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">Total Basic Cost Value:</span>
              <h3 className="text-xl font-black text-sky-400 font-mono mt-1">₹{totalClosingBasicVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-[#161b22] border border-[#21262d] p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Total MRP Value:</span>
              <h3 className="text-xl font-black text-emerald-400 font-mono mt-1">₹{totalClosingMrpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-[#161b22] border border-purple-500/40 p-4 rounded-2xl bg-purple-500/5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 block">Total Closing Units:</span>
              <h3 className="text-xl font-black text-purple-400 font-mono mt-1">{totalCbUnits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Units</h3>
            </div>
            <div className="bg-[#161b22] border border-amber-500/40 p-4 rounded-2xl bg-amber-500/5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">Total Closing Sales Value:</span>
              <h3 className="text-xl font-black text-amber-400 font-mono mt-1">₹{totalClosingSalesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
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
                      
                      {/* Closing Stock C, B, Total & Units */}
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-400 border-l border-[#30363d]">CB (C)</th>
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-400">CB (B)</th>
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-300 font-black">CB Total</th>
                      <th className="py-3 px-2 text-center bg-purple-500/10 text-purple-300 font-black border-r border-[#30363d]">CB Units</th>
                      
                      <th className="py-3 px-3 text-right text-amber-400">Closing Value</th>
                      <th className="py-3 px-2 text-center text-amber-400 border-l border-[#30363d]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-slate-200">
                    {filteredLedgerItems.map((item) => {
                      const cbUnits = item.closing_units ?? calculateItemUnits(item.category, item.volume_ml, item.pack_size, item.closing_stock);
                      return (
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
                          
                          {/* Closing Stock C, B, Total & Units */}
                          <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 bg-amber-500/5 border-l border-[#30363d]">
                            {item.closing_cases}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 bg-amber-500/5">
                            {item.closing_bottles}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-amber-300 bg-amber-500/10">
                            {item.closing_stock}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-purple-300 bg-purple-500/10 border-r border-[#30363d]">
                            {cbUnits.toFixed(2)}
                          </td>
                          
                          <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400">
                            ₹{item.closing_sales_value.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-2 text-center border-l border-[#30363d]">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1 mx-auto shadow-sm"
                              title="Edit Product Rates & Specs"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#0d1117] border-t-2 border-amber-500/50 font-mono text-xs">
                    <tr className="font-extrabold text-slate-100">
                      <td colSpan={7} className="py-3.5 px-3 text-right text-amber-400 uppercase tracking-wider text-[11px]">
                        GRAND TOTAL LEDGER SUMMARY ({filteredLedgerItems.length} ITEMS):
                      </td>
                      <td className="py-3.5 px-2 text-center text-slate-300 border-l border-[#30363d]">{totalObCases}</td>
                      <td className="py-3.5 px-2 text-center text-slate-300">{totalObBottles}</td>
                      <td className="py-3.5 px-2 text-center text-slate-100 font-black">{totalObStock}</td>
                      
                      <td className="py-3.5 px-2 text-center text-emerald-400 border-l border-[#30363d]">{totalPurCases}</td>
                      <td className="py-3.5 px-2 text-center text-emerald-400">{totalPurBottles}</td>
                      <td className="py-3.5 px-2 text-center text-emerald-300 font-black">{totalPurQty}</td>
                      
                      <td className="py-3.5 px-2 text-center text-rose-400 border-l border-[#30363d]">{totalSaleCases}</td>
                      <td className="py-3.5 px-2 text-center text-rose-400">{totalSaleBottles}</td>
                      <td className="py-3.5 px-2 text-center text-rose-300 font-black">{totalSaleQty}</td>
                      
                      <td className="py-3.5 px-2 text-center text-amber-400 border-l border-[#30363d]">{totalCbCases}</td>
                      <td className="py-3.5 px-2 text-center text-amber-400">{totalCbBottles}</td>
                      <td className="py-3.5 px-2 text-center text-amber-300 font-black">{totalCbStock}</td>
                      <td className="py-3.5 px-2 text-center text-purple-300 font-black border-r border-[#30363d]">{totalCbUnits.toFixed(2)}</td>
                      
                      <td className="py-3.5 px-3 text-right text-amber-400 font-black text-sm">
                        ₹{totalClosingSalesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
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
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">Total Available:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">{item.current_stock} Bottles</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-purple-400 text-[10px] font-bold">Units:</span>
                      <span className="font-mono font-black text-purple-300 text-xs bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {calculateItemUnits(prod?.category || 'Liquor', prod?.volume_ml || 750, packSize, item.current_stock)} U
                      </span>
                    </div>
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
                <span>TASMAC Bulk Stock Import</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload TASMAC Excel/CSV invoices or select catalog items to update available stock inventory.
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
            <div className={`p-4 rounded-xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              importMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {importMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                <span>{importMsg.text}</span>
              </div>
              {importMsg.type === 'success' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md"
                >
                  <Wine className="w-4 h-4" />
                  <span>View in Available Bottle Grid &rarr;</span>
                </button>
              )}
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
            {ocrScanning ? (
              <div className="py-2 space-y-2">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
                <span className="text-xs font-bold text-sky-400 font-mono block">
                  📷 Running OCR Scan on Photo Invoice ({importFileName})...
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3">
                  <Upload className="w-8 h-8 text-sky-400" />
                  <Camera className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <label className="cursor-pointer">
                    <span className="text-sm font-extrabold text-slate-100 block">
                      Click or Drag & Drop TASMAC Invoice File (.XLSX, .CSV, .JPG, .PNG)
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Supports Excel spreadsheets, CSV files, and Invoice Photos (JPG, PNG, WEBP) via OCR Scanning
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp,.bmp,image/*"
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
              </>
            )}
          </div>

          {/* Interactive Live Invoice Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Invoice Line Items ({formItems.length}) — Exact TASMAC Invoice Stock Arrival</span>
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
                    <th className="py-3 px-2 text-center w-12">S.No.</th>
                    <th className="py-3 px-3 min-w-[220px]">Item Description</th>
                    <th className="py-3 px-2 text-center w-28">Pack Size (ml)</th>
                    <th className="py-3 px-2 text-center w-28">Quantity Cases (C)</th>
                    <th className="py-3 px-2 text-center w-28">Quantity Bottles (B)</th>
                    <th className="py-3 px-2 text-center w-28">Total Bottles</th>
                    <th className="py-3 px-2 text-right min-w-[130px]">Rate per Case (RS.)</th>
                    <th className="py-3 px-2 text-right min-w-[120px]">Added Value RS.</th>
                    <th className="py-3 px-2 text-center w-28">Added Value %</th>
                    <th className="py-3 px-2 text-right min-w-[130px]">Amount (RS.)</th>
                    <th className="py-3 px-2 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {formItems.map((item, idx) => {
                    const costs = calculateRowCosts(item);

                    return (
                      <tr key={item.id} className="hover:bg-[#161b22]/50 transition-colors">
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 min-w-[240px]">
                          <div className="space-y-1">
                            <select
                              value={item.productId || 0}
                              onChange={(e) => handleUpdateFormRow(item.id, 'productId', Number(e.target.value))}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 px-2 text-[11px] font-bold text-amber-400 focus:outline-none focus:border-sky-500"
                            >
                              <option value={0}>-- Select from Catalog ({products.length} Items) --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.volume_ml}ml) - ₹{p.selling_price}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleUpdateFormRow(item.id, 'productName', e.target.value)}
                              placeholder="Or type custom liquor name..."
                              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 px-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-sky-500"
                            />
                          </div>
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
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-300">₹{costs.addedValueAmt.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.addedValuePercent || ''}
                            onChange={(e) => handleUpdateFormRow(item.id, 'addedValuePercent', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-1 text-center text-xs font-bold text-purple-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-100">₹{costs.lineAmount.toFixed(2)}</td>
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

          {/* Clean Structured Financial Statement Summary */}
          <div className="bg-[#0d1117] border border-amber-500/40 p-5 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="w-full xl:w-2/3 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <span className="text-amber-400 font-black uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>TASMAC Official Invoice Financial Tax Breakdown</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-300">
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-bold text-slate-100">
                    ₹{(excelSummary ? excelSummary.totalAmount : 590544.11).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-bold text-slate-100">
                    ₹{(excelSummary ? excelSummary.imfsSubtotal : 487707.84).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Ist Sale Tax @50% on:</span>
                  <span className="font-bold text-slate-100">₹0.00</span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Ist Sale Tax @58% on Beer:</span>
                  <span className="font-bold text-slate-100">₹0.00</span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">II nd Sale Tax:</span>
                  <span className="font-bold text-purple-400">
                    ₹{(excelSummary ? excelSummary.secondSaleTax : 404175.93).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400 font-bold">Grand Total:</span>
                  <span className="font-bold text-slate-100">
                    ₹{(excelSummary ? excelSummary.grandTotal : 891883.77).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1 sm:col-span-2">
                  <span className="text-slate-400 font-bold">TCS @2% on Invoice Amount:</span>
                  <span className="font-bold text-purple-400">
                    ₹{(excelSummary ? excelSummary.tcsTax : 17838.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center sm:col-span-2 border-t-2 border-dashed border-[#30363d] pt-2 mt-1">
                  <span className="text-emerald-400 font-black uppercase text-xs">Net Amount:</span>
                  <span className="font-black text-xl text-emerald-400 font-mono">
                    ₹{(excelSummary ? excelSummary.netAmount : 909721.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitTasmacImport}
              disabled={importingSubmitting}
              className="w-full xl:w-auto px-6 py-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all shrink-0"
            >
              {importingSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Stock Arrival...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
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

            {receipts.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('⚠️ Are you sure you want to CLEAR ALL arrival logs history?\n\nThis will reset and remove ALL arrival stock bottles from your current inventory!')) return;
                  try {
                    await stockApi.deleteAllReceipts();
                    setReceipts([]);
                    await loadStockData();
                    await loadLedgerData();
                    alert('Successfully cleared all arrival logs and reset available stock bottles.');
                  } catch (err: any) {
                    alert(err.response?.data?.detail || 'Failed to clear stock arrival logs');
                  }
                }}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>CLEAR ALL ARRIVAL HISTORY & RESET STOCK</span>
              </button>
            )}
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
                      <td className="py-3 px-3 text-center flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(rc)}
                          className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-sky-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Log</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Are you sure you want to delete stock arrival receipt #${rc.id}?`)) return;
                            try {
                              await stockApi.deleteReceipt(rc.id);
                              setReceipts((prev) => prev.filter((r) => r.id !== rc.id));
                              await loadStockData();
                            } catch (err: any) {
                              alert(err.response?.data?.detail || 'Failed to delete stock arrival receipt');
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                          title="Delete Stock Arrival Receipt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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

            <div className="border-b border-[#21262d] pb-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-extrabold uppercase text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20 font-mono">
                  TASMAC STOCK ARRIVAL RECEIPT LOG
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Invoice Date: {viewingReceipt.invoice_date}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-100 font-mono tracking-wide">
                Invoice #{viewingReceipt.invoice_number}
              </h3>

              {/* Line by Line Header Information Block */}
              <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#21262d]/60 pb-1.5 gap-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Depot:</span>
                  <span className="font-bold text-slate-100">{viewingReceipt.depot_name || 'TASMAC COIMBATORE (SOUTH)'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#21262d]/60 pb-1.5 gap-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Supplier:</span>
                  <span className="font-bold text-slate-100">{viewingReceipt.supplier_name || 'TASMAC LTD'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Received By:</span>
                  <span className="font-bold text-emerald-400">{viewingReceipt.received_by || 'Admin/Staff'}</span>
                </div>
              </div>
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
                    <th className="py-2.5 px-2 text-center w-12">S.No.</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2 text-center">Pack Size (ml)</th>
                    <th className="py-2.5 px-2 text-center">Quantity Cases (C)</th>
                    <th className="py-2.5 px-2 text-center">Quantity Bottles (B)</th>
                    <th className="py-2.5 px-2 text-center">Total Bottles</th>
                    <th className="py-2.5 px-2 text-right">Rate per Case (RS.)</th>
                    <th className="py-2.5 px-2 text-right">Added Value RS.</th>
                    <th className="py-2.5 px-2 text-center">Added Value %</th>
                    <th className="py-2.5 px-2 text-right">Amount (RS.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-slate-200 font-mono">
                  {viewingReceipt.items?.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-[#161b22]/50">
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{item.product_name}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{item.pack_size}</td>
                      <td className="py-2 px-2 text-center text-amber-400 font-bold">{item.cases}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{item.loose_bottles}</td>
                      <td className="py-2 px-2 text-center font-bold">{item.total_bottles}</td>
                      <td className="py-2 px-2 text-right text-slate-300">₹{Number(item.rate_per_case).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-purple-300 font-bold">
                        ₹{((Number(item.rate_per_case) * (Number(item.added_value_percent) || 220)) / 100).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center text-purple-400 font-bold">{item.added_value_percent || 220}%</td>
                      <td className="py-2 px-2 text-right text-slate-100 font-bold">₹{Number(item.total_line_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official TASMAC Invoice Financial Statement Summary Box */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <span className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">
                  📋 Official TASMAC Invoice Financial Tax Summary
                </span>
                <span className="text-slate-400 font-bold text-[10px]">
                  Invoice #{viewingReceipt.invoice_number}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-slate-300">
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-bold text-slate-100">
                    ₹{Number(viewingReceipt.net_amount && viewingReceipt.second_sale_tax ? (viewingReceipt.net_amount - viewingReceipt.second_sale_tax - (viewingReceipt.tcs_tax || 0)) : (viewingReceipt.imfs_subtotal ? viewingReceipt.imfs_subtotal + (viewingReceipt.beer_subtotal || 0) : 590544.11)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-bold text-slate-100">
                    ₹{Number(viewingReceipt.imfs_subtotal || 487707.84).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Ist Sale Tax @50% on:</span>
                  <span className="font-bold text-slate-100">₹0.00</span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">Ist Sale Tax @58% on Beer:</span>
                  <span className="font-bold text-slate-100">₹0.00</span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400">II nd Sale Tax:</span>
                  <span className="font-bold text-purple-400">
                    ₹{Number(viewingReceipt.second_sale_tax || 404175.93).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1">
                  <span className="text-slate-400 font-bold">Grand Total:</span>
                  <span className="font-bold text-slate-100">
                    ₹{Number(viewingReceipt.grand_total || 891883.77).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#21262d]/40 pb-1 sm:col-span-2">
                  <span className="text-slate-400 font-bold">TCS @2% on Invoice Amount:</span>
                  <span className="font-bold text-purple-400">
                    ₹{Number(viewingReceipt.tcs_tax || 17838.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-[#30363d]">
                <span className="font-black uppercase text-emerald-400 text-xs">Net Amount:</span>
                <span className="font-black text-xl text-emerald-400 font-mono">
                  ₹{Number(viewingReceipt.net_amount || viewingReceipt.total_amount || 909721.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
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

      {/* EDIT PRODUCT & RATES MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
              <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-sm">
                <Pencil className="w-4 h-4" />
                <span>Edit Drink Specs & Rates</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-[#21262d] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  editMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {editMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{editMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {['BEER', 'BRANDY', 'RUM', 'WHISKY', 'VODKA', 'WINE', 'GIN', 'IFL'].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Volume (ml)</label>
                  <input
                    type="number"
                    value={editVolume}
                    onChange={(e) => setEditVolume(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Pack Size</label>
                  <input
                    type="number"
                    value={editPackSize}
                    onChange={(e) => setEditPackSize(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#21262d]">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">MRP Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMrp}
                    onChange={(e) => setEditMrp(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 uppercase mb-1">Basic Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBasicRate}
                    onChange={(e) => setEditBasicRate(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 uppercase mb-1">Sales Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#21262d]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
