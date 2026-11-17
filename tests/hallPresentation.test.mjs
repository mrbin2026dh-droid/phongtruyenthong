import test from 'node:test';
import assert from 'node:assert/strict';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';
import {layoutHall,fitHallStops,createHallPlan,segmentWalkable,isWalkable} from '../src/scene/hallLayout.mjs';
import {routeFromPosition,roundedPath,samplePath,presentationTurnStep} from '../src/scene/hallMotion.mjs';
import {nextPresentationStop,presentationDwell} from '../src/scene/hallPresentation.mjs';

test('Finite clockwise tour starts with overview and three cases, covers every portrait once, ends at the statue, then stops',()=>{
 const l=layoutHall([]),ids=l.stops.map(s=>s.id);
 assert.deepEqual(ids.slice(0,4),['entrance','memory-0','memory-1','memory-2']);assert.equal(ids.at(-2),'statue','16/11: the visit opens facing the statue and closes with it');
 assert.equal(ids.at(-1),'finish');assert.equal(new Set(ids).size,ids.length);
 const shown=l.stops.flatMap(s=>s.slotIds||[]);
 assert.equal(shown.length,99);assert.equal(new Set(shown).size,99);
 assert.deepEqual([...shown].sort(),exhibitSlots().map(s=>s.slotId).sort());
 let at='gate';const visited=[];
 for(let i=0;i<100;i++){const next=nextPresentationStop(l.stops,at);if(!next)break;visited.push(next.id);at=next.id;}
 assert.deepEqual(visited,ids);assert.equal(nextPresentationStop(l.stops,'finish'),null);
 const order={right:0,back:1,left:2,front:3};
 const ring=l.stops.filter(s=>s.slotIds);
 for(let i=1;i<ring.length;i++)assert.ok(order[ring[i].wall]>=order[ring[i-1].wall]);
 assert.equal(ring.filter(s=>s.group==='deputy').length,0);assert.equal(ring.find(s=>s.id==='principal-0').slotIds.length,3);
 for(const group of ['teacher','staff'])ring.filter(s=>s.group===group).forEach((s,i)=>assert.ok(s.title.endsWith(' · '+(i+1))));
 assert.ok(l.stops.slice(0,-1).every(s=>presentationDwell(s)>=5000));
});

test('Camera turn is bounded, eases to rest and behaves consistently at 30/60/120Hz',()=>{
 const results=[];
 for(const hz of [30,60,120]){
  let angle=Math.PI;
  for(let i=0;i<hz*5;i++){
   const step=presentationTurnStep(angle,1/hz);assert.ok(step>=0&&step<=angle);assert.ok(step<=.85/hz+1e-12);
   angle-=step;
  }
  results.push(angle);assert.ok(angle<.008);
 }
 assert.ok(Math.max(...results)-Math.min(...results)<.001);
 assert.equal(presentationTurnStep(1,0),0);assert.equal(presentationTurnStep(0,.05),0);
 assert.ok(presentationTurnStep(.01,.016)<presentationTurnStep(1,.016));
});

test('Memorabilia bay has no portraits and blocks walking through cases; 99 IDs and two rows remain (17/11)',()=>{
 const slots=exhibitSlots();assert.equal(slots.length,99);
 assert.equal(new Set(slots.map(s=>s.slotId)).size,99);
 assert.ok(slots.every(s=>s.wall!=='front'),'17/11: no portraits on the entrance wall any more');
 assert.ok(slots.filter(s=>s.group!=='principal'&&s.group!=='deputy').every(s=>s.width===.66&&s.height===.96&&[1.44,2.64].includes(s.y)));
 for(const x of [4.7,7.1,9.5]){assert.equal(isWalkable([x,1.7,7.4]),false);assert.equal(isWalkable([x,1.7,4.65]),true);}
});

test('Every leg, including portrait camera and closing doorway, has a collision-free rounded route',()=>{
 for(const aspect of [.60,.75,1.0,1.8]){
  const stops=fitHallStops(layoutHall([]).stops,aspect),plan=createHallPlan(stops);
  for(let i=1;i<stops.length;i++){
   const a=stops[i-1],b=stops[i];assert.ok(isWalkable(b.eye));
   const route=routeFromPosition(plan,a.eye,b.id),path=roundedPath(route.points,1);
   for(let d=0;d<=path.total;d+=.035)assert.ok(isWalkable(samplePath(path,d)),`${a.id} → ${b.id}`);
   for(let j=1;j<path.points.length;j++)assert.ok(segmentWalkable(path.points[j-1],path.points[j]));
   assert.ok(samplePath(path,path.total).every((v,k)=>Math.abs(v-b.eye[k])<1e-9));
  }
  const principal=stops.find(s=>s.id==='principal-0');
  const distance=principal.eye[2]-principal.target[2],verticalFov=aspect<1.1?78:62;
  assert.ok(2*distance*Math.tan(verticalFov*Math.PI/360)*aspect>4.8,'Ban Giám hiệu (3 framed portraits, 4.5 m) fits horizontally');
 }
});
