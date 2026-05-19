# 📱 PhoneStore — Hệ thống quản lý cửa hàng điện thoại

Ứng dụng web quản lý bán lẻ điện thoại di động, xây dựng bằng **Node.js + Express + Microsoft SQL Server** (Backend) và **Vanilla JavaScript SPA** (Frontend).

---

## 🚀 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js, Express.js |
| Cơ sở dữ liệu | Microsoft SQL Server (mssql) |
| Xác thực | JWT (jsonwebtoken), bcryptjs |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Thanh toán QR | VietQR API (MB Bank) |

---

## ✨ Tính năng chính

### Dành cho nhân viên / quản lý
- **Dashboard** tổng quan: doanh thu, đơn hàng, tồn kho, biểu đồ 6 tháng
- **Quản lý sản phẩm**: thêm/sửa/ẩn, thông số kỹ thuật đầy đủ
- **Quản lý khách hàng**: CRUD, lịch sử mua hàng
- **Quản lý đơn hàng**: tạo đơn, theo dõi trạng thái, xuất kho tự động
- **Quản lý hóa đơn**: tạo hóa đơn, hỗ trợ VAT và giảm giá
- **Quản lý kho**: nhập hàng, điều chỉnh, lịch sử giao dịch
- **Báo cáo doanh thu**: thống kê theo ngày/tháng/năm
- **Quản lý nhân viên**: tạo/sửa/khóa tài khoản (Admin only)

### Dành cho khách hàng (Portal)
- Đăng ký tài khoản với mật khẩu
- Đăng nhập bằng số điện thoại
- Xem danh sách sản phẩm, lọc theo hãng/phân khúc
- Giỏ hàng (slide-out drawer), thanh toán 2 bước
- Thanh toán bằng tiền mặt hoặc quét mã QR (VietQR)
- Xem lịch sử đơn hàng của bản thân
- Đổi mật khẩu

---

## ⚙️ Cài đặt & Chạy

### Yêu cầu
- Node.js >= 16
- Microsoft SQL Server

### Bước 1 — Tạo cơ sở dữ liệu
```sql
-- Chạy file Phone.sql trong SQL Server Management Studio
```

### Bước 2 — Cấu hình môi trường
```env
# backend/.env
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=phone_store
DB_USER=sa
DB_PASSWORD=your_password
DB_TRUST_CERT=true
JWT_SECRET=your_secret_key
PORT=5000
```

### Bước 3 — Cài đặt và chạy
```bash
cd backend
npm install
node server.js
```

### Bước 4 — Truy cập
- Giao diện: http://localhost:5000
- API: http://localhost:5000/api

---

## 🔐 Tài khoản mặc định

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@phonestore.vn | Admin@123 |
| Nhân viên | lan.tran@phonestore.vn | Nhanvien@1 |
| Nhân viên | hung.le@phonestore.vn | Nhanvien@1 |

> Khách hàng đăng ký tài khoản riêng qua form "Đăng ký" trên trang đăng nhập (tab Khách hàng).

---

## 📁 Cấu trúc dự án

```
phone-store/
├── backend/
│   ├── server.js              # Điểm khởi động, đăng ký route, auto-migration
│   ├── .env                   # Biến môi trường (không commit lên Git)
│   ├── config/
│   │   └── db.js              # Kết nối SQL Server, connection pool
│   ├── middlewares/
│   │   └── auth.js            # JWT middleware: protect, adminOnly, customerOnly
│   ├── controllers/
│   │   ├── authController.js       # Đăng nhập / đổi mật khẩu nhân viên
│   │   ├── customerController.js   # CRUD khách hàng + portal (đăng ký/login KH)
│   │   ├── phoneController.js      # CRUD sản phẩm điện thoại
│   │   ├── orderController.js      # Tạo đơn hàng + trừ kho (transaction)
│   │   ├── inventoryController.js  # Nhập kho, điều chỉnh, lịch sử
│   │   ├── invoiceController.js    # Tạo hóa đơn, liên kết đơn hàng
│   │   ├── statsController.js      # Dashboard, báo cáo doanh thu
│   │   └── userController.js       # Quản lý tài khoản nhân viên
│   └── routes/                # Định tuyến API (1 file / nhóm resource)
│
├── frontend/
│   ├── index.html             # SPA duy nhất — toàn bộ giao diện
│   └── assets/
│       ├── css/style.css      # Toàn bộ CSS, design system, responsive
│       └── js/
│           ├── api.js         # API helper, Auth, toast, định dạng, phân trang
│           ├── cart.js        # Giỏ hàng, checkout QR, cổng khách hàng
│           ├── dashboard.js   # Trang tổng quan, biểu đồ doanh thu
│           ├── phones.js      # Quản lý sản phẩm
│           └── pages.js       # Khách hàng, kho, đơn hàng, hóa đơn, nhân viên, báo cáo
│
└── Phone.sql                  # Script tạo CSDL và dữ liệu mẫu
```

