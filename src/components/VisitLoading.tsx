import {useEffect,useState} from 'react';
import '../entry.css';
import {SLOW_MS} from '../data/loadWatch.mjs';
type Props={overlay?:boolean;pct?:number|null;stage?:string;stalled?:boolean;onList?:()=>void};
/** 15/11 (việc 1): shows real progress when known, and after SLOW_MS (or a stalled download) offers
 * “Thử lại” and “Xem danh sách ảnh” so nobody is stuck on the loading screen. */
export default function VisitLoading({overlay=false,pct=null,stage,stalled=false,onList}:Props){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setSlow(true),SLOW_MS);return()=>clearTimeout(t);},[]);
 const late=slow||stalled;
 return <div className={'visit-loading'+(overlay?' visit-loading-overlay':'')} role="status" aria-live="polite" aria-label="Đang chuẩn bị chuyến tham quan">
  <svg className="visit-loading-door" viewBox="0 0 80 96" fill="none" aria-hidden="true"><path d="M14 89V12h52v77M23 89V22h34v67M5 89h70"/><path className="visit-loading-light" d="M40 22v67"/></svg>
  <strong>{stalled?'Tải đang bị gián đoạn':late?'Đường truyền hơi chậm, vẫn đang tải…':'Đang mở không gian tham quan'}</strong><span>{stage||'Chuẩn bị ánh sáng và hình ảnh'}</span>
  {pct===null
   ?<div className="visit-loading-track" aria-hidden="true"><i/></div>
   :<><div className="visit-loading-track visit-loading-bar" role="progressbar" aria-label="Tiến độ tải" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{width:pct+'%'}}/></div><span className="visit-loading-pct" aria-hidden="true">{pct}%</span></>}
  {late&&<div className="visit-loading-actions">
   <button type="button" onClick={()=>window.location.reload()}>Thử lại</button>
   {onList&&<button type="button" className="visit-loading-alt" onClick={onList}>Xem danh sách ảnh</button>}
  </div>}
  {late&&onList&&<p className="visit-loading-note">Danh sách ảnh xem được ngay, không cần tải không gian 3D.</p>}
  {/* 16/11: phones held upright — ask for landscape (CSS shows it only in portrait on touch screens) */}
  <p className="visit-rotate-hint"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="15" y="5" width="18" height="30" rx="3"/><path d="M8 30a16 16 0 0 0 14 13M40 18A16 16 0 0 0 26 5"/></svg><span>Mở khóa xoay màn hình và <b>xoay ngang điện thoại</b> để tham quan rõ và rộng hơn</span></p>
 </div>;
}
