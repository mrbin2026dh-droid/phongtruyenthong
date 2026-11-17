import {EXHIBIT_ZONES,exhibitSlots,assignExhibitSlots,FRONT_BAY} from '../data/exhibitSlots.mjs';
import {ARRIVAL_START,gateLook} from './hallArrival.mjs';
import {deptGroups,deptKey,isOffice,OFFICE_KEY} from '../data/arrangeByDept.mjs';
const TEACHER_MOTTO='MỖI THẦY GIÁO, CÔ GIÁO LÀ MỘT TẤM GƯƠNG TỰ HỌC, TỰ SÁNG TẠO';
export const HALL={width:24,depth:16,height:4.2,capacity:103,pitch:.9};
export const BENCHES=[[-3.7,1.5],[3.7,1.5]];
/** Back-wall teacher bays (oak slats 7.2 m): centred at ±7.5 since 16/11 — equal ≈0.9 m gaps to the Ban Giám hiệu
 * pier caps (x 3.02) and to the corners (x 12). Exported to Blender (slats + wall washers). */
export const BACK_BAY={x:7.5,width:7.2};
// 16/11 (user, H2): the statue leaves the hall axis — from the entrance it hid the Hiệu trưởng portrait completely
// (statue ≈10° wide vs the 3.7° frame, measured) and turned its back on Ban Giám hiệu — and stands in a recessed niche
// in the foyer's right wall, facing the visitors' path to the door (statue faces −x). Exported to Blender (hall-layout.json).
// 16/11 (user: “tượng quá mờ — mở rộng ra như một phòng thu nhỏ trưng bày”): the niche becomes a small exhibition
// room behind the foyer's right wall (nothing is built there: x 4.66 → 8.06, z 9.4 → 12.8). The visitor walks in
// through a 2.2 m portal and stands 1.7 m from the statue, which then fills the view. Exported to Blender.
export const STATUE_ROOM={x0:4.66,x1:8.06,z0:9.4,z1:12.8,height:3.2,opening:{wallX:4.54,width:2.2,height:2.8}};
export const MONUMENT={x:7.05,z:11.1,yaw:-Math.PI/2,width:1.0,depth:.62,pedestalHeight:.88,clearance:1.05,
 niche:{wallX:4.54,width:2.2,height:2.8,depth:STATUE_ROOM.x1-4.54},room:STATUE_ROOM};
/** Where the visitor stands in the statue room (1.7 m from the statue: it fills the view, sharp). */
export const STATUE_STOP={id:'statue',title:'Tượng nhà giáo Chu Văn An',group:'statue',eye:[5.35,1.6,11.1],target:[7.05,1.45,11.1],dwell:9000};
/** 17/11 (A+, user): the three memory cabinets were removed (sample objects only, small and dark from the room).
 * The entrance wall left of the door (seen from inside, x 4.8 → 9.2) carries one large slide screen instead: school
 * activities, achievements and documents (gallery.mjs), tap → full-screen viewer. Kept as an (empty) list for the
 * Blender build script and old code paths. */
export const CABINETS=[];
export const FRONT_SCREEN={id:'memory-1',x:7.0,y:1.88,width:4.4,height:2.475,wallZ:8,title:'Dấu ấn nhà trường',description:'Hình ảnh hoạt động, thành tích và tư liệu của nhà trường.'};
export const CABINET_NICHE={width:2.12,bottom:.85,top:2.95,wallZ:8,depth:.48,frame:.035};
/** Plaster of the entrance wall right of the door (x 2 → 12): one solid piece since the cabinets are gone. */
export function cabinetWallPieces(){return [{x:7,y:HALL.height/2,width:10,height:HALL.height}];}
// Fixed wall positions (17/11): 1 principal + 2 deputies (Ban Giám hiệu) + 96 teachers & staff in one run = 99 (98 people today).
export function wallColumns(){return exhibitSlots().filter((s,i,a)=>a.findIndex(v=>v.column===s.column)===i);}
/** 17/11 (người dùng: “điểm dừng theo tổ cho khoa học”): one stop per tổ block — a run of columns of one tổ on one wall —
 * titled “Tổ Ngữ Văn”; a block longer than 5 columns (wider than one view) is split evenly (“Tổ KHTN · 1”, “· 2”);
 * a lone column (a tổ sharing a column, an empty position) joins its neighbour. A wall that is not arranged by tổ
 * (too many tiny blocks) or an empty room keeps the old 3-column chunks (returns null). */
