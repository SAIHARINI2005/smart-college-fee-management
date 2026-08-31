import express, { Request, Response } from 'express';
import {
  getDB,
  saveDB,
  generateId,
  generateReceiptNumber,
  addAuditLog,
  saveReceiptRecord,
  PaymentRecord,
  FeeRecord,
  Student
} from '../db.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayPaymentDetails,
  verifyWebhookSignature,
  getPublicKey,
  getRazorpayCredentials
} from '../razorpayService.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

const router = express.Router();

// GET /api/payment/key (Public Razorpay Key for Frontend Checkout initialization)
router.get('/key', (_req: Request, res: Response): void => {
  const creds = getRazorpayCredentials();
  res.json({
    success: true,
    key: creds.keyId,
    isConfigured: creds.isConfigured,
    isTestMode: creds.isTestMode
  });
});

// POST /api/payment/create-order
// Creates order on server with validation, preventing client-side price tampering
router.post('/create-order', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feeId, amountToPay, paymentNotes } = req.body;

    if (!feeId || !amountToPay || Number(amountToPay) <= 0) {
      res.status(400).json({ success: false, message: 'Valid fee record ID and payable amount required.' });
      return;
    }

    const db = getDB();
    const fee = db.fees.find((f) => f._id === feeId);

    if (!fee) {
      res.status(404).json({ success: false, message: 'Fee record not found in database.' });
      return;
    }

    if (fee.pendingAmount <= 0) {
      res.status(400).json({ success: false, message: 'This fee record is already paid in full.' });
      return;
    }

    const payAmount = Number(amountToPay);
    if (payAmount > fee.pendingAmount) {
      res.status(400).json({
        success: false,
        message: `Amount exceeds current outstanding pending balance of ₹${fee.pendingAmount.toLocaleString('en-IN')}`
      });
      return;
    }

    const student = db.students.find((s) => s._id === fee.studentId || s.rollNumber === fee.studentRollNumber);
    const receiptNum = generateReceiptNumber();

    // Ensure valid 10-digit Indian phone number without formatting/spaces
    const rawPhone = student?.phone || (req.user as any)?.phone || '';
    const digitsOnly = rawPhone.replace(/\D/g, '');
    let cleanPhone = '9876543210';
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      cleanPhone = digitsOnly.substring(2);
    } else if (digitsOnly.length === 10) {
      cleanPhone = digitsOnly;
    } else if (digitsOnly.length > 10) {
      cleanPhone = digitsOnly.slice(-10);
    }

    console.log(`📝 [Payment API] Creating Razorpay Order for Student: ${fee.studentName} (${fee.studentRollNumber}), Fee: ${fee.title}, Amount: ₹${payAmount}`);

    // Create REAL order via Razorpay Server SDK
    const order = await createRazorpayOrder({
      amount: payAmount,
      receipt: receiptNum,
      notes: {
        feeId: fee._id,
        studentId: student?._id || fee.studentId,
        rollNumber: fee.studentRollNumber,
        studentName: fee.studentName,
        feeTitle: fee.title,
        notes: paymentNotes || 'College Fee Settlement'
      }
    });

    console.log(`💳 [Payment API] Created order ${order.id} for fee ${fee._id}`);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount, // in paise
        currency: order.currency,
        receipt: receiptNum,
        feeId: fee._id,
        feeTitle: fee.title,
        studentName: fee.studentName,
        studentRollNumber: fee.studentRollNumber,
        studentEmail: student?.email || req.user?.email || 'student@college.edu',
        studentPhone: cleanPhone,
        key_id: order.key_id
      }
    });
  } catch (err: any) {
    console.error('❌ [Payment API] Error creating Razorpay order:', err.message || err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate Razorpay payment order. Check Razorpay credentials.'
    });
  }
});

