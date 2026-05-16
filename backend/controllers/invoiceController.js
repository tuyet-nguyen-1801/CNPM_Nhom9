/**
 * controllers/invoiceController.js — Quản lý hóa đơn bán hàng
 *
 * Route:
 *  GET  /api/invoices      — Danh sách hóa đơn (lọc trạng thái, tìm kiếm, phân trang)
 *  GET  /api/invoices/:id  — Chi tiết hóa đơn kèm danh sách sản phẩm
 *  POST /api/invoices      — Tạo hóa đơn (từ đơn hàng hoặc bán trực tiếp)
 *
 * Khi tạo hóa đơn từ đơn hàng (có order_id), hệ thống tự động
 * cập nhật trạng thái đơn hàng → completed + payment_status → paid.
 *
 * Hóa đơn hỗ trợ:
 *  - Giảm giá (discount)
 *  - VAT theo tỷ lệ % (tax_rate)
 *  - Nhiều phương thức thanh toán: tiền mặt / chuyển khoản / thẻ
 *
 * Người thực hiện: Trần Hữu Minh
 */

const { getPool, sql } = require('../config/db');

// Tạo mã hóa đơn duy nhất: HD + 8 chữ số cuối timestamp
const genInvoiceCode = () => 'HD' + Date.now().toString().slice(-8);

// ── GET /api/invoices ─────────────────────────────────────────────────────────
const getInvoices = async (req, res) => {
  const { search, payment_status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const pool  = getPool();
    let where   = 'WHERE 1=1';
    const req2  = pool.request();
    if (payment_status) { where += ' AND i.payment_status = @ps'; req2.input('ps', sql.NVarChar, payment_status); }
    if (search) {
      where += ' AND (i.invoice_code LIKE @search OR i.customer_name LIKE @search OR i.customer_phone LIKE @search)';
      req2.input('search', sql.NVarChar, `%${search}%`);
    }
    const total = await req2.query(`SELECT COUNT(*) AS total FROM invoices i ${where}`);
    req2.input('offset', sql.Int, parseInt(offset));
    req2.input('limit',  sql.Int, parseInt(limit));
    const result = await req2.query(`
      SELECT i.*, u.name AS staff_name
      FROM invoices i LEFT JOIN users u ON u.id = i.created_by
      ${where} ORDER BY i.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset, total: total.recordset[0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/invoices/:id ─────────────────────────────────────────────────────
const getInvoice = async (req, res) => {
  try {
    const pool = getPool();
    const inv  = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT i.*, u.name AS staff_name FROM invoices i LEFT JOIN users u ON u.id = i.created_by WHERE i.id = @id`);
    if (!inv.recordset[0])
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    const items = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM invoice_items WHERE invoice_id = @id`);
    res.json({ success: true, data: { ...inv.recordset[0], items: items.recordset } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/invoices ────────────────────────────────────────────────────────
const createInvoice = async (req, res) => {
  const { order_id, customer_id, customer_name, customer_phone, customer_addr,
    items, discount, tax_rate, payment_method, note } = req.body;
  if (!customer_name || !customer_phone || !items?.length)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin hóa đơn' });
  try {
    const pool    = getPool();
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const disc     = discount || 0;
    const tax      = tax_rate || 0;
    const tax_amount = Math.round((subtotal - disc) * tax / 100);
    const total    = subtotal - disc + tax_amount;
    const invoice_code = genInvoiceCode();

    // Tạo bản ghi hóa đơn chính
    const result = await pool.request()
      .input('invoice_code',   sql.NVarChar, invoice_code)
      .input('order_id',       sql.Int,      order_id || null)
      .input('customer_id',    sql.Int,      customer_id || null)
      .input('customer_name',  sql.NVarChar, customer_name)
      .input('customer_phone', sql.NVarChar, customer_phone)
      .input('customer_addr',  sql.NVarChar, customer_addr || null)
      .input('subtotal',       sql.Decimal(15, 0), subtotal)
      .input('discount',       sql.Decimal(15, 0), disc)
      .input('tax_rate',       sql.Decimal(5, 2),  tax)
      .input('tax_amount',     sql.Decimal(15, 0), tax_amount)
      .input('total',          sql.Decimal(15, 0), total)
      .input('payment_method', sql.NVarChar, payment_method || 'cash')
      .input('payment_status', sql.NVarChar, 'paid')
      .input('paid_at',        sql.DateTime2, new Date())
      .input('note',           sql.NVarChar(sql.MAX), note || null)
      .input('created_by',     sql.Int,      req.user.id)
      .query(`INSERT INTO invoices (invoice_code,order_id,customer_id,customer_name,customer_phone,customer_addr,
              subtotal,discount,tax_rate,tax_amount,total,payment_method,payment_status,paid_at,note,created_by)
              OUTPUT INSERTED.id
              VALUES (@invoice_code,@order_id,@customer_id,@customer_name,@customer_phone,@customer_addr,
              @subtotal,@discount,@tax_rate,@tax_amount,@total,@payment_method,@payment_status,@paid_at,@note,@created_by)`);
    const invoiceId = result.recordset[0].id;

    // Thêm từng dòng sản phẩm vào hóa đơn
    for (const item of items) {
      await pool.request()
        .input('invoice_id',  sql.Int,      invoiceId)
        .input('phone_id',    sql.Int,      item.phone_id || null)
        .input('phone_name',  sql.NVarChar, item.phone_name)
        .input('phone_brand', sql.NVarChar, item.phone_brand || null)
        .input('quantity',    sql.Int,      item.quantity)
        .input('unit_price',  sql.Decimal(15, 0), item.unit_price)
        .input('subtotal',    sql.Decimal(15, 0), item.unit_price * item.quantity)
        .query(`INSERT INTO invoice_items (invoice_id,phone_id,phone_name,phone_brand,quantity,unit_price,subtotal)
                VALUES (@invoice_id,@phone_id,@phone_name,@phone_brand,@quantity,@unit_price,@subtotal)`);
    }

    // Nếu hóa đơn liên kết đơn hàng → tự động hoàn thành đơn hàng
    if (order_id) {
      await pool.request()
        .input('id', sql.Int, order_id)
        .query(`UPDATE orders SET status='completed', payment_status='paid', updated_at=GETDATE() WHERE id=@id`);
    }

    res.status(201).json({ success: true, message: 'Tạo hóa đơn thành công', id: invoiceId, invoice_code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInvoices, getInvoice, createInvoice };