const MAX_STOP_COLUMNS=5;
function deptChunks(columns,slots){
 const people=slots.filter(s=>s.group==='teacher').map(s=>s.person);if(!people.length)return null;
 const names=new Map(deptGroups(people).map(g=>[g.key,g.name]));
 const keyOfP=p=>isOffice(p)?OFFICE_KEY:deptKey(p.dept);
 const colKey=c=>{const inCol=slots.filter(s=>s.column===c.column).sort((a,b)=>b.y-a.y);return inCol.length?keyOfP(inCol[0].person):null;};
 let blocks=[];
 for(const c of columns){const k=colKey(c),last=blocks.at(-1);
  if(last&&last.cols[0].wall===c.wall&&Math.hypot(last.cols.at(-1).x-c.x,last.cols.at(-1).z-c.z)<=2&&(k===null||last.key===k))last.cols.push(c);
  else blocks.push({key:k,cols:[c]});}
 // lone columns join the neighbour on the same wall (previous first)
 for(let i=0;i<blocks.length;i++){const b=blocks[i];if(b.cols.length>1&&b.key!==null)continue;
  const prev=blocks[i-1],next=blocks[i+1],same=o=>o&&o.cols[0].wall===b.cols[0].wall;
  const into=same(prev)?prev:same(next)?next:null;if(!into||(b.key!==null&&b.cols.length>1))continue;
  if(into===prev)prev.cols.push(...b.cols);else next.cols.unshift(...b.cols);blocks.splice(i,1);i--;}
 blocks=blocks.filter(b=>b.cols.length);
 const named=blocks.filter(b=>b.key!==null&&names.has(b.key));
 if(!named.length||blocks.length>columns.length*.45)return null;   // not arranged by tổ yet
 const chunks=[],titles=[];
 for(const b of blocks){const name=names.get(b.key)||'',parts=Math.ceil(b.cols.length/MAX_STOP_COLUMNS),size=Math.ceil(b.cols.length/parts);
  // numbers (“· 1”, “· 2”) are given later, in visiting order; people without a tổ yet → the zone's own name
  for(let k=0;k<parts;k++){chunks.push(b.cols.slice(k*size,(k+1)*size));titles.push(name&&b.key!==deptKey('Chưa phân tổ')?'Tổ '+name:'Các thế hệ nhà giáo');}}
 return {chunks:chunks.filter(c=>c.length),titles:titles.filter((_,i)=>chunks[i].length)};
}
export function layoutHall(people,sort='service',page=0){
 const {assigned,warnings,definitions}=assignExhibitSlots(people);
 const slots=people.filter(p=>assigned.has(p.id)).map(person=>({...assigned.get(person.id),person}));
 const zones=EXHIBIT_ZONES.map(z=>({...z,people:slots.filter(s=>s.group===z.id).map(s=>s.person),capacity:definitions.filter(s=>s.group===z.id).length}));
 const stops=[{id:'entrance',title:'Toàn cảnh phòng truyền thống',group:'',eye:[0,1.7,9.1],target:[0,1.65,-7.8],dwell:5000}];
 const exhibits=[];
 for(const zone of zones){
  const wallOrder={back:0,left:1,front:2,right:3};
  const columns=definitions.filter(s=>s.group===zone.id).filter((s,i,a)=>a.findIndex(v=>v.column===s.column)===i).sort((a,b)=>wallOrder[a.wall]-wallOrder[b.wall]||(a.wall==='front'||a.wall==='back'?a.x-b.x:a.z-b.z));
  const byTo=zone.id==='teacher'?deptChunks(columns,slots):null;
  const chunks=byTo?byTo.chunks:[];
  if(!byTo)for(const c of columns){let last=chunks.at(-1);if(!last||last.length>=3||last[0].wall!==c.wall||Math.hypot(last.at(-1).x-c.x,last.at(-1).z-c.z)>2){last=[];chunks.push(last);}last.push(c);}
  chunks.forEach((chunk,i)=>{
   const x=zone.id==='principal'?0:chunk.reduce((n,c)=>n+c.x,0)/chunk.length,z=chunk.reduce((n,c)=>n+c.z,0)/chunk.length,yaw=chunk[0].yaw;
   exhibits.push({id:zone.id+'-'+i,title:byTo?byTo.titles[i]:zone.name+(chunks.length>1?' · '+(i+1):''),byTo:Boolean(byTo),group:zone.id,wall:chunk[0].wall,yaw,labelWidth:zone.id==='principal'?7.3:Math.min(4.8,chunk.length*.9-.1),slotIds:definitions.filter(s=>chunk.some(c=>c.column===s.column)).map(s=>s.slotId),eye:[x+Math.sin(yaw)*2.8,1.7,z+Math.cos(yaw)*2.8],target:[x,zone.id==='principal'?1.85:1.9,z],dwell:8000});
  });
 }
 // Hiệu trưởng and both Phó Hiệu trưởng share one centre wall, one sign and one stop.
 const principal=exhibits.find(s=>s.group==='principal');
 const ring=exhibits.filter(s=>s.group!=='principal'&&s.group!=='deputy');
 ring.push({...principal,id:'principal-0',title:'Ban Giám hiệu',wall:'back',slotIds:definitions.filter(s=>s.group==='principal'||s.group==='deputy').map(s=>s.slotId),target:[0,1.85,-7.78],eye:[0,1.7,-3.6],labelWidth:7.3,dwell:10000});
 const wallOrder={right:0,back:1,left:2,front:3};
 ring.sort((a,b)=>wallOrder[a.wall]-wallOrder[b.wall]||(a.wall==='right'?b.eye[2]-a.eye[2]:a.wall==='back'?b.eye[0]-a.eye[0]:a.wall==='left'?a.eye[2]-b.eye[2]:a.eye[0]-b.eye[0]));
 const seen={};
 // tổ stops: “· n” in visiting order, only for a tổ that has several stops
 {const total={},n={};for(const st of ring)if(st.byTo)total[st.title]=(total[st.title]||0)+1;
  for(const st of ring)if(st.byTo&&total[st.title]>1){n[st.title]=(n[st.title]||0)+1;st.title=st.title+' · '+n[st.title];}}
 for(const stop of ring){if(stop.byTo)continue;seen[stop.group]=(seen[stop.group]||0)+1;const zone=EXHIBIT_ZONES.find(z=>z.id===stop.group);stop.title=stop.group==='principal'?'Ban Giám hiệu':zone.name+' · '+seen[stop.group];}
 const finalStops=[...stops,{...FRONT_SCREEN,group:'memory',wall:'front',eye:[FRONT_SCREEN.x,1.7,3.3],target:[FRONT_SCREEN.x,FRONT_SCREEN.y,7.95],dwell:9000},...ring,
  // 16/11: the visit opens facing the statue, so the tour ends with it — a closing tribute before leaving
  {...STATUE_STOP},
  {id:'finish',title:'Kết thúc vòng tham quan',group:'',eye:[0,1.7,9.1],target:[0,1.65,-7.8],dwell:0}];
 const signs=[{id:'principal-sign',text:'BAN GIÁM HIỆU',x:0,z:-7.65,yaw:0,width:4.6,y:3.08},
 {id:'teacher-back-right',text:'CÁC THẾ HỆ NHÀ GIÁO',x:BACK_BAY.x,z:-7.79,yaw:0,width:5.6,y:3.32},
 {id:'teacher-back',text:'CÁC THẾ HỆ NHÀ GIÁO',x:-BACK_BAY.x,z:-7.79,yaw:0,width:5.6,y:3.32},
 {id:'teacher-left',text:TEACHER_MOTTO,x:-11.79,z:0,yaw:Math.PI/2,width:13.4,y:3.48,motto:true},
 {id:'teacher-right',text:'TẤT CẢ VÌ HỌC SINH THÂN YÊU',x:11.79,z:0,yaw:-Math.PI/2,width:13.4,y:3.48,motto:true,fontReference:TEACHER_MOTTO},
 {id:'memory-sign',text:'HIỀN TÀI LÀ NGUYÊN KHÍ CỦA MỘT QUỐC GIA',x:FRONT_SCREEN.x,z:7.78,yaw:Math.PI,width:6.4,y:3.5,motto:true},
 // 17/11 (A+): the new portrait bay on the entrance wall gets the same title as the back-wall bays
 {id:'teacher-front',text:'CÁC THẾ HỆ NHÀ GIÁO',x:FRONT_BAY.x,z:7.79,yaw:Math.PI,width:5.6,y:3.32}];
 return {slots,zones,stops:finalStops,signs,pages:1,page:0,total:people.length,displayed:slots.length,warnings,reserved:definitions.length-slots.length};
}
// A dedicated wide shot on portrait screens keeps all four principals visible.
/** Phones held sideways (16/11, user: teacher photos too small): stand 1.9 m from the teacher/staff walls instead of
 * 2.8 m — the closest distance at which both rows still fit the 62° vertical view — aimed at the middle of the rows.
 * 17/11 (A+, user chose “giữ cỡ ảnh”): one ROW at a time instead — 1.2 m from the wall, first the upper row, then
 * (next stop “…-low”, same place) the lower row: each portrait looks ≈1.6× larger than at 1.9 m. */
