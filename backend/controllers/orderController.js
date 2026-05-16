/**
 * controllers/orderController.js — Quản lý đơn hàng
 *
 * Route:
 *  GET    /api/orders              — Danh sách đơn hàng (lọc trạng thái, phân trang)
 *  GET    /api/orders/:id          — Chi tiết đơn hàng kèm danh sách sản phẩm
 *  POST   /api/orders              — Tạo đơn hàng mới (nhân viên hoặc khách hàng)
 *  PUT    /api/orders/:id/status   — Cập nhật trạng thái đơn
 *  DELETE /api/orders/:id          — Hủy đơn (chỉ khi đang pending/confirmed)
 *
 * Khi tạo đơn hàng, hệ thống tự động:
 *  1. Kiểm tra tồn kho cho từng sản phẩm
 *  2. Tạo bản ghi trong `orders` và `order_items`
 *  3. Trừ tồn kho trong bảng `inventory`
 *  4. Ghi lịch sử xuất kho vào `inventory_transactions`
 * Tất cả thực hiện trong một DB transaction để đảm bảo tính nhất quán.
 *
 * Lưu ý: Khách hàng đặt hàng qua portal → created_by = NULL
 * (tránh vi phạm khóa ngoại tham chiếu bảng users).
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

const { getPool, sql } = require('../config/db');

// Tạo mã đơn hàng duy nhất: DH + 8 chữ số cuối timestamp
const genOrderCode = () => 'DH' + Date.now().toString().slice(-8);

// ── GET /api/orders ───────────────────────────────────────────────────────────
const getOrders = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool  = getPool();
    let where   = 'WHERE 1=1';
    const req2  = pool.request();
    if (status) { where += ' AND o.status = @status'; req2.input('status', sql.NVarChar, status); }
    if (search) {
      where += ' AND (o.order_code LIKE @search OR o.customer_name LIKE @search OR o.customer_phone LIKE @search)';
      req2.input('search', sql.NVarChar, `%${search}%`);
    }
    const total = await req2.query(`SELECT COUNT(*) AS total FROM orders o ${where}`);
    req2.input('offset', sql.Int, parseInt(offset));
    req2.input('limit',  sql.Int, parseInt(limit));
    const result = await req2.query(`
      SELECT o.*, u.name AS staff_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o LEFT JOIN users u ON u.id = o.created_by
      ${where} ORDER BY o.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset, total: total.recordset[0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const pool  = getPool();
    const order = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT o.*, u.name AS staff_name FROM orders o LEFT JOIN users u ON u.id = o.created_by WHERE o.id = @id`);
    if (!order.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    const items = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM order_items WHERE order_id = @id`);
    res.json({ success: true, data: { ...order.recordset[0], items: items.recordset } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/orders ──────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  const { customer_id, customer_name, customer_phone, customer_email, customer_addr,
    items, discount, payment_method, note } = req.body;
  if (!customer_name || !customer_phone || !items || !items.length)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đơn hàng' });

  const pool = getPool();
  const transaction = new sql.Transaction(pool._pool || pool);
  try {
    await transaction.begin();
    const req2 = new sql.Request(transaction);

    // ── Bước 1: Kiểm tra tồn kho trước khi tạo đơn ──────────────────────────
    for (const item of items) {
      const inv = await req2.input(`pid_${item.phone_id}`, sql.Int, item.phone_id)
        .query(`SELECT i.quantity, p.name FROM inventory i JOIN phones p ON p.id = i.phone_id WHERE i.phone_id = @pid_${item.phone_id}`);
      if (!inv.recordset[0] || inv.recordset[0].quantity < item.quantity)
        throw new Error(`Sản phẩm "${inv.recordset[0]?.name || item.phone_id}" không đủ tồn kho`);
    }

    const total_amount = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const final_amount = total_amount - (discount || 0);
    const order_code   = genOrderCode();

    // ── Bước 2: Tạo bản ghi đơn hàng ─────────────────────────────────────────
    const orderResult = await new sql.Request(transaction)
      .input('order_code',    sql.NVarChar, order_code)
      .input('customer_id',   sql.Int,      customer_id || null)
      .input('customer_name', sql.NVarChar, customer_name)
      .input('customer_phone',sql.NVarChar, customer_phone)
      .input('customer_email',sql.NVarChar, customer_email || null)
      .input('customer_addr', sql.NVarChar, customer_addr || null)
      .input('total_amount',  sql.Decimal(15, 0), total_amount)
      .input('discount',      sql.Decimal(15, 0), discount || 0)
      .input('final_amount',  sql.Decimal(15, 0), final_amount)
      .input('payment_method',sql.NVarChar, payment_method || 'cash')
      .input('note',          sql.NVarChar(sql.MAX), note || null)
      // Nếu là khách hàng portal → created_by = null (tránh vi phạm FK với bảng users)
      .input('created_by',    sql.Int, req.user.type === 'customer' ? null : req.user.id)
      .query(`INSERT INTO orders (order_code,customer_id,customer_name,customer_phone,customer_email,customer_addr,
              total_amount,discount,final_amount,payment_method,note,created_by)
              OUTPUT INSERTED.id
              VALUES (@order_code,@customer_id,@customer_name,@customer_phone,@customer_email,@customer_addr,
              @total_amount,@discount,@final_amount,@payment_method,@note,@created_by)`);
    const orderId = orderResult.recordset[0].id;

    // ── Bước 3: Thêm từng sản phẩm, trừ kho, ghi lịch sử ────────────────────
    for (const item of items) {
      const r = new sql.Request(transaction);
      r.input('order_id',   sql.Int,      orderId);
      r.input('phone_id',   sql.Int,      item.phone_id);
      r.input('phone_name', sql.NVarChar, item.phone_name);
      r.input('phone_brand',sql.NVarChar, item.phone_brand || null);
      r.input('quantity',   sql.Int,      item.quantity);
      r.input('unit_price', sql.Decimal(15, 0), item.unit_price);
      r.input('subtotal',   sql.Decimal(15, 0), item.unit_price * item.quantity);
      await r.query(`INSERT INTO order_items (order_id,phone_id,phone_name,phone_brand,quantity,unit_price,subtotal)
                     VALUES (@order_id,@phone_id,@phone_name,@phone_brand,@quantity,@unit_price,@subtotal)`);

      // Trừ tồn kho
      const inv2 = await new sql.Request(transaction)
        .input('phone_id', sql.Int, item.phone_id)
        .query(`SELECT quantity FROM inventory WHERE phone_id = @phone_id`);
      const qtyBefore = inv2.recordset[0].quantity;
      const qtyAfter  = qtyBefore - item.quantity;

      await new sql.Request(transaction)
        .input('phone_id',  sql.Int, item.phone_id)
        .input('qty_after', sql.Int, qtyAfter)
        .query(`UPDATE inventory SET quantity = @qty_after, updated_at = GETDATE() WHERE phone_id = @phone_id`);

      // Ghi lịch sử giao dịch kho (loại 'export')
      await new sql.Request(transaction)
        .input('phone_id',  sql.Int,      item.phone_id)
        .input('quantity',  sql.Int,      -item.quantity)
        .input('qty_before',sql.Int,      qtyBefore)
        .input('qty_after', sql.Int,      qtyAfter)
        .input('reference', sql.NVarChar, order_code)
        .input('created_by',sql.Int,      req.user.id)
        .query(`INSERT INTO inventory_transactions (phone_id,type,quantity,qty_before,qty_after,reference,created_by)
                VALUES (@phone_id,'export',@quantity,@qty_before,@qty_after,@reference,@created_by)`);
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: 'Tạo đơn hàng thành công', id: orderId, order_code });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/orders/:id/status ────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  const { status, payment_status } = req.body;
  try {
    const pool = getPool();
    await pool.request()
      .input('id',             sql.Int,      req.params.id)
      .input('status',         sql.NVarChar, status)
      .input('payment_status', sql.NVarChar, payment_status || 'unpaid')
      .query(`UPDATE orders SET status=@status, payment_status=@payment_status, updated_at=GETDATE() WHERE id=@id`);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/orders/:id (hủy đơn) ─────────────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const pool = getPool();
    // Chỉ hủy được khi đơn đang ở trạng thái pending hoặc confirmed
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE orders SET status='cancelled', updated_at=GETDATE() WHERE id=@id AND status IN ('pending','confirmed')`);
    res.json({ success: true, message: 'Đã hủy đơn hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus, cancelOrder };
