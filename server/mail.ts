import nodemailer from 'nodemailer';

export function emailDeliveryConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM && process.env.APP_BASE_URL);
}

export async function sendVerificationEmail(to: string, token: string) {
  if (!emailDeliveryConfigured()) throw new Error('Email delivery is not configured');
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const baseUrl = process.env.APP_BASE_URL!.replace(/\/$/, '');
  const verificationUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Verify your EcoRoute email',
    text: `Confirm your EcoRoute account by opening this link: ${verificationUrl}\nThis link expires in 24 hours. If you did not create this account, ignore this email.`,
    html: `<p>Confirm your EcoRoute account by clicking the link below:</p><p><a href="${verificationUrl}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, ignore this email.</p>`,
  });
}