export const PHONE_WALL_DISTANCE=1.2,ROWS_CENTER_Y=2.02,CLOSEUP_DISTANCE=1.1,PHONE_ROW_Y=[2.64,1.44];
export function fitHallStops(stops,aspect,phone=false){
 return stops.flatMap(s=>{
  if(s.id==='principal-0'&&aspect<1.1)return [{...s,eye:[0,1.7,-2.6]}];
  if(phone&&aspect>=1.1&&(s.group==='teacher'||s.group==='staff')&&Number.isFinite(s.yaw)){
   const [tx,,tz]=s.target;
   for(const d of [PHONE_WALL_DISTANCE,1.4,1.9]){
    const eye=[tx+Math.sin(s.yaw)*d,1.7,tz+Math.cos(s.yaw)*d];
    if(isWalkable(eye))return [{...s,eye,target:[tx,PHONE_ROW_Y[0],tz]},{...s,id:s.id+'-low',row:'low',eye,target:[tx,PHONE_ROW_Y[1],tz],dwell:Math.min(s.dwell??8000,6000)}];
   }
  }
  return [s];
 });
}
/** Stop id without the phone's “-low” (lower row) suffix — the zone stop it belongs to. */
export const baseStopId=id=>String(id||'').replace(/-low$/,'');
/** Close-up of one portrait (phones): 1.1 m in front of it — the whole frame fits a short landscape screen above the
 * close-up bar — eye at the photo's height, aimed 5 cm low so the photo sits in the free upper part (kept walkable). */
