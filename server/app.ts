import express from 'express';
import cors from 'cors';
import path from 'node:path';
import containersRouter from './routes/containers';
import healthRouter from './routes/health';
import measurementsRouter from './routes/measurements';
import savedRoutesRouter from './routes/savedRoutes';
import statsRouter from './routes/stats';
import authRouter from './routes/auth';
import { requireAuth } from './auth';
import { timingSafeEqual } from 'node:crypto';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '16kb', strict: true }));
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/measurements' && process.env.SENSOR_API_KEY) {
    const supplied = Buffer.from(req.get('authorization')?.replace(/^Bearer\s+/i, '') || '');
    const expected = Buffer.from(process.env.SENSOR_API_KEY);
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) return next();
  }
  return requireAuth(req, res, next);
});
app.use('/api/containers', containersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/routes', savedRoutesRouter);

const webPath = path.resolve(process.cwd(), 'dist/web');
app.use(express.static(webPath));
app.get('*', (_req, res) => res.sendFile(path.join(webPath, 'index.html')));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
