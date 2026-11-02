import { Router } from 'express';
import { config } from '../config';
import { pool } from '../db/pool';

const router = Router();

// Public sensor endpoint: cap writes per source IP to limit accidental or abusive floods.
const windowMs = 60_000;
const maxWrites = 120;
const writes = new Map<string, { count: number; resetAt: number }>();
router.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const key = req.ip || 'unknown';
  if (writes.size > 10_000) {
    for (const [ip, value] of writes) if (value.resetAt <= now) writes.delete(ip);
  }
  let entry = writes.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    writes.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > maxWrites) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Too many measurement submissions' });
    return;
  }
  next();
});

router.get('/', async (req, res) => {
  const id = String(req.query.containerId || '');
  const { rows } = await pool.query(
    `SELECT container_id, fill_percent, weight_kg, measured_at
     FROM measurements ${id ? 'WHERE container_id=$1' : ''}
     ORDER BY measured_at DESC LIMIT 60`,
    id ? [id] : [],
  );
  res.json(rows.reverse());
});

router.post('/', async (req, res) => {
  const { containerId, weightKg, fillPercent } = req.body as {
    containerId?: string;
    weightKg?: number;
    fillPercent?: number;
  };

  if (typeof containerId !== 'string' || containerId.length > 64 || !containerId.trim() ||
      typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg < 0 || weightKg > 100_000 ||
      typeof fillPercent !== 'number' || !Number.isFinite(fillPercent) || fillPercent < 0 || fillPercent > 100) {
    res.status(400).json({ error: 'Укажите containerId, weightKg и fillPercent от 0 до 100' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const status = fillPercent! >= config.alertThreshold ? 'full' : fillPercent! >= 70 ? 'warning' : 'normal';
    const { rows } = await client.query(
      `UPDATE containers SET fill_percent=$2,status=$3,last_update=NOW(),
       alert_sent=CASE WHEN $3='full' THEN alert_sent ELSE FALSE END
       WHERE id=$1 RETURNING *`,
      [containerId, Math.round(fillPercent!), status],
    );

    if (!rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Контейнер не найден' });
      return;
    }

    await client.query(
      'INSERT INTO measurements(container_id,weight_kg,fill_percent) VALUES($1,$2,$3)',
      [containerId, weightKg, Math.round(fillPercent!)],
    );
    await client.query('COMMIT');

    const container = rows[0];
    if (status === 'full' && !container.alert_sent && config.discordWebhookUrl) {
      try {
        const response = await fetch(config.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🚨 **Контейнер заполнен**\n**${container.name}** (${container.id})\n📍 ${container.address}\n♻️ Заполненность: ${container.fill_percent}% · ${weightKg!.toFixed(1)} кг`,
          }),
        });
        if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`);
        await pool.query('UPDATE containers SET alert_sent=TRUE WHERE id=$1', [containerId]);
      } catch (error) {
        console.error('Discord webhook error:', error);
      }
    }

    res.status(201).json(container);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Не удалось сохранить показание' });
  } finally {
    client.release();
  }
});

export default router;
