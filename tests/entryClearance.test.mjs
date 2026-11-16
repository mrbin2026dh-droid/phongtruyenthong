import test from 'node:test';
import assert from 'node:assert/strict';
import {MONUMENT,STATUE_STOP,isWalkable,layoutHall,createHallPlan,findPath,segmentWalkable} from '../src/scene/hallLayout.mjs';
import {routeFromPosition,roundedPath} from '../src/scene/hallMotion.mjs';
import {readFileSync} from 'node:fs';

// 16/11 (user, H2): the statue hid the Hiệu trưởng portrait from the entrance; it now stands in the foyer niche.
test('Entrance → Ban Giám hiệu sightline is clear: no statue on the hall axis',()=>{
 const l=layoutHall([]),entrance=l.stops.find(s=>s.id==='entrance'),eye=entrance.eye;
 assert.ok(MONUMENT.z>8.56&&MONUMENT.x>4.54,'statue stands outside the hall, beyond the foyer wall face');
 assert.ok(isWalkable([0,1.7,4.0]),'hall centre free');
 for(const y of [1.8,2.55]){const z=4,yz=eye[1]+(y-eye[1])*(eye[2]-z)/(eye[2]+7.73);assert.ok(yz<3,'nothing on the axis in the hall');}
 const plan=createHallPlan(l.stops);
 assert.deepEqual(findPath(plan,'entrance','principal-0').map(n=>n.id),['entrance','principal-0'],'straight walk from the door to Ban Giám hiệu');
});
test('Statue niche: reachable foyer stop, visitors kept off the pedestal, statue faces the path',()=>{
 const l=layoutHall([]),plan=createHallPlan(l.stops);
 assert.ok(isWalkable(STATUE_STOP.eye)&&isWalkable([4.05,1.7,MONUMENT.z])&&!isWalkable([4.15,1.7,MONUMENT.z]),'foyer edge at x 4.1');
 assert.ok(MONUMENT.x-MONUMENT.depth/2-4.1>=.45,'visitors stay ≥ 45 cm from the pedestal and never enter the niche');
 const d=Math.hypot(STATUE_STOP.eye[0]-MONUMENT.x,STATUE_STOP.eye[2]-MONUMENT.z);assert.ok(d>=2.4&&d<=3.2,'viewed from 2.4–3.2 m (sketch statue: not too close)');
 for(const from of ['entrance','principal-0','gate'])assert.doesNotThrow(()=>findPath(plan,from,'statue'));
 assert.ok(Math.abs(MONUMENT.yaw+Math.PI/2)<1e-9,'faces −x, towards the foyer');
 const n=MONUMENT.niche;assert.ok(n.width>=1.6&&n.height>=2.6&&n.depth>=.6,'niche large enough for a 1.12 m seated statue on a 0.88 m pedestal');
 for(const target of ['memory-0','staff-0','principal-0','statue','gate']){
  const route=routeFromPosition(plan,[0,1.7,6.5],target),path=roundedPath(route.points,1);
  assert.ok(path.points.slice(1).every((p,i)=>segmentWalkable(path.points[i],p)),target);
 }
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes('<group position={[M.x,0,M.z]} rotation={[0,M.yaw,0]}>')&&scene.includes('<spotLight position={[2.4,3.85,9.9]} target={key}'),'live statue placed in the niche with its own key light');
});
test('Legs through the doorway cross both thresholds well inside the opening (no grazing the jamb)',()=>{
 assert.equal(segmentWalkable([-4.5,1.7,5.06],[2.3,1.6,11.1]),false,'hall corner → statue diagonal grazed the jamb (16/11)');
 assert.equal(segmentWalkable([0,1.7,6.5],[0,1.7,9.1]),true,'straight through the middle is fine');
});
