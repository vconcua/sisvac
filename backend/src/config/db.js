const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // RDS (PostgreSQL 15+) exige conexión cifrada: en AWS se activa con PGSSL=true
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  // en Lambda cada instancia usa pocas conexiones para no agotar las de RDS
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
