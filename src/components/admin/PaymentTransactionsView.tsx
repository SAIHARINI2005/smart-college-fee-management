import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Calendar,
  CreditCard,
  Building,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';

export const PaymentTransactionsView: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminPayments({
        search,
        status: statusFilter,
        paymentMethod: methodFilter,
        department: departmentFilter
      });
      if (res.success) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.error('Error fetching admin payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter, departmentFilter]);

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await api.getReceipt(paymentId);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsReceiptOpen(true);
      }
    } catch (err) {
      console.error('Error loading receipt:', err);
    }
  };

  const totalSuccessfulAmount = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>Master Payment Gateway Logs & Settlements</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade Razorpay payment journal with instant cryptographic signature verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Filtered Volume</span>
            <span className="text-sm font-extrabold text-emerald-700">₹{totalSuccessfulAmount.toLocaleString('en-IN')}</span>
          </div>
          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-transactions-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt, roll, student, or payment ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <select
            id="filter-txn-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            id="filter-txn-method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Payment Instruments</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="CREDIT_CARD">Credit / Debit Card</option>
            <option value="NET_BANKING">NetBanking</option>
            <option value="WALLET">Wallet</option>
          </select>
        </div>

        <div>
          <select
            id="filter-txn-dept"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science and Engineering">Computer Science</option>
            <option value="Information Technology">Information Tech</option>
            <option value="Electronics & Communication">Electronics & Comm</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No payment logs found</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Student & Roll No</th>
                  <th className="py-3 px-4">Razorpay Identifiers</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">E-Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.studentName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.rollNumber} • {p.department}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800 font-medium truncate max-w-[140px]">
                        {p.paymentId}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                        {p.orderId}
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
                      {p.razorpayDetails?.bank && (
                        <span className="block text-[10px] text-slate-500">{p.razorpayDetails.bank}</span>
                      )}
                      {p.razorpayDetails?.vpa && (
                        <span className="block text-[10px] text-slate-500">{p.razorpayDetails.vpa}</span>
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
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.status === 'SUCCESS' ? (
                        <button
                          id={`admin-view-receipt-${p._id}`}
                          onClick={() => handleOpenReceipt(p._id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 border border-slate-200 transition cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
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
