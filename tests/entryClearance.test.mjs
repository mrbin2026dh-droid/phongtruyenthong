import test from 'node:test';
import assert from 'node:assert/strict';
import {MONUMENT,STATUE_ROOM,STATUE_STOP,isWalkable,layoutHall,createHallPlan,findPath,segmentWalkable} from '../src/scene/hallLayout.mjs';
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
test('Statue room (16/11): reached through the portal, visitors kept off the pedestal, statue fills the view',()=>{
 const l=layoutHall([]),plan=createHallPlan(l.stops),R=STATUE_ROOM,M=MONUMENT;
 assert.ok(M.x-M.depth/2>R.x0+1&&M.x+M.depth/2<R.x1-.25&&Math.abs(M.z-(R.z0+R.z1)/2)<1e-9,'pedestal stands inside the room, centred on its axis');
 assert.ok(isWalkable(STATUE_STOP.eye)&&isWalkable([4.6,1.7,M.z]),'walk in through the portal');
 assert.ok(!isWalkable([4.6,1.7,M.z-R.opening.width/2+.2])&&!isWalkable([4.6,1.7,9.6]),'jambs and the wall beside the portal stay solid');
 assert.ok(!isWalkable([M.x-M.depth/2-.2,1.7,M.z])&&!isWalkable([7.9,1.7,11.1])&&!isWalkable([6,1.7,12.6]),'off the pedestal and the room walls');
 const d=Math.hypot(STATUE_STOP.eye[0]-M.x,STATUE_STOP.eye[2]-M.z);assert.ok(d>=1.5&&d<=2,'viewed from 1.5–2 m: the statue fills the frame (user: “quá mờ”)');
 for(const from of ['entrance','principal-0','gate'])assert.doesNotThrow(()=>findPath(plan,from,'statue'));
 assert.ok(Math.abs(M.yaw+Math.PI/2)<1e-9,'faces −x, towards the portal');
 const o=R.opening;assert.ok(o.width>=2&&o.height>=2.6&&o.height<R.height,'portal wide and tall, under the room ceiling');
 for(const target of ['memory-1','teacher-0','principal-0','statue','gate']){
  const route=routeFromPosition(plan,[0,1.7,6.5],target),path=roundedPath(route.points,1);
  assert.ok(path.points.slice(1).every((p,i)=>segmentWalkable(path.points[i],p)),target);
 }
 const route=routeFromPosition(plan,STATUE_STOP.eye,'gate'),path=roundedPath(route.points,1);
 assert.ok(path.points.slice(1).every((p,i)=>segmentWalkable(path.points[i],p)),'statue room → gate');
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes('<group position={[M.x,0,M.z]} rotation={[0,M.yaw,0]}>')&&scene.includes('<spotLight position={STATUE_KEY} target={key}'),'live statue in the room with its own key light');
});
test('Legs through the doorway cross both thresholds well inside the opening (no grazing the jamb)',()=>{
 assert.equal(segmentWalkable([-4.5,1.7,5.06],[2.3,1.6,11.1]),false,'hall corner → statue diagonal grazed the jamb (16/11)');
 assert.equal(segmentWalkable([0,1.7,6.5],[0,1.7,9.1]),true,'straight through the middle is fine');
});
