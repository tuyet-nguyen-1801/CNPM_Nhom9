/**
 * assets/js/api.js — Lõi giao tiếp Frontend ↔ Backend
 *
 * Module này cung cấp:
 *  1. Auth       — Quản lý phiên đăng nhập nhân viên (token/user trong localStorage)
 *  2. api()      — Hàm fetch wrapper với tự động gắn JWT header
 *  3. GET/POST/PUT/DELETE — Shorthand gọi API
 *  4. toast()    — Hiển thị thông báo nổi (success / error / warning)
 *  5. fmt        — Định dạng tiền tệ, ngày giờ, trạng thái
 *  6. openModal/closeModal — Điều khiển modal overlay
 *  7. navigateTo()         — Điều hướng giữa các trang trong SPA
 *  8. renderPagination()   — Vẽ thanh phân trang tái sử dụng
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

const API_BASE = '/api';

/* ── Quản lý phiên đăng nhập nhân viên ──────────────────────────────────────── */
const Auth = {
  getToken:   () => localStorage.getItem('token'),
  getUser:    () => JSON.parse(localStorage.getItem('user') || 'null'),
  isAdmin:    () => Auth.getUser()?.role === 'admin',
  setSession: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear:      () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isLoggedIn: () => !!Auth.getToken(),
};

/* ── Hàm gọi API trung tâm ───────────────────────────────────────────────────── */
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  // Gắn JWT của nhân viên vào header nếu đã đăng nhập
  const token = Auth.getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);

  const res  = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (res.status === 401) {
    if (Auth.getToken()) {
      // Token đã hết hạn trong khi đang dùng → tự động đăng xuất
      Auth.clear();
      showLoginPage();
      toast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'warning');
      return null;
    }
    // Chưa có session (vd: nhập sai mật khẩu) → ném lỗi để hiển thị thông báo
    throw new Error(data.message || 'Xác thực thất bại');
  }

  if (!data.success) throw new Error(data.message || 'Lỗi không xác định');
  return data;
}

// Shorthand cho các phương thức HTTP phổ biến
const GET    = (path)       => api('GET',    path);
const POST   = (path, body) => api('POST',   path, body);
const PUT    = (path, body) => api('PUT',    path, body);
const DELETE = (path)       => api('DELETE', path);

/* ── Toast thông báo nổi ─────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500); // Tự xóa sau 3.5 giây
}

/* ── Hàm định dạng hiển thị ─────────────────────────────────────────────────── */
const fmt = {
  // Định dạng tiền Việt Nam: 1500000 → "1.500.000 ₫"
  currency: (n) => (n || 0).toLocaleString('vi-VN') + ' ₫',

  // Định dạng ngày giờ theo locale Việt Nam
  date:     (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—',
  datetime: (d) => d ? new Date(d).toLocaleString('vi-VN')     : '—',

  // Trạng thái đơn hàng: mã → [nhãn tiếng Việt, class CSS badge]
  statusOrder: (s) => {
    const map = {
      pending:    ['Chờ xác nhận', 'badge-warning'],
      confirmed:  ['Đã xác nhận',  'badge-info'],
      delivering: ['Đang giao',    'badge-primary'],
      completed:  ['Hoàn thành',   'badge-success'],
      cancelled:  ['Đã hủy',       'badge-danger'],
    };
    return map[s] || [s, 'badge-gray'];
  },

  statusPayment: (s) => {
    const map = { unpaid: ['Chưa thanh toán','badge-warning'], paid: ['Đã thanh toán','badge-success'], refunded: ['Hoàn tiền','badge-gray'] };
    return map[s] || [s, 'badge-gray'];
  },

  statusStock: (s) => {
    if (s === 'Hết hàng') return '<span class="stock-out">Hết hàng</span>';
    if (s === 'Sắp hết')  return '<span class="stock-low">⚠ Sắp hết</span>';
    return '<span class="stock-ok">Còn hàng</span>';
  },

  category:      (c) => ({ flagship: '🏆 Flagship', 'mid-range': '📱 Tầm trung', budget: '💰 Giá rẻ' }[c] || c),
  gender:        (g) => ({ male: 'Nam', female: 'Nữ', other: 'Khác' }[g] || g),
  paymentMethod: (p) => ({ cash: '💵 Tiền mặt', transfer: '🏦 Chuyển khoản', card: '💳 Thẻ' }[p] || p),
};

/* ── Modal helpers ───────────────────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// Click bên ngoài modal để đóng
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

/* ── Hộp thoại xác nhận tùy chỉnh (thay alert/confirm gốc của trình duyệt) ──── */
function confirm2(msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-msg').textContent = msg;
    openModal('confirm-modal');
    document.getElementById('confirm-yes').onclick = () => { closeModal('confirm-modal'); resolve(true); };
    document.getElementById('confirm-no').onclick  = () => { closeModal('confirm-modal'); resolve(false); };
  });
}

/* ── Điều hướng trang trong SPA ──────────────────────────────────────────────── */
function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
}
function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'block';
}

// Chuyển trang: kích hoạt page element + nav item + load dữ liệu
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  const titles = {
    dashboard: '📊 Tổng quan',   phones:    '📱 Quản lý sản phẩm',
    customers: '👥 Khách hàng',  orders:    '🛒 Đơn hàng',
    invoices:  '🧾 Hóa đơn',     inventory: '📦 Kho hàng',
    users:     '👤 Nhân viên',   stats:     '📈 Báo cáo',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;
  window._currentPage = page;
  // Gọi hàm load dữ liệu tương ứng nếu tồn tại (vd: load_phones, load_orders…)
  if (window[`load_${page}`]) window[`load_${page}`]();
}

/* ── Hamburger / Sidebar Mobile ─────────────────────────────────────────────── */
function toggleSidebar() {
  const isOpen = document.getElementById('sidebar').classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
  document.getElementById('hamburger-btn').classList.add('active');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
  document.getElementById('hamburger-btn')?.classList.remove('active');
}

/* ── Phân trang tái sử dụng ──────────────────────────────────────────────────── */
function renderPagination(containerId, total, page, limit, onPage) {
  const totalPages = Math.ceil(total / limit);
  const el = document.getElementById(containerId);
  if (!el) return;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);
  el.innerHTML = `
    <span>Hiển thị ${total > 0 ? start : 0}–${end} / ${total} bản ghi</span>
    <div class="pagination-btns">
      <button class="page-btn" onclick="(${onPage})(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>
      ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
        let p = i + 1;
        if (totalPages > 5) {
          if (page <= 3)                   p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else                             p = page - 2 + i;
        }
        return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="(${onPage})(${p})">${p}</button>`;
      }).join('')}
      <button class="page-btn" onclick="(${onPage})(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>
    </div>
  `;
}
