import test from 'node:test';
import assert from 'node:assert/strict';
import {MONUMENT,isWalkable,layoutHall,createHallPlan,segmentWalkable} from '../src/scene/hallLayout.mjs';
import {routeFromPosition,roundedPath} from '../src/scene/hallMotion.mjs';
test('Entry turn has clear space before the relocated monument and all routes still avoid it',()=>{
 assert.ok(8-(MONUMENT.z+.67)>3);
 assert.equal(isWalkable([0,1.7,MONUMENT.z]),false);
 assert.ok(segmentWalkable([0,1.7,6.5],[2.8,1.7,6.5]));
 const layout=layoutHall([]),plan=createHallPlan(layout.stops);
 for(const target of ['memory-0','staff-0','principal-0','gate']){
  const route=routeFromPosition(plan,[0,1.7,6.5],target),path=roundedPath(route.points,1);
  assert.ok(path.points.slice(1).every((p,i)=>segmentWalkable(path.points[i],p)));
 }
});
