# Thống kê lượt xem không cookie (GoatCounter) — 17/11/2026

## Đếm gì (và KHÔNG đếm gì)
| Sự kiện | Ý nghĩa |
|---|---|
| `/` · Mở trang chào | lượt mở website |
| `bat-dau-tham-quan` | bấm “Bắt đầu tham quan” |
| `vao-phong` | vào được phòng 3D (qua màn chờ) |
| `xem-ho-so` | mở một hồ sơ (KHÔNG ghi là hồ sơ của ai) |
| `tra-cuu` | mở danh sách tra cứu |
| `xem-trinh-chieu` | xem ảnh trình chiếu toàn màn hình |
| `/tri-an/` · Trang lưu ảnh | quét mã QR / mở trang lưu ảnh tri ân |

Không cookie, không localStorage, không tải mã bên thứ ba, không gửi nguồn truy cập / cỡ màn hình / họ tên.
GoatCounter không lưu IP (chỉ mã băm tạm theo ngày để đếm “người xem khác nhau”). Người bật “Do Not Track”/GPC: không đếm.
Máy quản trị (localhost / 127.0.0.1) và bản chạy thử: không đếm. Đã kiểm bằng Chrome (17/11): đúng 4 lượt gửi cho một lượt tham quan, 0 cookie.

## Bật (nhà trường tự làm — cần một tài khoản)
1. Vào https://www.goatcounter.com/signup — chọn **Code** (tên trang), ví dụ `thcs-chuvanan-ptt`; nhập email, mật khẩu của nhà trường.
2. Báo mã đó cho người phụ trách kỹ thuật: điền vào `src/data/analytics.ts` (`GOATCOUNTER_CODE='…'`) **và** `public/tri-an/index.html` (`var CODE='…'`) — kiểm thử bắt buộc hai mã trùng nhau.
3. Đẩy lên GitHub. Xem báo cáo tại `https://<mã>.goatcounter.com` (theo ngày/tuần/tháng; Export → CSV để làm báo cáo).
   Trong Settings có thể bật “public dashboard” nếu muốn ban giám hiệu xem không cần đăng nhập.
