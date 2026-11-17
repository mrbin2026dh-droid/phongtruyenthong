import {useEffect,useState} from 'react';
import '../entry.css';
import {SLOW_MS} from '../data/loadWatch.mjs';
/** 17/11: tranh khảm tri ân 20/11 (83 gương mặt thầy cô — đã đồng ý công khai) làm nền màn hình đang tải. */
const TRI_AN=import.meta.env.BASE_URL+'welcome/tri-an-20-11';
type Props={overlay?:boolean;pct?:number|null;stage?:string;stalled?:boolean;onList?:()=>void;ready?:boolean;leaving?:boolean;onEnter?:()=>void};
const BASE=import.meta.env.BASE_URL;
/** 15/11 (việc 1): shows real progress when known, and after SLOW_MS (or a stalled download) offers
 * “Thử lại” and “Xem danh sách ảnh” so nobody is stuck on the loading screen. */
export default function VisitLoading({overlay=false,pct=null,stage,stalled=false,onList,ready=false,leaving=false,onEnter}:Props){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setSlow(true),SLOW_MS);return()=>clearTimeout(t);},[]);
 const late=(slow||stalled)&&!ready;
 return <div className={'visit-loading'+(overlay?' visit-loading-overlay':'')+(late?' visit-loading-late':'')+(ready?' visit-loading-ready':'')+(leaving?' visit-loading-leaving':'')} role="status" aria-live="polite" aria-label="Đang chuẩn bị chuyến tham quan">
  <div className="visit-stage">
   <img className="visit-loading-art" src={TRI_AN+'-1200.webp'} srcSet={TRI_AN+'-1200.webp 1200w, '+TRI_AN+'-1800.webp 1800w, '+TRI_AN+'-2600.webp 2600w'} sizes="(orientation:portrait) 100vw, min(100vw, 165vh)" alt="Tranh khảm tri ân thầy cô nhân ngày Nhà giáo Việt Nam 20/11" decoding="async" fetchPriority="high" draggable={false}/>
   <div className="visit-loading-info">
    <strong>{ready&&pct!==null&&pct>=100?'Đã sẵn sàng':stalled?'Tải đang bị gián đoạn':late?'Đường truyền hơi chậm, vẫn đang tải…':'Đang mở không gian tham quan'}</strong>{!ready&&<span>{stage||'Chuẩn bị ánh sáng và hình ảnh'}</span>}
    {pct===null
     ?<div className="visit-loading-track" aria-hidden="true"><i/></div>
     :<><div className="visit-loading-track visit-loading-bar" role="progressbar" aria-label="Tiến độ tải" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{width:pct+'%'}}/></div><span className="visit-loading-pct" aria-hidden="true">{pct}%</span></>}
    {late&&<div className="visit-loading-actions">
     <button type="button" onClick={()=>window.location.reload()}>Thử lại</button>
     {onList&&<button type="button" className="visit-loading-alt" onClick={onList}>Xem danh sách ảnh</button>}
    </div>}
    {ready&&onEnter&&(pct===null||pct>=100)&&<div className="visit-loading-actions visit-loading-enter"><button type="button" onClick={onEnter}>Vào tham quan<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>}
   </div>
   {/* 17/11: mã QR mở trang ảnh kỷ niệm (/tri-an/) — thầy cô quét bằng điện thoại để lưu ảnh / gửi Zalo.
       Nội dung giống nhau trên máy tính và điện thoại; chỉ khác bố cục. */}
   <a className="visit-qr" href={BASE+'tri-an/'} target="_blank" rel="noopener" aria-label="Mở trang lưu ảnh kỷ niệm Tri ân Thầy Cô 20.11">
    <span className="visit-qr-card"><img src={BASE+'welcome/qr-tri-an.svg'} alt="" width="37" height="37" draggable={false}/></span>
   </a>
  </div>
  {/* 16/11: phones held upright — ask for landscape (CSS shows it only in portrait on touch screens) */}
  <p className="visit-rotate-hint"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="15" y="5" width="18" height="30" rx="3"/><path d="M8 30a16 16 0 0 0 14 13M40 18A16 16 0 0 0 26 5"/></svg><span><b>Xoay ngang điện thoại</b> để xem rõ hơn</span></p>
 </div>;
}
