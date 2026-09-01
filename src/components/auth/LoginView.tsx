import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  Home,
  HelpCircle,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminRegisterModal } from './AdminRegisterModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onSwitchToRegister: () => void;
  initialRole?: 'STUDENT' | 'ADMIN';
  initialEmail?: string;
  initialSuccessMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSwitchToRegister,
  initialRole = 'STUDENT',
  initialEmail,
  initialSuccessMessage
}) => {
  const { login, loginAsDemo, isLoading, sessionTimeoutMessage, dismissSessionTimeout } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'ADMIN'>(initialRole);
  const [identifier, setIdentifier] = useState(initialEmail || (initialRole === 'STUDENT' ? '21CS101' : 'admin@college.edu'));
  const [password, setPassword] = useState(initialEmail ? '' : (initialRole === 'STUDENT' ? 'Student@123' : 'Admin@123'));
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccessMessage || null);
  const [showAdminRegister, setShowAdminRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setIdentifier(initialEmail);
      setRole(initialRole);
    }
    if (initialSuccessMessage) {
      setSuccessMessage(initialSuccessMessage);
    }
  }, [initialEmail, initialSuccessMessage, initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    dismissSessionTimeout();

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMessage('Please enter both email/username and password.');
      return;
    }

    try {
      await login(cleanIdentifier, password, role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    }
  };

  const handleRoleToggle = (newRole: 'STUDENT' | 'ADMIN') => {
    setRole(newRole);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newRole === 'STUDENT') {
      setIdentifier('21CS101');
      setPassword('Student@123');
    } else {
      setIdentifier('admin@college.edu');
      setPassword('Admin@123');
    }
  };

  const handleAdminRegisterSuccess = (message: string, registeredEmail: string) => {
    setShowAdminRegister(false);
    setRole('ADMIN');
    setIdentifier(registeredEmail);
    setPassword('');
    setErrorMessage(null);
    setSuccessMessage(message || 'Admin account created successfully. Please login.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        
        {/* College Graduation Cap / Brand Logo */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/40 ring-4 ring-slate-800">
          <GraduationCap className="w-8 h-8" />
        </div>

        {/* Portal Titles */}
        <h1 className="mt-3.5 text-2xl font-black text-white tracking-tight">
          Smart College Fee Portal
        </h1>
        <p className="text-xs font-bold text-indigo-400 mt-1 uppercase tracking-wider">
          {role === 'STUDENT' ? 'Student Portal' : 'Admin & Finance Portal'}
        </p>

        {/* Demo Fast-Switch Bar for Evaluation */}
        <div className="mt-3.5 p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl backdrop-blur-xs text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            ⚡ Quick 1-Click Evaluation Personas:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="demo-login-student-btn"
              onClick={() => loginAsDemo('STUDENT')}
              className="py-1.5 px-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login as Student</span>
            </button>
            <button
              type="button"
              id="demo-login-admin-btn"
              onClick={() => loginAsDemo('ADMIN')}
              className="py-1.5 px-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login as Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          
          {/* Card Header & Role Toggle Segment */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {role === 'STUDENT' ? 'Student Login' : 'Admin / Finance Login'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {role === 'STUDENT'
                  ? 'Sign in to access your fee balance & receipts'
                  : 'Sign in to manage institutional finance'}
              </p>
            </div>

            {/* Switch Mode Pill */}
            <button
              type="button"
              id="toggle-portal-mode-btn"
              onClick={() => handleRoleToggle(role === 'STUDENT' ? 'ADMIN' : 'STUDENT')}
              className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
              title="Switch between Student and Admin portals"
            >
              {role === 'STUDENT' ? <Shield className="w-3 h-3 text-amber-400" /> : <User className="w-3 h-3 text-indigo-400" />}
              <span>{role === 'STUDENT' ? 'Admin Portal' : 'Student Portal'}</span>
            </button>
          </div>

          {/* Session Inactivity Timeout Notice */}
          {sessionTimeoutMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-xs text-amber-200 flex items-start justify-between gap-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Session Expired for Security</p>
                  <p className="mt-0.5 text-amber-200/90 text-[11px] leading-relaxed">{sessionTimeoutMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSessionTimeout}
                className="text-amber-400 hover:text-amber-200 p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success notice */}
          {successMessage && (
            <div
              id="login-success-banner"
              className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200 flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300">Success</p>
                <p className="mt-0.5 text-emerald-200/90 text-[11px] leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div
              id="login-error-banner"
              className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {role === 'STUDENT' ? 'Student Email / Username' : 'Admin Email / Username'}
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
                  placeholder={role === 'STUDENT' ? 'e.g. student@college.edu or 21CS101' : 'admin@college.edu'}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  id="show-hide-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-1 text-right">
                <span className="text-[10px] text-slate-400 font-mono">
                  Default Demo: <span className="text-indigo-400 font-semibold">{role === 'STUDENT' ? 'Student@123' : 'Admin@123'}</span>
                </span>
              </div>
            </div>

            {/* Primary Action Button: "Sign In to Student Portal" */}
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
                  <span>{role === 'STUDENT' ? 'Sign In to Student Portal' : 'Sign In to Admin Hub'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secondary Action: "Create Student Account" */}
          {role === 'STUDENT' && (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                id="create-student-account-btn"
                onClick={onSwitchToRegister}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Student Account</span>
              </button>

              <p className="text-center text-[11px] text-slate-400">
                New students must register with their institutional Roll Number and Registration Number.
              </p>
            </div>
          )}

          {/* Admin / Finance Registration Trigger */}
          {role === 'ADMIN' && (
            <div className="pt-2 border-t border-slate-700/60 text-center">
              <p className="text-xs text-slate-400">
                Need an administrator or finance account?{' '}
                <button
                  type="button"
                  id="switch-to-admin-register-btn"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setShowAdminRegister(true);
                  }}
                  className="text-amber-400 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Create Admin / Finance Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Admin & Finance Registration Modal */}
      <AdminRegisterModal
        isOpen={showAdminRegister}
        onClose={() => setShowAdminRegister(false)}
        onSuccess={handleAdminRegisterSuccess}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        defaultEmail={identifier}
        role={role}
      />

    </div>
  );
};
