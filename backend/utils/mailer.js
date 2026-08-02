// backend/utils/mailer.js
//
// Sends OTP emails via Resend's HTTP API (port 443) instead of SMTP.
// This avoids Render free-tier's outbound SMTP port blocking (25/465/587),
// which was causing ENETUNREACH / connection timeouts with Nodemailer + Gmail.
//
// SETUP:
// 1. npm install resend
// 2. Sign up at https://resend.com, create an API key
// 3. Add to .env / Render env vars: RESEND_API_KEY=your_key

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otp, name) {
  const { error } = await resend.emails.send({
    from: 'GITAM Achievements Portal <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e2e2; border-radius: 8px;">
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Use the code below to reset your password. This code expires in <strong>10 minutes</strong>.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f4f4f8; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">GITAM Achievements Portal</p>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Resend email error:', error);
    throw new Error('Failed to send OTP email.');
  }
}

module.exports = { sendOtpEmail };
