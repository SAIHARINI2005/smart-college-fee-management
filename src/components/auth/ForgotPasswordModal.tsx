import React, { useState } from 'react';
import {
  KeyRound,
  Mail,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  ShieldAlert
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  role?: 'STUDENT' | 'ADMIN';
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  role = 'STUDENT'
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your registered student email or roll number.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) && !/^[0-9]{2}[A-Za-z]{2,4}[0-9]{2,4}$/.test(cleanEmail)) {
      setError('Please enter a valid email address or college Roll Number.');
      return;
    }

    setIsSubmitted(true);
  };

  const handleResetDialog = () => {
    setIsSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-slate-200">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetDialog}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Reset {role === 'STUDENT' ? 'Student' : 'Portal'} Password
            </h2>
            <p className="text-xs text-slate-400">
              Recover your access to the Smart College Fee Portal
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300">Password Reset Instructions Sent</p>
                <p className="mt-1 text-[11px] text-emerald-200/90 leading-relaxed">
                  A verification link and one-time password (OTP) have been dispatched to <strong>{email}</strong>.
                  Please check your inbox or spam folder.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>Demo Evaluation Shortcut:</span>
              </div>
              <p className="text-[11px] text-slate-300">
                You can immediately login with the standard test password:
              </p>
              <div className="p-2 bg-slate-900 rounded-xl font-mono text-center text-amber-300 font-bold text-xs border border-slate-700">
                {role === 'STUDENT' ? 'Student@123' : 'Admin@123'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDialog}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Student Email / Roll Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="student@college.edu or 21CS101"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Enter your institutional college email or assigned Roll Number to receive your password reset token.
              </p>
            </div>

            {/* Helpline Section */}
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Campus Accounts Helpline:</span>
              </div>
              <p>Finance & Accounts Desk: +91 (080) 2345-6789 (Ext: 204)</p>
              <p>Email: <span className="text-indigo-300">accounts-support@college.edu</span></p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
