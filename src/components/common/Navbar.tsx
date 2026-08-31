import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Bell,
  ShieldCheck,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Search,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DemoAccount } from '../../types';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, quickLoginAsDemo } = useAuth();
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api.getDemoAccounts().then((res) => {
      if (res.success) {
        setDemoAccounts(res.accounts);
      }
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <button
              id="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle Navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 tracking-tight text-lg">EduPay</span>
                  <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                    Razorpay
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Smart College Fee & Management Portal</p>
              </div>
            </div>
          </div>

          {/* Quick Demo Persona Switcher & User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Demo Switcher Dropdown */}
            <div className="relative">
              <button
                id="demo-switcher-btn"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200/80 cursor-pointer"
                title="Switch between Student and Admin demo profiles"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden md:inline">Switch Demo Role:</span>
                <span className="font-bold text-indigo-700">
                  {user?.role === 'ADMIN' ? 'Admin / Finance' : 'Student'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showDemoMenu && (
                <div
                  id="demo-accounts-dropdown"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Test Personas (1-Click Switch)</p>
                    <p className="text-[11px] text-slate-500">Easily inspect student checkout or admin controls</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {demoAccounts.map((acc, idx) => (
                      <button
                        key={idx}
                        id={`demo-user-switch-${idx}`}
                        onClick={() => {
                          quickLoginAsDemo(acc);
                          setShowDemoMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50/70 transition flex items-start gap-2.5 cursor-pointer ${
                          user?.email === acc.email ? 'bg-indigo-50/90 border-l-4 border-indigo-600' : ''
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            acc.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {acc.role === 'ADMIN' ? 'A' : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900">{acc.name}</p>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                                acc.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {acc.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">{acc.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{acc.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border">
              {user?.role === 'ADMIN' ? (
                <div className="flex items-center gap-1 text-purple-700 bg-purple-50 border-purple-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Mode</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-blue-700 bg-blue-50 border-blue-200 px-2 py-0.5 rounded-full">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Student Portal</span>
                </div>
              )}
            </div>

            {/* User Profile / Logout Dropdown */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-800 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[130px]">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-1 truncate max-w-[130px]">{user?.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div
                  id="user-menu-popover"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50"
                >
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    {user?.student?.rollNumber && (
                      <p className="text-[11px] font-mono font-semibold text-indigo-600 mt-0.5">
                        Roll: {user.student.rollNumber}
                      </p>
                    )}
                  </div>
                  <button
                    id="logout-btn"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 font-semibold hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
