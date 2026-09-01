import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { Printer, Download, X, Loader2, CreditCard, RotateCw } from 'lucide-react';

interface MembershipCardProps {
  customer: Customer;
  qrImageUrl: string | null;
  onClose: () => void;
}

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
      // 1. RENDER FRONT SIDE (New Curved Dark-Green & White Template)
      // -------------------------------------------------------------
      const frontCanvas = document.createElement('canvas');
      const frontCtx = frontCanvas.getContext('2d');

      const frontImg = new Image();
      frontImg.crossOrigin = 'anonymous';
      frontImg.src = '/card-template-front.png';

      const backImg = new Image();
      backImg.crossOrigin = 'anonymous';
      backImg.src = '/card-template-back.png';

      const loadFront = new Promise<void>((resolve) => {
        frontImg.onload = () => resolve();
      });

      const loadBack = new Promise<void>((resolve) => {
        backImg.onload = () => resolve();
      });

      await Promise.all([loadFront, loadBack]);

      if (frontCtx) {
        frontCanvas.width = frontImg.width || 1056;
        frontCanvas.height = frontImg.height || 660;

        const w = frontCanvas.width;
        const h = frontCanvas.height;

        // Draw base front template image
        frontCtx.drawImage(frontImg, 0, 0, w, h);

        // 1. Clean QR Code Frame Box
        const qrX = w * 0.262;
        const qrY = h * 0.408;
        const qrW = w * 0.203;
        const qrH = h * 0.325;

        frontCtx.fillStyle = '#FFFFFF';
        frontCtx.beginPath();
        frontCtx.roundRect(qrX, qrY, qrW, qrH, 18);
        frontCtx.fill();

        if (qrImageUrl) {
          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          qrImg.src = qrImageUrl;

          await new Promise<void>((res) => {
            qrImg.onload = () => {
              const pad = 8;
              frontCtx.drawImage(qrImg, qrX + pad, qrY + pad, qrW - pad * 2, qrH - pad * 2);
              res();
            };
            qrImg.onerror = () => res();
          });
        }

        // 2. Clear sample text background fields before drawing customer's actual data
        const textCoverX = w * 0.725;
        const textCoverW = w * 0.24;
        const textCoverH = h * 0.07;

        const y1 = h * 0.420; // MEMBER ID cover
        const y2 = h * 0.530; // MEMBER NAME cover
        const y3 = h * 0.640; // DATE OF ISSUE cover

        frontCtx.fillStyle = '#FAF8F5'; // Off-white matching template background
        frontCtx.fillRect(textCoverX, y1, textCoverW, textCoverH);
        frontCtx.fillRect(textCoverX, y2, textCoverW, textCoverH);
        frontCtx.fillRect(textCoverX, y3, textCoverW, textCoverH);

        // 3. Draw Customer details in crisp dark green/charcoal serif text
        frontCtx.fillStyle = '#0F2018';
        frontCtx.shadowColor = 'rgba(0,0,0,0.1)';
        frontCtx.shadowBlur = 1;
        frontCtx.shadowOffsetX = 1;
        frontCtx.shadowOffsetY = 1;

        frontCtx.textAlign = 'left';
        frontCtx.textBaseline = 'middle';
        const textX = w * 0.730;

        // Member ID
        frontCtx.font = 'bold 26px "Times New Roman", serif';
        frontCtx.fillText(customer.customer_code.toUpperCase(), textX, y1 + textCoverH / 2);

        // Member Name
        const nameUpper = customer.full_name.toUpperCase();
        if (nameUpper.length > 18) {
          frontCtx.font = 'bold 21px "Times New Roman", serif';
        } else {
          frontCtx.font = 'bold 25px "Times New Roman", serif';
        }
        frontCtx.fillText(nameUpper, textX, y2 + textCoverH / 2);

        // Date of Issue
        frontCtx.font = 'bold 25px "Times New Roman", serif';
        frontCtx.fillText(formattedDate, textX, y3 + textCoverH / 2);

        if (isMounted) {
          setFrontCardUrl(frontCanvas.toDataURL('image/png'));
        }
      }

      // -------------------------------------------------------------
      // 2. RENDER BACK SIDE (Dark Green Official Crest Template)
      // -------------------------------------------------------------
      const backCanvas = document.createElement('canvas');
      const backCtx = backCanvas.getContext('2d');

      if (backCtx) {
        backCanvas.width = backImg.width || 1056;
        backCanvas.height = backImg.height || 660;

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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-6 max-w-2xl w-full relative shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Coimbatore Gymkhana Club Official Pass
            </span>
            <h3 className="text-xl font-extrabold text-slate-100 mt-0.5">
              {customer.full_name} ({customer.customer_code})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
