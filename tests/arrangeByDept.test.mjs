import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arrangeByDept,deptGroups,deptKey,teacherSegments,orderDepts,deptPlates} from '../src/data/arrangeByDept.mjs';
import {exhibitSlots,exhibitZone} from '../src/data/exhibitSlots.mjs';
import {createCatalogStore} from '../src/data/catalog.mjs';

const published=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).people;
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const slotById=new Map(exhibitSlots().map(s=>[s.slotId,s]));

test('17/11: tổ spellings merge safely (case, dashes, spaces, KHTN) — meaning-level merges are left to the admin',()=>{
 assert.equal(deptKey('Toán - Tin'),deptKey('Toán Tin'));assert.equal(deptKey('Toán – Tin'),deptKey('toán tin'));
 assert.equal(deptKey('KHTN'),deptKey('Khoa học tự nhiên'));assert.equal(deptKey('Ngữ Văn'),deptKey('Ngữ văn'));
 assert.notEqual(deptKey('Ngoại ngữ'),deptKey('Tiếng Anh'),'not guessed');assert.notEqual(deptKey('Văn Thể Mỹ'),deptKey('Thể dục'));
 const g=deptGroups(published);assert.equal(g.reduce((n,x)=>n+x.count,0),published.filter(p=>exhibitZone(p)==='teacher').length);
 assert.equal(g.find(x=>x.key===deptKey('Toán Tin')).name,'Toán – Tin','readable name with an en dash');
});

test('17/11: wall segments in visiting order fill the 112 teacher positions exactly',()=>{
 const s=teacherSegments();
 assert.deepEqual(s.map(x=>x.wall),['back','back','left','right','front']);
 assert.equal(s.reduce((n,x)=>n+x.capacity,0),exhibitSlots().filter(x=>x.group==='teacher').length);
 // reading order: left → right as the visitor faces each wall; top cell before bottom cell in a column
 const back=s[0].cells.map(id=>slotById.get(id));assert.ok(back[0].x<back[2].x&&back[0].y>back[1].y);
 const left=s[2].cells.map(id=>slotById.get(id));assert.ok(left[0].z>left[2].z,'left wall read from the back corner towards the entrance');
});

test('17/11: arrangement places every teacher once, contiguously per tổ, leaders first — deterministic',()=>{
 const r=arrangeByDept(published),teachers=published.filter(p=>exhibitZone(p)==='teacher');
 assert.equal(r.unplaced.length,0);assert.equal(r.slot.size,teachers.length);
 const slots=[...r.slot.values()];assert.equal(new Set(slots).size,slots.length,'no position used twice');
 for(const id of slots)assert.equal(slotById.get(id).group,'teacher','stays in the teacher zone');
 // contiguous in reading order (a tổ may be cut only where reported)
 const order=teacherSegments().flatMap(s=>s.cells),idx=new Map(order.map((id,i)=>[id,i]));
 const name=new Map(teachers.map(p=>[p.id,r.rename.get(p.id)??deptGroups(published).find(g=>g.key===deptKey(p.dept)).name]));
 const seq=[...r.slot.entries()].sort((a,b)=>idx.get(a[1])-idx.get(b[1])).map(([id])=>name.get(id));
 const blocks=seq.filter((n,i)=>i===0||seq[i-1]!==n);assert.equal(blocks.length,new Set(blocks).size,'each tổ is one run in reading order');
 assert.ok(r.split.length<=1,'at most one tổ cut across walls with the current sizes');
 // tổ trưởng then tổ phó first inside their tổ
 for(const p of teachers.filter(p=>/Tổ trưởng/i.test(p.role))){
  const mates=teachers.filter(q=>name.get(q.id)===name.get(p.id));assert.equal(Math.min(...mates.map(q=>idx.get(r.slot.get(q.id)))),idx.get(r.slot.get(p.id)),'tổ trưởng opens the tổ');
 }
 assert.deepEqual([...arrangeByDept(published).slot.entries()],[...r.slot.entries()],'same input → same wall');
 // admin merge: two tổ become one block with one name
 const merged=arrangeByDept(published,{[deptKey('Tiếng Anh')]:'Ngoại ngữ',[deptKey('Ngoại ngữ')]:'Ngoại ngữ'});
 assert.ok(merged.plan.some(p=>p.name==='Ngoại ngữ'&&p.count===12));
});

test('17/11: order search cuts as few tổ as possible',()=>{
 const caps=[16,16,38,24,18],order=orderDepts([21,21,19,13,9,8,7,5,4,2,2,1],caps);
 assert.equal(new Set(order).size,12);
 const sizes=[21,21,19,13,9,8,7,5,4,2,2,1];let acc=0,cuts=0;const borders=[16,32,70,94];
 for(const i of order){const a=acc,b=acc+sizes[i];cuts+=borders.filter(x=>x>a&&x<b).length;acc=b;}
 assert.equal(cuts,1);
});

test('17/11: one save for the whole arrangement; undo restores the previous wall',()=>{
 const store=createCatalogStore(seed,{storage:memory()}),before=store.getSnapshot().people;
 const r=arrangeByDept(before),prev=store.arrange(r.slot,r.rename),after=store.getSnapshot();
 assert.equal(after.revision,1,'single publish');
 for(const [id,slot] of r.slot)assert.equal(after.people.find(p=>p.id===id).displaySlot,slot);
 store.restorePeople(prev);
 assert.deepEqual(store.getSnapshot().people.map(p=>[p.id,p.displaySlot,p.dept]),before.map(p=>[p.id,p.displaySlot,p.dept]));
});

test('17/11: tổ plates only under blocks of ≥ 2 columns of one tổ (an unsorted wall stays clean)',()=>{
 const r=arrangeByDept(published);
 const placed=[...r.slot.entries()].map(([id,slotId])=>({...slotById.get(slotId),person:{...published.find(p=>p.id===id),dept:r.rename.get(id)??published.find(p=>p.id===id).dept}}));
 const plates=deptPlates(placed);
 assert.ok(plates.length>=8,'one plate per sizeable block');
 assert.ok(plates.every(p=>p.count>=2&&p.length>1.2));
 const scattered=placed.map((s,i)=>({...s,person:{...s.person,dept:'T'+(i%5)}}));
 assert.equal(deptPlates(scattered).length,0);
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes('<DeptPlates slots={p.layout.slots}/>')&&scene.includes('position={[0,0,-.12]}'),'plate 1.4 cm off the wall');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('Sắp xếp theo tổ…')&&tour.includes("import.meta.env.DEV?lazy(()=>import('../components/AdminArrange'))"),'admin-only button');
});
