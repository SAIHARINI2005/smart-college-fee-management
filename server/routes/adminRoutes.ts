import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  getDB,
  saveDB,
  generateId,
  addAuditLog,
  Student,
  FeeRecord,
  PaymentRecord,
  User
} from '../db.js';
import { requireAdmin, AuthenticatedRequest } from '../auth.js';
import { buildReceiptData } from './paymentRoutes.js';

const router = express.Router();

// Helper for safe date parsing whether ISO string, Date object, or timestamp
function toISOString(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  } catch {
    return '';
  }
}

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDB();

    const totalStudents = db.students.length;
    const totalFeesBilled = db.fees.reduce((acc, f) => acc + f.totalAmount, 0);
    const totalCollected = db.fees.reduce((acc, f) => acc + f.paidAmount, 0);
    const totalPending = db.fees.reduce((acc, f) => acc + f.pendingAmount, 0);

    const successfulPayments = db.payments.filter((p) => p.status === 'SUCCESS').length;
    const failedPayments = db.payments.filter((p) => p.status === 'FAILED').length;
    const pendingPayments = db.payments.filter((p) => p.status === 'PENDING').length;

    // Partially paid students count
    const partialFeeStudentIds = new Set(
      db.fees
        .filter((f) => (f.status === 'PARTIAL' || (f.paidAmount > 0 && f.pendingAmount > 0)))
        .map((f) => f.studentId || f.studentRollNumber)
    );
    const partiallyPaidStudents = partialFeeStudentIds.size;

    // Today's collection
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCollection = db.payments
      .filter((p) => {
        if (p.status !== 'SUCCESS' || !p.transactionDate) return false;
        const dateStr = toISOString(p.transactionDate);
        return dateStr.startsWith(todayStr);
      })
      .reduce((acc, p) => acc + p.amount, 0);

    // Recent 10 transactions
    const recentTransactions = [...db.payments]
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 10);

    // Monthly Collection trends (last 6 months)
    const monthlyMap: Record<string, { collected: number; count: number }> = {};
    // Daily Collection trends (last 7 days)
    const dailyMap: Record<string, { collected: number; count: number }> = {};

    db.payments.forEach((p) => {
      if (p.status === 'SUCCESS' && p.transactionDate) {
        const iso = toISOString(p.transactionDate);
        const dateKey = iso ? iso.split('T')[0] : '';
        const monthKey = dateKey ? dateKey.substring(0, 7) : ''; // YYYY-MM

        if (dateKey) {
          dailyMap[dateKey] = dailyMap[dateKey] || { collected: 0, count: 0 };
          dailyMap[dateKey].collected += p.amount;
          dailyMap[dateKey].count += 1;
        }

        if (monthKey) {
          monthlyMap[monthKey] = monthlyMap[monthKey] || { collected: 0, count: 0 };
          monthlyMap[monthKey].collected += p.amount;
          monthlyMap[monthKey].count += 1;
        }
      }
    });

    const monthlyCollection = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const dailyCollection = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .reverse()
      .map(([date, data]) => ({ date, ...data }));

  // Department-wise collection breakdown
  const departmentStatsMap: Record<
    string,
    { total: number; collected: number; pending: number; studentCount: number }
  > = {};

  db.students.forEach((std) => {
    const dept = std.department || 'General';
    if (!departmentStatsMap[dept]) {
      departmentStatsMap[dept] = { total: 0, collected: 0, pending: 0, studentCount: 0 };
    }
    departmentStatsMap[dept].studentCount += 1;
  });

  db.fees.forEach((fee) => {
    const dept = fee.department || 'General';
    if (!departmentStatsMap[dept]) {
      departmentStatsMap[dept] = { total: 0, collected: 0, pending: 0, studentCount: 0 };
    }
    departmentStatsMap[dept].total += fee.totalAmount;
    departmentStatsMap[dept].collected += fee.paidAmount;
    departmentStatsMap[dept].pending += fee.pendingAmount;
  });

  const departmentStats = Object.entries(departmentStatsMap).map(([dept, data]) => ({
    department: dept,
    ...data,
    collectionRate: data.total > 0 ? Math.round((data.collected / data.total) * 100) : 0
  }));

  // Payment method breakdown
  const paymentMethodStats: Record<string, number> = {
    UPI: 0,
    CREDIT_CARD: 0,
    DEBIT_CARD: 0,
    NET_BANKING: 0,
    WALLET: 0
  };

  db.payments.forEach((p) => {
    if (p.status === 'SUCCESS' && p.paymentMethod) {
      paymentMethodStats[p.paymentMethod] = (paymentMethodStats[p.paymentMethod] || 0) + p.amount;
    }
  });

  res.json({
    success: true,
    stats: {
      totalStudents,
      totalFeesBilled,
      totalCollected,
      totalPending,
      successfulPayments,
      failedPayments,
      pendingPayments,
      partiallyPaidStudents,
      todayCollection,
      collectionPercentage:
        totalFeesBilled > 0 ? Math.round((totalCollected / totalFeesBilled) * 100) : 0,
      departmentStats,
      paymentMethodStats,
      monthlyCollection,
      dailyCollection,
      recentTransactions
    }
  });
} catch (err: any) {
  console.error('Error in /api/admin/dashboard-stats:', err);
  res.status(500).json({ success: false, message: 'Error calculating dashboard statistics: ' + (err.message || err) });
}
});

