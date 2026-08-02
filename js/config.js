/**
 * API Base URL — update this ONE value when deploying.
 *
 * Local dev:   http://localhost:5000
 * Production:  https://your-backend-name.onrender.com
 *              (paste your Render/Railway backend URL here before pushing)
 */
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://your-backend-name.onrender.com'; // ← replace with your deployed backend URL
