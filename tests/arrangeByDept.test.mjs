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
 assert.equal(g.find(x=>x.key===deptKey('Toán Tin')).name,'Toán-Tin','17/11: the school tổ name');
 assert.equal(deptKey('Sử – Ðịa'),deptKey('Sử-Địa'),'Ð (U+00D0) and any dash merge');assert.equal(deptKey('Sử -‐Địa'),deptKey('Sử – Địa'));
});

test('17/11 (A+): wall segments in visiting order — 100 positions for teachers AND staff, entrance wall last',()=>{
 const s=teacherSegments();
 assert.deepEqual(s.map(x=>x.wall),['back','back','left','right','front']);assert.deepEqual(s.map(x=>x.capacity),[16,16,26,26,16]);
 assert.equal(s.reduce((n,x)=>n+x.capacity,0),exhibitSlots().filter(x=>x.group==='teacher').length);
 // reading order: left → right as the visitor faces each wall; top cell before bottom cell in a column
 const back=s[0].cells.map(id=>slotById.get(id));assert.ok(back[0].x<back[2].x&&back[0].y>back[1].y);
 const left=s[2].cells.map(id=>slotById.get(id));assert.ok(left[0].z>left[2].z,'left wall read from the back corner towards the entrance');
});

test('17/11: arrangement places every teacher once, contiguously per tổ, leaders first — deterministic',()=>{
 const r=arrangeByDept(published),all=published.filter(p=>exhibitZone(p)==='teacher');
 // more teachers than the 96 positions → the photo-less ones stay off the wall (17/11 real data: 95, everyone fits)
 assert.equal(r.unplaced.length,Math.max(0,all.length-96));
 assert.equal(r.plan.at(-1).name,'Văn Phòng','Tổ văn phòng (all staff) closes the run');
 assert.ok(all.filter(p=>p.group==='staff').every(p=>deptKey(r.rename.get(p.id)??p.dept)===deptKey('Văn Phòng')),'staff join Tổ văn phòng');assert.ok(r.unplaced.every(id=>!all.find(p=>p.id===id).image),'only photo-less samples are left out');
 for(const id of r.unplaced)assert.equal(r.slot.get(id),'','no stale position kept');
 const teachers=all.filter(p=>r.slot.get(p.id));
 const slots=[...r.slot.values()].filter(Boolean);assert.equal(new Set(slots).size,slots.length,'no position used twice');
 for(const id of slots)assert.equal(slotById.get(id).group,'teacher','stays in the teacher zone');
 // contiguous in reading order (a tổ may be cut only where reported)
 const order=teacherSegments().flatMap(s=>s.cells),idx=new Map(order.map((id,i)=>[id,i]));
 const name=new Map(teachers.map(p=>[p.id,r.rename.get(p.id)??deptGroups(published).find(g=>g.key===deptKey(p.dept)).name]));
 const seq=[...r.slot.entries()].filter(([,s])=>s).sort((a,b)=>idx.get(a[1])-idx.get(b[1])).map(([id])=>name.get(id));
 const blocks=seq.filter((n,i)=>i===0||seq[i-1]!==n);assert.equal(blocks.length,new Set(blocks).size,'each tổ is one run in reading order');
 assert.ok(r.split.length<=1,'at most one tổ cut across walls with the current sizes');
 // tổ trưởng then tổ phó first inside their tổ
 for(const p of teachers.filter(p=>/Tổ trưởng/i.test(p.role))){
  const mates=teachers.filter(q=>name.get(q.id)===name.get(p.id));assert.equal(Math.min(...mates.map(q=>idx.get(r.slot.get(q.id)))),idx.get(r.slot.get(p.id)),'tổ trưởng opens the tổ');
 }
 assert.deepEqual([...arrangeByDept(published).slot.entries()],[...r.slot.entries()],'same input → same wall');
 // admin merge: two tổ become one block with one name
 const merged=arrangeByDept(published,{[deptKey('Tiếng Anh')]:'Ngoại ngữ',[deptKey('Ngoại ngữ')]:'Ngoại ngữ'});
 const both=r.plan.filter(p=>p.name==='Ngoại ngữ'||p.name==='Tiếng Anh').reduce((n,p)=>n+p.count,0);
 assert.ok(merged.plan.some(p=>p.name==='Ngoại ngữ'&&p.count===both)&&!merged.plan.some(p=>p.name==='Tiếng Anh'),'one block, one name');
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
 const big=deptGroups(published).filter(g=>g.count>=4).length;
 assert.ok(plates.length>=Math.max(1,big-1),'one plate per sizeable block');
 assert.ok(plates.every(p=>p.count>=2&&p.length>1.2));
 const scattered=placed.map((s,i)=>({...s,person:{...s.person,dept:'T'+(i%5)}}));
 assert.equal(deptPlates(scattered).length,0);
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes('<DeptPlates slots={p.layout.slots}/>')&&scene.includes('position={[0,0,-.12]}'),'plate 1.4 cm off the wall');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('Sắp xếp theo tổ…')&&tour.includes("import.meta.env.DEV?lazy(()=>import('../components/AdminArrange'))"),'admin-only button');
});

test('17/11: Tổ văn phòng is named “Văn Phòng” whatever its members once wrote; inside a tổ: tổ trưởng, tổ phó, then by tên',()=>{
 const t=(id,name,role,dept,group='teacher')=>({id,name,role,dept,group,status:'Đang công tác',image:'x',startYear:2026,workHistory:[{startYear:2026,role}]});
 const people=[t('a','Nguyễn Thị Hoa','Giáo viên','Sử-Địa'),t('b','Lê Văn An','Giáo viên','Sử-Địa'),t('c','Trần Thị Bình','Tổ phó','Sử-Địa'),t('d','Phạm Văn Dũng','Tổ trưởng','Sử-Địa'),
  t('e','Võ Thị Mai','Nhân viên','Văn Phòng','staff'),t('f','Đỗ Văn Tý','Giáo viên','Sử - Địa','staff')];
 const g=deptGroups(people);
 assert.deepEqual(g.map(x=>x.name).sort(),['Sử-Địa','Văn Phòng'],'old “staff” tag with role Giáo viên stays in Sử-Địa; the office group is never called Sử-Địa');
 assert.equal(g.find(x=>x.name==='Sử-Địa').count,5);
 const r=arrangeByDept(people),cells=teacherSegments().flatMap(s=>s.cells);
 const seq=people.filter(p=>r.slot.get(p.id)).sort((a,b)=>cells.indexOf(r.slot.get(a.id))-cells.indexOf(r.slot.get(b.id))).map(p=>p.name);
 assert.deepEqual(seq,['Phạm Văn Dũng','Trần Thị Bình','Lê Văn An','Nguyễn Thị Hoa','Đỗ Văn Tý','Võ Thị Mai'],'tổ trưởng, tổ phó, then An < Hoa < Tý by tên; Văn Phòng last');
});
