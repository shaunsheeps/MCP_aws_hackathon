// db.js
require('dotenv').config();
const { Pool } = require('pg');

// Create a pool of clients:
const pool = new Pool({
  host:     process.env.PGHOST,
  port:     Number(process.env.PGPORT),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl:      process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

// Optional: test connection on startup
pool
  .connect()
  .then(client => {
    console.log('✅ Connected to Postgres');
    client.release();
  })
  .catch(err => {
    console.error('❌ Postgres connection error', err.stack);
  });

module.exports = pool;
