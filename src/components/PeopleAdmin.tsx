import {useState} from 'react';
import {catalog,type Person,type PersonInput} from '../data/repository';
import {GROUPS,STATUSES,duplicateCandidates,findPeople,workHistoryText,parseCatalogBackup} from '../data/catalog.mjs';
import Dialog from './Dialog';
import {readPortraitFile} from '../data/portraitFile';
import {isPhotoRef,photoDataURL,storeDataURL} from '../data/photoStore';
import {assignExhibitSlots} from '../data/exhibitSlots.mjs';
type Editor={person?:Person;returning:boolean};
type DraftSpell={id:string;startYear:string;endYear:string;role:string};
const currentYear=()=>new Date().getFullYear();
const spellId=()=>crypto.randomUUID();
export default function PeopleAdmin({people,storageError}:{people:Person[];storageError:string}){
 const [query,setQuery]=useState(''),[editor,setEditor]=useState<Editor|null>(null),[message,setMessage]=useState(''),[page,setPage]=useState(1);
 const [restore,setRestore]=useState<{text:string;people:Person[];revision:number;name:string}|null>(null),[backupSaved,setBackupSaved]=useState(false),[confirmed,setConfirmed]=useState(false);
 const results=findPeople(people,query) as Person[],pages=Math.max(1,Math.ceil(results.length/12));
 const unplaced=assignExhibitSlots(people).warnings;
 function saved(person:Person){setEditor(null);setQuery(person.id);setPage(1);setMessage('Đã lưu '+person.id+' · '+person.name+(person.displaySlot?'. Vị trí: '+person.displaySlot:'. Hồ sơ đã lưu nhưng chưa có vị trí phù hợp; kiểm tra chức danh hoặc sức chứa của khu.'));}
 // Backups carry the photos themselves (photos live in IndexedDB as "idb:" references).
 async function exportData(){const full=await Promise.all(people.map(async p=>isPhotoRef(p.image)?{...p,image:await photoDataURL(p.image).catch(()=>'')}:p));const blob=new Blob([JSON.stringify({schemaVersion:1,people:full},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ho-so-mau-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function inspectBackup(file:File){setMessage('');try{if(file.size>12000000)throw new Error('Chỉ nhận bản sao JSON tối đa 12 MB.');const text=await file.text(),parsed=parseCatalogBackup(text) as Person[];setRestore({text,people:parsed,revision:catalog.getSnapshot().revision,name:file.name});setBackupSaved(false);setConfirmed(false);}catch(err){setMessage(err instanceof Error?err.message:'Không đọc được bản sao.');}}
 async function applyBackup(){if(!restore||!backupSaved||!confirmed)return;try{
  // Move inline photos into IndexedDB first so the catalog stays small enough for localStorage.
  const data=JSON.parse(restore.text.replace(/^\uFEFF/,''));
  for(const person of data.people||[])if(typeof person.image==='string'&&person.image.startsWith('data:image/'))person.image=await storeDataURL(person.image);
  catalog.restoreBackup(JSON.stringify(data),{expectedRevision:restore.revision});setMessage('Đã khôi phục '+restore.people.length+' hồ sơ từ bản sao. Danh sách và phòng 3D dùng cùng dữ liệu.');setRestore(null);setEditor(null);setQuery('');setPage(1);}catch(err){setMessage(err instanceof Error?err.message:'Không khôi phục được dữ liệu.');setRestore(null);}}
 return <section className="people-admin">
  <div className="admin-notice"><b>Quản trị dữ liệu mẫu · Lưu trên trình duyệt này</b><p>Chưa có đăng nhập, Firestore hoặc đồng bộ giữa thiết bị. Chỉ nhập hồ sơ giả lập. Bản HTML cũ được bảo tồn riêng.</p></div>
  {storageError&&<p role="alert" className="form-error">{storageError}</p>}
  {unplaced.length>0&&<p role="alert" className="form-error">{unplaced.length} hồ sơ chưa có vị trí phù hợp: {unplaced.map(v=>v.id).join(', ')}. Kiểm tra chức danh Hiệu trưởng/Phó Hiệu trưởng hoặc điều chỉnh sức chứa. Các hồ sơ vẫn được giữ trong danh sách.</p>}
  {message&&<p role="status" className="save-message">{message}</p>}
  <div className="admin-workflow"><div><p className="eyebrow">1 · TÌM TRƯỚC KHI THÊM</p><h2>Người này đã từng công tác tại trường?</h2><p>Tìm theo họ tên hoặc mã. Nếu đã có, mở hồ sơ để cập nhật hoặc tiếp nhận trở lại; mã hồ sơ được giữ nguyên.</p></div><button onClick={()=>void exportData()}>Xuất bản sao JSON</button></div>
  <details className="backup-tools"><summary>Khôi phục từ bản sao JSON</summary><p>Kiểm tra bản sao trước khi thay danh sách trên trình duyệt này. Tệp chỉ được đọc cục bộ.</p><label>Chọn bản sao JSON<input type="file" accept="application/json,.json" disabled={Boolean(storageError)||Boolean(editor)} onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value='';if(file)void inspectBackup(file);}}/></label>{editor&&<p>Hoàn tất hoặc hủy biểu mẫu trước khi khôi phục.</p>}</details>
  {restore&&<Dialog title="Đối chiếu bản sao trước khi khôi phục" onClose={()=>setRestore(null)}>
   <p>Tệp: {restore.name}</p><p>Hiện có {people.length} hồ sơ → bản sao có {restore.people.length} hồ sơ.</p>
   <ul><li>{restore.people.filter(p=>!people.some(old=>old.id===p.id)).length} mã mới.</li><li>{restore.people.filter(p=>people.some(old=>old.id===p.id)).length} mã đã có, dùng thông tin từ bản sao.</li><li>{people.filter(p=>!restore.people.some(next=>next.id===p.id)).length} mã hiện tại không nằm trong bản sao.</li></ul>
   <p><strong>Thao tác thay toàn bộ danh sách cục bộ, không tự gộp người trùng tên.</strong> Các mã hồ sơ và đợt công tác trong bản sao được giữ nguyên.</p>
   <button onClick={()=>{void exportData().then(()=>setBackupSaved(true));}}>Tải bản sao dữ liệu hiện tại trước</button>
   <label style={{display:'block',margin:'16px 0'}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Tôi đã kiểm tra và muốn thay danh sách bằng bản sao này.</label>
   <button className="gold" disabled={!backupSaved||!confirmed} onClick={()=>void applyBackup()}>Khôi phục danh sách</button> <button onClick={()=>setRestore(null)}>Hủy khôi phục</button>
  </Dialog>}
  <div className="filters"><label>Tra cứu hồ sơ đã có<input aria-label="Tra cứu hồ sơ đã có" value={query} placeholder="Nhập họ tên hoặc mã, ví dụ GV001" onChange={e=>{setQuery(e.target.value);setPage(1);setMessage('');}}/></label><span>{results.length} hồ sơ tìm thấy / {people.length}</span><button className="gold" disabled={query.trim().length<2||Boolean(storageError)} onClick={()=>{setEditor({returning:false});setMessage('');}}>Thêm người chưa có hồ sơ</button></div>
  {query.trim().length<2&&<p className="fine">Nhập ít nhất 2 ký tự để tra cứu trước khi tạo hồ sơ mới.</p>}
  {editor?<PersonEditor key={(editor.person?.id||'new')+(editor.returning?'return':'edit')} editor={editor} initialName={query.startsWith('GV')?'':query} people={people} onSave={saved} onCancel={()=>setEditor(null)}/>:
  <><div className="admin-records">{results.slice((Math.min(page,pages)-1)*12,Math.min(page,pages)*12).map(p=><article key={p.id}><div><span className="eyebrow">{p.id} · {GROUPS.find(g=>g.id===p.group)?.short}</span><h3>{p.name}</h3><p>{p.role} · {p.dept}</p><p>{workHistoryText(p)} · {p.status}</p></div><div><button disabled={Boolean(storageError)} onClick={()=>setEditor({person:p,returning:false})}>Cập nhật hồ sơ {p.id}</button><button disabled={p.status==='Đang công tác'||Boolean(storageError)} onClick={()=>setEditor({person:p,returning:true})}>Tiếp nhận trở lại {p.id}</button></div></article>)}</div>{!results.length&&<p className="empty">Chưa thấy hồ sơ phù hợp. Kiểm tra cách viết tên hoặc mã trước khi thêm.</p>}<div className="pager"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Trang trước</button><span>{Math.min(page,pages)} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Trang sau</button></div></>}
 </section>;
}
function PersonEditor({editor,initialName,people,onSave,onCancel}:{editor:Editor;initialName:string;people:Person[];onSave:(p:Person)=>void;onCancel:()=>void}){
 const original=editor.person;
 const [image,setImage]=useState(original?.image||''),[photoRatio,setPhotoRatio]=useState(original?.photoRatio||3/4),[imageBusy,setImageBusy]=useState(false),[imageNote,setImageNote]=useState('');
 const [name,setName]=useState(original?.name||initialName),[role,setRole]=useState(original?.role||'Giáo viên'),[dept,setDept]=useState(original?.dept||''),[group,setGroup]=useState(original?.group||'teacher'),[status,setStatus]=useState(editor.returning?'Đang công tác':original?.status||'Đang công tác'),[birth,setBirth]=useState(original?.birthYear?.toString()||''),[description,setDescription]=useState(original?.description||''),[sameName,setSameName]=useState(false),[error,setError]=useState('');
 const [history,setHistory]=useState<DraftSpell[]>(()=>{
  const rows=original?.workHistory.map(h=>({...h,startYear:String(h.startYear),endYear:h.endYear===null?'':String(h.endYear)}))||[{id:spellId(),startYear:String(currentYear()),endYear:'',role}];
  return editor.returning?[...rows,{id:spellId(),startYear:String(currentYear()),endYear:'',role}]:rows;
 });
 const similar=duplicateCandidates(people,{name},original?.id||'') as Person[];
 function rowChange(index:number,field:'startYear'|'endYear'|'role',value:string){setHistory(rows=>rows.map((r,i)=>i===index?{...r,[field]:value}:r));}
 function save(e:React.FormEvent){e.preventDefault();setError('');try{
  if(imageBusy)throw new Error('Chờ xử lý ảnh xong trước khi lưu.');
  const input:PersonInput={name,role,dept,group,status,birthYear:birth===''?null:Number(birth),description,image,photoRatio,workHistory:history.map(h=>({...h,startYear:h.startYear.trim()===''?NaN:Number(h.startYear),endYear:h.endYear.trim()===''?null:Number(h.endYear),role:h.role.trim()||role}))};
  onSave(catalog.savePerson(input,{id:original?.id,allowSameName:sameName}));
 }catch(err){setError(err instanceof Error?err.message:'Không lưu được hồ sơ.');}}
 return <form className="person-editor" onSubmit={save}>
  <p className="eyebrow">{original?original.id+' · MÃ HỒ SƠ ĐƯỢC GIỮ NGUYÊN':'2 · TẠO HỒ SƠ GIẢ LẬP MỚI'}</p><h2>{editor.returning?'Tiếp nhận trở lại · '+original?.name:original?'Cập nhật hồ sơ':'Thêm người mới'}</h2>
  {editor.returning&&<p>Giữ các đợt công tác cũ; bổ sung đợt mới ở cuối. Không nối khoảng thời gian đã gián đoạn.</p>}
  <div className="editor-grid"><label>Họ và tên<input aria-label="Họ và tên" required maxLength={120} value={name} onChange={e=>{setName(e.target.value);setSameName(false);}}/></label><label>Nhóm trưng bày chính<select aria-label="Nhóm trưng bày chính" value={group} onChange={e=>setGroup(e.target.value)}>{GROUPS.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label><label>Chức danh hiện tại / gần nhất<input aria-label="Chức danh" required value={role} onChange={e=>setRole(e.target.value)}/></label><label>Tổ / bộ phận<input aria-label="Tổ / bộ phận" required value={dept} onChange={e=>setDept(e.target.value)}/></label><label>Trạng thái công tác<select aria-label="Trạng thái công tác" value={status} onChange={e=>setStatus(e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label><label>Năm sinh · không bắt buộc<input aria-label="Năm sinh" type="number" min="1800" max={currentYear()} value={birth} onChange={e=>setBirth(e.target.value)}/></label></div>
  <p className="fine">Người từng là cán bộ quản lý có thể giữ khu CBQL dù đổi chức danh. Không suy tuổi từ năm về trường.</p>
  <fieldset><legend>Ảnh thẻ và vị trí trưng bày</legend><p className="fine">{original?.displaySlot?'Vị trí hiện tại: '+original.displaySlot:'Hệ thống sẽ đề xuất vị trí còn trống trong khu phù hợp khi lưu.'} Thêm người không dồn lại ảnh cũ. Người từng giữ chức hiệu trưởng được xếp vào khu hiệu trưởng.</p><label>Chọn ảnh trên máy<input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value='';if(!file)return;setImageBusy(true);setError('');try{const result=await readPortraitFile(file);setImage(result.image);setPhotoRatio(result.ratio);setImageNote(`Ảnh nguồn ${result.width} × ${result.height} px. `+(result.width<600?'Nguồn nhỏ; phóng lớn có thể mềm.':'')+' Ảnh chỉ lưu trên trình duyệt này, chưa tải lên mạng.');}catch(err){setError(err instanceof Error?err.message:'Không đọc được ảnh.');}finally{setImageBusy(false);}}}/></label>{image.startsWith('data:image/')&&<img src={image} alt="Xem trước ảnh thẻ chưa lưu" style={{display:'block',width:150,height:200,objectFit:'contain',background:'#e8e1d3',marginTop:12}}/>}<p className="fine">{imageBusy?'Đang xử lý ảnh…':imageNote||'Giữ trọn ảnh, không cắt mặt. Ảnh và hồ sơ lưu cục bộ; xuất JSON để sao lưu. Dung lượng trình duyệt có giới hạn.'}</p></fieldset>
  <fieldset><legend>Các đợt công tác tại trường</legend>{history.map((h,i)=><div className="work-spell" key={h.id}><b>Đợt {i+1}</b><label>Năm bắt đầu<input aria-label={'Năm bắt đầu đợt '+(i+1)} type="number" required min="1800" max={currentYear()} value={h.startYear} onChange={e=>rowChange(i,'startYear',e.target.value)}/></label><label>Năm kết thúc<input aria-label={'Năm kết thúc đợt '+(i+1)} type="number" min="1800" max={currentYear()} placeholder="Đang công tác: để trống" value={h.endYear} onChange={e=>rowChange(i,'endYear',e.target.value)}/></label><label>Chức danh ghi nhận<input aria-label={'Chức danh đợt '+(i+1)} value={h.role} onChange={e=>rowChange(i,'role',e.target.value)}/></label>{!original?.workHistory.some(old=>old.id===h.id)&&history.length>1&&<button type="button" onClick={()=>setHistory(rows=>rows.filter(r=>r.id!==h.id))}>Bỏ đợt chưa lưu</button>}</div>)}<button type="button" onClick={()=>setHistory(rows=>[...rows,{id:spellId(),startYear:String(currentYear()),endYear:'',role}])}>Thêm đợt công tác</button><p className="fine">Đóng đợt cũ trước khi thêm đợt quay lại. Các đợt không được chồng lấn; chưa rõ năm kết thúc sẽ hiển thị “chưa xác định”.</p></fieldset>
  <label>Giới thiệu<textarea aria-label="Giới thiệu" rows={3} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  {similar.length>0&&<div className="duplicate-warning" role="status"><b>Đã có hồ sơ trùng họ tên:</b>{similar.map(p=><p key={p.id}>{p.id} · {p.name} · {p.birthYear||'Chưa có năm sinh'} · {workHistoryText(p)}</p>)}<p>Nếu là cùng người, hủy biểu mẫu và cập nhật mã đã có.</p><label><input type="checkbox" checked={sameName} onChange={e=>setSameName(e.target.checked)}/>Tôi đã kiểm tra: đây là người khác trùng tên, cần hồ sơ riêng.</label></div>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="editor-actions"><button type="submit" className="gold">Lưu hồ sơ mẫu</button><button type="button" onClick={onCancel}>Hủy chỉnh sửa</button></div>
 </form>;
}
