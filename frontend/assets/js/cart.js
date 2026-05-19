/**
 * assets/js/cart.js — Giỏ hàng, Thanh toán, Cổng Khách hàng
 *
 * File này xử lý toàn bộ trải nghiệm mua sắm của khách hàng:
 *
 *  🛒 CART         — Thêm/xóa/sửa số lượng sản phẩm, lưu vào localStorage
 *  💳 CHECKOUT     — Quy trình 2 bước: Thông tin → Thanh toán (tiền mặt hoặc QR)
 *  🏦 VIETQR       — Tạo mã QR chuyển khoản tự động qua API VietQR.io (MB Bank)
 *  📝 REGISTER     — Form đăng ký tài khoản khách hàng (public, không cần đăng nhập)
 *  🔑 PASSWORD     — Kiểm tra độ mạnh mật khẩu, xác nhận khớp, đổi mật khẩu
 *  👤 CUSTOMER PORTAL — Trang mua sắm riêng cho khách: xem SP, đặt hàng, lịch sử
 *
 * Token:
 *  - Nhân viên   → localStorage['token']          (JWT role: admin/user)
 *  - Khách hàng  → localStorage['customer_token'] (JWT type: customer)
 *  - getActiveToken() tự chọn token đúng theo ngữ cảnh hiện tại
 *
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 */

// Trạng thái giỏ hàng — lưu bền vững trong localStorage với key 'ps_cart'
let cart = JSON.parse(localStorage.getItem('ps_cart') || '[]');

/* ================================================
   🛒 CART — Quản lý trạng thái giỏ hàng
================================================ */

// Lưu cart vào localStorage và cập nhật badge số lượng
function cartSave() {
  localStorage.setItem('ps_cart', JSON.stringify(cart));
  cartUpdateBadge();
}

// Tổng số lượng sản phẩm trong giỏ
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

// Tổng tiền hàng chưa giảm giá
function cartSubtotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }

// Cập nhật số lượng hiển thị trên badge (cả topbar nhân viên và portal khách hàng)
function cartUpdateBadge() {
  const n   = cartCount();
  const txt = n > 99 ? '99+' : n;
  ['cart-badge', 'cart-badge-portal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    el.classList.toggle('show', n > 0); // Ẩn badge khi giỏ trống
  });
}

/* ── Thêm sản phẩm vào giỏ ───────────────────────────────────────────────────── */
function cartAdd(id, name, price, image, stock) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    if (existing.qty >= stock) { toast('Đã đạt tối đa tồn kho!', 'warning'); return; }
    existing.qty++;
  } else {
    cart.push({ id, name, price, image, stock, qty: 1 });
  }
  cartSave();
  renderCartDrawer();
  toast(`Đã thêm "${name}" vào giỏ hàng`, 'success');
}

/* ── Xóa sản phẩm khỏi giỏ ──────────────────────────────────────────────────── */
function cartRemove(id) {
  cart = cart.filter(i => i.id !== id);
  cartSave();
  renderCartDrawer();
}

/* ── Cập nhật số lượng sản phẩm ─────────────────────────────────────────────── */
function cartSetQty(id, qty) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  if (qty <= 0)        { cartRemove(id); return; }
  if (qty > item.stock){ toast('Vượt quá tồn kho!', 'warning'); return; }
  item.qty = qty;
  cartSave();
  renderCartDrawer();
}

/* ── Xóa toàn bộ giỏ hàng ───────────────────────────────────────────────────── */
function cartClear() {
  cart = [];
  cartSave();
  renderCartDrawer();
}

/* ── Mở / Đóng ngăn kéo giỏ hàng ────────────────────────────────────────────── */
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('show');
  renderCartDrawer();
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('show');
}

