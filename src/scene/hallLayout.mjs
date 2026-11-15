import {EXHIBIT_ZONES,exhibitSlots,assignExhibitSlots} from '../data/exhibitSlots.mjs';
import {ARRIVAL_START,gateLook} from './hallArrival.mjs';
const TEACHER_MOTTO='MỖI THẦY GIÁO, CÔ GIÁO LÀ MỘT TẤM GƯƠNG TỰ HỌC, TỰ SÁNG TẠO';
export const HALL={width:24,depth:16,height:4.2,capacity:127,pitch:.9};
export const BENCHES=[[-3.7,1.5],[3.7,1.5]];
export const MONUMENT={x:0,z:4.0,width:1.1,depth:1.1,pedestalHeight:.85,clearance:1.05};
export const CABINETS=[
 {id:'memory-0',x:4.7,title:'Tư liệu và kỷ vật',description:'Không gian lưu giữ tư liệu, hình ảnh và kỷ vật về hành trình xây dựng nhà trường.'},
 {id:'memory-1',x:7.1,title:'Dấu ấn nhà trường',description:'Vị trí dành cho các dấu mốc của nhà trường; hiện đang dùng hiện vật mẫu, chờ tư liệu được phê duyệt.'},
 {id:'memory-2',x:9.5,title:'Thành tích tập thể',description:'Vị trí dành cho thành tích chung của nhà trường; sẽ bổ sung nguồn và thời gian khi có tư liệu được phê duyệt.'}
];
// Recesses in the entrance wall: front glazing is nearly flush at z=7.96.
export const CABINET_NICHE={width:2.12,bottom:.85,top:2.95,wallZ:8,depth:.48,frame:.035};
export function cabinetWallPieces(){
 const n=CABINET_NICHE,pieces=[{x:7,y:n.bottom/2,width:10,height:n.bottom},{x:7,y:(n.top+HALL.height)/2,width:10,height:HALL.height-n.top}];
 let edge=2;
 for(const c of CABINETS){const left=c.x-n.width/2;pieces.push({x:(edge+left)/2,y:(n.bottom+n.top)/2,width:left-edge,height:n.top-n.bottom});edge=c.x+n.width/2;}
 pieces.push({x:(edge+12)/2,y:(n.bottom+n.top)/2,width:12-edge,height:n.top-n.bottom});return pieces;
}
// Fixed wall positions: 1 principal + 2 deputies (Ban Giám hiệu), 112 teachers, 12 staff = 127.
export function wallColumns(){return exhibitSlots().filter((s,i,a)=>a.findIndex(v=>v.column===s.column)===i);}
export function layoutHall(people,sort='service',page=0){
 const {assigned,warnings,definitions}=assignExhibitSlots(people);
 const slots=people.filter(p=>assigned.has(p.id)).map(person=>({...assigned.get(person.id),person}));
 const zones=EXHIBIT_ZONES.map(z=>({...z,people:slots.filter(s=>s.group===z.id).map(s=>s.person),capacity:definitions.filter(s=>s.group===z.id).length}));
 const stops=[{id:'entrance',title:'Toàn cảnh phòng truyền thống',group:'',eye:[0,1.7,9.1],target:[0,1.65,-7.8],dwell:5000}];
 const exhibits=[];
 for(const zone of zones){
  const wallOrder={back:0,left:1,front:2,right:3};
  const columns=definitions.filter(s=>s.group===zone.id).filter((s,i,a)=>a.findIndex(v=>v.column===s.column)===i).sort((a,b)=>wallOrder[a.wall]-wallOrder[b.wall]||(a.wall==='front'||a.wall==='back'?a.x-b.x:a.z-b.z));
  const chunks=[];
  for(const c of columns){let last=chunks.at(-1);if(!last||last.length>=3||last[0].wall!==c.wall||Math.hypot(last.at(-1).x-c.x,last.at(-1).z-c.z)>2){last=[];chunks.push(last);}last.push(c);}
  chunks.forEach((chunk,i)=>{
   const x=zone.id==='principal'?0:chunk.reduce((n,c)=>n+c.x,0)/chunk.length,z=chunk.reduce((n,c)=>n+c.z,0)/chunk.length,yaw=chunk[0].yaw;
   exhibits.push({id:zone.id+'-'+i,title:zone.name+(chunks.length>1?' · '+(i+1):''),group:zone.id,wall:chunk[0].wall,yaw,labelWidth:zone.id==='principal'?7.3:Math.min(4.8,chunk.length*.9-.1),slotIds:definitions.filter(s=>chunk.some(c=>c.column===s.column)).map(s=>s.slotId),eye:[x+Math.sin(yaw)*2.8,1.7,z+Math.cos(yaw)*2.8],target:[x,zone.id==='principal'?1.85:1.9,z],dwell:8000});
  });
 }
 // Hiệu trưởng and both Phó Hiệu trưởng share one centre wall, one sign and one stop.
 const principal=exhibits.find(s=>s.group==='principal');
 const ring=exhibits.filter(s=>s.group!=='principal'&&s.group!=='deputy');
 ring.push({...principal,id:'principal-0',title:'Ban Giám hiệu',wall:'back',slotIds:definitions.filter(s=>s.group==='principal'||s.group==='deputy').map(s=>s.slotId),target:[0,1.85,-7.78],eye:[0,1.7,-3.6],labelWidth:7.3,dwell:10000});
 const wallOrder={right:0,back:1,left:2,front:3};
 ring.sort((a,b)=>wallOrder[a.wall]-wallOrder[b.wall]||(a.wall==='right'?b.eye[2]-a.eye[2]:a.wall==='back'?b.eye[0]-a.eye[0]:a.wall==='left'?a.eye[2]-b.eye[2]:a.eye[0]-b.eye[0]));
 const seen={};
 for(const stop of ring){seen[stop.group]=(seen[stop.group]||0)+1;const zone=EXHIBIT_ZONES.find(z=>z.id===stop.group);stop.title=stop.group==='principal'?'Ban Giám hiệu':zone.name+' · '+seen[stop.group];}
 const finalStops=[...stops,...CABINETS.map(c=>({...c,group:'memory',wall:'front',eye:[c.x,1.7,4.0],target:[c.x,1.65,7.45],dwell:9000})),...ring,
  {id:'finish',title:'Kết thúc vòng tham quan',group:'',eye:[0,1.7,9.1],target:[0,1.65,-7.8],dwell:0}];
 const signs=[{id:'principal-sign',text:'BAN GIÁM HIỆU',x:0,z:-7.65,yaw:0,width:4.6,y:3.08},
 {id:'teacher-back-right',text:'CÁC THẾ HỆ NHÀ GIÁO',x:7.0,z:-7.79,yaw:0,width:5.6,y:3.32},
 {id:'teacher-back',text:'CÁC THẾ HỆ NHÀ GIÁO',x:-7.0,z:-7.79,yaw:0,width:5.6,y:3.32},
 {id:'teacher-left',text:TEACHER_MOTTO,x:-11.79,z:0,yaw:Math.PI/2,width:13.4,y:3.48,motto:true},
 {id:'teacher-right',text:'TẤT CẢ VÌ HỌC SINH THÂN YÊU',x:11.79,z:0,yaw:-Math.PI/2,width:13.4,y:3.48,motto:true,fontReference:TEACHER_MOTTO},
 {id:'staff-sign',text:'ĐỘI NGŨ NHÂN VIÊN',x:11.79,z:4.5,yaw:-Math.PI/2,width:3.6,y:3.13,labelHeight:.14},
 {id:'memory-sign',text:'HIỀN TÀI LÀ NGUYÊN KHÍ CỦA MỘT QUỐC GIA',x:7.1,z:7.78,yaw:Math.PI,width:7.1,y:3.44,motto:true}];
 return {slots,zones,stops:finalStops,signs,pages:1,page:0,total:people.length,displayed:slots.length,warnings,reserved:definitions.length-slots.length};
}
// A dedicated wide shot on portrait screens keeps all four principals visible.
export function fitHallStops(stops,aspect){
 return stops.map(s=>s.id==='principal-0'&&aspect<1.1?{...s,eye:[0,1.7,-2.6]}:s);
}
export function isWalkable([x,y,z]){
 if(!Number.isFinite(x+y+z)||y<1.3||y>2.4)return false;
 // 15/11 (b): doorway strip, then the whole foyer floor (stay clear of the glass, stair opening and facade).
 if(z>7.45)return z>8.9?Math.abs(x)<4.1&&z<=13.3:Math.abs(x)<1.8;
 if(Math.abs(x)>11.5||Math.abs(z)>7.45)return false;
 if(Math.abs(x-MONUMENT.x)<MONUMENT.clearance&&Math.abs(z-MONUMENT.z)<MONUMENT.clearance)return false;
 if(x>3.35&&x<10.85&&z>6.65)return false; // cabinet cases and standing clearance
 return !BENCHES.some(([bx,bz])=>Math.abs(x-bx)<1.65&&Math.abs(z-bz)<.72);
}
export function segmentWalkable(a,b){
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

