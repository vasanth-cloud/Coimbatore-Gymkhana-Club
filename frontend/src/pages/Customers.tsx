import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { customerApi } from '../api/services';
import { Customer } from '../types';
import { MembershipCard } from '../components/MembershipCard';
import {
  UserPlus,
  Search,
  Check,
  Loader2,
  UserCheck,
  CreditCard,
  Trash2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Download,
  MapPin,
  X,
  Edit2,
} from 'lucide-react';

export const Customers: React.FC = () => {
  const [customerCode, setCustomerCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');

  const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([]);
  const [activeQRModal, setActiveQRModal] = useState<Customer | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [listLoading, setListLoading] = useState<boolean>(true);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Form & Bulk Import States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const loadCustomers = async () => {
    try {
      setListLoading(true);
      const data = await customerApi.getCustomers();
      setCreatedCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Fetch authenticated QR code image blob when modal opens
  useEffect(() => {
    if (!activeQRModal) {
      setQrImageUrl(null);
      return;
    }
    let isMounted = true;
    setQrLoading(true);

    customerApi
      .getQRBlob(activeQRModal.id)
      .then((blob) => {
        if (isMounted) {
          const url = window.URL.createObjectURL(blob);
          setQrImageUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to load authenticated QR image blob:', err);
      })
      .finally(() => {
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeQRModal]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const payload: any = { full_name: fullName, phone };
      if (customerCode.trim()) payload.customer_code = customerCode.trim();
      if (address.trim()) payload.address = address.trim();

      const newCust = await customerApi.createCustomer(payload);
      setCreatedCustomers((prev) => [newCust, ...prev]);
      setSuccessMsg(`Saved #${newCust.customer_code} (${newCust.full_name}) to database!`);
      setCustomerCode('');
      setFullName('');
      setPhone('');
      setAddress('');
      setActiveQRModal(newCust);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Customer Modal
  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCode(customer.customer_code);
    setEditName(customer.full_name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address || '');
    setEditError('');
  };

  // Submit Edit Customer
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditSubmitting(true);
    setEditError('');

    try {
      const updated = await customerApi.updateCustomer(editingCustomer.id, {
        customer_code: editCode.trim(),
        full_name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });

      setCreatedCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSuccessMsg(`Updated member #${updated.customer_code} (${updated.full_name})!`);
      setEditingCustomer(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.response?.data?.detail || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  // XLSX & CSV Sheet File Parser & Batch Importer (Strictly uses CARD column for Member ID; ignores ID NO!)
  const handleSheetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkResult(null);
    setBulkSubmitting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawRows.length < 2) {
          alert('Sheet file is empty or missing data rows');
          setBulkSubmitting(false);
          return;
        }

        const headers = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());

        // STRICT EXCEL COLUMN RESOLUTION (Ignores S NO column A e.g. 32; Uses CARD column B e.g. 100):
        let cardIdx = headers.findIndex(
          (h: string) => h === 'card' || h === 'card no' || h === 'card_no' || h === 'card number' || h.includes('card')
        );

        if (cardIdx === -1) {
          const col0IsSerial = headers[0] && (headers[0].includes('s no') || headers[0].includes('s.no') || headers[0].includes('serial') || headers[0] === 's no');
          cardIdx = col0IsSerial ? 1 : 1;
        }

        let nameIdx = headers.findIndex((h: string) => h.includes('name'));
        if (nameIdx === -1) nameIdx = 2;

        let phoneIdx = headers.findIndex(
          (h: string) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('ph')
        );
        if (phoneIdx === -1) phoneIdx = 4;

        // ONLY map explicit address fields (address, location, addr). IGNORE ID NO / Aadhaar / Gov ID!
        let addressIdx = headers.findIndex(
          (h: string) => h.includes('address') || h.includes('location') || h.includes('addr')
        );

        const parsedItems: any[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const codeVal = cardIdx !== -1 && row[cardIdx] !== undefined ? String(row[cardIdx] || '').trim() : String(row[1] || '').trim();
          const nameVal = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx] || '').trim() : String(row[2] || '').trim();
          const phoneVal = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx] || '').trim() : String(row[4] || '').trim();
          
          const rawAddr = addressIdx !== -1 && row[addressIdx] !== undefined ? String(row[addressIdx] || '').trim() : '';
          // Ensure pure digit ID numbers (like 981330057970) are NEVER treated as address
          const isPureDigits = /^\d+$/.test(rawAddr);
          const addrVal = (rawAddr.length > 0 && !isPureDigits) ? rawAddr : null;

          if (nameVal && phoneVal) {
            parsedItems.push({
              customer_code: codeVal || null,
              full_name: nameVal,
              phone: phoneVal,
              address: addrVal,
            });
          }
        }

        if (parsedItems.length === 0) {
          alert('Could not find valid rows with Name and Phone in the Excel/CSV sheet file.');
          setBulkSubmitting(false);
          return;
        }

        const res = await customerApi.bulkImportCustomers(parsedItems);
        setBulkResult(res);
        await loadCustomers();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to process Excel/CSV sheet');
      } finally {
        setBulkSubmitting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download Sample Excel CSV Template
  const downloadSampleTemplate = () => {
    const sampleCsv = `CARD,NAME,PHONE,ADDRESS
1,MADANKUMAR V,9080962162,3 MGR Nagar Ondipudur Coimbatore
55,BALAJI,8248196031,12 Race Course Road Coimbatore
57,SANTHOSH KUMAR,6380668172,45 Avinashi Road Coimbatore`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_member_card_excel_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteCustomer = async (customerId: number, name: string, code: string) => {
    if (!window.confirm(`Delete member "${name}" (#${code})? Slot #${code} will become available for new members.`)) {
      return;
    }

    try {
      await customerApi.deleteCustomer(customerId);
      setCreatedCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setSuccessMsg(`Member ${name} (#${code}) deleted.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete customer');
    }
  };

  const handleDeleteAllCustomers = async () => {
    if (!window.confirm('⚠️ WARNING: Delete ALL customers from database? This cannot be undone.')) {
      return;
    }
    if (!window.confirm('CONFIRM AGAIN: Reset Member ID / Card No sequence to #1?')) {
      return;
    }

    try {
      await customerApi.deleteAllCustomers();
      setCreatedCustomers([]);
      setSuccessMsg('All members deleted. Sequence reset to #1.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete all customers');
    }
  };

  const filteredCustomers = createdCustomers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.customer_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-4 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <span>Customer Database & Member Cards</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Member IDs generated from Card No (1, 55, 57...) • Edit member details & address anytime
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel Sheet (.xlsx)</span>
          </button>

          {createdCustomers.length > 0 && (
            <button
              onClick={handleDeleteAllCustomers}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Delete all customers & reset sequence"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Wipe DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        
        {/* Left Column: Registration Form (4 cols) */}
        <div className="xl:col-span-4 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg h-fit">
          <div className="flex items-center gap-2.5 mb-4 border-b border-[#21262d] pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Add Customer to DB</h3>
              <p className="text-[11px] text-slate-400">QR generated on demand</p>
            </div>
          </div>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Member ID / Card No. (Optional)
              </label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="Card No (e.g. 1, 55, 57...) or leave blank"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-amber-400 placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Maps to CARD column in Excel
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. MADANKUMAR V, BALAJI"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                minLength={10}
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9080962162, 8248196031"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Address (Optional - Saved in DB)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 3 MGR Nagar Coimbatore"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Can be updated later using Edit button
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>SAVE TO DB</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Member Records Table (8 cols) */}
        <div className="xl:col-span-8 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 flex flex-col shadow-lg min-w-0">
          
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#21262d]">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Member Records ({createdCustomers.length})
              </h3>
              <p className="text-[11px] text-slate-400">Search by Member ID / Card No or Name to print card</p>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Card #, Name, Phone..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Table Content */}
          {listLoading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading customer database...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex-1 min-h-56 flex flex-col items-center justify-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl p-6 text-center">
              <CreditCard className="w-10 h-10 stroke-1 mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">No member records found</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Import an Excel (.xlsx) sheet or add a member using the form. Click <b>"Pass Card"</b> to print QR card.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-2.5 px-3">Member ID / Card #</th>
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/70 text-slate-200">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-black text-amber-400 text-sm">
                        #{c.customer_code}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-100">{c.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{c.phone}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[140px] truncate">
                        {c.address ? (
                          <span className="flex items-center gap-1 truncate text-slate-300" title={c.address}>
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">No address</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setActiveQRModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black shadow-sm transition-all flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pass Card</span>
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 transition-colors"
                            title="Edit Member Details / Address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.full_name, c.customer_code)}
                            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MEMBER DETAILS MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <button
              onClick={() => setEditingCustomer(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <span>Edit Member Details</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Update Card #, Name, Phone, or Address for member #{editingCustomer.customer_code}
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Member ID / Card No.
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Enter member address..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>SAVE CHANGES</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Excel (.xlsx / .csv) Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-3">
            <button
              onClick={() => {
                setShowBulkModal(false);
                setBulkResult(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Import Customer Excel Sheet (.XLSX / .CSV)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload customer Excel sheet. 'CARD' column maps to Member ID!
              </p>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase text-[11px]">Excel Headers:</span>
                <button
                  onClick={downloadSampleTemplate}
                  className="text-amber-400 font-extrabold hover:underline flex items-center gap-1 text-[10px]"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample Template</span>
                </button>
              </div>
              <p className="text-slate-400 font-mono text-[10px]">
                CARD, NAME, PHONE, ADDRESS (Optional)
              </p>
            </div>

            {bulkResult && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs space-y-1">
                <p className="font-extrabold text-emerald-300 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Import Completed!</span>
                </p>
                <p className="text-slate-200 text-[11px]">
                  ✅ <b>{bulkResult.created_count}</b> records stored in DB!
                </p>
                {bulkResult.skipped_count > 0 && (
                  <p className="text-amber-400 text-[10px]">
                    ⚠️ {bulkResult.skipped_count} skipped (duplicates or missing phone/name).
                  </p>
                )}
              </div>
            )}

            <div className="border-2 border-dashed border-[#30363d] hover:border-amber-500/50 rounded-xl p-5 text-center transition-all">
              <Upload className="w-8 h-8 text-amber-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-200 mb-0.5">Select Excel (.xlsx / .csv) sheet file</p>
              <p className="text-[10px] text-slate-500 mb-3">Maps CARD column to Member ID</p>

              <label className="cursor-pointer px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-amber-500/10">
                {bulkSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Sheet...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CHOOSE EXCEL FILE</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  disabled={bulkSubmitting}
                  onChange={handleSheetFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Printable Membership Card Modal */}
      {activeQRModal && (
        <MembershipCard
          customer={activeQRModal}
          qrImageUrl={qrImageUrl}
          onClose={() => setActiveQRModal(null)}
        />
      )}
    </div>
  );
};
