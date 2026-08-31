import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isMongoConnected, ensureCollectionsExist } from './db/mongodb.js';
import { UserModel, StudentModel, FeeModel, PaymentModel, AuditLogModel, ReceiptModel } from './models/index.js';

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'ADMIN';
  phone: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface FeeItem {
  id: string;
  category: string;
  amount: number;
  description?: string;
  isOptional?: boolean;
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
  paymentId: string; // Razorpay payment ID or generated ID
  orderId: string; // Razorpay order ID
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

export interface AdminUser {
  _id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  permissions: string[];
  createdAt: string;
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

export interface DatabaseSchema {
  users: User[];
  students: Student[];
  fees: FeeRecord[];
  payments: PaymentRecord[];
  admins: AdminUser[];
  auditLogs: AuditLog[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'college_database.json');

// In-Memory cached state
let dbData: DatabaseSchema = {
  users: [],
  students: [],
  fees: [],
  payments: [],
  admins: [],
  auditLogs: []
};

// Seed realistic demo data for college project
function getInitialSeedData(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
  const studentPasswordHash = bcrypt.hashSync('Student@123', 10);
  
  const now = new Date();
  const dateStr = now.toISOString();
  
  const users: User[] = [
    {
      _id: 'user_admin_01',
      name: 'Dr. Ramesh Sharma (Dean Finance)',
      email: 'admin@college.edu',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      phone: '+91 98765 43210',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_admin_02',
      name: 'Prof. Anjali Mehta (Accounts Officer)',
      email: 'accounts@college.edu',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      phone: '+91 98765 43211',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_std_01',
      name: 'Sai Harini Medam',
      email: 'saiharinimedam@gmail.com',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      phone: '+91 91234 56780',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_std_02',
      name: 'Aarav Patel',
      email: 'aarav.patel@student.college.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      phone: '+91 91234 56781',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_std_03',
      name: 'Priya Sundaram',
      email: 'priya.s@student.college.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      phone: '+91 91234 56782',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_std_04',
      name: 'Vikram Aditya Singh',
      email: 'vikram.singh@student.college.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      phone: '+91 91234 56783',
      createdAt: dateStr,
      updatedAt: dateStr
    },
    {
      _id: 'user_std_05',
      name: 'Sneha Reddy',
      email: 'sneha.reddy@student.college.edu',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      phone: '+91 91234 56784',
      createdAt: dateStr,
      updatedAt: dateStr
    }
  ];

  const admins: AdminUser[] = [
    {
      _id: 'adm_01',
      userId: 'user_admin_01',
      name: 'Dr. Ramesh Sharma',
      email: 'admin@college.edu',
      department: 'Finance & Administration',
      designation: 'Finance Controller & Dean',
      permissions: ['ALL', 'MANAGE_FEES', 'APPROVE_PAYMENTS', 'GENERATE_REPORTS', 'MANAGE_STUDENTS'],
      createdAt: dateStr
    },
    {
      _id: 'adm_02',
      userId: 'user_admin_02',
      name: 'Prof. Anjali Mehta',
      email: 'accounts@college.edu',
      department: 'Accounts Section',
      designation: 'Senior Accounts Officer',
      permissions: ['VIEW_FEES', 'APPROVE_PAYMENTS', 'GENERATE_REPORTS'],
      createdAt: dateStr
    }
  ];

  const students: Student[] = [
    {
      _id: 'std_01',
      userId: 'user_std_01',
      rollNumber: '21CS101',
      registrationNo: 'REG-2021-CSE-0042',
      name: 'Sai Harini Medam',
      email: 'saiharinimedam@gmail.com',
      phone: '+91 91234 56780',
      course: 'B.Tech - Computer Science & Engineering',
      department: 'Computer Science and Engineering',
      semester: 8,
      academicYear: '2025-2026',
      admissionQuota: 'MERIT',
      feeCategory: 'REGULAR',
      guardianName: 'M. Venkat Rao',
      guardianPhone: '+91 98480 12345',
      address: 'Plot 45, Tech Enclave, Phase 2, Hyderabad',
      status: 'ACTIVE',
      createdAt: dateStr
    },
    {
      _id: 'std_02',
      userId: 'user_std_02',
      rollNumber: '21CS102',
      registrationNo: 'REG-2021-CSE-0078',
      name: 'Aarav Patel',
      email: 'aarav.patel@student.college.edu',
      phone: '+91 91234 56781',
      course: 'B.Tech - Computer Science & Engineering',
      department: 'Computer Science and Engineering',
      semester: 8,
      academicYear: '2025-2026',
      admissionQuota: 'MANAGEMENT',
      feeCategory: 'REGULAR',
      guardianName: 'Rajesh Patel',
      guardianPhone: '+91 98480 67890',
      address: '12-B, Diamond Park, Ahmedabad',
      status: 'ACTIVE',
      createdAt: dateStr
    },
    {
      _id: 'std_03',
      userId: 'user_std_03',
      rollNumber: '22IT204',
      registrationNo: 'REG-2022-IT-0112',
      name: 'Priya Sundaram',
      email: 'priya.s@student.college.edu',
      phone: '+91 91234 56782',
      course: 'B.Tech - Information Technology',
      department: 'Information Technology',
      semester: 6,
      academicYear: '2025-2026',
      admissionQuota: 'GOVERNMENT',
      feeCategory: 'SCHOLARSHIP',
      guardianName: 'K. Sundaram',
      guardianPhone: '+91 94440 23456',
      address: '77, Anna Nagar West, Chennai',
      status: 'ACTIVE',
      createdAt: dateStr
    },
    {
      _id: 'std_04',
      userId: 'user_std_04',
      rollNumber: '22EC305',
      registrationNo: 'REG-2022-ECE-0091',
      name: 'Vikram Aditya Singh',
      email: 'vikram.singh@student.college.edu',
      phone: '+91 91234 56783',
      course: 'B.Tech - Electronics & Communication',
      department: 'Electronics & Communication',
      semester: 6,
      academicYear: '2025-2026',
      admissionQuota: 'MERIT',
      feeCategory: 'REGULAR',
      guardianName: 'Devendra Singh',
      guardianPhone: '+91 98110 54321',
      address: 'Sector 14, Urban Estate, Gurgaon',
      status: 'ACTIVE',
      createdAt: dateStr
    },
    {
      _id: 'std_05',
      userId: 'user_std_05',
      rollNumber: '23AI401',
      registrationNo: 'REG-2023-AIML-0015',
      name: 'Sneha Reddy',
      email: 'sneha.reddy@student.college.edu',
      phone: '+91 91234 56784',
      course: 'B.Tech - AI & Machine Learning',
      department: 'Artificial Intelligence',
      semester: 4,
      academicYear: '2025-2026',
      admissionQuota: 'MERIT',
      feeCategory: 'TFWS',
      guardianName: 'B. Prabhakar Reddy',
      guardianPhone: '+91 99890 87654',
      address: 'Flat 302, Green Meadows, Bengaluru',
      status: 'ACTIVE',
      createdAt: dateStr
    }
  ];

  const fees: FeeRecord[] = [
    {
      _id: 'fee_01',
      studentId: 'std_01',
      studentRollNumber: '21CS101',
      studentName: 'Sai Harini Medam',
      department: 'Computer Science and Engineering',
      course: 'B.Tech - Computer Science & Engineering',
      academicYear: '2025-2026',
      semester: 8,
      feeType: 'SEMESTER_FEE',
      title: 'VIII Semester Comprehensive Tuition & Lab Fee',
      totalAmount: 65000,
      paidAmount: 40000,
      pendingAmount: 25000,
      dueDate: '2026-09-15',
      lateFeePerDay: 50,
      status: 'PARTIAL',
      breakdown: [
        { id: 'b_1', category: 'Tuition Fee', amount: 42000, description: 'Core Academic & Faculty Instruction' },
        { id: 'b_2', category: 'Laboratory & Cloud Computing Fee', amount: 10000, description: 'High-Performance Lab Access & AWS Sandbox' },
        { id: 'b_3', category: 'University Examination Fee', amount: 3500, description: 'Final Semester Degree Evaluation & Grade Sheets' },
        { id: 'b_4', category: 'Library & Digital Journals Access', amount: 2500, description: 'IEEE, ACM Digital Library & Campus WiFi' },
        { id: 'b_5', category: 'Training & Campus Placement Cell', amount: 5000, description: 'Corporate Recruitment & Soft Skills Training' },
        { id: 'b_6', category: 'Student Welfare & Sports Fund', amount: 2000, description: 'Campus Fest, Health Insurance & Gymkhana' }
      ],
      remarks: 'First installment of Rs. 40,000 paid successfully. Remaining Rs. 25,000 due before Sept 15.',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-15T14:30:00.000Z'
    },
    {
      _id: 'fee_02',
      studentId: 'std_02',
      studentRollNumber: '21CS102',
      studentName: 'Aarav Patel',
      department: 'Computer Science and Engineering',
      course: 'B.Tech - Computer Science & Engineering',
      academicYear: '2025-2026',
      semester: 8,
      feeType: 'SEMESTER_FEE',
      title: 'VIII Semester Comprehensive Academic Fee',
      totalAmount: 85000,
      paidAmount: 0,
      pendingAmount: 85000,
      dueDate: '2026-09-10',
      lateFeePerDay: 100,
      status: 'PENDING',
      breakdown: [
        { id: 'b_11', category: 'Tuition Fee (Management)', amount: 62000, description: 'Academic Instruction Fee' },
        { id: 'b_12', category: 'Laboratory & Project Development', amount: 12000, description: 'Advanced Embedded & IoT Lab' },
        { id: 'b_13', category: 'University Exam Fee', amount: 3500, description: 'Final Exam & Viva Voce' },
        { id: 'b_14', category: 'Campus Development Fund', amount: 7500, description: 'Infrastructure & Tech Center' }
      ],
      remarks: 'Payment pending for final year semester.',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z'
    },
    {
      _id: 'fee_03',
      studentId: 'std_03',
      studentRollNumber: '22IT204',
      studentName: 'Priya Sundaram',
      department: 'Information Technology',
      course: 'B.Tech - Information Technology',
      academicYear: '2025-2026',
      semester: 6,
      feeType: 'SEMESTER_FEE',
      title: 'VI Semester Academic & Lab Fee (Govt Scholarship)',
      totalAmount: 32000,
      paidAmount: 32000,
      pendingAmount: 0,
      dueDate: '2026-08-20',
      lateFeePerDay: 50,
      status: 'PAID',
      breakdown: [
        { id: 'b_21', category: 'Subsidized Tuition Fee', amount: 18000, description: 'State Govt Merit Subsidy Applied' },
        { id: 'b_22', category: 'Advanced Network Lab Fee', amount: 8000, description: 'Networking & Cyber Security Lab' },
        { id: 'b_23', category: 'Semester Exam Fee', amount: 3500, description: 'Theory and Practical Evaluations' },
        { id: 'b_24', category: 'Digital Library & E-Learning', amount: 2500, description: 'NPTEL & Digital Course Repository' }
      ],
      remarks: 'Full fee paid on time. Receipt generated.',
      createdAt: '2026-06-15T09:00:00.000Z',
      updatedAt: '2026-08-10T11:20:00.000Z'
    },
    {
      _id: 'fee_04',
      studentId: 'std_04',
      studentRollNumber: '22EC305',
      studentName: 'Vikram Aditya Singh',
      department: 'Electronics & Communication',
      course: 'B.Tech - Electronics & Communication',
      academicYear: '2025-2026',
      semester: 6,
      feeType: 'HOSTEL_MESS',
      title: 'Annual Hostel & Dining Fee (Block B - AC Room)',
      totalAmount: 95000,
      paidAmount: 50000,
      pendingAmount: 45000,
      dueDate: '2026-09-05',
      lateFeePerDay: 75,
      status: 'PARTIAL',
      breakdown: [
        { id: 'b_31', category: 'Hostel Accommodation (Double Occupancy AC)', amount: 55000, description: 'Room rent, Electricity & High-speed WiFi' },
        { id: 'b_32', category: 'Dining / Mess Charges (Full Year)', amount: 35000, description: '4-meal daily hygienic catering' },
        { id: 'b_33', category: 'Laundry & Housekeeping Services', amount: 5000, description: 'Bi-weekly automated laundry & room cleaning' }
      ],
      remarks: 'Term 1 paid. Term 2 pending.',
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-07-20T16:45:00.000Z'
    },
    {
      _id: 'fee_05',
      studentId: 'std_05',
      studentRollNumber: '23AI401',
      studentName: 'Sneha Reddy',
      department: 'Artificial Intelligence',
      course: 'B.Tech - AI & Machine Learning',
      academicYear: '2025-2026',
      semester: 4,
      feeType: 'SEMESTER_FEE',
      title: 'IV Semester Tuition & GPU Lab Fee (TFWS)',
      totalAmount: 18500,
      paidAmount: 18500,
      pendingAmount: 0,
      dueDate: '2026-08-15',
      lateFeePerDay: 50,
      status: 'PAID',
      breakdown: [
        { id: 'b_41', category: 'Tuition Fee (100% Tuition Fee Waiver)', amount: 0, description: 'AICTE Tuition Fee Waiver Scheme (TFWS)' },
        { id: 'b_42', category: 'GPU Supercomputing & AI Lab', amount: 12000, description: 'NVIDIA DGX Station & Cloud Compute' },
        { id: 'b_43', category: 'Semester Examination Fee', amount: 3500, description: 'Theory & Coding Exams' },
        { id: 'b_44', category: 'Campus Amenities & Health', amount: 3000, description: 'Student Insurance & Wellness' }
      ],
      remarks: 'Paid in full via Razorpay UPI.',
      createdAt: '2026-06-25T11:00:00.000Z',
      updatedAt: '2026-08-05T10:15:00.000Z'
    }
  ];

  const payments: PaymentRecord[] = [
    {
      _id: 'pay_01',
      paymentId: 'pay_RZP_demo_984128471',
      orderId: 'order_RZP_ord_881920',
      signature: 'demo_signature_hmac_sha256_verified_1',
      feeId: 'fee_01',
      studentId: 'std_01',
      studentName: 'Sai Harini Medam',
      rollNumber: '21CS101',
      department: 'Computer Science and Engineering',
      academicYear: '2025-2026',
      semester: 8,
      amount: 40000,
      feeType: 'SEMESTER_FEE',
      paymentMethod: 'UPI',
      status: 'SUCCESS',
      receiptNumber: 'RCPT-2026-08819',
      transactionDate: '2026-07-15T14:30:00.000Z',
      razorpayDetails: {
        razorpay_payment_id: 'pay_RZP_demo_984128471',
        razorpay_order_id: 'order_RZP_ord_881920',
        vpa: 'saiharini@okhdfcbank'
      },
      verifiedAt: '2026-07-15T14:30:05.000Z',
      notes: 'VIII Semester 1st Installment Fee Payment',
      createdAt: '2026-07-15T14:30:00.000Z'
    },
    {
      _id: 'pay_02',
      paymentId: 'pay_RZP_demo_772183920',
      orderId: 'order_RZP_ord_771902',
      signature: 'demo_signature_hmac_sha256_verified_2',
      feeId: 'fee_03',
      studentId: 'std_03',
      studentName: 'Priya Sundaram',
      rollNumber: '22IT204',
      department: 'Information Technology',
      academicYear: '2025-2026',
      semester: 6,
      amount: 32000,
      feeType: 'SEMESTER_FEE',
      paymentMethod: 'NET_BANKING',
      status: 'SUCCESS',
      receiptNumber: 'RCPT-2026-07719',
      transactionDate: '2026-08-10T11:20:00.000Z',
      razorpayDetails: {
        razorpay_payment_id: 'pay_RZP_demo_772183920',
        razorpay_order_id: 'order_RZP_ord_771902',
        bank: 'State Bank of India (SBIN)'
      },
      verifiedAt: '2026-08-10T11:20:06.000Z',
      notes: 'VI Semester Full Fee Payment (Govt Quota)',
      createdAt: '2026-08-10T11:20:00.000Z'
    },
    {
      _id: 'pay_03',
      paymentId: 'pay_RZP_demo_661928374',
      orderId: 'order_RZP_ord_661029',
      signature: 'demo_signature_hmac_sha256_verified_3',
      feeId: 'fee_04',
      studentId: 'std_04',
      studentName: 'Vikram Aditya Singh',
      rollNumber: '22EC305',
      department: 'Electronics & Communication',
      academicYear: '2025-2026',
      semester: 6,
      amount: 50000,
      feeType: 'HOSTEL_MESS',
      paymentMethod: 'CREDIT_CARD',
      status: 'SUCCESS',
      receiptNumber: 'RCPT-2026-06610',
      transactionDate: '2026-07-20T16:45:00.000Z',
      razorpayDetails: {
        razorpay_payment_id: 'pay_RZP_demo_661928374',
        razorpay_order_id: 'order_RZP_ord_661029',
        bank: 'HDFC Credit Card (Ending 4092)'
      },
      verifiedAt: '2026-07-20T16:45:08.000Z',
      notes: 'Hostel Term 1 Fee Advance Payment',
      createdAt: '2026-07-20T16:45:00.000Z'
    },
    {
      _id: 'pay_04',
      paymentId: 'pay_RZP_demo_551029384',
      orderId: 'order_RZP_ord_551982',
      signature: 'demo_signature_hmac_sha256_verified_4',
      feeId: 'fee_05',
      studentId: 'std_05',
      studentName: 'Sneha Reddy',
      rollNumber: '23AI401',
      department: 'Artificial Intelligence',
      academicYear: '2025-2026',
      semester: 4,
      amount: 18500,
      feeType: 'SEMESTER_FEE',
      paymentMethod: 'UPI',
      status: 'SUCCESS',
      receiptNumber: 'RCPT-2026-05519',
      transactionDate: '2026-08-05T10:15:00.000Z',
      razorpayDetails: {
        razorpay_payment_id: 'pay_RZP_demo_551029384',
        razorpay_order_id: 'order_RZP_ord_551982',
        vpa: 'snehareddy@icici'
      },
      verifiedAt: '2026-08-05T10:15:04.000Z',
      notes: 'Semester 4 Lab & Exam Fee Settlement',
      createdAt: '2026-08-05T10:15:00.000Z'
    },
    {
      _id: 'pay_05',
      paymentId: 'pay_RZP_failed_441029837',
      orderId: 'order_RZP_ord_441028',
      feeId: 'fee_02',
      studentId: 'std_02',
      studentName: 'Aarav Patel',
      rollNumber: '21CS102',
      department: 'Computer Science and Engineering',
      academicYear: '2025-2026',
      semester: 8,
      amount: 85000,
      feeType: 'SEMESTER_FEE',
      paymentMethod: 'NET_BANKING',
      status: 'FAILED',
      receiptNumber: 'RCPT-FAIL-44102',
      transactionDate: '2026-08-12T09:14:00.000Z',
      failureReason: 'Transaction declined by issuer bank (Insufficient funds/Timeout)',
      notes: 'Customer attempted netbanking payment which timed out at gateway',
      createdAt: '2026-08-12T09:14:00.000Z'
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      _id: 'log_01',
      action: 'FEE_RECORD_CREATED',
      performedBy: {
        userId: 'user_admin_01',
        name: 'Dr. Ramesh Sharma',
        email: 'admin@college.edu',
        role: 'ADMIN'
      },
      targetEntity: 'FeeRecord',
      targetId: 'fee_01',
      details: 'Assigned VIII Semester Fee (Rs. 65,000) to Sai Harini Medam (21CS101)',
      ipAddress: '192.168.1.102',
      timestamp: '2026-07-01T10:00:00.000Z'
    },
    {
      _id: 'log_02',
      action: 'PAYMENT_VERIFIED_SUCCESS',
      performedBy: {
        userId: 'user_std_01',
        name: 'Sai Harini Medam',
        email: 'saiharinimedam@gmail.com',
        role: 'STUDENT'
      },
      targetEntity: 'PaymentRecord',
      targetId: 'pay_01',
      details: 'Razorpay payment of Rs. 40,000 verified with HMAC signature. Receipt RCPT-2026-08819 issued.',
      ipAddress: '49.205.12.88',
      timestamp: '2026-07-15T14:30:05.000Z'
    },
    {
      _id: 'log_03',
      action: 'PAYMENT_VERIFIED_SUCCESS',
      performedBy: {
        userId: 'user_std_03',
        name: 'Priya Sundaram',
        email: 'priya.s@student.college.edu',
        role: 'STUDENT'
      },
      targetEntity: 'PaymentRecord',
      targetId: 'pay_02',
      details: 'Razorpay payment of Rs. 32,000 verified. Receipt RCPT-2026-07719 issued. Fee status updated to PAID.',
      ipAddress: '157.48.21.19',
      timestamp: '2026-08-10T11:20:06.000Z'
    },
    {
      _id: 'log_04',
      action: 'PAYMENT_ATTEMPT_FAILED',
      performedBy: {
        userId: 'user_std_02',
        name: 'Aarav Patel',
        email: 'aarav.patel@student.college.edu',
        role: 'STUDENT'
      },
      targetEntity: 'PaymentRecord',
      targetId: 'pay_05',
      details: 'Payment attempt of Rs. 85,000 failed at gateway. Reason: Transaction declined by bank.',
      ipAddress: '106.51.78.204',
      timestamp: '2026-08-12T09:14:00.000Z'
    }
  ];

  return { users, admins, students, fees, payments, auditLogs };
}

// Load database from file or initialize
export function initDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      dbData = JSON.parse(raw);
    } else {
      dbData = getInitialSeedData();
      saveDB();
    }
  } catch (err) {
    console.warn('Could not load database file, re-initializing seed data', err);
    dbData = getInitialSeedData();
    saveDB();
  }
  return dbData;
}

