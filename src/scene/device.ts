/** 18/11 (iPhone: “Đã có sự cố xảy ra liên tục” — Safari đóng trang vì hết bộ nhớ khi vào phòng).
 * Điện thoại (màn nhỏ + cảm ứng) dùng ngân sách bộ nhớ riêng: ảnh/chữ vẽ bằng canvas nhỏ hơn, khung đứng yên ≤ 2×.
 * Đo trên iPhone 14 giả lập: trước khi sửa ≈ 212–255 MB canvas (chưa kể bản sao trên GPU). */
export const PHONE=(()=>{try{return Math.min(screen.width,screen.height)<600&&matchMedia('(pointer:coarse)').matches;}catch{return false;}})();

/** 18/11 (người dùng: “máy mạnh có sắc nét không?” — chưa: mọi điện thoại bị hạ như máy yếu). Điện thoại Android mạnh
 * (Chrome báo ≥ 6 GB bộ nhớ và ≥ 8 nhân) được dùng ảnh/chữ cỡ máy tính, bản phòng 4096 và khung đứng yên tới 3×.
 * iPhone/iPad luôn ở mức nhẹ: Safari không báo bộ nhớ và từng đóng trang vì hết bộ nhớ (18/11).
 * Kiểm tra trên máy tính: ?phone=strong / ?phone=light ép một trong hai nhóm. */
export function isStrongPhone({phone,ua,memory,cores,force}:{phone:boolean;ua:string;memory?:number;cores?:number;force?:string|null}){
 if(!phone)return false;
 if(force==='strong')return true;if(force==='light')return false;
 if(/iPhone|iPad|iPod|Macintosh/.test(ua))return false;
 return (memory??0)>=6&&(cores??0)>=8;
}
export const STRONG_PHONE=(()=>{try{const n=navigator as Navigator&{deviceMemory?:number};
 return isStrongPhone({phone:PHONE,ua:navigator.userAgent,memory:n.deviceMemory,cores:navigator.hardwareConcurrency,force:new URLSearchParams(location.search).get('phone')});}catch{return false;}})();
/** Small canvases / textures (memory budget): every phone except the strong ones. */
export const SMALL_TEX=PHONE&&!STRONG_PHONE;
/** Highest pixel ratio of the sharp still frame (the render while the camera stands still). */
export const STILL_DPR_CAP=!PHONE?9:STRONG_PHONE?3:2;