/* ── Vẽ nội dung ngăn kéo giỏ hàng ──────────────────────────────────────────── */
function renderCartDrawer() {
  const body   = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:56px;margin-bottom:12px">🛒</div>
        <p style="font-weight:600;font-size:15px">Giỏ hàng trống</p>
        <p style="font-size:12px;margin-top:6px;color:var(--gray-400)">Thêm sản phẩm để bắt đầu</p>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  body.innerHTML = cart.map(item => `
    <div class="cart-drawer-item">
      <img class="cart-item-img"
        src="${item.image || ''}"
        onerror="this.style.display='none';this.nextSibling.style.display='flex'"
        alt="">
      <div class="cart-item-img-fallback" style="display:none;width:52px;height:52px;background:var(--gray-100);border-radius:8px;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📱</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmt.currency(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="cartSetQty(${item.id},${item.qty - 1})">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="cartSetQty(${item.id},${item.qty + 1})">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-left:8px">
        <span class="cart-item-total">${fmt.currency(item.price * item.qty)}</span>
        <button class="remove-item-btn" onclick="cartRemove(${item.id})" title="Xóa khỏi giỏ">🗑</button>
      </div>
    </div>
  `).join('');

  document.getElementById('cart-total-amount').textContent = fmt.currency(cartSubtotal());
}

/* ================================================
   💳 CHECKOUT — Thanh toán 2 bước
   Bước 1: Nhập thông tin khách hàng
   Bước 2: Chọn phương thức (tiền mặt / QR chuyển khoản)
================================================ */
function openCheckout() {
  if (!cart.length) { toast('Giỏ hàng trống!', 'warning'); return; }
  closeCart();
  showCheckoutStep(1);
  renderCheckoutSummary();
  document.getElementById('checkout-discount').value = '0';
  updateCheckoutFinal();

  // Tự điền thông tin nếu khách hàng đã đăng nhập qua portal
  const cUser = JSON.parse(localStorage.getItem('customer_user') || 'null');
  if (cUser) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && !el.value) el.value = v || ''; };
    set('co-name',  cUser.name);
    set('co-phone', cUser.phone);
    set('co-email', cUser.email);
    set('co-addr',  cUser.address);
  }

  openModal('checkout-modal');
}

/* ── Chuyển đổi step 1 ↔ 2, cập nhật thanh tiến trình và nút hành động ───────── */
function showCheckoutStep(n) {
  document.getElementById('co-step-1').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('co-step-2').style.display = n === 2 ? 'block' : 'none';
  [1, 2].forEach(i => {
    const el = document.getElementById(`co-step-dot-${i}`);
    if (!el) return;
    el.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
  });
  const line = document.getElementById('co-step-line');
  if (line) line.className = 'step-line' + (n > 1 ? ' done' : '');
  const nextBtn    = document.getElementById('co-next-btn');
  const backBtn    = document.getElementById('co-back-btn');
  const confirmBtn = document.getElementById('btn-confirm-checkout');
  if (nextBtn)    nextBtn.style.display    = n === 1 ? 'inline-flex' : 'none';
  if (backBtn)    backBtn.style.display    = n === 2 ? 'inline-flex' : 'none';
  if (confirmBtn) confirmBtn.style.display = n === 2 ? 'inline-flex' : 'none';
}

