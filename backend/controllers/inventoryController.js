/**
 * controllers/inventoryController.js — Quản lý kho hàng
 *
 * Route:
 *  GET  /api/inventory                     — Tổng quan tồn kho tất cả sản phẩm
 *  GET  /api/inventory/transactions        — Lịch sử nhập/xuất/điều chỉnh kho
 *  POST /api/inventory/import              — Nhập thêm hàng vào kho
 *  PUT  /api/inventory/:phone_id/adjust    — Điều chỉnh tồn kho thủ công
 *
 * Mỗi thay đổi tồn kho đều ghi vào bảng `inventory_transactions` để truy xuất nguồn gốc.
 * Trạng thái tồn kho được tính tự động: Hết hàng / Sắp hết / Còn hàng.
 *
 * Người thực hiện: Trần Hữu Minh
 */

const { getPool, sql } = require('../config/db');

// ── GET /api/inventory ────────────────────────────────────────────────────────
const getInventory = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT p.id AS phone_id, p.name, p.brand, p.category, p.price,
             i.quantity, i.min_quantity, i.location, i.updated_at,
             -- Tính trạng thái tồn kho theo ngưỡng cảnh báo (min_quantity)
             CASE WHEN i.quantity = 0           THEN N'Hết hàng'
                  WHEN i.quantity <= i.min_quantity THEN N'Sắp hết'
                  ELSE N'Còn hàng' END AS status
      FROM inventory i JOIN phones p ON p.id = i.phone_id
      WHERE p.is_active = 1 ORDER BY i.quantity ASC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/inventory/transactions ──────────────────────────────────────────
const getTransactions = async (req, res) => {
  const { phone_id, type, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool  = getPool();
    let where   = 'WHERE 1=1';
    const req2  = pool.request();
    if (phone_id) { where += ' AND it.phone_id = @phone_id'; req2.input('phone_id', sql.Int, phone_id); }
    if (type)     { where += ' AND it.type = @type';         req2.input('type',     sql.NVarChar, type); }
    req2.input('offset', sql.Int, parseInt(offset));
    req2.input('limit',  sql.Int, parseInt(limit));
    const result = await req2.query(`
      SELECT it.*, p.name AS phone_name, p.brand, u.name AS created_by_name
      FROM inventory_transactions it
      JOIN phones p ON p.id = it.phone_id
      LEFT JOIN users u ON u.id = it.created_by
      ${where} ORDER BY it.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/inventory/import (nhập kho) ────────────────────────────────────
const importStock = async (req, res) => {
  const { phone_id, quantity, note } = req.body;
  if (!phone_id || !quantity || quantity <= 0)
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  try {
    const pool = getPool();
    const inv  = await pool.request()
      .input('phone_id', sql.Int, phone_id)
      .query(`SELECT quantity FROM inventory WHERE phone_id = @phone_id`);
    if (!inv.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong kho' });

    const qtyBefore = inv.recordset[0].quantity;
    const qtyAfter  = qtyBefore + parseInt(quantity);

    // Cập nhật số lượng kho
    await pool.request()
      .input('phone_id',  sql.Int, phone_id)
      .input('qty_after', sql.Int, qtyAfter)
      .query(`UPDATE inventory SET quantity = @qty_after, updated_at = GETDATE() WHERE phone_id = @phone_id`);

    // Ghi lịch sử nhập kho
    await pool.request()
      .input('phone_id',  sql.Int,      phone_id)
      .input('type',      sql.NVarChar, 'import')
      .input('quantity',  sql.Int,      parseInt(quantity))
      .input('qty_before',sql.Int,      qtyBefore)
      .input('qty_after', sql.Int,      qtyAfter)
      .input('note',      sql.NVarChar(sql.MAX), note || null)
      .input('created_by',sql.Int,      req.user.id)
      .query(`INSERT INTO inventory_transactions (phone_id, type, quantity, qty_before, qty_after, note, created_by)
              VALUES (@phone_id, @type, @quantity, @qty_before, @qty_after, @note, @created_by)`);

    res.json({ success: true, message: `Đã nhập ${quantity} sản phẩm. Tồn kho mới: ${qtyAfter}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/inventory/:phone_id/adjust ──────────────────────────────────────
const adjustStock = async (req, res) => {
  const { new_quantity, note } = req.body;
  if (new_quantity === undefined || new_quantity < 0)
    return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
  try {
    const pool = getPool();
    const inv  = await pool.request()
      .input('phone_id', sql.Int, req.params.phone_id)
      .query(`SELECT quantity FROM inventory WHERE phone_id = @phone_id`);
    if (!inv.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    const qtyBefore = inv.recordset[0].quantity;
    const diff      = new_quantity - qtyBefore; // Dương = nhập thêm, âm = giảm

    await pool.request()
      .input('phone_id', sql.Int, req.params.phone_id)
      .input('qty',      sql.Int, new_quantity)
      .query(`UPDATE inventory SET quantity = @qty, updated_at = GETDATE() WHERE phone_id = @phone_id`);

    await pool.request()
      .input('phone_id',  sql.Int,      req.params.phone_id)
      .input('type',      sql.NVarChar, 'adjust')
      .input('quantity',  sql.Int,      diff)
      .input('qty_before',sql.Int,      qtyBefore)
      .input('qty_after', sql.Int,      new_quantity)
      .input('note',      sql.NVarChar(sql.MAX), note || 'Điều chỉnh thủ công')
      .input('created_by',sql.Int,      req.user.id)
      .query(`INSERT INTO inventory_transactions (phone_id, type, quantity, qty_before, qty_after, note, created_by)
              VALUES (@phone_id, @type, @quantity, @qty_before, @qty_after, @note, @created_by)`);

    res.json({ success: true, message: 'Đã điều chỉnh tồn kho' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInventory, getTransactions, importStock, adjustStock };
