-- ============================================================
--  SCRIPT TẠO DATABASE & DỮ LIỆU MẪU
--  HỆ THỐNG QUẢN LÝ CỬA HÀNG ĐIỆN THOẠI
--  Microsoft SQL Server (T-SQL) - Dùng với SSMS
-- ============================================================
--  Cách chạy:
--  1. Mở SSMS → New Query
--  2. Paste toàn bộ nội dung này vào
--  3. Nhấn F5 hoặc nút Execute
-- ============================================================

USE master;
GO

-- Xóa database cũ nếu tồn tại
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'phone_store')
BEGIN
    ALTER DATABASE phone_store SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE phone_store;
END
GO

-- Tạo database mới
CREATE DATABASE phone_store
    COLLATE Vietnamese_CI_AS;
GO

USE phone_store;
GO

PRINT N'✅ Đã tạo database phone_store';
GO

-- ============================================================
-- BẢNG 1: users — Quản lý + Nhân viên (Đăng nhập, phân quyền)
-- ============================================================
CREATE TABLE users (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100)  NOT NULL,
    email       NVARCHAR(150)  NOT NULL UNIQUE,
    password    NVARCHAR(255)  NOT NULL,           -- Bcrypt hash
    role        NVARCHAR(10)   NOT NULL DEFAULT 'user'
                    CHECK (role IN ('admin','user')),  -- admin=Quản lý, user=Nhân viên
    phone       NVARCHAR(15),
    address     NVARCHAR(255),
    is_active   BIT            NOT NULL DEFAULT 1,
    last_login  DATETIME2,
    created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 2: phones — Quản lý điện thoại (CRUD) + Xem thông tin
-- ============================================================
CREATE TABLE phones (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(200)  NOT NULL,
    brand        NVARCHAR(100)  NOT NULL,
    model        NVARCHAR(100),
    category     NVARCHAR(20)   NOT NULL DEFAULT 'mid-range'
                     CHECK (category IN ('flagship','mid-range','budget')),
    price        DECIMAL(15,0)  NOT NULL,           -- Giá bán (VND)
    import_price DECIMAL(15,0)  NOT NULL,           -- Giá nhập
    description  NVARCHAR(MAX),
    image        NVARCHAR(500),
    -- Thông số kỹ thuật
    ram          NVARCHAR(50),
    storage      NVARCHAR(50),
    screen       NVARCHAR(100),
    battery      NVARCHAR(50),
    camera       NVARCHAR(150),
    os           NVARCHAR(100),
    chip         NVARCHAR(100),
    sim          NVARCHAR(100),
    colors       NVARCHAR(300),                    -- Danh sách màu, cách nhau dấu phẩy
    warranty     INT            DEFAULT 12,        -- Bảo hành (tháng)
    is_active    BIT            NOT NULL DEFAULT 1,
    created_by   INT            REFERENCES users(id),
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 3: customers — Quản lý khách hàng + Đặt hàng
-- ============================================================
CREATE TABLE customers (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100)  NOT NULL,
    phone         NVARCHAR(15)   NOT NULL,
    email         NVARCHAR(150),
    address       NVARCHAR(255),
    gender        NVARCHAR(10)   DEFAULT 'other'
                      CHECK (gender IN ('male','female','other')),
    birthday      DATE,
    note          NVARCHAR(MAX),
    password_hash NVARCHAR(255),                    -- Bcrypt hash (đăng ký online)
    is_active     BIT            NOT NULL DEFAULT 1,
    created_by    INT            REFERENCES users(id),
    created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
);
-- Nếu database đã tồn tại, chạy lệnh này để thêm cột:
-- ALTER TABLE customers ADD password_hash NVARCHAR(255) NULL;
GO

