import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  Building,
  Calendar,
  Users,
  Wallet,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  ArrowLeft,
  TrendingUp,
  XCircle,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { FinancialReport } from '../../types';
import { api } from '../../services/api';

interface ReportsViewProps {
  onBack?: () => void;
}

type ReportTabType = 
  | 'SUMMARY'
  | 'DAILY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'DEPARTMENT'
  | 'DEFAULTERS'
  | 'SUCCESSFUL'
  | 'FAILED';

export const ReportsView: React.FC<ReportsViewProps> = ({ onBack }) => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<ReportTabType>('SUMMARY');

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminReports();
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (!report) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `fee_report_${activeReportTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReportTab === 'SUMMARY' || activeReportTab === 'DEPARTMENT') {
      headers = ['Department', 'Enrolled Students', 'Total Demand (INR)', 'Total Collected (INR)', 'Outstanding (INR)', 'Recovery Rate (%)'];
      rows = report.departmentStats.map((d) => [
        `"${d.department}"`,
        `${d.studentCount}`,
        `${d.total}`,
        `${d.collected}`,
        `${d.pending}`,
        `${d.collectionRate}%`
      ]);
    } else if (activeReportTab === 'DAILY') {
      headers = ['Date', 'Transactions Count', 'Amount Collected (INR)'];
      rows = (report.dailyTrends || []).map((d) => [
        `"${d.date}"`,
        `${d.count}`,
        `${d.collected}`
      ]);
    } else if (activeReportTab === 'MONTHLY') {
      headers = ['Billing Month (YYYY-MM)', 'Transactions Count', 'Amount Collected (INR)'];
      rows = (report.monthlyTrends || []).map((m) => [
        `"${m.month}"`,
        `${m.count}`,
        `${m.collected}`
      ]);
    } else if (activeReportTab === 'YEARLY') {
      headers = ['Academic Year', 'Transactions Count', 'Amount Collected (INR)'];
      rows = (report.yearlyTrends || []).map((y) => [
        `"${y.year}"`,
        `${y.count}`,
        `${y.collected}`
      ]);
    } else if (activeReportTab === 'DEFAULTERS') {
      headers = ['Roll No', 'Student Name', 'Department', 'Semester', 'Fee Particular', 'Due Date', 'Days Overdue', 'Pending (INR)', 'Late Fine (INR)', 'Total Due (INR)', 'Email', 'Guardian Contact'];
      rows = report.defaultersList.map((d) => [
        `"${d.rollNumber}"`,
        `"${d.studentName}"`,
        `"${d.department}"`,
        `${d.semester}`,
        `"${d.feeTitle}"`,
        `"${d.dueDate}"`,
        `${d.overdueDays}`,
        `${d.pendingAmount}`,
        `${d.lateFine}`,
        `${d.totalDueWithFine}`,
        `"${d.email}"`,
        `"${d.guardianPhone || ''}"`
      ]);
    } else if (activeReportTab === 'SUCCESSFUL') {
      headers = ['Receipt No', 'Payment ID', 'Order ID', 'Roll No', 'Student Name', 'Department', 'Amount (INR)', 'Method', 'Date', 'Status'];
      rows = (report.successfulPaymentsList || []).map((p) => [
        `"${p.receiptNumber}"`,
        `"${p.paymentId}"`,
        `"${p.orderId}"`,
        `"${p.rollNumber}"`,
        `"${p.studentName}"`,
        `"${p.department}"`,
        `${p.amount}`,
        `"${p.paymentMethod}"`,
        `"${p.transactionDate}"`,
        `"${p.status}"`
      ]);
    } else if (activeReportTab === 'FAILED') {
      headers = ['Order ID', 'Roll No', 'Student Name', 'Department', 'Amount (INR)', 'Failure Reason', 'Date', 'Status'];
      rows = (report.failedPaymentsList || []).map((p) => [
        `"${p.orderId}"`,
        `"${p.rollNumber}"`,
        `"${p.studentName}"`,
        `"${p.department}"`,
        `${p.amount}`,
        `"${p.failureReason || 'User Drop / Gateway Error'}"`,
        `"${p.transactionDate}"`,
        `"${p.status}"`
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">Compiling institutional financial audit...</p>
        {onBack && (
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Financial report could not be generated.</p>
          <p className="text-xs text-slate-500 mt-1">Check database connectivity or retry the report compilation.</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Dashboard</span>
            </button>
          )}
          <button
            onClick={fetchReport}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Report</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-start sm:items-center gap-3">
          {onBack && (
            <button
              id="report-back-to-dashboard-btn"
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Back</span>
            </button>
          )}
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileBarChart2 className="w-5 h-5 text-indigo-600" />
              <span>Institutional Financial Statements & Revenue Reports</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily, Monthly, Annual revenue reports, departmental recovery rates, and CSV exports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-csv-btn"
            onClick={exportToCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Download active report table as CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="print-financial-report-btn"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'SUMMARY', label: 'Financial Summary' },
            { id: 'DAILY', label: 'Daily Collection' },
            { id: 'MONTHLY', label: 'Monthly Collection' },
            { id: 'YEARLY', label: 'Yearly Collection' },
            { id: 'DEPARTMENT', label: 'Department-wise' },
            { id: 'DEFAULTERS', label: `Defaulters (${report.defaultersList.length})` },
            { id: 'SUCCESSFUL', label: `Successful Payments (${report.successfulPaymentsList?.length || 0})` },
            { id: 'FAILED', label: `Failed / Cancelled (${report.failedPaymentsList?.length || 0})` }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveReportTab(t.id as ReportTabType)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeReportTab === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 print:p-0 print:border-none print:shadow-none" id="printable-report">
        
        {/* College Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
            Institute of Technology & Advanced Studies
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Office of the Comptroller & Institutional Accounts • Institutional Financial Audit Statement
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mt-2">
            <span>Generated: {new Date(report.generatedAt).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Cycle: 2025-2026</span>
          </div>
        </div>

        {/* Tab 1: Financial Summary */}
        {activeReportTab === 'SUMMARY' && (
          <div className="space-y-6">
            
            {/* Top KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Demand Billed</span>
                <p className="text-xl font-black text-slate-900 mt-1">₹{report.totalFeesBilled.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Realized & Cleared</span>
                <p className="text-xl font-black text-emerald-700 mt-1">₹{report.totalCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">Total Outstanding Balance</span>
                <p className="text-xl font-black text-rose-600 mt-1">₹{report.totalPending.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">Gross Realization Rate</span>
                <p className="text-xl font-black text-indigo-900 mt-1">{report.collectionPercentage}%</p>
              </div>
            </div>

            {/* Department Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Departmental Fee Recovery Ledger
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Enrolled</th>
                      <th className="py-2.5 px-3">Total Demand</th>
                      <th className="py-2.5 px-3">Total Collected</th>
                      <th className="py-2.5 px-3">Outstanding</th>
                      <th className="py-2.5 px-3 text-right">Recovery Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.departmentStats.map((dept, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-900">{dept.department}</td>
                        <td className="py-3 px-3 font-mono">{dept.studentCount}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">₹{dept.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">₹{dept.collected.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-extrabold text-rose-600">₹{dept.pending.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-black text-indigo-700">{dept.collectionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Daily Collection */}
        {activeReportTab === 'DAILY' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Daily Fee Collection Breakdown</span>
            </h3>
            {(!report.dailyTrends || report.dailyTrends.length === 0) ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">No daily collection records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Successful Transactions</th>
                      <th className="py-2.5 px-3 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.dailyTrends.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.date}</td>
                        <td className="py-3 px-3">{d.count} payments</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">₹{d.collected.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Monthly Collection */}
        {activeReportTab === 'MONTHLY' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Monthly Revenue & Fee Realization</span>
            </h3>
            {(!report.monthlyTrends || report.monthlyTrends.length === 0) ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">No monthly collection records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Billing Month</th>
                      <th className="py-2.5 px-3">Successful Volume</th>
                      <th className="py-2.5 px-3 text-right">Total Realized Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.monthlyTrends.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{m.month}</td>
                        <td className="py-3 px-3">{m.count} payments</td>
                        <td className="py-3 px-3 text-right font-black text-indigo-700 text-sm">₹{m.collected.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Yearly Collection */}
        {activeReportTab === 'YEARLY' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>Annual Revenue Report</span>
            </h3>
            {(!report.yearlyTrends || report.yearlyTrends.length === 0) ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">No annual records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Calendar / Academic Year</th>
                      <th className="py-2.5 px-3">Transaction Count</th>
                      <th className="py-2.5 px-3 text-right">Total Cleared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.yearlyTrends.map((y, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{y.year}</td>
                        <td className="py-3 px-3">{y.count} transactions</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">₹{y.collected.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Department-wise */}
        {activeReportTab === 'DEPARTMENT' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Department-Wise Fee Demand vs Realization</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Enrolled</th>
                    <th className="py-2.5 px-3">Total Demand</th>
                    <th className="py-2.5 px-3">Collected</th>
                    <th className="py-2.5 px-3">Outstanding</th>
                    <th className="py-2.5 px-3 text-right">Recovery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.departmentStats.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">{dept.department}</td>
                      <td className="py-3 px-3 font-mono">{dept.studentCount}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">₹{dept.total.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">₹{dept.collected.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 font-extrabold text-rose-600">₹{dept.pending.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-black text-indigo-700">{dept.collectionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Defaulters List */}
        {activeReportTab === 'DEFAULTERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Overdue Fee Defaulters List ({report.defaultersList.length} Students)</span>
              </h3>
              <span className="text-xs text-slate-500">Includes calculated late fines</span>
            </div>

            {report.defaultersList.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-900">Zero Overdue Defaulters</p>
                <p className="text-xs text-emerald-700">All student accounts are compliant with due dates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Department & Sem</th>
                      <th className="py-2.5 px-3">Guardian Contact</th>
                      <th className="py-2.5 px-3">Fee Particular</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Overdue Days</th>
                      <th className="py-2.5 px-3 text-right">Pending + Fine (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.defaultersList.map((d, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/20">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-800">{d.rollNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{d.studentName}</div>
                          <div className="text-[10px] text-slate-400">{d.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800">{d.department}</span>
                          <div className="text-[10px] text-slate-400">Sem {d.semester}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{d.guardianName || 'Guardian'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{d.guardianPhone}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{d.feeTitle}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(d.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-600">{d.overdueDays} days</td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-rose-700 text-sm">₹{d.totalDueWithFine.toLocaleString('en-IN')}</div>
                          {d.lateFine > 0 && (
                            <span className="text-[10px] text-slate-400 block">incl ₹{d.lateFine} fine</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Successful Payments */}
        {activeReportTab === 'SUCCESSFUL' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verified Successful Transactions ({report.successfulPaymentsList?.length || 0})</span>
            </h3>
            {(!report.successfulPaymentsList || report.successfulPaymentsList.length === 0) ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">No successful payment logs available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-emerald-200">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Payment ID</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.successfulPaymentsList.map((p, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/20">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">{p.receiptNumber}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{p.paymentId}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{p.studentName}</td>
                        <td className="py-3 px-3 font-mono">{p.rollNumber}</td>
                        <td className="py-3 px-3 font-medium text-slate-700">{p.paymentMethod}</td>
                        <td className="py-3 px-3 text-slate-600">{new Date(p.transactionDate).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Failed / Dropped Payments */}
        {activeReportTab === 'FAILED' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Failed / Dropped Transactions ({report.failedPaymentsList?.length || 0})</span>
            </h3>
            {(!report.failedPaymentsList || report.failedPaymentsList.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">Zero Failed Transactions</p>
                <p className="text-xs text-slate-500">All initiated gateway checkouts were completed successfully.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Failure Reason</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.failedPaymentsList.map((p, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/20">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{p.orderId}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{p.studentName}</td>
                        <td className="py-3 px-3 font-mono">{p.rollNumber}</td>
                        <td className="py-3 px-3 text-slate-600">{p.department}</td>
                        <td className="py-3 px-3 font-extrabold text-rose-600">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-rose-700 font-medium">{p.failureReason || 'User cancelled checkout'}</td>
                        <td className="py-3 px-3 text-right text-slate-600">{new Date(p.transactionDate).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