export function closeupStop(slot,title){
 const y=Math.min(2.3,Math.max(1.4,slot.y));
 for(const d of [CLOSEUP_DISTANCE,1.3,1.5]){
  const eye=[slot.x+Math.sin(slot.yaw)*d,y,slot.z+Math.cos(slot.yaw)*d];
  if(isWalkable(eye))return {id:'closeup:'+slot.slotId,title,group:'closeup',slotId:slot.slotId,eye,target:[slot.x,slot.y-.05,slot.z],dwell:0};
 }
 return null;
}
/** Reading order for “Trước / Sau” in a close-up: same zone, wall by wall, column by column, top row first. */
export function closeupOrder(slots,group){
 const wallOrder={right:0,back:1,left:2,front:3};
 const along=s=>s.wall==='right'?-s.z:s.wall==='back'?-s.x:s.wall==='left'?s.z:s.x;
 return slots.filter(s=>s.group===group||(group!=='teacher'&&group!=='staff'&&(s.group==='principal'||s.group==='deputy')))
  .sort((a,b)=>wallOrder[a.wall]-wallOrder[b.wall]||along(a)-along(b)||b.y-a.y);
}
export function isWalkable([x,y,z]){
 if(!Number.isFinite(x+y+z)||y<1.3||y>2.4)return false;
 // 15/11 (b): doorway strip, then the whole foyer floor (stay clear of the glass, stair opening and facade).
 if(z>7.45){
  if(z<=8.9)return Math.abs(x)<1.8;
  if(x<4.1)return x>-4.1&&z<=13.3;
  // 16/11: the statue room — through the portal (≥ 42 cm from each jamb), then the room floor (≥ 35–40 cm off the
  // walls), never onto the pedestal.
  const R=STATUE_ROOM,inPortal=x<=R.x0+.3&&Math.abs(z-MONUMENT.z)<R.opening.width/2-.42;
  const inRoom=x>R.x0+.3&&x<R.x1-.35&&z>R.z0+.4&&z<R.z1-.4;
  return (inPortal||inRoom)&&!(Math.abs(x-MONUMENT.x)<MONUMENT.clearance&&Math.abs(z-MONUMENT.z)<MONUMENT.clearance);
 }
 if(Math.abs(x)>11.5||Math.abs(z)>7.45)return false;
 if(Math.abs(x-MONUMENT.x)<MONUMENT.clearance&&Math.abs(z-MONUMENT.z)<MONUMENT.clearance)return false;
 if(x>3.35&&x<10.85&&z>6.65)return false; // cabinet cases and standing clearance
 return !BENCHES.some(([bx,bz])=>Math.abs(x-bx)<1.65&&Math.abs(z-bz)<.72);
}
/** 16/11: a leg through the doorway must cross both thresholds (z 7.45 and 8.9) at least 0.4 m inside the 1.8 m
 * half-opening — a diagonal from a hall corner straight to the foyer statue used to graze the jamb, and the rounded
 * path then clipped it. */