-- ============================================================
-- BẢNG 4: inventory — Quản lý kho (tồn kho hiện tại)
-- ============================================================
CREATE TABLE inventory (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    phone_id     INT            NOT NULL UNIQUE REFERENCES phones(id) ON DELETE CASCADE,
    quantity     INT            NOT NULL DEFAULT 0,   -- Tồn kho hiện tại
    min_quantity INT            NOT NULL DEFAULT 5,   -- Ngưỡng cảnh báo sắp hết
    location     NVARCHAR(100)  DEFAULT N'Kho chính',
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 5: inventory_transactions — Lịch sử nhập/xuất kho
-- ============================================================
CREATE TABLE inventory_transactions (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    phone_id   INT            NOT NULL REFERENCES phones(id),
    type       NVARCHAR(10)   NOT NULL
                   CHECK (type IN ('import','export','adjust')),  -- import=Nhập, export=Xuất
    quantity   INT            NOT NULL,   -- Dương=nhập, Âm=xuất
    qty_before INT            NOT NULL,   -- Tồn trước khi thay đổi
    qty_after  INT            NOT NULL,   -- Tồn sau khi thay đổi
    reference  NVARCHAR(50),             -- Mã hóa đơn / đơn hàng liên quan
    note       NVARCHAR(MAX),
    created_by INT            REFERENCES users(id),
    created_at DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 6: orders — Đặt hàng (Khách hàng) + Xử lý đơn hàng
-- ============================================================
CREATE TABLE orders (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    order_code     NVARCHAR(20)   NOT NULL UNIQUE,
    customer_id    INT            REFERENCES customers(id),
    -- Snapshot thông tin khách tại thời điểm đặt
    customer_name  NVARCHAR(100)  NOT NULL,
    customer_phone NVARCHAR(15)   NOT NULL,
    customer_email NVARCHAR(150),
    customer_addr  NVARCHAR(255),
    -- Tiền
    total_amount   DECIMAL(15,0)  NOT NULL DEFAULT 0,
    discount       DECIMAL(15,0)  NOT NULL DEFAULT 0,
    final_amount   DECIMAL(15,0)  NOT NULL DEFAULT 0,
    -- Trạng thái
    status         NVARCHAR(20)   NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','delivering','completed','cancelled')),
    payment_method NVARCHAR(10)   NOT NULL DEFAULT 'cash'
                       CHECK (payment_method IN ('cash','transfer','card')),
    payment_status NVARCHAR(10)   NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid','paid')),
    note           NVARCHAR(MAX),
    created_by     INT            REFERENCES users(id),
    created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 7: order_items — Chi tiết sản phẩm trong đơn hàng
-- ============================================================
CREATE TABLE order_items (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    order_id    INT            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    phone_id    INT            REFERENCES phones(id),
    phone_name  NVARCHAR(200)  NOT NULL,   -- Snapshot tên tại thời điểm đặt
    phone_brand NVARCHAR(100),
    quantity    INT            NOT NULL DEFAULT 1,
    unit_price  DECIMAL(15,0)  NOT NULL,   -- Đơn giá tại thời điểm đặt
    subtotal    DECIMAL(15,0)  NOT NULL    -- quantity * unit_price
);
GO

-- ============================================================
-- BẢNG 8: invoices — Quản lý hóa đơn / Lập hóa đơn
-- ============================================================
CREATE TABLE invoices (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    invoice_code   NVARCHAR(20)   NOT NULL UNIQUE,
    order_id       INT            REFERENCES orders(id),
    customer_id    INT            REFERENCES customers(id),
    customer_name  NVARCHAR(100)  NOT NULL,
    customer_phone NVARCHAR(15)   NOT NULL,
    customer_addr  NVARCHAR(255),
    subtotal       DECIMAL(15,0)  NOT NULL DEFAULT 0,
    discount       DECIMAL(15,0)  NOT NULL DEFAULT 0,
    tax_rate       DECIMAL(5,2)   NOT NULL DEFAULT 0,   -- VAT %
    tax_amount     DECIMAL(15,0)  NOT NULL DEFAULT 0,
    total          DECIMAL(15,0)  NOT NULL DEFAULT 0,
    payment_method NVARCHAR(10)   NOT NULL DEFAULT 'cash'
                       CHECK (payment_method IN ('cash','transfer','card')),
    payment_status NVARCHAR(10)   NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid','paid','refunded')),
    paid_at        DATETIME2,
    note           NVARCHAR(MAX),
    created_by     INT            NOT NULL REFERENCES users(id),
    created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- BẢNG 9: invoice_items — Chi tiết sản phẩm trong hóa đơn
-- ============================================================
CREATE TABLE invoice_items (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id  INT            NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    phone_id    INT            REFERENCES phones(id),
    phone_name  NVARCHAR(200)  NOT NULL,
    phone_brand NVARCHAR(100),
    quantity    INT            NOT NULL DEFAULT 1,
    unit_price  DECIMAL(15,0)  NOT NULL,
    subtotal    DECIMAL(15,0)  NOT NULL
);
GO

-- ============================================================
-- BẢNG 10: reports — Xem báo cáo
-- ============================================================
CREATE TABLE reports (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    type             NVARCHAR(10)   NOT NULL
                         CHECK (type IN ('daily','monthly','yearly','custom')),
    title            NVARCHAR(200)  NOT NULL,
    period_from      DATE           NOT NULL,
    period_to        DATE           NOT NULL,
    total_orders     INT            NOT NULL DEFAULT 0,
    completed_orders INT            NOT NULL DEFAULT 0,
    cancelled_orders INT            NOT NULL DEFAULT 0,
    total_revenue    DECIMAL(15,0)  NOT NULL DEFAULT 0,
    total_cost       DECIMAL(15,0)  NOT NULL DEFAULT 0,
    gross_profit     DECIMAL(15,0)  NOT NULL DEFAULT 0,
    total_items_sold INT            NOT NULL DEFAULT 0,
    new_customers    INT            NOT NULL DEFAULT 0,
    created_by       INT            REFERENCES users(id),
    created_at       DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- INDEX tối ưu tìm kiếm sản phẩm
-- ============================================================
CREATE INDEX idx_phones_brand     ON phones(brand);
CREATE INDEX idx_phones_category  ON phones(category);
CREATE INDEX idx_phones_price     ON phones(price);
CREATE INDEX idx_phones_active    ON phones(is_active);

CREATE INDEX idx_customers_phone  ON customers(phone);
CREATE INDEX idx_customers_name   ON customers(name);

CREATE INDEX idx_orders_status    ON orders(status);
CREATE INDEX idx_orders_date      ON orders(created_at);
CREATE INDEX idx_orders_customer  ON orders(customer_id);

CREATE INDEX idx_inv_trans_phone  ON inventory_transactions(phone_id);
CREATE INDEX idx_inv_trans_type   ON inventory_transactions(type);
CREATE INDEX idx_inv_trans_date   ON inventory_transactions(created_at);

CREATE INDEX idx_invoices_date    ON invoices(created_at);
CREATE INDEX idx_invoices_status  ON invoices(payment_status);
GO

PRINT N'✅ Đã tạo 10 bảng + indexes';
GO

-- ============================================================
-- ██ DỮ LIỆU MẪU ██
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- DATA: users
-- Mật khẩu gốc:
--   admin@phonestore.vn  → Admin@123
--   các nhân viên        → Nhanvien@1
-- (Hash bcrypt rounds=10 — khi tích hợp Node.js dùng bcrypt.hash)
-- ─────────────────────────────────────────────────────────
SET IDENTITY_INSERT users ON;
INSERT INTO users (id, name, email, password, role, phone, address, is_active, last_login, created_at) VALUES
(1, N'Nguyễn Minh Quản',  'admin@phonestore.vn',    '$2a$10$8n6h3st3csZ3r2gLVK6Cp.cCnrlGEAviykgLyI/VS/r6olsr5Osh2', 'admin', '0901234567', N'123 Nguyễn Huệ, Q.1, TP.HCM',               1, '2024-01-15 08:30:00', '2023-06-01 00:00:00'),
(2, N'Trần Thị Lan',      'lan.tran@phonestore.vn', '$2a$10$t1ynyq5TKzG523Yheiw8gu339DFbwLX7gA9HCR.HVZaAW.ngl4B6O', 'user',  '0912345678', N'45 Lê Lợi, Q.1, TP.HCM',                    1, '2024-01-15 09:00:00', '2023-07-10 00:00:00'),
(3, N'Lê Văn Hùng',       'hung.le@phonestore.vn',  '$2a$10$t1ynyq5TKzG523Yheiw8gu339DFbwLX7gA9HCR.HVZaAW.ngl4B6O', 'user',  '0923456789', N'78 Hai Bà Trưng, Q.3, TP.HCM',              1, '2024-01-14 17:45:00', '2023-08-05 00:00:00'),
(4, N'Phạm Thị Mai',      'mai.pham@phonestore.vn', '$2a$10$t1ynyq5TKzG523Yheiw8gu339DFbwLX7gA9HCR.HVZaAW.ngl4B6O', 'user',  '0934567890', N'12 Đinh Tiên Hoàng, Q.Bình Thạnh, TP.HCM',  0, '2023-12-20 10:00:00', '2023-09-01 00:00:00');
SET IDENTITY_INSERT users OFF;
GO
PRINT N'✅ Đã tạo 4 users';

-- ─────────────────────────────────────────────────────────
-- DATA: phones (8 sản phẩm)
-- ─────────────────────────────────────────────────────────
SET IDENTITY_INSERT phones ON;
INSERT INTO phones (id, name, brand, model, category, price, import_price, description, image, ram, storage, screen, battery, camera, os, chip, sim, colors, warranty, is_active, created_by, created_at) VALUES
(1, N'iPhone 15 Pro Max',
   'Apple', 'A3106', 'flagship', 34990000, 28000000,
   N'iPhone 15 Pro Max 256GB, chip A17 Pro, khung Titanium, camera 48MP',
   'https://placehold.co/400x400/1a1a2e/fff?text=iPhone15ProMax',
   '8GB','256GB','6.7 inch Super Retina XDR','4422 mAh','48MP + 12MP + 12MP',
   'iOS 17','Apple A17 Pro','Nano SIM + eSIM',
   N'Titan Đen,Titan Trắng,Titan Xanh,Titan Tự nhiên', 12, 1, 1, '2023-09-22'),

(2, N'Samsung Galaxy S24 Ultra',
   'Samsung', 'SM-S928B', 'flagship', 31990000, 25000000,
   N'S24 Ultra 512GB, Snapdragon 8 Gen 3, bút S-Pen, camera 200MP',
   'https://placehold.co/400x400/0f3460/fff?text=S24Ultra',
   '12GB','512GB','6.8 inch Dynamic AMOLED 2X','5000 mAh','200MP + 12MP + 10MP + 50MP',
   'Android 14 / One UI 6.1','Snapdragon 8 Gen 3','Nano SIM + eSIM',
   N'Titanium Black,Titanium Gray,Titanium Violet,Titanium Yellow', 12, 1, 1, '2024-01-17'),

(3, N'Xiaomi 14 Pro',
   'Xiaomi', '23116PN5BC', 'flagship', 22990000, 17000000,
   N'Xiaomi 14 Pro 256GB, Snapdragon 8 Gen 3, camera Leica, sạc 120W',
   'https://placehold.co/400x400/e94560/fff?text=Xiaomi14Pro',
   '12GB','256GB','6.73 inch LTPO AMOLED','4880 mAh','50MP + 50MP + 50MP (Leica)',
   'Android 14 / HyperOS','Snapdragon 8 Gen 3','Nano SIM + eSIM',
   N'Đen,Trắng,Xanh lá', 18, 1, 1, '2023-12-28'),

(4, N'OPPO Find X7 Pro',
   'OPPO', 'PHY110', 'flagship', 26990000, 20000000,
   N'Find X7 Pro 256GB, Hasselblad camera, sạc SUPERVOOC 100W',
   'https://placehold.co/400x400/533483/fff?text=OPPOFindX7',
   '16GB','256GB','6.82 inch LTPO AMOLED','5000 mAh','50MP + 50MP + 64MP (Hasselblad)',
   'Android 14 / ColorOS 14','Snapdragon 8 Gen 3','Nano SIM + eSIM',
   N'Đen ngọc,Nâu da', 12, 1, 1, '2024-01-03'),

(5, N'Samsung Galaxy A55 5G',
   'Samsung', 'SM-A556B', 'mid-range', 9990000, 7000000,
   N'Galaxy A55 5G 128GB, chip Exynos 1480, camera 50MP OIS',
   'https://placehold.co/400x400/457b9d/fff?text=GalaxyA55',
   '8GB','128GB','6.6 inch Super AMOLED','5000 mAh','50MP + 12MP + 5MP',
   'Android 14 / One UI 6.1','Exynos 1480','Nano SIM + eSIM',
   N'Awesome Iceblue,Awesome Navy,Awesome Lilac', 12, 1, 1, '2024-03-22'),

(6, N'Realme GT 5 Pro',
   'Realme', 'RMX3888', 'mid-range', 14990000, 10500000,
   N'Realme GT 5 Pro 256GB, Snapdragon 8 Gen 2, sạc nhanh 240W',
   'https://placehold.co/400x400/8d99ae/fff?text=RealmeGT5',
   '12GB','256GB','6.78 inch LTPO AMOLED','5400 mAh','50MP + 8MP + 50MP',
   'Android 14 / Realme UI 5.0','Snapdragon 8 Gen 2','Nano SIM + eSIM',
   N'Snow White,Rock Grey', 12, 1, 1, '2023-11-15'),

(7, N'Vivo Y36 5G',
   'Vivo', 'V2309', 'budget', 6490000, 4500000,
   N'Vivo Y36 5G 128GB, chip Snapdragon 695, pin 5000mAh',
   'https://placehold.co/400x400/2b2d42/fff?text=VivoY36',
   '8GB','128GB','6.64 inch IPS LCD','5000 mAh','50MP + 2MP',
   'Android 13 / Funtouch OS 13','Snapdragon 695','Nano SIM',
   N'Xanh dương,Vàng', 12, 1, 2, '2023-10-01'),

(8, N'iPhone 14',
   'Apple', 'MPVR3VN/A', 'flagship', 22990000, 18000000,
   N'iPhone 14 128GB, chip A15 Bionic, camera 12MP Dual',
   'https://placehold.co/400x400/1d3557/fff?text=iPhone14',
   '6GB','128GB','6.1 inch Super Retina XDR','3279 mAh','12MP + 12MP',
   'iOS 17','Apple A15 Bionic','Nano SIM + eSIM',
   N'Đêm tối,Tím,Vàng sao,Xanh dương,Đỏ', 12, 1, 1, '2023-09-16');
SET IDENTITY_INSERT phones OFF;
GO
PRINT N'✅ Đã tạo 8 sản phẩm';

-- ─────────────────────────────────────────────────────────
-- DATA: customers (10 khách hàng)
-- ─────────────────────────────────────────────────────────
SET IDENTITY_INSERT customers ON;
INSERT INTO customers (id, name, phone, email, address, gender, birthday, note, is_active, created_by, created_at) VALUES
(1,  N'Nguyễn Văn An',    '0901111111', 'an.nguyen@gmail.com',   N'15 Lý Tự Trọng, Q.1, TP.HCM',             'male',   '1995-03-12', N'Khách VIP, hay mua iPhone',  1, 2, '2023-07-15'),
(2,  N'Trần Thị Bình',    '0902222222', 'binh.tran@gmail.com',   N'22 Nguyễn Trãi, Q.5, TP.HCM',             'female', '1998-07-25', NULL,                          1, 2, '2023-08-01'),
(3,  N'Lê Hoàng Cường',   '0903333333', 'cuong.le@gmail.com',    N'88 Cộng Hòa, Q.Tân Bình, TP.HCM',         'male',   '1990-11-05', N'Thích Samsung',              1, 3, '2023-08-20'),
(4,  N'Phạm Thị Dung',    '0904444444', 'dung.pham@yahoo.com',   N'34 Đinh Bộ Lĩnh, Q.Bình Thạnh, TP.HCM',  'female', '2000-01-15', NULL,                          1, 2, '2023-09-05'),
(5,  N'Hoàng Văn Em',     '0905555555', 'em.hoang@gmail.com',    N'56 Phan Đăng Lưu, Q.Phú Nhuận, TP.HCM',  'male',   '1988-06-30', N'Mua cho công ty',            1, 3, '2023-09-10'),
(6,  N'Vũ Thị Phượng',    '0906666666', 'phuong.vu@gmail.com',   N'10 Nguyễn Đình Chiểu, Q.3, TP.HCM',       'female', '1997-09-18', NULL,                          1, 2, '2023-10-01'),
(7,  N'Đặng Minh Giang',  '0907777777', 'giang.dang@hotmail.com',N'67 Võ Văn Tần, Q.3, TP.HCM',              'male',   '1993-04-22', N'Hay mua Xiaomi',             1, 3, '2023-10-15'),
(8,  N'Bùi Thị Hoa',      '0908888888', 'hoa.bui@gmail.com',     N'99 Nguyễn Thị Minh Khai, Q.1, TP.HCM',   'female', '2001-12-08', NULL,                          1, 2, '2023-11-01'),
(9,  N'Ngô Quốc Khanh',   '0909999999', 'khanh.ngo@gmail.com',   N'23 Cách Mạng Tháng 8, Q.10, TP.HCM',     'male',   '1985-08-14', N'Khách thân thiết',           1, 3, '2023-11-20'),
(10, N'Đinh Thị Lan Anh', '0910000000', 'lananh.dinh@gmail.com', N'45 Trần Hưng Đạo, Q.1, TP.HCM',           'female', '1999-02-28', NULL,                          1, 2, '2023-12-01');
SET IDENTITY_INSERT customers OFF;
GO
PRINT N'✅ Đã tạo 10 khách hàng';

-- ─────────────────────────────────────────────────────────
-- DATA: inventory (tồn kho ban đầu)
-- ─────────────────────────────────────────────────────────
INSERT INTO inventory (phone_id, quantity, min_quantity, location) VALUES
(1, 25, 5,  N'Kho A - Kệ 1'),
(2, 18, 5,  N'Kho A - Kệ 2'),
(3, 30, 5,  N'Kho A - Kệ 3'),
(4, 12, 5,  N'Kho A - Kệ 4'),
(5, 45, 10, N'Kho B - Kệ 1'),
(6, 20, 5,  N'Kho B - Kệ 2'),
(7, 50, 10, N'Kho B - Kệ 3'),
(8,  8, 5,  N'Kho A - Kệ 1');
GO
PRINT N'✅ Đã tạo tồn kho cho 8 sản phẩm';

-- ─────────────────────────────────────────────────────────
-- DATA: inventory_transactions (lịch sử nhập/xuất)
-- ─────────────────────────────────────────────────────────
INSERT INTO inventory_transactions (phone_id, type, quantity, qty_before, qty_after, reference, note, created_by, created_at) VALUES
-- Nhập kho ban đầu
(1,'import', 30, 0, 30, NULL, N'Nhập kho lần đầu - iPhone 15 Pro Max',    1,'2023-09-22 08:00:00'),
(2,'import', 20, 0, 20, NULL, N'Nhập kho lần đầu - Samsung S24 Ultra',    1,'2024-01-17 08:00:00'),
(3,'import', 35, 0, 35, NULL, N'Nhập kho lần đầu - Xiaomi 14 Pro',        1,'2023-12-28 08:00:00'),
(4,'import', 15, 0, 15, NULL, N'Nhập kho lần đầu - OPPO Find X7 Pro',     1,'2024-01-03 08:00:00'),
(5,'import', 50, 0, 50, NULL, N'Nhập kho lần đầu - Samsung A55',          1,'2024-03-22 08:00:00'),
(6,'import', 25, 0, 25, NULL, N'Nhập kho lần đầu - Realme GT5',           1,'2023-11-15 08:00:00'),
(7,'import', 60, 0, 60, NULL, N'Nhập kho lần đầu - Vivo Y36',             1,'2023-10-01 08:00:00'),
(8,'import', 15, 0, 15, NULL, N'Nhập kho lần đầu - iPhone 14',            1,'2023-09-16 08:00:00'),
-- Xuất theo đơn hàng
(1,'export', -3, 30, 27,'DH001',N'Xuất theo đơn hàng DH001',              2,'2023-10-05 10:30:00'),
(8,'export', -2, 15, 13,'DH002',N'Xuất theo đơn hàng DH002',              2,'2023-10-10 14:00:00'),
(5,'export', -4, 50, 46,'DH003',N'Xuất theo đơn hàng DH003',              3,'2023-11-01 09:15:00'),
(7,'export', -5, 60, 55,'DH004',N'Xuất theo đơn hàng DH004',              3,'2023-11-05 11:00:00'),
(3,'export', -3, 35, 32,'DH005',N'Xuất theo đơn hàng DH005',              2,'2023-12-10 16:30:00'),
(2,'export', -1, 20, 19,'DH006',N'Xuất theo đơn hàng DH006',              3,'2024-01-20 13:45:00'),
(6,'export', -2, 25, 23,'DH007',N'Xuất theo đơn hàng DH007',              2,'2024-01-22 10:00:00'),
-- Nhập bổ sung
(1,'import',  5, 27, 32, NULL, N'Nhập bổ sung iPhone 15 Pro Max',         1,'2023-10-15 08:00:00'),
(7,'import', 10, 55, 65, NULL, N'Nhập bổ sung Vivo Y36',                   1,'2023-11-10 08:00:00'),
-- Điều chỉnh kiểm kê
(8,'adjust', -5, 13,  8, NULL, N'Điều chỉnh sau kiểm kê tháng 12',        1,'2023-12-31 17:00:00'),
(5,'adjust', -1, 46, 45, NULL, N'Hàng lỗi - xuất trả nhà cung cấp',       1,'2024-01-05 09:00:00'),
(3,'import',  5, 32, 37, NULL, N'Nhập bổ sung Xiaomi 14 Pro',              1,'2024-01-08 08:00:00'),
(3,'export', -7, 37, 30,'DH008',N'Xuất theo đơn hàng DH008',              2,'2024-01-25 15:00:00');
GO
PRINT N'✅ Đã tạo lịch sử kho';

-- ─────────────────────────────────────────────────────────
-- DATA: orders (8 đơn hàng)
-- ─────────────────────────────────────────────────────────
SET IDENTITY_INSERT orders ON;
INSERT INTO orders (id, order_code, customer_id, customer_name, customer_phone, customer_email, customer_addr, total_amount, discount, final_amount, status, payment_method, payment_status, note, created_by, created_at) VALUES
(1,'DH001',1,N'Nguyễn Văn An',    '0901111111','an.nguyen@gmail.com',   N'15 Lý Tự Trọng, Q.1, TP.HCM',          104970000,5000000, 99970000,'completed','transfer','paid',  N'Giao tận nơi buổi chiều',        2,'2023-10-05 10:00:00'),
(2,'DH002',3,N'Lê Hoàng Cường',   '0903333333','cuong.le@gmail.com',    N'88 Cộng Hòa, Q.Tân Bình, TP.HCM',       45980000,      0, 45980000,'completed','cash',    'paid',  NULL,                              2,'2023-10-10 13:30:00'),
(3,'DH003',5,N'Hoàng Văn Em',     '0905555555','em.hoang@gmail.com',    N'56 Phan Đăng Lưu, Q.Phú Nhuận, TP.HCM', 39960000,2000000, 37960000,'completed','card',    'paid',  N'Mua cho 4 nhân viên công ty',    3,'2023-11-01 09:00:00'),
(4,'DH004',7,N'Đặng Minh Giang',  '0907777777','giang.dang@hotmail.com',N'67 Võ Văn Tần, Q.3, TP.HCM',             32450000,      0, 32450000,'completed','transfer','paid',  NULL,                              3,'2023-11-05 10:30:00'),
(5,'DH005',2,N'Trần Thị Bình',    '0902222222','binh.tran@gmail.com',   N'22 Nguyễn Trãi, Q.5, TP.HCM',            68970000,3000000, 65970000,'completed','cash',    'paid',  NULL,                              2,'2023-12-10 16:00:00'),
(6,'DH006',9,N'Ngô Quốc Khanh',  '0909999999','khanh.ngo@gmail.com',   N'23 CMT8, Q.10, TP.HCM',                  31990000,1000000, 30990000,'completed','transfer','paid',  N'Khách thân thiết giảm thêm',     3,'2024-01-20 13:00:00'),
(7,'DH007',4,N'Phạm Thị Dung',    '0904444444','dung.pham@yahoo.com',   N'34 Đinh Bộ Lĩnh, Q.Bình Thạnh, TP.HCM', 29980000,      0, 29980000,'delivering','cash',  'unpaid',NULL,                              2,'2024-01-22 09:30:00'),
(8,'DH008',6,N'Vũ Thị Phượng',    '0906666666','phuong.vu@gmail.com',   N'10 Nguyễn Đình Chiểu, Q.3, TP.HCM',    160930000,10000000,150930000,'pending','transfer','unpaid',N'Đơn số lượng lớn, chờ xác nhận', 3,'2024-01-25 14:30:00');
SET IDENTITY_INSERT orders OFF;
GO
PRINT N'✅ Đã tạo 8 đơn hàng';

-- ─────────────────────────────────────────────────────────
-- DATA: order_items
-- ─────────────────────────────────────────────────────────
INSERT INTO order_items (order_id, phone_id, phone_name, phone_brand, quantity, unit_price, subtotal) VALUES
(1, 1, N'iPhone 15 Pro Max',        'Apple',   3, 34990000, 104970000),
(2, 8, N'iPhone 14',                'Apple',   2, 22990000,  45980000),
(3, 5, N'Samsung Galaxy A55 5G',    'Samsung', 4,  9990000,  39960000),
(4, 7, N'Vivo Y36 5G',              'Vivo',    5,  6490000,  32450000),
(5, 1, N'iPhone 15 Pro Max',        'Apple',   1, 34990000,  34990000),
(5, 3, N'Xiaomi 14 Pro',            'Xiaomi',  2, 22990000,  45980000),
(6, 2, N'Samsung Galaxy S24 Ultra', 'Samsung', 1, 31990000,  31990000),
(7, 6, N'Realme GT 5 Pro',          'Realme',  2, 14990000,  29980000),
(8, 3, N'Xiaomi 14 Pro',            'Xiaomi',  7, 22990000, 160930000);
GO
PRINT N'✅ Đã tạo chi tiết đơn hàng';

-- ─────────────────────────────────────────────────────────
-- DATA: invoices (hóa đơn cho đơn đã hoàn thành)
-- ─────────────────────────────────────────────────────────
SET IDENTITY_INSERT invoices ON;
INSERT INTO invoices (id, invoice_code, order_id, customer_id, customer_name, customer_phone, customer_addr, subtotal, discount, tax_rate, tax_amount, total, payment_method, payment_status, paid_at, note, created_by, created_at) VALUES
(1,'HD001',1,1,N'Nguyễn Văn An',   '0901111111',N'15 Lý Tự Trọng, Q.1, TP.HCM',         104970000,5000000,0,0, 99970000,'transfer','paid','2023-10-05 15:00:00',NULL,               2,'2023-10-05 15:00:00'),
(2,'HD002',2,3,N'Lê Hoàng Cường',  '0903333333',N'88 Cộng Hòa, Q.Tân Bình, TP.HCM',      45980000,      0,0,0, 45980000,'cash',    'paid','2023-10-10 14:30:00',NULL,               2,'2023-10-10 14:30:00'),
(3,'HD003',3,5,N'Hoàng Văn Em',    '0905555555',N'56 Phan Đăng Lưu, Q.Phú Nhuận, TP.HCM', 39960000,2000000,0,0,37960000,'card',    'paid','2023-11-01 11:00:00',N'Mua cho công ty', 3,'2023-11-01 11:00:00'),
(4,'HD004',4,7,N'Đặng Minh Giang', '0907777777',N'67 Võ Văn Tần, Q.3, TP.HCM',             32450000,      0,0,0, 32450000,'transfer','paid','2023-11-05 11:30:00',NULL,               3,'2023-11-05 11:30:00'),
(5,'HD005',5,2,N'Trần Thị Bình',   '0902222222',N'22 Nguyễn Trãi, Q.5, TP.HCM',            68970000,3000000,0,0, 65970000,'cash',    'paid','2023-12-10 17:00:00',NULL,               2,'2023-12-10 17:00:00'),
(6,'HD006',6,9,N'Ngô Quốc Khanh', '0909999999',N'23 CMT8, Q.10, TP.HCM',                  31990000,1000000,0,0, 30990000,'transfer','paid','2024-01-20 14:00:00',N'Khách thân thiết',3,'2024-01-20 14:00:00');
SET IDENTITY_INSERT invoices OFF;
GO
PRINT N'✅ Đã tạo 6 hóa đơn';

-- ─────────────────────────────────────────────────────────
-- DATA: invoice_items
-- ─────────────────────────────────────────────────────────
INSERT INTO invoice_items (invoice_id, phone_id, phone_name, phone_brand, quantity, unit_price, subtotal) VALUES
(1, 1, N'iPhone 15 Pro Max',        'Apple',   3, 34990000, 104970000),
(2, 8, N'iPhone 14',                'Apple',   2, 22990000,  45980000),
(3, 5, N'Samsung Galaxy A55 5G',    'Samsung', 4,  9990000,  39960000),
(4, 7, N'Vivo Y36 5G',              'Vivo',    5,  6490000,  32450000),
(5, 1, N'iPhone 15 Pro Max',        'Apple',   1, 34990000,  34990000),
(5, 3, N'Xiaomi 14 Pro',            'Xiaomi',  2, 22990000,  45980000),
(6, 2, N'Samsung Galaxy S24 Ultra', 'Samsung', 1, 31990000,  31990000);
GO
PRINT N'✅ Đã tạo chi tiết hóa đơn';

-- ─────────────────────────────────────────────────────────
-- DATA: reports (báo cáo định kỳ)
-- ─────────────────────────────────────────────────────────
INSERT INTO reports (type, title, period_from, period_to, total_orders, completed_orders, cancelled_orders, total_revenue, total_cost, gross_profit, total_items_sold, new_customers, created_by, created_at) VALUES
('monthly',N'Báo cáo tháng 10/2023','2023-10-01','2023-10-31', 2,2,0, 145950000,112000000, 33950000, 5,2,1,'2023-11-01'),
('monthly',N'Báo cáo tháng 11/2023','2023-11-01','2023-11-30', 2,2,0,  70410000, 54000000, 16410000, 9,2,1,'2023-12-01'),
('monthly',N'Báo cáo tháng 12/2023','2023-12-01','2023-12-31', 1,1,0,  65970000, 52000000, 13970000, 3,1,1,'2024-01-01'),
('monthly',N'Báo cáo tháng 01/2024','2024-01-01','2024-01-31', 3,1,0, 211920000,163000000, 48920000, 9,2,1,'2024-02-01'),
('yearly', N'Báo cáo năm 2023',     '2023-01-01','2023-12-31', 5,5,0, 282330000,218000000, 64330000,17,8,1,'2024-01-05');
GO
PRINT N'✅ Đã tạo 5 báo cáo';

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
PRINT N'';
PRINT N'══════════════════════════════════════════════';
PRINT N'       THỐNG KÊ DỮ LIỆU ĐÃ TẠO';
PRINT N'══════════════════════════════════════════════';

SELECT
    TenBang        = N'users (Nhân viên / Quản lý)',
    SoBanGhi       = COUNT(*) FROM users
UNION ALL SELECT N'phones (Sản phẩm)',             COUNT(*) FROM phones
UNION ALL SELECT N'customers (Khách hàng)',         COUNT(*) FROM customers
UNION ALL SELECT N'inventory (Tồn kho)',            COUNT(*) FROM inventory
UNION ALL SELECT N'inventory_transactions (Lịch sử kho)', COUNT(*) FROM inventory_transactions
UNION ALL SELECT N'orders (Đơn hàng)',              COUNT(*) FROM orders
UNION ALL SELECT N'order_items (Chi tiết đơn)',     COUNT(*) FROM order_items
UNION ALL SELECT N'invoices (Hóa đơn)',             COUNT(*) FROM invoices
UNION ALL SELECT N'invoice_items (Chi tiết HĐ)',    COUNT(*) FROM invoice_items
UNION ALL SELECT N'reports (Báo cáo)',              COUNT(*) FROM reports;

PRINT N'';
PRINT N'── DOANH THU ĐÃ THANH TOÁN ──';
SELECT DoanhThu = FORMAT(SUM(total), 'N0') + N' VND'
FROM invoices WHERE payment_status = 'paid';

PRINT N'';
PRINT N'── SẢN PHẨM SẮP HẾT HÀNG (tồn <= ngưỡng) ──';
SELECT
    p.name          AS TenSanPham,
    i.quantity      AS TonKho,
    i.min_quantity  AS NgưỡngToiThieu,
    i.location      AS ViTri
FROM inventory i
JOIN phones p ON p.id = i.phone_id
WHERE i.quantity <= i.min_quantity;

PRINT N'';
PRINT N'══════════════════════════════════════════════';
PRINT N'  TÀI KHOẢN ĐĂNG NHẬP MẪU';
PRINT N'  admin@phonestore.vn   → Admin@123   (Quản lý)';
PRINT N'  lan.tran@phonestore.vn → Nhanvien@1 (Nhân viên)';
PRINT N'  hung.le@phonestore.vn  → Nhanvien@1 (Nhân viên)';
PRINT N'══════════════════════════════════════════════';
GO

-- ============================================================
--  SCRIPT TẠO 5 VIEW
--  HỆ THỐNG QUẢN LÝ CỬA HÀNG ĐIỆN THOẠI
--  Dán vào CUỐI file script gốc (sau dòng PRINT báo cáo cuối)
--  hoặc chạy riêng sau khi đã chạy script tạo bảng
-- ============================================================

USE phone_store;
GO

-- ============================================================
-- VIEW 1: vw_ton_kho
-- Tồn kho hiện tại + cảnh báo sắp hết hàng
-- Dùng cho: màn hình Quản lý kho
-- ============================================================
CREATE VIEW vw_ton_kho AS
SELECT
    p.id                AS phone_id,
    p.name              AS ten_san_pham,
    p.brand             AS thuong_hieu,
    p.category          AS phan_khuc,
    p.price             AS gia_ban,
    i.quantity          AS ton_kho,
    i.min_quantity      AS nguong_toi_thieu,
    i.location          AS vi_tri,
    CASE
        WHEN i.quantity = 0             THEN N'Hết hàng'
        WHEN i.quantity <= i.min_quantity THEN N'Sắp hết'
        ELSE N'Còn hàng'
    END                 AS trang_thai_kho,
    i.updated_at        AS cap_nhat_luc
FROM inventory i
JOIN phones p ON p.id = i.phone_id
WHERE p.is_active = 1;
GO
PRINT N'✅ Đã tạo vw_ton_kho';
GO

-- ============================================================
-- VIEW 2: vw_don_hang_chi_tiet
-- Danh sách đơn hàng kèm tên nhân viên xử lý + số sản phẩm
-- Dùng cho: màn hình Quản lý đơn hàng
-- ============================================================
CREATE VIEW vw_don_hang_chi_tiet AS
SELECT
    o.id                AS don_hang_id,
    o.order_code        AS ma_don_hang,
    o.customer_name     AS ten_khach_hang,
    o.customer_phone    AS sdt_khach,
    o.customer_addr     AS dia_chi_giao,
    o.total_amount      AS tong_tien_goc,
    o.discount          AS giam_gia,
    o.final_amount      AS thanh_tien,
    o.status            AS trang_thai_don,
    o.payment_method    AS phuong_thuc_thanh_toan,
    o.payment_status    AS trang_thai_thanh_toan,
    u.name              AS nhan_vien_xu_ly,
    COUNT(oi.id)        AS so_loai_sp,
    SUM(oi.quantity)    AS tong_so_luong,
    o.note              AS ghi_chu,
    o.created_at        AS ngay_dat_hang
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN users u        ON u.id = o.created_by
GROUP BY
    o.id, o.order_code, o.customer_name, o.customer_phone,
    o.customer_addr, o.total_amount, o.discount, o.final_amount,
    o.status, o.payment_method, o.payment_status,
    u.name, o.note, o.created_at;
GO
PRINT N'✅ Đã tạo vw_don_hang_chi_tiet';
GO

-- ============================================================
-- VIEW 3: vw_doanh_thu_theo_thang
-- Tổng doanh thu + lợi nhuận từng tháng từ hóa đơn đã thanh toán
-- Dùng cho: màn hình Báo cáo / Dashboard
-- ============================================================
CREATE VIEW vw_doanh_thu_theo_thang AS
SELECT
    YEAR(i.paid_at)                     AS nam,
    MONTH(i.paid_at)                    AS thang,
    COUNT(DISTINCT i.id)                AS so_hoa_don,
    SUM(i.subtotal)                     AS doanh_thu_goc,
    SUM(i.discount)                     AS tong_giam_gia,
    SUM(i.total)                        AS doanh_thu_thuc,
    SUM(ii.quantity * p.import_price)   AS tong_von,
    SUM(i.total) - SUM(ii.quantity * p.import_price) AS loi_nhuan_gop,
    SUM(ii.quantity)                    AS tong_sp_da_ban
FROM invoices i
JOIN invoice_items ii ON ii.invoice_id = i.id
JOIN phones p          ON p.id = ii.phone_id
WHERE i.payment_status = 'paid'
GROUP BY YEAR(i.paid_at), MONTH(i.paid_at);
GO
PRINT N'✅ Đã tạo vw_doanh_thu_theo_thang';
GO

-- ============================================================
-- VIEW 4: vw_san_pham_ban_chay
-- Top sản phẩm bán nhiều nhất (từ hóa đơn đã thanh toán)
-- Dùng cho: Dashboard / Báo cáo sản phẩm
-- ============================================================
CREATE VIEW vw_san_pham_ban_chay AS
SELECT
    p.id                            AS phone_id,
    p.name                          AS ten_san_pham,
    p.brand                         AS thuong_hieu,
    p.category                      AS phan_khuc,
    p.price                         AS gia_ban,
    p.import_price                  AS gia_nhap,
    SUM(ii.quantity)                AS tong_so_luong_ban,
    SUM(ii.subtotal)                AS tong_doanh_thu,
    SUM(ii.quantity * p.import_price) AS tong_von,
    SUM(ii.subtotal) - SUM(ii.quantity * p.import_price) AS loi_nhuan,
    COUNT(DISTINCT ii.invoice_id)   AS so_hoa_don_co_sp,
    inv.quantity                    AS ton_kho_hien_tai
FROM invoice_items ii
JOIN phones p    ON p.id = ii.phone_id
JOIN invoices i  ON i.id = ii.invoice_id AND i.payment_status = 'paid'
JOIN inventory inv ON inv.phone_id = p.id
GROUP BY
    p.id, p.name, p.brand, p.category,
    p.price, p.import_price, inv.quantity;
GO
PRINT N'✅ Đã tạo vw_san_pham_ban_chay';
GO

-- ============================================================
-- VIEW 5: vw_khach_hang_tong_hop
-- Thông tin khách hàng + tổng số đơn + tổng chi tiêu
-- Dùng cho: màn hình Quản lý khách hàng / CRM
-- ============================================================
CREATE VIEW vw_khach_hang_tong_hop AS
SELECT
    c.id                            AS customer_id,
    c.name                          AS ten_khach_hang,
    c.phone                         AS so_dien_thoai,
    c.email,
    c.address                       AS dia_chi,
    c.gender                        AS gioi_tinh,
    c.birthday                      AS ngay_sinh,
    c.note                          AS ghi_chu,
    COUNT(DISTINCT o.id)            AS tong_so_don,
    SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS don_hoan_thanh,
    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS don_huy,
    ISNULL(SUM(CASE WHEN o.status = 'completed' THEN o.final_amount END), 0) AS tong_chi_tieu,
    MAX(o.created_at)               AS lan_mua_cuoi,
    c.created_at                    AS ngay_dang_ky
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.is_active = 1
GROUP BY
    c.id, c.name, c.phone, c.email, c.address,
    c.gender, c.birthday, c.note, c.created_at;
GO
PRINT N'✅ Đã tạo vw_khach_hang_tong_hop';
GO

-- ============================================================
-- KIỂM TRA: Thử SELECT từng view
-- ============================================================
PRINT N'';
PRINT N'── KIỂM TRA 5 VIEW ──';

SELECT N'vw_ton_kho' AS View_Name, COUNT(*) AS So_Ban_Ghi FROM vw_ton_kho
UNION ALL
SELECT N'vw_don_hang_chi_tiet',    COUNT(*) FROM vw_don_hang_chi_tiet
UNION ALL
SELECT N'vw_doanh_thu_theo_thang', COUNT(*) FROM vw_doanh_thu_theo_thang
UNION ALL
SELECT N'vw_san_pham_ban_chay',    COUNT(*) FROM vw_san_pham_ban_chay
UNION ALL
SELECT N'vw_khach_hang_tong_hop',  COUNT(*) FROM vw_khach_hang_tong_hop;
GO

PRINT N'✅ Tất cả 5 view hoạt động bình thường!';
GO-- ============================================================
--  FIX: Đổi tên admin + Reset mật khẩu tất cả tài khoản
--  Mở SSMS → chọn database phone_store → New Query → Execute
-- ============================================================
USE phone_store;
GO

-- 1. Đổi tên admin
UPDATE users SET name = N'Nguyễn Thị Tuyết' WHERE email = 'admin@phonestore.vn';

-- 2. Reset mật khẩu đúng
--    admin@phonestore.vn   → Admin@123
UPDATE users
SET password = '$2a$10$8n6h3st3csZ3r2gLVK6Cp.cCnrlGEAviykgLyI/VS/r6olsr5Osh2'
WHERE email = 'admin@phonestore.vn';

--    nhân viên             → Nhanvien@1
UPDATE users
SET password = '$2a$10$t1ynyq5TKzG523Yheiw8gu339DFbwLX7gA9HCR.HVZaAW.ngl4B6O'
WHERE email IN ('lan.tran@phonestore.vn','hung.le@phonestore.vn','mai.pham@phonestore.vn');

PRINT N'✅ Xong!';
PRINT N'   admin@phonestore.vn    →  Admin@123     (tên: Nguyễn Thị Tuyết)';
PRINT N'   lan.tran@phonestore.vn →  Nhanvien@1';
PRINT N'   hung.le@phonestore.vn  →  Nhanvien@1';
GO