// POST /api/payment/verify and POST /api/payment/verify-payment
// Verifies HMAC-SHA256 signature, verifies payment status directly with Razorpay API, updates fee balances & creates receipt
const handlePaymentVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      feeId,
      notes = ''
    } = req.body;

    console.log(`🔐 [Payment API] Verifying Razorpay payment:`, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      hasSignature: Boolean(razorpay_signature),
      feeId
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature in verification request.'
      });
      return;
    }

    const db = getDB();

    // 1. Prevent Duplicate Payments: check if razorpay_payment_id already verified and recorded
    const existingPayment = db.payments.find(
      (p) => p.paymentId === razorpay_payment_id && p.status === 'SUCCESS'
    );
    if (existingPayment) {
      console.warn(`⚠️ [Payment API] Duplicate verification attempt for payment ID ${razorpay_payment_id}`);
      res.json({
        success: true,
        message: 'This payment has already been verified and recorded.',
        payment: existingPayment
      });
      return;
    }

    // 2. Server-side Cryptographic Signature Verification
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      console.error(`❌ [Payment API] Signature verification failed for payment ${razorpay_payment_id}`);
      
      // Record failed payment attempt for audit logs
      const failedPayment: PaymentRecord = {
        _id: generateId('pay_fail'),
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        feeId: feeId || 'unknown',
        studentId: req.user?.studentId || 'unknown',
        studentName: req.user?.name || 'Unknown Student',
        rollNumber: req.user?.rollNumber || 'N/A',
        department: 'N/A',
        academicYear: '2025-2026',
        semester: 1,
        amount: 0,
        feeType: 'SEMESTER_FEE',
        paymentMethod: 'UPI',
        status: 'FAILED',
        receiptNumber: `FAIL-${Date.now()}`,
        transactionDate: new Date().toISOString(),
        failureReason: 'Cryptographic signature mismatch / Tampering detected',
        createdAt: new Date().toISOString()
      };
      db.payments.push(failedPayment);
      saveDB();

      res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid Razorpay cryptographic signature.'
      });
      return;
    }

    // 3. Verify payment status directly with Razorpay API
    let razorpayPaymentDetails: any = null;
    let actualPaidAmountInRupees = 0;
    let actualPaymentMethod: any = 'UPI';

    try {
      razorpayPaymentDetails = await fetchRazorpayPaymentDetails(razorpay_payment_id);
      if (razorpayPaymentDetails) {
        if (razorpayPaymentDetails.order_id !== razorpay_order_id) {
          throw new Error(`Payment order mismatch: expected ${razorpay_order_id}, got ${razorpayPaymentDetails.order_id}`);
        }
        
        actualPaidAmountInRupees = (razorpayPaymentDetails.amount || 0) / 100;
        const methodStr = (razorpayPaymentDetails.method || 'upi').toLowerCase();
        if (methodStr === 'card') actualPaymentMethod = 'CREDIT_CARD';
        else if (methodStr === 'netbanking') actualPaymentMethod = 'NET_BANKING';
        else if (methodStr === 'wallet') actualPaymentMethod = 'WALLET';
        else actualPaymentMethod = 'UPI';
      }
    } catch (fetchErr: any) {
      console.warn(`⚠️ [Payment API] Could not fetch payment details via Razorpay API (proceeding with verified signature):`, fetchErr.message);
    }

    // 4. Find fee record and update balances in MongoDB
    const fee = db.fees.find((f) => f._id === feeId);
    if (!fee) {
      res.status(404).json({ success: false, message: 'Target fee record not found in database.' });
      return;
    }

    const student = db.students.find((s) => s._id === fee.studentId || s.rollNumber === fee.studentRollNumber);
    const receiptNumber = generateReceiptNumber();
    const now = new Date().toISOString();

    // Determine paid amount for this transaction (from Razorpay verified API or request amount)
    const transactionAmount = actualPaidAmountInRupees > 0
      ? actualPaidAmountInRupees
      : req.body.amount
      ? Number(req.body.amount)
      : fee.pendingAmount;

    const newPaidAmount = fee.paidAmount + transactionAmount;
    const newPendingAmount = Math.max(0, fee.totalAmount - newPaidAmount);
    const newStatus = newPendingAmount === 0 ? 'PAID' : 'PARTIAL';

    fee.paidAmount = newPaidAmount;
    fee.pendingAmount = newPendingAmount;
    fee.status = newStatus;
    fee.updatedAt = now;

    // 5. Create verified payment record
    const paymentRecord: PaymentRecord = {
      _id: generateId('pay'),
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
      feeId: fee._id,
      studentId: student?._id || fee.studentId,
      studentName: fee.studentName,
      rollNumber: fee.studentRollNumber,
      department: fee.department,
      academicYear: fee.academicYear,
      semester: fee.semester,
      amount: transactionAmount,
      feeType: fee.feeType,
      paymentMethod: actualPaymentMethod,
      status: 'SUCCESS',
      receiptNumber,
      transactionDate: now,
      razorpayDetails: {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        bank: razorpayPaymentDetails?.bank || req.body.bank,
        vpa: razorpayPaymentDetails?.vpa || req.body.vpa,
        wallet: razorpayPaymentDetails?.wallet || req.body.wallet,
        cardLast4: razorpayPaymentDetails?.card?.last4
      },
      verifiedAt: now,
      notes: notes || `Paid towards ${fee.title} via Razorpay Test Mode`,
      createdAt: now
    };

    db.payments.unshift(paymentRecord);
    saveDB();

    // 6. Generate & Save Receipt directly to MongoDB receipts collection
    const receiptData = buildReceiptData(paymentRecord, db);
    saveReceiptRecord(receiptData).catch((e) => console.warn('Async receipt save notice:', e));

    console.log(`✅ [Payment API] Successfully processed & saved payment: ${razorpay_payment_id} | Order: ${razorpay_order_id} | Amount: ₹${transactionAmount} | Receipt: ${receiptNumber}`);

    // 7. Audit Logging
    addAuditLog(
      'PAYMENT_VERIFIED_SUCCESS',
      {
        userId: req.user!.userId,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role
      },
      'PaymentRecord',
      `Razorpay Test Mode payment of ₹${transactionAmount.toLocaleString('en-IN')} verified for ${fee.studentName} (${fee.studentRollNumber}). Receipt #${receiptNumber} generated.`,
      paymentRecord._id
    );

    res.json({
      success: true,
      message: 'Razorpay payment verified and credited successfully!',
      paymentId: paymentRecord.paymentId,
      receiptNumber: paymentRecord.receiptNumber,
      payment: paymentRecord,
      fee: {
        id: fee._id,
        title: fee.title,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.pendingAmount,
        status: fee.status
      }
    });
  } catch (err: any) {
    console.error('❌ [Payment API] Error verifying payment:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error during payment verification.' });
  }
};