export const DOOR_CROSS_HALF=1.4;
function crossesDoorSafely(a,b){
 for(const zt of [7.45,8.9]){
  if((a[2]-zt)*(b[2]-zt)>=0)continue;
  const x=a[0]+(b[0]-a[0])*(zt-a[2])/(b[2]-a[2]);if(Math.abs(x)>=DOOR_CROSS_HALF)return false;
 }
 return true;
}
export function segmentWalkable(a,b){
 if(!crossesDoorSafely(a,b))return false;
 const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.06));
 for(let i=0;i<=steps;i++)if(!isWalkable(a.map((v,k)=>v+(b[k]-v)*i/steps)))return false;
 return true;
}
export function createHallPlan(stops){
 const nodes={},edges={};
 for(const stop of stops)nodes[stop.id]={...stop};
 nodes.gate={id:'gate',title:'Cổng vào',eye:ARRIVAL_START.slice(),target:gateLook(1.6)};
 [[0,7.1],[-1.65,6.4],[-1.65,3.2]].forEach(([x,z],i)=>{const id='foyer-'+i;nodes[id]={id,eye:[x,1.7,z],target:[0,1.85,-7.8]};});
 [[-8.8,-4.7],[8.8,-4.7],[8.8,4.7],[-8.8,4.7],[0,-1.5]].forEach(([x,z],i)=>{const id='junction-'+i;nodes[id]={id,eye:[x,1.7,z],target:[0,1.7,-7.8]};});
 for(const n of Object.values(nodes))edges[n.id]=Object.values(nodes).filter(o=>o.id!==n.id&&segmentWalkable(n.eye,o.eye)).map(o=>o.id);
 return {count:1,nodes,edges};
}
// Shortest safe walk through the open hall, not a teleport between rooms.
export function findPath(plan,from,to){
 if(!plan.nodes[from]||!plan.nodes[to])throw new Error('Unknown hall stop');
 const dist=new Map([[from,0]]),prev=new Map(),todo=new Set(Object.keys(plan.nodes));
 while(todo.size){const id=[...todo].sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity))[0];todo.delete(id);if(id===to)break;if(!dist.has(id))break;
  for(const next of plan.edges[id]){const a=plan.nodes[id].eye,b=plan.nodes[next].eye,d=dist.get(id)+Math.hypot(a[0]-b[0],a[2]-b[2]);if(d<(dist.get(next)??Infinity)){dist.set(next,d);prev.set(next,id);}}
 }
 if(!dist.has(to))throw new Error('No safe hall path');
 const out=[];for(let id=to;id;id=prev.get(id))out.unshift(plan.nodes[id]);return out;
}

