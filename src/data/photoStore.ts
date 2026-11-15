/** Portrait photos in IndexedDB (hundreds of MB available) instead of localStorage (~5 MB).
 * A person's `image` holds a short reference "idb:<key>"; the catalog JSON stays small.
 * Object URLs are cached in memory so the 3D scene and lists can use them synchronously. */
import {isPhotoRef} from './photoRef.mjs';
export {isPhotoRef};

const DB_NAME='museum-photos',STORE='photos';
const urls=new Map<string,string>();
let opening:Promise<IDBDatabase>|null=null;

function db(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Không mở được kho ảnh'));
 });
 return opening;
}
function run<T>(mode:IDBTransactionMode,work:(s:IDBObjectStore)=>IDBRequest<T>|void):Promise<T|undefined>{
 return db().then(d=>new Promise((resolve,reject)=>{
  const t=d.transaction(STORE,mode),s=t.objectStore(STORE);const req=work(s);let value:T|undefined;
  if(req)req.onsuccess=()=>{value=req.result;};
  t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error||new Error('Lỗi kho ảnh'));t.onabort=()=>reject(t.error||new Error('Kho ảnh bị hủy (có thể hết dung lượng)'));
 }));
}

/** Synchronous lookup used by portraitPath(); empty string while unknown. */
export function photoURL(ref:string){return urls.get(ref)||'';}

/** Load every stored photo into object URLs (call once before rendering). */
export async function preloadPhotos(){
 if(typeof indexedDB==='undefined')return;
 const d=await db();
 await new Promise<void>((resolve,reject)=>{
  const t=d.transaction(STORE,'readonly'),req=t.objectStore(STORE).openCursor();
  req.onsuccess=()=>{const c=req.result;if(!c)return;const ref='idb:'+String(c.key);if(!urls.has(ref))urls.set(ref,URL.createObjectURL(c.value as Blob));c.continue();};
  t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);
 });
}

/** Store a prepared JPEG and return its reference. */
export async function savePhoto(blob:Blob){
 const key=crypto.randomUUID().replace(/-/g,'');
 await run('readwrite',s=>s.put(blob,key));
 const ref='idb:'+key;urls.set(ref,URL.createObjectURL(blob));return ref;
}

export async function deletePhoto(ref:string){
 if(!isPhotoRef(ref))return;
 await run('readwrite',s=>s.delete(ref.slice(4)));
 const url=urls.get(ref);if(url)URL.revokeObjectURL(url);urls.delete(ref);
}

/** For JSON backups: inline the photo as a data URL. */
export async function photoDataURL(ref:string){
 const blob=await run<Blob>('readonly',s=>s.get(ref.slice(4)) as IDBRequest<Blob>);
 if(!blob)return '';
 return await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
}

/** For restoring backups: move an inline data URL into the photo store. */
export async function storeDataURL(dataUrl:string){return savePhoto(await (await fetch(dataUrl)).blob());}
