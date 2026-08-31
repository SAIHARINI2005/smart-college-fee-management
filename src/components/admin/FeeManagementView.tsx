import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  UserCheck,
  Building,
  DollarSign,
  PlusCircle,
  MinusCircle,
  X
} from 'lucide-react';
import { FeeRecord, FeeBreakdownItem, Student } from '../../types';
import { api } from '../../services/api';

export const FeeManagementView: React.FC = () => {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<'INDIVIDUAL' | 'DEPARTMENT'>('DEPARTMENT');
  
  // Assign Fee Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('Computer Science and Engineering');
  const [targetSemester, setTargetSemester] = useState(8);
  const [targetAcademicYear, setTargetAcademicYear] = useState('2025-2026');
  const [feeTitle, setFeeTitle] = useState('8th Semester Tuition & Examination Fee');
  const [feeType, setFeeType] = useState('SEMESTER_FEE');
  const [dueDate, setDueDate] = useState('2026-03-31');
  const [lateFinePerDay, setLateFinePerDay] = useState(50);
  const [remarks, setRemarks] = useState('Includes regular theory exams and project viva');

  const [breakdown, setBreakdown] = useState<FeeBreakdownItem[]>([
    { id: 'b1', category: 'Tuition Fee', amount: 50000, description: 'Academic instruction & laboratories' },
    { id: 'b2', category: 'Examination Fee', amount: 3500, description: 'Semester end assessment & project viva' },
    { id: 'b3', category: 'Library & Digital Resources', amount: 2500, description: 'IEEE access & digital library' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchFeesAndStudents = async () => {
    setIsLoading(true);
    try {
      const [feesRes, studentsRes] = await Promise.all([
        api.getAdminFees({ search, status: statusFilter, feeType: typeFilter }),
        api.getAdminStudents()
      ]);

      if (feesRes.success) setFees(feesRes.fees);
      if (studentsRes.success) {
        setStudents(studentsRes.students);
        if (studentsRes.students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsRes.students[0]._id);
        }
      }
    } catch (err) {
      console.error('Error loading fees data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeesAndStudents();
  }, [search, statusFilter, typeFilter]);

  const handleAddBreakdownItem = () => {
    setBreakdown([
      ...breakdown,
      {
        id: `b_${Date.now()}`,
        category: 'Miscellaneous Fee',
        amount: 2000,
        description: 'Institutional facilities'
      }
    ]);
  };

  const handleRemoveBreakdownItem = (index: number) => {
    if (breakdown.length <= 1) return;
    setBreakdown(breakdown.filter((_, idx) => idx !== index));
  };

  const handleBreakdownChange = (index: number, field: keyof FeeBreakdownItem, value: any) => {
    const updated = [...breakdown];
    updated[index] = { ...updated[index], [field]: value };
    setBreakdown(updated);
  };

  const calculatedTotal = breakdown.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const handleAssignFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotal <= 0) {
      setFormError('Total fee structure must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        title: feeTitle,
        feeType,
        totalAmount: calculatedTotal,
        breakdown,
        dueDate,
        academicYear: targetAcademicYear,
        semester: targetSemester,
        lateFinePerDay,
        remarks
      };

      if (targetMode === 'INDIVIDUAL') {
        payload.studentId = selectedStudentId;
      } else {
        payload.targetDepartment = targetDepartment;
        payload.targetSemester = targetSemester;
        payload.targetAcademicYear = targetAcademicYear;
      }

      const res = await api.assignFee(payload);
      if (!res.success) throw new Error(res.message || 'Failed to assign fee vouchers.');

      setIsAssignModalOpen(false);
      fetchFeesAndStudents();
    } catch (err: any) {
      setFormError(err.message || 'Error creating fee records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee voucher?')) return;
    try {
      await api.deleteFee(feeId);
      fetchFeesAndStudents();
    } catch (err) {
      console.error('Error deleting fee:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Fee Structures & Voucher Allocations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create semester tuition structures, assign custom line items, and manage batch fee demands
          </p>
        </div>

        <button
          id="create-fee-voucher-btn"
          onClick={() => setIsAssignModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate / Assign Fee Structure</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-fees-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by fee title, student name, or roll number..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            id="filter-fee-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>

        <div>
          <select
            id="filter-fee-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Fee Types</option>
            <option value="SEMESTER_FEE">Semester Fee</option>
            <option value="EXAM_FEE">Exam Fee</option>
            <option value="HOSTEL_FEE">Hostel & Mess Fee</option>
            <option value="TRANSPORT_FEE">Transport Fee</option>
          </select>
        </div>
      </div>

      {/* Fees List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {fees.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No fee records found</p>
            <p className="text-xs text-slate-500">Create a new fee structure using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fee Voucher & Student</th>
                  <th className="py-3 px-4">Type & Sem</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Billed</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Pending Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.map((fee) => (
                  <tr key={fee._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{fee.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {fee.studentName} ({fee.rollNumber})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {fee.feeType}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">Sem {fee.semester}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{fee.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                      ₹{fee.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-black text-rose-600">
                      ₹{fee.pendingAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          fee.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : fee.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {fee.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteFee(fee._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Fee Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign / Create Fee Structure Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Create & Allocate Fee Structure</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignFeeSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Allocation Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetMode('DEPARTMENT')}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      targetMode === 'DEPARTMENT'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 font-bold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 font-medium text-slate-700'
                    }`}
                  >
                    <Building className="w-4 h-4 mb-1 text-indigo-600" />
                    <span>Entire Department / Batch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('INDIVIDUAL')}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      targetMode === 'INDIVIDUAL'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 font-bold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 font-medium text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-1 text-indigo-600" />
                    <span>Individual Student</span>
                  </button>
                </div>
              </div>

              {/* Target Fields */}
              {targetMode === 'INDIVIDUAL' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.rollNumber}) — {s.department} (Sem {s.semester})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                    >
                      <option value="Computer Science and Engineering">Computer Science</option>
                      <option value="Information Technology">Information Tech</option>
                      <option value="Electronics & Communication">Electronics & Comm</option>
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={targetSemester}
                      onChange={(e) => setTargetSemester(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Academic Batch</label>
                    <input
                      type="text"
                      value={targetAcademicYear}
                      onChange={(e) => setTargetAcademicYear(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Title & Type & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Fee Structure Title *</label>
                  <input
                    type="text"
                    required
                    value={feeTitle}
                    onChange={(e) => setFeeTitle(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="e.g. 8th Semester Tuition Fee"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Category</label>
                  <select
                    value={feeType}
                    onChange={(e) => setFeeType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    <option value="SEMESTER_FEE">Semester Fee</option>
                    <option value="EXAM_FEE">Examination Fee</option>
                    <option value="HOSTEL_FEE">Hostel Fee</option>
                    <option value="TRANSPORT_FEE">Transport Fee</option>
                    <option value="SPECIAL_FEE">Special / Fine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Late Fine per Day (₹)</label>
                  <input
                    type="number"
                    value={lateFinePerDay}
                    onChange={(e) => setLateFinePerDay(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              {/* Dynamic Line-Item Breakdown */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Itemized Components Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBreakdownItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {breakdown.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <input
                        type="text"
                        placeholder="Category Name"
                        value={item.category}
                        onChange={(e) => handleBreakdownChange(idx, 'category', e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => handleBreakdownChange(idx, 'amount', Number(e.target.value))}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 bg-white font-extrabold text-slate-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBreakdownItem(idx)}
                        disabled={breakdown.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total Calculated */}
                <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">Total Calculated Amount:</span>
                  <span className="font-black text-indigo-900 text-base">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Allocating Fee...' : 'Generate & Allocate Fee'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
