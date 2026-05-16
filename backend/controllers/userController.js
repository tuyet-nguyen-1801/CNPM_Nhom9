const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query(`SELECT id, name, email, role, phone, address, is_active, last_login, created_at FROM users ORDER BY id DESC`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id, name, email, role, phone, address, is_active, last_login, created_at FROM users WHERE id = @id`);
    if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users
const createUser = async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
  try {
    const pool = getPool();
    const exists = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT id FROM users WHERE email = @email`);
    if (exists.recordset[0]) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hash)
      .input('role', sql.NVarChar, role || 'user')
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .query(`INSERT INTO users (name, email, password, role, phone, address) 
              OUTPUT INSERTED.id VALUES (@name, @email, @password, @role, @phone, @address)`);
    res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', id: result.recordset[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  const { name, role, phone, address, is_active } = req.body;
  try {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('role', sql.NVarChar, role)
      .input('phone', sql.NVarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
      .query(`UPDATE users SET name=@name, role=@role, phone=@phone, address=@address, is_active=@is_active, updated_at=GETDATE() WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/users/:id (deactivate)
const deactivateUser = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE users SET is_active = 0, updated_at = GETDATE() WHERE id = @id`);
    res.json({ success: true, message: 'Đã vô hiệu hóa tài khoản' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deactivateUser };
