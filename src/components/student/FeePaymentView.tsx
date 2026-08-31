import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Receipt,
  Sparkles,
  ArrowRight,
  Smartphone,
  QrCode,
  Zap,
  Building2,
  Check
} from 'lucide-react';
import { FeeRecord, PaymentRecord, StudentFeeSummary } from '../../types';
import { api } from '../../services/api';
import { FeePaymentModal } from './FeePaymentModal';

export const FeePaymentView: React.FC = () => {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [paymentMethodForModal, setPaymentMethodForModal] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'ANY'>('UPI');

  const loadFeeData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getStudentFeeSummary();
      if (res.success) {
        setSummary(res.summary);
        setFees(res.fees);
      }
    } catch (err) {
      console.error('Error loading fees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, []);

  const handlePaymentSuccess = () => {
    loadFeeData();
  };

  const handleOpenPayment = (fee: FeeRecord, method: 'UPI' | 'CARD' | 'NETBANKING' | 'ANY' = 'UPI') => {
    setSelectedFee(fee);
    setPaymentMethodForModal(method);
    setIsPayModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold mt-3">Loading fee breakdown...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Academic Fee Breakdown & UPI / Razorpay Settlement</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown of tuition, laboratory, examination, and semester dues with instant UPI & card checkout
          </p>
        </div>

        {summary && summary.pendingFee > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Outstanding</span>
              <span className="text-base font-black text-rose-600">₹{summary.pendingFee.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* UPI & Multi-Method Payment Options Showcase Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-indigo-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Instant 0% Convenience Fee</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 text-[10px] font-bold">
                Razorpay Checkout
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              Pay Directly via UPI Apps, Dynamic QR, NetBanking & Cards
            </h2>
            <p className="text-xs text-indigo-200/90 max-w-2xl leading-relaxed">
              Fast, encrypted settlements with automated instant digital receipt generation. Choose your preferred mode at checkout:
            </p>
          </div>

          {/* Quick Payment Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-white leading-none">UPI & QR</p>
                <p className="text-[9px] text-emerald-300 font-medium">GPay • PhonePe • Paytm</p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-300" />
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-white leading-none">Cards</p>
                <p className="text-[9px] text-blue-200 font-medium">Visa • RuPay • MC</p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-300" />
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-white leading-none">NetBanking</p>
                <p className="text-[9px] text-purple-200 font-medium">50+ Major Banks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Cards List */}
      <div className="space-y-4">
        {fees.map((fee) => (
          <div
            key={fee._id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
          >
            {/* Card Top Header */}
            <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {fee.feeType}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      fee.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : fee.status === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {fee.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Semester {fee.semester} • {fee.academicYear}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{fee.title}</h3>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                  <span className="text-xs font-bold text-slate-800">
                    {new Date(fee.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Itemized Line-Item Breakdown
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-100 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Fee Component</th>
                      <th className="py-2.5 px-3">Purpose & Description</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fee.breakdown.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.category}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.description || 'Academic & Institutional Support'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600">Total Billed Structure:</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">₹{fee.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right text-emerald-700">Amount Paid So Far:</td>
                      <td className="py-2 px-3 text-right font-extrabold text-emerald-700">₹{fee.paidAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-rose-50/50 text-rose-900">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-extrabold">Net Remaining Outstanding:</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm text-rose-600">₹{fee.pendingAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Bar */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">UPI (GPay, PhonePe, Paytm, QR), Cards & NetBanking</span>
                </div>

                {fee.pendingAmount > 0 ? (
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <button
                      id={`checkout-upi-btn-${fee._id}`}
                      onClick={() => handleOpenPayment(fee, 'UPI')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Pay with UPI (₹{fee.pendingAmount.toLocaleString('en-IN')})</span>
                    </button>

                    <button
                      id={`checkout-btn-${fee._id}`}
                      onClick={() => handleOpenPayment(fee, 'ANY')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>All Options</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Fee Fully Cleared</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedFee && (
        <FeePaymentModal
          fee={selectedFee}
          isOpen={isPayModalOpen}
          initialMethod={paymentMethodForModal}
          onClose={() => {
            setIsPayModalOpen(false);
            setSelectedFee(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
};
