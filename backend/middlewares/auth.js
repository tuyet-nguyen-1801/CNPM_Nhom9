/**
 * middlewares/auth.js — Xác thực và phân quyền JWT
 *
 * Hệ thống có 2 loại token khác nhau:
 *  - Token nhân viên : payload chứa { id, email, role: 'admin'|'user' }
 *  - Token khách hàng: payload chứa { id, phone, role: 'customer', type: 'customer' }
 *
 * Middleware:
 *  - protect      : Bắt buộc phải có JWT hợp lệ (dùng cho mọi route cần đăng nhập)
 *  - adminOnly    : Chỉ cho role === 'admin' (quản lý nhân viên, xóa dữ liệu…)
 *  - customerOnly : Chỉ cho type === 'customer' (xem đơn hàng của chính mình)
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

const jwt = require('jsonwebtoken');

/**
 * protect — Kiểm tra header Authorization: Bearer <token>.
 * Giải mã JWT bằng JWT_SECRET trong .env.
 * Gắn thông tin người dùng vào req.user để các handler tiếp theo dùng.
 */
const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email/phone, role, type, iat, exp }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

/**
 * adminOnly — Chỉ admin (trưởng cửa hàng) mới được thực hiện.
 * Phải dùng sau `protect` trong chuỗi middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thực hiện' });
  }
  next();
};

/**
 * customerOnly — Chỉ khách hàng đã đăng nhập qua portal mới được dùng.
 * Phân biệt với token nhân viên qua trường `type`.
 */
const customerOnly = (req, res, next) => {
  if (req.user?.type !== 'customer') {
    return res.status(403).json({ success: false, message: 'Chỉ dành cho khách hàng' });
  }
  next();
};

module.exports = { protect, adminOnly, customerOnly };