/* ── Hiển thị tóm tắt đơn hàng ──────────────────────────────────────────────── */
function renderCheckoutSummary() {
  const el = document.getElementById('co-summary-items');
  if (!el) return;
  el.innerHTML = cart.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
      <span style="flex:1;font-size:13px;font-weight:600">${item.name}</span>
      <span style="font-size:12px;color:var(--gray-500)">×${item.qty}</span>
      <span style="font-size:13px;font-weight:700;color:var(--primary)">${fmt.currency(item.price * item.qty)}</span>
    </div>
  `).join('');
  const subEl = document.getElementById('co-subtotal-show');
  if (subEl) subEl.textContent = fmt.currency(cartSubtotal());
}

/* ── Cập nhật tổng tiền khi thay đổi giảm giá ───────────────────────────────── */
function updateCheckoutFinal() {
  const disc  = parseInt(document.getElementById('checkout-discount').value) || 0;
  const final = Math.max(0, cartSubtotal() - disc);
  document.getElementById('checkout-final-amount').textContent = fmt.currency(final);
  const discShow = document.getElementById('co-disc-show');
  if (discShow) discShow.textContent = fmt.currency(disc);
}

/* ── Chuyển sang bước thanh toán (validate trước khi chuyển) ─────────────────── */
async function goToPaymentStep() {
  const name  = document.getElementById('co-name').value.trim();
  const phone = document.getElementById('co-phone').value.trim();
  if (!name || !phone) { toast('Vui lòng nhập tên và số điện thoại!', 'warning'); return; }

  const method   = document.getElementById('co-payment').value;
  const disc     = parseInt(document.getElementById('checkout-discount').value) || 0;
  const finalAmt = Math.max(0, cartSubtotal() - disc);
  const orderId  = 'DH' + Date.now().toString().slice(-6);

  document.getElementById('co-order-ref').textContent  = orderId;
  document.getElementById('co-pay-amount').textContent = fmt.currency(finalAmt);

  if (method === 'transfer') {
    // Hiển thị mã QR VietQR để chuyển khoản
    document.getElementById('co-qr-section').style.display   = 'block';
    document.getElementById('co-cash-section').style.display = 'none';
    renderVietQR(finalAmt, `PhoneStore ${orderId}`);
  } else {
    // Hiển thị hướng dẫn thanh toán tiền mặt
    document.getElementById('co-qr-section').style.display   = 'none';
    document.getElementById('co-cash-section').style.display = 'block';
    const el2 = document.getElementById('co-pay-amount-2');
    if (el2) el2.textContent = fmt.currency(finalAmt);
  }

  showCheckoutStep(2);
}

/* ── Tạo mã QR chuyển khoản bằng VietQR API ─────────────────────────────────── */
// API hoàn toàn miễn phí, không cần API key, chỉ cần URL đúng định dạng
function renderVietQR(amount, info) {
  const bankId      = 'MB';
  const accountNo   = '0329841356';
  const accountName = 'PHONESTORE';
  const url = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(accountName)}`;
  document.getElementById('qr-img').src                  = url;
  document.getElementById('qr-bank-name').textContent    = 'MB Bank (MBBank)';
  document.getElementById('qr-account-no').textContent   = accountNo;
  document.getElementById('qr-account-name').textContent = accountName;
  document.getElementById('qr-content').textContent      = info;
  document.getElementById('qr-amount-text').textContent  = fmt.currency(amount);
}

/* ── Xác nhận đặt hàng — gửi lên server ─────────────────────────────────────── */
async function confirmCheckout() {
  const btn = document.getElementById('btn-confirm-checkout');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span> Đang xử lý...';

  try {
    const body = {
      customer_name:  document.getElementById('co-name').value.trim(),
      customer_phone: document.getElementById('co-phone').value.trim(),
      customer_email: document.getElementById('co-email').value.trim(),
      customer_addr:  document.getElementById('co-addr').value.trim(),
      payment_method: document.getElementById('co-payment').value,
      discount:       parseInt(document.getElementById('checkout-discount').value) || 0,
      note:           document.getElementById('co-note').value.trim(),
      items:          cart.map(i => ({ phone_id: i.id, quantity: i.qty, unit_price: i.price })),
    };
    // Dùng getActiveToken() để chọn đúng token (khách hàng hoặc nhân viên)
    const token = getActiveToken();
    const fetchRes = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const res = await fetchRes.json();
    if (!res.success) throw new Error(res.message || 'Lỗi đặt hàng');
    cartClear();
    closeModal('checkout-modal');
    toast(`Đặt hàng thành công! Mã đơn: ${res.order_code}`, 'success');
    if (window._currentPage === 'orders') fetchOrders();
    const portalOrders = document.getElementById('portal-orders');
    if (portalOrders?.classList.contains('active')) loadPortalOrders();
  } catch (err) {
    toast(err.message || 'Lỗi khi đặt hàng', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✅ Xác nhận đặt hàng';
  }
}

/* ================================================
   📝 CUSTOMER REGISTRATION — Đăng ký tài khoản khách hàng
================================================ */
function openRegister() {
  document.getElementById('register-form').reset();
  document.getElementById('register-error').style.display = 'none';
  openModal('register-modal');
}

async function submitRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const address  = document.getElementById('reg-address').value.trim();
  const gender   = document.getElementById('reg-gender').value;
  const birthday = document.getElementById('reg-birthday').value;
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-password-confirm').value;

  const errEl = document.getElementById('register-error');
  errEl.style.display = 'none';

  // Validate phía client trước khi gửi lên server
  if (!name || !phone)                  { errEl.textContent = 'Vui lòng nhập họ tên và số điện thoại!'; errEl.style.display = 'block'; return; }
  if (!password || password.length < 6) { errEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';   errEl.style.display = 'block'; return; }
  if (password !== confirm)              { errEl.textContent = 'Mật khẩu xác nhận không khớp!';        errEl.style.display = 'block'; return; }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Đang đăng ký...';

  try {
    const res = await fetch('/api/customers/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, phone, email, address, gender, birthday, password }),
    });
    const data = await res.json();
    if (!data.success) { errEl.textContent = data.message; errEl.style.display = 'block'; return; }

    closeModal('register-modal');
    document.getElementById('register-form').reset();
    document.getElementById('reg-pwd-strength').style.display = 'none';
    document.getElementById('reg-match-msg').textContent = '';
    const successBanner = document.getElementById('register-success-banner');
    if (successBanner) { successBanner.style.display = 'block'; setTimeout(() => { successBanner.style.display = 'none'; }, 6000); }
    toast('Đăng ký thành công! Chào mừng bạn đến với PhoneStore!', 'success');
  } catch (err) {
    errEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '📝 Đăng ký ngay';
  }
}