router.post('/verify', authenticateToken, handlePaymentVerification);
router.post('/verify-payment', authenticateToken, handlePaymentVerification);

// POST /api/payment/cancel (Handle user cancellation or modal dismiss)
router.post('/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { orderId, feeId, reason } = req.body;
  const db = getDB();

  console.log(`ℹ️ [Payment API] Payment cancelled/dismissed: orderId = ${orderId}, reason = ${reason}`);

  const cancelRecord: PaymentRecord = {
    _id: generateId('pay_cancel'),
    paymentId: `CANCELLED_${Date.now()}`,
    orderId: orderId || 'N/A',
    feeId: feeId || 'N/A',
    studentId: req.user?.studentId || 'unknown',
    studentName: req.user?.name || 'Student',
    rollNumber: req.user?.rollNumber || 'N/A',
    department: 'N/A',
    academicYear: '2025-2026',
    semester: 1,
    amount: 0,
    feeType: 'SEMESTER_FEE',
    paymentMethod: 'UPI',
    status: 'CANCELLED',
    receiptNumber: `CANCEL-${Date.now()}`,
    transactionDate: new Date().toISOString(),
    failureReason: reason || 'Customer closed Razorpay payment modal or cancelled transaction',
    createdAt: new Date().toISOString()
  };

  db.payments.push(cancelRecord);
  saveDB();

  res.json({ success: true, message: 'Payment cancellation logged.' });
});

// Track processed webhook event IDs in-memory to prevent duplicate processing
const processedWebhookEvents = new Set<string>();

