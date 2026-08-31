import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';

// Student views
import { StudentDashboard } from './components/student/StudentDashboard';
import { FeePaymentView } from './components/student/FeePaymentView';
import { PaymentHistoryView } from './components/student/PaymentHistoryView';
import { StudentProfileView } from './components/student/StudentProfileView';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentManagementView } from './components/admin/StudentManagementView';
import { FeeManagementView } from './components/admin/FeeManagementView';
import { PaymentTransactionsView } from './components/admin/PaymentTransactionsView';
import { ReportsView } from './components/admin/ReportsView';
import { AuditLogsView } from './components/admin/AuditLogsView';

const MainPortal: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    user?.role === 'ADMIN' ? 'admin-dashboard' : 'student-dashboard'
  );

  // Synchronize default tab if role changes
  React.useEffect(() => {
    if (user?.role === 'ADMIN' && !activeTab.startsWith('admin-')) {
      setActiveTab('admin-dashboard');
    } else if (user?.role === 'STUDENT' && !activeTab.startsWith('student-')) {
      setActiveTab('student-dashboard');
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold mt-4">Initializing College Fee Portal...</p>
      </div>
    );
  }

  // If not signed in, show Login or Register view
  if (!isAuthenticated || !user) {
    return authView === 'LOGIN' ? (
      <LoginView onSwitchToRegister={() => setAuthView('REGISTER')} />
    ) : (
      <RegisterView onSwitchToLogin={() => setAuthView('LOGIN')} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      
      {/* Global Top Navbar */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Student Role Views */}
            {user.role === 'STUDENT' && (
              <>
                {activeTab === 'student-dashboard' && (
                  <StudentDashboard
                    onNavigateToPay={() => setActiveTab('student-pay-fee')}
                    onNavigateToHistory={() => setActiveTab('student-history')}
                  />
                )}
                {activeTab === 'student-pay-fee' && <FeePaymentView />}
                {activeTab === 'student-history' && <PaymentHistoryView />}
                {activeTab === 'student-profile' && <StudentProfileView />}
              </>
            )}

            {/* Admin Role Views */}
            {user.role === 'ADMIN' && (
              <>
                {activeTab === 'admin-dashboard' && (
                  <AdminDashboard
                    onNavigateToStudents={() => setActiveTab('admin-students')}
                    onNavigateToFees={() => setActiveTab('admin-fees')}
                    onNavigateToPayments={() => setActiveTab('admin-payments')}
                    onNavigateToReports={() => setActiveTab('admin-reports')}
                  />
                )}
                {activeTab === 'admin-students' && <StudentManagementView />}
                {activeTab === 'admin-fees' && <FeeManagementView />}
                {activeTab === 'admin-payments' && <PaymentTransactionsView />}
                {activeTab === 'admin-reports' && (
                  <ReportsView onBack={() => setActiveTab('admin-dashboard')} />
                )}
                {activeTab === 'admin-audit-logs' && <AuditLogsView />}
              </>
            )}

          </div>
        </main>
      </div>

    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
}

export default App;
