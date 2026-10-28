import 'dotenv/config';

const api = process.env.API_URL || 'http://localhost:4000';
const interval = Number(process.env.SIMULATOR_INTERVAL_MS || 15000);
const containers = ['CNT-001','CNT-002','CNT-003','CNT-004','CNT-005','CNT-006','CNT-007','CNT-008','CNT-009','CNT-010'];
console.log(`Sensor simulator → ${api} every ${interval} ms`);
async function sendReadings() {
  await Promise.all(containers.map(async (containerId) => {
    const base = containerId === 'CNT-001' || containerId === 'CNT-005' ? 88 : 20 + Math.random() * 65;
    const fillPercent = Math.min(100, Math.round(base + Math.random() * 5));
    try {
      await fetch(`${api}/api/measurements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ containerId, fillPercent, weightKg: +(fillPercent * 1.2).toFixed(1) }) });
    } catch (error) { console.error(`Cannot reach API for ${containerId}:`, error); }
  }));
}
void sendReadings();
setInterval(() => void sendReadings(), interval);
