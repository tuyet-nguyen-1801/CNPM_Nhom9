require('dotenv').config();
const bcrypt = require('bcryptjs');
const sql    = require('mssql');

const config = {
  server:   process.env.DB_SERVER || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options:  { trustServerCertificate: true, encrypt: false },
};

async function main() {
  const pool = await sql.connect(config);
  const res = await pool.request().query(`SELECT id, name, email, password, is_active FROM users`);

  for (const u of res.recordset) {
    console.log(`\n── ${u.email} (active=${u.is_active}) ──`);
    console.log('  Hash:', u.password?.slice(0, 30) + '...');

    const tests = ['Admin@123', 'Nhanvien@1'];
    for (const p of tests) {
      const ok = await bcrypt.compare(p, u.password || '');
      console.log(`  "${p}" →`, ok ? '✅ ĐÚNG' : '❌ sai');
    }
  }
  await pool.close();
}

main().catch(e => console.error('Lỗi:', e.message));
