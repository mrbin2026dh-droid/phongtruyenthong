import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutHall,createHallPlan,findPath,isWalkable,segmentWalkable,wallColumns} from '../src/scene/hallLayout.mjs';
import {slideStep,routeFromPosition,roundedPath} from '../src/scene/hallMotion.mjs';
const people=n=>Array.from({length:n},(_,i)=>({id:'GV'+i,group:i<3?'management':i<87?'teacher':'staff',role:i<1?'Hiệu trưởng':i<3?'Phó Hiệu trưởng':i<87?'Giáo viên':'Nhân viên',name:'Mẫu '+i,startYear:1990+i,workHistory:[],birthYear:null}));
test('Một phòng (17/11: 99 chỗ): 12/96/99 người giữ một ID, khung vừa tường, hai hàng không trùng vị trí',()=>{
 for(const n of [12,96,99]){
  const l=layoutHall(people(n));assert.equal(l.slots.length,n);assert.equal(new Set(l.slots.map(s=>s.person.id)).size,n);
  assert.equal(new Set(l.slots.map(s=>[s.x,s.y,s.z].join())).size,n);
  for(const s of l.slots){assert.ok(Math.abs(s.x)<=11.86&&Math.abs(s.z)<=7.86);assert.ok(s.y-.51>.63&&s.y+s.height/2<=3.125,'17/11: larger frames end ≤ 3.12 m, under the 3.18 m wall signs');}
 }
 const cols=wallColumns();assert.equal(cols.length,51,'3 BGH + 42 teacher + 6 staff columns');
 // Nameplates are .69m wide; keep an actual gap after redistribution.
 for(let i=0;i<cols.length;i++)for(let j=i+1;j<cols.length;j++)if(cols[i].wall===cols[j].wall)assert.ok(Math.hypot(cols[i].x-cols[j].x,cols[i].z-cols[j].z)>.71);
});
test('Khu đầy phải cảnh báo, không tạo phòng hay đổi bộ để giấu hồ sơ',()=>{
 const p=people(102);const l=layoutHall(p);assert.equal(l.pages,1);assert.equal(l.slots.length,99);assert.equal(l.warnings.length,3);
 assert.equal(new Set([...l.slots.map(s=>s.person.id),...l.warnings.map(w=>w.id)]).size,102);
 assert.equal(layoutHall([]).slots.length,0);
});
test('Mọi điểm dừng của127ảnh nối được, đường tự đi và bo góc tránh ghế/tường',()=>{
 const l=layoutHall(people(127)),plan=createHallPlan(l.stops);
 for(const a of l.stops)for(const b of l.stops){
  assert.ok(isWalkable(a.eye));const route=findPath(plan,a.id,b.id);
  const path=roundedPath(route.map(s=>s.eye),1);
  for(let i=1;i<path.points.length;i++)assert.ok(segmentWalkable(path.points[i-1],path.points[i]));
 }
 const route=routeFromPosition(plan,[-3.7,1.7,-.8],l.stops.at(-1).id);assert.ok(route.points.length>=2);
 assert.equal(isWalkable([-3.7,1.7,1.5]),false);
 assert.ok(isWalkable(slideStep([11,1.7,0],[100,0,0],1,[0])));
 assert.ok(isWalkable(slideStep([-3.7,1.7,-1],[0,0,100],1,[0])));
});
test('Home reaches the real gate from every exhibit without crossing the monument or walls',()=>{
 const l=layoutHall(people(127)),plan=createHallPlan(l.stops);
 assert.deepEqual(plan.nodes.gate.eye,[-3.9,1.7,10.85],'16/11: “Về cổng vào” returns to the H2 view');
 for(const stop of l.stops){
  const route=routeFromPosition(plan,stop.eye,'gate'),path=roundedPath(route.points,1);
  assert.equal(route.destination.id,'gate');
  assert.ok(path.points.slice(1).every((p,i)=>segmentWalkable(path.points[i],p)));
  assert.ok(path.points.at(-1).every((v,i)=>Math.abs(v-plan.nodes.gate.eye[i])<1e-8));
 }
});
