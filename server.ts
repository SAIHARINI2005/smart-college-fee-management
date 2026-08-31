import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDB, syncWithMongoDB } from './server/db.js';
import { connectMongoDB, isMongoConnected, testMongoDBReadWrite, getSanitizedMongoUri } from './server/db/mongodb.js';
import authRoutes from './server/routes/authRoutes.js';
import studentRoutes from './server/routes/studentRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import feeRoutes from './server/routes/feeRoutes.js';
import paymentRoutes from './server/routes/paymentRoutes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB with seed records and connect to MongoDB Atlas
  initDB();
  connectMongoDB()
    .then(async (connected) => {
      if (connected) {
        await syncWithMongoDB();
      }
    })
    .catch((err) => console.warn('Async Mongo init notice:', err.message));

  // Middleware for body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Safe JSON error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('Handled malformed JSON payload request:', err.message);
      res.status(400).json({ success: false, message: 'Invalid JSON request payload.' });
      return;
    }
    next(err);
  });

  // API Health & MongoDB Diagnostics Endpoint
  app.get('/api/health', async (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Smart College Fee Payment Portal (Razorpay + MongoDB Atlas)',
      database: 'college_fee_management',
      mongoConnected: isMongoConnected(),
      mongoTarget: getSanitizedMongoUri(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Dedicated MongoDB Atlas Real-Time Read/Write Test Probe
  app.get('/api/mongodb/status', async (_req, res) => {
    try {
      const result = await testMongoDBReadWrite();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/fees', feeRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/payments', paymentRoutes);

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🎓 SMART COLLEGE FEE PAYMENT PORTAL (RAZORPAY)`);
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🔐 JWT Auth & Role-Based Access Control Enabled`);
    console.log(`💳 Razorpay Online Gateway Integration Active`);
    console.log(`====================================================`);
  });
}

startServer();
