require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { otpRequestLimiter, otpVerifyLimiter } = require('./middleware/otpLimiter');

const { apiLimiter, loginLimiter } = require('./middleware/rateLimiter');

const app = express();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.set('trust proxy', 1);
// Middleware
app.use(cors({
  origin: 'https://achievements-portal-bice.vercel.app'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limit to all API routes
app.use('/api', apiLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (apply strict limiter to auth)
app.use('/api/auth/forgot-password', otpRequestLimiter);
app.use('/api/auth/verify-otp', otpVerifyLimiter);
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/users', require('./routes/users'));
app.use('/api/export', require('./routes/export'));

// Health check
app.get('/', (req, res) => res.json({ message: 'Achievements Portal API is running.' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
