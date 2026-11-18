/** 18/11 (iPhone: “Đã có sự cố xảy ra liên tục” — Safari đóng trang vì hết bộ nhớ khi vào phòng).
 * Điện thoại (màn nhỏ + cảm ứng) dùng ngân sách bộ nhớ riêng: ảnh/chữ vẽ bằng canvas nhỏ hơn, khung đứng yên ≤ 2×.
 * Đo trên iPhone 14 giả lập: trước khi sửa ≈ 212–255 MB canvas (chưa kể bản sao trên GPU). */
export const PHONE=(()=>{try{return Math.min(screen.width,screen.height)<600&&matchMedia('(pointer:coarse)').matches;}catch{return false;}})();
