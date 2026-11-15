import {useEffect,useState} from 'react';
import Dialog from './Dialog';
import {catalog,type Person} from '../data/repository';
import {summarize} from '../data/publishSummary.mjs';
import {isPhotoRef,photoDataURL,deletePhoto} from '../data/photoStore';

const ids=(list:string[])=>list.length<=8?list.join(', '):list.slice(0,8).join(', ')+' … (+'+(list.length-8)+')';
type Result={written:number;photos:number;removedPhotos:number;git:{state:string;message:string};published:{people:Person[]}};

/** Cách 1: “Xuất bản lên website”. Shows what will change, then the local dev server writes
 * public/data (catalog.json + photos) and commits + pushes only that folder to GitHub. */
export default function AdminPublish({people,onClose,onDone}:{people:Person[];onClose:()=>void;onDone:(msg:string)=>void}){
 const [previous,setPrevious]=useState<Person[]|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 useEffect(()=>{fetch(import.meta.env.BASE_URL+'data/catalog.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():{people:[]}).then(d=>setPrevious(d.people||[])).catch(()=>setPrevious([]));},[]);
 const sum=previous?summarize(previous,people):null;
 const real=people.filter(p=>p.image).length;

 async function publish(){
  setBusy(true);setError('');
  try{
   const payload=await Promise.all(people.map(async p=>isPhotoRef(p.image)?{...p,image:await photoDataURL(p.image)}:p));
   const r=await fetch('/__local-admin/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({people:payload,consent:true})});
   const data=await r.json().catch(()=>({error:'Máy chủ quản trị không trả lời.'}));
   if(!r.ok)throw new Error(data.error||'Không xuất bản được.');
   // Local working copy now points at the published files; free the replaced IndexedDB photos.
   const oldRefs=people.map(p=>p.image).filter(isPhotoRef);
   catalog.restoreBackup(JSON.stringify({schemaVersion:1,people:data.published.people}),{expectedRevision:catalog.getSnapshot().revision});
   oldRefs.forEach(ref=>void deletePhoto(ref));
   setResult(data);onDone('Đã xuất bản '+data.written+' hồ sơ. '+data.git.message);
  }catch(err){setError(err instanceof Error?err.message:'Không xuất bản được.');}
  finally{setBusy(false);}
 }

 return <Dialog title="Xuất bản lên website" onClose={onClose}>
  {!result?<>
   {!sum?<p>Đang so sánh với bản đang có trên website…</p>:<>
    <ul className="publish-summary">
     <li><b>{sum.added.length}</b> người mới{sum.added.length?': '+ids(sum.added):''}</li>
     <li><b>{sum.photo.length}</b> ảnh thay đổi</li>
     <li><b>{sum.info.length}</b> hồ sơ sửa thông tin</li>
     <li><b>{sum.removed.length}</b> người gỡ khỏi tường{sum.removed.length?': '+ids(sum.removed):''}</li>
     <li>Tổng sau khi xuất bản: <b>{sum.total}</b> hồ sơ, <b>{real}</b> có ảnh</li>
    </ul>
    {!sum.changed&&<p className="fine">Không có thay đổi so với website hiện tại.</p>}
    <p className="fine">Website công khai: ai có đường link đều xem được ảnh và thông tin. Ảnh đã đưa lên vẫn còn trong lịch sử GitHub dù sau này gỡ.</p>
    <label className="publish-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Tôi xác nhận các thầy cô, nhân viên có ảnh và thông tin trong bản này đã đồng ý cho công khai.</label>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <div className="admin-actions"><button className="gold" disabled={!consent||busy||!sum.changed} onClick={()=>void publish()}>{busy?'Đang xuất bản…':'Lưu và đưa lên GitHub'}</button><button onClick={onClose} disabled={busy}>Hủy</button></div>
   </>}
  </>:<>
   <p><b>Đã lưu dữ liệu website:</b> {result.written} hồ sơ, {result.photos} ảnh ({result.removedPhotos} ảnh cũ được gỡ).</p>
   <p><b>GitHub:</b> {result.git.message}</p>
   {result.git.state==='pushed'&&<p className="fine">Website công khai sẽ cập nhật sau khoảng 1–2 phút (GitHub tự build).</p>}
   <div className="admin-actions"><button className="gold" onClick={onClose}>Đóng</button></div>
  </>}
 </Dialog>;
}
