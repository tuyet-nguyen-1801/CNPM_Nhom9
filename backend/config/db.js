/**
 * config/db.js — Kết nối Microsoft SQL Server
 *
 * Sử dụng thư viện `mssql` với connection pool (tối đa 10 kết nối đồng thời).
 * Toàn bộ thông tin kết nối lấy từ file .env để bảo mật.
 *
 * Export:
 *  - connectDB()  : Gọi một lần khi server khởi động
 *  - getPool()    : Lấy pool đang hoạt động để thực thi query
 *  - sql          : Object kiểu dữ liệu của mssql (dùng sql.Int, sql.NVarChar, …)
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

const sql = require('mssql');
require('dotenv').config();

// ── Cấu hình kết nối ─────────────────────────────────────────────────────────
const config = {
  server:   process.env.DB_SERVER || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME   || 'phone_store',
  user:     process.env.DB_USER   || 'sa',
  password: process.env.DB_PASSWORD,
  options: {
    trustedConnection:      true,
    encrypt:                false,    // Không dùng SSL (môi trường nội bộ)
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort:       true,
  },
  pool: {
    max:              10,    // Tối đa 10 kết nối song song
    min:              0,
    idleTimeoutMillis: 30000, // Đóng kết nối rảnh sau 30 giây
  },
};

let pool = null; // Biến singleton giữ pool toàn cục

/**
 * connectDB — Khởi tạo kết nối tới SQL Server.
 * Nếu thất bại, ghi lỗi và thoát tiến trình (không để server chạy mà không có DB).
 */
const connectDB = async () => {
  try {
    pool = await sql.connect(config);
    console.log('✅ Kết nối SQL Server thành công!');
    return pool;
  } catch (err) {
    console.error('❌ Lỗi kết nối SQL Server:', err.message);
    process.exit(1); // Dừng server ngay nếu không kết nối được DB
  }
};

/**
 * getPool — Trả về pool đang hoạt động.
 * Gọi hàm này trong mỗi controller để lấy request builder.
 */
const getPool = () => {
  if (!pool) throw new Error('DB chưa kết nối. Gọi connectDB() trước.');
  return pool;
};

module.exports = { connectDB, getPool, sql };
