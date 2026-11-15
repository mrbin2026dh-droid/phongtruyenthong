import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migratePeople,galleryRooms,createCatalogStore,sortPeople,findPeople,workHistoryText,DuplicatePersonError} from '../src/data/catalog.mjs';
import {createPlan,findPath,segmentWalkable} from '../src/scene/tourPlan.mjs';
import {roundedPath} from '../src/scene/walkMotion.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url),'utf8'));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const input=(overrides={})=>({name:'Người mới giả lập',role:'Giáo viên',dept:'Tổ mẫu',group:'teacher',status:'Đang công tác',birthYear:null,description:'Dữ liệu thử',image:'',photoRatio:.75,workHistory:[{id:'new-spell',startYear:2026,endYear:null,role:'Giáo viên'}],...overrides});
test('Chuyển 96 mã gốc không lặp; 3 CBQL (1 HT + 2 PHT), 84 GV, 9 NV thành 9 phòng',()=>{
 const people=migratePeople(seed),rooms=galleryRooms(people);
 assert.deepEqual(people.map(p=>p.id),seed.people.map(p=>p.id));
 assert.equal(rooms.length,9);assert.deepEqual(rooms.map(r=>r.people.length),[3,12,12,12,12,12,12,12,9]);
 const ids=rooms.flatMap(r=>r.people.map(p=>p.id));assert.equal(ids.length,96);assert.equal(new Set(ids).size,96);
 assert.ok(people.every(p=>!('periods' in p)));
});
test('Hơn 96 hồ sơ tự mở phòng theo nhóm; mỗi người chỉ trưng bày một lần',()=>{
 const store=createCatalogStore(seed,{year:2026});
 for(let n=0;n<25;n++)store.savePerson(input({name:'Người mẫu mới '+n,workHistory:[{id:'new-'+n,startYear:2026,endYear:null,role:'Giáo viên'}]}));
 const people=store.getSnapshot().people,rooms=galleryRooms(people);
 assert.equal(people.length,121);assert.equal(rooms.length,12);
 assert.equal(new Set(rooms.flatMap(r=>r.people.map(p=>p.id))).size,121);
});
test('Quay lại giữ mã và đợt cũ; cập nhật đồng thời kho, danh sách và phòng; reload còn dữ liệu',()=>{
 const storage=memory(),store=createCatalogStore(seed,{storage,year:2026}),old=store.getSnapshot().people.find(p=>p.id==='GV020');
 let notifications=0;store.subscribe(()=>notifications++);
 const ended={...old,status:'Đã chuyển công tác',workHistory:old.workHistory.map(h=>({...h,endYear:2020}))};
 store.savePerson(ended,{id:old.id});
 const returned=store.savePerson({...ended,status:'Đang công tác',workHistory:[...ended.workHistory,{id:'return-2026',startYear:2026,endYear:null,role:old.role}]},{id:old.id});
 assert.equal(returned.id,old.id);assert.equal(store.getSnapshot().people.length,96);assert.equal(notifications,2);
 assert.equal(returned.workHistory[0].endYear,2020);assert.equal(returned.workHistory.length,2);
 assert.match(workHistoryText(returned),/2020; 2026 – nay/);
 assert.equal(galleryRooms(store.getSnapshot().people).flatMap(r=>r.people).filter(p=>p.id===old.id).length,1);
 assert.equal(createCatalogStore(seed,{storage,year:2026}).getSnapshot().people.find(p=>p.id===old.id).workHistory.length,2);
});
test('Trùng tên có dấu/không dấu được nhắc; cùng tên khác người chỉ thêm khi xác nhận',()=>{
 const store=createCatalogStore(seed,{year:2026});
 const a=store.savePerson(input({name:'Nguyễn Văn Bình'}));
 assert.throws(()=>store.savePerson(input({name:'  NGUYEN   VAN BINH '})),DuplicatePersonError);
 assert.equal(store.getSnapshot().people.length,97);
 const b=store.savePerson(input({name:'Nguyễn Văn Bình'}),{allowSameName:true});
 assert.notEqual(a.id,b.id);assert.equal(findPeople(store.getSnapshot().people,'nguyen van binh').length,2);
});
test('Chặn đợt chồng lấn, quay lại khi đợt cũ chưa đóng, năm sai và hồ sơ không tồn tại',()=>{
 const store=createCatalogStore(seed,{year:2026}),before=store.getSnapshot();
 for(const workHistory of [
  [{id:'a',startYear:2010,endYear:null},{id:'b',startYear:2026,endYear:null}],
  [{id:'a',startYear:2010,endYear:2024},{id:'b',startYear:2020,endYear:null}],
  [{id:'a',startYear:2027,endYear:null}],
  [{id:'a',startYear:2026,endYear:2025}],
  [{id:'a',startYear:2020,endYear:2021},{id:'a',startYear:2026,endYear:null}]
 ])assert.throws(()=>store.savePerson(input({workHistory})));
 assert.throws(()=>store.savePerson(input(),{id:'NO_SUCH_ID'}));
 assert.throws(()=>store.savePerson(input({birthYear:2030})));
 assert.equal(store.getSnapshot(),before);
});
test('Sắp năm sinh đúng và ổn định, không nhầm năm vào trường; năm sinh thiếu ở cuối',()=>{
 const people=[input({id:'A',name:'A',birthYear:1970,workHistory:[{id:'a',startYear:1990,endYear:null}]}),input({id:'B',name:'B',birthYear:1960,workHistory:[{id:'b',startYear:2000,endYear:null}]}),input({id:'C',name:'C',birthYear:null,workHistory:[{id:'c',startYear:1980,endYear:null}]})];
 assert.deepEqual(sortPeople(people,'birth').map(p=>p.id),['B','A','C']);
 assert.deepEqual(sortPeople(people,'service').map(p=>p.id),['C','A','B']);
 assert.deepEqual(people.map(p=>p.id),['A','B','C']);
});
test('Người từng là CBQL giữ khu chính khi đổi chức danh, không tạo mã mới',()=>{
 const store=createCatalogStore(seed,{year:2026}),p=store.getSnapshot().people.find(p=>p.group==='management');
 const updated=store.savePerson({...p,role:'Cố vấn'},{id:p.id});
 assert.equal(updated.group,'management');assert.equal(galleryRooms(store.getSnapshot().people).filter(r=>r.groupId==='management').flatMap(r=>r.people).length,3);
});
test('Lỗi storage không báo lưu thành công, dữ liệu hỏng không bị ghi đè',()=>{
 const store=createCatalogStore(seed,{storage:{getItem:()=>null,setItem:()=>{throw new Error('quota');}},year:2026}),before=store.getSnapshot();
 assert.throws(()=>store.savePerson(input()),/Không lưu được/);assert.equal(store.getSnapshot(),before);
 let writes=0;const bad=createCatalogStore(seed,{storage:{getItem:()=>'{bad',setItem:()=>writes++},year:2026});
 assert.match(bad.getSnapshot().storageError,/tạm khóa ghi/);assert.throws(()=>bad.savePerson(input()));assert.equal(writes,0);
});
test('Danh mục rỗng không tạo phòng trống; khoảng kết thúc chưa rõ không hiện nay',()=>{
 assert.deepEqual(galleryRooms([]),[]);
 assert.equal(workHistoryText(input({status:'Đã nghỉ hưu',workHistory:[{id:'x',startYear:1990,endYear:null}]})),'1990 – chưa xác định');
});
test('Tab cũ không ghi đè dữ liệu vừa cập nhật từ tab khác',()=>{
 const storage=memory(),a=createCatalogStore(seed,{storage,year:2026}),b=createCatalogStore(seed,{storage,year:2026});
 a.savePerson(input({name:'Thêm từ tab A'}));
 assert.throws(()=>b.savePerson(input({name:'Thêm từ tab B'})),/tab khác/);
 assert.equal(createCatalogStore(seed,{storage,year:2026}).getSnapshot().people.length,97);
});
test('Đồ thị 9, 12, 20 phòng: đến cuối và quay lại không bị chặn ở phòng 8',()=>{
 for(const n of [9,12,20]){
  const plan=createPlan(n);assert.equal(plan.count,n);
  for(const [from,to] of [['lobby','room-'+(n-1)],['room-'+(n-1),'lobby']]){
   const route=findPath(plan,from,to),path=roundedPath(route.map(p=>p.eye),n);
   for(let i=1;i<path.points.length;i++)assert.ok(segmentWalkable(path.points[i-1],path.points[i],n));
  }
 }
});
