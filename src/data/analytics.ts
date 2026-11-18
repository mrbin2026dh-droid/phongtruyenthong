/** 17/11 — Thống kê lượt xem KHÔNG cookie (GoatCounter, mã nguồn mở, miễn phí cho tổ chức phi lợi nhuận).
 *
 * Gửi đi DUY NHẤT: tên trang/sự kiện cố định dưới đây (vd “xem-ho-so”). Không gửi họ tên thầy cô, không nguồn truy cập,
 * không cỡ màn hình, không cookie / localStorage, không tải mã của bên thứ ba vào trang. GoatCounter tự tính “người xem
 * khác nhau trong ngày” bằng mã băm tạm thời và không lưu địa chỉ IP.
 * Chỉ chạy trên website công khai (bản build), không chạy trên máy quản trị / localhost; tôn trọng “Do Not Track” và GPC.
 *
 * Bật: điền mã trang GoatCounter (vd 'thcs-chuvanan-ptt') vào GOATCOUNTER_CODE — và cùng mã trong public/tri-an/index.html. */
export const GOATCOUNTER_CODE='thcs-chuvanan-ptt';

export const EVENTS={
 'trang-chao':'Mở trang chào',
 'bat-dau-tham-quan':'Bấm Bắt đầu tham quan',
 'vao-phong':'Vào phòng 3D (sau màn chờ)',
 'xem-ho-so':'Mở một hồ sơ',
 'tra-cuu':'Mở danh sách tra cứu',
 'xem-trinh-chieu':'Xem ảnh trình chiếu toàn màn hình',
} as const;
export type TrackEvent=keyof typeof EVENTS;

function enabled(){
 try{
  if(!import.meta.env.PROD||!GOATCOUNTER_CODE)return false;
  const h=location.hostname;if(h==='localhost'||h.endsWith('.localhost')||/^(127\.|\[?::1)/.test(h)||h==='')return false;
  const n=navigator as any;if(n.doNotTrack==='1'||(window as any).doNotTrack==='1'||n.globalPrivacyControl===true)return false;
  return true;
 }catch{return false;}
}
const sentOnce=new Set<string>();
/** Count one page view (`trang-chao`) or event. `once`: at most once per page load (e.g. the welcome page). */
export function track(name:TrackEvent,{once=false}:{once?:boolean}={}){
 if(!enabled()||(once&&sentOnce.has(name)))return;sentOnce.add(name);
 const page=name==='trang-chao';
 const url='https://'+GOATCOUNTER_CODE+'.goatcounter.com/count?p='+encodeURIComponent(page?'/':name)+'&t='+encodeURIComponent(EVENTS[name])+(page?'':'&e=true')+'&rnd='+Math.random().toString(36).slice(2,8);
 try{if(!navigator.sendBeacon?.(url)){const i=new Image();i.referrerPolicy='no-referrer';i.src=url;}}catch{/* counting must never break the visit */}
}