// Full bidirectional sync with MongoDB Atlas on connection
export async function syncWithMongoDB(): Promise<void> {
  if (!isMongoConnected()) return;

  try {
    console.log('🔄 Verifying MongoDB Atlas database & collections state...');
    await ensureCollectionsExist();

    const [userCount, studentCount, feeCount, paymentCount, receiptCount, auditCount] = await Promise.all([
      UserModel.countDocuments().catch(() => 0),
      StudentModel.countDocuments().catch(() => 0),
      FeeModel.countDocuments().catch(() => 0),
      PaymentModel.countDocuments().catch(() => 0),
      ReceiptModel.countDocuments().catch(() => 0),
      AuditLogModel.countDocuments().catch(() => 0)
    ]);

    console.log(`📊 Current Atlas document counts -> Users: ${userCount}, Students: ${studentCount}, Fees: ${feeCount}, Payments: ${paymentCount}, Receipts: ${receiptCount}, Audits: ${auditCount}`);

    // 1. Seed users if empty
    if (userCount === 0 && dbData.users.length > 0) {
      console.log('🌱 Seeding users collection in MongoDB Atlas...');
      for (const u of dbData.users) {
        await UserModel.findByIdAndUpdate(u._id, u, { upsert: true }).catch((e) => console.error('Error seeding user:', e.message));
      }
    }

    // 2. Seed students if empty
    if (studentCount === 0 && dbData.students.length > 0) {
      console.log('🌱 Seeding students collection in MongoDB Atlas...');
      for (const s of dbData.students) {
        await StudentModel.findByIdAndUpdate(s._id, s, { upsert: true }).catch((e) => console.error('Error seeding student:', e.message));
      }
    }

    // 3. Seed fee_records if empty
    if (feeCount === 0 && dbData.fees.length > 0) {
      console.log('🌱 Seeding fee_records collection in MongoDB Atlas...');
      for (const f of dbData.fees) {
        await FeeModel.findByIdAndUpdate(
          f._id,
          {
            ...f,
            dueDate: new Date(f.dueDate)
          },
          { upsert: true }
        ).catch((e) => console.error('Error seeding fee:', e.message));
      }
    }

    // 4. Seed payments if empty
    if (paymentCount === 0 && dbData.payments.length > 0) {
      console.log('🌱 Seeding payments collection in MongoDB Atlas...');
      for (const p of dbData.payments) {
        await PaymentModel.findByIdAndUpdate(
          p._id,
          {
            ...p,
            transactionDate: new Date(p.transactionDate),
            verifiedAt: p.verifiedAt ? new Date(p.verifiedAt) : undefined
          },
          { upsert: true }
        ).catch((e) => console.error('Error seeding payment:', e.message));
      }
    }

    // 5. Seed receipts if empty
    if (receiptCount === 0 && dbData.payments.length > 0) {
      console.log('🌱 Seeding receipts collection in MongoDB Atlas...');
      for (const p of dbData.payments) {
        const student = dbData.students.find((s) => s._id === p.studentId || s.rollNumber === p.rollNumber);
        const fee = dbData.fees.find((f) => f._id === p.feeId);
        await ReceiptModel.findByIdAndUpdate(
          p.receiptNumber,
          {
            _id: `rcpt_${p.receiptNumber}`,
            receiptNumber: p.receiptNumber,
            paymentId: p.paymentId,
            orderId: p.orderId,
            studentId: student?._id || p.studentId,
            feeId: fee?._id || p.feeId,
            rollNumber: student?.rollNumber || p.rollNumber,
            studentName: student?.name || p.studentName,
            department: student?.department || p.department,
            semester: student?.semester || p.semester,
            academicYear: student?.academicYear || p.academicYear,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            status: p.status,
            verificationStatus: 'VERIFIED & CAPTURED',
            verifiedAt: new Date(p.verifiedAt || p.transactionDate),
            transactionDate: new Date(p.transactionDate),
            receiptData: {
              receiptNumber: p.receiptNumber,
              paymentId: p.paymentId,
              orderId: p.orderId,
              amount: p.amount,
              student: student || { name: p.studentName, rollNumber: p.rollNumber },
              feeDetails: fee || { title: p.feeType, totalAmount: p.amount }
            }
          },
          { upsert: true }
        ).catch((e) => console.error('Error seeding receipt:', e.message));
      }
    }

    // 6. Seed audit_logs if empty
    if (auditCount === 0 && dbData.auditLogs.length > 0) {
      console.log('🌱 Seeding audit_logs collection in MongoDB Atlas...');
      for (const a of dbData.auditLogs) {
        await AuditLogModel.findByIdAndUpdate(
          a._id,
          {
            _id: a._id,
            action: a.action,
            performedBy: a.performedBy,
            targetEntity: a.targetEntity,
            targetId: a.targetId,
            description: a.details,
            ipAddress: a.ipAddress,
            timestamp: new Date(a.timestamp)
          },
          { upsert: true }
        ).catch((e) => console.error('Error seeding audit log:', e.message));
      }
    }

    console.log('✅ MongoDB Atlas college_fee_management database & collections verified and seeded.');

    // If MongoDB had pre-existing records, merge back to local cache
    if (studentCount > 0 && userCount > 0) {
      const [mongoUsers, mongoStudents, mongoFees, mongoPayments] = await Promise.all([
        UserModel.find().lean().catch(() => []),
        StudentModel.find().lean().catch(() => []),
        FeeModel.find().lean().catch(() => []),
        PaymentModel.find().lean().catch(() => [])
      ]);

      if (mongoStudents.length > 0) {
        dbData.students = mongoStudents.map((s: any) => ({
          ...s,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt || new Date().toISOString())
        })) as any;
      }
      if (mongoFees.length > 0) {
        dbData.fees = mongoFees.map((f: any) => ({
          ...f,
          dueDate: f.dueDate instanceof Date ? f.dueDate.toISOString().split('T')[0] : String(f.dueDate || ''),
          createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt || new Date().toISOString()),
          updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : String(f.updatedAt || new Date().toISOString())
        })) as any;
      }
      if (mongoPayments.length > 0) {
        dbData.payments = mongoPayments.map((p: any) => ({
          ...p,
          transactionDate: p.transactionDate instanceof Date ? p.transactionDate.toISOString() : String(p.transactionDate || new Date().toISOString()),
          verifiedAt: p.verifiedAt ? (p.verifiedAt instanceof Date ? p.verifiedAt.toISOString() : String(p.verifiedAt)) : undefined,
          createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt || new Date().toISOString())
        })) as any;
      }
      if (mongoUsers.length > 0) {
        dbData.users = mongoUsers.map((u: any) => ({
          ...u,
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt || new Date().toISOString()),
          updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt || new Date().toISOString())
        })) as any;
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
    }
  } catch (err: any) {
    console.warn('⚠️ Notice during MongoDB synchronization:', err.message || err);
  }
}

