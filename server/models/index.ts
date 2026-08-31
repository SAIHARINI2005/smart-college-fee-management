import mongoose, { Schema, Model } from 'mongoose';

// ================= USER MODEL =================
export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'ADMIN' | 'FINANCE_OFFICER';
  phone?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['STUDENT', 'ADMIN', 'FINANCE_OFFICER'],
      default: 'STUDENT',
      required: true,
      index: true
    },
    phone: { type: String, trim: true },
    avatar: { type: String }
  },
  {
    timestamps: true,
    _id: false
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users');

// ================= STUDENT MODEL =================
export interface IStudent {
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
  admissionQuota: 'MERIT' | 'MANAGEMENT' | 'NRI' | 'GOVERNMENT_SCHOLARSHIP' | 'SPORTS' | 'GOVERNMENT' | string;
  feeCategory: 'REGULAR' | 'HOSTEL_PLUS_MESS' | 'TRANSPORT_ATTACHED' | 'SPECIAL_RESERVATION' | 'SCHOLARSHIP' | 'TFWS' | string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'INACTIVE';
  createdAt?: Date;
  updatedAt?: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User', index: true },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    registrationNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    course: { type: String, required: true },
    department: { type: String, required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true },
    admissionQuota: {
      type: String,
      default: 'MERIT'
    },
    feeCategory: {
      type: String,
      default: 'REGULAR'
    },
    guardianName: { type: String },
    guardianPhone: { type: String },
    address: { type: String },
    status: {
      type: String,
      default: 'ACTIVE',
      index: true
    }
  },
  {
    timestamps: true,
    _id: false
  }
);

export const StudentModel: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema, 'students');

// ================= FEE MODEL =================
export interface IFeeBreakdown {
  id: string;
  category: string;
  amount: number;
  description?: string;
}

export interface IFee {
  _id: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  department: string;
  course: string;
  academicYear: string;
  semester: number;
  feeType: 'SEMESTER_FEE' | 'EXAMINATION_FEE' | 'HOSTEL_MESS_FEE' | 'TRANSPORT_FEE' | 'LIBRARY_FINE' | 'LABORATORY_FEE' | 'ANNUAL_TUITION' | 'EXAM_FEE' | 'HOSTEL_MESS' | 'TRANSPORT' | 'LAB_SPECIAL' | 'OTHER' | string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: Date;
  lateFeePerDay: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  breakdown: IFeeBreakdown[];
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FeeBreakdownSchema = new Schema(
  {
    id: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String }
  },
  { _id: false }
);

const FeeSchema = new Schema<IFee>(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, ref: 'Student', index: true },
    studentRollNumber: { type: String, required: true, uppercase: true, index: true },
    studentName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    course: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    feeType: {
      type: String,
      default: 'SEMESTER_FEE',
      required: true,
      index: true
    },
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    lateFeePerDay: { type: Number, default: 50 },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
      default: 'PENDING',
      required: true,
      index: true
    },
    breakdown: { type: [FeeBreakdownSchema], default: [] },
    remarks: { type: String }
  },
  {
    timestamps: true,
    _id: false
  }
);

export const FeeModel: Model<IFee> =
  mongoose.models.Fee || mongoose.model<IFee>('Fee', FeeSchema, 'fee_records');

// ================= PAYMENT MODEL =================
export interface IPayment {
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
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'WALLET' | 'OFFLINE_CHALLAN';
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  receiptNumber: string;
  transactionDate: Date;
  razorpayDetails?: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    bank?: string;
    vpa?: string;
    wallet?: string;
  };
  verifiedAt?: Date;
  failureReason?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    _id: { type: String, required: true },
    paymentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    signature: { type: String },
    feeId: { type: String, required: true, ref: 'Fee', index: true },
    studentId: { type: String, required: true, ref: 'Student', index: true },
    studentName: { type: String, required: true },
    rollNumber: { type: String, required: true, uppercase: true, index: true },
    department: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    feeType: { type: String, default: 'SEMESTER_FEE' },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'WALLET', 'OFFLINE_CHALLAN'],
      default: 'UPI',
      required: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'],
      default: 'SUCCESS',
      required: true,
      index: true
    },
    receiptNumber: { type: String, required: true, unique: true, index: true },
    transactionDate: { type: Date, default: Date.now, index: true },
    razorpayDetails: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
      bank: String,
      vpa: String,
      wallet: String
    },
    verifiedAt: { type: Date },
    failureReason: { type: String },
    notes: { type: String }
  },
  {
    timestamps: true,
    _id: false
  }
);

export const PaymentModel: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema, 'payments');

// ================= RECEIPT MODEL =================
export interface IReceipt {
  _id: string;
  receiptNumber: string;
  paymentId: string;
  orderId: string;
  studentId: string;
  feeId: string;
  rollNumber: string;
  studentName: string;
  department: string;
  semester: number;
  academicYear: string;
  amount: number;
  paymentMethod: string;
  status: string;
  verificationStatus: string;
  verifiedAt: Date;
  transactionDate: Date;
  receiptData: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    _id: { type: String, required: true },
    receiptNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    feeId: { type: String, required: true, index: true },
    rollNumber: { type: String, required: true, uppercase: true, index: true },
    studentName: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'UPI' },
    status: { type: String, default: 'SUCCESS' },
    verificationStatus: { type: String, default: 'VERIFIED & CAPTURED' },
    verifiedAt: { type: Date, default: Date.now },
    transactionDate: { type: Date, default: Date.now },
    receiptData: { type: Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true,
    _id: false
  }
);

export const ReceiptModel: Model<IReceipt> =
  mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema, 'receipts');

// ================= AUDIT LOG MODEL =================
export interface IAuditLog {
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
  description: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, required: true },
    action: { type: String, required: true, index: true },
    performedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true }
    },
    targetEntity: { type: String, required: true },
    targetId: { type: String },
    description: { type: String, required: true },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    _id: false
  }
);

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'audit_logs');

