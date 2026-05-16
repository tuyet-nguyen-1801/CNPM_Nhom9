/**
 * assets/js/pages.js — Các trang quản lý nội bộ (dành cho nhân viên)
 *
 * File này chứa logic UI cho 6 trang:
 *
 *  👥 CUSTOMERS  — Danh sách, thêm/sửa/xóa khách hàng
 *  📦 INVENTORY  — Tổng quan kho, nhập hàng, điều chỉnh tồn kho
 *  🛒 ORDERS     — Danh sách đơn hàng, tạo đơn, cập nhật trạng thái
 *  🧾 INVOICES   — Danh sách hóa đơn, xem chi tiết
 *  👤 USERS      — Quản lý tài khoản nhân viên (Admin only)
 *  📈 STATS      — Báo cáo doanh thu theo khoảng thời gian
 *
 * Mỗi trang có hàm load_<page>() được tự động gọi bởi navigateTo() trong api.js.
 *
 * Người thực hiện: Trần Hữu Minh
 */

/* ===========================
   👥 CUSTOMERS — Quản lý khách hàng
=========================== */
let custPage = 1, custSearch = '';

async function load_customers() { custPage = 1; await fetchCustomers(); }

/* ── Tải danh sách khách hàng ────────────────────────────────────────────────── */
async function fetchCustomers() {
  const tbody = document.getElementById('customers-tbody');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: custPage, limit: 15 });
    if (custSearch) params.set('search', custSearch);
    const res = await GET(`/customers?${params}`);
    if (!res) return;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><p>Không tìm thấy khách hàng</p></div></td></tr>`;
    } else {
      const isAdmin = Auth.isAdmin();
      tbody.innerHTML = res.data.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>${c.email || '—'}</td>
          <td>${fmt.gender(c.gender)}</td>
          <td>${c.address || '—'}</td>
          <td><span class="badge badge-primary">${c.total_orders} đơn</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-primary btn-sm btn-icon" onclick="editCustomer(${c.id})">✏️</button>
              ${isAdmin ? `<button class="btn btn-danger btn-sm btn-icon" onclick="deleteCustomer(${c.id},'${c.name}')">🗑</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }
    renderPagination('customers-pagination', res.total, custPage, 15, 'changeCustPage');
  } catch (err) { toast(err.message, 'error'); }
}

// Lắng nghe sự kiện tìm kiếm khách hàng với debounce 400ms
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('customer-search')?.addEventListener('input', (e => {
    let t; return () => { clearTimeout(t); t = setTimeout(() => { custSearch = e.target.value || document.getElementById('customer-search').value; custPage = 1; fetchCustomers(); }, 400); };
  })());
});

function openAddCustomer() {
  document.getElementById('customer-form-title').textContent = '➕ Thêm khách hàng';
  document.getElementById('customer-form').reset();
  document.getElementById('customer-edit-id').value = '';
  openModal('customer-form-modal');
}

async function editCustomer(id) {
  try {
    const res = await GET(`/customers/${id}`);
    const c   = res.data;
    document.getElementById('customer-form-title').textContent = '✏️ Cập nhật khách hàng';
    document.getElementById('customer-edit-id').value = c.id;
    ['name','phone','email','address','gender','birthday','note'].forEach(f => {
      const el = document.getElementById(`cf-${f}`);
      if (el) el.value = f === 'birthday' && c[f] ? c[f].slice(0,10) : (c[f] ?? '');
    });
    openModal('customer-form-modal');
  } catch (err) { toast(err.message, 'error'); }
}