/* ================================================
   🔑 PASSWORD UTILITIES
================================================ */

// Hiện/ẩn mật khẩu khi bấm nút mắt
function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

// Kiểm tra độ mạnh mật khẩu: tính điểm dựa trên độ dài, chữ hoa, số, ký tự đặc biệt
function checkPwdStrength(input, strengthId) {
  const val   = input.value;
  const wrap  = document.getElementById(strengthId);
  const fill  = document.getElementById(strengthId.replace('strength', 'fill'));
  const label = document.getElementById(strengthId.replace('strength', 'label'));
  if (!wrap) return;

  if (!val) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  let score = 0;
  if (val.length >= 6)               score++;
  if (val.length >= 10)              score++;
  if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score++;
  if (/[^a-zA-Z0-9]/.test(val))     score++;

  const levels = [
    { cls: 'weak',   text: '🔴 Yếu — cần ít nhất 6 ký tự' },
    { cls: 'weak',   text: '🔴 Yếu' },
    { cls: 'medium', text: '🟡 Trung bình' },
    { cls: 'strong', text: '🟢 Mạnh' },
  ];
  const lvl = levels[Math.min(score, 3)];
  fill.className  = `pwd-strength-fill ${lvl.cls}`;
  label.className = `pwd-strength-label ${lvl.cls}`;
  label.textContent = lvl.text;
}

// Kiểm tra 2 ô mật khẩu có khớp nhau không
function checkPwdMatch(pwdId, confirmId, msgId) {
  const pwd     = document.getElementById(pwdId)?.value;
  const confirm = document.getElementById(confirmId)?.value;
  const msg     = document.getElementById(msgId);
  if (!msg || !confirm) return;
  if (pwd === confirm) {
    msg.textContent = '✅ Mật khẩu khớp';
    msg.style.color = 'var(--success)';
  } else {
    msg.textContent = '❌ Mật khẩu không khớp';
    msg.style.color = 'var(--danger)';
  }
}

/* ================================================
   🔄 CHANGE PASSWORD — Đổi mật khẩu khách hàng
================================================ */
function openChangePassword() {
  document.getElementById('change-pwd-form').reset();
  document.getElementById('change-pwd-error').style.display   = 'none';
  document.getElementById('change-pwd-success').style.display = 'none';
  document.getElementById('cpwd-strength').style.display      = 'none';
  document.getElementById('cpwd-match-msg').textContent       = '';
  openModal('change-pwd-modal');
}

async function submitChangePassword() {
  const phone        = document.getElementById('cpwd-phone').value.trim();
  const old_password = document.getElementById('cpwd-old').value;
  const new_password = document.getElementById('cpwd-new').value;
  const confirm      = document.getElementById('cpwd-confirm').value;

  const errEl     = document.getElementById('change-pwd-error');
  const successEl = document.getElementById('change-pwd-success');
  errEl.style.display     = 'none';
  successEl.style.display = 'none';

  if (!phone || !old_password || !new_password) { errEl.textContent = 'Vui lòng điền đầy đủ tất cả các trường!'; errEl.style.display = 'block'; return; }
  if (new_password.length < 6)   { errEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự!'; errEl.style.display = 'block'; return; }
  if (new_password !== confirm)  { errEl.textContent = 'Mật khẩu mới và xác nhận không khớp!'; errEl.style.display = 'block'; return; }

  const btn = document.getElementById('btn-change-pwd');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    const res = await fetch('/api/customers/change-password', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, old_password, new_password }),
    });
    const data = await res.json();
    if (!data.success) { errEl.textContent = data.message; errEl.style.display = 'block'; return; }

    document.getElementById('change-pwd-form').reset();
    document.getElementById('cpwd-strength').style.display = 'none';
    document.getElementById('cpwd-match-msg').textContent  = '';
    successEl.style.display = 'block';
    toast('Đổi mật khẩu thành công!', 'success');
  } catch (err) {
    errEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔑 Đổi mật khẩu';
  }
}