---

## 👥 Phân công công việc

> **Tổng số thành viên: 4 người**
> Tuyết đảm nhận phần nhiều hơn với vai trò Trưởng nhóm (~40%), ba thành viên còn lại chia đều (~20% mỗi người).

---

### 👑 Nguyễn Thị Tuyết — Trưởng nhóm (~40%)

**Backend — Lõi hệ thống:**

| File | Nội dung |
|---|---|
| `backend/server.js` | Khởi tạo Express, đăng ký route, auto-migration schema CSDL |
| `backend/config/db.js` | Kết nối SQL Server, cấu hình connection pool |
| `backend/middlewares/auth.js` | JWT middleware: protect, adminOnly, customerOnly |
| `backend/controllers/authController.js` | Đăng nhập nhân viên, xem profile, đổi mật khẩu |
| `backend/controllers/orderController.js` | Tạo đơn hàng (DB transaction: kiểm tra kho → tạo đơn → trừ tồn kho → ghi lịch sử) |

**Frontend — Giao diện và tương tác:**

| File | Nội dung |
|---|---|
| `frontend/index.html` | Toàn bộ cấu trúc HTML: trang đăng nhập, sidebar, 8 trang quản lý, portal khách hàng, tất cả modal |
| `frontend/assets/js/api.js` | API wrapper, Auth module, toast notifications, định dạng tiền/ngày, modal helper, phân trang |
| `frontend/assets/js/cart.js` | Giỏ hàng (slide-out), thanh toán QR VietQR, đăng ký/login khách hàng, toàn bộ portal mua sắm |
| `frontend/assets/css/style.css` | **Đồng phát triển** responsive mobile: thêm hamburger menu, sidebar ẩn/hiện trên màn hình nhỏ |
| `frontend/assets/js/chatbot.js` | **PhoneBot** — chatbot AI phân quyền 3 vai trò (khách hàng / nhân viên / admin), hỏi đáp sản phẩm, đơn hàng, kho và thống kê doanh thu |

---

### 🧑‍💻 Dinh Quang Minh 

**Backend — Quản lý người dùng & định tuyến:**

| File | Nội dung |
|---|---|
| `backend/controllers/customerController.js` | CRUD khách hàng + đăng ký/login/đổi mật khẩu qua portal |
| `backend/controllers/userController.js` | CRUD tài khoản nhân viên, hash mật khẩu |
| `backend/routes/auth.js` | Route đăng nhập, profile, đổi mật khẩu nhân viên |
| `backend/routes/customers.js` | Route CRUD khách hàng + các endpoint public của portal |
| `backend/routes/users.js` | Route quản lý nhân viên (Admin only) |
| `backend/routes/phones.js` | Route API sản phẩm điện thoại |
| `backend/routes/orders.js` | Route API đơn hàng |
| `backend/routes/inventory.js` | Route API kho hàng |
| `backend/routes/invoices.js` | Route API hóa đơn |
| `backend/routes/stats.js` | Route API thống kê |

**Frontend:**

| File | Nội dung |
|---|---|
| `frontend/assets/js/phones.js` | UI quản lý sản phẩm: bảng danh sách, tìm kiếm/lọc, thêm/sửa/ẩn, nút thêm vào giỏ hàng |

---

### 🧑‍💻 Hoang Hieu Dong 

**Backend — Nghiệp vụ bán hàng:**

| File | Nội dung |
|---|---|
| `backend/controllers/inventoryController.js` | Quản lý kho: tổng quan tồn kho, nhập hàng, điều chỉnh, lịch sử giao dịch |
| `backend/controllers/invoiceController.js` | Tạo hóa đơn, tính VAT, liên kết đơn hàng → tự động hoàn thành đơn |
| `backend/controllers/statsController.js` | Dashboard (7 query song song bằng Promise.all), báo cáo doanh thu theo ngày |

**Frontend:**

