import {useState,useSyncExternalStore} from 'react';
import Dialog from './Dialog';
import {gallery,galleryURL,type GalleryItem} from '../data/repository';
import {GALLERY_CATS,MAX_PER_CAT} from '../data/gallery.mjs';
import {savePhoto,deletePhoto,isPhotoRef} from '../data/photoStore';

/** Resize a picture for the display (long side ≤ 1920 px = the screen's 1920×1080, JPEG) — offline, on this computer only. */
async function prepare(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(file.name+': chọn ảnh JPEG, PNG hoặc WebP.');
 if(file.size>20*1024*1024)throw new Error(file.name+': ảnh vượt 20 MB.');
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();
  const s=Math.min(1,1920/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);
  const g=c.getContext('2d')!;g.imageSmoothingQuality='high';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
  return await new Promise<Blob>((ok,bad)=>c.toBlob(b=>b?ok(b):bad(new Error('Không nén được ảnh.')),'image/jpeg',.86));
 }finally{URL.revokeObjectURL(url);}
}

/** 17/11 (Phương án B): quản trị ảnh trình diễn ở 3 hốc tủ (chỉ máy quản trị). Lưu bản làm việc; lên website khi “Xuất bản”. */
export default function AdminGallery({onClose,onDone}:{onClose:()=>void;onDone:(msg:string)=>void}){
 const snap=useSyncExternalStore(gallery.subscribe,gallery.getSnapshot);
 const [cat,setCat]=useState<GalleryItem['cat']>('activity'),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const list=snap.items.filter(i=>i.cat===cat),info=GALLERY_CATS.find((c:any)=>c.id===cat)!;
 const run=(fn:()=>void)=>{setError('');try{fn();}catch(e){setError(e instanceof Error?e.message:'Không lưu được.');}};
 async function add(files:FileList|null){
  if(!files?.length)return;setError('');
  const room=MAX_PER_CAT-list.length;const pick=[...files].slice(0,room);
  if(files.length>room)setError('Mỗi khu tối đa '+MAX_PER_CAT+' ảnh; đã bỏ bớt '+(files.length-room)+' ảnh.');
  let n=0;
  for(const f of pick){setBusy('Đang thêm ảnh '+(n+1)+'/'+pick.length+'…');
   try{const ref=await savePhoto(await prepare(f));gallery.add({cat,image:ref,caption:''});n++;}
   catch(e){setError(e instanceof Error?e.message:'Không thêm được '+f.name);}}
  setBusy('');if(n)onDone('Đã thêm '+n+' ảnh vào “'+info.title+'” · chưa xuất bản');
 }
 return <Dialog title="Ảnh trình diễn khu tủ kỷ vật" onClose={onClose}>
  <div className="admin-gallery">
   <div className="admin-gallery-tabs" role="tablist">{GALLERY_CATS.map((c:any)=><button key={c.id} role="tab" aria-selected={cat===c.id} className={cat===c.id?'active':''} onClick={()=>setCat(c.id)}>{c.title} <span>{snap.items.filter(i=>i.cat===c.id).length}</span></button>)}</div>
   <p className="fine">{cat==='activity'?'Màn trình chiếu tường lối vào: ảnh cắt vừa khung 16:9.':'Màn trình chiếu tường lối vào: hiện trọn ảnh (không cắt), sau các ảnh hoạt động.'}</p>
   <label className="gold admin-gallery-add">{busy||'+ Thêm ảnh từ máy'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={Boolean(busy)} onChange={e=>{void add(e.target.files);e.target.value='';}}/></label>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <ol className="admin-gallery-list">{list.map((it,k)=><li key={it.id}>
    <img src={galleryURL(it)} alt=""/>
    <div><input aria-label="Chú thích" placeholder="Chú thích (không bắt buộc)" defaultValue={it.caption} maxLength={140} onBlur={e=>{if(e.target.value.trim()!==it.caption)run(()=>gallery.update(it.id,{caption:e.target.value}));}}/>
     <input aria-label="Năm" placeholder="Năm" inputMode="numeric" defaultValue={it.year??''} maxLength={4} onBlur={e=>{const v=e.target.value.trim();if(v!==String(it.year??''))run(()=>gallery.update(it.id,{year:v?Number(v):null}));}}/></div>
    <div className="admin-gallery-tools"><button aria-label="Lên" disabled={k===0} onClick={()=>run(()=>gallery.move(it.id,-1))}>↑</button><button aria-label="Xuống" disabled={k===list.length-1} onClick={()=>run(()=>gallery.move(it.id,1))}>↓</button>
     <button className="danger" onClick={()=>run(()=>{const old=gallery.remove(it.id);if(old&&isPhotoRef(old.image))void deletePhoto(old.image);})}>Xóa</button></div>
   </li>)}</ol>
   {!list.length&&<p className="fine">Chưa có ảnh trong mục này.</p>}
   <div className="admin-actions"><button className="gold" onClick={onClose}>Xong</button></div>
  </div>
 </Dialog>;
}
