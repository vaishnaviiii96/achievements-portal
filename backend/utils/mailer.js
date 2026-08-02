// backend/utils/mailer.js
//
// Sends OTP emails via Gmail SMTP using Nodemailer.
//
// SETUP REQUIRED:
// 1. npm install nodemailer
// 2. In Gmail: enable 2-Step Verification, then create an "App Password"
//    (Google Account → Security → 2-Step Verification → App passwords)
// 3. Add to .env:
//      GMAIL_USER=vaishnavi.tirupathi39@gmail.com
//      GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (16-char app password, no spaces needed)
//
// Do NOT use your real Gmail password here — Google blocks it. App passwords only.

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup (logs a clear error early instead of failing silently later)
transporter.verify((err) => {
  if (err) {
    console.error('❌ Mailer config error:', err.message);
  } else {
    console.log('✅ Mailer ready (Gmail SMTP)');
  }
});

async function sendOtpEmail(toEmail, otp, name) {
  const mailOptions = {
    from: `"GITAM Achievements Portal" <${process.env.GMAIL_USER}>`,
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
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };