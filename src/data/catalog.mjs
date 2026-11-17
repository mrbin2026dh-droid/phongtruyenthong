import {attachExhibitSlots,exhibitSlots,exhibitZone} from './exhibitSlots.mjs';
import {isPhotoRef,isPublishedPhoto} from './photoRef.mjs';
// One canonical profile per person. Original periods remain archived in legacy-seed.json.
export const GROUPS=[
 {id:'management',name:'Cán bộ quản lý',short:'CBQL',description:'Những người đã và đang đảm nhiệm vai trò quản lý nhà trường'},
 {id:'teacher',name:'Các thế hệ nhà giáo',short:'Giáo viên',description:'Gìn giữ và tiếp nối truyền thống dạy học'},
 {id:'staff',name:'Đội ngũ nhân viên',short:'Nhân viên',description:'Những đóng góp đồng hành cùng nhà trường'}
];
export const STATUSES=['Đang công tác','Đã nghỉ hưu','Đã chuyển công tác','Đã thôi công tác','Đã mất'];
export function nameKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/\s+/g,' ');}
export function migratePeople(seed){
 return seed.people.map(({periods,...p},i)=>({...p,group:/^(Hiệu trưởng|Phó Hiệu trưởng)$/i.test(p.role)?'management':p.role==='Nhân viên'?'staff':'teacher',birthYear:null,photoRatio:i%2?2/3:3/4,workHistory:[{id:p.id+'-work-1',startYear:p.startYear,endYear:p.endYear,role:p.role}]}));
}
export function workHistoryText(p){
 return p.workHistory.map((h,i)=>h.startYear+' – '+(h.endYear??(p.status==='Đang công tác'&&i===p.workHistory.length-1?'nay':'chưa xác định'))).join('; ');
}
export function firstWorkYear(p){return Math.min(...p.workHistory.map(h=>h.startYear));}
export function sortPeople(people,sort='service'){
 return [...people].sort((a,b)=>{
  const av=sort==='birth'?(a.birthYear??Infinity):firstWorkYear(a),bv=sort==='birth'?(b.birthYear??Infinity):firstWorkYear(b);
  return (av===bv?0:av<bv?-1:1)||firstWorkYear(a)-firstWorkYear(b)||a.name.localeCompare(b.name,'vi')||a.id.localeCompare(b.id);
 });
}
export function galleryRooms(people,sort='service'){
 return GROUPS.flatMap(group=>{
  const members=sortPeople(people.filter(p=>p.group===group.id),sort),rooms=[];
  for(let i=0;i<members.length;i+=12)rooms.push({id:group.id+'-'+Math.floor(i/12),groupId:group.id,groupName:group.name,title:group.name+' · '+(Math.floor(i/12)+1),people:members.slice(i,i+12)});
  return rooms;
 });
}
export function findPeople(people,query){const key=nameKey(query);return people.filter(p=>nameKey([p.id,p.name,p.dept,p.role].join(' ')).includes(key));}
export function duplicateCandidates(people,candidate,excludeId=''){return people.filter(p=>p.id!==excludeId&&nameKey(p.name)===nameKey(candidate.name));}
export function validatePerson(p,year=new Date().getFullYear()){
 if(!p.id||!/^[A-Za-z0-9_-]+$/.test(p.id))throw new Error('Mã hồ sơ không hợp lệ.');
 for(const field of ['name','role','dept'])if(typeof p[field]!=='string'||!p[field].trim())throw new Error('Cần nhập họ tên, chức danh và tổ/bộ phận.');
 if(!GROUPS.some(g=>g.id===p.group))throw new Error('Nhóm trưng bày không hợp lệ.');
 if(!STATUSES.includes(p.status))throw new Error('Trạng thái công tác không hợp lệ.');
 if(!Array.isArray(p.workHistory)||!p.workHistory.length)throw new Error('Hồ sơ cần ít nhất một đợt công tác.');
 const history=[...p.workHistory].sort((a,b)=>a.startYear-b.startYear);
 if(new Set(history.map(h=>h.id)).size!==history.length||history.some(h=>!h.id))throw new Error('Mã đợt công tác phải duy nhất.');
 for(let i=0;i<history.length;i++){
  const h=history[i];
  if(!Number.isInteger(h.startYear)||h.startYear<1800||h.startYear>year)throw new Error('Năm bắt đầu công tác không hợp lệ.');
  if(h.endYear!==null&&(!Number.isInteger(h.endYear)||h.endYear<h.startYear||h.endYear>year))throw new Error('Năm kết thúc phải từ năm bắt đầu đến năm hiện tại.');
  if(i>0&&(history[i-1].endYear===null||history[i-1].endYear>h.startYear))throw new Error('Các đợt công tác bị chồng lấn hoặc đợt trước chưa có năm kết thúc.');
 }
 const last=history.at(-1);
 if(p.status==='Đang công tác'&&last.endYear!==null)throw new Error('Đang công tác: để trống năm kết thúc của đợt mới nhất.');
 if(p.birthYear!==null&&(!Number.isInteger(p.birthYear)||p.birthYear<1800||p.birthYear>history[0].startYear))throw new Error('Năm sinh không hợp lệ.');
 return {...p,name:p.name.trim(),role:p.role.trim(),dept:p.dept.trim(),description:String(p.description||''),workHistory:history,startYear:history[0].startYear,endYear:last.endYear};
}
export class DuplicatePersonError extends Error{constructor(candidates){super('Có hồ sơ trùng họ tên. Kiểm tra người từng công tác trước khi thêm mới.');this.candidates=candidates;this.name='DuplicatePersonError';}}
export function parseCatalogBackup(text,year=new Date().getFullYear()){
 if(typeof text!=='string'||text.length>12000000)throw new Error('Bản sao phải là JSON không quá 12 MB.');
 let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('Không đọc được JSON.');}
 if(data?.schemaVersion!==1||!Array.isArray(data.people)||!data.people.length||data.people.length>2000)throw new Error('Bản sao cần schemaVersion 1 và từ 1 đến 2000 hồ sơ.');
 const ids=new Set(),slots=new Set(),knownSlots=new Set(exhibitSlots().map(s=>s.slotId));
 const people=data.people.map(p=>{
  if(!p||typeof p!=='object'||String(p.id).startsWith('DEMO-'))throw new Error('Không nhập hồ sơ DEMO bố cục vào dữ liệu gốc.');
  if(ids.has(p.id))throw new Error('Bản sao bị trùng mã hồ sơ.');ids.add(p.id);
  // 17/11 (99-position layout): a position that no longer exists (old teacher-085…112, staff-…) or is taken twice must
  // never stop the site from loading — the person simply gets a free position again (assignExhibitSlots).
  if(p.displaySlot!==undefined&&p.displaySlot!==''&&typeof p.displaySlot!=='string')throw new Error('Vị trí trưng bày không hợp lệ.');
  const slot=p.displaySlot&&knownSlots.has(p.displaySlot)&&!slots.has(p.displaySlot)?p.displaySlot:'';if(slot)slots.add(slot);
  if(typeof p.image!=='string'||p.image.length>2000000||(p.image&&!isPhotoRef(p.image)&&!isPublishedPhoto(p.image)&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image)))throw new Error('Ảnh trong bản sao phải là JPEG/PNG/WebP cục bộ hợp lệ.');
  if(![2/3,3/4].some(r=>Math.abs(r-p.photoRatio)<.001))throw new Error('Tỷ lệ ảnh phải là 2:3 hoặc 3:4.');
  if(!Array.isArray(p.workHistory)||p.workHistory.some(h=>!h||typeof h.id!=='string'||typeof h.role!=='string'))throw new Error('Đợt công tác không hợp lệ.');
  return validatePerson({id:p.id,name:p.name,role:p.role,dept:p.dept,group:p.group,status:p.status,birthYear:p.birthYear,description:p.description,image:p.image,photoRatio:p.photoRatio,displaySlot:slot,workHistory:p.workHistory.map(h=>({id:h.id,startYear:h.startYear,endYear:h.endYear,role:h.role}))},year);
 });
 return attachExhibitSlots(people);
}
/** 16/11 (user): admin moves a portrait to another position of the same zone. Target taken → the two swap places;
 * target empty → the person simply moves (their old position becomes empty). Nothing else on the wall moves. */