// POST /api/payment/webhook (Razorpay Webhook for asynchronous server-to-server notifications)
router.post('/webhook', (req: Request, res: Response): void => {
  try {
    const signature = (req.headers['x-razorpay-signature'] || '') as string;
    const bodyStr = JSON.stringify(req.body);

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(bodyStr, signature);
      if (!isValid) {
        console.error('❌ [Webhook] Invalid Razorpay webhook signature');
        res.status(400).json({ error: 'Invalid webhook signature.' });
        return;
      }
    }

    const event = req.body.event;
    const eventId = req.headers['x-razorpay-event-id'] as string || req.body.event_id || `${event}_${Date.now()}`;
    const payload = req.body.payload;
    const db = getDB();

    // Prevent duplicate webhook event processing
    if (eventId && processedWebhookEvents.has(eventId)) {
      console.log(`ℹ️ [Webhook] Duplicate webhook event ${eventId} ignored.`);
      res.json({ status: 'ok', message: 'Event already processed' });
      return;
    }
    if (eventId) {
      processedWebhookEvents.add(eventId);
    }

    console.log(`🔔 [Webhook] Received Razorpay event: ${event}`);

    // Event 1: payment.captured or order.paid
    if ((event === 'payment.captured' || event === 'order.paid') && (payload?.payment?.entity || payload?.order?.entity)) {
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      const paymentId = paymentEntity?.id || `pay_wh_${Date.now()}`;
      const orderId = paymentEntity?.order_id || orderEntity?.id || 'N/A';
      const amountInPaise = paymentEntity?.amount || orderEntity?.amount_paid || 0;
      const amount = amountInPaise / 100;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};

      // Check if already processed
      const existing = db.payments.find((p) => p.paymentId === paymentId && p.status === 'SUCCESS');
      if (!existing && amount > 0) {
        const feeId = notes?.feeId;
        const studentRollNumber = notes?.rollNumber;
        let fee = feeId ? db.fees.find((f) => f._id === feeId) : null;
        if (!fee && studentRollNumber) {
          fee = db.fees.find((f) => f.studentRollNumber === studentRollNumber && f.pendingAmount > 0);
        }

        if (fee) {
          fee.paidAmount += amount;
          fee.pendingAmount = Math.max(0, fee.totalAmount - fee.paidAmount);
          fee.status = fee.pendingAmount === 0 ? 'PAID' : 'PARTIAL';
          fee.updatedAt = new Date().toISOString();

          const newPay: PaymentRecord = {
            _id: generateId('pay_wh'),
            paymentId,
            orderId,
            feeId: fee._id,
            studentId: fee.studentId,
            studentName: fee.studentName,
            rollNumber: fee.studentRollNumber,
            department: fee.department,
            academicYear: fee.academicYear,
            semester: fee.semester,
            amount,
            feeType: fee.feeType,
            paymentMethod: (paymentEntity?.method || 'UPI').toUpperCase() as any,
            status: 'SUCCESS',
            receiptNumber: generateReceiptNumber(),
            transactionDate: new Date().toISOString(),
            verifiedAt: new Date().toISOString(),
            notes: 'Processed via Razorpay Webhook',
            createdAt: new Date().toISOString()
          };

          db.payments.unshift(newPay);
          saveDB();

          const rData = buildReceiptData(newPay, db);
          saveReceiptRecord(rData).catch(() => {});

          addAuditLog(
            'WEBHOOK_PAYMENT_CAPTURED',
            { userId: 'RAZORPAY_WEBHOOK', name: 'Razorpay System', email: 'webhook@razorpay.com', role: 'ADMIN' },
            'PaymentRecord',
            `Razorpay webhook captured payment ${paymentId} of ₹${amount} for ${fee.studentName} (${fee.studentRollNumber})`,
            newPay._id
          );
        }
      }
    } else if (event === 'payment.failed' && payload?.payment?.entity) {
      // Event 2: payment.failed
      const paymentEntity = payload.payment.entity;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const notes = paymentEntity.notes || {};

      const existingFailed = db.payments.find((p) => p.paymentId === paymentId);
      if (!existingFailed) {
        const failedPay: PaymentRecord = {
          _id: generateId('pay_fail_wh'),
          paymentId,
          orderId,
          feeId: notes.feeId || 'N/A',
          studentId: notes.studentId || 'unknown',
          studentName: notes.studentName || 'Student',
          rollNumber: notes.rollNumber || 'N/A',
          department: 'N/A',
          academicYear: '2025-2026',
          semester: 1,
          amount: (paymentEntity.amount || 0) / 100,
          feeType: 'SEMESTER_FEE',
          paymentMethod: (paymentEntity.method || 'UPI').toUpperCase() as any,
          status: 'FAILED',
          receiptNumber: `FAIL-${Date.now()}`,
          transactionDate: new Date().toISOString(),
          failureReason: paymentEntity.error_description || 'Payment failed on Razorpay checkout',
          createdAt: new Date().toISOString()
        };

        db.payments.push(failedPay);
        saveDB();
      }
    }

    res.json({ status: 'ok', received: true });
  } catch (err) {
    console.error('❌ [Webhook] Webhook processing error:', err);
    res.status(500).json({ error: 'Internal webhook error.' });
  }
});

