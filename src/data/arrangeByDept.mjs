// 17/11 (user: “sắp theo tổ”): arrange the teacher zone by department (tổ), pure functions (tests/arrangeByDept.test.mjs).
// When the zone is full nothing may stay empty: people are packed contiguously in reading order
// (wall segments by visibility, columns left→right as the visitor faces the wall, top cell then bottom), and the ORDER of the
// tổ is searched so that as few tổ as possible are cut across two walls. No gender is used (the data has none).
import {exhibitSlots,exhibitZone} from './exhibitSlots.mjs';

// 17/11: also Ð/ð (U+00D0/U+00F0, looks exactly like Đ) — a teacher list typed with it split “Sử – Địa” in two
const strip=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[đĐðÐ]/g,'d');
/** Spelling-insensitive key: case, accents kept apart from dashes/spaces (“Toán - Tin” = “Toán Tin” = “Toán – Tin”). */
/** 17/11 (user): every staff member belongs to “Tổ văn phòng”, which always closes the run (end of the right wall). */
export const OFFICE_KEY='van phong';
/** 17/11: Tổ văn phòng = role “Nhân viên” or tổ “Văn Phòng” — decided from the record itself, never from an old stored group
 * (an earlier import had tagged 12 teachers as staff by their old wall position). */
export const isOffice=p=>/nhan vien/.test(strip(p.role).toLowerCase())||deptKey(p.dept)===OFFICE_KEY;
const keyOf=p=>isOffice(p)?OFFICE_KEY:deptKey(p.dept);
export function deptKey(dept){
 // any dash, slash, dot, NBSP or other separator counts as a space (“Sử-Địa” = “Sử – Địa” = “Sử ‐ Địa”)
 const k=strip(dept).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 return ({khtn:'khoa hoc tu nhien',khxh:'khoa hoc xa hoi'})[k]||k;
}
/** 17/11 (người dùng): the school's own tổ names — shown everywhere (arrangement, tổ plates, the editor's list). */
export const SCHOOL_DEPTS=['Ngữ Văn','Sử-Địa','Tiếng Anh','Văn Thể Mỹ','Toán-Tin','KHTN','Văn Phòng'];
const PRETTY={'khoa hoc xa hoi':'Khoa học xã hội',...Object.fromEntries(SCHOOL_DEPTS.map(n=>[deptKey(n),n]))};
/** Readable name for a group of spellings: the most used one, with a proper en dash and sentence-like case kept. */
function prettyName(key,variants){
 // 17/11: the group's own key decides a known tổ name (the office group used to borrow “Sử-Địa” from its members' old tổ)
 if(PRETTY[key])return PRETTY[key];
 const best=[...variants.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'vi'))[0][0];
 return best.replace(/\s*[-–—]\s*/g,' – ').replace(/\s+/g,' ').trim();
}

/** Teacher-zone departments after the safe merges (spelling only). Semantic merges (Ngoại ngữ / Tiếng Anh…) are the admin's call. */
export function deptGroups(people){
 const groups=new Map();
 for(const p of people){if(exhibitZone(p)!=='teacher')continue;const key=keyOf(p);
  if(!groups.has(key))groups.set(key,{key,variants:new Map(),ids:[]});
  const g=groups.get(key);g.variants.set(p.dept,(g.variants.get(p.dept)||0)+1);g.ids.push(p.id);}
 return [...groups.values()].map(g=>({key:g.key,name:prettyName(g.key,g.variants),variants:[...g.variants.keys()],count:g.ids.length}))
  .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'vi'));
}

