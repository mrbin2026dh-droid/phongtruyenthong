import {useEffect,useRef,useState} from 'react';
import type {MutableRefObject} from 'react';
import type {NavigationInput} from './VisitorController';
import {stickVector,writeStick,resetStick} from './stickInput.mjs';
const wake=()=>window.dispatchEvent(new Event('museum-navigation-input'));
function Stick({kind,input,onEngage}:{kind:'move'|'look';input:MutableRefObject<NavigationInput>;onEngage?:()=>void}){
 const [offset,setOffset]=useState({x:0,y:0}),[active,setActive]=useState(false);
 const surface=useRef<HTMLButtonElement>(null),pointer=useRef<number|null>(null),keys=useRef(new Set<string>());
 function stop(){pointer.current=null;keys.current.clear();resetStick(input.current,kind);setOffset({x:0,y:0});setActive(false);wake();}
 function update(x:number,y:number,radius:number){const v=stickVector(x,y,radius);writeStick(input.current,kind,v);setOffset({x:v.px,y:v.py});setActive(Boolean(v.x||v.y));wake();}
 useEffect(()=>{
  const release=(e:PointerEvent)=>{if(e.pointerId===pointer.current)stop();};
  const visibility=()=>{if(document.hidden)stop();};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',stop);document.addEventListener('visibilitychange',visibility);
  return ()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);resetStick(input.current,kind);wake();};
 },[input,kind]);
 function pointerMove(e:React.PointerEvent<HTMLButtonElement>){
  if(e.pointerId!==pointer.current)return;
  const rect=e.currentTarget.getBoundingClientRect();update(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,rect.width*.29);
 }
 function keyboard(){const radius=(surface.current?.clientWidth||112)*.29;update((Number(keys.current.has('ArrowRight'))-Number(keys.current.has('ArrowLeft')))*radius,(Number(keys.current.has('ArrowDown'))-Number(keys.current.has('ArrowUp')))*radius,radius);}
 return <div className={'thumbstick thumbstick-'+kind+(active?' is-active':'')}>
  <button type="button" ref={surface} className="thumbstick-base" aria-label={kind==='move'?'Cần di chuyển: kéo để tiến, lùi, sang trái hoặc phải':'Cần nhìn quanh: kéo để xoay và nhìn lên xuống'} title={kind==='move'?'Kéo để di chuyển · Thả để dừng':'Kéo để nhìn quanh · Thả để dừng'}
   onPointerDown={e=>{if(pointer.current!==null)return;e.preventDefault();e.stopPropagation();onEngage?.();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);pointerMove(e);}}
   onPointerMove={pointerMove} onPointerUp={e=>{if(e.pointerId===pointer.current)stop();}} onPointerCancel={stop} onLostPointerCapture={stop} onBlur={stop}
   onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();onEngage?.();keys.current.add(e.key);keyboard();}if(e.key==='Escape'){e.preventDefault();stop();}}}
   onKeyUp={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();keys.current.delete(e.key);keyboard();}}}>
   <svg className="thumbstick-guide" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/>{kind==='move'?<path d="m45 18 5-5 5 5M45 82l5 5 5-5M18 45l-5 5 5 5M82 45l5 5-5 5"/>:<><path d="M19 36a35 35 0 0 1 62 0M19 36v-8M19 36h8M81 36v-8M81 36h-8"/><path d="m45 77 5 5 5-5"/></>}</svg>
   <span className="thumbstick-knob" style={{transform:'translate('+offset.x+'px,'+offset.y+'px)'}}><svg viewBox="0 0 24 24" aria-hidden="true">{kind==='move'?<path d="m8 8 4-4 4 4M12 4v16m-4-4 4 4 4-4M8 8l-4 4 4 4M4 12h16m-4-4 4 4-4 4"/>:<><path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/></>}</svg></span>
  </button><span className="thumbstick-caption">{kind==='move'?'Di chuyển':'Nhìn quanh'}</span>
 </div>;
}
/** onEngage: touching a stick switches the visitor to walking mode (stops the presentation). */
export default function TwinSticks({input,onEngage}:{input:MutableRefObject<NavigationInput>;onEngage?:()=>void}){
 return <div className="twin-sticks" aria-label="Cần điều khiển tham quan"><Stick kind="move" input={input} onEngage={onEngage}/><Stick kind="look" input={input} onEngage={onEngage}/></div>;
}
