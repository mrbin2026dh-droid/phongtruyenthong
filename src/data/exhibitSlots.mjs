// Physical slots belong to the room, not to the number of people currently shown.
export const EXHIBIT_ZONES=[
 {id:'principal',name:'Hiệu trưởng',short:'Hiệu trưởng'},
 {id:'deputy',name:'Phó Hiệu trưởng',short:'Phó hiệu trưởng'},
 {id:'teacher',name:'Các thế hệ nhà giáo',short:'Giáo viên & nhân viên'}
];
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
export function exhibitZone(p){
 // 17/11 (user): staff are “Tổ văn phòng” and share the teachers' continuous wall (placed last by the tổ arrangement)
 if(p.group!=='management')return 'teacher';
 const roles=[p.role,...(p.workHistory||[]).map(h=>h.role)].map(key);
 if(roles.some(r=>/^hieu truong(?:\s|$)/.test(r)))return 'principal';
 return roles.some(r=>/^pho hieu truong(?:\s|$)/.test(r))?'deputy':'management-other';
}
/** 17/11 (A+, user: “đủ 100 người”): 103 positions — 1 Hiệu trưởng + 2 Phó Hiệu trưởng + 100 for teachers AND staff in
 * one continuous run (staff = “Tổ văn phòng”, last). The three memory cabinets on the entrance wall were removed: a
 * large slide screen replaces them and the empty half of that wall (x −10.5 → −3.5) carries 8 portrait columns.
 * Frames stay 0.66×0.96 m (enlarging them would not help phones: the camera must step back to fit both rows); the
 * side walls get 13 columns at 1.0 m (was 16 at 0.853 m) — more air between the portraits.
 * Back wall: two bays of 8 columns (0.9 m pitch) centred on x ±7.5; side walls: 13 columns, z −6.0 → 6.0;
 * entrance wall: 8 columns (0.9 m) centred on x −7.0. Rows at 2.64 / 1.44 m. */
export const TEACHER_FRAME={width:.66,height:.96},TEACHER_ROWS=[2.64,1.44];
export const BACK_BAY_X=7.5,BACK_COLUMNS=8,BACK_PITCH=.9,SIDE_COLUMNS=13,SIDE_SPAN=6.0;
export const FRONT_BAY={x:-7.0,columns:8,pitch:.9,z:7.86};
export const LAYOUT_VERSION=2;
function buildSlots({sideColumns,sideSpan,front}){
 const out=[];let column=0;
 const next=zone=>zone+'-'+String(out.filter(s=>s.group===zone).length+1).padStart(3,'0');
 const pair=(zone,wall,x,z,yaw)=>{const c=column++;for(const y of TEACHER_ROWS)out.push({slotId:next(zone),group:zone,wall,x,y,z,yaw,column:c,width:TEACHER_FRAME.width,height:TEACHER_FRAME.height});};
 // Ban Giám hiệu: three identical 2:3 frames on one line, HT in the centre (13/11).
 const leader=(group,n,x,width,height,y)=>out.push({slotId:group+'-'+String(n).padStart(3,'0'),group,wall:'back',x,y,z:-7.73,yaw:0,column:column++,width,height});
 // 17/11: khung 1,084 m trên tấm nền 4,86 m → 4 khoảng đều 0,402 m (hai mép = giữa các khung) → Phó HT ở ±1,486
 leader('deputy',1,-1.486,1.00,1.50,1.80);leader('principal',1,0,1.00,1.50,1.80);leader('deputy',2,1.486,1.00,1.50,1.80);
 const bay=side=>{for(let i=0;i<BACK_COLUMNS;i++)pair('teacher','back',side*BACK_BAY_X+(i-(BACK_COLUMNS-1)/2)*BACK_PITCH,-7.86,0);};
 const sideZ=i=>Math.round((-sideSpan+i*2*sideSpan/(sideColumns-1))*1000)/1000;
 bay(-1);
 for(let i=0;i<sideColumns;i++)pair('teacher','left',-11.86,sideZ(i),Math.PI/2);
 for(let i=0;i<sideColumns;i++)pair('teacher','right',11.86,sideZ(i),-Math.PI/2);
 bay(1);
 if(front)for(let i=0;i<FRONT_BAY.columns;i++)pair('teacher','front',Math.round((FRONT_BAY.x+(i-(FRONT_BAY.columns-1)/2)*FRONT_BAY.pitch)*1000)/1000,FRONT_BAY.z,Math.PI);
 return out;
}
export function exhibitSlots(){return buildSlots({sideColumns:SIDE_COLUMNS,sideSpan:SIDE_SPAN,front:true});}
/** The 99-position wall used until 17/11 (16 columns per side wall, no entrance-wall portraits) — only to move saved
 * positions to the new wall in the same reading order (slotMigration.mjs). */
export function legacySlotsV1(){return buildSlots({sideColumns:16,sideSpan:6.4,front:false});}
/** Existing valid assignments win; new IDs fill only unused slots in their zone. */
export function assignExhibitSlots(people){
 const definitions=exhibitSlots(),used=new Set(),assigned=new Map(),warnings=[];
 // 17/11 (99 positions): people WITH a photo always come first — a photo-less sample record (“Giáo viên mẫu”) only fills
 // what is left and never keeps a real teacher off the wall. Within each class the old rules hold (own slot, then by year).
 const photo=p=>Boolean(p.image),order=(a,b)=>(a.startYear??Infinity)-(b.startYear??Infinity)||String(a.id).localeCompare(String(b.id),'en',{numeric:true});
 const own=p=>definitions.find(s=>s.slotId===p.displaySlot&&s.group===exhibitZone(p));
 const claimedBySamples=new Set(people.filter(p=>!photo(p)).map(own).filter(Boolean).map(s=>s.slotId));
 for(const cls of [true,false]){
  const group=people.filter(p=>photo(p)===cls);
  for(const p of group){const slot=own(p);if(slot&&!used.has(slot.slotId)){used.add(slot.slotId);assigned.set(p.id,slot);}}
  for(const p of group.filter(p=>!assigned.has(p.id)).sort(order)){
   const free=s=>s.group===exhibitZone(p)&&!used.has(s.slotId);
   const slot=(cls&&definitions.find(s=>free(s)&&!claimedBySamples.has(s.slotId)))||definitions.find(free);
   if(slot){used.add(slot.slotId);assigned.set(p.id,slot);}else warnings.push({id:p.id,zone:exhibitZone(p)});
  }
 }
 return {assigned,warnings,definitions};
}
export function attachExhibitSlots(people){const {assigned}=assignExhibitSlots(people);return people.map(p=>({...p,displaySlot:assigned.get(p.id)?.slotId||''}));}
