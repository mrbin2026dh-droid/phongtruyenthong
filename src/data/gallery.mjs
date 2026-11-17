// 17/11 (người dùng duyệt Phương án B): ảnh trình diễn ở khu tủ kỷ vật (tường lối vào).
//   Hốc giữa  “Dấu ấn nhà trường”  → màn trình chiếu 16:9 (ảnh hoạt động)
//   Hốc phải  “Thành tích tập thể” → khung trên tự lật bằng khen / giấy khen (cúp 3D giữ nguyên)
//   Hốc trái  “Tư liệu và kỷ vật”  → khung trên tự lật ảnh tư liệu
// Dữ liệu riêng với hồ sơ nhân sự: máy quản trị lưu bản làm việc trong localStorage (ảnh trong IndexedDB),
// “Xuất bản” ghi public/data/gallery.json + public/data/gallery/*.jpg. Thuần — kiểm thử ở tests/gallery.test.mjs.
import {isPhotoRef} from './photoRef.mjs';

export const GALLERY_CATS=[
 {id:'activity',niche:1,title:'Dấu ấn nhà trường'},
 {id:'award',niche:2,title:'Thành tích tập thể'},
 {id:'memento',niche:0,title:'Tư liệu và kỷ vật'}
];
export const GALLERY_PHOTO=/^data\/gallery\/[A-Za-z0-9_-]+\.jpg$/;
export const isGalleryPhoto=v=>typeof v==='string'&&GALLERY_PHOTO.test(v);
const DATA_JPEG=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
export const MAX_PER_CAT=60;

/** One display item. image: “idb:…” (máy quản trị), “data/gallery/…jpg” (đã xuất bản) hoặc data URL JPEG (lúc gửi xuất bản). */
export function validateGalleryItem(it){
 if(!it||typeof it!=='object')throw new Error('Mục ảnh không hợp lệ.');
 if(typeof it.id!=='string'||!/^[A-Za-z0-9_-]{4,40}$/.test(it.id))throw new Error('Mã ảnh không hợp lệ.');
 if(!GALLERY_CATS.some(c=>c.id===it.cat))throw new Error('Nhóm ảnh không hợp lệ.');
 const image=String(it.image||'');
 if(!(isPhotoRef(image)||isGalleryPhoto(image)||(DATA_JPEG.test(image)&&image.length<6e6)))throw new Error('Ảnh trình diễn phải là JPEG hợp lệ.');
 const caption=String(it.caption??'').trim().replace(/\s+/g,' ');
 if(caption.length>140)throw new Error('Chú thích tối đa 140 ký tự.');
 const year=it.year===null||it.year===undefined||it.year===''?null:Number(it.year);
 if(year!==null&&(!Number.isInteger(year)||year<1950||year>2100))throw new Error('Năm không hợp lệ.');
 return {id:it.id,cat:it.cat,image,caption,year};
}

export function parseGallery(items){
 if(!Array.isArray(items))throw new Error('Dữ liệu ảnh trình diễn không hợp lệ.');
 const out=items.map(validateGalleryItem);
 if(new Set(out.map(i=>i.id)).size!==out.length)throw new Error('Trùng mã ảnh trình diễn.');
 for(const c of GALLERY_CATS)if(out.filter(i=>i.cat===c.id).length>MAX_PER_CAT)throw new Error('Mỗi khu tối đa '+MAX_PER_CAT+' ảnh.');
 return out;
}

export const itemsOf=(items,cat)=>items.filter(i=>i.cat===cat);
/** Lines shown under a picture: “Chú thích · 2024”. */
export const captionLine=it=>[it.caption,it.year].filter(v=>v!==''&&v!==null&&v!==undefined).join(' · ');
export const newGalleryId=()=>'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/** @param {{storage?:any,published?:any[]|null}} [opts] */
export function createGalleryStore({storage=null,published=null}={}){
 const key='school-museum-gallery-v1',listeners=new Set();
 let snapshot={revision:0,items:[],storageError:''};
 try{snapshot.items=parseGallery(published||[]);}catch{snapshot.items=[];}
 try{const raw=storage?.getItem(key);if(raw){const saved=JSON.parse(raw);snapshot.items=parseGallery(saved.items);}}
 catch{snapshot.storageError='Không đọc được dữ liệu ảnh trình diễn lưu trên máy; đang hiện bản đã xuất bản.';}
 const commit=items=>{
  const valid=parseGallery(items);
  try{storage?.setItem(key,JSON.stringify({schemaVersion:1,items:valid}));}catch{throw new Error('Không lưu được trên trình duyệt (có thể hết dung lượng).');}
  snapshot={...snapshot,items:valid,revision:snapshot.revision+1};listeners.forEach(fn=>fn());
 };
 return {
  getSnapshot:()=>snapshot,
  subscribe:fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
  add:item=>{const it=validateGalleryItem({id:newGalleryId(),caption:'',year:null,...item});commit([...snapshot.items,it]);return it;},
  update:(id,patch)=>{if(!snapshot.items.some(i=>i.id===id))throw new Error('Không tìm thấy ảnh.');commit(snapshot.items.map(i=>i.id===id?{...i,...patch,id}:i));},
  remove:id=>{const old=snapshot.items.find(i=>i.id===id);commit(snapshot.items.filter(i=>i.id!==id));return old;},
  /** Move up (-1) / down (+1) within its own group; other groups keep their order. */
  move:(id,dir)=>{
   const items=[...snapshot.items],i=items.findIndex(v=>v.id===id);if(i<0)return;
   const cat=items[i].cat;let j=i+dir;while(j>=0&&j<items.length&&items[j].cat!==cat)j+=dir;
   if(j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];commit(items);
  },
  replaceAll:items=>commit(items)
 };
}
