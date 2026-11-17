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
/** 17/11 (user: the school has ~98 people, staffing quota 100; teachers said the portraits are too small on phones):
 * 99 positions — 1 Hiệu trưởng + 2 Phó Hiệu trưởng + 96 for teachers AND staff in one continuous run (user 17/11: 98 people =
 * 3 CBQL + 90 GV + 5 NV; staff = “Tổ văn phòng”, last) — and frames 20 % larger
 * each way (0.55×0.80 → 0.66×0.96 m: +44 % photo area). The entrance-wall bay is no longer used for portraits.
 * Back wall: two bays of 8 columns (0.9 m pitch) centred on x ±7.5; side walls: 16 columns each, z −6.4 → 6.4 (0.853 m).
 * Rows at 2.64 / 1.44 m: top frame ends 3.12 m (under the wall signs), the lower name plate stays above the slats' edge. */
export const TEACHER_FRAME={width:.66,height:.96},TEACHER_ROWS=[2.64,1.44];
export const BACK_BAY_X=7.5,BACK_COLUMNS=8,BACK_PITCH=.9,SIDE_COLUMNS=16,SIDE_SPAN=6.4;
export function exhibitSlots(){
 const out=[];let column=0;
 const next=zone=>zone+'-'+String(out.filter(s=>s.group===zone).length+1).padStart(3,'0');
 const pair=(zone,wall,x,z,yaw)=>{const c=column++;for(const y of TEACHER_ROWS)out.push({slotId:next(zone),group:zone,wall,x,y,z,yaw,column:c,width:TEACHER_FRAME.width,height:TEACHER_FRAME.height});};
 // Ban Giám hiệu: three identical 2:3 frames on one line, HT in the centre (13/11).
 const leader=(group,n,x,width,height,y)=>out.push({slotId:group+'-'+String(n).padStart(3,'0'),group,wall:'back',x,y,z:-7.73,yaw:0,column:column++,width,height});
 leader('deputy',1,-1.6,1.00,1.50,1.80);leader('principal',1,0,1.00,1.50,1.80);leader('deputy',2,1.6,1.00,1.50,1.80);
 const bay=side=>{for(let i=0;i<BACK_COLUMNS;i++)pair('teacher','back',side*BACK_BAY_X+(i-(BACK_COLUMNS-1)/2)*BACK_PITCH,-7.86,0);};
 const sideZ=i=>Math.round((-SIDE_SPAN+i*2*SIDE_SPAN/(SIDE_COLUMNS-1))*1000)/1000;
 bay(-1);
 for(let i=0;i<SIDE_COLUMNS;i++)pair('teacher','left',-11.86,sideZ(i),Math.PI/2);
 for(let i=0;i<SIDE_COLUMNS;i++)pair('teacher','right',11.86,sideZ(i),-Math.PI/2);
 bay(1);
 return out;
}
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
