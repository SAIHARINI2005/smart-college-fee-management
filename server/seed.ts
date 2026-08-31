import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectMongoDB, isMongoConnected } from './db/mongodb.js';
import {
  UserModel,
  StudentModel,
  FeeModel,
  PaymentModel,
  AuditLogModel
} from './models/index.js';

dotenv.config();

export async function seedDatabase() {
  console.log('🌱 Starting MongoDB database seed routine...');

  const mongoOk = await connectMongoDB();
  if (!mongoOk) {
    console.log('ℹ️ MongoDB not directly accessible for standalone seed script, seed will apply to persistent memory/file store.');
    return;
  }

  try {
    const userCount = await UserModel.countDocuments();
    if (userCount > 0) {
      console.log(`ℹ️ MongoDB already contains ${userCount} users. Ensuring demo accounts exist...`);
    }

    const salt = bcrypt.genSaltSync(10);
    const studentPasswordHash = bcrypt.hashSync('Student@123', salt);
    const adminPasswordHash = bcrypt.hashSync('Admin@123', salt);
    const now = new Date();

    // 1. Seed Demo Admin User
    const adminUser = await UserModel.findOneAndUpdate(
      { email: 'admin@college.edu' },
      {
        _id: 'user_admin_001',
        name: 'Dr. S. K. Sharma (Dean Finance)',
        email: 'admin@college.edu',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        phone: '+91 94401 23456'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Seed Demo Student User
    const studentUser = await UserModel.findOneAndUpdate(
      { email: 'saiharinimedam@gmail.com' },
      {
        _id: 'user_std_001',
        name: 'Sai Harini Medam',
        email: 'saiharinimedam@gmail.com',
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        phone: '+91 98480 22334'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Seed Student Profile
    const studentProfile = await StudentModel.findOneAndUpdate(
      { rollNumber: '21CS101' },
      {
        _id: 'std_001',
        userId: studentUser._id,
        rollNumber: '21CS101',
        registrationNo: 'REG-2022-CSE-0101',
        name: 'Sai Harini Medam',
        email: 'saiharinimedam@gmail.com',
        phone: '+91 98480 22334',
        course: 'B.Tech - Computer Science & Engineering',
        department: 'Computer Science and Engineering',
        semester: 8,
        academicYear: '2025-2026',
        admissionQuota: 'MERIT',
        feeCategory: 'REGULAR',
        guardianName: 'M. Ramesh Rao',
        guardianPhone: '+91 98480 11223',
        address: 'Plot 42, Silicon Valley Colony, Madhapur, Hyderabad - 500081',
        status: 'ACTIVE'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Seed Fee Records for Demo Student
    const dueDate1 = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
    const dueDate2 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const fee1 = await FeeModel.findOneAndUpdate(
      { _id: 'fee_001' },
      {
        _id: 'fee_001',
        studentId: studentProfile._id,
        studentRollNumber: '21CS101',
        studentName: 'Sai Harini Medam',
        department: 'Computer Science and Engineering',
        course: 'B.Tech - Computer Science & Engineering',
        academicYear: '2025-2026',
        semester: 8,
        feeType: 'SEMESTER_FEE',
        title: 'Semester VIII Tuition & Academic Infrastructure Fee',
        totalAmount: 65000,
        paidAmount: 25000,
        pendingAmount: 40000,
        dueDate: dueDate1,
        lateFeePerDay: 50,
        status: 'PARTIAL',
        breakdown: [
          { id: 'b1', category: 'Tuition & Instruction Fee', amount: 42000, description: 'Core Academic & Faculty charges' },
          { id: 'b2', category: 'High-Performance Lab Access', amount: 12000, description: 'AI/ML GPU Computing cluster access' },
          { id: 'b3', category: 'Semester Exam & Valuation Fee', amount: 3500, description: 'University Examination Controller' },
          { id: 'b4', category: 'Digital Library & ACM Access', amount: 4500, description: 'IEEE Xplore / ScienceDirect subscription' },
          { id: 'b5', category: 'Student Amenities & Sports', amount: 3000, description: 'Campus wellness & insurance cover' }
        ],
        remarks: 'Partially settled via Razorpay installment'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const fee2 = await FeeModel.findOneAndUpdate(
      { _id: 'fee_002' },
      {
        _id: 'fee_002',
        studentId: studentProfile._id,
        studentRollNumber: '21CS101',
        studentName: 'Sai Harini Medam',
        department: 'Computer Science and Engineering',
        course: 'B.Tech - Computer Science & Engineering',
        academicYear: '2025-2026',
        semester: 8,
        feeType: 'EXAMINATION_FEE',
        title: 'Final Year Major Project & Thesis Evaluation Fee',
        totalAmount: 8500,
        paidAmount: 0,
        pendingAmount: 8500,
        dueDate: dueDate2,
        lateFeePerDay: 25,
        status: 'PENDING',
        breakdown: [
          { id: 'b6', category: 'Project Thesis Evaluation', amount: 5000, description: 'External university examiner evaluation' },
          { id: 'b7', category: 'Plagiarism & Turnitin Screening', amount: 1500, description: 'Academic integrity verification' },
          { id: 'b8', category: 'Degree Certificate & Convocation', amount: 2000, description: 'Final degree issuance charges' }
        ],
        remarks: 'Project viva voce scheduled in upcoming term'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 5. Seed Prior Verified Payment Record
    await PaymentModel.findOneAndUpdate(
      { _id: 'pay_init_001' },
      {
        _id: 'pay_init_001',
        paymentId: 'pay_RZP_TEST_25000_SUCCESS',
        orderId: 'order_RZP_INIT_001',
        signature: 'simulated_signature_valid',
        feeId: fee1._id,
        studentId: studentProfile._id,
        studentName: studentProfile.name,
        rollNumber: studentProfile.rollNumber,
        department: studentProfile.department,
        academicYear: '2025-2026',
        semester: 8,
        amount: 25000,
        feeType: 'SEMESTER_FEE',
        paymentMethod: 'UPI',
        status: 'SUCCESS',
        receiptNumber: 'RCPT-2026-08102',
        transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        razorpayDetails: {
          razorpay_payment_id: 'pay_RZP_TEST_25000_SUCCESS',
          razorpay_order_id: 'order_RZP_INIT_001',
          vpa: 'saiharini@okaxis'
        },
        verifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        notes: 'First installment paid online via UPI'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 6. Seed Audit Log
    await AuditLogModel.create({
      _id: `audit_${Date.now()}`,
      action: 'SYSTEM_INITIALIZED',
      performedBy: {
        userId: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'ADMIN'
      },
      targetEntity: 'System',
      targetId: 'INIT',
      description: 'System seed completed: Demo student (21CS101) & Admin initialized with active fee structures.',
      timestamp: now
    });

    console.log('✅ MongoDB database successfully seeded with Demo Student (21CS101) and Admin (admin@college.edu)!');
  } catch (error) {
    console.error('❌ Error during MongoDB seed:', error);
  }
}

// Allow direct CLI execution: tsx server/seed.ts
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
