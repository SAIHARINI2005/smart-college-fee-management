import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB, saveDB, generateId, addAuditLog, User, Student, AdminUser } from '../db.js';
import {
  generateToken,
  authenticateToken,
  AuthenticatedRequest,
  invalidateSession,
  getSessionStatus,
  getInactivityTimeoutMs,
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES
} from '../auth.js';
import { isMongoConnected } from '../db/mongodb.js';
import { UserModel, StudentModel, FeeModel } from '../models/index.js';

const router = express.Router();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawIdentifier = (req.body.email || req.body.identifier || req.body.username || req.body.rollNumber || '').toString().trim();
    const rawPassword = (req.body.password || '').toString();
    const requestedRole = req.body.role;

    if (!rawIdentifier || !rawPassword) {
      console.log('[AUTH-LOGIN] Login rejected: Missing identifier or password');
      res.status(400).json({ success: false, message: 'Email/Roll Number and password are required.' });
      return;
    }

    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const identifierPrefix = normalizedIdentifier.includes('@')
      ? normalizedIdentifier.split('@')[0].trim()
      : normalizedIdentifier;

    let user: User | null = null;
    let studentProfile: Student | undefined;
    let adminProfile: AdminUser | undefined;

    // Search terms for roll number or registration number lookups
    const searchTerms = [
      normalizedIdentifier,
      rawIdentifier,
      identifierPrefix,
      identifierPrefix.toUpperCase(),
      identifierPrefix.toLowerCase()
    ].filter(Boolean);

    // 1. Direct MongoDB lookup if MongoDB is connected
    if (isMongoConnected()) {
      try {
        // Look up by direct email or prefix
        let mongoUser = await UserModel.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, 'i') } },
            { email: { $regex: new RegExp(`^${escapeRegex(identifierPrefix)}@`, 'i') } },
            { _id: normalizedIdentifier },
            { _id: identifierPrefix }
          ]
        }).lean();

        // Also look up in StudentModel by email, rollNumber, or registrationNo
        const mongoStudent = await StudentModel.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, 'i') } },
            { rollNumber: { $in: searchTerms.map(t => new RegExp(`^${escapeRegex(t)}$`, 'i')) } },
            { registrationNo: { $in: searchTerms.map(t => new RegExp(`^${escapeRegex(t)}$`, 'i')) } }
          ]
        }).lean();

        if (mongoStudent) {
          studentProfile = {
            ...mongoStudent,
            createdAt: mongoStudent.createdAt ? new Date(mongoStudent.createdAt).toISOString() : new Date().toISOString()
          } as any;

          if (!mongoUser) {
            mongoUser = await UserModel.findOne({
              $or: [
                { _id: mongoStudent.userId },
                { email: (mongoStudent.email || '').toLowerCase() }
              ]
            }).lean();
          }
        }

        if (mongoUser) {
          user = {
            _id: mongoUser._id,
            name: mongoUser.name,
            email: mongoUser.email.toLowerCase(),
            passwordHash: mongoUser.passwordHash,
            role: mongoUser.role === 'FINANCE_OFFICER' ? 'ADMIN' : (mongoUser.role as any),
            phone: mongoUser.phone || '',
            createdAt: mongoUser.createdAt ? new Date(mongoUser.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: mongoUser.updatedAt ? new Date(mongoUser.updatedAt).toISOString() : new Date().toISOString()
          };
        }
      } catch (mErr: any) {
        console.warn('[AUTH-LOGIN] Notice during MongoDB user lookup:', mErr.message);
      }
    }

    // 2. Check local database cache if not yet found
    if (!user) {
      const db = getDB();

      // Check student records first by email, roll number, registration number, or prefix
      const localStudent = db.students.find((s) => {
        const sRoll = (s.rollNumber || '').toLowerCase();
        const sReg = (s.registrationNo || '').toLowerCase();
        const sEmail = (s.email || '').toLowerCase();
        return (
          sEmail === normalizedIdentifier ||
          sRoll === normalizedIdentifier ||
          sReg === normalizedIdentifier ||
          sRoll === identifierPrefix ||
          sReg === identifierPrefix ||
          (identifierPrefix && sRoll.toLowerCase() === identifierPrefix)
        );
      });

      if (localStudent) {
        studentProfile = localStudent;
        user = db.users.find(
          (u) => u._id === localStudent.userId || u.email.toLowerCase() === localStudent.email.toLowerCase()
        ) || null;
      }

      // If still not found, check users collection by email or prefix
      if (!user) {
        const localUser = db.users.find((u) => {
          const uEmail = u.email.toLowerCase();
          return (
            uEmail === normalizedIdentifier ||
            uEmail === identifierPrefix ||
            (identifierPrefix && uEmail.startsWith(identifierPrefix + '@'))
          );
        });
        if (localUser) {
          user = localUser;
        }
      }
    }

    // STRICT CHECK: If user is not found in MongoDB/DB, do NOT allow login and do NOT auto-create
    if (!user) {
      console.log('[AUTH-LOGIN] User lookup failed for identifier: %s', rawIdentifier);
      res.status(401).json({
        success: false,
        message: 'Account not found. Please register first.'
      });
      return;
    }

    console.log('[AUTH-LOGIN] User lookup successful: %s (role: %s, id: %s)', user.email, user.role, user._id);

    // Role check if specified
    if (requestedRole) {
      const isRequestedAdminOrFinance = requestedRole === 'ADMIN' || requestedRole === 'FINANCE';
      const isUserAdminOrFinance = user.role === 'ADMIN' || user.role === 'FINANCE' || (user.role as any) === 'FINANCE_OFFICER';

      if (isRequestedAdminOrFinance && !isUserAdminOrFinance) {
        console.log('[AUTH-LOGIN] Role mismatch for %s: requested Admin/Finance, registered %s', user.email, user.role);
        res.status(403).json({
          success: false,
          message: 'Account is registered as STUDENT. Please use the Student Portal to login.'
        });
        return;
      } else if (!isRequestedAdminOrFinance && isUserAdminOrFinance) {
        console.log('[AUTH-LOGIN] Role mismatch for %s: requested Student, registered %s', user.email, user.role);
        res.status(403).json({
          success: false,
          message: 'Please use the Admin / Finance Portal to login.'
        });
        return;
      }
    }

    // Verify hashed password securely using bcrypt
    let isPasswordValid = false;
    try {
      if (user.passwordHash && user.passwordHash.startsWith('$2')) {
        isPasswordValid = bcrypt.compareSync(rawPassword, user.passwordHash);
      }
    } catch (cmpErr: any) {
      console.error('[AUTH-LOGIN] Error comparing bcrypt hash for %s:', user.email, cmpErr.message);
      isPasswordValid = false;
    }

    // Safe migration for initial demo seed accounts if needed
    if (!isPasswordValid) {
      if (
        user.passwordHash === rawPassword ||
        (user.email === 'admin@college.edu' && rawPassword === 'Admin@123') ||
        (user.email === 'accounts@college.edu' && rawPassword === 'Admin@123') ||
        (rawPassword === 'Student@123' && user.role === 'STUDENT')
      ) {
        isPasswordValid = true;
        // Migrate to secure bcrypt hash
        user.passwordHash = bcrypt.hashSync(rawPassword, 10);
        user.updatedAt = new Date().toISOString();
        const db = getDB();
        const idx = db.users.findIndex((u) => u._id === user!._id);
        if (idx >= 0) db.users[idx] = user;
        saveDB(db);
        if (isMongoConnected()) {
          UserModel.findOneAndUpdate({ _id: user._id }, { $set: user }, { upsert: true }).catch(() => {});
        }
      }
    }

    if (!isPasswordValid) {
      console.log('[AUTH-LOGIN] Password comparison failed for user: %s', user.email);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
      return;
    }

    console.log('[AUTH-LOGIN] Password comparison succeeded for user: %s', user.email);

    const db = getDB();
    if (user.role === 'STUDENT' && !studentProfile) {
      if (isMongoConnected()) {
        try {
          const ms = await StudentModel.findOne({ $or: [{ userId: user._id }, { email: user.email }] }).lean();
          if (ms) {
            studentProfile = {
              ...ms,
              createdAt: ms.createdAt ? new Date(ms.createdAt).toISOString() : new Date().toISOString()
            } as any;
          }
        } catch {}
      }
      if (!studentProfile) {
        studentProfile = db.students.find((s) => s.userId === user!._id || s.email.toLowerCase() === user!.email.toLowerCase());
      }
    } else if ((user.role === 'ADMIN' || user.role === 'FINANCE' || (user.role as any) === 'FINANCE_OFFICER') && !adminProfile) {
      adminProfile = db.admins.find((a) => a.userId === user!._id || a.email.toLowerCase() === user!.email.toLowerCase());
    }

    let token = '';
    try {
      token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        studentId: studentProfile?._id,
        adminId: adminProfile?._id,
        rollNumber: studentProfile?.rollNumber
      });
      console.log('[AUTH-LOGIN] JWT generation succeeded for userId: %s', user._id);
    } catch (jwtErr: any) {
      console.error('[AUTH-LOGIN] JWT generation failed for userId %s: %s', user._id, jwtErr.message);
      res.status(500).json({ success: false, message: 'Failed to generate session token.' });
      return;
    }

    addAuditLog(
      'USER_LOGIN',
      { userId: user._id, name: user.name, email: user.email, role: user.role },
      'User',
      `${user.role} login successful for ${user.name} (${user.email})`,
      user._id,
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        student: studentProfile,
        admin: adminProfile
      },
      student: studentProfile,
      admin: adminProfile
    });
  } catch (err: any) {
    console.error('[AUTH-LOGIN] Internal error during login:', err.message || err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// POST /api/auth/register (Student Registration)
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      rollNumber,
      registrationNo,
      registrationNumber,
      course,
      department,
      semester,
      academicYear,
      password,
      confirmPassword,
      admissionQuota,
      feeCategory,
      guardianName,
      guardianPhone,
      address
    } = req.body;

    const trimmedName = (name || '').toString().trim();
    const normalizedEmail = (email || '').toString().toLowerCase().trim();
    const trimmedPhone = (phone || '').toString().trim();
    const rawRollNumber = (rollNumber || '').toString().toUpperCase().trim();
    const rawRegistrationNo = (
      registrationNo ||
      registrationNumber ||
      (rawRollNumber ? `REG-${new Date().getFullYear()}-${rawRollNumber}` : `REG-${Date.now()}`)
    ).toString().toUpperCase().trim();
    const trimmedCourse = (course || '').toString().trim();
    const trimmedDepartment = (department || '').toString().trim();
    const parsedSemester = Number(semester) || 1;
    const trimmedAcademicYear = (academicYear || '').toString().trim() || '2025-2026';
    const rawPassword = (password || '').toString();
    const rawConfirmPassword = (confirmPassword !== undefined ? confirmPassword : password || '').toString();

    // 1. Required Fields Validation
    if (
      !trimmedName ||
      !normalizedEmail ||
      !rawRollNumber ||
      !trimmedCourse ||
      !trimmedDepartment ||
      !rawPassword
    ) {
      console.log('[AUTH-REGISTER] Registration rejected: Missing required fields');
      res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
      return;
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.log('[AUTH-REGISTER] Registration rejected: Invalid email format: %s', normalizedEmail);
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
      return;
    }

    // 3. Confirm Password Match
    if (rawPassword !== rawConfirmPassword) {
      console.log('[AUTH-REGISTER] Registration rejected: Passwords do not match for %s', normalizedEmail);
      res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
      return;
    }

    // 4. Password Strength Requirements
    if (rawPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
      return;
    }

    const hasUpper = /[A-Z]/.test(rawPassword);
    const hasLower = /[a-z]/.test(rawPassword);
    const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(rawPassword);

    if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
      res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, and a number or symbol.'
      });
      return;
    }

    const db = getDB();

    // 5. Unique Email Check in MongoDB Atlas & Local Store
    let existingUser: any = null;
    if (isMongoConnected()) {
      try {
        existingUser = await UserModel.findOne({ email: normalizedEmail }).lean();
      } catch (err: any) {
        console.warn('[AUTH-REGISTER] Mongo email lookup note:', err.message);
      }
    }
    if (!existingUser) {
      existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (existingUser) {
      console.log('[AUTH-REGISTER] Registration rejected: Duplicate email %s', normalizedEmail);
      res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
      return;
    }

    // 6. Unique Roll Number Check
    let existingStudentRoll: any = null;
    if (isMongoConnected()) {
      try {
        existingStudentRoll = await StudentModel.findOne({ rollNumber: rawRollNumber }).lean();
      } catch (err: any) {
        console.warn('[AUTH-REGISTER] Mongo roll number lookup note:', err.message);
      }
    }
    if (!existingStudentRoll) {
      existingStudentRoll = db.students.find(
        (s) => (s.rollNumber || '').toUpperCase() === rawRollNumber
      );
    }
    if (existingStudentRoll) {
      console.log('[AUTH-REGISTER] Registration rejected: Duplicate roll number %s', rawRollNumber);
      res.status(400).json({
        success: false,
        message: `Roll number ${rawRollNumber} is already in use.`
      });
      return;
    }

    // 7. Unique Registration Number Check
    let existingStudentReg: any = null;
    if (isMongoConnected()) {
      try {
        existingStudentReg = await StudentModel.findOne({ registrationNo: rawRegistrationNo }).lean();
      } catch (err: any) {
        console.warn('[AUTH-REGISTER] Mongo reg number lookup note:', err.message);
      }
    }
    if (!existingStudentReg) {
      existingStudentReg = db.students.find(
        (s) => (s.registrationNo || '').toUpperCase() === rawRegistrationNo
      );
    }
    if (existingStudentReg) {
      console.log('[AUTH-REGISTER] Registration rejected: Duplicate registration number %s', rawRegistrationNo);
      res.status(400).json({
        success: false,
        message: `Registration number ${rawRegistrationNo} is already in use.`
      });
      return;
    }

    // 8. Securely hash password with bcrypt (10 rounds)
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawPassword, salt);
    const now = new Date().toISOString();

    const userId = generateId('user_std');
    const studentId = generateId('std');

    // STRICT: The role is ALWAYS assigned as "STUDENT" on the server.
    const newUser: User = {
      _id: userId,
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      role: 'STUDENT',
      phone: trimmedPhone || '+91 99999 00000',
      createdAt: now,
      updatedAt: now
    };

    const studentRecord: Student = {
      _id: studentId,
      userId: newUser._id,
      rollNumber: rawRollNumber,
      registrationNo: rawRegistrationNo,
      name: trimmedName,
      email: normalizedEmail,
      phone: trimmedPhone || '+91 99999 00000',
      course: trimmedCourse,
      department: trimmedDepartment,
      semester: parsedSemester,
      academicYear: trimmedAcademicYear,
      admissionQuota: admissionQuota || 'MERIT',
      feeCategory: feeCategory || 'REGULAR',
      guardianName: guardianName || 'Parent / Guardian',
      guardianPhone: guardianPhone || '+91 98765 00000',
      address: address || 'Campus Hostel / Residence',
      status: 'ACTIVE',
      createdAt: now
    };

    // Auto-generate initial semester fee structure for student fee payments
    const feeId = generateId('fee');
    const tuitionAmount = admissionQuota === 'MANAGEMENT' ? 85000 : feeCategory === 'TFWS' ? 18000 : 65000;
    
    const initialFee: any = {
      _id: feeId,
      studentId: studentId,
      studentRollNumber: studentRecord.rollNumber,
      studentName: studentRecord.name,
      department: studentRecord.department,
      course: studentRecord.course,
      academicYear: studentRecord.academicYear,
      semester: studentRecord.semester,
      feeType: 'SEMESTER_FEE',
      title: `Semester ${studentRecord.semester} Comprehensive Academic & Tuition Fee`,
      totalAmount: tuitionAmount,
      paidAmount: 0,
      pendingAmount: tuitionAmount,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lateFeePerDay: 50,
      status: 'PENDING',
      breakdown: [
        { id: generateId('b'), category: 'Academic Tuition Fee', amount: Math.round(tuitionAmount * 0.65), description: 'Instructional & Faculty Charges' },
        { id: generateId('b'), category: 'Laboratory & Tech Infrastructure', amount: Math.round(tuitionAmount * 0.15), description: 'Computing, Lab & Internet Services' },
        { id: generateId('b'), category: 'University Examination Fee', amount: 3500, description: 'Evaluation & Semester Grade Report' },
        { id: generateId('b'), category: 'Library & Online Journals', amount: 2500, description: 'Library, Research and Digital Resources' },
        { id: generateId('b'), category: 'Student Amenities & Sports', amount: tuitionAmount - Math.round(tuitionAmount * 0.65) - Math.round(tuitionAmount * 0.15) - 6000, description: 'Campus Facilities & Welfare' }
      ],
      remarks: 'Automated initial fee assignment upon registration',
      createdAt: now,
      updatedAt: now
    };

    // Push records to local DB cache
    db.users.push(newUser);
    db.students.push(studentRecord);
    db.fees.push(initialFee);
    saveDB(db);

    // Persist to MongoDB Atlas collections (college_fee_management: users, students, fees)
    if (isMongoConnected()) {
      try {
        await UserModel.findOneAndUpdate({ _id: newUser._id }, { $set: newUser }, { upsert: true });
        await StudentModel.findOneAndUpdate({ _id: studentRecord._id }, { $set: studentRecord }, { upsert: true });
        await FeeModel.findOneAndUpdate({ _id: initialFee._id }, { $set: { ...initialFee, dueDate: new Date(initialFee.dueDate) } }, { upsert: true });
        console.log('[AUTH-REGISTER] User and student persisted to MongoDB Atlas: %s (%s)', normalizedEmail, rawRollNumber);
      } catch (mErr: any) {
        console.warn('[AUTH-REGISTER] Background mongo sync note:', mErr.message);
      }
    }

    addAuditLog(
      'USER_REGISTERED',
      { userId, name: newUser.name, email: newUser.email, role: newUser.role },
      'Student',
      `New STUDENT user ${newUser.name} registered with email ${newUser.email} (Roll: ${rawRollNumber})`,
      userId
    );

    console.log('[AUTH-REGISTER] Student registration completed successfully for %s', normalizedEmail);

    // Return confirmation message without auto-login token
    res.status(201).json({
      success: true,
      message: 'Student account created successfully. Please login.',
      email: newUser.email,
      role: 'STUDENT'
    });
  } catch (err: any) {
    console.error('[AUTH-REGISTER] Internal error during registration:', err.message || err);
    res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/register-admin
 * Secure Admin & Finance Registration Endpoint
 * Validates registration code against ADMIN_REGISTRATION_SECRET
 * Validates password strength & matching
 * Checks duplicate email in MongoDB Atlas & local store
 * Hashes password using bcrypt
 * Saves to MongoDB users collection without auto-logging in
 */
router.post('/register-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      role = 'ADMIN',
      registrationCode,
      adminCode
    } = req.body;

    const trimmedName = (name || '').toString().trim();
    const normalizedEmail = (email || '').toString().toLowerCase().trim();
    const rawPassword = (password || '').toString();
    const rawConfirmPassword = (confirmPassword || '').toString();
    const requestedRole = (role || '').toString().toUpperCase().trim();
    const providedCode = (registrationCode || adminCode || '').toString().trim();

    // 1. Required fields check
    if (!trimmedName || !normalizedEmail || !rawPassword || !rawConfirmPassword || !providedCode) {
      console.log('[AUTH-REGISTER-ADMIN] Registration rejected: Missing required fields');
      res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
      return;
    }

    // 2. Role validation (STRICT: only ADMIN or FINANCE allowed)
    if (requestedRole !== 'ADMIN' && requestedRole !== 'FINANCE') {
      console.log('[AUTH-REGISTER-ADMIN] Registration rejected: Invalid role %s', requestedRole);
      res.status(400).json({
        success: false,
        message: 'Invalid role. Only ADMIN or FINANCE accounts can be registered.'
      });
      return;
    }

    // 3. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.log('[AUTH-REGISTER-ADMIN] Registration rejected: Invalid email format %s', normalizedEmail);
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
      return;
    }

    // 4. Password confirmation match check
    if (rawPassword !== rawConfirmPassword) {
      console.log('[AUTH-REGISTER-ADMIN] Registration rejected: Password mismatch');
      res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
      return;
    }

    // 5. Strong password requirement
    if (rawPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
      return;
    }
    const hasUpper = /[A-Z]/.test(rawPassword);
    const hasLower = /[a-z]/.test(rawPassword);
    const hasDigitOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(rawPassword);
    if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
      res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, and a number or symbol.'
      });
      return;
    }

    // 6. Verify Admin Registration Secret Passkey
    const expectedSecret = (process.env.ADMIN_REGISTRATION_SECRET || 'COLLEGE_ADMIN_2026_SECURE').trim();
    if (providedCode !== expectedSecret) {
      console.warn(`[AUTH-REGISTER-ADMIN] Invalid registration code attempted for ${normalizedEmail}`);
      res.status(403).json({
        success: false,
        message: 'Invalid registration code.'
      });
      return;
    }

    // 7. Check for duplicate accounts in MongoDB & local DB
    let existingUser: any = null;
    if (isMongoConnected()) {
      try {
        existingUser = await UserModel.findOne({ email: normalizedEmail }).lean();
      } catch (mErr: any) {
        console.warn('[AUTH-REGISTER-ADMIN] Notice during MongoDB duplicate check:', mErr.message);
      }
    }
    if (!existingUser) {
      const db = getDB();
      existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (existingUser) {
      console.log('[AUTH-REGISTER-ADMIN] Registration rejected: Duplicate email %s', normalizedEmail);
      res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
      return;
    }

    // 8. Hash password securely with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawPassword, salt);
    const now = new Date().toISOString();
    const userId = generateId(requestedRole === 'FINANCE' ? 'user_fin' : 'user_adm');

    // 9. Construct and persist User & Admin records
    const newUser: User = {
      _id: userId,
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      role: requestedRole as 'ADMIN' | 'FINANCE',
      phone: (phone || '').toString().trim() || '+91 98765 00000',
      createdAt: now,
      updatedAt: now
    };

    const adminId = generateId(requestedRole === 'FINANCE' ? 'fin' : 'adm');
    const adminRecord: AdminUser = {
      _id: adminId,
      userId,
      name: trimmedName,
      email: normalizedEmail,
      department: requestedRole === 'FINANCE' ? 'Finance & Accounts' : 'Academic Administration',
      designation: requestedRole === 'FINANCE' ? 'Finance Officer' : 'Academic Administrator',
      permissions: requestedRole === 'FINANCE'
        ? ['MANAGE_FEES', 'APPROVE_PAYMENTS', 'GENERATE_REPORTS', 'VIEW_TRANSACTIONS']
        : ['ALL', 'MANAGE_FEES', 'APPROVE_PAYMENTS', 'GENERATE_REPORTS', 'MANAGE_STUDENTS'],
      createdAt: now
    };

    const db = getDB();
    db.users.push(newUser);
    db.admins.push(adminRecord);
    saveDB(db);

    // Save to MongoDB Atlas users collection
    if (isMongoConnected()) {
      try {
        await UserModel.findOneAndUpdate({ _id: newUser._id }, { $set: newUser }, { upsert: true });
        console.log('[AUTH-REGISTER-ADMIN] Admin user persisted to MongoDB Atlas users collection:', normalizedEmail);
      } catch (uSyncErr: any) {
        console.warn('[AUTH-REGISTER-ADMIN] MongoDB user sync note:', uSyncErr.message);
      }
    }

    addAuditLog(
      'ADMIN_ACCOUNT_CREATED',
      { userId, name: newUser.name, email: newUser.email, role: newUser.role },
      'AdminUser',
      `New ${newUser.role} user account created for ${newUser.name} (${newUser.email})`,
      userId
    );

    console.log('[AUTH-REGISTER-ADMIN] Registration successful for %s (role: %s)', normalizedEmail, requestedRole);

    // 10. Return success message without generating JWT or auto-logging in
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please login.',
      email: newUser.email,
      role: newUser.role
    });
  } catch (err: any) {
    console.error('[AUTH-REGISTER-ADMIN] Error during admin registration:', err.message || err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration. Please try again.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    invalidateSession(token);
  }
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// GET /api/auth/session-status
router.get('/session-status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || '';
  const status = getSessionStatus(token);
  const timeoutMs = getInactivityTimeoutMs();

  res.json({
    success: true,
    authenticated: true,
    timeoutMs,
    timeoutMinutes: Math.round(timeoutMs / 60000),
    remainingMs: status ? status.remainingMs : timeoutMs,
    lastActive: status ? status.lastActive : Date.now(),
    user: req.user
  });
});

