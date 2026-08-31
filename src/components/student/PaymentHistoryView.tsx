import React, { useState, useEffect } from 'react';
import {
  History,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download,
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';

export const PaymentHistoryView: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getStudentPaymentHistory();
      if (res.success) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await api.getReceipt(paymentId);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsReceiptOpen(true);
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.orderId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Payment History & Digital Receipts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically signed transaction logs and downloadable vouchers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Cleared</span>
            <span className="text-sm font-extrabold text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</span>
          </div>
          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-payments-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Receipt No or Payment ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({payments.length})</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No payment records found</p>
            <p className="text-xs text-slate-500 mt-0.5">Try adjusting search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Razorpay Payment ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Method / Mode</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">E-Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800 font-medium truncate max-w-[150px]">
                        {p.paymentId}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        Ord: {p.orderId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(p.transactionDate).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{p.paymentMethod}</span>
                      {p.razorpayDetails?.vpa && (
                        <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                          {p.razorpayDetails.vpa}
                        </span>
                      )}
                      {p.razorpayDetails?.bank && (
                        <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                          {p.razorpayDetails.bank}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          SUCCESS
                        </span>
                      ) : p.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          <Clock className="w-3 h-3" />
                          {p.status}
                        </span>
                      )}
                      {p.failureReason && (
                        <span className="block text-[10px] text-rose-600 mt-0.5 truncate max-w-[140px]" title={p.failureReason}>
                          {p.failureReason}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.status === 'SUCCESS' ? (
                        <button
                          id={`download-receipt-${p._id}`}
                          onClick={() => handleViewReceipt(p._id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 border border-indigo-200 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No Voucher</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <DigitalReceiptModal
          receipt={selectedReceipt}
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedReceipt(null);
          }}
        />
      )}

    </div>
  );
};
