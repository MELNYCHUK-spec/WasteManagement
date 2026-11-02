import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  alertThreshold: Number(process.env.ALERT_THRESHOLD || 85),
  databaseUrl: process.env.DATABASE_URL,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  sensorApiKey: process.env.SENSOR_API_KEY,
};
