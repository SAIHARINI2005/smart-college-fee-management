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
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: `25CS${Math.floor(100 + Math.random() * 900)}`,
    registrationNo: `REG-2025-${Math.floor(1000 + Math.random() * 9000)}`,
    course: 'B.Tech - Computer Science & Engineering',
    department: 'Computer Science and Engineering',
    semester: 1,
    academicYear: '2025-2026',
    admissionQuota: 'MERIT',
    feeCategory: 'REGULAR',
    guardianName: '',
    guardianPhone: '',
    address: '',
    password: 'Student@123'
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name || !formData.email || !formData.rollNumber || !formData.password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      await register(formData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 text-center mb-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl ring-4 ring-slate-800">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="mt-3 text-2xl font-black text-white tracking-tight">
          Student Portal Self-Registration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Create student credentials and automatically initialize academic fee structures
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  placeholder="student@college.edu"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Mobile Contact</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Department *</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium cursor-pointer"
                >
                  <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Semester & Quota</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>

                  <select
                    value={formData.admissionQuota}
                    onChange={(e) => setFormData({ ...formData, admissionQuota: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium cursor-pointer"
                  >
                    <option value="MERIT">Merit</option>
                    <option value="MANAGEMENT">Mgmt</option>
                    <option value="GOVERNMENT">Govt</option>
                    <option value="SPORTS">Sports</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                  placeholder="Guardian Name"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Guardian Phone</label>
                <input
                  type="text"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                  placeholder="+91 98480 12345"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-300 mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••••••"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Registration & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-700 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Already registered? Return to Sign In</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
