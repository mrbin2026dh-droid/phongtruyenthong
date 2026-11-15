import '../entry.css';
export default function VisitLoading({overlay=false}:{overlay?:boolean}){
 return <div className={'visit-loading'+(overlay?' visit-loading-overlay':'')} role="status" aria-live="polite" aria-label="Đang chuẩn bị chuyến tham quan">
  <svg className="visit-loading-door" viewBox="0 0 80 96" fill="none" aria-hidden="true"><path d="M14 89V12h52v77M23 89V22h34v67M5 89h70"/><path className="visit-loading-light" d="M40 22v67"/></svg>
  <strong>Đang mở không gian tham quan</strong><span>Chuẩn bị ánh sáng và hình ảnh</span>
  <div className="visit-loading-track" aria-hidden="true"><i/></div>
  {/* 16/11: phones held upright — ask for landscape (CSS shows it only in portrait on touch screens) */}
  <p className="visit-rotate-hint"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="15" y="5" width="18" height="30" rx="3"/><path d="M8 30a16 16 0 0 0 14 13M40 18A16 16 0 0 0 26 5"/></svg><span>Mở khóa xoay màn hình và <b>xoay ngang điện thoại</b> để tham quan rõ và rộng hơn</span></p>
 </div>;
}
