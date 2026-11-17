import test from 'node:test';
import assert from 'node:assert/strict';
import {assignExhibitSlots,attachExhibitSlots,exhibitZone,exhibitSlots} from '../src/data/exhibitSlots.mjs';
import {createCatalogStore} from '../src/data/catalog.mjs';
import {readFileSync} from 'node:fs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
const newTeacher={id:'GV097',name:'Mẫu mới',group:'teacher',role:'Giáo viên',dept:'Toán',status:'Đang công tác',birthYear:null,description:'Mẫu',image:'',photoRatio:.75,workHistory:[{id:'a',startYear:2026,endYear:null,role:'Giáo viên'}]};
test('96→97, sửa tên, thay thứ tự danh sách không đổi chỗ của96người cũ',()=>{
 const store=createCatalogStore(seed);const before=store.getSnapshot().people;
 const slots=new Map(before.map(p=>[p.id,p.displaySlot]));
 // 17/11: the teacher zone is exactly full (84/84) — the 97th person is a new staff member (staff 9/12)
 store.savePerson({...newTeacher,group:'staff',role:'Nhân viên',workHistory:[{id:'a',startYear:2026,endYear:null,role:'Nhân viên'}]});
 const after=store.getSnapshot().people;
 assert.ok(after.at(-1).displaySlot);assert.equal(new Set(after.map(p=>p.displaySlot)).size,97);
 after.slice(0,96).forEach(p=>assert.equal(p.displaySlot,slots.get(p.id)));
 const reordered=attachExhibitSlots([...after].reverse());reordered.forEach(p=>assert.equal(p.displaySlot,after.find(v=>v.id===p.id).displaySlot));
});
test('Reload, cập nhật người quay lại và thêm hiệu trưởng không đẩy giáo viên',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 let store=createCatalogStore(seed,{storage});const before=store.getSnapshot().people;
 store.savePerson({...newTeacher,group:'management',role:'Hiệu trưởng',workHistory:[{id:'b',startYear:2026,endYear:null,role:'Hiệu trưởng'}]});
 store=createCatalogStore(seed,{storage});before.forEach(p=>assert.equal(store.getSnapshot().people.find(v=>v.id===p.id).displaySlot,p.displaySlot));
 const p=store.getSnapshot().people.find(v=>v.group==='teacher');const id=p.displaySlot;
 store.savePerson({...p,name:'Tên đã cập nhật'}, {id:p.id});assert.equal(store.getSnapshot().people.find(v=>v.id===p.id).displaySlot,id);
});
test('17/11: 99 vị trí — 1 HT + 2 PHT + 96 GV & NV liền mạch (98 người: 3 CBQL, 90 GV, 5 NV); không đè nhau',()=>{
 const p={...newTeacher,group:'management',role:'Đã nghỉ hưu',workHistory:[{role:'Hiệu trưởng'}]};assert.equal(exhibitZone(p),'principal');
 const definitions=exhibitSlots();assert.equal(definitions.length,99);assert.equal(new Set(definitions.map(s=>s.slotId)).size,99);
 assert.equal(new Set(definitions.map(s=>[s.x,s.y,s.z].join())).size,99);
 assert.equal(definitions.filter(s=>s.group==='principal').length,1);
 assert.equal(definitions.filter(s=>s.group==='deputy').length,2);
 assert.equal(definitions.filter(s=>s.group==='teacher').length,96);
 for(const d of definitions.filter(s=>s.group==='teacher'||s.group==='staff'))assert.ok(d.width===.66&&d.height===.96,'17/11: frames 20 % larger each way');
 for(const d of definitions)assert.ok(Math.abs(d.height/d.width-(d.group==='principal'||d.group==='deputy'?1.5:.96/.66))<1e-9,'4×6 frames');
 assert.equal(definitions.filter(s=>s.group==='staff').length,0);assert.equal(exhibitZone({group:'staff'}),'teacher','staff share the teachers wall');
 const list=Array.from({length:7},(_,i)=>({...p,id:'P'+i}));const result=assignExhibitSlots(list);assert.equal(result.assigned.size,1);assert.equal(result.warnings.length,6);
});
test('HT ở giữa, hai PHT đối xứng cùng hàng; cập nhật ảnh không đổi ID/vị trí khi reload',()=>{
 const board=attachExhibitSlots(['Hiệu trưởng','Phó Hiệu trưởng','Phó Hiệu trưởng'].map((role,i)=>({...newTeacher,id:'P'+i,group:'management',role})));
 const positions=[...assignExhibitSlots(board).assigned.values()];assert.equal(positions.length,3);
 const head=positions.find(s=>s.group==='principal'),deputies=positions.filter(s=>s.group==='deputy');
 assert.equal(head.x,0);assert.equal(deputies.length,2);assert.equal(deputies[0].y,deputies[1].y);
 assert.ok(Math.abs(deputies[0].x+deputies[1].x)<1e-10);
 for(const d of deputies){assert.equal(d.width,head.width);assert.equal(d.height,head.height);assert.equal(d.y,head.y);}
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 let store=createCatalogStore(seed,{storage});const p=store.getSnapshot().people[0];
 const image='data:image/jpeg;base64,local-test-payload';
 store.savePerson({...p,image},{id:p.id});store=createCatalogStore(seed,{storage});
 const saved=store.getSnapshot().people.find(v=>v.id===p.id);
 assert.equal(saved.image,image);assert.equal(saved.displaySlot,p.displaySlot);assert.equal(saved.id,p.id);
});

test('16/11 (user): back-wall teacher bays sit evenly between the Ban Giám hiệu cabinet and the corners',async()=>{
 const {BACK_BAY}=await import('../src/scene/hallLayout.mjs');
 const {exhibitSlots:slots}=await import('../src/data/exhibitSlots.mjs');
 const PIER_CAP=2.81+.21,CORNER=12,inner=BACK_BAY.x-BACK_BAY.width/2,outer=BACK_BAY.x+BACK_BAY.width/2;
 const gapCabinet=inner-PIER_CAP,gapCorner=CORNER-outer;
 assert.ok(Math.abs(gapCabinet-gapCorner)<.06&&gapCabinet>.8,'≈0.9 m on both sides (was 0.48 m vs 1.4 m)');
 const back=slots().filter(s=>s.group==='teacher'&&s.wall==='back');
 for(const s of back)assert.ok(Math.abs(s.x)-s.width/2>inner+.1&&Math.abs(s.x)+s.width/2<outer-.1,'every frame on the oak slats: '+s.slotId);
 const right=back.filter(s=>s.x>0).map(s=>s.x),left=back.filter(s=>s.x<0).map(s=>-s.x);
 assert.ok(Math.abs((Math.min(...right)+Math.max(...right))/2-BACK_BAY.x)<.01&&Math.abs((Math.min(...left)+Math.max(...left))/2-BACK_BAY.x)<.01,'columns centred on their bay, mirror-symmetric');
});