export function moveToSlot(people,id,slotId){
 const person=people.find(p=>p.id===id);if(!person)throw new Error('Không tìm thấy hồ sơ cần đổi chỗ.');
 const target=exhibitSlots().find(s=>s.slotId===slotId);if(!target)throw new Error('Vị trí không hợp lệ.');
 if(target.group!==exhibitZone(person))throw new Error('Chỉ đổi chỗ trong cùng khu (giáo viên với giáo viên, nhân viên với nhân viên).');
 if(person.displaySlot===slotId)return {people,other:null};
 const other=people.find(p=>p.id!==id&&p.displaySlot===slotId)||null;
 const from=person.displaySlot;
 const next=people.map(p=>p.id===id?{...p,displaySlot:slotId}:other&&p.id===other.id?{...p,displaySlot:from}:p);
 return {people:attachExhibitSlots(next),other};
}
/** @param {any} seed @param {{storage?:{getItem:(key:string)=>string|null,setItem:(key:string,value:string)=>void}|null,year?:number,published?:any[]|null}} options
 * published: people from public/data/catalog.json (cách 1). When present they replace the sample seed. */
/** @param {any} seed @param {{storage?:any,year?:number,published?:any[]|null,resetToken?:string}} [opts] */
export function createCatalogStore(seed,{storage=null,year=new Date().getFullYear(),published=null,resetToken=''}={}){
 const key='school-museum-catalog-v1',listeners=new Set();
 const base=published&&published.length?parseCatalogBackup(JSON.stringify({schemaVersion:1,people:published}),year):attachExhibitSlots(migratePeople(seed));
 let snapshot={schemaVersion:1,revision:0,people:base,storageError:''},locked=false,persistedRaw=null;
 try{
  let raw=storage?.getItem(key);
  // 17/11: the published data was rebuilt on purpose (resetLocal token) → this computer's old working copy is set
  // aside once (kept as a backup key) and the admin starts from the new published data.
  if(resetToken&&published&&published.length&&storage&&storage.getItem(key+'-reset')!==resetToken){
   if(raw)storage.setItem(key+'-backup-'+resetToken,raw);
   storage.setItem(key+'-reset',resetToken);
   if(raw){storage.setItem(key,JSON.stringify({schemaVersion:1,people:base}));raw=storage.getItem(key);}
  }
  persistedRaw=raw??null;
  if(raw){
   const saved=JSON.parse(raw);
   if(saved.schemaVersion!==1||!Array.isArray(saved.people))throw new Error('Sai phiên bản dữ liệu');
   const people=attachExhibitSlots(saved.people.map(p=>validatePerson(p,year)));
   if(new Set(people.map(p=>p.id)).size!==people.length)throw new Error('Trùng mã hồ sơ');
   snapshot={schemaVersion:1,revision:0,people,storageError:''};
  }
 }catch{locked=true;snapshot={...snapshot,storageError:'Không đọc được dữ liệu lưu cục bộ. Đang xem mẫu gốc; tạm khóa ghi để bảo toàn dữ liệu đã lưu.'};}
 const publish=people=>{
  if(locked)throw new Error(snapshot.storageError);
  const next={...snapshot,people,revision:snapshot.revision+1};
  let currentRaw;
  try{currentRaw=storage?.getItem(key)??null;}catch{throw new Error('Không đọc được bộ nhớ trình duyệt; chưa thay đổi hồ sơ.');}
  if(currentRaw!==persistedRaw)throw new Error('Dữ liệu đã thay đổi ở tab khác. Hãy tải lại trang trước khi lưu để tránh ghi đè.');
  const serialized=JSON.stringify({schemaVersion:1,people});
  try{storage?.setItem(key,serialized);}catch{throw new Error('Không lưu được trên trình duyệt. Hồ sơ chưa được thay đổi; hãy xuất bản sao và kiểm tra dung lượng lưu trữ.');}
  persistedRaw=storage?serialized:null;
  snapshot=next;listeners.forEach(fn=>fn());
 };
 return {
  getSnapshot:()=>snapshot,
  subscribe:listener=>{listeners.add(listener);return ()=>{listeners.delete(listener);};},
  restoreBackup:(text,{expectedRevision}={})=>{
   if(expectedRevision!==snapshot.revision)throw new Error('Dữ liệu đã đổi sau khi xem trước. Hãy chọn lại bản sao.');
   const people=parseCatalogBackup(text,year);publish(people);return snapshot;
  },
  /** 17/11 “Sắp xếp theo tổ”: every new position and tổ name in ONE save. Returns the previous people (for undo). */
  arrange:(slot,rename)=>{
   const before=snapshot.people;
   const next=before.map(p=>slot.has(p.id)||rename.has(p.id)?validatePerson({...p,displaySlot:slot.get(p.id)??p.displaySlot,dept:rename.get(p.id)??p.dept},year):p);
   const used=next.map(p=>p.displaySlot).filter(Boolean);if(new Set(used).size!==used.length)throw new Error('Hai người trùng một vị trí; chưa thay đổi gì.');
   publish(attachExhibitSlots(next));return before;
  },
  /** 17/11 (người dùng): “Xóa tất cả ảnh” — gỡ ảnh của mọi người trong MỘT lần lưu; tên, chức vụ, tổ, vị trí giữ nguyên.
   * Trả về danh sách trước khi xóa (để Hoàn tác bằng restorePeople). */
  clearPhotos:()=>{
   const before=snapshot.people;
   if(!before.some(p=>p.image))return before;
   publish(before.map(p=>p.image?{...p,image:''}:p));return before;
  },
  /** Undo of arrange(): puts the previous people back as they were. */
  restorePeople:people=>{publish(attachExhibitSlots(people.map(p=>validatePerson(p,year))));},
  moveToSlot:(id,slotId)=>{const r=moveToSlot(snapshot.people,id,slotId);if(r.people!==snapshot.people)publish(r.people);return r.other;},
  /** Remove one person (admin “Gỡ khỏi tường”). Their wall slot becomes free; other slots do not move. */
  removePerson:id=>{
   const old=snapshot.people.find(p=>p.id===id);if(!old)throw new Error('Không tìm thấy hồ sơ cần gỡ.');
   publish(snapshot.people.filter(p=>p.id!==id));return old;
  },
  savePerson:(input,{id='',allowSameName=false}={})=>{
   const old=id?snapshot.people.find(p=>p.id===id):null;
   if(id&&!old)throw new Error('Không tìm thấy hồ sơ cần cập nhật.');
   const max=snapshot.people.reduce((n,p)=>Math.max(n,/^GV\d+$/.test(p.id)?Number(p.id.slice(2)):0),0);
   const person=validatePerson({...old,...input,id:old?.id||'GV'+String(max+1).padStart(3,'0')},year);
   const similar=duplicateCandidates(snapshot.people,person,id);
   if(similar.length&&!allowSameName)throw new DuplicatePersonError(similar);
   const next=attachExhibitSlots(old?snapshot.people.map(p=>p.id===id?person:p):[...snapshot.people,person]);
   publish(next);
   return next.find(p=>p.id===person.id);
  }
 };
}