// GET /api/admin/students (Search & Filter)
router.get('/students', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { search, department, semester, academicYear, quota, status } = req.query;
  const db = getDB();

  let filtered = [...db.students];

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.registrationNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }

  if (department && department !== 'ALL') {
    filtered = filtered.filter((s) => s.department === department);
  }

  if (semester && semester !== 'ALL') {
    filtered = filtered.filter((s) => s.semester === Number(semester));
  }

  if (academicYear && academicYear !== 'ALL') {
    filtered = filtered.filter((s) => s.academicYear === academicYear);
  }

  if (quota && quota !== 'ALL') {
    filtered = filtered.filter((s) => s.admissionQuota === quota);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((s) => s.status === status);
  }

  // Attach fee summary to each student in list
  const studentsWithFeeStats = filtered.map((std) => {
    const fees = db.fees.filter((f) => f.studentId === std._id || f.studentRollNumber === std.rollNumber);
    const totalFee = fees.reduce((acc, f) => acc + f.totalAmount, 0);
    const paidFee = fees.reduce((acc, f) => acc + f.paidAmount, 0);
    const pendingFee = fees.reduce((acc, f) => acc + f.pendingAmount, 0);
    const feeStatus = pendingFee === 0 && totalFee > 0 ? 'CLEARED' : pendingFee > 0 ? 'PENDING' : 'NO_FEE';

    return {
      ...std,
      feeStats: {
        totalFee,
        paidFee,
        pendingFee,
        feeStatus,
        feeRecordCount: fees.length
      }
    };
  });

  res.json({
    success: true,
    count: studentsWithFeeStats.length,
    students: studentsWithFeeStats
  });
});

// GET /api/admin/students/:id (Student Profile & Full Fee/Payment History)
router.get('/students/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const student = db.students.find((s) => s._id === req.params.id || s.rollNumber === req.params.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const fees = db.fees.filter(
    (f) => f.studentId === student._id || f.studentRollNumber === student.rollNumber
  );

  const payments = db.payments
    .filter((p) => p.studentId === student._id || p.rollNumber === student.rollNumber)
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  res.json({
    success: true,
    student,
    fees,
    payments
  });
});

