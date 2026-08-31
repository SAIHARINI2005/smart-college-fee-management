import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const { login, loginAsDemo, isLoading } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT');
  const [identifier, setIdentifier] = useState('21CS101'); // student roll or email
  const [password, setPassword] = useState('Student@123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await login(identifier, password, role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials.');
    }
  };

  const handleRoleToggle = (newRole: 'STUDENT' | 'ADMIN') => {
    setRole(newRole);
    setErrorMessage(null);
    if (newRole === 'STUDENT') {
      setIdentifier('21CS101');
      setPassword('Student@123');
    } else {
      setIdentifier('admin@college.edu');
      setPassword('Admin@123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        
        {/* Brand Logo */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/40 ring-4 ring-slate-800">
          <GraduationCap className="w-8 h-8" />
        </div>

        <h1 className="mt-4 text-2xl font-black text-white tracking-tight">
          Smart College Fee Portal
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Final-Year CSE Project • Secured by Razorpay & JWT
        </p>

        {/* Demo Fast-Switch Bar */}
        <div className="mt-4 p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl backdrop-blur-xs text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            ⚡ Quick 1-Click Evaluation Personas:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="demo-login-student-btn"
              onClick={() => loginAsDemo('STUDENT')}
              className="py-1.5 px-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login as Student</span>
            </button>
            <button
              type="button"
              id="demo-login-admin-btn"
              onClick={() => loginAsDemo('ADMIN')}
              className="py-1.5 px-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login as Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          
          {/* Role Selection Segmented Control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/80 rounded-2xl border border-slate-700/60">
            <button
              type="button"
              id="role-select-student"
              onClick={() => handleRoleToggle('STUDENT')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'STUDENT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              id="role-select-admin"
              onClick={() => handleRoleToggle('ADMIN')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Finance</span>
            </button>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {role === 'STUDENT' ? 'Roll Number or Student Email' : 'Admin Username / Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  id="login-identifier-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={role === 'STUDENT' ? 'e.g. 22CS101 or student@college.edu' : 'admin@college.edu'}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-indigo-400 font-mono">
                  Default: {role === 'STUDENT' ? 'Student@123' : 'Admin@123'}
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {role === 'STUDENT' ? 'Student Portal' : 'Admin Hub'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Student self-registration switch */}
          {role === 'STUDENT' && (
            <div className="pt-3 border-t border-slate-700/60 text-center">
              <p className="text-xs text-slate-400">
                New student admission?{' '}
                <button
                  type="button"
                  id="switch-to-register-btn"
                  onClick={onSwitchToRegister}
                  className="text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  Register Account Here →
                </button>
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
