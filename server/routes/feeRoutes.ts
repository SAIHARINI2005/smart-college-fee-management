import express, { Response } from 'express';
import { getDB, saveDB, generateId, addAuditLog, FeeRecord } from '../db.js';
import { requireAdmin, authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = express.Router();

// GET /api/fees - List fee records with filtering & totals calculation
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { department, semester, feeType, status, studentId, search } = req.query;
  const db = getDB();

  let filtered = [...db.fees];

  if (req.user?.role === 'STUDENT') {
    filtered = filtered.filter(
      (f) => f.studentId === req.user?.studentId || f.studentRollNumber === req.user?.rollNumber
    );
  } else if (studentId) {
    filtered = filtered.filter(
      (f) => f.studentId === String(studentId) || f.studentRollNumber === String(studentId)
    );
  }

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

  // Calculate totals
  const totalBilled = filtered.reduce((acc, f) => acc + f.totalAmount, 0);
  const totalPaid = filtered.reduce((acc, f) => acc + f.paidAmount, 0);
  const totalPending = filtered.reduce((acc, f) => acc + f.pendingAmount, 0);

  res.json({
    success: true,
    count: filtered.length,
    calculations: {
      totalBilled,
      totalPaid,
      totalPending,
      collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0
    },
    fees: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
});

// GET /api/fees/:id - Get single fee record
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const fee = db.fees.find((f) => f._id === req.params.id);

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee record not found.' });
    return;
  }

  // Authorization check for student
  if (req.user?.role === 'STUDENT' && fee.studentRollNumber !== req.user.rollNumber && fee.studentId !== req.user.studentId) {
    res.status(403).json({ success: false, message: 'Access denied to this fee record.' });
    return;
  }

  const relatedPayments = db.payments.filter((p) => p.feeId === fee._id);

  res.json({
    success: true,
    fee,
    payments: relatedPayments
  });
});

// POST /api/fees - Create / assign fee record (Admin only)
router.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      studentId,
      studentRollNumber,
      title,
      totalAmount,
      dueDate,
      department,
      course,
      semester,
      academicYear,
      feeType,
      breakdown,
      lateFeePerDay,
      remarks
    } = req.body;

    if (!title || !totalAmount || !dueDate) {
      res.status(400).json({ success: false, message: 'Title, totalAmount, and dueDate are required.' });
      return;
    }

    const db = getDB();
    const now = new Date().toISOString();

    const targetStudent = studentRollNumber || studentId
      ? db.students.find((s) => s.rollNumber === studentRollNumber || s._id === studentId || s.rollNumber === studentId)
      : null;

    const amountNum = Number(totalAmount);
    const parsedBreakdown = Array.isArray(breakdown) && breakdown.length > 0
      ? breakdown.map((b: any) => ({
          id: b.id || generateId('b'),
          category: b.category || 'Tuition & Academic',
          amount: Number(b.amount) || 0,
          description: b.description || ''
        }))
      : [
          { id: generateId('b'), category: 'Tuition Fee', amount: Math.round(amountNum * 0.7) },
          { id: generateId('b'), category: 'Laboratory & Library', amount: amountNum - Math.round(amountNum * 0.7) }
        ];

    const newFee: FeeRecord = {
      _id: generateId('fee'),
      studentId: targetStudent?._id || studentId || 'N/A',
      studentRollNumber: targetStudent?.rollNumber || studentRollNumber || 'N/A',
      studentName: targetStudent?.name || req.body.studentName || 'Student',
      department: targetStudent?.department || department || 'Computer Science and Engineering',
      course: targetStudent?.course || course || 'B.Tech',
      academicYear: academicYear || targetStudent?.academicYear || '2025-2026',
      semester: semester ? Number(semester) : (targetStudent?.semester || 1),
      feeType: feeType || 'SEMESTER_FEE',
      title: title.trim(),
      totalAmount: amountNum,
      paidAmount: 0,
      pendingAmount: amountNum,
      dueDate,
      lateFeePerDay: Number(lateFeePerDay) || 50,
      status: 'PENDING',
      breakdown: parsedBreakdown,
      remarks: remarks || 'Fee structure created',
      createdAt: now,
      updatedAt: now
    };

    db.fees.unshift(newFee);
    saveDB();

    addAuditLog(
      'FEE_RECORD_CREATED',
      {
        userId: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role
      },
      'FeeRecord',
      `Created fee record "${newFee.title}" (₹${newFee.totalAmount}) for ${newFee.studentName} (${newFee.studentRollNumber})`,
      newFee._id
    );

    res.status(201).json({
      success: true,
      message: 'Fee record created successfully!',
      fee: newFee
    });
  } catch (err: any) {
    console.error('Error creating fee:', err);
    res.status(500).json({ success: false, message: 'Server error while creating fee record.' });
  }
});

// PUT /api/fees/:id - Update fee record (Admin only)
router.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const feeIndex = db.fees.findIndex((f) => f._id === req.params.id);

  if (feeIndex === -1) {
    res.status(404).json({ success: false, message: 'Fee record not found.' });
    return;
  }

  const existing = db.fees[feeIndex];
  const { title, totalAmount, dueDate, lateFeePerDay, breakdown, remarks, feeType } = req.body;

  const newTotal = totalAmount !== undefined ? Number(totalAmount) : existing.totalAmount;
  const newPending = Math.max(0, newTotal - existing.paidAmount);
  const newStatus = newPending === 0 ? 'PAID' : existing.paidAmount > 0 ? 'PARTIAL' : 'PENDING';

  const updatedFee: FeeRecord = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    totalAmount: newTotal,
    pendingAmount: newPending,
    status: newStatus,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    lateFeePerDay: lateFeePerDay !== undefined ? Number(lateFeePerDay) : existing.lateFeePerDay,
    feeType: feeType !== undefined ? feeType : existing.feeType,
    breakdown: breakdown !== undefined ? breakdown : existing.breakdown,
    remarks: remarks !== undefined ? remarks : existing.remarks,
    updatedAt: new Date().toISOString()
  };

  db.fees[feeIndex] = updatedFee;
  saveDB();

  addAuditLog(
    'FEE_RECORD_UPDATED',
    {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role
    },
    'FeeRecord',
    `Updated fee record "${updatedFee.title}"`,
    updatedFee._id
  );

  res.json({
    success: true,
    message: 'Fee record updated successfully.',
    fee: updatedFee
  });
});

// DELETE /api/fees/:id - Delete fee record (Admin only)
router.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const fee = db.fees.find((f) => f._id === req.params.id);

  if (!fee) {
    res.status(404).json({ success: false, message: 'Fee record not found.' });
    return;
  }

  if (fee.paidAmount > 0) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete fee record with existing payment transactions.'
    });
    return;
  }

  db.fees = db.fees.filter((f) => f._id !== req.params.id);
  saveDB();

  res.json({
    success: true,
    message: 'Fee record deleted successfully.'
  });
});

export default router;
