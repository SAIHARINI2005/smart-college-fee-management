import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  GraduationCap,
  Download,
  Receipt,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Student, FeeRecord, PaymentRecord, ReceiptData } from '../../types';
import { api } from '../../services/api';
import { DigitalReceiptModal } from '../common/DigitalReceiptModal';

export const StudentManagementView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [quotaFilter, setQuotaFilter] = useState('ALL');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Active target student
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<FeeRecord[]>([]);
  const [studentPayments, setStudentPayments] = useState<PaymentRecord[]>([]);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    registrationNo: '',
    course: 'B.Tech - Computer Science & Engineering',
    department: 'Computer Science and Engineering',
    semester: 1,
    academicYear: '2025-2026',
    admissionQuota: 'MERIT',
    feeCategory: 'REGULAR',
    guardianName: '',
    guardianPhone: '',
    address: '',
    initialFeeAmount: 65000,
    password: 'Student@123'
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminStudents({
        search,
        department: departmentFilter,
        semester: semesterFilter,
        quota: quotaFilter
      });
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, departmentFilter, semesterFilter, quotaFilter]);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      rollNumber: `25CS${Math.floor(100 + Math.random() * 900)}`,
      registrationNo: '',
      course: 'B.Tech - Computer Science & Engineering',
      department: 'Computer Science and Engineering',
      semester: 1,
      academicYear: '2025-2026',
      admissionQuota: 'MERIT',
      feeCategory: 'REGULAR',
      guardianName: '',
      guardianPhone: '',
      address: '',
      initialFeeAmount: 65000,
      password: 'Student@123'
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setActiveStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      rollNumber: student.rollNumber,
      registrationNo: student.registrationNo,
      course: student.course,
      department: student.department,
      semester: student.semester,
      academicYear: student.academicYear,
      admissionQuota: student.admissionQuota,
      feeCategory: student.feeCategory,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      address: student.address,
      status: student.status
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = async (student: Student) => {
    setActiveStudent(student);
    setIsDetailDrawerOpen(true);
    try {
      const res = await api.getAdminStudentDetails(student._id);
      if (res.success) {
        setStudentFees(res.fees);
        setStudentPayments(res.payments);
      }
    } catch (err) {
      console.error('Error loading student details:', err);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (isEditModalOpen && activeStudent) {
        const res = await api.updateStudent(activeStudent._id, formData);
        if (!res.success) throw new Error(res.message || 'Failed to update student.');
        setIsEditModalOpen(false);
      } else {
        const res = await api.createStudent(formData);
        if (!res.success) throw new Error(res.message || 'Failed to create student.');
        setIsAddModalOpen(false);
      }
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || 'Error saving student record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!activeStudent) return;
    setIsSaving(true);
    try {
      await api.deleteStudent(activeStudent._id);
      setIsDeleteConfirmOpen(false);
      setActiveStudent(null);
      fetchStudents();
    } catch (err) {
      console.error('Error deleting student:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await api.getReceipt(paymentId);
      if (res.success) {
        setSelectedReceipt(res.receipt);
        setIsReceiptOpen(true);
      }
    } catch (err) {
      console.error('Error viewing receipt:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Student Admissions & Fee Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student enrollments, academic profiles, quotas, and fee ledger history
          </p>
        </div>

        <button
          id="add-student-btn"
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Enroll New Student</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="admin-student-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            id="admin-filter-dept"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science and Engineering">Computer Science</option>
            <option value="Information Technology">Information Tech</option>
            <option value="Electronics & Communication">Electronics & Comm</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
          </select>
        </div>

        {/* Semester Filter */}
        <div>
          <select
            id="admin-filter-sem"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        {/* Quota Filter */}
        <div>
          <select
            id="admin-filter-quota"
            value={quotaFilter}
            onChange={(e) => setQuotaFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Quotas</option>
            <option value="MERIT">Merit</option>
            <option value="MANAGEMENT">Management</option>
            <option value="GOVERNMENT">Government</option>
            <option value="SPORTS">Sports</option>
          </select>
        </div>

      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No student records found</p>
            <p className="text-xs text-slate-500">Try changing search filters or enroll a new student.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Department & Sem</th>
                  <th className="py-3 px-4">Quota / Category</th>
                  <th className="py-3 px-4">Fee Overview</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std) => (
                  <tr key={std._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {std.rollNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{std.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{std.email}</span>
                        <span>•</span>
                        <span>{std.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{std.department}</div>
                      <div className="text-[10px] text-slate-400">Sem {std.semester} ({std.academicYear})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{std.admissionQuota}</span>
                      <span className="block text-[10px] text-indigo-600 font-medium">{std.feeCategory}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {std.feeStats ? (
                        <div>
                          <div className="font-extrabold text-slate-900">
                            ₹{std.feeStats.paidFee.toLocaleString('en-IN')} / ₹{std.feeStats.totalFee.toLocaleString('en-IN')}
                          </div>
                          {std.feeStats.pendingFee > 0 ? (
                            <span className="text-[10px] font-bold text-rose-600">
                              Pending: ₹{std.feeStats.pendingFee.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600">
                              All Cleared
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          std.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {std.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`view-student-btn-${std._id}`}
                          onClick={() => handleOpenDetails(std)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="View Ledger & Fee History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          id={`edit-student-btn-${std._id}`}
                          onClick={() => handleOpenEditModal(std)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`delete-student-btn-${std._id}`}
                          onClick={() => {
                            setActiveStudent(std);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {isEditModalOpen ? 'Edit Student Profile' : 'Enroll New Student'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="e.g. Rohan Varma"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono font-bold"
                    placeholder="25CS101"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="student@college.edu"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admission Quota</label>
                  <select
                    value={formData.admissionQuota}
                    onChange={(e) => setFormData({ ...formData, admissionQuota: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    <option value="MERIT">Merit Quota</option>
                    <option value="MANAGEMENT">Management Quota</option>
                    <option value="GOVERNMENT">Government Subsidy</option>
                    <option value="SPORTS">Sports Quota</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Category</label>
                  <select
                    value={formData.feeCategory}
                    onChange={(e) => setFormData({ ...formData, feeCategory: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
                  >
                    <option value="REGULAR">Regular Fee</option>
                    <option value="SCHOLARSHIP">Scholarship Subsidized</option>
                    <option value="TFWS">TFWS (100% Tuition Waiver)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="Parent / Guardian"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="+91 98480 12345"
                  />
                </div>
              </div>

              {!isEditModalOpen && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <label className="block font-bold text-slate-800 mb-1">Initial Semester Fee Assignment (₹)</label>
                  <input
                    type="number"
                    value={formData.initialFeeAmount}
                    onChange={(e) => setFormData({ ...formData, initialFeeAmount: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-bold text-indigo-700"
                    placeholder="65000"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    An initial fee voucher will be generated for this student.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : isEditModalOpen ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Ledger Drawer */}
      {isDetailDrawerOpen && activeStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Student Ledger</span>
                  <h3 className="text-base font-bold text-white">{activeStudent.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Roll: {activeStudent.rollNumber} • {activeStudent.department}</p>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6">
                
                {/* Fee Structures */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Assigned Fee Vouchers ({studentFees.length})</span>
                  </h4>

                  <div className="space-y-3">
                    {studentFees.map((fee) => (
                      <div key={fee._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{fee.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              fee.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {fee.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                          <span>Total: <strong>₹{fee.totalAmount.toLocaleString('en-IN')}</strong></span>
                          <span>Paid: <strong className="text-emerald-600">₹{fee.paidAmount.toLocaleString('en-IN')}</strong></span>
                          <span>Pending: <strong className="text-rose-600">₹{fee.pendingAmount.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payments */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Transaction History ({studentPayments.length})</span>
                  </h4>

                  {studentPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No payments logged yet for this student.</p>
                  ) : (
                    <div className="space-y-2">
                      {studentPayments.map((p) => (
                        <div key={p._id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-indigo-700">{p.receiptNumber}</span>
                            <p className="text-slate-500">{new Date(p.transactionDate).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 text-sm">₹{p.amount.toLocaleString('en-IN')}</span>
                            {p.status === 'SUCCESS' && (
                              <button
                                onClick={() => handleViewReceipt(p._id)}
                                className="block text-[11px] text-indigo-600 hover:underline font-bold mt-0.5 cursor-pointer"
                              >
                                View Receipt →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Delete Student Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{activeStudent.name}</strong> ({activeStudent.rollNumber})?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="py-2 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={isSaving}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
              >
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
