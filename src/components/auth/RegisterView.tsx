import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Phone,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  Calendar,
  Hash,
  ShieldCheck,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Sparkles,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterViewProps {
  onSwitchToLogin: (registeredEmail?: string, successMessage?: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    // 1. Personal Details
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // 2. Academic Details
    rollNumber: '',
    course: 'B.Tech - Computer Science & Engineering',
    department: 'Computer Science and Engineering',
    semester: 1,
    academicYear: '2025-2026',
    admissionQuota: 'MERIT',
    feeCategory: 'REGULAR',

    // 3. Contact & Guardian Details
    guardianName: '',
    guardianPhone: '',
    address: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Password validation checks
  const password = formData.password;
  const isMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordStrong = isMinLength && hasUpper && hasLower && hasDigitOrSpecial;
  const doPasswordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  // Indian Phone validation helpers
  const validatePhone = (num: string) => {
    const digits = num.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(formData.email.trim());
  const isPhoneValid = validatePhone(formData.phone);
  const isGuardianPhoneValid = !formData.guardianPhone || validatePhone(formData.guardianPhone);

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  // Auto-generate sample student data for 1-click test evaluation
  const handleAutoFillSample = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setFormData({
      name: 'Aditya Verma',
      email: `aditya.verma${randomNum}@college.edu`,
      phone: '9876543210',
      password: 'Student@123',
      confirmPassword: 'Student@123',

      rollNumber: `25CS${randomNum}`,
      course: 'B.Tech - Computer Science & Engineering',
      department: 'Computer Science and Engineering',
      semester: 1,
      academicYear: '2025-2026',
      admissionQuota: 'MERIT',
      feeCategory: 'REGULAR',

      guardianName: 'Ramesh Verma',
      guardianPhone: '9876501234',
      address: 'Plot 42, HSR Layout, Sector 2, Bengaluru, Karnataka - 560102'
    });
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Required fields check
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.rollNumber.trim() ||
      !formData.course.trim() ||
      !formData.department.trim() ||
      !formData.password
    ) {
      setErrorMessage('Please fill in all required fields marked with *');
      return;
    }

    // 2. Email format validation
    if (!isEmailValid) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // 3. Indian mobile number format validation
    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (formData.guardianPhone && !isGuardianPhoneValid) {
      setErrorMessage('Guardian phone must be a valid 10-digit Indian phone number.');
      return;
    }

    // 4. Password matching check
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // 5. Password strength check
    if (!isPasswordStrong) {
      setErrorMessage(
        'Password must be at least 8 characters long and include uppercase, lowercase, and a number or special character.'
      );
      return;
    }

    try {
      const res = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        course: formData.course.trim(),
        department: formData.department.trim(),
        semester: Number(formData.semester),
        academicYear: formData.academicYear.trim(),
        admissionQuota: formData.admissionQuota,
        feeCategory: formData.feeCategory,
        guardianName: formData.guardianName.trim() || 'Parent / Guardian',
        guardianPhone: formData.guardianPhone.trim() || formData.phone.trim(),
        address: formData.address.trim() || 'Campus Hostel / Residence',
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      // Successful registration redirect to Student Login with pre-filled email
      onSwitchToLogin(
        formData.email.trim().toLowerCase(),
        res?.message || 'Student account created successfully. Please login.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please verify your details.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 text-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/40 ring-4 ring-slate-800">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="mt-3 text-2xl font-black text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Register to access your College Fee Management Portal
        </p>

        {/* Quick Sample Autofill for Evaluation */}
        <div className="mt-2.5 inline-flex items-center gap-2">
          <button
            type="button"
            id="student-autofill-sample-btn"
            onClick={handleAutoFillSample}
            className="py-1 px-3 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>⚡ Fill Sample Student Data</span>
          </button>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          
          {/* Error Banner */}
          {errorMessage && (
            <div
              id="student-register-error-banner"
              className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300">Registration Error</p>
                <p className="mt-0.5 text-rose-200/90 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* SECTION 1: PERSONAL DETAILS */}
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700/60">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>1. Personal Details</span>
                </h2>
                <span className="text-[10px] text-slate-400">All fields required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      id="student-reg-name-input"
                      value={formData.name}
                      onBlur={() => handleBlur('name')}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                      placeholder="e.g. Aditya Verma"
                    />
                  </div>
                </div>

                {/* Student Email */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Student Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      id="student-reg-email-input"
                      value={formData.email}
                      onBlur={() => handleBlur('email')}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs ${
                        touchedFields.email && !isEmailValid ? 'border-rose-500' : 'border-slate-700'
                      }`}
                      placeholder="student@college.edu"
                    />
                  </div>
                  {touchedFields.email && !isEmailValid && (
                    <p className="text-[10px] text-rose-400 mt-1">Please enter a valid email address.</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Mobile Number (Indian 10-digit) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      id="student-reg-phone-input"
                      value={formData.phone}
                      onBlur={() => handleBlur('phone')}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs ${
                        touchedFields.phone && !isPhoneValid ? 'border-rose-500' : 'border-slate-700'
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                  {touchedFields.phone && !isPhoneValid && (
                    <p className="text-[10px] text-rose-400 mt-1">Please enter a valid 10-digit Indian phone number.</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      id="student-reg-password-input"
                      value={formData.password}
                      onBlur={() => handleBlur('password')}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      id="student-reg-confirmpassword-input"
                      value={formData.confirmPassword}
                      onBlur={() => handleBlur('confirmPassword')}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`w-full pl-9 pr-10 py-2 rounded-xl bg-slate-900 border text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs ${
                        touchedFields.confirmPassword && !doPasswordsMatch ? 'border-rose-500' : 'border-slate-700'
                      }`}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {touchedFields.confirmPassword && !doPasswordsMatch && (
                    <p className="text-[10px] text-rose-400 mt-1">Passwords do not match.</p>
                  )}
                </div>

              </div>

              {/* Password strength checklist */}
              <div className="mt-2 p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[10px] grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <div className={`flex items-center gap-1 ${isMinLength ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${isMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>8+ Chars</span>
                </div>
                <div className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasUpper ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1 ${hasLower && hasDigitOrSpecial ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasLower && hasDigitOrSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Lower & Number</span>
                </div>
                <div className={`flex items-center gap-1 ${doPasswordsMatch ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${doPasswordsMatch ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Match</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: ACADEMIC DETAILS */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700/60">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Academic Details</span>
                </h2>
                <span className="text-[10px] text-slate-400">Institutional ID & Branch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Roll Number */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Student Roll Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      id="student-reg-roll-input"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs uppercase"
                      placeholder="e.g. 25CS301"
                    />
                  </div>
                </div>

                {/* Course */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Course <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-course-select"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      <option value="B.Tech - Computer Science & Engineering">B.Tech - Computer Science & Engineering</option>
                      <option value="B.Tech - Information Technology">B.Tech - Information Technology</option>
                      <option value="B.Tech - Electronics & Communication">B.Tech - Electronics & Communication</option>
                      <option value="B.Tech - Mechanical Engineering">B.Tech - Mechanical Engineering</option>
                      <option value="MCA - Master of Computer Applications">MCA - Master of Computer Applications</option>
                      <option value="MBA - Master of Business Administration">MBA - Master of Business Administration</option>
                    </select>
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-dept-select"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Management Studies">Management Studies</option>
                      <option value="Computer Applications">Computer Applications</option>
                    </select>
                  </div>
                </div>

                {/* Semester */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Semester <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-semester-select"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Academic Year <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-year-select"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2023-2024">2023-2024</option>
                      <option value="2022-2023">2022-2023</option>
                    </select>
                  </div>
                </div>

                {/* Admission Quota */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Admission Quota
                  </label>
                  <div className="relative">
                    <Award className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-quota-select"
                      value={formData.admissionQuota}
                      onChange={(e) => setFormData({ ...formData, admissionQuota: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      <option value="MERIT">Merit / State Counseling</option>
                      <option value="MANAGEMENT">Management Quota</option>
                      <option value="SPORTS">Sports Quota</option>
                      <option value="GOVERNMENT">Government Sponsored</option>
                    </select>
                  </div>
                </div>

                {/* Fee Category */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Fee Category
                  </label>
                  <div className="relative">
                    <Award className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="student-reg-category-select"
                      value={formData.feeCategory}
                      onChange={(e) => setFormData({ ...formData, feeCategory: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs cursor-pointer"
                    >
                      <option value="REGULAR">Regular Fee Structure</option>
                      <option value="SCHOLARSHIP">Merit Scholarship</option>
                      <option value="TFWS">Tuition Fee Waiver Scheme (TFWS)</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 3: CONTACT DETAILS */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700/60">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>3. Contact & Guardian Details</span>
                </h2>
                <span className="text-[10px] text-slate-400">Emergency & Residence</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Guardian Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Guardian Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="student-reg-guardian-name-input"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                      placeholder="e.g. Ramesh Verma"
                    />
                  </div>
                </div>

                {/* Guardian Phone */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Guardian Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      id="student-reg-guardian-phone-input"
                      value={formData.guardianPhone}
                      onBlur={() => handleBlur('guardianPhone')}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs ${
                        touchedFields.guardianPhone && !isGuardianPhoneValid ? 'border-rose-500' : 'border-slate-700'
                      }`}
                      placeholder="9876501234"
                    />
                  </div>
                  {touchedFields.guardianPhone && !isGuardianPhoneValid && (
                    <p className="text-[10px] text-rose-400 mt-1">Please enter a valid 10-digit phone number.</p>
                  )}
                </div>

                {/* Residential Address */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Residential Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      id="student-reg-address-input"
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs resize-none"
                      placeholder="Street Address, City, State, Pincode"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                id="create-student-account-submit-btn"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                id="back-to-student-login-btn"
                onClick={() => onSwitchToLogin()}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Student Login</span>
              </button>
            </div>

          </form>

        </div>
      </div>

    </div>
  );
};
