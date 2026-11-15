import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlan,findPath,segmentWalkable,isWalkable} from '../src/scene/tourPlan.mjs';
import {floorGuideCandidates} from '../src/scene/floorGuides.mjs';
test('Khách ở sảnh có điểm sàn phía trước, ngoài bục, đi tới được',()=>{
 const plan=createPlan(9),eye=plan.nodes.lobby.eye,forward=[2,0,-10];
 const stops=floorGuideCandidates(plan,eye,forward,[]);
 assert.ok(stops.length>0);assert.ok(stops.some(n=>n.id==='lobby-left'));
 for(const stop of stops){
  assert.ok(isWalkable(stop.eye,9));
  const path=findPath(plan,'lobby',stop.id);
  for(let i=1;i<path.length;i++)assert.ok(segmentWalkable(path[i-1].eye,path[i].eye,9));
 }
});
test('Dấu sàn chỉ lấy điểm gần phía trước, không đưa vào phòng chưa tải',()=>{
 const plan=createPlan(20),eye=[0,1.7,18],forward=[0,0,1],stops=floorGuideCandidates(plan,eye,forward,[]);
 assert.ok(stops.length<=4);
 for(const stop of stops){
  const d=Math.hypot(stop.eye[0]-eye[0],stop.eye[2]-eye[2]);assert.ok(d>=1.3&&d<=13);
  assert.ok((stop.eye[2]-eye[2])/d>.15);
  if(stop.id.startsWith('room-'))assert.ok(stop.id.endsWith('-branch'));
 }
});
test('Các điểm dẫn trong phòng đã tải không quá gần nhau và không trùng vị trí đứng',()=>{
 const plan=createPlan(9),eye=plan.nodes['room-0'].eye,stops=floorGuideCandidates(plan,eye,[-1,0,0],[0]);
 assert.ok(stops.length>0);
 for(let i=0;i<stops.length;i++)for(let j=i+1;j<stops.length;j++)assert.ok(Math.hypot(stops[i].eye[0]-stops[j].eye[0],stops[i].eye[2]-stops[j].eye[2])>2.2);
});
