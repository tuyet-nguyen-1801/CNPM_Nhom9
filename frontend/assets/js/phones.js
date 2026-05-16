/**
 * assets/js/phones.js — Quản lý sản phẩm điện thoại (trang Phones)
 *
 * Chức năng:
 *  - Hiển thị danh sách điện thoại dạng bảng, có lọc theo hãng/phân khúc
 *  - Tìm kiếm theo tên với debounce 400ms (tránh gọi API liên tục)
 *  - Xem chi tiết sản phẩm (modal)
 *  - Thêm / Sửa / Ẩn sản phẩm (chỉ Admin)
 *  - Nút "Thêm vào giỏ" trên mỗi dòng sản phẩm (gọi cartAdd từ cart.js)
 *
 * Hàm load_phones() được tự động gọi khi chuyển sang trang Phones.
 *
 * Người thực hiện: Lê Đức Đồng
 */

// Biến trạng thái phân trang và bộ lọc hiện tại
let phonePage = 1, phoneSearch = '', phoneBrand = '', phoneCategory = '';

/* ── Tải trang đầu tiên ──────────────────────────────────────────────────────── */
async function load_phones() {
  phonePage = 1;
  await fetchPhones();
}

/* ── Gọi API lấy danh sách điện thoại theo bộ lọc hiện tại ─────────────────── */
async function fetchPhones() {
  const tbody = document.getElementById('phones-tbody');
  tbody.innerHTML = `<tr><td colspan="8"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: phonePage, limit: 15 });
    if (phoneSearch)   params.set('search',   phoneSearch);
    if (phoneBrand)    params.set('brand',     phoneBrand);
    if (phoneCategory) params.set('category', phoneCategory);
    const res = await GET(`/phones?${params}`);
    if (!res) return;
    renderPhonesTable(res.data);
    renderPagination('phones-pagination', res.total, phonePage, 15, `p => { phonePage = p; fetchPhones(); }`);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-icon">❌</div><p>${err.message}</p></td></tr>`;
  }
}

