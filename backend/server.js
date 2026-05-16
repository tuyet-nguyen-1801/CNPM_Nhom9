/**
 * server.js — Điểm khởi động của ứng dụng PhoneStore
 *
 * Nhiệm vụ:
 *  1. Nạp biến môi trường từ file .env
 *  2. Khởi tạo Express, đăng ký middleware (CORS, JSON parser)
 *  3. Gắn tất cả các route API vào prefix /api/...
 *  4. Phục vụ file tĩnh của Frontend (HTML/CSS/JS)
 *  5. Chạy tự động migration CSDL (thêm cột mới nếu chưa có)
 *  6. Kết nối SQL Server rồi mới lắng nghe cổng PORT
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { connectDB, getPool } = require('./config/db');

const app = express();

// ── Middleware toàn cục ──────────────────────────────────────────────────────
app.use(cors());                              // Cho phép gọi API từ origin khác (dev)
app.use(express.json());                      // Parse body dạng JSON
app.use(express.urlencoded({ extended: true })); // Parse body dạng form

// ── Phục vụ file tĩnh của giao diện người dùng ──────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Các nhóm API ─────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));       // Đăng nhập nhân viên
app.use('/api/users',     require('./routes/users'));      // Quản lý tài khoản nhân viên
app.use('/api/phones',    require('./routes/phones'));     // Sản phẩm điện thoại
app.use('/api/customers', require('./routes/customers')); // Khách hàng (kể cả đăng ký/login KH)
app.use('/api/inventory', require('./routes/inventory')); // Kho hàng
app.use('/api/orders',    require('./routes/orders'));     // Đơn hàng
app.use('/api/invoices',  require('./routes/invoices'));   // Hóa đơn
app.use('/api/stats',     require('./routes/stats'));      // Thống kê / báo cáo

// ── Catch-all: bất kỳ URL nào không phải /api đều trả về SPA ────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Xử lý lỗi tập trung ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Lỗi server' });
});

const PORT = process.env.PORT || 5000;

/**
 * runMigrations — Tự động cập nhật schema CSDL khi server khởi động.
 * Mỗi migration chỉ chạy NẾU cột/bảng chưa tồn tại (idempotent).
 * Nhờ đó không cần chạy tay SQL khi triển khai lên máy mới.
 */
async function runMigrations() {
  const pool = getPool();
  const migrations = [
    {
      name: 'customers.password_hash',
      // Thêm cột lưu mật khẩu đã mã hóa cho bảng khách hàng (tính năng đăng ký online)
      sql: `IF NOT EXISTS (
              SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_NAME='customers' AND COLUMN_NAME='password_hash'
            )
            BEGIN
              ALTER TABLE customers ADD password_hash NVARCHAR(255) NULL;
            END`,
    },
  ];

  for (const m of migrations) {
    try {
      await pool.request().query(m.sql);
      console.log(`✅ Migration OK: ${m.name}`);
    } catch (err) {
      console.warn(`⚠️  Migration skip (${m.name}): ${err.message}`);
    }
  }
}

// ── Khởi động: kết nối DB → migration → lắng nghe cổng ─────────────────────
connectDB().then(async () => {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📱 Giao diện: http://localhost:${PORT}`);
    console.log(`🔌 API:       http://localhost:${PORT}/api`);
  });
});
