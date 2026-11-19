import {useEffect,useRef,useState} from 'react';
import type {MutableRefObject} from 'react';
import type {NavigationInput} from './VisitorController';
import type {GalleryRoom} from './GuidedScene';
import RoomAtlas from './RoomAtlas';
import TwinSticks from './TwinSticks';
export function TourIcon({name}:{name:string}){
 const props={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 const paths:Record<string,string>={home:'M3 11 12 3l9 8M6 10v11h12V10M10 21v-7h4v7',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',dollhouse:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',play:'m8 4 12 8-12 8Z',pause:'M8 5v14M16 5v14',walk:'M7 21l3-6 1-6 3 3 4 1M9 7l3-1 3 1M11 15l5 6',more:'',sound:'m3 9 4 0 5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',mute:'m3 9 4 0 5-4v14l-5-4H3ZM16 9l5 6M21 9l-5 6',close:'m6 6 12 12M18 6 6 18',reset:'M4 10a8 8 0 1 1 1 7M4 4v6h6',fullscreen:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',search:'M21 21l-6-6',help:'M9.5 9a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.3 1-1.3 2.4M12 17h.01',plus:'M5 12h14M12 5v14',minus:'M5 12h14',forward:'m6 12 6-6 6 6M12 6v15',back:'m6 12 6 6 6-6M12 18V3',left:'m12 6-6 6 6 6M6 12h15',right:'m12 6 6 6-6 6M18 12H3',turnLeft:'M4 11a8 8 0 1 1 2 8M4 5v6h6',turnRight:'M20 11a8 8 0 1 0-2 8M20 5v6h-6'};
 return <svg {...props}><path d={paths[name]||paths.more}/>{name==='search'&&<circle cx="10" cy="10" r="6"/>}{name==='help'&&<circle cx="12" cy="12" r="9"/>}{name==='walk'&&<circle cx="14" cy="4" r="1.5"/>}{name==='more'&&[5,12,19].map(cx=><circle key={cx} cx={cx} cy="12" r="1.9" fill="currentColor" stroke="none"/>)}</svg>;
}
type Panel='map'|'more'|'help'|null;
type Props={input:MutableRefObject<NavigationInput>;rooms:GalleryRoom[];room:number;ready:boolean;moving:boolean;paused:boolean;blocked:boolean;effects:boolean;caption:string;speaking:boolean;onGo:(id:string)=>void;onStart:()=>void;onPause:()=>void;onEffects:()=>void;onList:()=>void;onAudio:()=>void;onFullscreen:()=>void;onSelect:(id:string)=>void;onPanel:(open:boolean)=>void;onModule:(id:number)=>void};
const wake=()=>window.dispatchEvent(new Event('museum-navigation-input'));
export default function VisitorDock(p:Props){
 const [panel,setPanel]=useState<Panel>(null),[held,setHeld]=useState<string[]>([]),[speed,setSpeed]=useState(1),[manual,setManual]=useState(false);
 useEffect(()=>{p.onPanel(Boolean(panel)||manual);},[panel,manual,p.onPanel]);
 const holding=useRef(new Set<string>()),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLElement|null>(null),close=useRef<HTMLButtonElement>(null);
 function sync(){const h=holding.current;p.input.current.zoom=Number(h.has('zoomOut'))-Number(h.has('zoomIn'));setHeld([...h]);wake();}
 function clear(){holding.current.clear();sync();}
 function dismiss(restore=true){clear();setPanel(null);p.onPanel(false);if(restore)trigger.current?.focus({preventScroll:true});}
 function toggle(next:Panel,e:React.MouseEvent<HTMLButtonElement>){clear();setManual(false);if(panel===next){dismiss();return;}trigger.current=e.currentTarget;setPanel(next);p.onPanel(true);}
 useEffect(()=>{const release=()=>clear();window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);return ()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);Object.assign(p.input.current,{forward:0,strafe:0,turn:0,zoom:0});};},[]);
 useEffect(()=>{if(p.blocked||p.paused){clear();setManual(false);if(p.blocked){setPanel(null);p.onPanel(false);}}},[p.blocked,p.paused]);
 useEffect(()=>{if(p.moving){clear();setManual(false);}},[p.moving]);
 useEffect(()=>{
  if(!panel)return;close.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
  const outside=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))dismiss(false);};
  document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);
  return ()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};
 },[panel]);
 const hold=(id:string,label:string,icon:string)=><button type="button" key={id} className={'visitor-hold '+(held.includes(id)?'active':'')} title={label+' · nhấn giữ'} aria-label={label} disabled={!p.ready||p.moving||p.paused||p.blocked}
  onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);holding.current.add(id);sync();}}
  onPointerUp={()=>{holding.current.delete(id);sync();}} onLostPointerCapture={()=>{holding.current.delete(id);sync();}} onBlur={()=>{holding.current.delete(id);sync();}}
  onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();holding.current.add(id);sync();}}}
  onKeyUp={()=>{holding.current.delete(id);sync();}}><TourIcon name={icon}/><span>{label}</span></button>;
 const iconButton=(label:string,icon:string,action:()=>void,disabled=false)=><button type="button" title={label} aria-label={label} disabled={disabled||p.blocked} onClick={action}><TourIcon name={icon}/><span className="visitor-tooltip">{label}</span></button>;
 function travel(id:string){dismiss(false);p.onGo(id);}
 const actionLabel=p.moving?(p.paused?'Tiếp tục hành trình':'Tạm dừng hành trình'):p.room<0?'Bắt đầu tham quan':p.room+1<p.rooms.length?'Đến phòng tiếp theo':'Về sảnh';
 return <>{manual&&!p.blocked&&!p.paused&&!p.moving&&<TwinSticks input={p.input}/>}<div className="visitor-controls" ref={root}>
  {panel&&<section className={'visitor-panel '+(panel==='map'?'atlas-panel':'')} aria-label={panel==='map'?'Sơ đồ tham quan':panel==='more'?'Tùy chọn tham quan':'Hướng dẫn'}><div className="visitor-panel-heading"><h2>{panel==='map'?'Khám phá':panel==='more'?'Tùy chọn':'Hướng dẫn'}</h2><button type="button" ref={close} aria-label="Đóng bảng điều khiển" onClick={()=>dismiss()}><TourIcon name="close"/></button></div>
   {panel==='map'&&<RoomAtlas rooms={p.rooms} current={p.room} disabled={!p.ready||p.moving} onGo={travel} onList={()=>{dismiss(false);p.onList();}}/>}
   {panel==='more'&&<div className="visitor-options"><button onClick={()=>{dismiss(false);p.onList();}}><TourIcon name="search"/>Tìm hồ sơ</button><button disabled={p.moving||!p.ready} onClick={()=>{p.input.current.reset++;wake();dismiss();}}><TourIcon name="reset"/>Đặt lại góc nhìn</button><button onClick={p.onFullscreen}><TourIcon name="fullscreen"/>Toàn màn hình</button><label><input type="checkbox" checked={!p.effects} disabled={p.moving} onChange={p.onEffects}/>Giảm chuyển động</label><label>Tốc độ<select value={speed} onChange={e=>{const value=Number(e.target.value);setSpeed(value);p.input.current.speed=value;wake();}}><option value=".7">Chậm</option><option value="1">Vừa</option><option value="1.3">Nhanh</option></select></label><div className="visitor-zoom">{hold('zoomOut','Thu nhỏ','minus')}{hold('zoomIn','Phóng to','plus')}</div><button onClick={()=>{clear();setPanel('help');}}><TourIcon name="help"/>Hướng dẫn thao tác</button><button onClick={()=>{dismiss(false);p.onModule(2);}}>Tôn vinh giáo viên · Đang xây dựng</button><button onClick={()=>{dismiss(false);p.onModule(3);}}>Tôn vinh học sinh · Đang xây dựng</button>{p.rooms[p.room]&&<details><summary>Hồ sơ trong phòng</summary>{p.rooms[p.room].people.map(person=><button key={person.id} disabled={p.moving} onClick={()=>{dismiss(false);p.onSelect(person.id);}}>{person.id} · {person.name}</button>)}</details>}</div>}
   {panel==='help'&&<div className="visitor-help"><p>Kéo chuột hoặc vuốt để nhìn quanh. Chạm chân dung để mở hồ sơ.</p><p>Chọn dấu chân để bật hai cần ở góc dưới: cần trái di chuyển, cần phải nhìn quanh. Kéo nhẹ để đi chậm, thả để dừng. Máy tính: nhấp vào cảnh, dùng W/A/S/D để đi; ←/→ để xoay.</p><p>Nút tam giác bắt đầu hành trình; khi đang đi, nút đổi thành tạm dừng. Sơ đồ cho phép chọn phòng đích.</p><p>Cuộn để thu phóng. Nhấn Esc hoặc chạm ngoài bảng để đóng.</p></div>}
  </section>}
  <nav className="visitor-dock" aria-label="Thanh điều hướng tham quan 3D">
   {iconButton('Về sảnh','home',()=>travel('lobby'),!p.ready||p.moving)}
   <button type="button" title="Sơ đồ tham quan" aria-label="Sơ đồ tham quan" aria-expanded={panel==='map'} onClick={e=>toggle('map',e)}><TourIcon name="map"/><span className="visitor-tooltip">Sơ đồ</span></button>
   {iconButton(actionLabel,p.moving?(p.paused?'play':'pause'):p.room>=0&&p.room+1>=p.rooms.length?'home':'play',()=>{if(p.moving)p.onPause();else if(p.room<0)p.onStart();else if(p.room+1<p.rooms.length)travel('room-'+(p.room+1));else travel('lobby');},!p.ready||p.rooms.length===0)}
   <button type="button" title="Tự bước" aria-label="Tự bước" aria-pressed={manual} disabled={p.moving||p.blocked} onClick={()=>{dismiss(false);setManual(v=>!v);}}><TourIcon name="walk"/><span className="visitor-tooltip">Tự bước</span></button>
   {iconButton(p.speaking?'Tắt âm thanh':'Nghe giới thiệu khu',p.speaking?'mute':'sound',p.onAudio)}
   <button type="button" title="Tùy chọn" aria-label="Tùy chọn" aria-expanded={panel==='more'||panel==='help'} onClick={e=>toggle('more',e)}><TourIcon name="more"/><span className="visitor-tooltip">Tùy chọn</span></button>
  </nav>
  {p.caption&&<p className="visitor-caption" role="status">{p.caption}</p>}
 </div></>;
}
