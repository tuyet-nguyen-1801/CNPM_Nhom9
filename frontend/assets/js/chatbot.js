/**
 * chatbot.js v2 — PhoneBot với phân quyền 3 vai trò
 * Người thực hiện: Nguyễn Thị Tuyết (Trưởng nhóm)
 *
 * CUSTOMER : sản phẩm, giá, tồn kho, đơn hàng cá nhân
 * STAFF    : kho hàng đầy đủ, đơn hàng hệ thống, khách hàng
 * ADMIN    : tất cả + thống kê doanh thu, top bán chạy
 *
 * Quy tắc hiển thị: KHÔNG cắt bớt dữ liệu bằng "..."
 * Sản phẩm/kho: hiện tất cả, nhóm theo hãng
 * Đơn hàng KH : hiện tất cả đơn cá nhân
 * Đơn hàng NV : tóm tắt theo trạng thái + tối đa 20 mới nhất
 */

let _chatHistory = [];
let _chatOpen    = false;
let _chatGreeted = false;

/* ─────────────────────────────────────────────────────────────────────────
   ROLE
───────────────────────────────────────────────────────────────────────── */
function _role() {
  const u = Auth.getUser();
  if (!u) return 'customer';
  return u.role === 'admin' ? 'admin' : 'staff';
}

/* ─────────────────────────────────────────────────────────────────────────
   SHOW / HIDE
───────────────────────────────────────────────────────────────────────── */
function chatbotShow() {
  const el = document.getElementById('chatbot-toggle');
  if (el) el.style.display = 'flex';
}

function chatbotHide() {
  document.getElementById('chatbot-toggle')?.style.setProperty('display', 'none');
  document.getElementById('chatbot-window')?.classList.remove('open');
  _chatOpen    = false;
  _chatHistory = [];
  _chatGreeted = false;
}

