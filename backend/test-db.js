const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
console.log('Connecting to:', connectionString.split('@')[1]); // Log host part for privacy

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('🔍 Diagnosis: Host cannot be resolved (DNS Issue)');
    }
  } else {
    console.log('✅ Success:', res.rows[0]);
  }
  pool.end();
});