export function saveDB(data?: DatabaseSchema) {
  try {
    if (data) {
      dbData = data;
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');

    // Asynchronously synchronize records with MongoDB Atlas if connection is active
    if (isMongoConnected()) {
      Promise.all([
        ...dbData.users.map((u) =>
          UserModel.findByIdAndUpdate(u._id, u, { upsert: true }).catch(() => {})
        ),
        ...dbData.students.map((s) =>
          StudentModel.findByIdAndUpdate(s._id, s, { upsert: true }).catch(() => {})
        ),
        ...dbData.fees.map((f) =>
          FeeModel.findByIdAndUpdate(f._id, f, { upsert: true }).catch(() => {})
        ),
        ...dbData.payments.map((p) =>
          PaymentModel.findByIdAndUpdate(p._id, p, { upsert: true }).catch(() => {})
        ),
        ...dbData.auditLogs.slice(0, 50).map((a) =>
          AuditLogModel.findByIdAndUpdate(
            a._id,
            {
              _id: a._id,
              action: a.action,
              performedBy: a.performedBy,
              targetEntity: a.targetEntity,
              targetId: a.targetId,
              description: a.details,
              ipAddress: a.ipAddress,
              timestamp: new Date(a.timestamp)
            },
            { upsert: true }
          ).catch(() => {})
        )
      ]).catch((e) => console.warn('Background MongoDB sync note:', e.message));
    }
  } catch (err) {
    console.error('Error persisting database:', err);
  }
}

// Saves a receipt document directly into the receipts collection in MongoDB
export async function saveReceiptRecord(receipt: any): Promise<void> {
  if (isMongoConnected()) {
    try {
      await ReceiptModel.findByIdAndUpdate(
        receipt.receiptNumber || receipt._id,
        {
          _id: receipt._id || `rcpt_${receipt.receiptNumber}`,
          receiptNumber: receipt.receiptNumber,
          paymentId: receipt.paymentId,
          orderId: receipt.orderId,
          studentId: receipt.student?.id || receipt.studentId,
          feeId: receipt.feeDetails?.id || receipt.feeId,
          rollNumber: receipt.student?.rollNumber || receipt.rollNumber,
          studentName: receipt.student?.name || receipt.studentName,
          department: receipt.student?.department || receipt.department,
          semester: receipt.student?.semester || receipt.semester,
          academicYear: receipt.student?.academicYear || receipt.academicYear,
          amount: receipt.amount,
          paymentMethod: receipt.paymentMethod,
          status: receipt.status,
          verificationStatus: receipt.verificationStatus || 'VERIFIED & CAPTURED',
          verifiedAt: new Date(receipt.verifiedAt || receipt.transactionDate),
          transactionDate: new Date(receipt.transactionDate),
          receiptData: receipt
        },
        { upsert: true }
      );
      console.log(`🧾 [Receipt] Stored receipt #${receipt.receiptNumber} in MongoDB receipts collection`);
    } catch (e: any) {
      console.warn('Could not save receipt directly to MongoDB receipts collection:', e.message);
    }
  }
}

export function getDB(): DatabaseSchema {
  if (!dbData.users || dbData.users.length === 0) {
    return initDB();
  }
  return dbData;
}

// Generate unique MongoDB-style ObjectID hex string
export function generateId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

let receiptSequence = 1;
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const db = getDB();
  const existingCount = (db.payments ? db.payments.length : 0) + receiptSequence++;
  const formattedCount = String(existingCount).padStart(6, '0');
  return `RCPT-${year}-${formattedCount}`;
}

export function addAuditLog(
  action: string,
  performedBy: { userId: string; name: string; email: string; role: string },
  targetEntity: string,
  details: string,
  targetId?: string,
  ipAddress = '127.0.0.1'
) {
  const log: AuditLog = {
    _id: generateId('log'),
    action,
    performedBy,
    targetEntity,
    targetId,
    details,
    ipAddress,
    timestamp: new Date().toISOString()
  };
  dbData.auditLogs.unshift(log);
  // Keep last 200 logs
  if (dbData.auditLogs.length > 200) {
    dbData.auditLogs = dbData.auditLogs.slice(0, 200);
  }
  saveDB();

  if (isMongoConnected()) {
    AuditLogModel.create({
      _id: log._id,
      action: log.action,
      performedBy: log.performedBy,
      targetEntity: log.targetEntity,
      targetId: log.targetId,
      description: log.details,
      ipAddress: log.ipAddress,
      timestamp: new Date(log.timestamp)
    }).catch(() => {});
  }

  return log;
}
