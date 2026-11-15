# Phòng truyền thống 3D — hồ sơ chung CBQL / GV / NV
> **Hiện hành 27/10/2026:** Một phòng, 4HT/12PHT/92GV/12NV. Chính diện đúng 4 ảnh hiệu trưởng. `hallPreview.mjs` thêm 24 hồ sơ minh họa tạm để xem đủ 120 vị trí, không lưu catalog; `?preview=off` tắt bổ sung. Tiêu đề tường độc lập với các điểm dừng camera. Đã kiểm thử IAB desktop/mobile và 37 test. Xem [nhật ký](../09-NHAT-KY-AI/PHIEN/2026-10-27-thiet-ke-120-anh.md). Các thông tin sức chứa/phân phòng cũ bên dưới là lịch sử.

> **Cập nhật mới hơn:** một phòng, bốn khu HT/PHT/GV/NV; vị trí cố định6/12/90/12.
> exhibitSlots.mjs gắn displaySlot, không dồn ảnh hoặc đổi bộ khi thêmngười.
> Khu đầy cảnh báo, hồ sơ còn trong Tra cứu. Quản trị có chọnảnh/xemtrước/lưucụcbộ.
> Ảnh nằm trong JSONlocalStorage, có hạn mức dung lượng; chưa đồng bộ/đưaảnhlênmạng.
> Các mô tả “120mỗi bộ” bên dưới là lịch sử, đã được thay bằng cảnh báo sức chứa.
> **Cảnh hiện hành:** GuidedTour reexport HallTour; HallScene dựng một phòng thật
> bằng mesh Three.js/R3F kích thước24×16×4.2m. 96 hồ sơ hiện có bố trí quanh tường;
> tối đa120 mỗi bộ, hơn120 đổi bộ trong cùng phòng, không tạo phòng nối tiếp.
> HallController/hallMotion dùng đường đi tránh ghế/tường; sơ đồ là các điểm dừng.
> Mô hình GLB/GroupedTour cũ được bảo tồn, không còn là cảnh mặc định.
> Xem nhật ký phiên2026-10-27-trien-khai-mot-phong để biết phần chưa nghiệm thu UI.
> Trang mặc định nay là màn đón Welcome (home): phần giới thiệu và3thẻphânhệ
> theo H2. Chọn Bắt đầu mới vào WebGL. Header Trang chủ trở vềhome; dockVềsảnh
> chỉ vềsảnh3D. Ảnhhero là render giới thiệu từ Blender, không thay3Dthật.
> Chưa dùng tên/MC/logo chính thức của trường; chỉ mẫu. Chưa nghiệm thu UI mới.
> Điều khiển mới nhất: icon dấu chân bật hai joystick góc dưới; trái để đi, phải
> nhìn quanh; kéo xa tăng tốc, thả về tâm dừng. Không còn bảng6nút giữa cảnh.
> WASD/kéo cảnh và sơ đồ vẫn có. Mở panel/auto/hồ sơ tắt joystick.
> Chưa nghiệm thu đa chạm thực, xem nhật ký phiên2026-10-27-joystick.
> Bản wayfinding mới: atlas icon theo vị trí phòng, lọc khu bằng icon và phân trang;
> vòng tròn/chevron trên sàn dẫn tới điểm an toàn trong đồ thị, chỉ hiện vài điểm gần
> phía trước. Biển sảnh kem mỏng, bảng2/3 sát tường bên. Khách mới có gợi ý ngắn
> ở đầu; không tự phát âm. Chưa nghiệm thu trực quan, xem nhật ký phiên wayfinding.
> Sửa UX ngày 27/10: trang tham quan ưu tiên cảnh, biển sảnh là mesh/texture thật.
> Thanh chính 6 icon: sảnh, sơ đồ, bắt đầu/tiếp/dừng, tự bước, lời dẫn, tùy chọn.
> Mỗi lần chỉ mở một bảng phụ. Trong Tùy chọn có tìm hồ sơ, reset, toàn màn hình,
> giảm chuyển động, tốc độ, thu phóng, trợ giúp, hồ sơ phòng và giới thiệu phân hệ2/3.
> Thứ tự trưng bày chỉnh trên Danh sách hồ sơ; không treo bộ lọc lên cảnh.
> Bản sửa chưa nghiệm thu trực quan do Browser Use bị tắt trong Work settings;
> xem nhật ký PHIEN/2026-10-27-fix-ux3d.md trước kết luận UI đạt.
Cập nhật 27/10/2026. Dữ liệu và ảnh đều giả lập. Đọc [nhật ký](../09-NHAT-KY-AI/README.md) và [đặc tả hiện hành](../05-HUONG-DAN-AI/HO-SO-CHUNG-VA-PHAN-NHOM.md).

