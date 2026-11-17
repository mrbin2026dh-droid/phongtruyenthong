// Publishing (cách 1 — static data, 15/11/2026).
// The local admin sends the full catalog (photos inline as data URLs); this turns it into
//   public/data/catalog.json   — read-only data for the public site
//   public/data/photos/<id>-<hash>.jpg — content-addressed photos (unchanged photo ⇒ same file ⇒ no Git churn)
// Pure functions + a small file writer; used by vite.config.js and tests/publish.test.mjs.
import {createHash} from 'node:crypto';
import {mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {parseCatalogBackup} from '../src/data/catalog.mjs';
import {PUBLISHED_PHOTO} from '../src/data/photoRef.mjs';
export {summarize} from '../src/data/publishSummary.mjs';
export {PUBLISHED_PHOTO};
const DATA_URL=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/** @param {any[]} people  @param {Set<string>} existingFiles  @param {number} [year] */
export function buildPublication(people,existingFiles=new Set(),year=new Date().getFullYear()){
 const files=new Map(),out=[];
 // Published photo paths are not data URLs: validate them separately, then let the catalog validator check the rest.
 // 17/11: photos are checked one by one below, so the 12 MB backup limit applies to the text only
 // (98 new photos inline ≈ 26 MB made “Xuất bản” fail after replacing every photo).
 const forValidation=people.map(p=>PUBLISHED_PHOTO.test(p.image||'')||DATA_URL.test(p.image||'')?{...p,image:''}:p);
 const valid=parseCatalogBackup(JSON.stringify({schemaVersion:1,people:forValidation}),year);
 for(const p of valid){
  const original=people.find(v=>v.id===p.id);let image='';
  const m=DATA_URL.exec(original.image||'');
  if(m){
   if(m[1]!=='jpeg')throw new Error('Ảnh '+p.id+' phải là JPEG (trang quản trị tự chuyển ảnh sang JPEG).');
   const bytes=Buffer.from(m[2],'base64');
   if(bytes.length<200||bytes[0]!==0xFF||bytes[1]!==0xD8)throw new Error('Ảnh '+p.id+' không phải JPEG hợp lệ.');
   const name=p.id+'-'+createHash('sha256').update(bytes).digest('hex').slice(0,10)+'.jpg';
   files.set(name,bytes);image='data/photos/'+name;
  }else if(PUBLISHED_PHOTO.test(original.image||'')){
   const name=original.image.slice('data/photos/'.length);
   if(!existingFiles.has(name))throw new Error('Thiếu tệp ảnh đã xuất bản: '+name);
   files.set(name,null);image=original.image;
  }
  out.push({...p,image});
 }
 out.sort((a,b)=>String(a.displaySlot||'zz').localeCompare(String(b.displaySlot||'zz'),'en',{numeric:true})||a.id.localeCompare(b.id,'en',{numeric:true}));
 const keep=new Set(files.keys()),removed=[...existingFiles].filter(f=>!keep.has(f));
 const catalog={schemaVersion:1,publishedAt:new Date().toISOString(),people:out};
 return {catalog,files,removed};
}

/** Write the publication into <root>/public/data (only that folder is touched). */
export function writePublication(root,publication){
 const dir=root+'/public/data',photos=dir+'/photos';mkdirSync(photos,{recursive:true});
 for(const [name,bytes] of publication.files)if(bytes)writeFileSync(photos+'/'+name,bytes);
 for(const name of publication.removed)rmSync(photos+'/'+name,{force:true});
 writeFileSync(dir+'/catalog.json',JSON.stringify(publication.catalog,null,1)+'\n');
}

export function existingPhotoFiles(root){const d=root+'/public/data/photos';return new Set(existsSync(d)?readdirSync(d).filter(f=>f.endsWith('.jpg')):[]);}
export function readPublished(root){try{return JSON.parse(readFileSync(root+'/public/data/catalog.json','utf8')).people||[];}catch{return [];}}

// 17/11 (Phương án B): ảnh trình diễn khu tủ kỷ vật → public/data/gallery.json + public/data/gallery/<id>-<hash>.jpg
import {parseGallery,GALLERY_PHOTO} from '../src/data/gallery.mjs';
export function buildGalleryPublication(items,existingFiles=new Set()){
 const valid=parseGallery(items),files=new Map(),out=[];
 for(const it of valid){
  let image;
  const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(it.image);
  if(m){
   const bytes=Buffer.from(m[1],'base64');
   if(bytes.length<200||bytes[0]!==0xFF||bytes[1]!==0xD8)throw new Error('Ảnh trình diễn '+it.id+' không phải JPEG hợp lệ.');
   const name=it.id+'-'+createHash('sha256').update(bytes).digest('hex').slice(0,10)+'.jpg';
   files.set(name,bytes);image='data/gallery/'+name;
  }else if(GALLERY_PHOTO.test(it.image)){
   const name=it.image.slice('data/gallery/'.length);
   if(!existingFiles.has(name))throw new Error('Thiếu tệp ảnh trình diễn đã xuất bản: '+name);
   files.set(name,null);image=it.image;
  }else throw new Error('Ảnh trình diễn '+it.id+' chưa sẵn sàng để xuất bản.');
  out.push({...it,image});
 }
 const keep=new Set(files.keys()),removed=[...existingFiles].filter(f=>!keep.has(f));
 return {gallery:{schemaVersion:1,publishedAt:new Date().toISOString(),items:out},files,removed};
}
export function writeGalleryPublication(root,pub){
 const dir=root+'/public/data',photos=dir+'/gallery';mkdirSync(photos,{recursive:true});
 for(const [name,bytes] of pub.files)if(bytes)writeFileSync(photos+'/'+name,bytes);
 for(const name of pub.removed)rmSync(photos+'/'+name,{force:true});
 writeFileSync(dir+'/gallery.json',JSON.stringify(pub.gallery,null,1)+'\n');
}
export function existingGalleryFiles(root){const d=root+'/public/data/gallery';return new Set(existsSync(d)?readdirSync(d).filter(f=>f.endsWith('.jpg')):[]);}
