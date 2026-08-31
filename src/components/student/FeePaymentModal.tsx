import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  X,
  Lock,
  ArrowRight,
  Printer,
  Download,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Building,
  Smartphone,
  Sparkles,
  QrCode,
  Zap,
  Loader2,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FeeRecord, PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';
import { downloadReceiptAsPdf } from '../../utils/receiptPdfGenerator';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface FeePaymentModalProps {
  fee: FeeRecord;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (payment: PaymentRecord) => void;
  initialMethod?: 'UPI' | 'CARD' | 'NETBANKING' | 'ANY';
}

// Utility to ensure Razorpay checkout script is loaded
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script from CDN');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const FeePaymentModal: React.FC<FeePaymentModalProps> = ({
  fee,
  isOpen,
  onClose,
  onPaymentSuccess,
  initialMethod = 'UPI'
}) => {
  const [payType, setPayType] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmount, setCustomAmount] = useState<string>(String(fee.pendingAmount));
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'ANY'>(initialMethod);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'SELECT_AMOUNT' | 'SUCCESS'>('SELECT_AMOUNT');
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showFullReceipt, setShowFullReceipt] = useState<boolean>(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadDirectPdf = async () => {
    if (!completedPayment) return;
    setIsDownloadingReceipt(true);
    try {
      let rData = receiptData;
      if (!rData) {
        const res = await api.getReceipt(completedPayment._id || completedPayment.paymentId);
        if (res.success) {
          rData = res.receipt;
          setReceiptData(res.receipt);
        }
      }
      if (rData) {
        await downloadReceiptAsPdf(rData);
      }
    } catch (e) {
      console.error('Error downloading receipt PDF:', e);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handleOpenReceiptView = async () => {
    if (!completedPayment) return;
    try {
      if (!receiptData) {
        const res = await api.getReceipt(completedPayment._id || completedPayment.paymentId);
        if (res.success) {
          setReceiptData(res.receipt);
        }
      }
      setShowFullReceipt(true);
    } catch (e) {
      console.error('Error viewing receipt:', e);
    }
  };

  const payableAmount = payType === 'FULL' ? fee.pendingAmount : Number(customAmount) || 0;

  // Real Razorpay Test Mode Checkout Flow
  const handleProceedToRazorpay = async () => {
    if (payableAmount <= 0) {
      setErrorMessage('Please specify a valid payment amount.');
      return;
    }

    if (payableAmount > fee.pendingAmount) {
      setErrorMessage(`Payable amount cannot exceed pending balance of ₹${fee.pendingAmount.toLocaleString('en-IN')}`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step 1: Ensure Razorpay SDK script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your internet connection.');
      }

      // Step 2: Create REAL Razorpay Order on the backend using secret key
      console.log(`🚀 [Frontend] Requesting real Razorpay order for Fee ${fee._id}, Amount: ₹${payableAmount}, Method: ${selectedMethod}`);
      const orderRes = await api.createRazorpayOrder({
        feeId: fee._id,
        amountToPay: payableAmount,
        paymentNotes: `Semester Fee payment for ${fee.title} via ${selectedMethod}`
      });

      if (!orderRes.success || !orderRes.order) {
        throw new Error(orderRes.message || 'Failed to generate payment order on backend.');
      }

      const order = orderRes.order;
      console.log(`📦 [Frontend] Received Order ID: ${order.id} with Key: ${order.key_id}`);

      // Clean phone number to a valid 10-digit Indian format without prefix/spaces
      const rawContact = order.studentPhone || '';
      const digits = rawContact.replace(/\D/g, '');
      const validContact = digits.length >= 10 ? digits.slice(-10) : '9876543210';

      // Step 3: Launch real Razorpay Checkout modal with explicit UPI prefill and blocks configuration
      const rzpOptions: any = {
        key: order.key_id,
        amount: order.amount, // in paise
        currency: order.currency || 'INR',
        name: 'Smart College Fee Payment Portal',
        description: `${fee.title} • Roll: ${fee.studentRollNumber}`,
        order_id: order.id,
        prefill: {
          name: fee.studentName,
          email: order.studentEmail || 'student@college.edu',
          contact: validContact,
          method: 'upi'
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI (Google Pay, PhonePe, Paytm, QR)',
                instruments: [
                  {
                    method: 'upi'
                  }
                ]
              },
              cards: {
                name: 'Debit / Credit Cards',
                instruments: [
                  {
                    method: 'card'
                  }
                ]
              },
              netbanking: {
                name: 'NetBanking & Wallets',
                instruments: [
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            sequence: ['block.upi', 'block.cards', 'block.netbanking'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        notes: {
          feeId: fee._id,
          rollNumber: fee.studentRollNumber,
          feeTitle: fee.title,
          preferredPaymentMode: selectedMethod
        },
        theme: {
          color: '#4f46e5',
          backdrop_color: 'rgba(15, 23, 42, 0.65)'
        },
        modal: {
          confirm_close: true,
          ondismiss: function () {
            console.log('ℹ️ Razorpay checkout dismissed by student');
            setIsLoading(false);
            api.logPaymentCancellation({
              orderId: order.id,
              feeId: fee._id,
              reason: 'Student closed Razorpay checkout popup'
            });
          }
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          console.log('✅ [Frontend] Razorpay checkout successful, verifying on backend:', response);
          setIsLoading(true);

          try {
            // Step 4: Server-side cryptographic signature verification & database commit
            const verifyRes = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              feeId: fee._id,
              amount: payableAmount
            });

            if (verifyRes.success && verifyRes.payment) {
              console.log('🎉 [Frontend] Payment verified and committed successfully in database:', verifyRes.payment);
              setCompletedPayment(verifyRes.payment);
              setStep('SUCCESS');
              
              // Trigger celebratory confetti
              confetti({
                particleCount: 90,
                spread: 75,
                origin: { y: 0.6 }
              });

              onPaymentSuccess(verifyRes.payment);
            } else {
              setErrorMessage(verifyRes.message || 'Signature verification failed on backend.');
            }
          } catch (verifyErr: any) {
            console.error('❌ Verification error:', verifyErr);
            setErrorMessage(verifyErr.message || 'Backend verification failed.');
          } finally {
            setIsLoading(false);
          }
        }
      };

      const rzpInstance = new window.Razorpay(rzpOptions);
      
      rzpInstance.on('payment.failed', function (failedResponse: any) {
        console.error('❌ [Frontend] Razorpay payment failed:', failedResponse.error);
        setErrorMessage(
          `Payment failed: ${failedResponse.error?.description || failedResponse.error?.reason || 'Transaction could not be processed'}`
        );
        setIsLoading(false);
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('❌ Error in payment checkout flow:', err);
      setErrorMessage(err.message || 'Failed to initiate Razorpay Checkout.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Back and Into-Mark (X) buttons */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              id="back-header-payment-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition cursor-pointer flex items-center justify-center"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Razorpay Instant Fee Settlement</h3>
              <p className="text-[11px] text-indigo-100 font-medium">UPI • Google Pay • PhonePe • Paytm • Cards • NetBanking</p>
            </div>
          </div>
          <button
            id="close-payment-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition cursor-pointer flex items-center justify-center"
            title="Close (Exit)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Amount Selection & Razorpay Launch */}
        {step === 'SELECT_AMOUNT' && (
          <div className="p-6 space-y-5">
            
            {/* Fee summary banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fee Particular</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{fee.title}</p>
              <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-500">Total Billed: <strong className="text-slate-800">₹{fee.totalAmount.toLocaleString('en-IN')}</strong></span>
                <span className="text-slate-500">Pending Due: <strong className="text-rose-600 font-extrabold">₹{fee.pendingAmount.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Payment Choice */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Choose Payment Amount
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="pay-full-option"
                  onClick={() => {
                    setPayType('FULL');
                    setCustomAmount(String(fee.pendingAmount));
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    payType === 'FULL'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Pay Full Pending</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-base font-extrabold text-indigo-700 mt-1">
                    ₹{fee.pendingAmount.toLocaleString('en-IN')}
                  </p>
                </button>

                <button
                  type="button"
                  id="pay-custom-option"
                  onClick={() => setPayType('CUSTOM')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    payType === 'CUSTOM'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Custom Amount</span>
                    <span className="text-[10px] font-medium text-slate-500">Installment</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Enter partial amount</p>
                </button>
              </div>

              {payType === 'CUSTOM' && (
                <div className="pt-2 animate-in fade-in duration-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Payable Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      id="custom-amount-input"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      max={fee.pendingAmount}
                      min={100}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. 10000"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Maximum payable: ₹{fee.pendingAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            {/* Preferred Payment Method Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Preferred Payment Option</span>
                <span className="text-[11px] font-normal text-indigo-600">Prioritized in Checkout</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* UPI Option */}
                <button
                  type="button"
                  id="select-method-upi"
                  onClick={() => setSelectedMethod('UPI')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'UPI'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    UPI / QR
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">GPay, PhonePe</span>
                </button>

                {/* Cards Option */}
                <button
                  type="button"
                  id="select-method-card"
                  onClick={() => setSelectedMethod('CARD')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'CARD'
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">Debit / Credit</span>
                  <span className="text-[9px] text-slate-500 font-medium">Visa, RuPay, MC</span>
                </button>

                {/* NetBanking Option */}
                <button
                  type="button"
                  id="select-method-netbanking"
                  onClick={() => setSelectedMethod('NETBANKING')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'NETBANKING'
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">NetBanking</span>
                  <span className="text-[9px] text-slate-500 font-medium">50+ Banks</span>
                </button>
              </div>

              {selectedMethod === 'UPI' && (
                <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Instant UPI Enabled:</strong> Open Razorpay to pay via Google Pay, PhonePe, Paytm, BHIM, UPI ID or Scan Dynamic QR code.
                  </span>
                </div>
              )}
            </div>

            {/* Test Mode Support Banner */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-800">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Razorpay Test Mode Active</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Clicking below will create a genuine order and open Razorpay Checkout with Test UPI (<span className="font-mono font-bold bg-indigo-100/80 px-1 py-0.5 rounded text-indigo-900">success@razorpay</span> or Simulate Success), NetBanking, and Cards. Completed transactions appear directly in your Razorpay Dashboard.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons: Back + Proceed to Pay */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                id="cancel-payment-modal-btn"
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-1/3 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back</span>
              </button>

              <button
                id="proceed-checkout-btn"
                onClick={handleProceedToRazorpay}
                disabled={isLoading || payableAmount <= 0}
                className="w-full sm:w-2/3 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay ₹{payableAmount.toLocaleString('en-IN')} with {selectedMethod === 'UPI' ? 'UPI / Razorpay' : 'Razorpay'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Real Payment Success Confirmation */}
        {step === 'SUCCESS' && completedPayment && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Your payment of <strong className="text-slate-900 font-bold">₹{completedPayment.amount.toLocaleString('en-IN')}</strong> has been verified by Razorpay and credited.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-left space-y-2.5 font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 font-sans">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-emerald-600 text-sm font-sans">₹{completedPayment.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Payment ID:</span>
                <span className="text-slate-800 font-bold">{completedPayment.paymentId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Order ID:</span>
                <span className="text-slate-800 font-medium">{completedPayment.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Receipt Number:</span>
                <span className="font-bold text-indigo-700">{completedPayment.receiptNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Date & Time:</span>
                <span className="font-sans font-medium text-slate-700">
                  {new Date(completedPayment.transactionDate || Date.now()).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Payment Method:</span>
                <span className="font-sans font-bold text-slate-800 uppercase">{completedPayment.paymentMethod || 'UPI / Razorpay'}</span>
              </div>
            </div>

            {/* View Receipt, Download Receipt and Back Options */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                id="success-back-btn"
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to Dues</span>
              </button>

              <button
                id="success-view-receipt-btn"
                type="button"
                onClick={handleOpenReceiptView}
                className="py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Eye className="w-4 h-4" />
                <span>View Receipt</span>
              </button>

              <button
                id="success-download-receipt-btn"
                type="button"
                onClick={handleDownloadDirectPdf}
                disabled={isDownloadingReceipt}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isDownloadingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Embedded Full Digital Receipt with Print and Back controls */}
      {showFullReceipt && receiptData && (
        <DigitalReceiptModal
          receipt={receiptData}
          isOpen={showFullReceipt}
          onClose={() => {
            setShowFullReceipt(false);
          }}
        />
      )}
    </div>
  );
};
