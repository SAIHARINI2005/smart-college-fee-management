import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  History,
  User,
  Users,
  Layers,
  Receipt,
  FileBarChart2,
  Activity,
  Shield,
  BookOpen,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab =
  // Student tabs
  | 'student-dashboard'
  | 'student-pay-fee'
  | 'student-history'
  | 'student-profile'
  // Admin tabs
  | 'admin-dashboard'
  | 'admin-students'
  | 'admin-fees'
  | 'admin-payments'
  | 'admin-reports'
  | 'admin-audit-logs';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen = false,
  onClose
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const studentNavItems: NavItem[] = [
    { id: 'student-dashboard', label: 'Dashboard & Overview', icon: LayoutDashboard },
    { id: 'student-pay-fee', label: 'Fee Breakdown & Pay', icon: CreditCard, highlight: true },
    { id: 'student-history', label: 'Payment History & Receipts', icon: History },
    { id: 'student-profile', label: 'Student Profile', icon: User }
  ];

  const adminNavItems: NavItem[] = [
    { id: 'admin-dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { id: 'admin-students', label: 'Student Directory', icon: Users },
    { id: 'admin-fees', label: 'Fee Structures & Assign', icon: Layers },
    { id: 'admin-payments', label: 'Payment Transactions', icon: Receipt },
    { id: 'admin-reports', label: 'Financial Reports & Defaulters', icon: FileBarChart2 },
    { id: 'admin-audit-logs', label: 'Security & Audit Trail', icon: Activity }
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const handleItemClick = (id: ActiveTab) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Section title */}
          <div className="px-3 mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Administration Controls' : 'Student Academic Hub'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security and Razorpay Gateway Info Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Razorpay Verified</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              256-bit SSL secured payments with automated HMAC-SHA256 signature verification.
            </p>
          </div>

          <div className="px-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>CSE Final Year Project</span>
            <span className="font-mono text-indigo-400 font-semibold">2026 Batch</span>
          </div>
        </div>
      </aside>
    </>
  );
};
