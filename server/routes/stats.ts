import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='full')::int AS full,
      COUNT(*) FILTER (WHERE status='warning')::int AS warning,
      ROUND(AVG(fill_percent))::int AS average,
      COUNT(*) FILTER (WHERE last_update > NOW() - INTERVAL '2 minutes')::int AS online
    FROM containers
  `);
  res.json(rows[0]);
});

export default router;
