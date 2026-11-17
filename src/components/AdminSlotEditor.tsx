import {Suspense,lazy,useEffect,useMemo,useState} from 'react';
import Dialog from './Dialog';
import {catalog,portraitPath,type Person} from '../data/repository';
import {STATUSES,DuplicatePersonError} from '../data/catalog.mjs';
import {slotDefaults,storedRatio} from '../data/photoRef.mjs';
import {preparePortraitBlob} from '../data/portraitFile';
import {savePhoto,deletePhoto,isPhotoRef} from '../data/photoStore';

// 15/11: photo tool (thay áo) — admin computer only, loaded on demand.
const PortraitStyler=lazy(()=>import('./PortraitStyler'));

const ZONE_NAME:Record<string,string>={principal:'Hiệu trưởng',deputy:'Phó Hiệu trưởng',teacher:'Giáo viên',staff:'Nhân viên'};
const year=()=>new Date().getFullYear();

/** On-wall editor: replace photo / edit info of the person in a slot, add a new person to an empty slot,
 * or remove them from the wall. Photos go to IndexedDB, info to the catalog (same data as list/profile). */
/** 17/11 (người dùng): danh sách tổ và chức danh của trường để chọn nhanh. */
const DEPTS=['Ngữ Văn','Sử-Địa','Tiếng Anh','Văn Thể Mỹ','Toán-Tin','KHTN','Văn Phòng'];
const ROLES=['Giáo viên','Nhân viên','Tổ trưởng','Tổ phó'];
/** The list plus the person's current value when it is not in the list (never lose existing data). */
const withCurrent=(list:string[],v:string)=>list.includes(v)?list:[v,...list];

