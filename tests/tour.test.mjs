import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlan,findPath,segmentWalkable,isWalkable,roomPlacement,localToWorld,worldToLocal} from '../src/scene/tourPlan.mjs';
test('1–8 phòng có tọa độ khác nhau, nối được từ sảnh và không xuyên vật cản',()=>{
 for(let count=1;count<=8;count++){
  const p=createPlan(count);assert.equal(new Set(Array.from({length:count},(_,i)=>{const r=roomPlacement(i);return [r.x,r.z].join();})).size,count);
  for(let i=0;i<count;i++)for(const end of ['room-'+i,'room-'+i+'-left','room-'+i+'-right']){
   const route=findPath(p,'lobby',end);assert.ok(route.length>2);
   for(let j=1;j<route.length;j++)assert.ok(segmentWalkable(route[j-1].eye,route[j].eye,count),end);
  }
 }
});
test('đi liên phòng và quay về sảnh dùng cửa + hành lang, không chỉ đổi dữ liệu',()=>{
 const p=createPlan(8);
 for(let i=0;i<7;i++){
  const path=findPath(p,'room-'+i,'room-'+(i+1));assert.ok(path.some(n=>n.id.startsWith('hall-')));assert.ok(path.filter(n=>n.id.endsWith('-door')).length>=2);
  for(let j=1;j<path.length;j++)assert.ok(segmentWalkable(path[j-1].eye,path[j].eye,8));
 }
 assert.equal(findPath(p,'room-7','lobby').at(-1).id,'lobby');
});
test('mặt sàn, tường và nội thất có biên an toàn; tọa độ local/world bảo toàn',()=>{
 assert.equal(isWalkable([0,1.7,2.8],8),false);assert.equal(isWalkable([9,1.7,0],8),false);assert.equal(isWalkable([0,.1,0],8),false);
 assert.equal(segmentWalkable([0,1.7,5],[0,1.7,0],8),false);
 for(let i=0;i<8;i++){const local=[-2,1.7,1.3],world=localToWorld(i,local);const round=worldToLocal(i,world);round.forEach((n,k)=>assert.ok(Math.abs(n-local[k])<1e-8));assert.ok(isWalkable(world,8));}
 assert.throws(()=>findPath(createPlan(2),'lobby','room-7'),/Unknown/);
});

