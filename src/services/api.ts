import {
  User,
  FeeRecord,
  PaymentRecord,
  StudentFeeSummary,
  AdminDashboardStats,
  Student,
  ReceiptData,
  AuditLog,
  DemoAccount
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('college_fee_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && (data.inactivityExpired || data.sessionExpired)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('portal:session-inactivity-expired', {
            detail: { message: data.message || 'Session expired due to inactivity.' }
          })
        );
      }
    }
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async login(
    credentials: { email?: string; identifier?: string; password?: string; role?: string } | string,
    password?: string,
    role?: string
  ): Promise<{
    success: boolean;
    token: string;
    user: User;
    message: string;
  }> {
    let payload: { email: string; password: string; role?: string };
    if (typeof credentials === 'string') {
      payload = {
        email: credentials,
        password: password || 'Student@123',
        role: role || 'STUDENT'
      };
    } else {
      payload = {
        email: credentials.email || credentials.identifier || '',
        password: credentials.password || password || '',
        role: credentials.role || role
      };
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async register(studentData: any): Promise<{
    success: boolean;
    message: string;
    email?: string;
    role?: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    return handleResponse(res);
  },

  async registerAdmin(adminData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    role: 'ADMIN' | 'FINANCE';
    registrationCode: string;
  }): Promise<{
    success: boolean;
    message: string;
    email?: string;
    role?: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/register-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getSessionStatus(): Promise<{
    success: boolean;
    authenticated: boolean;
    timeoutMs: number;
    timeoutMinutes: number;
    remainingMs: number;
    lastActive: number;
  }> {
    const res = await fetch(`${API_BASE}/auth/session-status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async pingSession(): Promise<{
    success: boolean;
    refreshed: boolean;
    timeoutMinutes: number;
    remainingMs: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/ping`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getDemoAccounts(): Promise<{ success: boolean; accounts: DemoAccount[] }> {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return handleResponse(res);
  },

  // Student Endpoints
  async getStudentProfile(): Promise<{ success: boolean; student: Student }> {
    const res = await fetch(`${API_BASE}/students/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStudentFeeSummary(): Promise<{
    success: boolean;
    summary: StudentFeeSummary;
    fees: FeeRecord[];
  }> {
    const res = await fetch(`${API_BASE}/students/fee-summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStudentFeeDetail(feeId: string): Promise<{
    success: boolean;
    fee: FeeRecord;
    payments: PaymentRecord[];
  }> {
    const res = await fetch(`${API_BASE}/students/fee/${feeId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStudentPaymentHistory(): Promise<{
    success: boolean;
    payments: PaymentRecord[];
  }> {
    const res = await fetch(`${API_BASE}/students/payment-history`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getReceipt(receiptId: string): Promise<{
    success: boolean;
    receipt: ReceiptData;
  }> {
    try {
      const res = await fetch(`${API_BASE}/payment/receipt/${receiptId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return handleResponse(res);
      }
    } catch {
      // Fallback below
    }

    const fallbackRes = await fetch(`${API_BASE}/students/receipt/${receiptId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(fallbackRes);
  },

  // Razorpay Payment Endpoints
  async getRazorpayKey(): Promise<{ success: boolean; key: string }> {
    const res = await fetch(`${API_BASE}/payment/key`);
    return handleResponse(res);
  },

  async createRazorpayOrder(params: {
    feeId: string;
    amountToPay: number;
    paymentNotes?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    order?: {
      id: string;
      amount: number;
      currency: string;
      receipt: string;
      feeId: string;
      feeTitle: string;
      studentName: string;
      studentRollNumber: string;
      studentEmail: string;
      studentPhone: string;
      key_id: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/payment/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  },

  async verifyRazorpayPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    feeId: string;
    amount: number;
    paymentMethod?: string;
    bank?: string;
    vpa?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    payment: PaymentRecord;
    fee: {
      id: string;
      title: string;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
      status: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/payment/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async logPaymentCancellation(payload: {
    orderId: string;
    feeId: string;
    reason?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/payment/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Admin Endpoints
  async getAdminStats(): Promise<{
    success: boolean;
    stats: AdminDashboardStats;
  }> {
    const res = await fetch(`${API_BASE}/admin/dashboard-stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminStudents(params?: {
    search?: string;
    department?: string;
    semester?: string;
    academicYear?: string;
    quota?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    count: number;
    students: Student[];
  }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/admin/students?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminStudentDetails(id: string): Promise<{
    success: boolean;
    student: Student;
    fees: FeeRecord[];
    payments: PaymentRecord[];
  }> {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createStudent(data: any): Promise<{
    success: boolean;
    message: string;
    student: Student;
  }> {
    const res = await fetch(`${API_BASE}/admin/students`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateStudent(id: string, data: any): Promise<{
    success: boolean;
    message: string;
    student: Student;
  }> {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteStudent(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminFees(params?: {
    search?: string;
    department?: string;
    semester?: string;
    feeType?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    count: number;
    fees: FeeRecord[];
  }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/admin/fees?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async assignFee(data: any): Promise<{
    success: boolean;
    message: string;
    assignedCount: number;
    fees: FeeRecord[];
  }> {
    const res = await fetch(`${API_BASE}/admin/fees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteFee(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/admin/fees/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminPayments(params?: {
    search?: string;
    status?: string;
    department?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    count: number;
    payments: PaymentRecord[];
  }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/admin/payments?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminReports(reportType?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/reports?reportType=${reportType || 'COLLECTION_SUMMARY'}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminAuditLogs(): Promise<{
    success: boolean;
    count: number;
    logs: AuditLog[];
  }> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async sendAdminNotification(data: {
    targetType: 'BROADCAST' | 'DEPARTMENT' | 'SEMESTER' | 'INDIVIDUAL' | 'DEFAULTERS';
    department?: string;
    semester?: number;
    studentId?: string;
    title: string;
    message: string;
  }): Promise<{
    success: boolean;
    message: string;
    recipients: number;
  }> {
    const res = await fetch(`${API_BASE}/admin/send-notification`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMongoStatus(): Promise<{
    success: boolean;
    database: string;
    isAtlas: boolean;
    readyState: number;
    collections: {
      students: number;
      fee_records: number;
      payments: number;
      receipts: number;
      audit_logs: number;
      users: number;
    };
    testWriteReadPassed: boolean;
    latencyMs: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/mongodb/status`);
    return handleResponse(res);
  }
};
