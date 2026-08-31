export type UserRole = 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  student?: Student;
  admin?: AdminProfile;
}

export interface Student {
  _id: string;
  userId: string;
  rollNumber: string;
  registrationNo: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  department: string;
  semester: number;
  academicYear: string;
  admissionQuota: 'MERIT' | 'MANAGEMENT' | 'SPORTS' | 'GOVERNMENT';
  feeCategory: 'REGULAR' | 'SCHOLARSHIP' | 'TFWS';
  guardianName: string;
  guardianPhone: string;
  address: string;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED';
  createdAt: string;
  feeStats?: {
    totalFee: number;
    paidFee: number;
    pendingFee: number;
    feeStatus: 'CLEARED' | 'PENDING' | 'NO_FEE';
    feeRecordCount: number;
  };
}

export interface AdminProfile {
  _id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  permissions: string[];
  createdAt: string;
}

export interface FeeItem {
  id: string;
  category: string;
  amount: number;
  description?: string;
  isOptional?: boolean;
}

export type FeeBreakdownItem = FeeItem;

export interface FinancialReport {
  generatedAt: string;
  totalFeesBilled: number;
  totalCollected: number;
  totalPending: number;
  collectionPercentage: number;
  departmentStats: DepartmentStat[];
  dailyTrends?: Array<{ date: string; collected: number; count: number }>;
  monthlyTrends?: Array<{ month: string; collected: number; count: number }>;
  yearlyTrends?: Array<{ year: string; collected: number; count: number }>;
  successfulPaymentsList?: PaymentRecord[];
  failedPaymentsList?: PaymentRecord[];
  defaultersList: Array<{
    rollNumber: string;
    studentName: string;
    email: string;
    department: string;
    semester: number;
    guardianName?: string;
    guardianPhone?: string;
    feeTitle: string;
    dueDate: string;
    overdueDays: number;
    pendingAmount: number;
    lateFine: number;
    totalDueWithFine: number;
  }>;
}

export interface AuditLogRecord {
  _id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  targetCollection: string;
  targetId?: string;
  details: any;
  timestamp: string;
}

export interface FeeRecord {
  _id: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  department: string;
  course: string;
  academicYear: string;
  semester: number;
  feeType: 'ANNUAL_TUITION' | 'SEMESTER_FEE' | 'EXAM_FEE' | 'HOSTEL_MESS' | 'TRANSPORT' | 'LAB_SPECIAL';
  title: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  lateFeePerDay: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  breakdown: FeeItem[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  _id: string;
  paymentId: string;
  orderId: string;
  signature?: string;
  feeId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  semester: number;
  amount: number;
  feeType: string;
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'WALLET';
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  receiptNumber: string;
  transactionDate: string;
  razorpayDetails?: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
    cardLast4?: string;
  };
  failureReason?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentId: string;
  orderId: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  status: string;
  verificationStatus?: string;
  verifiedAt?: string;
  student: {
    id: string;
    name: string;
    rollNumber: string;
    registrationNo: string;
    course: string;
    department: string;
    semester: number;
    academicYear: string;
    admissionQuota?: string;
    feeCategory?: string;
    email: string;
    phone: string;
  };
  feeDetails: {
    title: string;
    feeType: string;
    totalFee: number;
    previousPaidAmount?: number;
    currentPaymentAmount?: number;
    paidAmountAfterThis?: number;
    remainingPending: number;
    breakdown: FeeItem[];
  } | null;
  paymentDetails?: {
    orderId: string;
    paymentId: string;
    paymentMethod: string;
    transactionStatus: string;
    verificationStatus: string;
    verifiedAt?: string;
    bank?: string;
    vpa?: string;
    wallet?: string;
    cardLast4?: string;
  };
  amountDetails?: {
    amountPaid: number;
    totalFee: number;
    remainingBalance: number;
  };
  college: {
    name: string;
    affiliation: string;
    accreditation: string;
    address: string;
    contact: string;
    website: string;
  };
}

export interface StudentFeeSummary {
  studentId: string;
  rollNumber: string;
  studentName: string;
  course: string;
  department: string;
  semester: number;
  academicYear: string;
  admissionQuota: string;
  feeCategory: string;
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  nextDueDate: string | null;
  isOverdue: boolean;
  activeFeeCount: number;
}

export interface DepartmentStat {
  department: string;
  total: number;
  collected: number;
  pending: number;
  studentCount: number;
  collectionRate: number;
}

export interface AdminDashboardStats {
  totalStudents: number;
  totalFeesBilled: number;
  totalCollected: number;
  totalPending: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  partiallyPaidStudents?: number;
  todayCollection?: number;
  collectionPercentage: number;
  departmentStats: DepartmentStat[];
  paymentMethodStats: Record<string, number>;
  monthlyCollection?: Array<{ month: string; collected: number; count: number }>;
  dailyCollection?: Array<{ date: string; collected: number; count: number }>;
  recentTransactions: PaymentRecord[];
}

export interface AuditLog {
  _id: string;
  action: string;
  performedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  targetEntity: string;
  targetId?: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface DemoAccount {
  role: UserRole;
  title: string;
  email: string;
  password: string;
  name: string;
  rollNumber?: string;
  description: string;
}
