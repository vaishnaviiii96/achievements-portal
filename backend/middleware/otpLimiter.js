// backend/middleware/otpLimiter.js
//
// Add this into your EXISTING backend/middleware/rateLimiter.js file
// (I'm giving it as a separate file since I don't have your current rateLimiter.js —
//  just copy the block below into that file and export it alongside loginLimiter/apiLimiter)

const rateLimit = require('express-rate-limit');

// Strict limit on requesting OTPs — prevents email-bombing a victim's inbox
// and prevents attackers from brute-forcing which emails are registered.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { error: 'Too many reset requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit on verifying OTPs — prevents brute-forcing the 6-digit code.
// 6 digits = 1,000,000 combinations; capping attempts makes brute force infeasible
// within the 10-minute OTP lifetime regardless of request rate.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many verification attempts. Please request a new code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpRequestLimiter, otpVerifyLimiter };