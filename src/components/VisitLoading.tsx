import '../entry.css';
export default function VisitLoading({overlay=false}:{overlay?:boolean}){
 return <div className={'visit-loading'+(overlay?' visit-loading-overlay':'')} role="status" aria-live="polite" aria-label="Đang chuẩn bị chuyến tham quan">
  <svg className="visit-loading-door" viewBox="0 0 80 96" fill="none" aria-hidden="true"><path d="M14 89V12h52v77M23 89V22h34v67M5 89h70"/><path className="visit-loading-light" d="M40 22v67"/></svg>
  <strong>Đang mở không gian tham quan</strong><span>Chuẩn bị ánh sáng và hình ảnh</span>
  <div className="visit-loading-track" aria-hidden="true"><i/></div>
 </div>;
}
