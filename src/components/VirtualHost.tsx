import {useEffect,useId,useRef,useState} from 'react';
import '../virtual-host.css';
type Props={compact?:boolean;active:boolean;speaking:boolean;caption:string;onPlay:()=>void;onStop:()=>void;onPanelChange?:(open:boolean)=>void};
const src=import.meta.env.BASE_URL+'mc/host-lotus-cutout-v2.png';
export default function VirtualHost({compact=false,active,speaking,caption,onPlay,onStop,onPanelChange}:Props){
 const [expanded,setExpanded]=useState(false),[imageFailed,setImageFailed]=useState(false),id=useId();
 const trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 const open=!compact||expanded||active;
 useEffect(()=>{onPanelChange?.(compact&&open);},[compact,open,onPanelChange]);
 useEffect(()=>()=>{onPanelChange?.(false);},[onPanelChange]);
 const restoreFocus=useRef(false);
 function close(){restoreFocus.current=true;onStop();setExpanded(false);}
 useEffect(()=>{if(compact&&open)panel.current?.focus({preventScroll:true});},[compact,open]);
 useEffect(()=>{if(compact&&!open&&restoreFocus.current){trigger.current?.focus({preventScroll:true});restoreFocus.current=false;}},[compact,open]);
 return <div className={compact?'virtual-host virtual-host-floating':'virtual-host virtual-host-welcome'}>
  {compact&&!open&&<button ref={trigger} className="host-launch" aria-label="Mở MC hướng dẫn" aria-expanded={false} aria-controls={id} onClick={()=>setExpanded(true)}>
   {!imageFailed&&<img src={src} alt="" onError={()=>setImageFailed(true)}/>}<span>MC</span>
  </button>}
  {open&&<section ref={panel} tabIndex={-1} id={id} className="host-card" aria-label="MC hướng dẫn" onKeyDown={e=>{if(compact&&e.key==='Escape'){e.stopPropagation();close();}}}>
   <div className="host-portrait">{!imageFailed?<img src={src} width="400" height="533" alt="MC minh họa mặc áo dài trắng hoa sen vàng" loading={compact?'lazy':'eager'} onError={()=>setImageFailed(true)}/>:<span>MC</span>}</div>
   <div className="host-content"><span className="host-label">MC HƯỚNG DẪN</span><p className="host-invite">Mời bạn khám phá phòng truyền thống.</p>
    <button className="host-audio" onClick={speaking?onStop:onPlay} aria-label={speaking?'Tắt tiếng MC':'Nghe MC giới thiệu'}><span aria-hidden="true">{speaking?'Ⅱ':'▷'}</span>{speaking?'Tắt tiếng':'Nghe giới thiệu'}</button>
   </div>
   {compact&&<button className="host-close" aria-label="Thu gọn MC" onClick={close}>×</button>}
   {active&&<div className="host-caption" role="status" aria-live="polite"><span className="host-caption-label">Lời dẫn</span><p>{caption}</p></div>}
  </section>}
 </div>;
}
