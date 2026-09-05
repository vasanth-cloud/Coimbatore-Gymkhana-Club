import React from 'react';
import { Customer } from '../types';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface ApplicationFormModalProps {
  customer: Customer;
  onClose: () => void;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  customer,
  onClose,
}) => {
  const currentDate = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });

  const isPurposeChecked = (purposeName: string) => {
    if (!customer.purpose_of_membership) {
      return purposeName === 'Sports Activities';
    }
    const current = customer.purpose_of_membership.toLowerCase();
    const target = purposeName.toLowerCase();
    if (target === 'food / bar' && (current.includes('food') || current.includes('bar'))) {
      return true;
    }
    return current.includes(target);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      alert('Please allow popups to print the application form.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member Registration Application Form - #${customer.customer_code} - ${customer.full_name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 18mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }
            .form-container {
              width: 100%;
              max-width: 185mm;
              margin: 0 auto;
              padding: 10px;
            }
            .club-header {
              text-align: center;
            }
            .club-title {
              font-family: 'Times New Roman', Georgia, serif;
              font-size: 26px;
              font-weight: 900;
              color: #3c1b0c;
              margin: 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .club-address {
              font-size: 12px;
              font-weight: 700;
              color: #3c1b0c;
              margin-top: 4px;
            }
            .header-divider {
              border-bottom: 3px double #3c1b0c;
              margin-top: 10px;
              margin-bottom: 16px;
            }
            .pill-banner {
              text-align: center;
              margin-bottom: 16px;
            }
            .pill-text {
              background-color: #3c1b0c;
              color: #ffffff;
              border-radius: 24px;
              padding: 6px 32px;
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 1px;
              display: inline-block;
              text-transform: uppercase;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 16px;
              padding: 0 4px;
            }
            .meta-val {
              font-family: monospace;
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
              margin-left: 6px;
            }
            .sec-title-center {
              text-align: center;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #1e293b;
              margin-bottom: 14px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
              line-height: 2.2;
            }
            .details-table td {
              vertical-align: top;
            }
            .lbl {
              width: 170px;
            }
            .col {
              width: 20px;
              text-align: center;
            }
            .val {
              font-weight: 800;
              color: #0f172a;
            }
            .sec-title-left {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0f172a;
              margin-top: 22px;
              margin-bottom: 12px;
            }
            .purpose-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px 20px;
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
              padding-left: 4px;
              margin-bottom: 20px;
            }
            .purpose-item {
              display: flex;
              items-center: center;
              gap: 8px;
            }
            .declaration-text {
              font-size: 12px;
              color: #334155;
              line-height: 1.5;
              font-weight: 500;
              text-align: justify;
              margin-bottom: 45px;
            }
            .signatures-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 40px;
            }
            .sig-line-box {
              text-align: center;
              border-top: 1.5px solid #0f172a;
              width: 220px;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <!-- Header -->
            <div class="club-header">
              <h1 class="club-title">COIMBATORE GYMKHANA CLUB</h1>
              <div class="club-address">No. 3, Club Road, Coimbatore - 641016 | Phone: 199/2024</div>
              <div class="header-divider"></div>
            </div>

            <!-- Banner Pill -->
            <div class="pill-banner">
              <span class="pill-text">MEMBER REGISTRATION APPLICATION FORM</span>
            </div>

            <!-- Meta Row & Photo -->
            <div class="meta-row" style="position: relative; align-items: flex-start;">
              <div>
                <div><span>Applicant No.:</span> <span class="meta-val">${customer.customer_code}</span></div>
                <div style="margin-top: 4px;"><span>Application Date:</span> <span class="meta-val">${currentDate}</span></div>
              </div>
              ${
                customer.photo_url
                  ? `<div style="width: 70px; height: 85px; border: 1.5px solid #3c1b0c; border-radius: 4px; overflow: hidden; margin-left: 10px;"><img src="${customer.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`
                  : `<div style="width: 70px; height: 85px; border: 1px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #64748b; text-align: center; line-height: 1.2;">PASSPORT<br/>PHOTO</div>`
              }
            </div>

            <!-- Section 1: APPLICANT DETAILS -->
            <div class="sec-title-center">APPLICANT DETAILS</div>

            <table class="details-table">
              <tr>
                <td class="lbl">Applicant Name</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.full_name}</td>
              </tr>
              <tr>
                <td class="lbl">Father / Guardian Name</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.father_guardian_name || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Date of Birth</td>
                <td class="col">:</td>
                <td class="val" style="width: 180px;">${customer.date_of_birth || ''}</td>
                <td style="width: 90px; text-align: right; padding-right: 8px;">Gender</td>
                <td class="col">:</td>
                <td class="val">${customer.gender || 'Male'}</td>
              </tr>
              <tr>
                <td class="lbl">Occupation</td>
                <td class="col">:</td>
                <td class="val" style="width: 180px;">${customer.occupation || ''}</td>
                <td style="width: 170px; text-align: right; padding-right: 8px;">Institution / Organization</td>
                <td class="col">:</td>
                <td class="val">${customer.institution_organization || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Address</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.address || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Mobile No.</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.phone}</td>
              </tr>
              <tr>
                <td class="lbl">Aadhaar Card No.</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.aadhaar_card_no || ''}</td>
              </tr>
              <tr>
                <td class="lbl">E-mail ID</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.email || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Blood Group</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.blood_group || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Emergency Contact No.</td>
                <td class="col">:</td>
                <td class="val" colspan="4">${customer.emergency_contact_no || ''}</td>
              </tr>
            </table>

            <!-- Section 2: PURPOSE OF MEMBERSHIP -->
            <div class="sec-title-left">2. PURPOSE OF MEMBERSHIP</div>

            <div class="purpose-grid">
              <div class="purpose-item">${isPurposeChecked('Sports Activities') ? '☑' : '☐'} Sports Activities</div>
              <div class="purpose-item">${isPurposeChecked('Outdoor Games') ? '☑' : '☐'} Outdoor Games</div>
              <div class="purpose-item">${isPurposeChecked('Indoor Games') ? '☑' : '☐'} Indoor Games</div>
              <div class="purpose-item">${isPurposeChecked('Library') ? '☑' : '☐'} Library</div>
              <div class="purpose-item">${isPurposeChecked('Cultural Events') ? '☑' : '☐'} Cultural Events</div>
              <div class="purpose-item">${isPurposeChecked('Food / Bar') ? '☑' : '☐'} Food / Bar</div>
              <div class="purpose-item">${isPurposeChecked('Other Activities') ? '☑' : '☐'} Other Activities</div>
            </div>

            <!-- Section 3: DECLARATION -->
            <div class="sec-title-left">3. DECLARATION</div>

            <div class="declaration-text">
              I hereby apply for membership of Coimbatore Gymkhana Club and undertake to abide by the Rules and Regulations of the Club, as applicable from time to time. I further declare that the information given above is true to the best of my knowledge and belief. I agree to pay the required membership fees and any other charges as may be applicable. I also understand that the decision of the Club Committee shall be final and binding on me.
            </div>

            <!-- Signatures Footer -->
            <div class="signatures-row">
              <div>
                <span>Date:</span>
                <span style="font-family: monospace; font-weight: 800; margin-left: 6px;">${currentDate}</span>
              </div>
              <div class="sig-line-box">
                Signature of Applicant
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#161b22] border border-[#21262d] rounded-3xl p-6 max-w-3xl w-full relative shadow-2xl space-y-5 my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <span>Member Registration Application Form</span>
                <span className="text-amber-400 font-mono text-sm">#{customer.customer_code}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Official Application Form Document Preview & PDF Download
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1117] border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Exact Paper Form Replica (Ready for Print / PDF Export)</span>
          </div>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>PRINT / DOWNLOAD APPLICATION FORM</span>
          </button>
        </div>

        {/* On-Screen Document Paper Replica */}
        <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-300 font-sans text-xs space-y-4">
          
          {/* Header */}
          <div className="text-center">
            <h1 className="font-serif text-2xl font-black text-[#3c1b0c] uppercase tracking-wide">
              COIMBATORE GYMKHANA CLUB
            </h1>
            <div className="text-xs font-bold text-[#3c1b0c] mt-1">
              No. 3, Club Road, Coimbatore - 641016 | Phone: 199/2024
            </div>
            <div className="border-b-[3px] border-double border-[#3c1b0c] mt-3 mb-4"></div>
          </div>

          {/* Banner Pill */}
          <div className="text-center mb-4">
            <span className="bg-[#3c1b0c] text-white rounded-full px-8 py-1.5 text-xs font-black tracking-widest uppercase inline-block">
              MEMBER REGISTRATION APPLICATION FORM
            </span>
          </div>

          {/* Meta Row & Photo */}
          <div className="flex justify-between items-start text-xs font-bold text-slate-900 mb-4 px-1">
            <div>
              <div>
                <span>Applicant No.: </span>
                <span className="font-mono font-black text-sm text-slate-900 ml-1">{customer.customer_code}</span>
              </div>
              <div className="mt-1">
                <span>Application Date: </span>
                <span className="font-mono font-bold text-slate-900 ml-1">{currentDate}</span>
              </div>
            </div>

            {customer.photo_url ? (
              <div className="w-16 h-20 border-2 border-[#3c1b0c] rounded overflow-hidden shadow-sm shrink-0">
                <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-20 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[9px] text-slate-500 font-bold text-center leading-tight shrink-0">
                PASSPORT<br />PHOTO
              </div>
            )}
          </div>

          {/* Section 1: APPLICANT DETAILS */}
          <div className="text-center text-xs font-black tracking-widest uppercase text-slate-900 mb-3">
            APPLICANT DETAILS
          </div>

          <table className="w-full text-xs font-semibold text-slate-900 leading-relaxed border-collapse">
            <tbody>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Applicant Name</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950" colSpan={4}>{customer.full_name}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Father / Guardian Name</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950" colSpan={4}>{customer.father_guardian_name || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Date of Birth</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950 w-44">{customer.date_of_birth || ''}</td>
                <td className="w-24 text-right pr-2 py-1 font-semibold text-slate-800">Gender</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950">{customer.gender || 'Male'}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Occupation</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950 w-44">{customer.occupation || ''}</td>
                <td className="w-40 text-right pr-2 py-1 font-semibold text-slate-800">Institution / Organization</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950">{customer.institution_organization || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Address</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950" colSpan={4}>{customer.address || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Mobile No.</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950 font-mono" colSpan={4}>{customer.phone}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Aadhaar Card No.</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950 font-mono" colSpan={4}>{customer.aadhaar_card_no || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">E-mail ID</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950" colSpan={4}>{customer.email || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Blood Group</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950" colSpan={4}>{customer.blood_group || ''}</td>
              </tr>
              <tr>
                <td className="w-40 py-1 font-semibold text-slate-800">Emergency Contact No.</td>
                <td className="w-5 text-center py-1 font-bold">:</td>
                <td className="py-1 font-extrabold text-slate-950 font-mono" colSpan={4}>{customer.emergency_contact_no || ''}</td>
              </tr>
            </tbody>
          </table>

          {/* Section 2: PURPOSE OF MEMBERSHIP */}
          <div className="text-xs font-black uppercase text-slate-900 mt-5 mb-3">
            2. PURPOSE OF MEMBERSHIP
          </div>

          <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs font-bold text-slate-900 pl-1 mb-5">
            <div>{isPurposeChecked('Sports Activities') ? '☑' : '☐'} Sports Activities</div>
            <div>{isPurposeChecked('Outdoor Games') ? '☑' : '☐'} Outdoor Games</div>
            <div>{isPurposeChecked('Indoor Games') ? '☑' : '☐'} Indoor Games</div>
            <div>{isPurposeChecked('Library') ? '☑' : '☐'} Library</div>
            <div>{isPurposeChecked('Cultural Events') ? '☑' : '☐'} Cultural Events</div>
            <div>{isPurposeChecked('Food / Bar') ? '☑' : '☐'} Food / Bar</div>
            <div>{isPurposeChecked('Other Activities') ? '☑' : '☐'} Other Activities</div>
          </div>

          {/* Section 3: DECLARATION */}
          <div className="text-xs font-black uppercase text-slate-900 mt-4 mb-2">
            3. DECLARATION
          </div>

          <div className="text-xs color-slate-700 leading-relaxed font-medium text-justify mb-10">
            I hereby apply for membership of Coimbatore Gymkhana Club and undertake to abide by the Rules and Regulations of the Club, as applicable from time to time. I further declare that the information given above is true to the best of my knowledge and belief. I agree to pay the required membership fees and any other charges as may be applicable. I also understand that the decision of the Club Committee shall be final and binding on me.
          </div>

          {/* Signatures Footer */}
          <div className="flex justify-between items-end text-xs font-bold text-slate-900 pt-6">
            <div>
              <span>Date: </span>
              <span className="font-mono font-bold">{currentDate}</span>
            </div>
            <div className="text-center border-t-2 border-slate-900 w-52 pt-1 uppercase font-bold">
              Signature of Applicant
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold text-xs transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>PRINT / DOWNLOAD APPLICATION FORM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
