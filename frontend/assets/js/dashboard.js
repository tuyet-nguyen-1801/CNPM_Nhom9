/**
 * assets/js/dashboard.js — Màn hình tổng quan (Dashboard)
 *
 * Hiển thị:
 *  - 4 thẻ KPI: Doanh thu tháng, Tổng đơn hàng, Khách hàng, Tồn kho thấp
 *  - Biểu đồ cột doanh thu 6 tháng gần nhất (vẽ bằng HTML/CSS thuần, không dùng thư viện)
 *  - Bảng top 5 sản phẩm bán chạy (theo số lượng)
 *  - Bảng 10 đơn hàng gần nhất
 *
 * Hàm load_dashboard() được tự động gọi bởi navigateTo('dashboard') trong api.js.
 *
 * Người thực hiện: Nguyễn Trọng Cường
 */

/* ── Tải và render toàn bộ dữ liệu Dashboard ─────────────────────────────────── */
async function load_dashboard() {
  try {
    const res = await GET('/stats/dashboard');
    if (!res) return;
    const d = res.data;

    // ── KPI Cards ──────────────────────────────────────────────────────────────
    document.getElementById('stat-revenue').textContent   = fmt.currency(d.revenue.month_revenue);
    document.getElementById('stat-orders').textContent    = d.orders.total;
    document.getElementById('stat-customers').textContent = d.new_customers;
    document.getElementById('stat-lowstock').textContent  = d.low_stock;

    // ── Thống kê chi tiết trạng thái đơn hàng ─────────────────────────────────
    document.getElementById('stat-pending').textContent    = d.orders.pending;
    document.getElementById('stat-delivering').textContent = d.orders.delivering;
    document.getElementById('stat-completed').textContent  = d.orders.completed;
    document.getElementById('stat-cancelled').textContent  = d.orders.cancelled;

    // ── Bảng top sản phẩm bán chạy ────────────────────────────────────────────
    const topTbody = document.getElementById('top-phones-body');
    if (d.top_phones.length === 0) {
      topTbody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>Chưa có dữ liệu</p></td></tr>`;
    } else {
      topTbody.innerHTML = d.top_phones.map((p, i) => `
        <tr>
          <td><span style="font-weight:700;color:var(--primary)">#${i+1}</span></td>
          <td><strong>${p.name}</strong><br><small class="text-muted">${p.brand}</small></td>
          <td><span class="badge badge-primary">${p.total_sold} máy</span></td>
          <td style="font-weight:700;color:var(--success)">${fmt.currency(p.total_revenue)}</td>
        </tr>
      `).join('');
    }

    // ── Bảng đơn hàng gần nhất ────────────────────────────────────────────────
    const recentTbody = document.getElementById('recent-orders-body');
    if (d.recent_orders.length === 0) {
      recentTbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>Chưa có đơn hàng</p></td></tr>`;
    } else {
      recentTbody.innerHTML = d.recent_orders.map(o => {
        const [label, cls] = fmt.statusOrder(o.status);
        return `
          <tr>
            <td><strong>${o.order_code}</strong></td>
            <td>${o.customer_name}</td>
            <td style="font-weight:700">${fmt.currency(o.final_amount)}</td>
            <td><span class="badge ${cls}">${label}</span></td>
            <td>${fmt.datetime(o.created_at)}</td>
          </tr>
        `;
      }).join('');
    }

    // ── Biểu đồ doanh thu theo tháng ──────────────────────────────────────────
    renderRevenueChart(d.monthly_revenue);

  } catch (err) {
    toast(err.message, 'error');
  }
}

/**
 * renderRevenueChart — Vẽ biểu đồ cột doanh thu bằng HTML/CSS thuần.
 * Chiều cao mỗi cột tỷ lệ với doanh thu so với tháng cao nhất.
 * Không cần thư viện Chart.js hay D3.
 */
function renderRevenueChart(data) {
  const container = document.getElementById('revenue-chart');
  if (!container || !data.length) return;
  const max = Math.max(...data.map(d => d.doanh_thu), 1); // Tránh chia cho 0
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:12px;height:180px;padding:0 8px">
      ${data.map(d => {
        const pct   = Math.round((d.doanh_thu / max) * 100);
        const label = `T${d.thang}/${d.nam}`;
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
            <span style="font-size:10px;color:var(--gray-500);font-weight:600">${fmt.currency(d.doanh_thu).replace(' ₫','')}</span>
            <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;height:${Math.max(pct,4)}%;transition:.5s;cursor:pointer"
                 title="${label}: ${fmt.currency(d.doanh_thu)}"></div>
            <span style="font-size:10px;color:var(--gray-500);white-space:nowrap">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
