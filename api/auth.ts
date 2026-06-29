import express from 'express';
import cors from 'cors';
import authConfig from '../server/auth.js';

const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: '*' }));
app.use(express.json());

// Restore original req.url from Vercel rewrite
app.use((req, res, next) => {
  const p0 = req.query.p0 as string;
  if (p0) {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      urlObj.pathname = `/api/auth/${p0}`;
      urlObj.searchParams.delete('p0');
      req.url = urlObj.pathname + urlObj.search;
    } catch (e) {
      console.error('[Vercel Auth] URL parsing error:', e);
    }
  }
  next();
});

// Mount the Auth.js router at the expected serverless endpoint
app.use('/api/auth', authConfig);

export default app;