## Chạy và kiểm tra
Trong thư mục này: npm ci nếu thiếu thư viện, npm run dev (5173).
Kiểm tra: npm run check, npm test, npm run build. Xem production: npm run preview (4173).
Không mở index.html bằng file://. Chỉ triển khai dist/ khi được yêu cầu.
Preview hiện dùng http://127.0.0.1:4173/?catalog=20261027 và cần máy chủ tiếp tục chạy.

## Trải nghiệm
Một hành trình: sảnh → CBQL → các thế hệ nhà giáo → nhân viên.
Mỗi người một hồ sơ và một vị trí trưng bày chính, tối đa 12 ảnh/phòng.
96 mẫu gốc thành 9 phòng, tăng theo số hồ sơ từng nhóm, không có trần 96 người/8 phòng.
Các nút chọn khu là chọn đích trong cùng không gian; mặc định camera đi theo cửa/hành lang.
Có nút giảm chuyển động để tới đích ngay, dock nhấn giữ tự bước, chuột/cảm ứng nhìn quanh.
Danh sách 2D tìm/lọc nhóm, tổ, trạng thái; hồ sơ hiển thị mọi đợt công tác.
Năm đầu công tác là thứ tự mặc định; chọn năm sinh để xếp tuổi nếu có dữ liệu.
Thiếu năm sinh được ghi rõ và xếp cuối, không giả định tuổi.

## Quản trị mẫu
Tìm tên/mã trước. Người mới tạo ID mới; người từng công tác cập nhật cùng ID.
Tiếp nhận trở lại thêm đợt mới, giữ đợt trước; chặn năm sai/chồng lấn.
Trùng tên được nhắc và cần đối chiếu; hai người cùng tên có thể tạo riêng sau xác nhận.
Lưu localStorage key school-museum-catalog-v1, dùng chung giữa React/3D/2D.
localhost và 127.0.0.1 là hai origin riêng; dữ liệu không đồng bộ thiết bị hay legacy.
Lỗi lưu phải báo thất bại; dữ liệu hỏng không bị ghi đè. Có xuất JSON, chưa UI nhập/khôi phục.
Quản trị chưa Auth/Firestore/Rules: chỉ dùng mẫu, chưa đủ an toàn cho nhân sự thật.

## Mã
- App.tsx → PeopleApp.tsx: ứng dụng hồ sơ chung; components/PeopleAdmin.tsx: quản trị mẫu.
- data/catalog.mjs: di trú, kiểm tra, store, tìm/xếp/nhóm/phân phòng; repository.ts: kiểu và adapter cục bộ.
- scene/GuidedTour.tsx → GroupedTour.tsx → GuidedScene.tsx: hành trình và phòng theo nhóm.
- scene/VisitorController.tsx, tourPlan.mjs, walkMotion.mjs: camera, lối đi, giảm chấn.
- scene/BlenderMuseum.tsx: Room/Portrait/GalleryEnvironment tái sử dụng từ GLB.
- public/models/museum-refined-v1.glb và public/portraits/: mô hình/ảnh mẫu.
- data/legacy-seed.json và model.mjs: dữ liệu/logic thời kỳ cũ được giữ bảo tồn; UI mới không dùng periods.
- people.css: các khu, quản trị và responsive; navigation.css: dock.
- tests/catalog.test.mjs + các test dữ liệu/đường đi cũ.

## Bảo tồn và giới hạn
Bản sao trước chuyển: workspace SAO-LUU/2026-10-27-chuyen-nhan-su-075419/.
app.js/styles.css/legacy.html và mô hình .blend/.glb gốc không bị chỉnh.
Bản legacy độc lập, không đồng bộ với hồ sơ mới. Không quay lại dùng nó làm mã chính.
Phân hệ 2/3 chỉ thông báo đang xây dựng. MC mới lời dẫn/phụ đề/giọng trình duyệt,
chưa avatar 3D. Chưa Pages công khai, Firebase hoặc dữ liệu thật.
Chưa nghiệm thu điện thoại thật và FPS; không tuyên bố giống mockup 100%.

## GitHub Pages
base mặc định './'. Khi có repository thật, cấu hình VITE_BASE_PATH='/ten-repository/'
rồi build; deploy dist/ sau kiểm thử và theo yêu cầu. Chưa tự xuất bản trong phiên này.
