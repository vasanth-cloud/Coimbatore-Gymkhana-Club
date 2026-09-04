import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from 'html5-qrcode';
import { entryApi } from '../api/services';
import { Entry, DetailedEntry } from '../types';
import {
  QrCode,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Camera,
  Keyboard,
  Loader2,
  Sparkles,
  Download,
  Search,
  Clock,
  X,
  Usb,
  ShieldCheck,
  Upload,
} from 'lucide-react';

export const EntryScanner: React.FC = () => {
  const [manualToken, setManualToken] = useState('');
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [scannerActive, setScannerActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastEntry, setLastEntry] = useState<Entry | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'hardware' | 'camera'>('hardware');

  // Modal State for Guest Count Prompt
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Recent Entry Logs States
  const [recentEntries, setRecentEntries] = useState<DetailedEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchLog, setSearchLog] = useState('');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchRecentEntries = async () => {
    try {
      setLogsLoading(true);
      const data = await entryApi.getRecentEntries(100);
      setRecentEntries(data);
    } catch (err) {
      console.error('Failed to fetch recent entries:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentEntries();
  }, []);

  // Auto-focus input field for hardware USB / Bluetooth scanners
  useEffect(() => {
    if (activeTab === 'hardware' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab, showGuestModal]);

  // Step 1: Triggered on QR scan / manual submit -> Opens Accompanying Guests Modal
  const handleInitiateScan = (token: string) => {
    if (!token) return;
    setError('');
    setPendingToken(token.trim());
    setAdditionalGuests(0);
    setShowGuestModal(true);
  };

  // Step 2: Confirms Guest Count & Submits Entry to Backend
  const handleConfirmAndAdmit = async () => {
    if (!pendingToken || isScanning) return;
    setIsScanning(true);
    setError('');

    try {
      const entryResult = await entryApi.scanQR({
        qr_token: pendingToken,
        additional_guests: additionalGuests,
      });

      setLastEntry(entryResult);
      setManualToken('');
      setPendingToken(null);
      setShowGuestModal(false);
      await fetchRecentEntries();

      // Refocus input field for next hardware scan
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(
        err.response?.data?.detail || 'Invalid QR code or inactive customer pass.'
      );
      setShowGuestModal(false);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken) return;
    handleInitiateScan(manualToken);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-file-temp-element');
      const decodedText = await html5QrCode.scanFile(file, false);
      handleInitiateScan(decodedText);
    } catch (err: any) {
      console.error('File QR Scan error:', err);
      setError('Could not detect a valid QR code in the captured photo. Please make sure the QR card is clearly visible and try again.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startCameraScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      if (!scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            handleInitiateScan(decodedText);
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
    if (activeTab === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [activeTab]);

  // Export Entry Log to CSV
  const exportEntryLogCSV = () => {
    if (recentEntries.length === 0) {
      alert('No entry logs available to export');
      return;
    }

    const headers = [
      'Entry ID',
      'Check-In Date & Time',
      'Serial / Member ID',
      'Member Name',
      'Phone',
      'QR Token ID',
      'Additional Guests',
      'Total Headcount',
    ];

    const rows = recentEntries.map((e) => [
      e.id,
      e.entry_time ? `"${new Date(e.entry_time).toLocaleString()}"` : 'N/A',
      `"${e.customer_code}"`,
      `"${e.customer_name}"`,
      `"${e.phone}"`,
      `"${e.qr_token}"`,
      e.additional_guests,
      e.total_people,
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Entry_CheckIn_Log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = recentEntries.filter((e) => {
    if (!searchLog) return true;
    const term = searchLog.toLowerCase();
    return (
      e.customer_code.toLowerCase().includes(term) ||
      e.customer_name.toLowerCase().includes(term) ||
      e.phone.includes(term) ||
      e.qr_token.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full min-w-0">
      <div className="text-center md:text-left">
        <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <QrCode className="w-7 h-7 text-amber-400" />
          <span>Entry Check-In Scanner</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Compatible with Handheld USB / Bluetooth Scanners & Webcams • Confirm guests to admit entry
        </p>
      </div>

      {/* Scanner Mode Tab Switcher */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-xl">
        <div className="flex border-b border-[#21262d] mb-5">
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-2 pb-3 px-5 font-semibold text-xs border-b-2 transition-all ${
              activeTab === 'hardware'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>Hardware Scanner (Plug & Play USB / Wireless Gun)</span>
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 pb-3 px-5 font-semibold text-xs border-b-2 transition-all ${
              activeTab === 'camera'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera / USB Webcam</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'hardware' ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Step 1: Point Handheld Scanner & Pull Trigger
              </label>
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Ready for External USB / Bluetooth Scanners
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={inputRef}
                  type="text"
                  required
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Scan QR pass with handheld device or paste token..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-3 text-amber-400 font-mono text-sm focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={!manualToken}
                className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-md shadow-amber-500/20 text-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Select Accompanying Guests →</span>
              </button>
            </div>

            <div className="mt-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
              <Usb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <b>Plug & Play:</b> Connect any handheld USB/Bluetooth 2D barcode scanner (Honeywell, Zebra, Eyoyo, TVS). Point at member QR card & trigger — it auto-inputs and opens the Guest Confirmation modal instantly!
              </span>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center">
            {/* Hidden HTML5QR element for scanning snapshots */}
            <div id="qr-file-temp-element" className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Mobile Camera Snapshot Button - Works over HTTP without browser security blocking */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full max-w-md py-4 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2 mb-4 transition-all disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing QR Image...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>SNAP & SCAN WITH MOBILE CAMERA (HTTP WORKAROUND)</span>
                </>
              )}
            </button>

            <div className="w-full max-w-md border-t border-[#21262d] my-2 pt-3 text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Or Live Stream Video Scanner:
              </span>
              <div
                id="qr-reader"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden p-2 text-slate-300"
              />
            </div>

            {!window.isSecureContext && (
              <div className="w-full max-w-md mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs space-y-1 text-left">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  Mobile Browser HTTP Security Policy
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Mobile browsers (Chrome / Safari) block live video streaming over plain <b>HTTP</b> links (e.g. <code>http://10.228.64.138:5173</code>).
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                  💡 <b>Solution:</b> Use the <b>"SNAP & SCAN WITH MOBILE CAMERA"</b> button above! It opens your phone's native camera and works 100% over HTTP without any browser blocking.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Notification Result Card */}
      {lastEntry && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md shadow-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  ENTRY GRANTED • LOG #{lastEntry.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(lastEntry.entry_time).toLocaleTimeString()}
                </span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-100 mt-0.5">Customer Entry Recorded!</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 bg-[#161b22]/80 border border-emerald-500/20 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Customer ID</span>
                  <span className="font-bold text-slate-200 text-xs font-mono">#{lastEntry.customer_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Extra Guests</span>
                  <span className="font-bold text-amber-400 text-xs font-mono">+{lastEntry.additional_guests}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Admitted</span>
                  <span className="font-bold text-emerald-400 text-xs font-mono">{lastEntry.total_people} People</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME ENTRY LOG TABLE WITH CSV DOWNLOAD */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Real-Time Check-In Entry Logs ({filteredEntries.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live log of admitted members with exact timestamp, serial #, name & QR token
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                placeholder="Search entry log..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={exportEntryLogCSV}
              disabled={recentEntries.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 shrink-0"
              title="Download Entry Check-In Log as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD CSV</span>
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="py-8 flex justify-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Loading entry check-in log...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
            No entries recorded yet today.
          </div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                  <th className="py-2.5 px-3">Check-In Time</th>
                  <th className="py-2.5 px-3">Member ID / Card #</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">QR Token ID</th>
                  <th className="py-2.5 px-3 text-center">Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]/70 text-slate-200">
                {filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-[#0d1117]/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {item.entry_time ? new Date(item.entry_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-amber-400 text-sm">
                      #{item.customer_code}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-100">{item.customer_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.phone}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={item.qr_token}>
                      {item.qr_token}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-bold">
                        {item.total_people} Headcount ({item.additional_guests > 0 ? `1+${item.additional_guests}` : '1'})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STEP 2 MODAL: PROMPT ACCOMPANYING GUESTS IMMEDIATELY UPON QR SCAN */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-5">
            <button
              onClick={() => {
                setShowGuestModal(false);
                setPendingToken(null);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Step 2: Accompanying Guests
              </span>
              <h3 className="text-xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Confirm Headcount & Guests</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                How many additional guests are entering with this member?
              </p>
            </div>

            {/* Quick Pill Selector Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Select Guests:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAdditionalGuests(num)}
                    className={`py-2 px-3 rounded-xl text-xs font-black font-mono border transition-all ${
                      additionalGuests === num
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-95'
                        : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:bg-[#21262d]'
                    }`}
                  >
                    {num === 0 ? '0 (Solo Member)' : `+${num} Guest${num > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Counter Box */}
            <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Headcount</span>
                <span className="text-base font-black text-amber-400">
                  1 Member + {additionalGuests} Guests = <span className="text-emerald-400 font-mono">{1 + additionalGuests} People</span>
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdditionalGuests((prev) => Math.max(0, prev - 1))}
                  disabled={additionalGuests <= 0}
                  className="w-8 h-8 rounded-lg bg-[#21262d] text-slate-200 flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="w-8 text-center text-lg font-black text-amber-400 font-mono">
                  {additionalGuests}
                </span>

                <button
                  type="button"
                  onClick={() => setAdditionalGuests((prev) => Math.min(20, prev + 1))}
                  disabled={additionalGuests >= 20}
                  className="w-8 h-8 rounded-lg bg-[#21262d] text-slate-200 flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Confirm & Admit Button */}
            <button
              type="button"
              onClick={handleConfirmAndAdmit}
              disabled={isScanning}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Admitting Entry...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CONFIRM & RECORD ENTRY ({1 + additionalGuests} ADMITTED)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