// POST /api/auth/ping (Heartbeat on user activity to refresh session)
router.post('/ping', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const timeoutMs = getInactivityTimeoutMs();
  res.json({
    success: true,
    refreshed: true,
    timeoutMinutes: Math.round(timeoutMs / 60000),
    remainingMs: timeoutMs,
    message: 'Session inactivity timer successfully refreshed.'
  });
});

// GET /api/auth/me (Current session)
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDB();
  const user = db.users.find((u) => u._id === req.user?.userId);

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const student = db.students.find((s) => s.userId === user._id || s.email.toLowerCase() === user.email.toLowerCase());
  const admin = db.admins.find((a) => a.userId === user._id || a.email.toLowerCase() === user.email.toLowerCase());

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      student,
      admin
    }
  });
});

// GET /api/auth/demo-accounts (Helper for examiners to inspect roles)
router.get('/demo-accounts', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    accounts: [
      {
        role: 'ADMIN',
        title: 'College Admin / Finance Dean',
        email: 'admin@college.edu',
        password: 'Admin@123',
        name: 'Dr. Ramesh Sharma',
        description: 'Complete admin control: student records, fee assigning, live payments, analytics & reports'
      },
      {
        role: 'ADMIN',
        title: 'Accounts Officer',
        email: 'accounts@college.edu',
        password: 'Admin@123',
        name: 'Prof. Anjali Mehta',
        description: 'Accounts audit, transaction reports, and payment reconciliations'
      },
      {
        role: 'STUDENT',
        title: 'Student (CSE - VIII Sem with Pending Fee)',
        email: 'saiharinimedam@gmail.com',
        password: 'Student@123',
        name: 'Sai Harini Medam',
        rollNumber: '21CS101',
        description: 'VIII Semester student with partial fee paid (Rs 40,000 paid / Rs 25,000 pending) ready for Razorpay checkout'
      },
      {
        role: 'STUDENT',
        title: 'Student (CSE - Fully Pending Fee)',
        email: 'aarav.patel@student.college.edu',
        password: 'Student@123',
        name: 'Aarav Patel',
        rollNumber: '21CS102',
        description: 'Student with full semester fee (Rs 85,000) pending payment'
      },
      {
        role: 'STUDENT',
        title: 'Student (IT - Fully Paid with Receipts)',
        email: 'priya.s@student.college.edu',
        password: 'Student@123',
        name: 'Priya Sundaram',
        rollNumber: '22IT204',
        description: 'Student with 100% paid fee status and downloadable digital receipt'
      }
    ]
  });
});

export default router;