// POST /api/admin/students (Create Student)
router.post('/students', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      name,
      email,
      phone,
      rollNumber,
      registrationNo,
      course,
      department,
      semester,
      academicYear,
      admissionQuota,
      feeCategory,
      guardianName,
      guardianPhone,
      address,
      initialFeeAmount,
      password
    } = req.body;

    if (!name || !email || !rollNumber || !department) {
      res.status(400).json({ success: false, message: 'Name, email, roll number, and department are required.' });
      return;
    }

    const db = getDB();

    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    if (db.students.find((s) => s.rollNumber.toUpperCase() === rollNumber.toUpperCase().trim())) {
      res.status(400).json({ success: false, message: 'Student with this roll number already exists.' });
      return;
    }

    const userId = generateId('user_std');
    const studentId = generateId('std');
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password || 'Student@123', 10);

    const newUser: User = {
      _id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'STUDENT',
      phone: phone || '+91 99999 00000',
      createdAt: now,
      updatedAt: now
    };

    const newStudent: Student = {
      _id: studentId,
      userId,
      rollNumber: rollNumber.trim().toUpperCase(),
      registrationNo: registrationNo || `REG-${new Date().getFullYear()}-${rollNumber.toUpperCase()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '+91 99999 00000',
      course: course || 'B.Tech - Computer Science & Engineering',
      department: department.trim(),
      semester: Number(semester) || 1,
      academicYear: academicYear || '2025-2026',
      admissionQuota: admissionQuota || 'MERIT',
      feeCategory: feeCategory || 'REGULAR',
      guardianName: guardianName || 'Parent / Guardian',
      guardianPhone: guardianPhone || '+91 98765 00000',
      address: address || 'Campus Residence',
      status: 'ACTIVE',
      createdAt: now
    };

    db.users.push(newUser);
    db.students.push(newStudent);

    // If initial fee assignment requested
    if (initialFeeAmount && Number(initialFeeAmount) > 0) {
      const feeAmount = Number(initialFeeAmount);
      const feeId = generateId('fee');
      const feeRecord: FeeRecord = {
        _id: feeId,
        studentId: studentId,
        studentRollNumber: newStudent.rollNumber,
        studentName: newStudent.name,
        department: newStudent.department,
        course: newStudent.course,
        academicYear: newStudent.academicYear,
        semester: newStudent.semester,
        feeType: 'SEMESTER_FEE',
        title: `Semester ${newStudent.semester} Tuition & Academic Fee`,
        totalAmount: feeAmount,
        paidAmount: 0,
        pendingAmount: feeAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lateFeePerDay: 50,
        status: 'PENDING',
        breakdown: [
          { id: generateId('b'), category: 'Tuition Fee', amount: Math.round(feeAmount * 0.7), description: 'Core Academic & Instructional Fee' },
          { id: generateId('b'), category: 'Laboratory & Computing', amount: Math.round(feeAmount * 0.15), description: 'Lab Equipment & Cloud Access' },
          { id: generateId('b'), category: 'Examination & Evaluation', amount: 3500, description: 'Semester End Exams' },
          { id: generateId('b'), category: 'Library & Digital Resources', amount: feeAmount - Math.round(feeAmount * 0.7) - Math.round(feeAmount * 0.15) - 3500, description: 'Resource & Tech Amenities' }
        ],
        remarks: 'Assigned during student enrollment',
        createdAt: now,
        updatedAt: now
      };
      db.fees.push(feeRecord);
    }

    saveDB();

    addAuditLog(
      'STUDENT_CREATED',
      {
        userId: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role
      },
      'Student',
      `Admin enrolled student ${newStudent.name} (${newStudent.rollNumber}) in ${newStudent.department}`,
      studentId
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully!',
      student: newStudent
    });
  } catch (err: any) {
    console.error('Error creating student:', err);
    res.status(500).json({ success: false, message: 'Failed to create student.' });
  }
});

// PUT /api/admin/students/:id (Update Student)
router.put('/students/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const studentIndex = db.students.findIndex(
    (s) => s._id === req.params.id || s.rollNumber === req.params.id
  );

  if (studentIndex === -1) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const existing = db.students[studentIndex];
  const {
    name,
    email,
    phone,
    course,
    department,
    semester,
    academicYear,
    admissionQuota,
    feeCategory,
    guardianName,
    guardianPhone,
    address,
    status
  } = req.body;

  const updatedStudent: Student = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    email: email !== undefined ? email.toLowerCase().trim() : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    course: course !== undefined ? course : existing.course,
    department: department !== undefined ? department : existing.department,
    semester: semester !== undefined ? Number(semester) : existing.semester,
    academicYear: academicYear !== undefined ? academicYear : existing.academicYear,
    admissionQuota: admissionQuota !== undefined ? admissionQuota : existing.admissionQuota,
    feeCategory: feeCategory !== undefined ? feeCategory : existing.feeCategory,
    guardianName: guardianName !== undefined ? guardianName : existing.guardianName,
    guardianPhone: guardianPhone !== undefined ? guardianPhone : existing.guardianPhone,
    address: address !== undefined ? address : existing.address,
    status: status !== undefined ? status : existing.status
  };

  db.students[studentIndex] = updatedStudent;

  // Also update corresponding user record if name/email/phone changed
  const userIndex = db.users.findIndex((u) => u._id === existing.userId || u.email.toLowerCase() === existing.email.toLowerCase());
  if (userIndex !== -1) {
    db.users[userIndex].name = updatedStudent.name;
    db.users[userIndex].email = updatedStudent.email;
    db.users[userIndex].phone = updatedStudent.phone;
    db.users[userIndex].updatedAt = new Date().toISOString();
  }

  // Update student name in fees and payments
  db.fees.forEach((f) => {
    if (f.studentId === existing._id || f.studentRollNumber === existing.rollNumber) {
      f.studentName = updatedStudent.name;
      f.department = updatedStudent.department;
    }
  });

  saveDB();

  addAuditLog(
    'STUDENT_UPDATED',
    {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role
    },
    'Student',
    `Updated profile for student ${updatedStudent.name} (${updatedStudent.rollNumber})`,
    updatedStudent._id
  );

  res.json({
    success: true,
    message: 'Student details updated successfully.',
    student: updatedStudent
  });
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const student = db.students.find((s) => s._id === req.params.id || s.rollNumber === req.params.id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  // Delete student and associated user
  db.students = db.students.filter((s) => s._id !== student._id);
  db.users = db.users.filter((u) => u._id !== student.userId && u.email.toLowerCase() !== student.email.toLowerCase());

  // Note: For accounting integrity, payments remain in audit records, but fees can be flagged or removed
  db.fees = db.fees.filter((f) => f.studentId !== student._id && f.studentRollNumber !== student.rollNumber);
  saveDB();

  addAuditLog(
    'STUDENT_DELETED',
    {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role
    },
    'Student',
    `Deleted student record: ${student.name} (${student.rollNumber})`,
    student._id
  );

  res.json({
    success: true,
    message: `Student ${student.name} (${student.rollNumber}) removed successfully.`
  });
});

// GET /api/admin/fees (Fee Structures & Assignments)
router.get('/fees', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { department, semester, feeType, status, search } = req.query;
  const db = getDB();

  let filtered = [...db.fees];

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.studentName.toLowerCase().includes(q) ||
        f.studentRollNumber.toLowerCase().includes(q)
    );
  }

  if (department && department !== 'ALL') {
    filtered = filtered.filter((f) => f.department === department);
  }

  if (semester && semester !== 'ALL') {
    filtered = filtered.filter((f) => f.semester === Number(semester));
  }

  if (feeType && feeType !== 'ALL') {
    filtered = filtered.filter((f) => f.feeType === feeType);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((f) => f.status === status);
  }

  res.json({
    success: true,
    count: filtered.length,
    fees: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
});

// POST /api/admin/fees (Assign Fee to Student or Batch/Department)
router.post('/fees', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      assignmentType, // 'SINGLE_STUDENT' | 'ENTIRE_DEPARTMENT' | 'ENTIRE_SEMESTER'
      studentId,
      department,
      semester,
      academicYear,
      feeType,
      title,
      totalAmount,
      dueDate,
      lateFeePerDay,
      breakdown,
      remarks
    } = req.body;

    if (!title || !totalAmount || !dueDate) {
      res.status(400).json({ success: false, message: 'Title, total amount, and due date are required.' });
      return;
    }

    const db = getDB();
    const now = new Date().toISOString();
    const createdFees: FeeRecord[] = [];

    const parsedBreakdown = Array.isArray(breakdown) && breakdown.length > 0
      ? breakdown.map((b: any) => ({
          id: b.id || generateId('b'),
          category: b.category || 'Standard Fee Component',
          amount: Number(b.amount) || 0,
          description: b.description || ''
        }))
      : [
          { id: generateId('b'), category: 'Core Tuition', amount: Math.round(Number(totalAmount) * 0.75) },
          { id: generateId('b'), category: 'Campus & Amenities', amount: Number(totalAmount) - Math.round(Number(totalAmount) * 0.75) }
        ];

    if (assignmentType === 'SINGLE_STUDENT') {
      const student = db.students.find((s) => s._id === studentId || s.rollNumber === studentId);
      if (!student) {
        res.status(404).json({ success: false, message: 'Target student not found.' });
        return;
      }

      const feeRecord: FeeRecord = {
        _id: generateId('fee'),
        studentId: student._id,
        studentRollNumber: student.rollNumber,
        studentName: student.name,
        department: student.department,
        course: student.course,
        academicYear: academicYear || student.academicYear,
        semester: semester ? Number(semester) : student.semester,
        feeType: feeType || 'SEMESTER_FEE',
        title: title.trim(),
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        pendingAmount: Number(totalAmount),
        dueDate,
        lateFeePerDay: Number(lateFeePerDay) || 50,
        status: 'PENDING',
        breakdown: parsedBreakdown,
        remarks: remarks || 'Individual fee assignment',
        createdAt: now,
        updatedAt: now
      };

      db.fees.push(feeRecord);
      createdFees.push(feeRecord);
    } else {
      // Batch assignment to matching students
      let targetStudents = db.students.filter((s) => s.status === 'ACTIVE');

      if (department && department !== 'ALL') {
        targetStudents = targetStudents.filter((s) => s.department === department);
      }

      if (semester && semester !== 'ALL') {
        targetStudents = targetStudents.filter((s) => s.semester === Number(semester));
      }

      if (targetStudents.length === 0) {
        res.status(400).json({ success: false, message: 'No active students found matching criteria.' });
        return;
      }

      targetStudents.forEach((student) => {
        const feeRecord: FeeRecord = {
          _id: generateId('fee'),
          studentId: student._id,
          studentRollNumber: student.rollNumber,
          studentName: student.name,
          department: student.department,
          course: student.course,
          academicYear: academicYear || student.academicYear,
          semester: semester ? Number(semester) : student.semester,
          feeType: feeType || 'SEMESTER_FEE',
          title: title.trim(),
          totalAmount: Number(totalAmount),
          paidAmount: 0,
          pendingAmount: Number(totalAmount),
          dueDate,
          lateFeePerDay: Number(lateFeePerDay) || 50,
          status: 'PENDING',
          breakdown: parsedBreakdown,
          remarks: remarks || `Batch assignment to ${student.department} Sem ${student.semester}`,
          createdAt: now,
          updatedAt: now
        };
        db.fees.push(feeRecord);
        createdFees.push(feeRecord);
      });
    }

    saveDB();

    addAuditLog(
      'FEES_ASSIGNED',
      {
        userId: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role
      },
      'FeeRecord',
      `Assigned fee "${title}" (Rs. ${totalAmount}) to ${createdFees.length} student(s)`
    );

    res.status(201).json({
      success: true,
      message: `Fee structure assigned to ${createdFees.length} student(s) successfully!`,
      assignedCount: createdFees.length,
      fees: createdFees
    });
  } catch (err: any) {
    console.error('Error assigning fee:', err);
    res.status(500).json({ success: false, message: 'Failed to assign fee records.' });
  }
});

// DELETE /api/admin/fees/:id
router.delete('/fees/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const fee = db.fees.find((f) => f._id === req.params.id);

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee record not found.' });
    return;
  }

  if (fee.paidAmount > 0) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete fee record with existing payment transactions. Please refund first.'
    });
    return;
  }

  db.fees = db.fees.filter((f) => f._id !== req.params.id);
  saveDB();

  addAuditLog(
    'FEE_RECORD_DELETED',
    {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role
    },
    'FeeRecord',
    `Deleted fee record "${fee.title}" for student ${fee.studentName} (${fee.studentRollNumber})`,
    fee._id
  );

  res.json({ success: true, message: 'Fee record deleted successfully.' });
});

// GET /api/admin/payments (All transactions with filters)
router.get('/payments', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { search, status, department, startDate, endDate, paymentMethod } = req.query;
  const db = getDB();

  let filtered = [...db.payments];

  if (search) {
    const q = String(search).toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.paymentId.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        p.studentName.toLowerCase().includes(q) ||
        p.rollNumber.toLowerCase().includes(q)
    );
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (department && department !== 'ALL') {
    filtered = filtered.filter((p) => p.department === department);
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    filtered = filtered.filter((p) => p.paymentMethod === paymentMethod);
  }

  if (startDate) {
    const start = new Date(String(startDate)).getTime();
    filtered = filtered.filter((p) => new Date(p.transactionDate).getTime() >= start);
  }

  if (endDate) {
    const end = new Date(String(endDate)).getTime() + 24 * 60 * 60 * 1000;
    filtered = filtered.filter((p) => new Date(p.transactionDate).getTime() <= end);
  }

  res.json({
    success: true,
    count: filtered.length,
    payments: filtered.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
  });
});

// GET /api/admin/receipt/:id (Fetch verified digital receipt for any transaction)
router.get('/receipt/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const db = getDB();

    const payment = db.payments.find(
      (p) =>
        p._id === id ||
        p.receiptNumber === id ||
        p.paymentId === id ||
        p.orderId === id
    );

    if (!payment) {
      res.status(404).json({ success: false, message: 'Verified payment record not found in database.' });
      return;
    }

    const receipt = buildReceiptData(payment, db);
    res.json({
      success: true,
      receipt
    });
  } catch (err: any) {
    console.error('Error fetching admin receipt:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve digital receipt.' });
  }
});

// GET /api/admin/reports (Generate Comprehensive Reports)
router.get('/reports', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDB();

    // 1. Pending and overdue defaulters
    const pendingFees = db.fees.filter((f) => f.pendingAmount > 0);
    const defaultersList = pendingFees.map((fee) => {
      const student = db.students.find((s) => s._id === fee.studentId || s.rollNumber === fee.studentRollNumber);
      const isPastDue = new Date(fee.dueDate).getTime() < Date.now();
      const overdueDays = isPastDue
        ? Math.floor((Date.now() - new Date(fee.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const lateFine = overdueDays * (fee.lateFeePerDay || 50);

      return {
        rollNumber: fee.studentRollNumber,
        studentName: fee.studentName,
        email: student?.email || 'N/A',
        department: fee.department,
        semester: fee.semester,
        guardianName: student?.guardianName || 'N/A',
        guardianPhone: student?.guardianPhone || student?.phone || 'N/A',
        feeTitle: fee.title,
        dueDate: fee.dueDate,
        overdueDays,
        pendingAmount: fee.pendingAmount,
        lateFine,
        totalDueWithFine: fee.pendingAmount + lateFine
      };
    }).sort((a, b) => b.overdueDays - a.overdueDays);

    // 2. Department Breakdown
    const deptMap: Record<string, { total: number; collected: number; pending: number; studentCount: number }> = {};
    
    db.students.forEach((s) => {
      if (!deptMap[s.department]) {
        deptMap[s.department] = { total: 0, collected: 0, pending: 0, studentCount: 0 };
      }
      deptMap[s.department].studentCount += 1;
    });

    db.fees.forEach((f) => {
      if (!deptMap[f.department]) {
        deptMap[f.department] = { total: 0, collected: 0, pending: 0, studentCount: 0 };
      }
      deptMap[f.department].total += f.totalAmount;
      deptMap[f.department].collected += f.paidAmount;
      deptMap[f.department].pending += f.pendingAmount;
    });

    const departmentStats = Object.entries(deptMap).map(([dept, vals]) => ({
      department: dept,
      ...vals,
      collectionRate: vals.total > 0 ? Math.round((vals.collected / vals.total) * 100) : 0
    }));

    // 3. Daily, Monthly, and Yearly Trends from successful payments
    const dailyMap: Record<string, { collected: number; count: number }> = {};
    const monthlyMap: Record<string, { collected: number; count: number }> = {};
    const yearlyMap: Record<string, { collected: number; count: number }> = {};

    const successfulPaymentsList: PaymentRecord[] = [];
    const failedPaymentsList: PaymentRecord[] = [];

    db.payments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        successfulPaymentsList.push(p);
        if (p.transactionDate) {
          const iso = toISOString(p.transactionDate);
          const dateKey = iso ? iso.split('T')[0] : '';
          const monthKey = dateKey ? dateKey.substring(0, 7) : '';
          const yearKey = dateKey ? dateKey.substring(0, 4) : '';

          if (dateKey) {
            dailyMap[dateKey] = dailyMap[dateKey] || { collected: 0, count: 0 };
            dailyMap[dateKey].collected += p.amount;
            dailyMap[dateKey].count += 1;
          }

          if (monthKey) {
            monthlyMap[monthKey] = monthlyMap[monthKey] || { collected: 0, count: 0 };
            monthlyMap[monthKey].collected += p.amount;
            monthlyMap[monthKey].count += 1;
          }

          if (yearKey) {
            yearlyMap[yearKey] = yearlyMap[yearKey] || { collected: 0, count: 0 };
            yearlyMap[yearKey].collected += p.amount;
            yearlyMap[yearKey].count += 1;
          }
        }
      } else {
        failedPaymentsList.push(p);
      }
    });

    const dailyTrends = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => ({ date, ...d }));

    const monthlyTrends = Object.entries(monthlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, d]) => ({ month, ...d }));

    const yearlyTrends = Object.entries(yearlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, d]) => ({ year, ...d }));

    const totalFeesBilled = db.fees.reduce((acc, f) => acc + f.totalAmount, 0);
    const totalCollected = db.fees.reduce((acc, f) => acc + f.paidAmount, 0);
    const totalPending = db.fees.reduce((acc, f) => acc + f.pendingAmount, 0);
    const collectionPercentage = totalFeesBilled > 0 ? Math.round((totalCollected / totalFeesBilled) * 100) : 0;

    const report = {
      generatedAt: new Date().toISOString(),
      totalFeesBilled,
      totalCollected,
      totalPending,
      collectionPercentage,
      departmentStats,
      defaultersList,
      dailyTrends,
      monthlyTrends,
      yearlyTrends,
      successfulPaymentsList,
      failedPaymentsList
    };

    res.json({
      success: true,
      report
    });
  } catch (err: any) {
    console.error('Error generating reports:', err);
    res.status(500).json({ success: false, message: 'Failed to generate financial reports.' });
  }
});

// POST /api/admin/send-notification (Send fee reminder/broadcast to students)
router.post('/send-notification', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { targetType, department, semester, studentId, message, title } = req.body;
    const db = getDB();

    if (!message) {
      res.status(400).json({ success: false, message: 'Notification message is required.' });
      return;
    }

    let recipientCount = 0;
    if (targetType === 'INDIVIDUAL' && studentId) {
      const student = db.students.find((s) => s._id === studentId || s.rollNumber === studentId);
      if (student) recipientCount = 1;
    } else if (targetType === 'DEFAULTERS') {
      const defaulterIds = new Set(db.fees.filter((f) => f.pendingAmount > 0).map((f) => f.studentId));
      recipientCount = defaulterIds.size;
    } else {
      let matching = db.students.filter((s) => s.status === 'ACTIVE');
      if (department && department !== 'ALL') {
        matching = matching.filter((s) => s.department === department);
      }
      if (semester && semester !== 'ALL') {
        matching = matching.filter((s) => s.semester === Number(semester));
      }
      recipientCount = matching.length;
    }

    addAuditLog(
      'NOTIFICATION_SENT',
      {
        userId: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role
      },
      'Notification',
      `Sent ${targetType || 'BROADCAST'} notice "${title || 'Fee Reminder'}" to ${recipientCount} recipients`
    );

    res.json({
      success: true,
      message: `Notification dispatched successfully to ${recipientCount} student recipient(s).`,
      recipients: recipientCount
    });
  } catch (err: any) {
    console.error('Error sending notice:', err);
    res.status(500).json({ success: false, message: 'Failed to send notification.' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  res.json({
    success: true,
    count: db.auditLogs.length,
    logs: db.auditLogs
  });
});

export default router;
