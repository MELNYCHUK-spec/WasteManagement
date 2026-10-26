import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM routes ORDER BY created_at DESC LIMIT 10');
  res.json(rows);
});

export default router;
