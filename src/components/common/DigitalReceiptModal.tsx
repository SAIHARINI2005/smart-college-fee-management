import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Building2,
  QrCode,
  ShieldCheck,
  Calendar,
  CreditCard,
  User,
  GraduationCap,
  ArrowLeft,
  Loader2,
  FileCheck,
  Check
} from 'lucide-react';
import { ReceiptData } from '../../types';
import { downloadReceiptAsPdf } from '../../utils/receiptPdfGenerator';

interface DigitalReceiptModalProps {
  receipt: ReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    try {
      const printElement = document.getElementById('printable-receipt-card');
      if (printElement) {
        // Create an isolated hidden iframe for printing just the receipt card
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Receipt_${receipt.receiptNumber}</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin: 0;
                    padding: 24px;
                    color: #0f172a;
                    background: #ffffff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  * { box-sizing: border-box; }
                  table { width: 100%; border-collapse: collapse; }
                  @page {
                    size: auto;
                    margin: 10mm;
                  }
                  @media print {
                    body { padding: 0; }
                  }
                </style>
              </head>
              <body>
                ${printElement.innerHTML}
              </body>
            </html>
          `);
          doc.close();

          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (printErr) {
              console.warn('Iframe print failed, falling back to window.print():', printErr);
              window.print();
            } finally {
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 2000);
            }
          }, 350);
          return;
        }
      }
      // Fallback
      window.print();
    } catch (err) {
      console.warn('Print command encountered an error; falling back to PDF download:', err);
      handleDownloadPdf();
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadReceiptAsPdf(receipt, 'printable-receipt-card');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download PDF receipt:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = new Date(receipt.transactionDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const totalFeeAmount = receipt.amountDetails?.totalFee || receipt.feeDetails?.totalFee || receipt.amount;
  const currentPaidAmount = receipt.amountDetails?.amountPaid || receipt.amount;
  const remainingBalance = receipt.amountDetails?.remainingBalance ?? receipt.feeDetails?.remainingPending ?? 0;
  const previousPaid = receipt.feeDetails?.previousPaidAmount ?? Math.max(0, (receipt.feeDetails?.paidAmountAfterThis || currentPaidAmount) - currentPaidAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-transparent">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none">
        
        {/* Action Header with Back, Download PDF, and Print options (Hidden in Print) */}
        <div className="print:hidden bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              id="receipt-header-back-btn"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white text-xs font-semibold transition cursor-pointer"
              title="Return back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Digital Fee Receipt</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="receipt-header-download-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              title="Download Official PDF Receipt"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              id="receipt-header-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              id="close-receipt-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close receipt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div className="p-6 sm:p-8 print:p-0 bg-white" id="printable-receipt-card">
          
          {/* College Header */}
          <div className="border-b-2 border-indigo-900 pb-4 text-center relative">
            <div className="flex justify-center items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                  {receipt.college.name}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  {receipt.college.affiliation}
                </p>
                <p className="text-[10px] text-indigo-700 font-bold tracking-wide">
                  {receipt.college.accreditation}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              {receipt.college.address} | {receipt.college.contact}
            </p>
          </div>

          {/* Receipt Title Banner */}
          <div className="my-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Document Type</span>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">FEE PAYMENT RECEIPT</h2>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Receipt Number</span>
              <p className="text-xs sm:text-sm font-mono font-extrabold text-indigo-800">{receipt.receiptNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Payment Date & Time</span>
              <p className="text-xs font-semibold text-slate-800">{formattedDate}</p>
            </div>
            <div className="w-full sm:w-auto pt-1 sm:pt-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Payment Successful
              </span>
            </div>
          </div>

          {/* Student & Academic Information */}
          <div className="mb-4">
            <h3 className="text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
              Student Registration Particulars
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Student Name</span>
                <p className="font-bold text-slate-900">{receipt.student.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Roll Number</span>
                <p className="font-bold font-mono text-indigo-700">{receipt.student.rollNumber}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Registration Number</span>
                <p className="font-medium text-slate-800 font-mono">{receipt.student.registrationNo}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Department & Course</span>
                <p className="font-medium text-slate-800">{receipt.student.department}</p>
                <p className="text-[10px] text-slate-500 truncate">{receipt.student.course}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Semester / Academic Year</span>
                <p className="font-semibold text-slate-800">Sem {receipt.student.semester} ({receipt.student.academicYear})</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Quota / Category</span>
                <p className="font-semibold text-slate-800">
                  {receipt.student.admissionQuota || 'MERIT'} / {receipt.student.feeCategory || 'REGULAR'}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Student Email</span>
                <p className="font-medium text-slate-800">{receipt.student.email}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Contact Phone</span>
                <p className="font-medium text-slate-800">{receipt.student.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Fee Breakdown Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Fee Details: {receipt.feeDetails?.title || 'Academic & Semester Fee'}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Fee Type: {receipt.feeDetails?.feeType || 'SEMESTER_FEE'}
              </span>
            </div>
            
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Itemized Fee Description</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.feeDetails?.breakdown && receipt.feeDetails.breakdown.length > 0 ? (
                  receipt.feeDetails.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-3">
                        <span className="font-semibold text-slate-800">{item.description || item.category}</span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">{item.category}</td>
                      <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 px-3 font-mono text-slate-400">1</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">Tuition & Semester Fee Installment</td>
                    <td className="py-1.5 px-3 text-slate-600 text-[11px]">Academic</td>
                    <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                      ₹{receipt.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-indigo-50/80 font-bold text-slate-900 border-t-2 border-indigo-200">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right text-xs">
                    Current Payment Amount:
                  </td>
                  <td className="py-2 px-3 text-right text-sm text-indigo-900 font-black">
                    ₹{currentPaidAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount Balance Summary Matrix */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Fee</span>
              <span className="text-sm font-extrabold text-slate-900">₹{totalFeeAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Previous Paid</span>
              <span className="text-sm font-extrabold text-slate-700">₹{previousPaid.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Amount Paid (Now)</span>
              <span className="text-sm font-black text-emerald-700">₹{currentPaidAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Remaining Balance</span>
              <span className={`text-sm font-extrabold ${remainingBalance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                ₹{remainingBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment & Gateway Identifiers */}
          <div className="mb-4">
            <h3 className="text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
              Payment & Gateway Verification Details
            </h3>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Payment Method</span>
                <p className="font-bold text-slate-800">{receipt.paymentMethod || 'UPI'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Transaction Status</span>
                <p className="font-bold text-emerald-700">Payment Successful</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Razorpay Payment ID</span>
                <p className="font-mono text-[11px] text-slate-900 truncate font-semibold">{receipt.paymentId}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Razorpay Order ID</span>
                <p className="font-mono text-[11px] text-slate-900 truncate">{receipt.orderId}</p>
              </div>
            </div>
          </div>

          {/* Digital Verification Section */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white border border-indigo-200 rounded-lg shadow-2xs shrink-0">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-600 leading-tight">
                <p className="font-extrabold text-indigo-950 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Digital Verification
                </p>
                <p className="mt-0.5"><strong className="text-slate-700">Receipt No:</strong> {receipt.receiptNumber}</p>
                <p><strong className="text-slate-700">Payment ID:</strong> {receipt.paymentId}</p>
                <p><strong className="text-slate-700">Verification Status:</strong> <span className="text-emerald-700 font-bold">VERIFIED & CAPTURED</span></p>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-100">
              <div className="inline-block border-b border-dashed border-slate-400 pb-0.5 px-4 mb-0.5">
                <span className="font-serif italic font-bold text-indigo-950 text-xs">Accounts Officer</span>
              </div>
              <p className="text-[10px] font-bold text-slate-700 uppercase">Authorized Finance Signatory</p>
              <p className="text-[9px] text-slate-500">Autonomous Institute Billing Authority</p>
            </div>
          </div>

          {/* Official Footer Notice */}
          <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2">
            <p>This is a computer-generated digital receipt and requires no physical signature.</p>
            <p className="mt-0.5">Generated directly from verified Razorpay settlement record • {receipt.college.website}</p>
          </div>

        </div>

        {/* Bottom Footer with Back and Download / Print Actions (Hidden in Print) */}
        <div className="print:hidden bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            id="receipt-footer-back-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              id="receipt-footer-download-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Downloaded PDF</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Receipt (PDF)</span>
                </>
              )}
            </button>
            <button
              id="receipt-footer-print-btn"
              onClick={handlePrint}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
