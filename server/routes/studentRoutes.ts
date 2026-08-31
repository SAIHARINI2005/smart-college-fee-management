import express, { Response } from 'express';
import { getDB, Student, FeeRecord, PaymentRecord } from '../db.js';
import { requireStudent, AuthenticatedRequest } from '../auth.js';
import { buildReceiptData } from './paymentRoutes.js';

const router = express.Router();

// Helper to find student for current session
function getStudentForUser(req: AuthenticatedRequest): Student | null {
  const db = getDB();
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  return (
    db.students.find(
      (s) => s.userId === userId || (userEmail && s.email.toLowerCase() === userEmail.toLowerCase())
    ) || null
  );
}

// GET /api/students/profile
router.get('/profile', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  res.json({
    success: true,
    student
  });
});

// GET /api/students/fee-summary
router.get('/fee-summary', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  const db = getDB();
  const studentFees = db.fees.filter(
    (f) => f.studentId === student._id || f.studentRollNumber === student.rollNumber
  );

  const totalFee = studentFees.reduce((acc, f) => acc + f.totalAmount, 0);
  const paidFee = studentFees.reduce((acc, f) => acc + f.paidAmount, 0);
  const pendingFee = studentFees.reduce((acc, f) => acc + f.pendingAmount, 0);

  // Determine earliest pending due date
  const pendingRecords = studentFees
    .filter((f) => f.pendingAmount > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const nextDueDate = pendingRecords.length > 0 ? pendingRecords[0].dueDate : null;
  const isOverdue = nextDueDate ? new Date(nextDueDate).getTime() < Date.now() : false;

  res.json({
    success: true,
    summary: {
      studentId: student._id,
      rollNumber: student.rollNumber,
      studentName: student.name,
      course: student.course,
      department: student.department,
      semester: student.semester,
      academicYear: student.academicYear,
      admissionQuota: student.admissionQuota,
      feeCategory: student.feeCategory,
      totalFee,
      paidFee,
      pendingFee,
      nextDueDate,
      isOverdue,
      activeFeeCount: studentFees.length
    },
    fees: studentFees
  });
});

// GET /api/students/fees (Direct fee records listing)
router.get('/fees', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  const db = getDB();
  const studentFees = db.fees.filter(
    (f) => f.studentId === student._id || f.studentRollNumber === student.rollNumber
  );

  const totalFee = studentFees.reduce((acc, f) => acc + f.totalAmount, 0);
  const paidFee = studentFees.reduce((acc, f) => acc + f.paidAmount, 0);
  const pendingFee = studentFees.reduce((acc, f) => acc + f.pendingAmount, 0);

  res.json({
    success: true,
    totalFee,
    paidFee,
    pendingFee,
    count: studentFees.length,
    fees: studentFees
  });
});

// GET /api/students/fee/:id
router.get('/fee/:id', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  const db = getDB();
  const feeRecord = db.fees.find(
    (f) => f._id === req.params.id && (f.studentId === student._id || f.studentRollNumber === student.rollNumber)
  );

  if (!feeRecord) {
    res.status(404).json({ success: false, message: 'Fee record not found or unauthorized.' });
    return;
  }

  // Also fetch payments made against this fee record
  const relatedPayments = db.payments.filter(
    (p) => p.feeId === feeRecord._id || (p.studentId === student._id && p.status === 'SUCCESS')
  );

  res.json({
    success: true,
    fee: feeRecord,
    payments: relatedPayments
  });
});

// GET /api/students/payment-history
router.get('/payment-history', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  const db = getDB();
  const studentPayments = db.payments
    .filter((p) => p.studentId === student._id || p.rollNumber === student.rollNumber)
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  res.json({
    success: true,
    payments: studentPayments
  });
});

// GET /api/students/receipt/:receiptId
router.get('/receipt/:receiptId', requireStudent, (req: AuthenticatedRequest, res: Response): void => {
  const student = getStudentForUser(req);
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found.' });
    return;
  }

  const db = getDB();
  const payment = db.payments.find(
    (p) =>
      (p._id === req.params.receiptId || p.receiptNumber === req.params.receiptId || p.paymentId === req.params.receiptId || p.orderId === req.params.receiptId) &&
      (p.studentId === student._id || p.rollNumber === student.rollNumber)
  );

  if (!payment) {
    res.status(404).json({ success: false, message: 'Receipt not found.' });
    return;
  }

  const receipt = buildReceiptData(payment, db);
  res.json({
    success: true,
    receipt
  });
});

export default router;
