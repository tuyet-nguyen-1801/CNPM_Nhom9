/**
 * controllers/customerController.js — Quản lý khách hàng
 *
 * Gồm 2 nhóm chức năng:
 *
 * A. QUẢN LÝ (dành cho nhân viên — cần đăng nhập):
 *    GET    /api/customers          — Danh sách khách hàng (có tìm kiếm, phân trang)
 *    GET    /api/customers/:id      — Chi tiết một khách hàng
 *    POST   /api/customers          — Thêm khách hàng mới
 *    PUT    /api/customers/:id      — Cập nhật thông tin
 *    DELETE /api/customers/:id      — Xóa mềm (is_active = 0)
 *
 * B. CỔNG KHÁCH HÀNG (public — không cần JWT nhân viên):
 *    POST /api/customers/register         — Tự đăng ký tài khoản
 *    POST /api/customers/login            — Đăng nhập (trả JWT type='customer')
 *    PUT  /api/customers/change-password  — Đổi mật khẩu bằng SĐT + mật khẩu cũ
 *    GET  /api/customers/my-orders        — Lịch sử đơn hàng của chính mình
 *
 * Mật khẩu khách hàng lưu ở cột `password_hash` (tách khỏi mật khẩu nhân viên).
 *
 * Người thực hiện: Lê Đức Đồng
 */

const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

