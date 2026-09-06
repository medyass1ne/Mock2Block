import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(toEmail, token) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0;">
          <span style="background: linear-gradient(90deg, #818cf8, #22d3ee, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Mock2Block</span>
        </h1>
        <p style="color: #737373; font-size: 14px; margin-top: 8px;">Verify your email to get started</p>
      </div>

      <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        Welcome to Mock2Block! Click the button below to verify your email address and unlock AI-powered API generation.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 36px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">
          Verify Email Address
        </a>
      </div>

      <p style="color: #525252; font-size: 12px; line-height: 1.6; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        If you didn't create an account on Mock2Block, you can safely ignore this email. This link expires in 24 hours.
      </p>

      <p style="color: #404040; font-size: 11px; margin-top: 16px;">
        Can't click the button? Copy this link:<br />
        <a href="${verifyUrl}" style="color: #818cf8; word-break: break-all;">${verifyUrl}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Mock2Block" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Verify your Mock2Block account',
    html,
  });
}
