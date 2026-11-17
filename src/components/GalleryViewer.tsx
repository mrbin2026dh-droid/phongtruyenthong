import {useEffect,useRef,useState} from 'react';
import '../gallery.css';

export type ViewerItem={id:string;url:string;caption:string};
/** 17/11 (Phương án B): chạm màn trình chiếu / khung ảnh ở khu tủ → xem toàn màn hình, vuốt hoặc ‹ › để đổi ảnh. */
export default function GalleryViewer({title,items,start,onClose}:{title:string;items:ViewerItem[];start:number;onClose:()=>void}){
 const [i,setI]=useState(Math.min(Math.max(0,start),items.length-1));
 const close=useRef<HTMLButtonElement>(null),swipe=useRef<{x:number;y:number}|null>(null);
 const go=(d:number)=>setI(v=>(v+d+items.length)%items.length);
 useEffect(()=>{close.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1);};
  document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 // preload neighbours so the next picture appears at once
 useEffect(()=>{[1,-1].forEach(d=>{const n=items[(i+d+items.length)%items.length];if(n){const im=new Image();im.src=n.url;}});},[i,items]);
 const it=items[i];if(!it)return null;
 return <div className="gallery-viewer" role="dialog" aria-modal="true" aria-label={title}
  onPointerDown={e=>{swipe.current={x:e.clientX,y:e.clientY};}}
  onPointerUp={e=>{const s=swipe.current;swipe.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3)go(dx<0?1:-1);}}>
  <header><b>{title}</b><span>{i+1} / {items.length}</span><button ref={close} type="button" className="gallery-close" aria-label="Đóng" onClick={onClose}>
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
  <figure key={it.id}><img src={it.url} alt={it.caption||title} draggable={false}/>{it.caption&&<figcaption>{it.caption}</figcaption>}</figure>
  {items.length>1&&<>
   <button type="button" className="gallery-nav gallery-prev" aria-label="Ảnh trước" onClick={()=>go(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
   <button type="button" className="gallery-nav gallery-next" aria-label="Ảnh sau" onClick={()=>go(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
  </>}
 </div>;
}
