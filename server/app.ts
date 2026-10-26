import express from 'express';
import cors from 'cors';
import path from 'node:path';
import containersRouter from './routes/containers';
import healthRouter from './routes/health';
import measurementsRouter from './routes/measurements';
import savedRoutesRouter from './routes/savedRoutes';
import statsRouter from './routes/stats';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/containers', containersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/routes', savedRoutesRouter);

const webPath = path.resolve(process.cwd(), 'dist/web');
app.use(express.static(webPath));
app.get('*', (_req, res) => res.sendFile(path.join(webPath, 'index.html')));

export default app;
