// 17/11 (user: “sắp theo tổ”): arrange the teacher zone by department (tổ), pure functions (tests/arrangeByDept.test.mjs).
// The zone is FULL (112 people, 112 positions), so nothing may stay empty: people are packed contiguously in reading order
// (wall segments by visibility, columns left→right as the visitor faces the wall, top cell then bottom), and the ORDER of the
// tổ is searched so that as few tổ as possible are cut across two walls. No gender is used (the data has none).
import {exhibitSlots,exhibitZone} from './exhibitSlots.mjs';

const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
/** Spelling-insensitive key: case, accents kept apart from dashes/spaces (“Toán - Tin” = “Toán Tin” = “Toán – Tin”). */
export function deptKey(dept){
 const k=strip(dept).toLowerCase().replace(/[-–—_/.,]+/g,' ').replace(/\s+/g,' ').trim();
 return ({khtn:'khoa hoc tu nhien',khxh:'khoa hoc xa hoi'})[k]||k;
}
const PRETTY={'khoa hoc tu nhien':'Khoa học tự nhiên','khoa hoc xa hoi':'Khoa học xã hội'};
/** Readable name for a group of spellings: the most used one, with a proper en dash and sentence-like case kept. */
function prettyName(variants){
 const best=[...variants.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'vi'))[0][0];
 const key=deptKey(best);if(PRETTY[key])return PRETTY[key];
 return best.replace(/\s*[-–—]\s*/g,' – ').replace(/\s+/g,' ').trim();
}

/** Teacher-zone departments after the safe merges (spelling only). Semantic merges (Ngoại ngữ / Tiếng Anh…) are the admin's call. */
export function deptGroups(people){
 const groups=new Map();
 for(const p of people){if(exhibitZone(p)!=='teacher')continue;const key=deptKey(p.dept);
  if(!groups.has(key))groups.set(key,{key,variants:new Map(),ids:[]});
  const g=groups.get(key);g.variants.set(p.dept,(g.variants.get(p.dept)||0)+1);g.ids.push(p.id);}
 return [...groups.values()].map(g=>({key:g.key,name:prettyName(g.variants),variants:[...g.variants.keys()],count:g.ids.length}))
  .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'vi'));
}

/** Wall segments of the teacher zone in visiting priority, each with its cells in reading order. */
export function teacherSegments(){
 const slots=exhibitSlots().filter(s=>s.group==='teacher');
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
 const teachers=people.filter(p=>exhibitZone(p)==='teacher');
 const segs=teacherSegments(),capacity=segs.reduce((n,s)=>n+s.capacity,0);
 const defaults=new Map(deptGroups(teachers).map(g=>[g.key,g.name]));
 const nameOf=p=>names[deptKey(p.dept)]||defaults.get(deptKey(p.dept));
 const byName=new Map();for(const p of teachers){const n=nameOf(p);if(!byName.has(n))byName.set(n,[]);byName.get(n).push(p);}
 // largest first, then alphabetical: the search keeps this preference among equally good orders (deterministic)
 const groups=[...byName.entries()].map(([name,list])=>({name,list:list.sort((a,b)=>roleRank(a)-roleRank(b)||firstYear(a)-firstYear(b)||a.name.localeCompare(b.name,'vi')||String(a.id).localeCompare(String(b.id)))}))
  .sort((a,b)=>b.list.length-a.list.length||a.name.localeCompare(b.name,'vi'));
 const order=orderDepts(groups.map(g=>g.list.length),segs.map(s=>s.capacity));
 const cells=segs.flatMap(s=>s.cells.map(slotId=>({slotId,seg:s.index})));
 const slot=new Map(),rename=new Map(),plan=[];let k=0;
 for(const gi of order){const g=groups[gi],used=new Map();
  for(const p of g.list){if(k>=cells.length)break;const c=cells[k++];slot.set(p.id,c.slotId);used.set(c.seg,(used.get(c.seg)||0)+1);
   if(p.dept!==g.name)rename.set(p.id,g.name);}
  plan.push({name:g.name,count:g.list.length,parts:[...used.entries()].map(([seg,n])=>({wall:segs[seg].wall,seg,count:n}))});}
 return {slot,rename,plan,unplaced:teachers.filter(p=>!slot.has(p.id)).map(p=>p.id),split:plan.filter(p=>p.parts.length>1).map(p=>p.name),capacity,teachers:teachers.length};
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