/* ================================================
   🔐 TOKEN HELPER
   Trả về token đúng theo ngữ cảnh:
   - Khi portal khách hàng đang hiển thị → customer_token
   - Khi màn hình nhân viên → staff token
================================================ */
function getActiveToken() {
  const cToken = localStorage.getItem('customer_token');
  if (cToken && document.getElementById('customer-portal')?.style.display !== 'none') return cToken;
  return Auth.getToken();
}

/* ================================================
   🔄 LOGIN TAB SWITCH — Chuyển tab Nhân viên / Khách hàng
================================================ */
function switchLoginTab(tab) {
  const isStaff = tab === 'staff';
  document.getElementById('staff-login-form').style.display    = isStaff ? 'block' : 'none';
  document.getElementById('customer-login-form').style.display = isStaff ? 'none'  : 'block';
  document.getElementById('tab-staff').classList.toggle('active', isStaff);
  document.getElementById('tab-customer').classList.toggle('active', !isStaff);
  document.getElementById('login-error').style.display  = 'none';
  document.getElementById('clogin-error').style.display = 'none';
}

/* ================================================
   👤 CUSTOMER LOGIN — Đăng nhập khách hàng qua SĐT + mật khẩu
================================================ */
async function doCustomerLogin() {
  const phone    = document.getElementById('clogin-phone').value.trim();
  const password = document.getElementById('clogin-password').value;
  const errEl    = document.getElementById('clogin-error');
  const btn      = document.getElementById('btn-clogin');
  errEl.style.display = 'none';
  btn.textContent = 'Đang đăng nhập...';
  btn.disabled = true;
  try {
    const res = await fetch('/api/customers/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!data.success) { errEl.textContent = data.message; errEl.style.display = 'block'; return; }

    // Lưu session khách hàng riêng, không ghi đè session nhân viên
    localStorage.setItem('customer_token', data.token);
    localStorage.setItem('customer_user',  JSON.stringify(data.user));
    showCustomerPortal(data.user);
  } catch (err) {
    errEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Đăng nhập →';
    btn.disabled = false;
  }
}

/* ================================================
   🏪 CUSTOMER PORTAL — Giao diện mua sắm dành cho khách
================================================ */
function showCustomerPortal(user) {
  // Ẩn trang đăng nhập và app nhân viên, hiện portal khách hàng
  document.getElementById('login-page').style.display    = 'none';
  document.getElementById('app').style.display           = 'none';
  document.getElementById('customer-portal').style.display = 'block';
  document.getElementById('portal-username').textContent = user.name;

  // Điền thông tin hồ sơ
  document.getElementById('pp-name').value    = user.name    || '';
  document.getElementById('pp-phone').value   = user.phone   || '';
  document.getElementById('pp-email').value   = user.email   || '';
  document.getElementById('pp-gender').value  = { male: 'Nam', female: 'Nữ', other: 'Khác' }[user.gender] || user.gender || '';
  document.getElementById('pp-address').value = user.address || '';

  cartUpdateBadge();
  loadPortalProducts();
  if (typeof chatbotShow === 'function') chatbotShow();
}

/* ================================================
   🛍️ PORTAL PRODUCTS — Danh sách sản phẩm trong portal
================================================ */
let _portalAllProducts = []; // Cache toàn bộ sản phẩm để lọc phía client

async function loadPortalProducts() {
  const grid    = document.getElementById('portal-product-grid');
  const loading = document.getElementById('portal-product-loading');
  if (!grid) return;
  grid.innerHTML = '';
  if (loading) loading.style.display = 'block';
  try {
    const token = localStorage.getItem('customer_token');
    const res   = await fetch('/api/phones?limit=100&page=1', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    // Chỉ hiển thị sản phẩm đang kinh doanh (is_active = true)
    _portalAllProducts = (data.data || []).filter(p => p.is_active);
    renderPortalProducts(_portalAllProducts);
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);padding:20px">${err.message}</p>`;
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// Lọc sản phẩm phía client (không cần gọi API thêm)
function filterPortalProducts() {
  const q     = (document.getElementById('pp-search')?.value || '').toLowerCase();
  const brand = document.getElementById('pp-brand')?.value || '';
  const cat   = document.getElementById('pp-cat')?.value   || '';
  const list  = _portalAllProducts.filter(p => {
    if (brand && p.brand    !== brand) return false;
    if (cat   && p.category !== cat)  return false;
    if (q && !`${p.name} ${p.brand} ${p.model || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  renderPortalProducts(list);
}

// Vẽ lưới sản phẩm dạng card
function renderPortalProducts(products) {
  const grid = document.getElementById('portal-product-grid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray-400)">
      <div style="font-size:48px;margin-bottom:12px">🔍</div>
      <p>Không tìm thấy sản phẩm phù hợp</p></div>`;
    return;
  }
  const catLabel = { flagship: '🏆 Flagship', 'mid-range': '📱 Tầm trung', budget: '💰 Giá rẻ' };
  grid.innerHTML = products.map(p => {
    const stockCls  = p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : 'stock-ok';
    const stockText = p.stock === 0 ? 'Hết hàng' : p.stock <= 5 ? `⚠ Còn ${p.stock}` : `Còn ${p.stock} máy`;
    const imgHtml   = p.image
      ? `<img class="product-card-img" src="${p.image}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${p.name}"><div class="product-card-img-placeholder" style="display:none">📱</div>`
      : `<div class="product-card-img-placeholder">📱</div>`;
    return `
      <div class="product-card" onclick="openPortalProductDetail(${p.id})">
        ${imgHtml}
        <div class="product-card-body">
          <div class="product-card-brand">${p.brand} ${catLabel[p.category] ? '• ' + catLabel[p.category] : ''}</div>
          <div class="product-card-name">${p.name}</div>
          <div class="product-card-price">${(p.price || 0).toLocaleString('vi-VN')} ₫</div>
          <div class="product-card-stock"><span class="${stockCls}">${stockText}</span></div>
          <div class="product-card-footer">
            <button class="btn-add-cart" ${p.stock === 0 ? 'disabled' : ''}
              onclick="event.stopPropagation();portalAddToCart(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price},'${p.image || ''}',${p.stock})">
              🛒 ${p.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Thêm vào giỏ từ portal và mở ngăn kéo
function portalAddToCart(id, name, price, image, stock) {
  cartAdd(id, name, price, image, stock);
  openCart();
}

// Xem chi tiết sản phẩm trong modal (portal)
async function openPortalProductDetail(id) {
  try {
    const token = localStorage.getItem('customer_token');
    const res   = await fetch(`/api/phones/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const p     = data.data;
    const specs = [
      p.ram     && ['💾 RAM',           p.ram],
      p.storage && ['💿 Bộ nhớ',        p.storage],
      p.screen  && ['📺 Màn hình',      p.screen],
      p.battery && ['🔋 Pin',            p.battery],
      p.camera  && ['📸 Camera',         p.camera],
      p.os      && ['⚙️ Hệ điều hành',  p.os],
      p.chip    && ['🔧 Chip',            p.chip],
      p.sim     && ['📡 SIM',             p.sim],
      p.colors  && ['🎨 Màu sắc',        p.colors],
      p.warranty&& ['🛡 Bảo hành',       p.warranty + ' tháng'],
    ].filter(Boolean);
    document.getElementById('portal-product-detail-content').innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div style="flex-shrink:0">
          ${p.image
            ? `<img src="${p.image}" style="width:180px;height:180px;object-fit:cover;border-radius:12px;border:1px solid var(--gray-200)">`
            : `<div style="width:180px;height:180px;background:var(--gray-100);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:64px">📱</div>`}
        </div>
        <div style="flex:1;min-width:200px">
          <p style="font-size:12px;color:var(--gray-400);font-weight:600;text-transform:uppercase;margin-bottom:4px">${p.brand}</p>
          <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">${p.name}</h2>
          <div style="font-size:24px;font-weight:800;color:var(--primary);margin-bottom:12px">${(p.price||0).toLocaleString('vi-VN')} ₫</div>
          ${p.description ? `<p style="font-size:13px;color:var(--gray-600);margin-bottom:12px">${p.description}</p>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
            ${specs.map(([k,v]) => `<div style="background:var(--gray-50);padding:8px 10px;border-radius:6px"><div style="font-size:11px;color:var(--gray-400)">${k}</div><div style="font-weight:700;font-size:13px">${v}</div></div>`).join('')}
          </div>
          ${p.stock > 0
            ? `<button class="btn btn-primary" style="width:100%;justify-content:center;font-size:15px;padding:12px" onclick="portalAddToCart(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price},'${p.image||''}',${p.stock});closeModal('portal-product-detail-modal')">🛒 Thêm vào giỏ hàng</button>`
            : `<button class="btn btn-outline" style="width:100%;justify-content:center" disabled>Hết hàng</button>`}
        </div>
      </div>`;
    openModal('portal-product-detail-modal');
  } catch (err) { toast(err.message, 'error'); }
}

// Chuyển tab trong portal: Mua sắm / Đơn hàng / Tài khoản
function switchPortalTab(tab, btn) {
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.portal-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`portal-${tab}`).classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ── Lịch sử đơn hàng của khách hàng ────────────────────────────────────────── */
async function loadPortalOrders() {
  const tbody = document.getElementById('portal-orders-tbody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>`;
  try {
    const token = localStorage.getItem('customer_token');
    const res   = await fetch('/api/customers/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (!data.data.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📦</div><p>Bạn chưa có đơn hàng nào</p></div></td></tr>`;
      return;
    }
    const statusMap = {
      pending:    '<span class="badge badge-warning">Chờ xác nhận</span>',
      confirmed:  '<span class="badge badge-info">Đã xác nhận</span>',
      delivering: '<span class="badge badge-primary">Đang giao</span>',
      completed:  '<span class="badge badge-success">Hoàn thành</span>',
      cancelled:  '<span class="badge badge-danger">Đã hủy</span>',
    };
    const payMap = {
      unpaid: '<span class="badge badge-warning">Chưa TT</span>',
      paid:   '<span class="badge badge-success">Đã TT</span>',
    };
    tbody.innerHTML = data.data.map(o => `
      <tr>
        <td><strong style="font-family:monospace">${o.order_code}</strong></td>
        <td style="text-align:center">${o.item_count} SP</td>
        <td style="font-weight:700;color:var(--primary)">${(o.final_amount||0).toLocaleString('vi-VN')} ₫</td>
        <td>${statusMap[o.status]     || o.status}</td>
        <td>${payMap[o.payment_status]|| o.payment_status}</td>
        <td style="color:var(--gray-500);font-size:12px">${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:20px">${err.message}</td></tr>`;
  }
}

// Đăng xuất khách hàng: xóa session và quay về trang đăng nhập tab khách hàng
function customerLogout() {
  localStorage.removeItem('customer_token');
  localStorage.removeItem('customer_user');
  if (typeof chatbotHide === 'function') chatbotHide();
  document.getElementById('customer-portal').style.display = 'none';
  document.getElementById('login-page').style.display      = 'flex';
  switchLoginTab('customer');
  document.getElementById('clogin-phone').value    = '';
  document.getElementById('clogin-password').value = '';
}

/* ================================================
   🚀 KHỞI TẠO KHI TRANG TẢI
================================================ */
document.addEventListener('DOMContentLoaded', () => {
  cartUpdateBadge();
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  // Phục hồi phiên khách hàng nếu chưa hết hạn
  const cToken = localStorage.getItem('customer_token');
  const cUser  = JSON.parse(localStorage.getItem('customer_user') || 'null');
  if (cToken && cUser && !Auth.isLoggedIn()) {
    try {
      // Giải mã JWT để kiểm tra thời hạn (không cần server)
      const payload = JSON.parse(atob(cToken.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        showCustomerPortal(cUser);
        return;
      }
    } catch {}
    // Token hết hạn hoặc lỗi giải mã → xóa session
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
  }

  // Phím Enter để đăng nhập nhanh
  document.getElementById('clogin-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doCustomerLogin();
  });
});
