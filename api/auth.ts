import express from 'express';
import cors from 'cors';
import authConfig from '../server/auth.js';

const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mount the Auth.js router at the expected serverless endpoint
app.use('/api/auth/*splat', authConfig);

export default app;
