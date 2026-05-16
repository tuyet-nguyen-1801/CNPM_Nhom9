/**
 * controllers/statsController.js — Thống kê và báo cáo
 *
 * Route:
 *  GET /api/stats/dashboard         — Tổng quan: doanh thu tháng, đơn hàng,
 *                                     top sản phẩm, biểu đồ 6 tháng gần nhất
 *  GET /api/stats/revenue?from=&to= — Doanh thu chi tiết theo ngày (khoảng thời gian)
 *
 * Tất cả truy vấn dashboard chạy song song bằng Promise.all để tối ưu hiệu năng.
 *
 * Người thực hiện: Trần Hữu Minh
 */

const { getPool, sql } = require('../config/db');

// ── GET /api/stats/dashboard ──────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const pool = getPool();

    // Chạy đồng thời 7 truy vấn để giảm thời gian phản hồi
    const [revenue, orders, customers, inventory, topPhones, recentOrders, monthlyRevenue] = await Promise.all([

      // 1. Doanh thu và giảm giá tháng hiện tại (từ bảng invoices đã thanh toán)
      pool.request().query(`
        SELECT ISNULL(SUM(total), 0) AS month_revenue,
               ISNULL(SUM(total - subtotal + discount), 0) AS month_discount
        FROM invoices
        WHERE payment_status = 'paid'
          AND YEAR(paid_at) = YEAR(GETDATE())
          AND MONTH(paid_at) = MONTH(GETDATE())
      `),

      // 2. Số lượng đơn hàng theo từng trạng thái
      pool.request().query(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status='pending'    THEN 1 ELSE 0 END) AS pending,
               SUM(CASE WHEN status='completed'  THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN status='cancelled'  THEN 1 ELSE 0 END) AS cancelled,
               SUM(CASE WHEN status='delivering' THEN 1 ELSE 0 END) AS delivering
        FROM orders
      `),

      // 3. Tổng số khách hàng đang hoạt động
      pool.request().query(`
        SELECT COUNT(*) AS new_customers FROM customers
      `),

      // 4. Số sản phẩm có tồn kho dưới mức cảnh báo
      pool.request().query(`
        SELECT COUNT(*) AS low_stock FROM inventory WHERE quantity <= min_quantity
      `),

      // 5. Top 5 sản phẩm bán chạy nhất (theo số lượng bán)
      pool.request().query(`
        SELECT TOP 5 p.name, p.brand, SUM(ii.quantity) AS total_sold, SUM(ii.subtotal) AS total_revenue
        FROM invoice_items ii JOIN phones p ON p.id = ii.phone_id
        JOIN invoices i ON i.id = ii.invoice_id AND i.payment_status = 'paid'
        GROUP BY p.name, p.brand ORDER BY total_sold DESC
      `),

      // 6. 10 đơn hàng gần nhất để hiển thị trên dashboard
      pool.request().query(`
        SELECT TOP 10 o.order_code, o.customer_name, o.final_amount, o.status, o.created_at
        FROM orders o ORDER BY o.id DESC
      `),

      // 7. Doanh thu 6 tháng gần nhất để vẽ biểu đồ cột
      pool.request().query(`
        SELECT TOP 6 YEAR(paid_at) AS nam, MONTH(paid_at) AS thang,
               SUM(total) AS doanh_thu, COUNT(*) AS so_hoa_don
        FROM invoices WHERE payment_status = 'paid'
        GROUP BY YEAR(paid_at), MONTH(paid_at)
        ORDER BY nam DESC, thang DESC
      `),
    ]);

    res.json({
      success: true,
      data: {
        revenue:         revenue.recordset[0],
        orders:          orders.recordset[0],
        new_customers:   customers.recordset[0].new_customers,
        low_stock:       inventory.recordset[0].low_stock,
        top_phones:      topPhones.recordset,
        recent_orders:   recentOrders.recordset,
        monthly_revenue: monthlyRevenue.recordset.reverse(), // Sắp xếp tăng dần theo tháng
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/stats/revenue?from=&to= ─────────────────────────────────────────
const getRevenue = async (req, res) => {
  const { from, to } = req.query;
  // Mặc định từ đầu năm đến hôm nay nếu không truyền tham số
  const dateFrom = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const dateTo   = to   || new Date().toISOString().slice(0, 10);
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('from', sql.Date, dateFrom)
      .input('to',   sql.Date, dateTo)
      .query(`
        SELECT YEAR(paid_at) AS nam, MONTH(paid_at) AS thang, DAY(paid_at) AS ngay,
               COUNT(*) AS so_hoa_don, SUM(total) AS doanh_thu,
               SUM(subtotal - discount) AS doanh_thu_truoc_thue
        FROM invoices
        WHERE payment_status = 'paid' AND CAST(paid_at AS DATE) BETWEEN @from AND @to
        GROUP BY YEAR(paid_at), MONTH(paid_at), DAY(paid_at)
        ORDER BY nam, thang, ngay
      `);
    res.json({ success: true, data: result.recordset, from: dateFrom, to: dateTo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard, getRevenue };
