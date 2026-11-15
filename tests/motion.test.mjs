import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlan,segmentWalkable,localToWorld,isWalkable} from '../src/scene/tourPlan.mjs';
import {roundedPath,routeFromPosition,samplePath,slideStep,dampValue,positionAllowed} from '../src/scene/walkMotion.mjs';
test('đường bo góc từ sảnh tới mọi phòng giữ khoảng hở qua cửa và nội thất',()=>{
 for(let count=1;count<=8;count++){
  const plan=createPlan(count);
  for(let i=0;i<count;i++){
   const route=routeFromPosition(plan,plan.nodes.lobby.eye,'room-'+i),curve=roundedPath(route.points,count);
   assert.ok(curve.total>0);assert.ok(curve.roundedCorners>0);
   for(let j=1;j<curve.points.length;j++)assert.ok(segmentWalkable(curve.points[j-1],curve.points[j],count),'count '+count+' room '+i+' sample '+j);
   assert.deepEqual(samplePath(curve,0),plan.nodes.lobby.eye);
   samplePath(curve,curve.total).forEach((v,k)=>assert.ok(Math.abs(v-plan.nodes['room-'+i].eye[k])<1e-7));
  }
 }
});
test('sau tự bước, dẫn đường khởi hành ở vị trí thật, không kéo giật về điểm cũ',()=>{
 const plan=createPlan(8),position=localToWorld(0,[-1,1.7,-1]);
 const route=routeFromPosition(plan,position,'room-1');assert.deepEqual(route.points[0],position);
 const curve=roundedPath(route.points,8);assert.deepEqual(samplePath(curve,0),position);
 for(let i=1;i<curve.points.length;i++)assert.ok(segmentWalkable(curve.points[i-1],curve.points[i],8));
});
test('bước chân chặn tường, bục sách, phòng chưa tải; delta lớn không xuyên vật cản',()=>{
 assert.equal(positionAllowed(localToWorld(1,[0,1.7,0]),8,[0]),false);
 assert.equal(positionAllowed(localToWorld(0,[0,1.7,0]),8,[0]),true);
 const start=[0,1.7,5.05],next=slideStep(start,[0,0,-10],8,[]);
 assert.ok(next[2]>4.08);assert.ok(isWalkable(next,8));
 const p=slideStep(localToWorld(0,[7.5,1.7,-2]),[0,0,0],8,[0]);assert.ok(isWalkable(p,8));
 const end=slideStep([7.5,1.7,-2],[10,0,0],8,[]);assert.ok(end[0]<7.76);
});
test('giảm chấn giữ tốc độ đáp ứng tương đương tại 30/60/120 FPS',()=>{
 const results=[30,60,120].map(fps=>{let v=0;for(let i=0;i<fps;i++)v=dampValue(v,1.35,7,1/fps);return v;});
 assert.ok(Math.max(...results)-Math.min(...results)<1e-10);
 assert.ok(dampValue(1,0,12,.2)<.1);assert.equal(dampValue(0,1,10,0),0);
});

