const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Catch idle client errors so they don't crash the server
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
});

pool.connect()
  .then(() => console.log('✅ Connected to Neon PostgreSQL'))
  .catch(err => console.error('❌ DB connection error:', err.message));

module.exports = pool;