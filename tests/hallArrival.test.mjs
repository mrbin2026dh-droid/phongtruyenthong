import test from 'node:test';
import assert from 'node:assert/strict';
import {ARRIVAL_START,arrivalRoute} from '../src/scene/hallArrival.mjs';
import {layoutHall,isWalkable} from '../src/scene/hallLayout.mjs';
import {roundedPath,samplePath} from '../src/scene/hallMotion.mjs';
test('Arrival passes through the open central doorway and reaches the indoor entrance without benches',()=>{
 const destination=layoutHall([]).stops[0],route=arrivalRoute(destination),path=roundedPath(route.points,1);
 assert.ok(ARRIVAL_START[2]>8);assert.ok(path.total>2.5&&path.total<3.6);
 for(let d=0;d<path.total;d+=.05){const p=samplePath(path,d);assert.equal(p[1],1.7);assert.ok(isWalkable(p),'arrival walk stays on the foyer floor');}
 assert.ok(isWalkable([0,1.7,4.0]),'16/11: hall centre is clear (statue moved to the foyer niche)');assert.ok(isWalkable([-1.65,1.7,4.8]));assert.ok(isWalkable([1.65,1.7,4.8]));
 assert.ok(samplePath(path,path.total).every((v,i)=>Math.abs(v-destination.eye[i])<1e-9));
 const first=route.points[0];first[0]=99;assert.equal(ARRIVAL_START[0],2.3,'route copies the start point');
});