/* ─────────────────────────────────────────────────────────────────────────
   TOGGLE
───────────────────────────────────────────────────────────────────────── */
function toggleChatbot() {
  _chatOpen = !_chatOpen;
  const win = document.getElementById('chatbot-window');
  const btn = document.getElementById('chatbot-toggle');
  if (!win) return;
  win.classList.toggle('open', _chatOpen);
  btn.classList.toggle('active', _chatOpen);
  document.getElementById('chatbot-unread').style.display = 'none';
  if (_chatOpen && !_chatGreeted) {
    _chatGreeted = true;
    _greet();
  } else if (_chatOpen) {
    const m = document.getElementById('chatbot-msgs');
    if (m) m.scrollTop = m.scrollHeight;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   GREETING
───────────────────────────────────────────────────────────────────────── */
function _greet() {
  const role    = _role();
  const sUser   = Auth.getUser();
  const cUser   = JSON.parse(localStorage.getItem('customer_user') || 'null');
  const name    = ((sUser || cUser)?.name || '').split(' ').pop() || 'bạn';
  const h       = new Date().getHours();
  const gr      = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const roleLbl = { admin: '👑 Quản lý', staff: '👤 Nhân viên', customer: '🛒 Khách hàng' };

  _botReply(`${gr} **${name}**! 👋\nTôi là **PhoneBot** — trợ lý của PhoneStore _(${roleLbl[role]})_.\n\nChọn gợi ý bên dưới hoặc gõ câu hỏi của bạn:`);
  setTimeout(() => _renderQA(role), 850);
}

/* ─────────────────────────────────────────────────────────────────────────
   QUICK ACTIONS — khác nhau theo vai trò
───────────────────────────────────────────────────────────────────────── */
const _QUICK = {
  customer: [
    { icon: '📱', text: 'Tất cả sản phẩm'     },
    { icon: '🏆', text: 'Flagship'             },
    { icon: '📱', text: 'Tầm trung'            },
    { icon: '💰', text: 'Giá rẻ'              },
    { icon: '🛒', text: 'Đơn hàng của tôi'    },
    { icon: '✅', text: 'Sản phẩm còn hàng'   },
  ],
  staff: [
    { icon: '📦', text: 'Tất cả sản phẩm'     },
    { icon: '⚠️', text: 'SP sắp hết hàng'     },
    { icon: '❌', text: 'SP hết hàng'         },
    { icon: '⏳', text: 'Đơn chờ xác nhận'    },
    { icon: '🚚', text: 'Đơn đang giao'       },
    { icon: '👥', text: 'Khách hàng'          },
  ],
  admin: [
    { icon: '📊', text: 'Thống kê tháng này'  },
    { icon: '📅', text: 'Doanh thu hôm nay'   },
    { icon: '🏆', text: 'Top sản phẩm bán chạy' },
    { icon: '⚠️', text: 'SP sắp hết hàng'     },
    { icon: '⏳', text: 'Đơn chờ xác nhận'    },
    { icon: '👥', text: 'Khách hàng'          },
  ],
};

function _renderQA(role) {
  const msgs = document.getElementById('chatbot-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chatbot-quick-actions';
  div.id = 'chatbot-qa';
  div.innerHTML = (_QUICK[role] || _QUICK.customer).map(a =>
    `<button class="quick-action-btn" onclick="_qaClick('${a.text}')">${a.icon} ${a.text}</button>`
  ).join('');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function _qaClick(text) {
  document.getElementById('chatbot-qa')?.remove();
  _addMsg('user', text);
  _dispatch(text);
}

/* ─────────────────────────────────────────────────────────────────────────
   SEND
───────────────────────────────────────────────────────────────────────── */
function chatbotSend() {
  const inp = document.getElementById('chatbot-input');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  document.getElementById('chatbot-qa')?.remove();
  _addMsg('user', msg);
  _dispatch(msg);
}

/* ─────────────────────────────────────────────────────────────────────────
   RENDER
───────────────────────────────────────────────────────────────────────── */
function _addMsg(role, text) {
  _chatHistory.push({ role, text, t: new Date() });
  _renderChat();
}

function _botReply(text, delay = 700) {
  _showTyping();
  setTimeout(() => { _hideTyping(); _addMsg('bot', text); }, delay + Math.random() * 200);
}

function _renderChat() {
  const msgs = document.getElementById('chatbot-msgs');
  if (!msgs) return;
  const qa  = document.getElementById('chatbot-qa');
  const sU  = Auth.getUser();
  const cU  = JSON.parse(localStorage.getItem('customer_user') || 'null');
  const ini = ((sU || cU)?.name?.charAt(0) || '?').toUpperCase();

  msgs.innerHTML = _chatHistory.map(m => {
    const isUser = m.role === 'user';
    const time   = m.t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="chat-row ${isUser ? 'row-user' : 'row-bot'}">
        ${!isUser ? '<div class="chat-av-bot">🤖</div>' : ''}
        <div class="chat-col">
          <div class="chat-bubble ${isUser ? 'bubble-user' : 'bubble-bot'}">${_fmt(m.text)}</div>
          <div class="chat-time">${time}</div>
        </div>
        ${isUser ? `<div class="chat-av-user">${ini}</div>` : ''}
      </div>`;
  }).join('');

  if (qa) msgs.appendChild(qa);
  msgs.scrollTop = msgs.scrollHeight;
}

function _fmt(txt) {
  return txt
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function _showTyping() {
  const msgs = document.getElementById('chatbot-msgs');
  if (!msgs || document.getElementById('chat-typing')) return;
  const d = document.createElement('div');
  d.id = 'chat-typing';
  d.className = 'chat-row row-bot';
  d.innerHTML = `<div class="chat-av-bot">🤖</div><div class="chat-col"><div class="chat-bubble bubble-bot typing-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}
function _hideTyping() { document.getElementById('chat-typing')?.remove(); }

/* ─────────────────────────────────────────────────────────────────────────
   NORMALIZE tiếng Việt
───────────────────────────────────────────────────────────────────────── */
function _n(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd');
}

/* ─────────────────────────────────────────────────────────────────────────
   DISPATCH — phân loại intent theo vai trò
───────────────────────────────────────────────────────────────────────── */
async function _dispatch(msg) {
  const q    = _n(msg);
  const role = _role();

  /* ── Chung ── */
  if (/^(xin chao|chao|hello|hi|hey|alo|oi )/.test(q)) {
    const r = ['Xin chào! 😊 Bạn cần tôi giúp gì?', 'Chào bạn! 👋 Hỏi ngay nhé~', 'Hi! 😄 Mình đang nghe!'];
    _botReply(r[Math.floor(Math.random() * r.length)]); return;
  }
  if (/cam on|thank/.test(q)) { _botReply('Không có gì! 😊 Còn câu hỏi nào nữa không?'); return; }
  if (/giup|huong dan|help|lam gi|chuc nang/.test(q)) { _botReply(_helpText(role)); return; }

  /* ── CUSTOMER ── */
  if (role === 'customer') {
    if (/don hang|don cua toi|lich su|order/.test(q))               { await _custOrders(); return; }
    if (/flagship|cao cap/.test(q))                                  { await _products({ cat: 'flagship' }); return; }
    if (/tam trung|mid.?range/.test(q))                              { await _products({ cat: 'mid-range' }); return; }
    if (/gia re|budget/.test(q))                                     { await _products({ cat: 'budget' }); return; }
    if (/gia|bao nhieu/.test(q))                                     { await _priceQuery(q, msg); return; }
    if (/con hang|het hang|sap het|ton kho/.test(q))                 { await _custStock(q); return; }
    if (/san pham|dien thoai|tat ca|hang|phone/.test(q) ||
        /iphone|samsung|xiaomi|oppo|vivo|realme|nokia|apple/.test(q)){ await _products({ brand: _brand(q) }); return; }
    _botReply(_fallback()); return;
  }

  /* ── STAFF & ADMIN ── */
  if (role === 'staff' || role === 'admin') {
    if (/cho xac nhan|pending/.test(q))           { await _staffOrders('pending');    return; }
    if (/da xac nhan|confirmed/.test(q))          { await _staffOrders('confirmed');  return; }
    if (/dang giao|delivering/.test(q))           { await _staffOrders('delivering'); return; }
    if (/hoan thanh|completed/.test(q))           { await _staffOrders('completed'); return; }
    if (/da huy|cancelled/.test(q))               { await _staffOrders('cancelled'); return; }
    if (/don hang|order/.test(q))                 { await _staffOrders(); return; }
    if (/sap het|it hang/.test(q))                { await _stockAlert('low');  return; }
    if (/het hang/.test(q))                       { await _stockAlert('out');  return; }
    if (/ton kho|kho hang/.test(q))               { await _stockAlert('all');  return; }
    if (/khach hang|khach/.test(q))               { await _custInfo(); return; }
    if (/san pham|dien thoai|tat ca|phone/.test(q) ||
        /iphone|samsung|xiaomi|oppo|vivo|realme|nokia|apple/.test(q)){ await _products({ brand: _brand(q), forStaff: true }); return; }
  }

  /* ── ADMIN ONLY ── */
  if (role === 'admin') {
    if (/hom nay|today/.test(q))                             { await _statsToday(); return; }
    if (/thong ke|doanh thu|bao cao|loi nhuan|thang/.test(q)){ await _statsMonth(); return; }
    if (/top|ban chay|ban nhieu/.test(q))                    { await _topProducts(); return; }
  } else if (/thong ke|doanh thu|bao cao/.test(q)) {
    _botReply('Thông tin doanh thu chỉ dành cho **Quản lý (Admin)** 🔒\nBạn không có quyền xem mục này.'); return;
  }

  _botReply(_fallback());
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */
function _brand(q) {
  const map = { iphone:'Apple', apple:'Apple', samsung:'Samsung', xiaomi:'Xiaomi', oppo:'OPPO', vivo:'Vivo', realme:'Realme', nokia:'Nokia' };
  for (const [k,v] of Object.entries(map)) if (q.includes(k)) return v;
  return null;
}

const _BRAND_ICON = { Apple:'🍎', Samsung:'📱', Xiaomi:'🔵', OPPO:'🟢', Vivo:'🟣', Realme:'🟡', Nokia:'⚫' };
const _CAT_LABEL  = { flagship:'🏆 Flagship', 'mid-range':'📱 Tầm trung', budget:'💰 Giá rẻ' };
const _S_ICON     = { pending:'⏳', confirmed:'✅', delivering:'🚚', completed:'✔️', cancelled:'❌' };
const _S_LABEL    = { pending:'Chờ xác nhận', confirmed:'Đã xác nhận', delivering:'Đang giao', completed:'Hoàn thành', cancelled:'Đã hủy' };

function _stockMark(s) { return s === 0 ? '❌ hết' : s <= 5 ? `⚠️ còn ${s}` : `✅ còn ${s}`; }

function _fallback() {
  const r = [
    'Hmm, tôi chưa hiểu rõ 😅 Bạn có thể nói cụ thể hơn không?',
    'Thử gõ **"giúp đỡ"** để xem tôi hỗ trợ được gì nhé! 😊',
    'Tôi không chắc hiểu đúng 🤔 Bạn hỏi về sản phẩm, đơn hàng hay tồn kho?',
  ];
  return r[Math.floor(Math.random() * r.length)];
}

function _helpText(role) {
  if (role === 'customer') return (
    '**Tôi có thể giúp bạn:**\n\n' +
    '• **Sản phẩm**: "Tất cả sản phẩm", "Samsung có gì?", "Flagship"\n' +
    '• **Giá**: "iPhone giá bao nhiêu?", "Giá rẻ nhất là gì?"\n' +
    '• **Tồn kho**: "Còn hàng không?", "Sản phẩm sắp hết"\n' +
    '• **Đơn hàng**: "Đơn hàng của tôi"'
  );
  if (role === 'staff') return (
    '**Tôi có thể giúp bạn:**\n\n' +
    '• **Sản phẩm**: "Tất cả sản phẩm", "Apple có gì?"\n' +
    '• **Kho hàng**: "Sắp hết hàng", "Hết hàng", "Tổng quan kho"\n' +
    '• **Đơn hàng**: "Tất cả đơn", "Đơn chờ xác nhận", "Đơn đang giao"\n' +
    '• **Khách hàng**: "Thông tin khách hàng"'
  );
  return (
    '**Tôi có thể giúp bạn:**\n\n' +
    '• **Thống kê**: "Thống kê tháng này", "Doanh thu hôm nay"\n' +
    '• **Top bán**: "Top sản phẩm bán chạy"\n' +
    '• **Kho hàng**: "Sắp hết hàng", "Hết hàng", "Tổng quan kho"\n' +
    '• **Đơn hàng**: "Đơn chờ xác nhận", "Đơn đang giao", "Tất cả đơn"\n' +
    '• **Sản phẩm**: "Samsung có gì?", "Tất cả sản phẩm"\n' +
    '• **Khách hàng**: "Thông tin khách hàng"'
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: PRODUCTS
   Hiển thị TẤT CẢ sản phẩm, nhóm theo hãng (không cắt bớt)
───────────────────────────────────────────────────────────────────────── */
async function _products({ brand = null, cat = null, forStaff = false } = {}) {
  try {
    const token = getActiveToken();
    const res   = await fetch('/api/phones?limit=500&page=1', { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    if (!data.success) throw new Error();

    let list = data.data.filter(p => p.is_active);
    if (brand) list = list.filter(p => p.brand === brand);
    if (cat)   list = list.filter(p => p.category === cat);

    if (!list.length) {
      _botReply(brand ? `Không có sản phẩm **${brand}** nào đang kinh doanh.` : 'Không tìm thấy sản phẩm phù hợp.');
      return;
    }

    if (brand) {
      /* ── Một hãng: danh sách phẳng ── */
      const header = `${_BRAND_ICON[brand] || '📱'} **${brand}** — ${list.length} sản phẩm:\n`;
      const rows = list.map(p => {
        const catLbl = _CAT_LABEL[p.category] ? ` · ${_CAT_LABEL[p.category]}` : '';
        const stock  = forStaff ? ` · ${_stockMark(p.stock)}` : (p.stock === 0 ? ' · ❌ Hết hàng' : '');
        return `• **${p.name}**${catLbl}\n  ${p.price.toLocaleString('vi-VN')} ₫${stock}`;
      }).join('\n');
      _botReply(header + '\n' + rows);
    } else if (cat) {
      /* ── Một phân khúc: nhóm theo hãng ── */
      const grouped = _groupByBrand(list);
      const header  = `**${_CAT_LABEL[cat]}** — ${list.length} sản phẩm:\n`;
      const rows = Object.entries(grouped).map(([b, prods]) => {
        const lines = prods.map(p => {
          const stock = forStaff ? ` · ${_stockMark(p.stock)}` : '';
          return `  • ${p.name} — ${p.price.toLocaleString('vi-VN')} ₫${stock}`;
        }).join('\n');
        return `${_BRAND_ICON[b] || '📱'} **${b}** (${prods.length}):\n${lines}`;
      }).join('\n\n');
      _botReply(header + '\n' + rows);
    } else {
      /* ── Tất cả: nhóm theo hãng ── */
      const grouped = _groupByBrand(list);
      const header  = `📦 Tất cả sản phẩm đang kinh doanh — **${list.length} SP**:\n`;
      const rows = Object.entries(grouped).map(([b, prods]) => {
        const lines = prods.map(p => {
          const catLbl = _CAT_LABEL[p.category] ? ` · ${_CAT_LABEL[p.category]}` : '';
          const stock  = forStaff ? ` · ${_stockMark(p.stock)}` : '';
          return `  • **${p.name}**${catLbl}\n    ${p.price.toLocaleString('vi-VN')} ₫${stock}`;
        }).join('\n');
        return `${_BRAND_ICON[b] || '📱'} **${b}** (${prods.length}):\n${lines}`;
      }).join('\n\n');
      _botReply(header + '\n' + rows);
    }
  } catch { _botReply('Không thể tải sản phẩm. Vui lòng thử lại!'); }
}

function _groupByBrand(list) {
  return list.reduce((acc, p) => {
    if (!acc[p.brand]) acc[p.brand] = [];
    acc[p.brand].push(p);
    return acc;
  }, {});
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: PRICE QUERY (customer)
───────────────────────────────────────────────────────────────────────── */
async function _priceQuery(q, original) {
  try {
    const token = getActiveToken();
    const res   = await fetch('/api/phones?limit=500&page=1', { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    if (!data.success) throw new Error();
    const all = data.data.filter(p => p.is_active);

    const kw = _n(original).replace(/gia|bao nhieu tien|bao nhieu|cua|la|san pham|dien thoai/g, '').trim();
    const matched = kw.length > 2 ? all.filter(p => _n(p.name).includes(kw) || _n(p.brand).includes(kw)) : [];

    if (matched.length) {
      const rows = matched.map(p => `• **${p.name}** (${p.brand})\n  ${p.price.toLocaleString('vi-VN')} ₫`).join('\n');
      _botReply(`Giá sản phẩm tìm được (${matched.length}):\n\n${rows}`);
    } else {
      const sorted = [...all].sort((a, b) => a.price - b.price);
      const rows   = sorted.map(p => `• **${p.name}** — ${p.price.toLocaleString('vi-VN')} ₫`).join('\n');
      _botReply(`Giá tất cả sản phẩm (**${sorted.length}** SP):\n\n${rows}`);
    }
  } catch { _botReply('Không thể tải thông tin giá. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: CUSTOMER STOCK CHECK
───────────────────────────────────────────────────────────────────────── */
async function _custStock(q) {
  try {
    const token = getActiveToken();
    const res   = await fetch('/api/phones?limit=500&page=1', { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    if (!data.success) throw new Error();
    const all = data.data.filter(p => p.is_active);

    if (/sap het/.test(q)) {
      const low = all.filter(p => p.stock > 0 && p.stock <= 5);
      if (!low.length) { _botReply('✅ Không có sản phẩm nào sắp hết hàng!'); return; }
      const rows = low.map(p => `• **${p.name}** (${p.brand}) — còn **${p.stock}** máy`).join('\n');
      _botReply(`⚠️ Sản phẩm sắp hết hàng (${low.length} SP):\n\n${rows}`);
    } else if (/het hang/.test(q)) {
      const out = all.filter(p => p.stock === 0);
      if (!out.length) { _botReply('✅ Hiện không có sản phẩm nào hết hàng!'); return; }
      const rows = out.map(p => `• ${p.name} (${p.brand})`).join('\n');
      _botReply(`❌ Sản phẩm hết hàng (${out.length} SP):\n\n${rows}`);
    } else {
      const avail = all.filter(p => p.stock > 0);
      const rows  = avail.map(p => `• **${p.name}** — còn ${p.stock} máy`).join('\n');
      _botReply(`✅ Sản phẩm còn hàng (${avail.length}/${all.length} SP):\n\n${rows}`);
    }
  } catch { _botReply('Không thể tải tồn kho. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: CUSTOMER ORDERS — hiển thị TẤT CẢ đơn cá nhân
───────────────────────────────────────────────────────────────────────── */
async function _custOrders() {
  try {
    const res  = await fetch('/api/customers/my-orders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('customer_token')}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error();

    const orders = data.data;
    if (!orders.length) { _botReply('Bạn chưa có đơn hàng nào. Hãy mua sắm ngay nhé! 🛒'); return; }

    const rows = orders.map(o => {
      const d = new Date(o.created_at).toLocaleDateString('vi-VN');
      return `• **${o.order_code}** — ${(o.final_amount || 0).toLocaleString('vi-VN')} ₫\n  ${_S_ICON[o.status] || ''} ${_S_LABEL[o.status] || o.status} · ${d}`;
    }).join('\n');

    _botReply(`🛒 Đơn hàng của bạn (**${orders.length}** đơn):\n\n${rows}`);
  } catch { _botReply('Không thể tải đơn hàng. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: STAFF/ADMIN ORDERS
   Tóm tắt trạng thái + tối đa 20 đơn mới nhất
───────────────────────────────────────────────────────────────────────── */
async function _staffOrders(status = null) {
  try {
    const url  = status
      ? `/api/orders?limit=200&page=1&status=${status}`
      : '/api/orders?limit=200&page=1';
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${Auth.getToken()}` } });
    const data = await res.json();
    if (!data.success) throw new Error();

    const orders = data.data;
    const total  = data.total || orders.length;

    if (!orders.length) {
      _botReply(status
        ? `Không có đơn hàng nào với trạng thái **${_S_LABEL[status]}**.`
        : 'Hệ thống chưa có đơn hàng nào.');
      return;
    }

    /* Tóm tắt theo trạng thái (chỉ khi xem tất cả) */
    let summary = '';
    if (!status) {
      const counts = ['pending','confirmed','delivering','completed','cancelled'].map(s => {
        const n = orders.filter(o => o.status === s).length;
        return `${_S_ICON[s]} **${_S_LABEL[s]}**: ${n}`;
      });
      summary = `Tổng quan (**${total}** đơn):\n${counts.join('\n')}\n\n`;
    }

    const title = status
      ? `${_S_ICON[status]} **${_S_LABEL[status]}** — ${orders.length} đơn:\n\n`
      : `**20 đơn mới nhất:**\n`;

    const rows = orders.slice(0, 20).map(o => {
      const d = new Date(o.created_at).toLocaleDateString('vi-VN');
      return `• **${o.order_code}** — ${o.customer_name || '—'}\n  ${(o.final_amount || 0).toLocaleString('vi-VN')} ₫ · ${_S_ICON[o.status]} ${_S_LABEL[o.status]} · ${d}`;
    }).join('\n');

    const more = orders.length > 20
      ? `\n\n_Còn ${orders.length - 20} đơn nữa — vào trang **Đơn hàng** để xem đầy đủ._`
      : '';

    _botReply(`${summary}${title}\n${rows}${more}`);
  } catch { _botReply('Không thể tải đơn hàng. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: STOCK ALERT (staff/admin) — hiển thị TẤT CẢ SP có vấn đề
───────────────────────────────────────────────────────────────────────── */
async function _stockAlert(type = 'all') {
  try {
    const res  = await fetch('/api/phones?limit=500&page=1', { headers: { Authorization: `Bearer ${Auth.getToken()}` } });
    const data = await res.json();
    if (!data.success) throw new Error();

    const all = data.data.filter(p => p.is_active);
    const out = all.filter(p => p.stock === 0);
    const low = all.filter(p => p.stock > 0 && p.stock <= 5);
    const ok  = all.filter(p => p.stock > 5);

    if (type === 'out') {
      if (!out.length) { _botReply('✅ Không có sản phẩm nào hết hàng!'); return; }
      const rows = out.map(p => `• **${p.name}** (${p.brand}) — ❌ Hết hàng`).join('\n');
      _botReply(`❌ Sản phẩm **hết hàng** — ${out.length} SP:\n\n${rows}`);

    } else if (type === 'low') {
      if (!low.length) { _botReply('✅ Không có sản phẩm nào sắp hết hàng!'); return; }
      const rows = low.map(p => `• **${p.name}** (${p.brand}) — còn **${p.stock}** máy`).join('\n');
      _botReply(`⚠️ Sản phẩm **sắp hết hàng** (≤5) — ${low.length} SP:\n\n${rows}`);

    } else {
      let reply = `📦 Tổng quan kho hàng (${all.length} SP):\n\n`;
      reply += `✅ Đủ hàng (>5 máy): **${ok.length}** SP\n`;
      reply += `⚠️ Sắp hết (1–5 máy): **${low.length}** SP\n`;
      reply += `❌ Hết hàng (0 máy): **${out.length}** SP`;

      if (low.length) {
        const rows = low.map(p => `• **${p.name}** (${p.brand}) — còn ${p.stock} máy`).join('\n');
        reply += `\n\n⚠️ **Danh sách sắp hết:**\n${rows}`;
      }
      if (out.length) {
        const rows = out.map(p => `• **${p.name}** (${p.brand})`).join('\n');
        reply += `\n\n❌ **Danh sách hết hàng:**\n${rows}`;
      }
      _botReply(reply);
    }
  } catch { _botReply('Không thể tải tồn kho. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: CUSTOMER INFO (staff/admin)
───────────────────────────────────────────────────────────────────────── */
async function _custInfo() {
  try {
    const res  = await fetch('/api/customers?limit=1&page=1', { headers: { Authorization: `Bearer ${Auth.getToken()}` } });
    const data = await res.json();
    if (!data.success) throw new Error();
    _botReply(`👥 Hệ thống có **${data.total}** khách hàng.\n\nVào trang **Khách hàng** để xem & quản lý danh sách chi tiết.`);
  } catch { _botReply('Không thể tải thông tin khách hàng. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: ADMIN STATS — THÁNG NÀY
───────────────────────────────────────────────────────────────────────── */
async function _statsMonth() {
  try {
    const res  = await fetch('/api/stats/dashboard', { headers: { Authorization: `Bearer ${Auth.getToken()}` } });
    const data = await res.json();
    if (!data.success) throw new Error();
    const d   = data.data;
    const rev = d.revenue?.month_revenue || 0;
    const m   = new Date().getMonth() + 1;

    _botReply(
      `📊 **Thống kê tháng ${m}:**\n\n` +
      `💰 Doanh thu: **${rev.toLocaleString('vi-VN')} ₫**\n` +
      `🛒 Tổng đơn hàng: **${d.orders?.total || 0}**\n` +
      `⏳ Chờ xác nhận: **${d.orders?.pending || 0}**\n` +
      `🚚 Đang giao: **${d.orders?.delivering || 0}**\n` +
      `✔️ Hoàn thành: **${d.orders?.completed || 0}**\n` +
      `❌ Đã hủy: **${d.orders?.cancelled || 0}**\n` +
      `👥 Tổng khách hàng: **${d.new_customers || 0}**\n` +
      `⚠️ SP sắp hết hàng: **${d.low_stock || 0}**`
    );
  } catch { _botReply('Không thể tải thống kê. Vào trang **Báo cáo** để xem nhé!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: ADMIN STATS — HÔM NAY
───────────────────────────────────────────────────────────────────────── */
async function _statsToday() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res   = await fetch(`/api/stats/revenue?from=${today}&to=${today}`, {
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    const data  = await res.json();
    if (!data.success) throw new Error();

    const rows = data.data;
    const d    = new Date().toLocaleDateString('vi-VN');

    if (!rows.length) {
      _botReply(`📅 **Hôm nay (${d}):**\n\nChưa có doanh thu nào hôm nay.`); return;
    }
    const rev = rows.reduce((s, r) => s + (r.doanh_thu || 0), 0);
    const cnt = rows.reduce((s, r) => s + (r.so_hoa_don || 0), 0);
    const avg = cnt ? Math.round(rev / cnt) : 0;

    _botReply(
      `📅 **Hôm nay (${d}):**\n\n` +
      `💰 Doanh thu: **${rev.toLocaleString('vi-VN')} ₫**\n` +
      `🧾 Số hóa đơn: **${cnt}**\n` +
      `📈 TB/hóa đơn: **${avg.toLocaleString('vi-VN')} ₫**`
    );
  } catch { _botReply('Không thể tải doanh thu hôm nay. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   HANDLER: ADMIN TOP PRODUCTS
───────────────────────────────────────────────────────────────────────── */
async function _topProducts() {
  try {
    const res  = await fetch('/api/stats/dashboard', { headers: { Authorization: `Bearer ${Auth.getToken()}` } });
    const data = await res.json();
    if (!data.success) throw new Error();

    const top = data.data.top_phones || [];
    if (!top.length) { _botReply('Chưa có dữ liệu sản phẩm bán chạy.'); return; }

    const rows = top.map((p, i) =>
      `${i + 1}. **${p.name}** (${p.brand})\n   📦 Đã bán: ${p.total_sold} máy · 💰 ${(p.total_revenue || 0).toLocaleString('vi-VN')} ₫`
    ).join('\n');

    _botReply(`🏆 **Top sản phẩm bán chạy:**\n\n${rows}`);
  } catch { _botReply('Không thể tải dữ liệu bán hàng. Vui lòng thử lại!'); }
}

/* ─────────────────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('chatbot-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') chatbotSend(); });
});