/** Wall segments of the teacher zone in visiting priority, each with its cells in reading order. */
export function teacherSegments(all=exhibitSlots()){
 const slots=all.filter(s=>s.group==='teacher');
 // position along the wall as the visitor reads it (left → right when facing the wall)
 const along=s=>s.wall==='back'?s.x:s.wall==='left'?-s.z:s.wall==='right'?s.z:-s.x;
 const out=[];
 for(const wall of ['back','left','right','front']){
  const cols=[...new Set(slots.filter(s=>s.wall===wall).map(s=>s.column))]
   .map(c=>({column:c,pos:along(slots.find(s=>s.column===c)),cells:slots.filter(s=>s.column===c).sort((a,b)=>b.y-a.y)}))
   .sort((a,b)=>a.pos-b.pos);
  const pitch=Math.min(...cols.slice(1).map((c,i)=>c.pos-cols[i].pos));
  let seg=null;
  cols.forEach((c,i)=>{if(!seg||c.pos-cols[i-1].pos>pitch*1.6){seg={wall,columns:[]};out.push(seg);}seg.columns.push(c);});
 }
 return out.map((s,i)=>({...s,index:i,cells:s.columns.flatMap(c=>c.cells.map(cell=>cell.slotId)),capacity:s.columns.reduce((n,c)=>n+c.cells.length,0)}));
}

const roleRank=p=>{const r=strip([p.role,...(p.workHistory||[]).map(h=>h.role)].join(' ')).toLowerCase();return /to truong/.test(r)?0:/to pho/.test(r)?1:2;};
/** Vietnamese order: by tên (last word), then the middle name, then the family name (“Nguyễn Thị An” before “Lê Văn Bình”). */
const nameParts=p=>{const w=String(p.name||'').trim().split(/\s+/);return [w.at(-1)||'',w.slice(1,-1).join(' '),w[0]||''];};
export const byGivenName=(a,b)=>{const x=nameParts(a),y=nameParts(b);for(let i=0;i<3;i++){const c=x[i].localeCompare(y[i],'vi');if(c)return c;}return 0;};
const firstYear=p=>Math.min(...(p.workHistory||[]).map(h=>h.startYear).concat(p.startYear??Infinity));

/** Order of the tổ that cuts the fewest tổ across segment borders (exact search over subsets; greedy beyond 18 tổ). */
export function orderDepts(sizes,capacities){
 const n=sizes.length,borders=[];let acc=0;for(const c of capacities.slice(0,-1)){acc+=c;borders.push(acc);}
 const cuts=(a,b)=>borders.filter(x=>x>a&&x<b).length;
 const sumOf=mask=>{let s=0;for(let i=0;i<n;i++)if(mask&(1<<i))s+=sizes[i];return s;};
 if(n>18)return sizes.map((_,i)=>i);
 const full=(1<<n)-1,memo=new Int16Array(1<<n).fill(-1);
 const f=mask=>{if(mask===full)return 0;if(memo[mask]>=0)return memo[mask];const s=sumOf(mask);let best=1e4;
  for(let i=0;i<n;i++)if(!(mask&(1<<i)))best=Math.min(best,cuts(s,s+sizes[i])+f(mask|(1<<i)));return memo[mask]=best;};
 const order=[];let mask=0;
 while(mask!==full){const s=sumOf(mask),target=f(mask);
  for(let i=0;i<n;i++)if(!(mask&(1<<i))&&cuts(s,s+sizes[i])+f(mask|(1<<i))===target){order.push(i);mask|=1<<i;break;}}
 return order;
}

/** Full arrangement. `names`: dept key → final tổ name (admin merges: several keys may map to one name).
 * Returns slot per person, the department rename per person (only where the text changes) and a readable plan. */
