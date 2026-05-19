-- ============================================================
-- SEED: 20 sản phẩm điện thoại mới cho PhoneStore
-- Chạy trên SQL Server Management Studio hoặc Azure Data Studio
-- Lưu ý: đảm bảo đã có ít nhất 1 user admin trong bảng users
-- ============================================================

DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE role = 'admin' ORDER BY id);
DECLARE @pid INT;

-- ════════════════════════════════════════════
-- 🍎 APPLE (5 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'iPhone 16 Pro Max','Apple','A3293','flagship',39990000,32000000,
  N'8GB',N'256GB',N'6.9 inch Super Retina XDR OLED',N'4685 mAh',
  N'48MP (chính) + 12MP (góc rộng) + 12MP (tele 5x)',N'iOS 18','Apple A18 Pro',
  N'Nano SIM + eSIM',N'Titan Đen, Titan Trắng, Titan Sa Mạc, Titan Tự Nhiên',
  12,1,@admin_id,
  N'iPhone 16 Pro Max – Đỉnh cao công nghệ Apple 2024. Chip A18 Pro mạnh nhất từ trước đến nay, camera 48MP zoom quang 5x, màn hình OLED 6.9 inch sáng nhất lịch sử iPhone.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,12);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'iPhone 16 Pro','Apple','A3292','flagship',29990000,24000000,
  N'8GB',N'128GB',N'6.3 inch Super Retina XDR OLED',N'3582 mAh',
  N'48MP + 12MP + 12MP',N'iOS 18','Apple A18 Pro',
  N'Nano SIM + eSIM',N'Titan Đen, Titan Trắng, Titan Sa Mạc, Titan Tự Nhiên',
  12,1,@admin_id,
  N'iPhone 16 Pro – Kích thước gọn nhẹ hơn Pro Max, sức mạnh A18 Pro tương đương, lý tưởng cho người dùng thích màn hình nhỏ hơn.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,18);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'iPhone 15 Pro Max','Apple','A3106','flagship',34990000,28000000,
  N'8GB',N'256GB',N'6.7 inch Super Retina XDR OLED',N'4422 mAh',
  N'48MP + 12MP + 12MP',N'iOS 17','Apple A17 Pro',
  N'Nano SIM + eSIM',N'Titan Đen, Titan Trắng, Titan Xanh, Titan Tự Nhiên',
  12,1,@admin_id,
  N'iPhone 15 Pro Max – Camera tiên tiến nhất iPhone 2023, cổng USB-C tiêu chuẩn, khung Titan siêu nhẹ bền bỉ.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,10);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'iPhone 15','Apple','A3090','flagship',22990000,18500000,
  N'6GB',N'128GB',N'6.1 inch Super Retina XDR OLED',N'3349 mAh',
  N'48MP + 12MP',N'iOS 17','Apple A16 Bionic',
  N'Nano SIM + eSIM',N'Đen, Hồng, Vàng, Xanh Dương, Xanh Lá',
  12,1,@admin_id,
  N'iPhone 15 – Nâng cấp đột phá với cổng Dynamic Island và USB-C, camera chính 48MP sắc nét.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,22);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'iPhone 14','Apple','A2882','mid-range',17990000,14000000,
  N'6GB',N'128GB',N'6.1 inch Super Retina XDR OLED',N'3279 mAh',
  N'12MP + 12MP',N'iOS 16','Apple A15 Bionic',
  N'Nano SIM + eSIM',N'Đen, Tím, Đỏ, Vàng, Xanh Dương',
  12,1,@admin_id,
  N'iPhone 14 – Lựa chọn tầm trung hoàn hảo của Apple, hiệu năng mạnh mẽ với A15 Bionic, camera nâng cấp đáng kể.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,3);

-- ════════════════════════════════════════════
-- 📱 SAMSUNG (6 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy S25 Ultra','Samsung','SM-S938B','flagship',33990000,27000000,
  N'12GB',N'256GB',N'6.9 inch Dynamic AMOLED 2X',N'5000 mAh',
  N'200MP + 10MP + 50MP + 12MP',N'Android 15 / One UI 7','Snapdragon 8 Elite',
  N'Nano SIM + eSIM',N'Titan Đen, Titan Xanh, Titan Bạc, Titan Trắng',
  12,1,@admin_id,
  N'Galaxy S25 Ultra – Camera 200MP hàng đầu thế giới, S Pen tích hợp, AI Galaxy thông minh, thiết kế Titan cao cấp.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,8);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy S24 FE','Samsung','SM-S721B','flagship',15990000,12500000,
  N'8GB',N'128GB',N'6.7 inch Dynamic AMOLED 2X',N'4700 mAh',
  N'50MP + 10MP + 8MP',N'Android 14 / One UI 6.1','Exynos 2400e',
  N'Nano SIM + eSIM',N'Xanh Cobalt, Xanh Mint, Tím Xám, Vàng',
  12,1,@admin_id,
  N'Galaxy S24 FE – Fan Edition với màn hình 6.7 inch to rộng, chip Exynos mạnh mẽ, giá thành tốt hơn S24 tiêu chuẩn.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,20);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy A56','Samsung','SM-A566B','mid-range',10990000,8500000,
  N'8GB',N'128GB',N'6.7 inch Super AMOLED',N'5000 mAh',
  N'50MP + 12MP + 5MP',N'Android 15 / One UI 7','Exynos 1580',
  N'Nano SIM',N'Xanh Dương, Hồng Đào, Xanh Lá, Đen',
  12,1,@admin_id,
  N'Galaxy A56 – Tầm trung cao cấp với màn hình AMOLED 120Hz, camera 50MP, thiết kế sang trọng như dòng S.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,35);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy A36','Samsung','SM-A366B','mid-range',8490000,6500000,
  N'8GB',N'128GB',N'6.7 inch Super AMOLED',N'5000 mAh',
  N'50MP + 8MP + 5MP',N'Android 15 / One UI 7','Snapdragon 6 Gen 3',
  N'Nano SIM',N'Trắng Ngà, Xanh Băng, Đen Ám',
  12,1,@admin_id,
  N'Galaxy A36 – Hiệu năng mạnh mẽ với Snapdragon 6 Gen 3, màn hình AMOLED sắc nét, pin 5000mAh cả ngày không lo hết.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,28);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy A16 5G','Samsung','SM-A166B','budget',5490000,4200000,
  N'4GB',N'128GB',N'6.7 inch PLS LCD',N'5000 mAh',
  N'50MP + 5MP + 2MP',N'Android 14 / One UI 6','MediaTek Dimensity 6300',
  N'Nano SIM',N'Đen Bóng, Vàng Ánh, Xanh Nhạt',
  12,1,@admin_id,
  N'Galaxy A16 5G – Smartphone 5G giá tốt nhất của Samsung, màn hình to 6.7 inch, pin trâu, phù hợp dùng hàng ngày.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,45);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Samsung Galaxy M35','Samsung','SM-M356B','mid-range',7490000,5800000,
  N'8GB',N'128GB',N'6.6 inch Super AMOLED',N'6000 mAh',
  N'50MP + 8MP + 2MP',N'Android 14 / One UI 6','Exynos 1380',
  N'Nano SIM',N'Xanh Dương Đậm, Xám Nhạt, Nâu Đất',
  12,1,@admin_id,
  N'Galaxy M35 – Pin khủng 6000mAh siêu bền, màn hình AMOLED 120Hz, camera AI thông minh, giá sinh viên.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,30);

-- ════════════════════════════════════════════
-- 🔵 XIAOMI (3 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Xiaomi 14T Pro','Xiaomi','23127PN0CC','flagship',18990000,15000000,
  N'12GB',N'256GB',N'6.67 inch AMOLED',N'5000 mAh',
  N'50MP + 50MP + 12MP',N'Android 14 / HyperOS','MediaTek Dimensity 9300+',
  N'Nano SIM',N'Titan Đen, Titan Xám, Titan Xanh',
  12,1,@admin_id,
  N'Xiaomi 14T Pro – Flagship cộng tác với Leica, camera chuyên nghiệp 50MP, chip Dimensity 9300+ cực mạnh, sạc nhanh 120W.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,14);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Xiaomi Redmi Note 14 Pro+','Xiaomi','24116RA7EI','mid-range',9490000,7200000,
  N'12GB',N'256GB',N'6.67 inch AMOLED',N'5110 mAh',
  N'200MP + 8MP + 2MP',N'Android 14 / HyperOS','MediaTek Dimensity 1400 Ultra',
  N'Nano SIM',N'Đen, Trắng Ngọc, Xanh Băng',
  12,1,@admin_id,
  N'Redmi Note 14 Pro+ – Camera 200MP đột phá, sạc siêu nhanh 90W, màn hình AMOLED 120Hz, hiệu năng vượt trội tầm giá.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,25);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Xiaomi Redmi 14C','Xiaomi','24120RN82I','budget',3490000,2600000,
  N'4GB',N'128GB',N'6.88 inch IPS LCD',N'5160 mAh',
  N'50MP + 0.08MP',N'Android 14 / HyperOS','MediaTek Helio G85',
  N'Nano SIM',N'Xanh Xương Rồng, Tím Oải Hương, Đen',
  12,1,@admin_id,
  N'Redmi 14C – Giá siêu rẻ nhưng pin khủng 5160mAh, màn hình 6.88 inch to nhất tầm giá, lựa chọn tiết kiệm tốt nhất.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,50);

-- ════════════════════════════════════════════
-- 🟢 OPPO (3 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'OPPO Find X8 Pro','OPPO','PJD110','flagship',27990000,22000000,
  N'16GB',N'512GB',N'6.78 inch AMOLED LTPO',N'5910 mAh',
  N'50MP + 50MP + 3x50MP',N'Android 15 / ColorOS 15','MediaTek Dimensity 9400',
  N'Nano SIM + eSIM',N'Đen Vũ Trụ, Trắng Ngọc Trai',
  12,1,@admin_id,
  N'OPPO Find X8 Pro – Flagship đỉnh cao với camera Hasselblad chuyên nghiệp, sạc không dây 50W, màn LTPO 120Hz siêu mượt.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,7);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'OPPO Reno 13','OPPO','CPH2661','mid-range',10990000,8500000,
  N'8GB',N'256GB',N'6.59 inch AMOLED',N'5600 mAh',
  N'50MP + 8MP + 2MP',N'Android 15 / ColorOS 15','MediaTek Dimensity 8350',
  N'Nano SIM',N'Xanh Lưu Ly, Xám Khói, Hồng Cẩm Thạch',
  12,1,@admin_id,
  N'OPPO Reno 13 – Thiết kế thời trang nhất tầm giá, camera AI OPPO thông minh, sạc nhanh SuperVOOC 80W.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,22);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'OPPO A3 Pro','OPPO','CPH2579','mid-range',6990000,5300000,
  N'8GB',N'256GB',N'6.67 inch AMOLED',N'5000 mAh',
  N'50MP + 2MP',N'Android 14 / ColorOS 14.1','MediaTek Dimensity 6300',
  N'Nano SIM',N'Tím Ánh Sáng, Xanh Ngân Hà, Đen',
  12,1,@admin_id,
  N'OPPO A3 Pro – Tầm trung nhẹ nhàng với màn hình AMOLED, chống nước IP65, pin 5000mAh chuẩn chỉnh.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,32);

-- ════════════════════════════════════════════
-- 🟣 VIVO (2 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Vivo V40','Vivo','V2352','mid-range',12490000,9500000,
  N'8GB',N'256GB',N'6.78 inch AMOLED',N'5500 mAh',
  N'50MP + 50MP + 2MP',N'Android 14 / FunTouch OS 14','Snapdragon 7 Gen 3',
  N'Nano SIM',N'Xanh Peacock, Đen Garnet, Hồng Lotus',
  12,1,@admin_id,
  N'Vivo V40 – Camera cộng tác với ZEISS chuyên nghiệp, màn hình AMOLED cong tinh tế, sạc FlashCharge 80W cực nhanh.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,18);

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Vivo Y300 GT','Vivo','V2353','mid-range',6490000,4900000,
  N'8GB',N'128GB',N'6.77 inch AMOLED',N'6500 mAh',
  N'50MP + 2MP',N'Android 14 / FunTouch OS 14','Snapdragon 695 5G',
  N'Nano SIM',N'Đen Bóng, Vàng Ánh Kim, Xanh Ngọc',
  12,1,@admin_id,
  N'Vivo Y300 GT – Pin siêu khủng 6500mAh kỷ lục, 5G giá rẻ, màn hình AMOLED sáng đẹp, hiệu năng tốt mọi tác vụ.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,40);

-- ════════════════════════════════════════════
-- 🟡 REALME (1 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Realme GT 6T','Realme','RMX3853','mid-range',13490000,10500000,
  N'12GB',N'256GB',N'6.78 inch AMOLED',N'5500 mAh',
  N'50MP + 8MP',N'Android 14 / realme UI 5.0','Snapdragon 7+ Gen 3',
  N'Nano SIM',N'Xanh Titan, Đen Tuyền, Cam Nắng',
  12,1,@admin_id,
  N'Realme GT 6T – Flagship killer thực thụ: Snapdragon 7+ Gen 3 cực mạnh, sạc 120W siêu nhanh, gaming performance đỉnh cao tầm giá.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,16);

-- ════════════════════════════════════════════
-- ⚫ NOKIA (1 sản phẩm)
-- ════════════════════════════════════════════

INSERT INTO phones (name,brand,model,category,price,import_price,ram,storage,screen,battery,camera,os,chip,sim,colors,warranty,is_active,created_by,description)
VALUES (N'Nokia G42 5G','Nokia','TA-1581','budget',4290000,3200000,
  N'6GB',N'128GB',N'6.56 inch IPS LCD',N'5000 mAh',
  N'50MP + 2MP + 2MP',N'Android 13','Snapdragon 480+',
  N'Nano SIM',N'Xanh Dương, Tím Hoa Cà, Xám',
  24,1,@admin_id,
  N'Nokia G42 5G – Bảo hành 24 tháng, Android thuần túy, 5G tốc độ cao, thiết kế Nokia bền bỉ đáng tin cậy.');
SET @pid = SCOPE_IDENTITY(); INSERT INTO inventory (phone_id,quantity) VALUES (@pid,2);

-- ════════════════════════════════════════════
-- Xác nhận kết quả
-- ════════════════════════════════════════════
SELECT
  p.id,
  p.name,
  p.brand,
  p.category,
  FORMAT(p.price, 'N0') + N' ₫' AS gia_ban,
  i.quantity AS ton_kho
FROM phones p
INNER JOIN inventory i ON i.phone_id = p.id
ORDER BY p.id DESC;