async function saveCustomer() {
  const id   = document.getElementById('customer-edit-id').value;
  const body = {};
  ['name','phone','email','address','gender','birthday','note'].forEach(f => {
    const el = document.getElementById(`cf-${f}`); if (el) body[f] = el.value;
  });
  if (!body.name || !body.phone) return toast('Tên và số điện thoại là bắt buộc', 'error');
  try {
    id ? await PUT(`/customers/${id}`, body) : await POST('/customers', body);
    toast(id ? 'Cập nhật thành công' : 'Thêm khách hàng thành công');
    closeModal('customer-form-modal'); fetchCustomers();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteCustomer(id, name) {
  if (!await confirm2(`Xóa khách hàng "${name}"?`)) return;
  try { await DELETE(`/customers/${id}`); toast('Đã xóa'); fetchCustomers(); }
  catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   📦 INVENTORY — Quản lý kho hàng
=========================== */
async function load_inventory() {
  const tbody = document.getElementById('inventory-tbody');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const res = await GET('/inventory');
    if (!res) return;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>Kho trống</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(i => `
      <tr>
        <td><strong>${i.name}</strong><br><small>${i.brand}</small></td>
        <td>${fmt.category(i.category)}</td>
        <td style="font-weight:700">${i.quantity}</td>
        <td>${i.min_quantity}</td>
        <td>${i.location || 'Kho chính'}</td>
        <td>${fmt.statusStock(i.status)}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="openImport(${i.phone_id},'${i.name}')">📥 Nhập</button>
            ${Auth.isAdmin() ? `<button class="btn btn-warning btn-sm" onclick="openAdjust(${i.phone_id},'${i.name}',${i.quantity})">🔧 Điều chỉnh</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

function openImport(phoneId, phoneName) {
  document.getElementById('import-phone-id').value   = phoneId;
  document.getElementById('import-phone-name').value = phoneName;
  document.getElementById('import-qty').value  = '';
  document.getElementById('import-note').value = '';
  openModal('import-modal');
}

async function saveImport() {
  const phone_id = document.getElementById('import-phone-id').value;
  const quantity = parseInt(document.getElementById('import-qty').value);
  const note     = document.getElementById('import-note').value;
  if (!quantity || quantity <= 0) return toast('Số lượng phải lớn hơn 0', 'error');
  try {
    await POST('/inventory/import', { phone_id, quantity, note });
    toast('Nhập kho thành công'); closeModal('import-modal'); load_inventory();
  } catch (err) { toast(err.message, 'error'); }
}

function openAdjust(phoneId, phoneName, current) {
  document.getElementById('adjust-phone-id').value   = phoneId;
  document.getElementById('adjust-phone-name').value = phoneName;
  document.getElementById('adjust-qty').value  = current;
  document.getElementById('adjust-note').value = '';
  openModal('adjust-modal');
}

async function saveAdjust() {
  const phone_id    = document.getElementById('adjust-phone-id').value;
  const new_quantity = parseInt(document.getElementById('adjust-qty').value);
  const note        = document.getElementById('adjust-note').value;
  if (new_quantity < 0) return toast('Số lượng không hợp lệ', 'error');
  try {
    await PUT(`/inventory/${phone_id}/adjust`, { new_quantity, note });
    toast('Điều chỉnh tồn kho thành công'); closeModal('adjust-modal'); load_inventory();
  } catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   🛒 ORDERS — Quản lý đơn hàng
=========================== */
let orderPage = 1, orderSearch = '', orderStatus = '';
let orderCart = [], orderPhoneList = []; // Giỏ hàng tạm cho form tạo đơn hàng nội bộ

async function load_orders() { orderPage = 1; await fetchOrders(); }

async function fetchOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = `<tr><td colspan="8"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: orderPage, limit: 15 });
    if (orderSearch) params.set('search', orderSearch);
    if (orderStatus) params.set('status', orderStatus);
    const res = await GET(`/orders?${params}`);
    if (!res) return;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🛒</div><p>Không có đơn hàng</p></div></td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(o => {
        const [slabel, scls] = fmt.statusOrder(o.status);
        const [plabel, pcls] = fmt.statusPayment(o.payment_status);
        return `<tr>
          <td><strong>${o.order_code}</strong></td>
          <td>${o.customer_name}<br><small>${o.customer_phone}</small></td>
          <td>${o.item_count} loại</td>
          <td style="font-weight:700;color:var(--primary)">${fmt.currency(o.final_amount)}</td>
          <td><span class="badge ${scls}">${slabel}</span></td>
          <td><span class="badge ${pcls}">${plabel}</span></td>
          <td>${fmt.datetime(o.created_at)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-outline btn-sm btn-icon" onclick="viewOrder(${o.id})">👁</button>
              <button class="btn btn-primary btn-sm btn-icon" onclick="openUpdateStatus(${o.id},'${o.status}','${o.payment_status}')">🔄</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
    renderPagination('orders-pagination', res.total, orderPage, 15, 'changeOrderPage');
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Xem chi tiết đơn hàng ───────────────────────────────────────────────────── */
async function viewOrder(id) {
  try {
    const res = await GET(`/orders/${id}`);
    const o   = res.data;
    const [slabel, scls] = fmt.statusOrder(o.status);
    const [plabel, pcls] = fmt.statusPayment(o.payment_status);
    document.getElementById('order-detail-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div>
          <div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">Mã đơn hàng</div>
          <div style="font-size:18px;font-weight:800">${o.order_code}</div>
        </div>
        <div style="text-align:right">
          <span class="badge ${scls}" style="font-size:13px">${slabel}</span>
        </div>
        ${infoRow('👤 Khách hàng', o.customer_name)}
        ${infoRow('📞 Điện thoại', o.customer_phone)}
        ${o.customer_email ? infoRow('✉️ Email', o.customer_email) : ''}
        ${o.customer_addr  ? infoRow('📍 Địa chỉ', o.customer_addr) : ''}
        ${infoRow('💳 Thanh toán', fmt.paymentMethod(o.payment_method))}
        ${infoRow('📅 Ngày đặt',   fmt.datetime(o.created_at))}
        ${infoRow('👤 Nhân viên',  o.staff_name || '—')}
      </div>
      <h4 style="margin-bottom:12px">Sản phẩm</h4>
      <div class="table-container">
        <table>
          <thead><tr><th>Tên SP</th><th>Hãng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>${o.items.map(i => `
            <tr><td>${i.phone_name}</td><td>${i.phone_brand||'—'}</td><td>${i.quantity}</td>
            <td>${fmt.currency(i.unit_price)}</td><td style="font-weight:700">${fmt.currency(i.subtotal)}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div class="summary-box" style="margin-top:16px">
        <div class="summary-row"><span>Tổng tiền hàng</span><span>${fmt.currency(o.total_amount)}</span></div>
        <div class="summary-row"><span>Giảm giá</span><span>- ${fmt.currency(o.discount)}</span></div>
        <div class="summary-row total"><span>Thanh toán</span><span style="color:var(--primary)">${fmt.currency(o.final_amount)}</span></div>
      </div>
      ${o.note ? `<p style="margin-top:12px;background:var(--warning-light);padding:10px;border-radius:6px;font-size:13px">📝 ${o.note}</p>` : ''}
    `;
    openModal('order-detail-modal');
  } catch (err) { toast(err.message, 'error'); }
}

function openUpdateStatus(id, status, payStatus) {
  document.getElementById('us-order-id').value = id;
  document.getElementById('us-status').value   = status;
  document.getElementById('us-payment').value  = payStatus;
  openModal('update-status-modal');
}

async function saveOrderStatus() {
  const id             = document.getElementById('us-order-id').value;
  const status         = document.getElementById('us-status').value;
  const payment_status = document.getElementById('us-payment').value;
  try {
    await PUT(`/orders/${id}/status`, { status, payment_status });
    toast('Cập nhật trạng thái thành công'); closeModal('update-status-modal'); fetchOrders();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Tạo đơn hàng nội bộ (nhân viên tạo thay khách) ─────────────────────────── */
async function openCreateOrder() {
  orderCart = [];
  try {
    const res = await GET('/phones?limit=100');
    orderPhoneList = res?.data || [];
    const sel = document.getElementById('order-phone-select');
    sel.innerHTML = `<option value="">-- Chọn sản phẩm --</option>` +
      orderPhoneList.map(p => `<option value="${p.id}" data-price="${p.price}" data-brand="${p.brand}" data-stock="${p.stock||0}">${p.name} (${fmt.currency(p.price)}) - Còn ${p.stock||0}</option>`).join('');
    document.getElementById('order-form').reset();
    renderOrderCart();
    openModal('create-order-modal');
  } catch (err) { toast(err.message, 'error'); }
}

function addToCart() {
  const sel  = document.getElementById('order-phone-select');
  const opt  = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Chọn sản phẩm', 'warning');
  const qty     = parseInt(document.getElementById('order-qty').value) || 1;
  const phoneId = parseInt(opt.value);
  const price   = parseInt(opt.dataset.price);
  const stock   = parseInt(opt.dataset.stock);
  if (qty > stock) return toast(`Chỉ còn ${stock} trong kho`, 'warning');
  const existing = orderCart.find(i => i.phone_id === phoneId);
  if (existing) { existing.quantity += qty; }
  else {
    orderCart.push({ phone_id: phoneId, phone_name: opt.text.split('(')[0].trim(), phone_brand: opt.dataset.brand, quantity: qty, unit_price: price });
  }
  renderOrderCart(); updateOrderTotal();
}

function removeCartItem(idx) { orderCart.splice(idx, 1); renderOrderCart(); updateOrderTotal(); }
function changeCartQty(idx, delta) {
  orderCart[idx].quantity = Math.max(1, orderCart[idx].quantity + delta);
  renderOrderCart(); updateOrderTotal();
}

function renderOrderCart() {
  const el = document.getElementById('order-cart');
  if (!orderCart.length) { el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--gray-400)">Giỏ hàng trống. Chọn sản phẩm bên trên.</div>`; return; }
  el.innerHTML = orderCart.map((item, i) => `
    <div class="cart-item">
      <div style="flex:1">
        <div class="cart-item-name">${item.phone_name}</div>
        <div class="cart-item-price">${fmt.currency(item.unit_price)}</div>
      </div>
      <div class="cart-qty">
        <button onclick="changeCartQty(${i},-1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeCartQty(${i},1)">+</button>
      </div>
      <div class="cart-total" style="min-width:100px;text-align:right">${fmt.currency(item.unit_price * item.quantity)}</div>
      <button class="btn btn-danger btn-sm btn-icon" onclick="removeCartItem(${i})" style="margin-left:8px">✕</button>
    </div>
  `).join('');
}

function updateOrderTotal() {
  const sub  = orderCart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const disc = parseInt(document.getElementById('order-discount').value) || 0;
  document.getElementById('order-subtotal').textContent = fmt.currency(sub);
  document.getElementById('order-final').textContent    = fmt.currency(sub - disc);
}

async function submitOrder() {
  const custName  = document.getElementById('order-cust-name').value.trim();
  const custPhone = document.getElementById('order-cust-phone').value.trim();
  if (!custName || !custPhone) return toast('Vui lòng nhập tên và số điện thoại khách', 'error');
  if (!orderCart.length) return toast('Giỏ hàng trống', 'error');
  const body = {
    customer_name:  custName, customer_phone: custPhone,
    customer_email: document.getElementById('order-cust-email').value,
    customer_addr:  document.getElementById('order-cust-addr').value,
    items:          orderCart,
    discount:       parseInt(document.getElementById('order-discount').value) || 0,
    payment_method: document.getElementById('order-payment').value,
    note:           document.getElementById('order-note').value,
  };
  try {
    const res = await POST('/orders', body);
    toast(`Đặt hàng thành công! Mã: ${res.order_code}`);
    closeModal('create-order-modal'); fetchOrders();
  } catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   🧾 INVOICES — Quản lý hóa đơn
=========================== */
let invPage = 1, invSearch = '', invStatus = '';

async function load_invoices() { invPage = 1; await fetchInvoices(); }

async function fetchInvoices() {
  const tbody = document.getElementById('invoices-tbody');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: invPage, limit: 15 });
    if (invSearch) params.set('search',         invSearch);
    if (invStatus) params.set('payment_status', invStatus);
    const res = await GET(`/invoices?${params}`);
    if (!res) return;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🧾</div><p>Không có hóa đơn</p></div></td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(i => {
        const [plabel, pcls] = fmt.statusPayment(i.payment_status);
        return `<tr>
          <td><strong>${i.invoice_code}</strong></td>
          <td>${i.customer_name}<br><small>${i.customer_phone}</small></td>
          <td>${fmt.currency(i.total)}</td>
          <td>${fmt.paymentMethod(i.payment_method)}</td>
          <td><span class="badge ${pcls}">${plabel}</span></td>
          <td>${fmt.datetime(i.created_at)}</td>
          <td>
            <button class="btn btn-outline btn-sm btn-icon" onclick="viewInvoice(${i.id})">👁</button>
          </td>
        </tr>`;
      }).join('');
    }
    renderPagination('invoices-pagination', res.total, invPage, 15, 'changeInvPage');
  } catch (err) { toast(err.message, 'error'); }
}

async function viewInvoice(id) {
  try {
    const res = await GET(`/invoices/${id}`);
    const inv = res.data;
    const [plabel, pcls] = fmt.statusPayment(inv.payment_status);
    document.getElementById('invoice-detail-content').innerHTML = `
      <div style="border-bottom:2px solid var(--gray-200);padding-bottom:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--primary)">${inv.invoice_code}</div>
            <div style="color:var(--gray-500);font-size:13px">Ngày: ${fmt.datetime(inv.created_at)}</div>
          </div>
          <span class="badge ${pcls}" style="font-size:13px">${plabel}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        ${infoRow('👤 Khách hàng', inv.customer_name)}
        ${infoRow('📞 Điện thoại', inv.customer_phone)}
        ${inv.customer_addr ? infoRow('📍 Địa chỉ', inv.customer_addr) : ''}
        ${infoRow('💳 Thanh toán', fmt.paymentMethod(inv.payment_method))}
        ${inv.paid_at ? infoRow('📅 Ngày thanh toán', fmt.datetime(inv.paid_at)) : ''}
        ${infoRow('👤 Nhân viên', inv.staff_name || '—')}
      </div>
      <h4 style="margin-bottom:12px">Chi tiết sản phẩm</h4>
      <div class="table-container">
        <table>
          <thead><tr><th>Sản phẩm</th><th>Hãng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>${inv.items.map(i => `
            <tr><td>${i.phone_name}</td><td>${i.phone_brand||'—'}</td><td>${i.quantity}</td>
            <td>${fmt.currency(i.unit_price)}</td><td style="font-weight:700">${fmt.currency(i.subtotal)}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div class="summary-box" style="margin-top:16px">
        <div class="summary-row"><span>Tạm tính</span><span>${fmt.currency(inv.subtotal)}</span></div>
        <div class="summary-row"><span>Giảm giá</span><span>- ${fmt.currency(inv.discount)}</span></div>
        ${inv.tax_rate > 0 ? `<div class="summary-row"><span>VAT (${inv.tax_rate}%)</span><span>${fmt.currency(inv.tax_amount)}</span></div>` : ''}
        <div class="summary-row total"><span>Tổng thanh toán</span><span style="color:var(--primary);font-size:18px">${fmt.currency(inv.total)}</span></div>
      </div>
    `;
    openModal('invoice-detail-modal');
  } catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   👤 USERS — Quản lý nhân viên (Admin only)
=========================== */
async function load_users() {
  if (!Auth.isAdmin()) return; // Ẩn trang nếu không phải admin
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const res = await GET('/users');
    if (!res) return;
    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="width:36px;height:36px;font-size:13px">${u.name.charAt(0).toUpperCase()}</div>
            <strong>${u.name}</strong>
          </div>
        </td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role==='admin'?'badge-danger':'badge-primary'}">${u.role==='admin'?'👑 Admin':'👤 Nhân viên'}</span></td>
        <td>${u.phone || '—'}</td>
        <td><span class="badge ${u.is_active?'badge-success':'badge-gray'}">${u.is_active?'Hoạt động':'Bị khóa'}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-primary btn-sm btn-icon" onclick="editUser(${u.id})">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deactivateUser(${u.id},'${u.name}')">🔒</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

function openAddUser() {
  document.getElementById('user-form-title').textContent = '➕ Thêm nhân viên';
  document.getElementById('user-form').reset();
  document.getElementById('user-edit-id').value = '';
  document.getElementById('uf-password').required = true;
  openModal('user-form-modal');
}

async function editUser(id) {
  try {
    const res = await GET(`/users/${id}`);
    const u   = res.data;
    document.getElementById('user-form-title').textContent = '✏️ Cập nhật nhân viên';
    document.getElementById('user-edit-id').value = u.id;
    ['name','email','role','phone','address'].forEach(f => {
      const el = document.getElementById(`uf-${f}`); if (el) el.value = u[f] ?? '';
    });
    document.getElementById('uf-is_active').value    = u.is_active ? '1' : '0';
    document.getElementById('uf-password').required  = false; // Không bắt buộc khi sửa
    openModal('user-form-modal');
  } catch (err) { toast(err.message, 'error'); }
}

async function saveUser() {
  const id   = document.getElementById('user-edit-id').value;
  const body = {};
  ['name','email','password','role','phone','address'].forEach(f => {
    const el = document.getElementById(`uf-${f}`); if (el && el.value) body[f] = el.value;
  });
  body.is_active = document.getElementById('uf-is_active').value === '1' ? 1 : 0;
  if (!body.name || !body.email)     return toast('Tên và email là bắt buộc', 'error');
  if (!id && !body.password)         return toast('Mật khẩu là bắt buộc', 'error');
  try {
    id ? await PUT(`/users/${id}`, body) : await POST('/users', body);
    toast(id ? 'Cập nhật thành công' : 'Thêm nhân viên thành công');
    closeModal('user-form-modal'); load_users();
  } catch (err) { toast(err.message, 'error'); }
}

async function deactivateUser(id, name) {
  if (!await confirm2(`Khóa tài khoản "${name}"?`)) return;
  try { await DELETE(`/users/${id}`); toast('Đã khóa tài khoản'); load_users(); }
  catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   📈 STATS — Báo cáo doanh thu
=========================== */
async function load_stats() {
  try {
    const today = new Date();
    const from  = '2023-01-01';
    const to    = today.toISOString().slice(0,10);
    document.getElementById('stats-from').value = from;
    document.getElementById('stats-to').value   = to;
    await fetchStats();
  } catch (err) { toast(err.message, 'error'); }
}

async function fetchStats() {
  const from = document.getElementById('stats-from').value;
  const to   = document.getElementById('stats-to').value;
  try {
    const res  = await GET(`/stats/revenue?from=${from}&to=${to}`);
    const data = res.data;
    const tbody = document.getElementById('stats-tbody');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Không có dữ liệu</p></div></td></tr>`;
      return;
    }
    let totalRev = 0, totalOrders = 0;
    tbody.innerHTML = data.map(d => {
      totalRev += d.doanh_thu; totalOrders += d.so_hoa_don;
      return `<tr>
        <td>${d.ngay}/${d.thang}/${d.nam}</td>
        <td>${d.so_hoa_don}</td>
        <td style="font-weight:700;color:var(--primary)">${fmt.currency(d.doanh_thu)}</td>
        <td>${fmt.currency(d.doanh_thu_truoc_thue)}</td>
        <td>${d.so_hoa_don > 0 ? fmt.currency(Math.round(d.doanh_thu / d.so_hoa_don)) : '—'}</td>
      </tr>`;
    }).join('');
    document.getElementById('stats-total-rev').textContent    = fmt.currency(totalRev);
    document.getElementById('stats-total-orders').textContent = totalOrders + ' hóa đơn';
    document.getElementById('stats-avg').textContent          = totalOrders > 0 ? fmt.currency(Math.round(totalRev / totalOrders)) : '—';
  } catch (err) { toast(err.message, 'error'); }
}

/* ===========================
   🔢 PAGINATION HELPERS
=========================== */
function changeCustPage(p)  { custPage  = p; fetchCustomers(); }
function changeOrderPage(p) { orderPage = p; fetchOrders(); }
function changeInvPage(p)   { invPage   = p; fetchInvoices(); }
