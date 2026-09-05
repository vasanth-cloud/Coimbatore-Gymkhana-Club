import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import {
  Printer,
  Download,
  X,
  Loader2,
  CreditCard,
  RotateCw,
  Phone,
  MapPin,
  Briefcase,
  ShieldAlert,
  Mail,
  User,
  Calendar,
  HeartPulse,
} from 'lucide-react';

interface MembershipCardProps {
  customer: Customer;
  qrImageUrl: string | null;
  onClose: () => void;
}

const drawDefaultAvatar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fillStyle = '#F3F4F6';
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();

  // Head
  ctx.fillStyle = '#9CA3AF';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.35, w * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders body
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.88, w * 0.36, h * 0.28, 0, Math.PI, 0);
  ctx.fill();

  ctx.restore();
};

export const MembershipCard: React.FC<MembershipCardProps> = ({
  customer,
  qrImageUrl,
  onClose,
}) => {
  const [frontCardUrl, setFrontCardUrl] = useState<string | null>(null);
  const [backCardUrl, setBackCardUrl] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Render both Front & Back cards onto Canvas
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const renderCards = async () => {
      // -------------------------------------------------------------
      // 1. RENDER FRONT SIDE (Official Gymkhana Membership Template)
      // -------------------------------------------------------------
      const frontCanvas = document.createElement('canvas');
      const frontCtx = frontCanvas.getContext('2d');

      const frontImg = new Image();
      frontImg.crossOrigin = 'anonymous';
      frontImg.src = '/card-template-front-new.png';

      const backImg = new Image();
      backImg.crossOrigin = 'anonymous';
      backImg.src = '/card-template-back-new.png';

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/gymkhana-logo-transparent.png';

      const loadFront = new Promise<void>((resolve) => {
        frontImg.onload = () => resolve();
      });

      const loadBack = new Promise<void>((resolve) => {
        backImg.onload = () => resolve();
      });

      const loadLogo = new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });

      await Promise.all([loadFront, loadBack, loadLogo]);

      if (frontCtx) {
        frontCanvas.width = frontImg.width || 1024;
        frontCanvas.height = frontImg.height || 682;

        const w = frontCanvas.width;
        const h = frontCanvas.height;

        // Draw base front template image
        frontCtx.drawImage(frontImg, 0, 0, w, h);

        // 1. Draw Member Photo in Left Photo Frame Box (x=60, y=226, w=204, h=257)
        const photoX = 60;
        const photoY = 226;
        const photoW = 204;
        const photoH = 257;

        if (customer.photo_url) {
          const photoImg = new Image();
          photoImg.crossOrigin = 'anonymous';
          photoImg.src = customer.photo_url;

          await new Promise<void>((res) => {
            photoImg.onload = () => {
              frontCtx.save();
              frontCtx.beginPath();
              frontCtx.roundRect(photoX, photoY, photoW, photoH, 10);
              frontCtx.clip();

              // Object-fit cover algorithm for member photo
              const imgRatio = photoImg.width / photoImg.height;
              const boxRatio = photoW / photoH;
              let renderW = photoW;
              let renderH = photoH;
              let renderX = photoX;
              let renderY = photoY;

              if (imgRatio > boxRatio) {
                renderW = photoH * imgRatio;
                renderX = photoX - (renderW - photoW) / 2;
              } else {
                renderH = photoW / imgRatio;
                renderY = photoY - (renderH - photoH) / 2;
              }

              frontCtx.drawImage(photoImg, renderX, renderY, renderW, renderH);
              frontCtx.restore();
              res();
            };
            photoImg.onerror = () => {
              drawDefaultAvatar(frontCtx, photoX, photoY, photoW, photoH);
              res();
            };
          });
        } else {
          drawDefaultAvatar(frontCtx, photoX, photoY, photoW, photoH);
        }

        // 2. Draw Member ID Value (aligned right after colon : at x=525, y=295)
        frontCtx.fillStyle = '#0F172A';
        frontCtx.textAlign = 'left';
        frontCtx.textBaseline = 'middle';
        frontCtx.font = 'bold 24px "Times New Roman", serif';
        frontCtx.fillText(customer.customer_code.toUpperCase(), 525, 295);

        // 3. Draw Member Name Value (aligned right after colon : at x=525, y=376)
        const nameUpper = customer.full_name.toUpperCase();
        if (nameUpper.length > 20) {
          frontCtx.font = 'bold 18px "Times New Roman", serif';
        } else if (nameUpper.length > 14) {
          frontCtx.font = 'bold 21px "Times New Roman", serif';
        } else {
          frontCtx.font = 'bold 24px "Times New Roman", serif';
        }
        frontCtx.fillText(nameUpper, 525, 376);

        // 4. Draw Right QR Code Box (x=778, y=231, w=175, h=175)
        const qrX = 778;
        const qrY = 231;
        const qrSize = 175;

        frontCtx.fillStyle = '#FFFFFF';
        frontCtx.fillRect(qrX, qrY, qrSize, qrSize);

        if (qrImageUrl) {
          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          qrImg.src = qrImageUrl;

          await new Promise<void>((res) => {
            qrImg.onload = () => {
              const pad = 6;
              frontCtx.drawImage(qrImg, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
              res();
            };
            qrImg.onerror = () => res();
          });
        }

        // 5. Draw Date of Issue Value (centered below DATE OF ISSUE label at x=865, y=474)
        frontCtx.fillStyle = '#0F172A';
        frontCtx.textAlign = 'center';
        frontCtx.textBaseline = 'middle';
        frontCtx.font = 'bold 18px "Times New Roman", serif';
        frontCtx.fillText(formattedDate, 865, 474);

        if (isMounted) {
          setFrontCardUrl(frontCanvas.toDataURL('image/png'));
        }
      }

      // -------------------------------------------------------------
      // 2. RENDER BACK SIDE (Dark Green Official Crest & Rules Template)
      // -------------------------------------------------------------
      const backCanvas = document.createElement('canvas');
      const backCtx = backCanvas.getContext('2d');

      if (backCtx) {
        backCanvas.width = backImg.width || 1024;
        backCanvas.height = backImg.height || 683;

        backCtx.drawImage(backImg, 0, 0, backCanvas.width, backCanvas.height);

        if (isMounted) {
          setBackCardUrl(backCanvas.toDataURL('image/png'));
        }
      }

      if (isMounted) {
        setIsGenerating(false);
      }
    };

    renderCards();

    return () => {
      isMounted = false;
    };
  }, [customer, qrImageUrl]);

  // Dual-Side Printing for PVC Card Printer Machines
  const handlePrintDualSides = () => {
    if (!frontCardUrl || !backCardUrl) return;

    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) {
      alert('Please allow popups to print the membership card.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Membership Card - ${customer.customer_code}</title>
          <style>
            @page {
              size: 85.6mm 54mm;
              margin: 0;
            }
            html, body {
              width: 85.6mm;
              height: 54mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .card-page {
              width: 85.6mm;
              height: 54mm;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              width: 85.6mm;
              height: 54mm;
              object-fit: fill;
              display: block;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="card-page">
            <img src="${frontCardUrl}" title="Front Side Pass" />
          </div>
          <div class="card-page">
            <img src="${backCardUrl}" title="Back Side Crest" />
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleDownloadFront = () => {
    if (!frontCardUrl) return;
    const link = document.createElement('a');
    link.download = `${customer.customer_code}_Front_Pass.png`;
    link.href = frontCardUrl;
    link.click();
  };

  const handleDownloadBack = () => {
    if (!backCardUrl) return;
    const link = document.createElement('a');
    link.download = `${customer.customer_code}_Back_Crest.png`;
    link.href = backCardUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-6 max-w-2xl w-full relative shadow-2xl space-y-5 my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Coimbatore Gymkhana Club Official Pass
            </span>
            <h3 className="text-xl font-extrabold text-slate-100 mt-0.5 flex items-center gap-2">
              <span>{customer.full_name}</span>
              <span className="text-amber-400 font-mono text-base">({customer.customer_code})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Quick Info Banner (Prominent Mobile Number) */}
        <div className="bg-[#0d1117] border border-amber-500/30 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                Registered Mobile Number
              </span>
              <span className="text-sm font-black font-mono text-amber-300">
                {customer.phone || 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                Father / Guardian Name
              </span>
              <span className="text-xs font-bold text-slate-200">
                {customer.father_guardian_name || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Side Selector Tabs (Front vs Back) */}
        <div className="flex items-center justify-between">
          <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeSide === 'front'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Front Side Pass (Curved Design)</span>
            </button>

            <button
              onClick={() => setActiveSide('back')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeSide === 'back'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>Back Side Crest (Green)</span>
            </button>
          </div>

          <span className="text-xs font-bold text-slate-400">
            {activeSide === 'front' ? 'Member Photo & Details' : 'Official Club Lions Crest'}
          </span>
        </div>

        {/* Live Card Preview Box */}
        <div className="flex justify-center min-h-[300px] items-center bg-[#0d1117] p-4 rounded-2xl border border-[#21262d]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm font-semibold">Generating Dual-Side Membership Cards...</span>
            </div>
          ) : activeSide === 'front' && frontCardUrl ? (
            <div className="relative w-full max-w-[530px] rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30">
              <img
                src={frontCardUrl}
                alt={`Front Card for ${customer.full_name}`}
                className="w-full h-auto block select-none"
              />
            </div>
          ) : activeSide === 'back' && backCardUrl ? (
            <div className="relative w-full max-w-[530px] rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30">
              <img
                src={backCardUrl}
                alt={`Back Crest Card for ${customer.full_name}`}
                className="w-full h-auto block select-none"
              />
            </div>
          ) : null}
        </div>

        {/* Additional Member Profile Details Grid */}
        <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] p-4 space-y-3">
          <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-[#21262d] pb-2">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Complete Member Registration Data</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Occupation</span>
              <span className="text-slate-200 font-semibold flex items-center gap-1.5 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{customer.occupation || 'N/A'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Emergency Contact</span>
              <span className="text-rose-400 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{customer.emergency_contact_no || 'N/A'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Email Address</span>
              <span className="text-slate-200 font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{customer.email || 'N/A'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Date of Birth & Gender</span>
              <span className="text-slate-200 font-semibold flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{customer.date_of_birth || 'N/A'} ({customer.gender || 'Male'})</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Blood Group</span>
              <span className="text-rose-400 font-bold flex items-center gap-1.5 mt-0.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{customer.blood_group || 'N/A'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Aadhaar Card No.</span>
              <span className="text-slate-300 font-mono text-xs block mt-0.5">
                {customer.aadhaar_card_no || 'N/A'}
              </span>
            </div>

            <div className="sm:col-span-3">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Residential Address</span>
              <span className="text-slate-200 text-xs flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{customer.address || 'N/A'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons for Dual-Side Printing & Download */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handlePrintDualSides}
            disabled={isGenerating || !frontCardUrl || !backCardUrl}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 tracking-wide"
          >
            <Printer className="w-5 h-5 stroke-[2.5]" />
            <span>PRINT DUAL-SIDE CARD (FRONT & BACK PAGES)</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadFront}
              disabled={isGenerating || !frontCardUrl}
              className="py-2.5 px-4 bg-[#21262d] hover:bg-[#30363d] text-slate-100 font-extrabold rounded-xl border border-[#30363d] text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Front Pass (PNG)</span>
            </button>

            <button
              onClick={handleDownloadBack}
              disabled={isGenerating || !backCardUrl}
              className="py-2.5 px-4 bg-[#21262d] hover:bg-[#30363d] text-slate-100 font-extrabold rounded-xl border border-[#30363d] text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Back Crest (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