| File | Nội dung |
|---|---|
| `frontend/assets/js/pages.js` | UI 6 trang nội bộ: Khách hàng, Kho hàng, Đơn hàng, Hóa đơn, Nhân viên, Báo cáo |
| `frontend/assets/css/style.css` | Toàn bộ CSS: design system (biến màu, spacing), layout sidebar, component, responsive |

---

### 🧑‍💻 Nguyễn Viet Cuong 

**Database & Sản phẩm:**

| File | Nội dung |
|---|---|
| `Phone.sql` | Thiết kế toàn bộ schema CSDL (8 bảng: users, customers, phones, inventory, orders, order_items, invoices, invoice_items, inventory_transactions), dữ liệu mẫu |
| `fix_admin_and_passwords.sql` | Script cập nhật tên admin và reset mật khẩu nhân viên khi cần |
| `backend/controllers/phoneController.js` | CRUD sản phẩm điện thoại, tự động tạo bản ghi kho khi thêm sản phẩm mới |
| `frontend/assets/js/dashboard.js` | Trang tổng quan, biểu đồ cột doanh thu 6 tháng (vẽ bằng HTML/CSS thuần, không cần thư viện) |
| `backend/package.json` | Cấu hình dự án Node.js, khai báo các thư viện phụ thuộc |

---

## 🤖 PhoneBot — Trợ lý AI

> Phát triển bởi **Nguyễn Thị Tuyết** (Trưởng nhóm)

PhoneBot là chatbot tích hợp ngay trong giao diện, hiện ra sau khi đăng nhập. Hỗ trợ 3 nhóm vai trò với câu hỏi khác nhau:

| Vai trò | Câu hỏi có thể hỏi |
|---|---|
| **Khách hàng** | Tất cả sản phẩm, flagship, tầm trung, giá rẻ, còn hàng, đơn hàng của tôi |
| **Nhân viên** | Tồn kho đầy đủ, sắp hết / hết hàng, đơn chờ xác nhận, đơn đang giao, danh sách khách hàng |
| **Admin** | Tất cả của nhân viên + thống kê tháng, doanh thu hôm nay, top sản phẩm bán chạy |

**Điểm kỹ thuật:**
- Hiện **toàn bộ dữ liệu** — không cắt bớt bằng "..."
- Sản phẩm nhóm theo hãng cho dễ đọc
- Nhận dạng tiếng Việt có / không dấu (`_n()` normalizer)
- Hiển thị widget nổi góc phải, spring animation

---

## 🗄️ Sơ đồ cơ sở dữ liệu

```
users                    customers
├── id (PK)              ├── id (PK)
├── name                 ├── name
├── email (unique)       ├── phone (unique)
├── password (bcrypt)    ├── email
├── role: admin|user     ├── address, gender, birthday
└── is_active            ├── password_hash (bcrypt)
                         └── is_active

phones                   inventory
├── id (PK)              ├── id (PK)
├── name, brand, model   ├── phone_id → phones.id
├── price, import_price  ├── quantity
├── specs (ram, ...)     └── min_quantity (ngưỡng cảnh báo)
└── is_active
                         inventory_transactions
orders                   ├── phone_id → phones.id
├── id (PK)              ├── type: import|export|adjust
├── order_code (unique)  ├── quantity, qty_before, qty_after
├── customer_name/phone  └── created_by → users.id
├── total, discount, final
├── status, payment_status
└── created_by → users.id (NULL nếu khách hàng đặt)

order_items              invoices
├── order_id → orders    ├── id (PK)
├── phone_id → phones    ├── invoice_code (unique)
├── quantity             ├── order_id → orders.id
└── unit_price, subtotal ├── subtotal, discount, tax, total
                         └── payment_status, paid_at
```

---

## 📌 Ghi chú kỹ thuật quan trọng

| Vấn đề | Giải pháp |
|---|---|
| Schema CSDL cũ không có cột `password_hash` | Auto-migration khi server khởi động (server.js) |
| 2 hệ thống người dùng khác nhau | JWT tách biệt: token nhân viên (role) vs khách hàng (type:'customer') |
| Đặt hàng phải đảm bảo tính nhất quán | SQL Transaction: rollback nếu bất kỳ bước nào lỗi |
| Xóa dữ liệu có thể mất lịch sử | Xóa mềm: `is_active = 0` cho tất cả entity |
| Thanh toán QR không cần tích hợp phức tạp | VietQR API miễn phí qua URL ảnh, không cần API key |
| Khách hàng đặt hàng không có trong bảng users | `created_by = NULL` trong orders khi khách hàng đặt |