// ── GET /api/customers ───────────────────────────────────────────────────────
const getCustomers = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool  = getPool();
    let where   = 'WHERE c.is_active = 1';
    const req2  = pool.request();

    if (search) {
      where += ' AND (c.name LIKE @search OR c.phone LIKE @search OR c.email LIKE @search)';
      req2.input('search', sql.NVarChar, `%${search}%`);
    }

    const total = await req2.query(`SELECT COUNT(*) AS total FROM customers c ${where}`);
    req2.input('offset', sql.Int, parseInt(offset));
    req2.input('limit',  sql.Int, parseInt(limit));

    // JOIN thêm tên nhân viên tạo KH và đếm số đơn hàng
    const result = await req2.query(`
      SELECT c.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS total_orders
      FROM customers c LEFT JOIN users u ON u.id = c.created_by
      ${where} ORDER BY c.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset, total: total.recordset[0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/customers/:id ───────────────────────────────────────────────────
const getCustomer = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT c.*, u.name AS created_by_name
              FROM customers c LEFT JOIN users u ON u.id = c.created_by
              WHERE c.id = @id`);
    if (!result.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/customers (nhân viên thêm) ─────────────────────────────────────
const createCustomer = async (req, res) => {
  const { name, phone, email, address, gender, birthday, note } = req.body;
  if (!name || !phone)
    return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });
  try {
    const pool   = getPool();
    const result = await pool.request()
      .input('name',       sql.NVarChar, name)
      .input('phone',      sql.NVarChar, phone)
      .input('email',      sql.NVarChar, email || null)
      .input('address',    sql.NVarChar, address || null)
      .input('gender',     sql.NVarChar, gender || 'other')
      .input('birthday',   sql.Date,     birthday || null)
      .input('note',       sql.NVarChar(sql.MAX), note || null)
      .input('created_by', sql.Int,      req.user.id)
      .query(`INSERT INTO customers (name,phone,email,address,gender,birthday,note,created_by)
              OUTPUT INSERTED.id VALUES (@name,@phone,@email,@address,@gender,@birthday,@note,@created_by)`);
    res.status(201).json({ success: true, message: 'Thêm khách hàng thành công', id: result.recordset[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/customers/:id ───────────────────────────────────────────────────
const updateCustomer = async (req, res) => {
  const { name, phone, email, address, gender, birthday, note } = req.body;
  try {
    const pool = getPool();
    await pool.request()
      .input('id',       sql.Int,  req.params.id)
      .input('name',     sql.NVarChar, name)
      .input('phone',    sql.NVarChar, phone)
      .input('email',    sql.NVarChar, email || null)
      .input('address',  sql.NVarChar, address || null)
      .input('gender',   sql.NVarChar, gender || 'other')
      .input('birthday', sql.Date,     birthday || null)
      .input('note',     sql.NVarChar(sql.MAX), note || null)
      .query(`UPDATE customers SET name=@name,phone=@phone,email=@email,address=@address,
              gender=@gender,birthday=@birthday,note=@note,updated_at=GETDATE() WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/customers/:id (xóa mềm) ─────────────────────────────────────
const deleteCustomer = async (req, res) => {
  try {
    const pool = getPool();
    // Đặt is_active = 0 thay vì xóa hẳn để giữ lịch sử
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE customers SET is_active = 0, updated_at = GETDATE() WHERE id = @id`);
    res.json({ success: true, message: 'Đã xóa khách hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/customers/register (public – khách hàng tự đăng ký) ───────────
const registerCustomer = async (req, res) => {
  const { name, phone, email, address, gender, birthday, password } = req.body;
  if (!name || !phone)
    return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });
  if (!password || password.length < 6)
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });

  try {
    const pool = getPool();

    // Kiểm tra SĐT đã đăng ký chưa
    const dup = await pool.request()
      .input('phone', sql.NVarChar, phone)
      .query('SELECT id FROM customers WHERE phone = @phone AND is_active = 1');
    if (dup.recordset.length > 0)
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký' });

    // Mã hóa mật khẩu trước khi lưu
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('name',          sql.NVarChar, name)
      .input('phone',         sql.NVarChar, phone)
      .input('email',         sql.NVarChar, email || null)
      .input('address',       sql.NVarChar, address || null)
      .input('gender',        sql.NVarChar, gender || 'other')
      .input('birthday',      sql.Date,     birthday || null)
      .input('note',          sql.NVarChar(sql.MAX), 'Đăng ký online')
      .input('password_hash', sql.NVarChar, password_hash)
      .query(`INSERT INTO customers (name,phone,email,address,gender,birthday,note,password_hash)
              OUTPUT INSERTED.id VALUES (@name,@phone,@email,@address,@gender,@birthday,@note,@password_hash)`);

    res.status(201).json({ success: true, message: 'Đăng ký thành công! Chào mừng bạn đến với PhoneStore.', id: result.recordset[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/customers/change-password (public – dùng SĐT xác thực) ─────────
const changeCustomerPassword = async (req, res) => {
  const { phone, old_password, new_password } = req.body;
  if (!phone || !old_password || !new_password)
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  if (new_password.length < 6)
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });

  try {
    const pool = getPool();
    const result = await pool.request()
      .input('phone', sql.NVarChar, phone)
      .query('SELECT id, password_hash FROM customers WHERE phone = @phone AND is_active = 1');

    const customer = result.recordset[0];
    if (!customer)
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với số điện thoại này' });
    if (!customer.password_hash)
      return res.status(400).json({ success: false, message: 'Tài khoản này chưa đặt mật khẩu. Vui lòng đăng ký lại.' });

    const valid = await bcrypt.compare(old_password, customer.password_hash);
    if (!valid)
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });

    const new_hash = await bcrypt.hash(new_password, 10);
    await pool.request()
      .input('id',   sql.Int,      customer.id)
      .input('hash', sql.NVarChar, new_hash)
      .query('UPDATE customers SET password_hash = @hash, updated_at = GETDATE() WHERE id = @id');

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/customers/login (public) ───────────────────────────────────────
const loginCustomer = async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });

  try {
    const pool = getPool();
    const result = await pool.request()
      .input('phone', sql.NVarChar, phone)
      .query('SELECT * FROM customers WHERE phone = @phone AND is_active = 1');

    const customer = result.recordset[0];
    if (!customer)
      return res.status(401).json({ success: false, message: 'Số điện thoại không tồn tại hoặc tài khoản bị khóa' });
    if (!customer.password_hash)
      return res.status(401).json({ success: false, message: 'Tài khoản này chưa có mật khẩu. Vui lòng đăng ký lại.' });

    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });

    // Token khách hàng có thêm trường `type: 'customer'` để phân biệt với token nhân viên
    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, name: customer.name, role: 'customer', type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '8h' }
    );

    res.json({
      success: true, token,
      user: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, gender: customer.gender, role: 'customer', type: 'customer' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/customers/my-orders (yêu cầu JWT khách hàng) ───────────────────
const getMyOrders = async (req, res) => {
  try {
    const pool = getPool();
    // Tìm đơn hàng theo SĐT (customer_phone) lấy từ JWT payload
    const orders = await pool.request()
      .input('phone', sql.NVarChar, req.user.phone)
      .query(`
        SELECT o.id, o.order_code, o.total_amount, o.discount, o.final_amount,
               o.status, o.payment_status, o.payment_method, o.created_at,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o
        WHERE o.customer_phone = @phone
        ORDER BY o.created_at DESC
      `);
    res.json({ success: true, data: orders.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  registerCustomer, changeCustomerPassword, loginCustomer, getMyOrders
};
