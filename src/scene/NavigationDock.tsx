import {useEffect,useRef,useState} from 'react';
import type {MutableRefObject} from 'react';
import type {NavigationInput} from './VisitorController';
const wake=()=>window.dispatchEvent(new Event('museum-navigation-input'));
function Icon({name}:{name:string}){
 const common={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 if(name==='home')return <svg {...common}><path d="M3 11 12 3l9 8M6 10v11h12V10M10 21v-7h4v7"/></svg>;
 if(name==='pause')return <svg {...common}><path d="M8 5v14M16 5v14"/></svg>;
 if(name==='play')return <svg {...common}><path d="m8 4 12 8-12 8Z"/></svg>;
 if(name==='plus'||name==='minus')return <svg {...common}><path d="M5 12h14"/>{name==='plus'&&<path d="M12 5v14"/>}</svg>;
 if(name==='map')return <svg {...common}><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/></svg>;
 if(name==='help')return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.3 1-1.3 2.4M12 17h.01"/></svg>;
 if(name==='walk')return <svg {...common}><circle cx="14" cy="4" r="1.5"/><path d="m7 21 3-6 1-6 3 3 4 1M9 7l3-1 3 1M11 15l5 6"/></svg>;
 if(name==='reset')return <svg {...common}><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg>;
 if(name==='hide')return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
 const rotation=name==='left'?'-90':name==='right'?'90':name==='back'?'180':'0';
 return <svg {...common} style={{transform:'rotate('+rotation+'deg)'}}><path d="m6 13 6-6 6 6M12 7v14"/></svg>;
}
type Props={input:MutableRefObject<NavigationInput>;ready:boolean;moving:boolean;paused:boolean;canPrevious:boolean;canNext:boolean;room:number;onHome:()=>void;onPrevious:()=>void;onNext:()=>void;onStart:()=>void;onPause:()=>void;onMap:()=>void};
export default function NavigationDock(p:Props){
 const [expanded,setExpanded]=useState(false),[hidden,setHidden]=useState(false),[help,setHelp]=useState(false),[held,setHeld]=useState<string[]>([]);
 const holding=useRef(new Set<string>());
 const sync=()=>{const h=holding.current;p.input.current.forward=(h.has('forward')?1:0)-(h.has('back')?1:0);p.input.current.strafe=(h.has('right')?1:0)-(h.has('left')?1:0);p.input.current.turn=(h.has('turnLeft')?1:0)-(h.has('turnRight')?1:0);p.input.current.zoom=(h.has('zoomOut')?1:0)-(h.has('zoomIn')?1:0);setHeld([...h]);wake();};
 const clear=()=>{holding.current.clear();sync();};
 useEffect(()=>{window.addEventListener('pointerup',clear);window.addEventListener('pointercancel',clear);window.addEventListener('blur',clear);return ()=>{window.removeEventListener('pointerup',clear);window.removeEventListener('pointercancel',clear);window.removeEventListener('blur',clear);p.input.current.forward=0;p.input.current.strafe=0;p.input.current.turn=0;p.input.current.zoom=0;};},[]);
 useEffect(()=>{if(p.paused||p.moving)clear();},[p.paused,p.moving]);
 const hold=(id:string,label:string,icon:string)=><button key={id} className={held.includes(id)?'nav-active':''} disabled={!p.ready||p.paused||(p.moving&&!id.startsWith('zoom'))} title={label+' · nhấn giữ'} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);holding.current.add(id);sync();}} onPointerUp={()=>{holding.current.delete(id);sync();}} onLostPointerCapture={()=>{holding.current.delete(id);sync();}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();holding.current.add(id);sync();}}} onKeyUp={()=>{holding.current.delete(id);sync();}}><Icon name={icon}/></button>;
 if(hidden)return <button className="navigation-reveal" onClick={()=>setHidden(false)}><Icon name="walk"/>Hiện điều khiển</button>;
 return <div className="navigation-overlay">
  {help&&<div className="navigation-instructions"><strong>Tham quan theo cách của bạn</strong><p>Kéo chuột hoặc vuốt để nhìn quanh. Nhấn giữ các mũi tên để bước hoặc xoay. Trên máy tính, nhấn vào cảnh rồi dùng W/A/S/D; phím mũi tên trái/phải để xoay.</p><p>Phòng trước / tiếp theo: đi theo lối dẫn. Có thể tạm dừng giữa hành trình. Cuộn hoặc dùng − / + để thu phóng.</p><button onClick={()=>setHelp(false)}>Đã hiểu</button></div>}
  {expanded&&<div className="manual-tray"><div><b>Tự bước</b><small>Nhấn giữ · Có giới hạn vật cản</small></div><div className="manual-pad">{hold('left','Bước sang trái','left')}{hold('forward','Đi tới','forward')}{hold('right','Bước sang phải','right')}{hold('turnLeft','Xoay trái','left')}{hold('back','Lùi lại','back')}{hold('turnRight','Xoay phải','right')}</div><label>Tốc độ<select aria-label="Tốc độ tham quan" value={p.input.current.speed} onChange={e=>{p.input.current.speed=Number(e.target.value);wake();setHeld(h=>[...h]);}}><option value=".7">Chậm</option><option value="1">Vừa</option><option value="1.3">Nhanh</option></select></label></div>}
  <nav className="navigation-dock" aria-label="Thanh điều hướng tham quan 3D">
   <button title="Về sảnh" aria-label="Về sảnh" disabled={!p.ready||p.moving} onClick={p.onHome}><Icon name="home"/></button>
   <button title="Phòng trước" aria-label="Phòng trước" disabled={!p.ready||p.moving||!p.canPrevious} onClick={p.onPrevious}><Icon name="left"/></button>
   <button className="navigation-next" title={p.room<0?'Bắt đầu tham quan':'Phòng tiếp theo'} disabled={!p.ready||p.moving||(p.room>=0&&!p.canNext)} onClick={p.room<0?p.onStart:p.onNext}><span>{p.room<0?'Bắt đầu':'Phòng tiếp'}</span><Icon name="right"/></button>
   <span className="dock-divider"/>
   <button className={expanded?'nav-active':''} title="Điều khiển bước chân" aria-label="Điều khiển bước chân" aria-expanded={expanded} onClick={()=>{clear();setExpanded(v=>!v);}}><Icon name="walk"/></button>
   <button title="Đặt lại góc nhìn" aria-label="Đặt lại góc nhìn" disabled={!p.ready||p.moving} onClick={()=>{p.input.current.reset++;wake();}}><Icon name="reset"/></button>
   {hold('zoomOut','Thu nhỏ','minus')}{hold('zoomIn','Phóng to','plus')}
   <button title={p.paused?'Tiếp tục':'Tạm dừng'} aria-label={p.paused?'Tiếp tục':'Tạm dừng'} disabled={!p.ready} onClick={p.onPause}><Icon name={p.paused?'play':'pause'}/></button>
   <button title="Sơ đồ các phòng" aria-label="Sơ đồ các phòng" onClick={p.onMap}><Icon name="map"/></button>
   <button title="Hướng dẫn thao tác" aria-label="Hướng dẫn thao tác" onClick={()=>setHelp(v=>!v)}><Icon name="help"/></button>
   <button title="Ẩn thanh điều khiển" aria-label="Ẩn thanh điều khiển" onClick={()=>{clear();setHidden(true);}}><Icon name="hide"/></button>
  </nav>
 </div>;
}

