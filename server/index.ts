import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import repairsRouter from './routes/repairs.js';
import manualsRouter from './routes/manuals.js';
import uploadRouter from './routes/upload.js';

import authRouter from './auth.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
const PORT = parseInt(process.env.API_PORT || '3000', 10);

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for robustness in production
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/repairs', repairsRouter);
app.use('/api/manuals', manualsRouter);
app.use('/api/upload', uploadRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: process.env.DATABASE_URL ? 'configured' : 'NOT CONFIGURED',
    s3: (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET) ? 'configured' : 'NOT CONFIGURED',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA Routing Fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🚀 MachMind AI API & Production Web Server running on http://localhost:${PORT}`);
  console.log(`  📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  📦 Database: ${process.env.DATABASE_URL ? '✅ Connected' : '⚠️  DATABASE_URL not set'}`);
  console.log(`  🗂️  S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '⚠️  Not configured'}\n`);
});

export default app;
