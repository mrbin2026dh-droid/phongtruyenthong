import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {migratePeople} from '../src/data/catalog.mjs';import {hallPreview} from '../src/scene/hallPreview.mjs';import {layoutHall} from '../src/scene/hallLayout.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
test('Bản thử đủ127ảnh: 1HT, 2PHT, 112GV, 12NV; không sửa96hồ sơ gốc và không tạo ID trùng',()=>{
 const people=migratePeople(seed),raw=JSON.stringify(people),preview=hallPreview(people);
 assert.equal(preview.people.length,127);assert.equal(preview.added.length,31);assert.equal(new Set(preview.people.map(p=>p.id)).size,127);assert.equal(JSON.stringify(people),raw);
 const l=layoutHall(preview.people);assert.equal(l.slots.length,127);assert.equal(l.warnings.length,0);
 assert.deepEqual(l.zones.map(z=>z.people.length),[1,2,112,12]);
 assert.equal(new Set(l.slots.filter(s=>s.group==='principal').map(s=>s.y)).size,1);
 assert.ok(preview.added.every(p=>p.displaySlot));
 assert.equal(hallPreview(people,false).people.length,96);
});
test('Mỗi mảng tường một nhãn GV, nhân viên trên tường liền và cửa không có ảnh',()=>{
 const l=layoutHall(hallPreview(migratePeople(seed)).people);assert.ok(l.stops.length>l.signs.length);
 for(const side of ['left','right']){
  assert.equal(l.signs.filter(s=>s.id==='teacher-'+side).length,1);
 }
 assert.ok(l.slots.filter(s=>s.group==='staff').every(s=>s.wall==='right'));
 const staff=l.signs.find(s=>s.id==='staff-sign');assert.equal(staff.x,11.79);assert.ok(Math.abs(staff.z)>2);
 for(const s of l.slots.filter(s=>s.wall==='front'))assert.ok(Math.abs(s.x)-.345>=3.3);
 for(const s of l.slots.filter(s=>s.group!=='principal'&&s.group!=='deputy'))assert.ok(s.y>=1.42&&s.y+s.height/2<=3.1);
 assert.equal(l.signs.some(s=>/·\s*\d/.test(s.text)),false);
 for(const s of l.signs){assert.ok(s.width>0);assert.ok(Number.isFinite(s.yaw+s.x+s.y+s.z));}
});
