// Physical slots belong to the room, not to the number of people currently shown.
export const EXHIBIT_ZONES=[
 {id:'principal',name:'Hiệu trưởng',short:'Hiệu trưởng'},
 {id:'deputy',name:'Phó Hiệu trưởng',short:'Phó hiệu trưởng'},
 {id:'teacher',name:'Các thế hệ nhà giáo',short:'Giáo viên'},
 {id:'staff',name:'Đội ngũ nhân viên',short:'Nhân viên'}
];
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
export function exhibitZone(p){
 if(p.group==='staff')return 'staff';if(p.group!=='management')return 'teacher';
 const roles=[p.role,...(p.workHistory||[]).map(h=>h.role)].map(key);
 if(roles.some(r=>/^hieu truong(?:\s|$)/.test(r)))return 'principal';
 return roles.some(r=>/^pho hieu truong(?:\s|$)/.test(r))?'deputy':'management-other';
}
export function exhibitSlots(){
 const out=[];let column=0;
 // 4×6 (2:3) portraits: photo .49×.735 m inside a .55×.80 m frame; rows lowered 3 cm to keep the top row below wall signs.
 const pair=(zone,wall,x,z,yaw)=>{const c=column++;for(const y of [2.62,1.42])out.push({slotId:zone+'-'+String(out.filter(s=>s.group===zone).length+1).padStart(3,'0'),group:zone,wall,x,y,z,yaw,column:c,width:.55,height:.80});};
 // Ban Giám hiệu (13/11/2026): 1 Hiệu trưởng ở giữa, 2 Phó Hiệu trưởng hai bên, cố định.
 const leader=(group,n,x,width,height,y)=>out.push({slotId:group+'-'+String(n).padStart(3,'0'),group,wall:'back',x,y,z:-7.73,yaw:0,column:column++,width,height});
 // Ban Giám hiệu: three identical 2:3 frames (user request 13/11) on one line, HT in the centre.
 leader('deputy',1,-1.6,1.00,1.50,1.80);leader('principal',1,0,1.00,1.50,1.80);leader('deputy',2,1.6,1.00,1.50,1.80);
 for(let i=0;i<6;i++)pair('teacher','back',-5.8-i*.9,-7.86,0);
 for(let i=0;i<14;i++)pair('teacher','left',-11.86,-5.85+i*.9,Math.PI/2);
 for(let i=0;i<7;i++)pair('teacher','front',-10.35+i*.9,7.86,Math.PI);
 for(let i=0;i<5;i++)pair('teacher','front',10.35-i*.9,7.86,Math.PI);
 for(let i=0;i<14;i++)pair('teacher','right',11.86,5.85-i*.9,-Math.PI/2);
 // Former 12 deputy positions (back wall, right of centre) become teacher-093…104 for growth.
 for(let i=0;i<6;i++)pair('teacher','back',5.8+i*.9,-7.86,0);
 // Compact leadership panel (5.4 m) frees ~2.6 m per side: two new columns each side → teacher-105…112.
 for(const x of [-3.85,-4.75,3.85,4.75])pair('teacher','back',x,-7.86,0);
 for(const x of [-4.05,-3.15,2.7,3.6,4.5,5.4])pair('staff','front',x,7.86,Math.PI);
 // Keep IDs fixed while moving staff onto one uninterrupted interior wall.
 const staff=out.filter(s=>s.group==='staff'),swap=out.filter(s=>s.group==='teacher'&&s.wall==='right').slice(0,12);
 const pose=s=>({wall:s.wall,x:s.x,z:s.z,yaw:s.yaw});
 staff.forEach((s,i)=>{const old=pose(s);Object.assign(s,pose(swap[i]));Object.assign(swap[i],old);});
 // Symmetric front bays, well clear of the entrance, hinges and door leaves.
 for(const side of [-1,1]){
  const columns=[...new Set(out.filter(s=>s.wall==='front'&&Math.sign(s.x)===side).map(s=>s.column))];
  columns.sort((a,b)=>out.find(s=>s.column===a).x-out.find(s=>s.column===b).x);
  columns.forEach((c,i)=>{const x=side<0?-10.45+i*.85:3.65+i*.85;out.filter(s=>s.column===c).forEach(s=>{s.x=x;});});
 }
 // Free the entrance-left bay for memorabilia without deleting a portrait slot.
 // Relocate its nine columns onto the side walls; keep IDs, two rows and photo sizes.
 const displaced=[...new Set(out.filter(s=>s.wall==='front'&&s.x>0).map(s=>s.column))];
 displaced.forEach((column,i)=>out.filter(s=>s.column===column).forEach(s=>{
  Object.assign(s,{wall:i<5?'left':'right',x:i<5?-11.86:11.86,z:i<5?10+i:-14+i,yaw:i<5?Math.PI/2:-Math.PI/2});
 }));
 for(const wall of ['left','right']){
  const columns=[...new Set(out.filter(s=>s.wall===wall).map(s=>s.column))]
   .sort((a,b)=>out.find(s=>s.column===a).z-out.find(s=>s.column===b).z);
  columns.forEach((column,i)=>out.filter(s=>s.column===column).forEach(s=>{s.z=-6.4+i*12.8/(columns.length-1);}));
 }
 // Existing back-wall teacher columns shift .15 m towards the centre to sit evenly after the new ones (.9 m pitch).
 for(const s of out)if(s.group==='teacher'&&s.wall==='back'&&Math.abs(s.x)>=5.79)s.x=Math.sign(s.x)*Math.round((Math.abs(s.x)-.15)*1000)/1000;
 return out;
}
/** Existing valid assignments win; new IDs fill only unused slots in their zone. */
export function assignExhibitSlots(people){
 const definitions=exhibitSlots(),used=new Set(),assigned=new Map(),warnings=[];
 for(const p of people){const slot=definitions.find(s=>s.slotId===p.displaySlot&&s.group===exhibitZone(p));if(slot&&!used.has(slot.slotId)){used.add(slot.slotId);assigned.set(p.id,slot);}}
 const pending=people.filter(p=>!assigned.has(p.id)).sort((a,b)=>(a.startYear??Infinity)-(b.startYear??Infinity)||String(a.id).localeCompare(String(b.id),'en',{numeric:true}));
 for(const p of pending){const slot=definitions.find(s=>s.group===exhibitZone(p)&&!used.has(s.slotId));if(slot){used.add(slot.slotId);assigned.set(p.id,slot);}else warnings.push({id:p.id,zone:exhibitZone(p)});}
 return {assigned,warnings,definitions};
}
export function attachExhibitSlots(people){const {assigned}=assignExhibitSlots(people);return people.map(p=>({...p,displaySlot:assigned.get(p.id)?.slotId||''}));}
