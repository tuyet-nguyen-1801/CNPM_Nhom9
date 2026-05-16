/**
 * controllers/authController.js — Xác thực tài khoản nhân viên
 *
 * Quản lý đăng nhập và đổi mật khẩu cho tài khoản trong bảng `users`
 * (admin và nhân viên bán hàng). Khách hàng dùng endpoint riêng trong
 * customerController.js.
 *
 * Route:
 *  POST /api/auth/login           — Đăng nhập (trả JWT 8 giờ)
 *  GET  /api/auth/profile         — Xem thông tin tài khoản đang đăng nhập
 *  PUT  /api/auth/change-password — Đổi mật khẩu (cần mật khẩu cũ)
 *
 * Bảo mật: mật khẩu được mã hóa bằng bcryptjs (salt rounds = 10).
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });

  try {
    const pool = getPool();

    // Tìm tài khoản theo email, chỉ lấy tài khoản đang hoạt động
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT * FROM users WHERE email = @email AND is_active = 1`);

    const user = result.recordset[0];
    if (!user)
      return res.status(401).json({ success: false, message: 'Email không tồn tại hoặc tài khoản bị khóa' });

    // So sánh mật khẩu nhập vào với hash trong DB
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });

    // Ghi nhận thời điểm đăng nhập gần nhất
    await pool.request()
      .input('id', sql.Int, user.id)
      .query(`UPDATE users SET last_login = GETDATE() WHERE id = @id`);

    // Tạo JWT với thông tin cơ bản, hết hạn sau 8 giờ
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/auth/profile ────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const pool = getPool();
    // req.user.id được gắn bởi middleware `protect`
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT id, name, email, role, phone, address, last_login, created_at FROM users WHERE id = @id`);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/auth/change-password ────────────────────────────────────────────
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });

  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT password FROM users WHERE id = @id`);

    // Xác minh mật khẩu cũ trước khi cho phép đổi
    const match = await bcrypt.compare(oldPassword, result.recordset[0].password);
    if (!match)
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('pwd', sql.NVarChar, hash)
      .query(`UPDATE users SET password = @pwd, updated_at = GETDATE() WHERE id = @id`);

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { login, getProfile, changePassword };
