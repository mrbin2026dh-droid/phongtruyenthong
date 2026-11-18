# Tài nguyên bản mẫu
- public/portraits/GV001.jpg … GV012.jpg và default.jpg: hình minh họa hình học tự tạo cho dự án bằng scripts/create-demo-portraits.ps1; không dùng ảnh người thật hoặc ảnh lấy từ Internet.
- Ảnh JPEG 300×400 (3:4) và 300×450 (2:3), khoảng 14–15 KB/ảnh. Tổng 13 ảnh: 188.293 byte.
- Phòng, khung và bảng hiệu: hình học Three.js tạo trong mã, không có GLB bên ngoài.
- assets/: giữ nguyên tài nguyên bàn giao cho bản HTML cũ, chưa xác minh quyền sử dụng để công bố.
- React, Three.js, React Three Fiber, Drei và Vite: giấy phép MIT; TypeScript: Apache-2.0. Xem LICENSE trong các gói npm đã cài.
- Chưa có logo chính thức, ảnh trường thật, MP3 hoặc MC GLB. Không dùng tên trường giả trên hình thiết kế làm danh tính thật.


# Âm thanh (15/11/2026)
- `public/audio/nhac-nen-lien-mach.m4a`: “Ambient Piano and Strings” — Good_B_Music, Pixabay (18/11: bỏ 3,3 s im lặng cuối bài, nối đuôi vào đầu 4 s để phát lặp liền mạch)
  (https://pixabay.com/music/beautiful-plays-ambient-piano-and-strings-10711/), **Pixabay Content License**
  (dùng miễn phí, kể cả thương mại, không bắt buộc ghi công; không bán/phân phối riêng file nhạc). Tải ngày 15/11/2026;
  bản gốc MP3 256 kbps (3:37) lưu cục bộ ở `audio-src/` (không đưa lên git). Bản web: chuẩn hóa âm lượng −20 LUFS,
  vào nhỏ dần 2,5 s / tắt dần 4 s, AAC 96 kbps, 2,66 MB.
- Tiếng cửa trượt và không khí phòng: tự tổng hợp bằng Web Audio trong mã (`src/scene/hallAudio.ts`), không dùng file ngoài.
- `@mediapipe/tasks-vision` 1.2.0 (Apache-2.0) và mô hình `selfie_multiclass_256x256.tflite` (Apache-2.0, Google MediaPipe):
  chỉ dùng cho công cụ ảnh trên máy quản trị (`tools-models/`, không đưa lên web).
