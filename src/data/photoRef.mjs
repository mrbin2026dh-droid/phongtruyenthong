// Shared by the catalog (validation) and the IndexedDB photo store. Pure; tested in tests/admin.test.mjs.
export const PHOTO_REF=/^idb:[A-Za-z0-9]{8,64}$/;
export function isPhotoRef(value){return typeof value==='string'&&PHOTO_REF.test(value);}

/** Zone of a wall slot → catalog group + default role for a new person placed there. */
export function slotDefaults(group){
 return {
  principal:{group:'management',role:'Hiệu trưởng',roleLocked:true},
  deputy:{group:'management',role:'Phó Hiệu trưởng',roleLocked:true},
  teacher:{group:'teacher',role:'Giáo viên',roleLocked:false},
  staff:{group:'staff',role:'Nhân viên',roleLocked:false}
 }[group]||null;
}

/** Ratio stored with a photo: the catalog accepts 2:3 or 3:4; pick the closer one. */
export function storedRatio(width,height){const r=width/Math.max(1,height);return Math.abs(r-2/3)<=Math.abs(r-3/4)?2/3:3/4;}

/** Photo already published with the website (public/data/photos/…). */
export const PUBLISHED_PHOTO=/^data\/photos\/[A-Za-z0-9_-]+\.jpg$/;
export function isPublishedPhoto(value){return typeof value==='string'&&PUBLISHED_PHOTO.test(value);}

/** Admin tools exist only on the local computer: dev server + loopback address. Never on GitHub Pages. */
export function adminAllowed(isDev,hostname){return Boolean(isDev)&&['localhost','127.0.0.1','[::1]'].includes(hostname);}
