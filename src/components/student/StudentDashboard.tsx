import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Receipt,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StudentFeeSummary, FeeRecord, PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { FeePaymentModal } from './FeePaymentModal';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';

interface StudentDashboardProps {
  onNavigateToPay: (fee: FeeRecord) => void;
  onNavigateToHistory: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigateToPay,
  onNavigateToHistory
}) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected fee for payment modal
  const [selectedFeeForPay, setSelectedFeeForPay] = useState<FeeRecord | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);

  // Selected receipt for receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [feeSummaryRes, paymentsRes] = await Promise.all([
        api.getStudentFeeSummary(),
        api.getStudentPaymentHistory()
      ]);

      if (feeSummaryRes.success) {
        setSummary(feeSummaryRes.summary);
        setFees(feeSummaryRes.fees);
      }

      if (paymentsRes.success) {
        setRecentPayments(paymentsRes.payments.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching student dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await api.getReceipt(paymentId);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
    }
  };

  const handlePaymentSuccess = (_newPayment: PaymentRecord) => {
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold mt-3">Loading fee account details...</p>
      </div>
    );
  }

  const paidPercentage =
    summary && summary.totalFee > 0
      ? Math.min(100, Math.round((summary.paidFee / summary.totalFee) * 100))
      : 0;

  return (
    <div className="space-y-6">
      
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Academic Year {summary?.academicYear || '2025-2026'}
              </span>
              <span className="text-xs text-slate-300">
                Semester {summary?.semester || 8}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome, {summary?.studentName || user?.name} 👋
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {summary?.course} • Roll: <strong className="font-mono text-amber-300 font-bold">{summary?.rollNumber}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {summary && summary.pendingFee > 0 ? (
              <button
                id="quick-pay-hero-btn"
                onClick={() => {
                  const pending = fees.find((f) => f.pendingAmount > 0);
                  if (pending) {
                    setSelectedFeeForPay(pending);
                    setIsPayModalOpen(true);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-500/40 flex items-center gap-2 transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Outstanding (₹{summary.pendingFee.toLocaleString('en-IN')})</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All Fees Cleared for Current Term</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards (Required: Total Fee, Paid Fee, Pending Fee, Next Due Date) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Fee Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Fee Billed</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{summary?.totalFee.toLocaleString('en-IN') || '0'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Cumulative across all active structures
          </p>
        </div>

        {/* Paid Fee Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Paid Fee</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            ₹{summary?.paidFee.toLocaleString('en-IN') || '0'}
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {paidPercentage}% of total fees settled
          </p>
        </div>

        {/* Pending Fee Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Pending Fee</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            ₹{summary?.pendingFee.toLocaleString('en-IN') || '0'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {summary && summary.pendingFee > 0 ? 'Pending payment via Razorpay' : 'No dues pending'}
          </p>
        </div>

        {/* Next Due Date Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Next Due Date</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-slate-900 tracking-tight">
            {summary?.nextDueDate
              ? new Date(summary.nextDueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'No Pending Due'}
          </p>
          {summary?.isOverdue ? (
            <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
              Overdue • Late fine may apply
            </span>
          ) : summary?.nextDueDate ? (
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Payment window open
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">All clear</p>
          )}
        </div>

      </div>

      {/* Fee Records Table & Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Enrolled Fee Records & Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Detailed breakdown of tuition, lab, examination, and campus fees
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {fees.map((fee) => (
            <div key={fee._id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Fee Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {fee.feeType}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        fee.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : fee.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {fee.status === 'PAID' ? 'FULLY PAID' : fee.status === 'PARTIAL' ? 'PARTIALLY PAID' : 'PENDING'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due: {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{fee.title}</h3>
                  <p className="text-xs text-slate-500">{fee.remarks || 'Standard semester fee'}</p>

                  {/* Itemized Breakdown Pills */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {fee.breakdown.map((item) => (
                      <span
                        key={item.id}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 font-medium"
                      >
                        {item.category}: <strong className="text-slate-900">₹{item.amount.toLocaleString('en-IN')}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Amount and Action */}
                <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-semibold">Outstanding Due</span>
                    <p className="text-lg font-black text-slate-900">
                      ₹{fee.pendingAmount.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[11px] text-emerald-600 font-medium block">
                      Paid: ₹{fee.paidAmount.toLocaleString('en-IN')} / ₹{fee.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {fee.pendingAmount > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id={`pay-upi-btn-${fee._id}`}
                        onClick={() => {
                          setSelectedFeeForPay(fee);
                          setIsPayModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay with UPI (₹{fee.pendingAmount.toLocaleString('en-IN')})</span>
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Settled</span>
                    </span>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Recent Transactions & Receipts
            </h2>
            <p className="text-xs text-slate-500">Download digital verified payment receipts</p>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All History</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No payment transactions yet</p>
            <p className="text-[11px] text-slate-400">When you pay fees via Razorpay, receipts will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Payment ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                      {pay.receiptNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 truncate max-w-[140px]">
                      {pay.paymentId}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(pay.transactionDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {pay.paymentMethod}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{pay.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pay.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pay.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pay.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {pay.status === 'SUCCESS' && (
                        <button
                          id={`view-receipt-btn-${pay._id}`}
                          onClick={() => handleOpenReceipt(pay._id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 border border-slate-200 transition cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay Payment Modal */}
      {selectedFeeForPay && (
        <FeePaymentModal
          fee={selectedFeeForPay}
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setSelectedFeeForPay(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <DigitalReceiptModal
          receipt={selectedReceipt}
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedReceipt(null);
          }}
        />
      )}

    </div>
  );
};