// Helper function to build full digital receipt from MongoDB payment record
export function buildReceiptData(payment: PaymentRecord, db: any) {
  const student = db.students.find(
    (s: any) => s._id === payment.studentId || s.rollNumber === payment.rollNumber
  );
  const fee = db.fees.find((f: any) => f._id === payment.feeId);

  const totalFee = fee ? fee.totalAmount : payment.amount;
  const currentPaid = payment.amount;
  const remainingPending = fee ? fee.pendingAmount : 0;
  const previousPaid = fee ? Math.max(0, fee.paidAmount - payment.amount) : 0;

  return {
    receiptNumber: payment.receiptNumber,
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    transactionDate: payment.transactionDate,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    verificationStatus: 'VERIFIED & CAPTURED',
    verifiedAt: payment.verifiedAt || payment.transactionDate,
    student: {
      id: student?._id || payment.studentId,
      name: student?.name || payment.studentName,
      rollNumber: student?.rollNumber || payment.rollNumber,
      registrationNo: student?.registrationNo || `REG-${payment.rollNumber}`,
      course: student?.course || 'Bachelor of Technology (B.Tech)',
      department: student?.department || payment.department,
      semester: student?.semester || payment.semester,
      academicYear: student?.academicYear || payment.academicYear,
      admissionQuota: student?.admissionQuota || 'MERIT',
      feeCategory: student?.feeCategory || 'REGULAR',
      email: student?.email || 'student@college.edu',
      phone: student?.phone || '9876543210'
    },
    feeDetails: fee
      ? {
          title: fee.title,
          feeType: fee.feeType,
          totalFee: fee.totalAmount,
          previousPaidAmount: previousPaid,
          currentPaymentAmount: currentPaid,
          remainingPending: remainingPending,
          breakdown: fee.breakdown || []
        }
      : {
          title: payment.feeType || 'College Tuition & Academic Fee',
          feeType: payment.feeType || 'SEMESTER_FEE',
          totalFee: totalFee,
          previousPaidAmount: previousPaid,
          currentPaymentAmount: currentPaid,
          remainingPending: remainingPending,
          breakdown: [
            {
              id: 'item_1',
              category: 'Tuition & Semester Fee',
              amount: payment.amount,
              description: 'Verified Razorpay settlement installment'
            }
          ]
        },
    paymentDetails: {
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      paymentMethod: payment.paymentMethod,
      transactionStatus: 'Payment Successful',
      verificationStatus: 'VERIFIED & CAPTURED',
      verifiedAt: payment.verifiedAt || payment.transactionDate,
      bank: payment.razorpayDetails?.bank,
      vpa: payment.razorpayDetails?.vpa,
      wallet: payment.razorpayDetails?.wallet,
      cardLast4: payment.razorpayDetails?.cardLast4
    },
    amountDetails: {
      amountPaid: payment.amount,
      totalFee: totalFee,
      remainingBalance: remainingPending
    },
    college: {
      name: 'INSTITUTE OF TECHNOLOGY & ADVANCED STUDIES',
      affiliation: 'Affiliated to State Technical University | Approved by AICTE, New Delhi',
      accreditation: 'NAAC "A++" Grade Accredited Institution • Autonomous',
      address: 'Knowledge Park IV, Innovation Corridor, Cyber City - 500081',
      contact: 'Email: accounts@college.edu | Tel: +91 40 2345 6789',
      website: 'www.itas-college.edu.in'
    }
  };
}

// GET /api/payment/receipt/:id (Unified Digital Receipt Endpoint)
router.get('/receipt/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
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

    // Security check: If student, ensure the receipt belongs to them
    if (req.user?.role === 'STUDENT') {
      const student = db.students.find(
        (s) => s.userId === req.user?.userId || s.email.toLowerCase() === req.user?.email.toLowerCase()
      );
      if (student && payment.studentId !== student._id && payment.rollNumber !== student.rollNumber) {
        res.status(403).json({ success: false, message: 'Unauthorized access to this receipt.' });
        return;
      }
    }

    const receipt = buildReceiptData(payment, db);
    res.json({
      success: true,
      receipt
    });
  } catch (err: any) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve digital receipt.' });
  }
});

export default router;