/* ── Vẽ bảng danh sách sản phẩm ─────────────────────────────────────────────── */
function renderPhonesTable(phones) {
  const tbody   = document.getElementById('phones-tbody');
  if (!phones.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📱</div><p>Không có sản phẩm nào</p></div></td></tr>`;
    return;
  }
  const isAdmin = Auth.isAdmin();
  tbody.innerHTML = phones.map(p => {
    // Màu sắc tồn kho: đỏ = hết, vàng = sắp hết (≤5), xanh = còn hàng
    const stockClass = p.stock === 0 ? 'stock-out' : (p.stock <= 5 ? 'stock-low' : 'stock-ok');
    return `
      <tr>
        <td><img src="${p.image || 'https://placehold.co/48x48/e5e7eb/9ca3af?text=📱'}" class="phone-img" onerror="this.src='https://placehold.co/48x48/e5e7eb/9ca3af?text=📱'"></td>
        <td>
          <div style="font-weight:700">${p.name}</div>
          <div style="font-size:12px;color:var(--gray-400)">${p.brand} • ${p.model || ''}</div>
        </td>
        <td>${fmt.category(p.category)}</td>
        <td style="font-weight:700;color:var(--primary)">${fmt.currency(p.price)}</td>
        <td style="color:var(--gray-500)">${fmt.currency(p.import_price)}</td>
        <td><span class="${stockClass}">${p.stock ?? '—'}</span></td>
        <td><span class="badge ${p.is_active ? 'badge-success' : 'badge-danger'}">${p.is_active ? 'Hoạt động' : 'Ẩn'}</span></td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm btn-icon" onclick="viewPhone(${p.id})" title="Xem chi tiết">👁</button>
            ${p.stock > 0 && p.is_active
              ? `<button class="btn btn-success btn-sm" onclick="cartAdd(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price},'${p.image||''}',${p.stock})" title="Thêm vào giỏ" style="gap:4px">🛒</button>`
              : ''}
            ${isAdmin ? `
              <button class="btn btn-primary btn-sm btn-icon" onclick="editPhone(${p.id})" title="Sửa">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deletePhone(${p.id},'${p.name}')" title="Xóa">🗑</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── Sự kiện tìm kiếm và bộ lọc ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Debounce tìm kiếm: chờ 400ms sau khi người dùng ngừng gõ mới gọi API
  document.getElementById('phone-search')?.addEventListener('input', debounce(e => {
    phoneSearch = e.target.value; phonePage = 1; fetchPhones();
  }, 400));
  document.getElementById('phone-brand-filter')?.addEventListener('change', e => {
    phoneBrand = e.target.value; phonePage = 1; fetchPhones();
  });
  document.getElementById('phone-cat-filter')?.addEventListener('change', e => {
    phoneCategory = e.target.value; phonePage = 1; fetchPhones();
  });
});

/* ── Hàm debounce: trì hoãn thực thi sau khoảng thời gian delay ─────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Xem chi tiết sản phẩm ───────────────────────────────────────────────────── */
async function viewPhone(id) {
  try {
    const res = await GET(`/phones/${id}`);
    const p   = res.data;
    document.getElementById('phone-detail-content').innerHTML = `
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <img src="${p.image || 'https://placehold.co/200x200/e5e7eb/9ca3af?text=📱'}"
             style="width:180px;height:180px;object-fit:cover;border-radius:12px;border:1px solid var(--gray-200)">
        <div style="flex:1;min-width:200px">
          <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">${p.name}</h2>
          <p style="color:var(--gray-500);margin-bottom:12px">${p.brand} ${p.model ? '• ' + p.model : ''}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
            ${infoRow('💰 Giá bán',   fmt.currency(p.price))}
            ${infoRow('📥 Giá nhập',  fmt.currency(p.import_price))}
            ${infoRow('📦 Tồn kho',   p.stock + ' máy')}
            ${infoRow('🛡 Bảo hành',  p.warranty + ' tháng')}
            ${infoRow('📂 Phân khúc', fmt.category(p.category))}
            ${infoRow('✅ Trạng thái', p.is_active ? 'Hoạt động' : 'Ẩn')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${p.ram     ? infoRow('💾 RAM',          p.ram)     : ''}
            ${p.storage ? infoRow('💿 Bộ nhớ',       p.storage) : ''}
            ${p.screen  ? infoRow('📺 Màn hình',     p.screen)  : ''}
            ${p.battery ? infoRow('🔋 Pin',           p.battery) : ''}
            ${p.camera  ? infoRow('📸 Camera',        p.camera)  : ''}
            ${p.os      ? infoRow('⚙️ Hệ điều hành', p.os)      : ''}
            ${p.chip    ? infoRow('🔧 Chip',           p.chip)    : ''}
            ${p.sim     ? infoRow('📡 SIM',            p.sim)     : ''}
            ${p.colors  ? infoRow('🎨 Màu sắc',       p.colors)  : ''}
          </div>
          ${p.description ? `<p style="margin-top:12px;color:var(--gray-600);font-size:13px">${p.description}</p>` : ''}
        </div>
      </div>
    `;
    openModal('phone-detail-modal');
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Hàm tái sử dụng tạo ô thông tin 2 dòng (nhãn + giá trị) ────────────────── */
function infoRow(label, value) {
  return `<div style="background:var(--gray-50);padding:8px 12px;border-radius:6px">
    <div style="font-size:11px;color:var(--gray-500)">${label}</div>
    <div style="font-weight:700;font-size:13px">${value}</div>
  </div>`;
}

/* ── Mở form thêm sản phẩm mới ───────────────────────────────────────────────── */
function openAddPhone() {
  document.getElementById('phone-form-title').textContent = '➕ Thêm sản phẩm mới';
  document.getElementById('phone-form').reset();
  document.getElementById('phone-edit-id').value = '';
  openModal('phone-form-modal');
}

/* ── Mở form sửa sản phẩm (điền sẵn dữ liệu) ────────────────────────────────── */
async function editPhone(id) {
  try {
    const res = await GET(`/phones/${id}`);
    const p   = res.data;
    document.getElementById('phone-form-title').textContent = '✏️ Cập nhật sản phẩm';
    document.getElementById('phone-edit-id').value = p.id;
    const fields = ['name','brand','model','category','price','import_price','description','image',
                    'ram','storage','screen','battery','camera','os','chip','sim','colors','warranty','is_active'];
    fields.forEach(f => {
      const el = document.getElementById(`pf-${f}`);
      if (el) el.value = p[f] ?? '';
    });
    openModal('phone-form-modal');
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Lưu sản phẩm (thêm mới hoặc cập nhật) ──────────────────────────────────── */
async function savePhone() {
  const id     = document.getElementById('phone-edit-id').value;
  const fields = ['name','brand','model','category','price','import_price','description','image',
                  'ram','storage','screen','battery','camera','os','chip','sim','colors','warranty','is_active'];
  const body   = {};
  fields.forEach(f => {
    const el = document.getElementById(`pf-${f}`);
    if (el) body[f] = el.type === 'number' ? Number(el.value) : (el.type === 'checkbox' ? el.checked : el.value);
  });
  if (!body.name || !body.brand || !body.price)
    return toast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
  try {
    if (id) {
      await PUT(`/phones/${id}`, body);
      toast('Cập nhật sản phẩm thành công');
    } else {
      // Khi thêm mới, lấy thêm trường stock (số lượng ban đầu trong kho)
      const stockEl = document.getElementById('pf-stock');
      if (stockEl) body.stock = Number(stockEl.value) || 0;
      await POST('/phones', body);
      toast('Thêm sản phẩm thành công');
    }
    closeModal('phone-form-modal');
    fetchPhones();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Ẩn sản phẩm (xóa mềm) ──────────────────────────────────────────────────── */
async function deletePhone(id, name) {
  const ok = await confirm2(`Bạn có chắc muốn ẩn sản phẩm "${name}"?`);
  if (!ok) return;
  try {
    await DELETE(`/phones/${id}`);
    toast('Đã ẩn sản phẩm');
    fetchPhones();
  } catch (err) { toast(err.message, 'error'); }
}
