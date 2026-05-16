/**
 * controllers/phoneController.js — Quản lý sản phẩm điện thoại
 *
 * Route:
 *  GET    /api/phones          — Danh sách (lọc hãng/phân khúc/từ khóa, phân trang)
 *  GET    /api/phones/:id      — Chi tiết một sản phẩm kèm tồn kho
 *  POST   /api/phones          — Thêm sản phẩm mới + tạo bản ghi inventory
 *  PUT    /api/phones/:id      — Cập nhật thông tin sản phẩm
 *  DELETE /api/phones/:id      — Ẩn sản phẩm (is_active = 0)
 *
 * Khi thêm sản phẩm mới, tự động tạo bản ghi trong bảng `inventory`
 * với số lượng ban đầu (stock) do nhân viên nhập.
 *
 * Người thực hiện: Nguyễn Trọng Cường
 */

const { getPool, sql } = require('../config/db');

// ── GET /api/phones ───────────────────────────────────────────────────────────
const getPhones = async (req, res) => {
  const { brand, category, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool  = getPool();
    let where   = 'WHERE p.is_active = 1'; // Chỉ trả về sản phẩm đang kinh doanh
    const req2  = pool.request();

    // Xây dựng điều kiện lọc động
    if (brand)    { where += ' AND p.brand = @brand';      req2.input('brand',    sql.NVarChar, brand); }
    if (category) { where += ' AND p.category = @category'; req2.input('category', sql.NVarChar, category); }
    if (search)   { where += ' AND (p.name LIKE @search OR p.brand LIKE @search OR p.model LIKE @search)'; req2.input('search', sql.NVarChar, `%${search}%`); }

    const total = await req2.query(`SELECT COUNT(*) AS total FROM phones p ${where}`);
    req2.input('offset', sql.Int, parseInt(offset));
    req2.input('limit',  sql.Int, parseInt(limit));

    // LEFT JOIN inventory để có cột `stock` số lượng tồn kho
    const result = await req2.query(`
      SELECT p.*, i.quantity AS stock
      FROM phones p
      LEFT JOIN inventory i ON i.phone_id = p.id
      ${where}
      ORDER BY p.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset, total: total.recordset[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/phones/:id ───────────────────────────────────────────────────────
const getPhone = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT p.*, i.quantity AS stock, i.min_quantity, i.location
              FROM phones p LEFT JOIN inventory i ON i.phone_id = p.id WHERE p.id = @id`);
    if (!result.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/phones ──────────────────────────────────────────────────────────
const createPhone = async (req, res) => {
  const { name, brand, model, category, price, import_price, description, image,
    ram, storage, screen, battery, camera, os, chip, sim, colors, warranty, stock } = req.body;
  if (!name || !brand || !price || !import_price)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });

  try {
    const pool = getPool();
    const result = await pool.request()
      .input('name',         sql.NVarChar, name)
      .input('brand',        sql.NVarChar, brand)
      .input('model',        sql.NVarChar, model || null)
      .input('category',     sql.NVarChar, category || 'mid-range')
      .input('price',        sql.Decimal(15, 0), price)
      .input('import_price', sql.Decimal(15, 0), import_price)
      .input('description',  sql.NVarChar(sql.MAX), description || null)
      .input('image',        sql.NVarChar, image || null)
      .input('ram',          sql.NVarChar, ram || null)
      .input('storage',      sql.NVarChar, storage || null)
      .input('screen',       sql.NVarChar, screen || null)
      .input('battery',      sql.NVarChar, battery || null)
      .input('camera',       sql.NVarChar, camera || null)
      .input('os',           sql.NVarChar, os || null)
      .input('chip',         sql.NVarChar, chip || null)
      .input('sim',          sql.NVarChar, sim || null)
      .input('colors',       sql.NVarChar, colors || null)
      .input('warranty',     sql.Int,      warranty || 12)
      .input('created_by',   sql.Int,      req.user.id)
      .query(`INSERT INTO phones (name,brand,model,category,price,import_price,description,image,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,created_by)
              OUTPUT INSERTED.id
              VALUES (@name,@brand,@model,@category,@price,@import_price,@description,@image,@ram,@storage,@screen,@battery,@camera,@os,@chip,@sim,@colors,@warranty,@created_by)`);
    const phoneId = result.recordset[0].id;

    // Tự động tạo bản ghi kho cho sản phẩm mới
    await pool.request()
      .input('phone_id', sql.Int, phoneId)
      .input('quantity', sql.Int, stock || 0)
      .query(`INSERT INTO inventory (phone_id, quantity) VALUES (@phone_id, @quantity)`);

    res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công', id: phoneId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/phones/:id ───────────────────────────────────────────────────────
const updatePhone = async (req, res) => {
  const { name, brand, model, category, price, import_price, description, image,
    ram, storage, screen, battery, camera, os, chip, sim, colors, warranty, is_active } = req.body;
  try {
    const pool = getPool();
    await pool.request()
      .input('id',           sql.Int,  req.params.id)
      .input('name',         sql.NVarChar, name)
      .input('brand',        sql.NVarChar, brand)
      .input('model',        sql.NVarChar, model || null)
      .input('category',     sql.NVarChar, category || 'mid-range')
      .input('price',        sql.Decimal(15, 0), price)
      .input('import_price', sql.Decimal(15, 0), import_price)
      .input('description',  sql.NVarChar(sql.MAX), description || null)
      .input('image',        sql.NVarChar, image || null)
      .input('ram',          sql.NVarChar, ram || null)
      .input('storage',      sql.NVarChar, storage || null)
      .input('screen',       sql.NVarChar, screen || null)
      .input('battery',      sql.NVarChar, battery || null)
      .input('camera',       sql.NVarChar, camera || null)
      .input('os',           sql.NVarChar, os || null)
      .input('chip',         sql.NVarChar, chip || null)
      .input('sim',          sql.NVarChar, sim || null)
      .input('colors',       sql.NVarChar, colors || null)
      .input('warranty',     sql.Int,  warranty || 12)
      .input('is_active',    sql.Bit,  is_active !== undefined ? is_active : 1)
      .query(`UPDATE phones SET name=@name,brand=@brand,model=@model,category=@category,price=@price,import_price=@import_price,
              description=@description,image=@image,ram=@ram,storage=@storage,screen=@screen,battery=@battery,camera=@camera,
              os=@os,chip=@chip,sim=@sim,colors=@colors,warranty=@warranty,is_active=@is_active,updated_at=GETDATE() WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/phones/:id (ẩn sản phẩm) ─────────────────────────────────────
const deletePhone = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE phones SET is_active = 0, updated_at = GETDATE() WHERE id = @id`);
    res.json({ success: true, message: 'Đã xóa sản phẩm' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPhones, getPhone, createPhone, updatePhone, deletePhone };