export default function AdminSlotEditor({slot,person,onClose,onSaved,onMove}:{slot:{slotId:string;group:string};person?:Person;onClose:()=>void;onSaved:(msg:string)=>void;onMove?:()=>void}){
 const defaults=slotDefaults(slot.group)!;
 const single=person?person.workHistory.length===1:true;
 const [name,setName]=useState(person?.name||''),[role,setRole]=useState(person?.role||defaults.role),[dept,setDept]=useState(person?.dept||'');
 const [start,setStart]=useState(String(person?person.workHistory[0].startYear:year())),[birth,setBirth]=useState(person?.birthYear?String(person.birthYear):'');
 const [status,setStatus]=useState(person?.status||'Đang công tác'),[description,setDescription]=useState(person?.description||'');
 const [file,setFile]=useState<{blob:Blob;url:string;width:number;height:number;small:boolean}|null>(null),[removePhoto,setRemovePhoto]=useState(false);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[dup,setDup]=useState<string>(''),[confirmRemove,setConfirmRemove]=useState(false);
 useEffect(()=>()=>{if(file)URL.revokeObjectURL(file.url);},[file]);
 const [styling,setStyling]=useState<{blob:Blob;width:number;height:number}|null>(null);
 const preview=useMemo(()=>file?file.url:removePhoto||!person?'':portraitPath(person),[file,removePhoto,person]);

 async function pick(f?:File){
  setError('');if(!f)return;
  try{const r=await preparePortraitBlob(f);setFile(old=>{if(old)URL.revokeObjectURL(old.url);return {...r,url:URL.createObjectURL(r.blob)};});setRemovePhoto(false);}
  catch(err){setError(err instanceof Error?err.message:'Không đọc được ảnh.');}
 }

 async function openStyler(){
  setError('');
  try{
   if(file){setStyling({blob:file.blob,width:file.width,height:file.height});return;}
   const blob=await (await fetch(preview)).blob();setStyling({blob,width:0,height:0});
  }catch{setError('Không mở được ảnh để chuẩn hóa.');}
 }

 async function save(allowSameName=false){
  setError('');setDup('');
  if(!name.trim()){setError('Cần nhập họ và tên.');return;}
  if(!dept.trim()){setError('Cần nhập tổ / bộ phận.');return;}
  const startYear=Number(start),birthYear=birth.trim()===''?null:Number(birth);
  if(single&&(!Number.isInteger(startYear)||startYear<1950||startYear>year())){setError('Năm bắt đầu công tác không hợp lệ.');return;}
  setBusy(true);let newRef='';
  try{
   if(file)newRef=await savePhoto(file.blob);
   const oldRef=person?.image||'';
   const image=newRef||(removePhoto?'':oldRef);
   const photoRatio=file?storedRatio(file.width,file.height):(person?.photoRatio||3/4);
   const history=person?(single?[{...person.workHistory[0],startYear,role:defaults.roleLocked?defaults.role:role.trim(),endYear:status==='Đang công tác'?null:person.workHistory[0].endYear??year()}]:person.workHistory)
    :[{id:crypto.randomUUID(),startYear,endYear:status==='Đang công tác'?null:year(),role:defaults.roleLocked?defaults.role:role.trim()}];
   const saved=catalog.savePerson({name:name.trim(),role:defaults.roleLocked?defaults.role:role.trim(),dept:dept.trim(),group:defaults.roleLocked?defaults.group:(role==='Nhân viên'||dept==='Văn Phòng'?'staff':'teacher'),status,birthYear,description,image,photoRatio,workHistory:history,displaySlot:slot.slotId},{id:person?.id||'',allowSameName});
   if(oldRef&&oldRef!==image&&isPhotoRef(oldRef))void deletePhoto(oldRef);
   onSaved((person?'Đã cập nhật ':'Đã thêm ')+saved.name+' ('+saved.id+')'+(saved.displaySlot===slot.slotId?'':' — lưu ý: chưa đặt được vào ô này, kiểm tra chức danh.'));
  }catch(err){
   if(newRef)void deletePhoto(newRef);
   if(err instanceof DuplicatePersonError){setDup('Đã có người cùng họ tên: '+(err as any).candidates.map((c:Person)=>c.id+' · '+c.name).join(', ')+'. Nếu là người khác, bấm “Vẫn lưu”.');}
   else setError(err instanceof Error?err.message:'Không lưu được.');
  }finally{setBusy(false);}
 }

 async function remove(){
  if(!person)return;setBusy(true);setError('');
  try{catalog.removePerson(person.id);if(isPhotoRef(person.image))void deletePhoto(person.image);onSaved('Đã gỡ '+person.name+' ('+person.id+') khỏi tường; ô ảnh nay trống.');}
  catch(err){setError(err instanceof Error?err.message:'Không gỡ được.');}finally{setBusy(false);}
 }

 return <Dialog title={(person?'Sửa ảnh và thông tin':'Thêm người vào ô trống')+' · '+ZONE_NAME[slot.group]} onClose={onClose}>
  <form className="admin-slot" onSubmit={e=>{e.preventDefault();void save();}}>
   <div className="admin-slot-photo">
    <div className="admin-slot-frame">{preview?<img src={preview} alt="Ảnh chân dung sẽ hiển thị trên tường"/>:<span>Chưa có ảnh</span>}</div>
    <label className="button">Chọn ảnh từ máy<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{void pick(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
    {preview&&<button type="button" onClick={()=>void openStyler()}>Chuẩn hóa trang phục…</button>}
    {(file||(!removePhoto&&person?.image))&&<button type="button" onClick={()=>{if(file){URL.revokeObjectURL(file.url);setFile(null);}else setRemovePhoto(true);}}>{file?'Bỏ ảnh vừa chọn':'Xóa ảnh (để trống khung)'}</button>}
    {file?.small&&<p className="fine">Ảnh khá nhỏ ({file.width}×{file.height} px); nên dùng ảnh từ 600×900 px để sắc nét.</p>}
    <p className="fine">Ảnh 4×6 vừa khít khung; ảnh 3×4 sẽ được cắt bớt hai bên vai. Vị trí: {slot.slotId}</p>
   </div>
   <div className="admin-slot-fields">
    <label>Họ và tên<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} required autoFocus/></label>
    {/* 17/11 (người dùng): chọn nhanh chức danh và tổ; giá trị cũ không có trong danh sách vẫn được giữ làm một lựa chọn */}
    <label>Chức danh{defaults.roleLocked?<input value={defaults.role} disabled/>:<select value={role} onChange={e=>setRole(e.target.value)}>{withCurrent(ROLES,role).map(r=><option key={r} value={r}>{r||'— Chọn —'}</option>)}</select>}</label>
    <label>Tổ / bộ phận<select value={dept} onChange={e=>setDept(e.target.value)} required>{withCurrent(DEPTS,dept).map(d=><option key={d} value={d}>{d||'— Chọn tổ —'}</option>)}</select></label>
    {single?<label>Năm bắt đầu công tác tại trường<input type="number" inputMode="numeric" min={1950} max={year()} value={start} onChange={e=>setStart(e.target.value)}/></label>
     :<p className="fine">Người này có nhiều đợt công tác; sửa các đợt ở trang Quản trị hồ sơ.</p>}
    <label>Năm sinh (không bắt buộc)<input type="number" inputMode="numeric" min={1900} max={year()} value={birth} onChange={e=>setBirth(e.target.value)}/></label>
    <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Giới thiệu ngắn<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} maxLength={600}/></label>
   </div>
   {error&&<p role="alert" className="form-error">{error}</p>}
   {dup&&<p role="alert" className="form-error">{dup} <button type="button" onClick={()=>void save(true)} disabled={busy}>Vẫn lưu</button></p>}
   <div className="admin-actions">
    <button type="submit" className="gold" disabled={busy}>{busy?'Đang lưu…':'Lưu lên tường'}</button>
    <button type="button" onClick={onClose} disabled={busy}>Hủy</button>
    {person&&onMove&&slot.group!=='principal'&&<button type="button" onClick={onMove} disabled={busy} title="Chọn một ảnh khác cùng khu để đổi chỗ, hoặc một ô trống để chuyển sang">Đổi chỗ…</button>}
    {person&&!confirmRemove&&<button type="button" className="danger" onClick={()=>setConfirmRemove(true)} disabled={busy}>Gỡ khỏi tường…</button>}
    {person&&confirmRemove&&<span className="admin-confirm">Gỡ {person.name} và xóa hồ sơ này? <button type="button" className="danger" onClick={()=>void remove()} disabled={busy}>Gỡ hẳn</button><button type="button" onClick={()=>setConfirmRemove(false)}>Không</button></span>}
   </div>
  </form>
  {styling&&<Suspense fallback={null}><PortraitStyler source={styling} onClose={()=>setStyling(null)} onUse={p=>{setFile(old=>{if(old)URL.revokeObjectURL(old.url);return p;});setRemovePhoto(false);setStyling(null);}}/></Suspense>}
 </Dialog>;
}
