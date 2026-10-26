import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM containers ORDER BY fill_percent DESC');
  res.json(rows);
});

export default router;
