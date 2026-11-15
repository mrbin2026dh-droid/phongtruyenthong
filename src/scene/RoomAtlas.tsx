import {useState} from 'react';
import type {GalleryRoom} from './GuidedScene';
export function ZoneGlyph({zone}:{zone:string}){
 const p={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 return <svg {...p}>{zone==='management'?<><path d="m3 9 9-5 9 5M4 10h16M5 20h14M7 11v6M12 11v6M17 11v6"/></>:zone==='teacher'?<><path d="M12 6v15M3 5c4-1 7 0 9 2 2-2 5-3 9-2v13c-4-1-7 0-9 2-2-2-5-3-9-2Z"/></>:zone==='staff'?<><path d="m5 20 9-9M14 4a5 5 0 0 0 6 6l-4 4-6-6ZM4 17l3 3"/></>:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>}</svg>;
}
const zones=[{id:'all',name:'Tất cả khu'},{id:'management',name:'Cán bộ quản lý'},{id:'teacher',name:'Các thế hệ nhà giáo'},{id:'staff',name:'Đội ngũ nhân viên'}];
export default function RoomAtlas({rooms,current,disabled,onGo,onList}:{rooms:GalleryRoom[];current:number;disabled:boolean;onGo:(id:string)=>void;onList:()=>void}){
 const [zone,setZone]=useState('all'),[page,setPage]=useState(0),[hover,setHover]=useState<number|null>(null);
 const filtered=rooms.map((r,i)=>({...r,index:i})).filter(r=>zone==='all'||r.groupId===zone);
 const pages=Math.max(1,Math.ceil(filtered.length/8)),visible=filtered.slice(Math.min(page,pages-1)*8,Math.min(page,pages-1)*8+8);
 const firstRow=Math.floor((visible[0]?.index??0)/2),lastRow=Math.floor((visible.at(-1)?.index??0)/2);
 const height=Math.max(156,(lastRow-firstRow+1)*48+68),selected=rooms[hover??current];
 return <div className="room-atlas">
  <div className="atlas-zones" aria-label="Lọc khu tham quan">{zones.map(z=><button key={z.id} title={z.name} aria-label={z.name} aria-pressed={zone===z.id} onClick={()=>{setZone(z.id);setPage(0);setHover(null);}}><ZoneGlyph zone={z.id}/></button>)}</div>
  <div className="atlas-plan" style={{height}}>
   <svg className="atlas-lines" viewBox={'0 0 280 '+height} preserveAspectRatio="none" aria-hidden="true"><path d={'M140 26V'+(height-26)}/>{visible.map(r=><path key={r.id} d={'M140 '+(82+(Math.floor(r.index/2)-firstRow)*48)+'H'+(r.index%2?220:60)}/>)}</svg>
   <button className="atlas-lobby" title="Sảnh chính" aria-label="Đi đến sảnh chính" disabled={disabled} onClick={()=>onGo('lobby')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7M7 10v10h10V10" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg></button>
   {visible.map(r=><button key={r.id} className={'atlas-stop zone-'+r.groupId} style={{left:r.index%2?'78.57%':'21.43%',top:82+(Math.floor(r.index/2)-firstRow)*48}} disabled={disabled} title={'Phòng '+(r.index+1)+' · '+r.groupName} aria-label={'Đi đến phòng '+(r.index+1)+' · '+r.groupName+' · '+r.people.length+' hồ sơ'} aria-current={current===r.index?'location':undefined} onPointerEnter={()=>setHover(r.index)} onPointerLeave={()=>setHover(null)} onFocus={()=>setHover(r.index)} onBlur={()=>setHover(null)} onClick={()=>onGo('room-'+r.index)}><ZoneGlyph zone={r.groupId}/><span>{r.index+1}</span></button>)}
  </div>
  <p className="atlas-selection" role="status">{selected?<><b>{selected.groupName}</b><span>Phòng {(hover??current)+1} · {selected.people.length} hồ sơ</span></>:<>Chọn điểm để đến phòng</>}</p>
  <div className="atlas-footer"><button title="Tìm hồ sơ" aria-label="Tìm hồ sơ trong danh sách 2D" onClick={onList}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></button>{pages>1&&<div className="atlas-paging"><button aria-label="Trang phòng trước" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button><small>{page+1}/{pages}</small><button aria-label="Trang phòng sau" disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>›</button></div>}<small>{rooms.length} phòng</small></div>
 </div>;
}
