import React, { useState, useEffect } from 'react';
import {
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  PieChart,
  Activity
} from 'lucide-react';
import { AdminDashboardStats, PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';

interface AdminDashboardProps {
  onNavigateToStudents: () => void;
  onNavigateToFees: () => void;
  onNavigateToPayments: () => void;
  onNavigateToReports: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToStudents,
  onNavigateToFees,
  onNavigateToPayments,
  onNavigateToReports
}) => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleOpenReceipt = async (paymentId: string) => {
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

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold mt-3">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <p className="text-sm font-bold text-slate-700">Unable to load dashboard metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Finance & Accounts Controller
            </span>
            <span className="text-xs text-slate-300">Live Gateway Telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Institutional Fee Management & Revenue Hub
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time Razorpay transaction monitoring, automated reconciliation, and batch fee allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Financial Reports</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        
        {/* Total Students */}
        <div
          onClick={onNavigateToStudents}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-indigo-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900">{stats.totalStudents}</p>
          <p className="text-[10px] text-slate-400">Enrolled active</p>
        </div>

        {/* Total Fees Billed */}
        <div
          onClick={onNavigateToFees}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-indigo-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Fees</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900">₹{(stats.totalFeesBilled / 100000).toFixed(2)}L</p>
          <p className="text-[10px] text-slate-400">Total demand</p>
        </div>

        {/* Total Collected */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Collected</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-emerald-600">₹{(stats.totalCollected / 100000).toFixed(2)}L</p>
          <p className="text-[10px] text-emerald-600 font-semibold">{stats.collectionPercentage}% collected</p>
        </div>

        {/* Pending Amount */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Pending Fees</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-rose-600">₹{(stats.totalPending / 100000).toFixed(2)}L</p>
          <p className="text-[10px] text-rose-600 font-semibold">Outstanding</p>
        </div>

        {/* Today's Collection */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Today</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-indigo-900">₹{((stats.todayCollection || 0) / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-indigo-600 font-semibold">Today's collection</p>
        </div>

        {/* Partially Paid Students */}
        <div
          onClick={onNavigateToStudents}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Partially Paid</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100">
              <PieChart className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-amber-600">{stats.partiallyPaidStudents ?? 0}</p>
          <p className="text-[10px] text-slate-400">Installment dues</p>
        </div>

        {/* Successful Payments */}
        <div
          onClick={onNavigateToPayments}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-emerald-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Success</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900">{stats.successfulPayments}</p>
          <p className="text-[10px] text-slate-400">Razorpay txns</p>
        </div>

        {/* Failed / Drops */}
        <div
          onClick={onNavigateToPayments}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-rose-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Failed</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-rose-600">{stats.failedPayments + stats.pendingPayments}</p>
          <p className="text-[10px] text-slate-400">Gateway drops</p>
        </div>

      </div>

      {/* Monthly Collection Trend + Department Breakdown + Payment Modes Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Collection Trend & Department Recovery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Collection Trends Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Monthly Fee Collection Trends</span>
                </h2>
                <p className="text-[11px] text-slate-500">Total collected revenue by billing month</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                ₹{(stats.totalCollected).toLocaleString('en-IN')} Total
              </span>
            </div>

            {stats.monthlyCollection && stats.monthlyCollection.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {stats.monthlyCollection.map((m, idx) => (
                  <div key={idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 block">{m.month}</span>
                    <p className="text-sm font-black text-indigo-700 mt-1">₹{(m.collected / 1000).toFixed(1)}k</p>
                    <span className="text-[10px] text-slate-500 block">{m.count} txns</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                Recent collection data synchronized from database
              </div>
            )}
          </div>

          {/* Department Recovery Rates */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Department-Wise Fee Collection & Recovery Rate
                </h2>
                <p className="text-[11px] text-slate-500">Live reconciliation across academic disciplines</p>
              </div>
              <button
                onClick={onNavigateToReports}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Export Report →
              </button>
            </div>

            <div className="space-y-4">
              {stats.departmentStats.map((dept, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{dept.department}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({dept.studentCount} students)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-700">₹{(dept.collected / 1000).toLocaleString('en-IN')}k</span>
                      <span className="text-slate-400"> / ₹{(dept.total / 1000).toLocaleString('en-IN')}k</span>
                      <span className="ml-2 font-bold text-xs text-indigo-700">({dept.collectionRate}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, dept.collectionRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
              Payment Gateway Channels
            </h2>
            <p className="text-[11px] text-slate-500 mb-4">Volume processed by payment instrument</p>

            <div className="space-y-2.5">
              {Object.entries(stats.paymentMethodStats).map(([method, val], idx) => {
                const amount: number = Number(val) || 0;
                const totalM: number = Object.values(stats.paymentMethodStats).reduce<number>(
                  (acc, item) => acc + (Number(item) || 0),
                  0
                );
                const pct = totalM > 0 ? Math.round((amount / totalM) * 100) : 0;

                return (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{method}</span>
                      <span className="text-[10px] text-slate-400 block">{pct}% of gateway volume</span>
                    </div>
                    <p className="font-black text-slate-900">₹{amount.toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
            <span className="font-bold">⚡ Razorpay Webhooks Active</span>
            <p className="text-indigo-700 mt-0.5">Automated settlement & real-time signature checks enabled.</p>
          </div>
        </div>

      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Recent Payments & Audit Logs
            </h2>
            <p className="text-[11px] text-slate-500">Live transactions across all student portals</p>
          </div>
          <button
            onClick={onNavigateToPayments}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View All Payments →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentTransactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                    {tx.receiptNumber}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {tx.studentName}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                    {tx.rollNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {tx.department}
                  </td>
                  <td className="py-3 px-3 font-extrabold text-slate-900">
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">
                    {tx.paymentMethod}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {tx.status === 'SUCCESS' && (
                      <button
                        onClick={() => handleOpenReceipt(tx._id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                      >
                        <Receipt className="w-3 h-3 inline mr-1" />
                        <span>View</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