export function arrangeByDept(people,names={}){
 const all=people.filter(p=>exhibitZone(p)==='teacher');
 const segs=teacherSegments(),capacity=segs.reduce((n,s)=>n+s.capacity,0);
 // 17/11: more teachers than positions (sample records still in the data) → people with a photo first
 const teachers=all.length<=capacity?all:[...all.filter(p=>p.image),...all.filter(p=>!p.image)].slice(0,capacity);
 const defaults=new Map(deptGroups(teachers).map(g=>[g.key,g.name]));
 const nameOf=p=>names[keyOf(p)]||defaults.get(keyOf(p));
 const byName=new Map();for(const p of teachers){const n=nameOf(p);if(!byName.has(n))byName.set(n,[]);byName.get(n).push(p);}
 // largest first, then alphabetical: the search keeps this preference among equally good orders (deterministic)
 const groups=[...byName.entries()].map(([name,list])=>({name,list:list.sort((a,b)=>roleRank(a)-roleRank(b)||firstYear(a)-firstYear(b)||byGivenName(a,b)||String(a.id).localeCompare(String(b.id)))}))
  .sort((a,b)=>b.list.length-a.list.length||a.name.localeCompare(b.name,'vi'));
 // Tổ văn phòng (all staff + any teacher filed under “Văn phòng”) is taken out of the search and closes the run
 const officeIdx=groups.findIndex(g=>g.list.some(p=>keyOf(p)===OFFICE_KEY)),rest=groups.map((g,i)=>i).filter(i=>i!==officeIdx);
 const order=orderDepts(rest.map(i=>groups[i].list.length),segs.map(s=>s.capacity)).map(k=>rest[k]).concat(officeIdx>=0?[officeIdx]:[]);
 const cells=segs.flatMap(s=>s.cells.map(slotId=>({slotId,seg:s.index})));
 const slot=new Map(),rename=new Map(),plan=[];let k=0;
 for(const gi of order){const g=groups[gi],used=new Map();
  for(const p of g.list){if(k>=cells.length)break;const c=cells[k++];slot.set(p.id,c.slotId);used.set(c.seg,(used.get(c.seg)||0)+1);
   if(p.dept!==g.name)rename.set(p.id,g.name);}
  plan.push({name:g.name,count:g.list.length,parts:[...used.entries()].map(([seg,n])=>({wall:segs[seg].wall,seg,count:n}))});}
 const unplaced=all.filter(p=>!slot.has(p.id)).map(p=>p.id);for(const id of unplaced)slot.set(id,'');   // off the wall (no stale slot)
 return {slot,rename,plan,unplaced,split:plan.filter(p=>p.parts.length>1).map(p=>p.name),capacity,teachers:all.length};
}

/** Tổ name plates for the current wall: runs of ≥2 consecutive columns whose BOTTOM cell holds the same tổ (each bottom cell
 * belongs to exactly one tổ, so plates never overlap); a lone or scattered tổ gets none (an unsorted wall stays clean). */
export function deptPlates(placed){
 const bySlot=new Map(placed.map(s=>[s.slotId,s]));const plates=[];
 // only on a wall that IS arranged by tổ: in reading order the tổ form about one run each (an unsorted wall has many)
 const seq=teacherSegments().flatMap(sg=>sg.cells).map(id=>bySlot.get(id)?.person?.dept).filter(Boolean).map(deptKey);
 const runs=seq.filter((k,i)=>i===0||seq[i-1]!==k).length,kinds=new Set(seq).size;
 if(!seq.length||runs>kinds+3)return [];
 for(const seg of teacherSegments()){
  let run=null;
  const close=()=>{if(run&&run.columns.length>=2)plates.push(run);run=null;};
  for(const col of seg.columns){
   const bottom=bySlot.get(col.cells[col.cells.length-1].slotId),dept=bottom?.person?.dept;
   if(!dept){close();continue;}
   if(run&&deptKey(run.dept)===deptKey(dept))run.columns.push(col);else{close();run={dept,wall:seg.wall,columns:[col]};}
  }
  close();
 }
 return plates.map(r=>{const cells=r.columns.map(c=>c.cells[c.cells.length-1]),a=cells[0],b=cells[cells.length-1];
  return {dept:r.dept,wall:r.wall,yaw:a.yaw,x:(a.x+b.x)/2,z:(a.z+b.z)/2,length:Math.hypot(b.x-a.x,b.z-a.z)+a.width,count:r.columns.length};});
}
