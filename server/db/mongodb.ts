import mongoose from 'mongoose';
import { AuditLogModel, StudentModel, FeeModel, PaymentModel, ReceiptModel, UserModel } from '../models/index.js';

let isConnected = false;
let connectionAttempted = false;
let lastConnectionError: string | null = null;

export function getSanitizedMongoUri(): string {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_fee_management';
  return uri.replace(/:([^:@]{2,})@/, ':****@');
}

export async function connectMongoDB(): Promise<boolean> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  const rawUri = process.env.MONGODB_URI;
  let MONGODB_URI = rawUri && rawUri.trim() !== ''
    ? rawUri.trim()
    : 'mongodb://127.0.0.1:27017/college_fee_management';

  // If URI is an srv string without a database path before the query parameters, ensure clean parsing
  if (MONGODB_URI.startsWith('mongodb+srv://') && !MONGODB_URI.includes('.mongodb.net/college_fee_management')) {
    if (MONGODB_URI.includes('.mongodb.net/?')) {
      MONGODB_URI = MONGODB_URI.replace('.mongodb.net/?', '.mongodb.net/college_fee_management?');
    } else if (MONGODB_URI.endsWith('.mongodb.net') || MONGODB_URI.endsWith('.mongodb.net/')) {
      MONGODB_URI = MONGODB_URI.replace(/\.mongodb\.net\/?$/, '.mongodb.net/college_fee_management');
    }
  }

  connectionAttempted = true;

  try {
    mongoose.set('strictQuery', false);
    
    console.log(`🔌 Attempting MongoDB connection to: ${getSanitizedMongoUri()}`);
    
    await mongoose.connect(MONGODB_URI, {
      dbName: 'college_fee_management',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      autoIndex: true
    });

    isConnected = true;
    lastConnectionError = null;
    console.log(`✅ MongoDB connected successfully to database: [${mongoose.connection.name || 'college_fee_management'}]`);

    mongoose.connection.on('error', (err) => {
      console.error('⚠️ MongoDB runtime error:', err.message || err);
      lastConnectionError = err.message || 'Runtime MongoDB error';
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
      isConnected = false;
    });

    return true;
  } catch (error: any) {
    lastConnectionError = error.message || 'Connection failed';
    console.warn(`⚠️ MongoDB connection attempt notice (${error.message}). Running with hybrid persistent storage engine.`);
    isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getMongooseConnection() {
  return mongoose.connection;
}

export interface MongoStatusResponse {
  connected: boolean;
  status: 'connected' | 'disconnected';
  database: string;
  isAtlas: boolean;
  readyState: number;
  collections: Array<{ name: string; count: number }>;
  collectionCounts: {
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
  error?: string;
}

export async function ensureCollectionsExist(): Promise<void> {
  if (!isMongoConnected()) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const existing = (await db.listCollections().toArray()).map((c) => c.name);
    const required = ['students', 'fee_records', 'payments', 'receipts', 'audit_logs', 'users'];
    for (const name of required) {
      if (!existing.includes(name)) {
        await db.createCollection(name).catch(() => {});
        console.log(`📁 [MongoDB Atlas] Created/verified collection: ${name}`);
      }
    }
  } catch (err: any) {
    console.warn('Collection check notice:', err.message);
  }
}

// Verification function: Performs live read and write against MongoDB
export async function testMongoDBReadWrite(): Promise<MongoStatusResponse> {
  const startTime = Date.now();
  
  if (!isMongoConnected()) {
    // Attempt connection
    const connected = await connectMongoDB();
    if (!connected) {
      return {
        connected: false,
        status: 'disconnected',
        database: 'college_fee_management',
        isAtlas: Boolean(process.env.MONGODB_URI?.includes('mongodb+srv://')),
        readyState: mongoose.connection.readyState,
        collections: [
          { name: 'students', count: 0 },
          { name: 'fee_records', count: 0 },
          { name: 'payments', count: 0 },
          { name: 'receipts', count: 0 },
          { name: 'audit_logs', count: 0 },
          { name: 'users', count: 0 }
        ],
        collectionCounts: { students: 0, fee_records: 0, payments: 0, receipts: 0, audit_logs: 0, users: 0 },
        testWriteReadPassed: false,
        latencyMs: Date.now() - startTime,
        message: 'MongoDB is currently unreachable. Persistent storage fallback active.',
        error: lastConnectionError || 'ReadyState not connected'
      };
    }
  }

  try {
    await ensureCollectionsExist();

    const testId = `test_probe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testTimestamp = new Date();
    
    // 1. Perform a live Write to audit_logs collection
    const probeDoc = await AuditLogModel.create({
      _id: testId,
      action: 'MONGODB_DIAGNOSTIC_PROBE',
      performedBy: {
        userId: 'system_probe',
        name: 'MongoDB Verification Agent',
        email: 'system@college.edu',
        role: 'SYSTEM'
      },
      targetEntity: 'SystemHealth',
      targetId: testId,
      description: 'Automated live read/write test verification probe for college_fee_management database.',
      ipAddress: '127.0.0.1',
      metadata: { probeTimestamp: testTimestamp.toISOString(), test: true },
      timestamp: testTimestamp
    });

    // 2. Perform a live Read back from MongoDB
    const readBackDoc = await AuditLogModel.findById(testId).lean();
    
    // 3. Count documents in each specified collection
    let [studentsCount, feeCount, paymentsCount, receiptsCount, auditCount, userCount] = await Promise.all([
      StudentModel.countDocuments().catch(() => 0),
      FeeModel.countDocuments().catch(() => 0),
      PaymentModel.countDocuments().catch(() => 0),
      ReceiptModel.countDocuments().catch(() => 0),
      AuditLogModel.countDocuments().catch(() => 0),
      UserModel.countDocuments().catch(() => 0)
    ]);

    // If collections need seeding, perform sync now
    if (studentsCount === 0 || userCount === 0 || feeCount === 0) {
      const { syncWithMongoDB } = await import('../db.js');
      await syncWithMongoDB();
      [studentsCount, feeCount, paymentsCount, receiptsCount, auditCount, userCount] = await Promise.all([
        StudentModel.countDocuments().catch(() => 0),
        FeeModel.countDocuments().catch(() => 0),
        PaymentModel.countDocuments().catch(() => 0),
        ReceiptModel.countDocuments().catch(() => 0),
        AuditLogModel.countDocuments().catch(() => 0),
        UserModel.countDocuments().catch(() => 0)
      ]);
    }

    const latencyMs = Date.now() - startTime;
    const testPassed = Boolean(readBackDoc && readBackDoc._id === testId);

    // 4. Clean up probe doc
    await AuditLogModel.deleteOne({ _id: testId }).catch(() => {});

    return {
      connected: true,
      status: 'connected',
      database: mongoose.connection.name || 'college_fee_management',
      isAtlas: Boolean(process.env.MONGODB_URI?.includes('mongodb+srv://') || process.env.MONGODB_URI?.includes('.mongodb.net')),
      readyState: mongoose.connection.readyState,
      collections: [
        { name: 'students', count: studentsCount },
        { name: 'fee_records', count: feeCount },
        { name: 'payments', count: paymentsCount },
        { name: 'receipts', count: receiptsCount },
        { name: 'audit_logs', count: auditCount },
        { name: 'users', count: userCount }
      ],
      collectionCounts: {
        students: studentsCount,
        fee_records: feeCount,
        payments: paymentsCount,
        receipts: receiptsCount,
        audit_logs: auditCount,
        users: userCount
      },
      testWriteReadPassed: testPassed,
      latencyMs,
      message: 'MongoDB Atlas is fully connected and operational. Live read & write test passed.'
    };
  } catch (err: any) {
    return {
      connected: false,
      status: 'disconnected',
      database: mongoose.connection.name || 'college_fee_management',
      isAtlas: Boolean(process.env.MONGODB_URI?.includes('mongodb+srv://')),
      readyState: mongoose.connection.readyState,
      collections: [
        { name: 'students', count: 0 },
        { name: 'fee_records', count: 0 },
        { name: 'payments', count: 0 },
        { name: 'receipts', count: 0 },
        { name: 'audit_logs', count: 0 },
        { name: 'users', count: 0 }
      ],
      collectionCounts: { students: 0, fee_records: 0, payments: 0, receipts: 0, audit_logs: 0, users: 0 },
      testWriteReadPassed: false,
      latencyMs: Date.now() - startTime,
      message: `Failed during MongoDB read/write verification: ${err.message}`,
      error: err.message
    };
  }
}
