import seed from './legacy-seed.json';
import {createCatalogStore} from './catalog.mjs';
import {isPhotoRef,photoURL} from './photoStore';
import {adminAllowed,isPublishedPhoto} from './photoRef.mjs';
export type WorkSpell={id:string;startYear:number;endYear:number|null;role:string};
export type Person={displaySlot?:string;id:string;name:string;role:string;dept:string;status:string;startYear:number;endYear:number|null;description:string;image:string;photoRatio:number;group:string;birthYear:number|null;workHistory:WorkSpell[]};
export type Period=typeof seed.periods[number];
export type CatalogSnapshot={schemaVersion:number;revision:number;people:Person[];storageError:string};
export type PersonInput=Omit<Person,'id'|'startYear'|'endYear'>;
type Store={getSnapshot:()=>CatalogSnapshot;subscribe:(listener:()=>void)=>()=>void;savePerson:(input:PersonInput&{displaySlot?:string},options?:{id?:string;allowSameName?:boolean})=>Person;removePerson:(id:string)=>Person;moveToSlot:(id:string,slotId:string)=>Person|null;arrange:(slot:Map<string,string>,rename:Map<string,string>)=>Person[];restorePeople:(people:Person[])=>void;clearPhotos:()=>Person[];restoreBackup:(text:string,options:{expectedRevision:number})=>CatalogSnapshot};
export type {Store};
let storage:Storage|null=null;
try{storage=window.localStorage;}catch{/* Reads still show the seed; writes must report failure. */}
const blockedStorage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};
/** Data published with the website (public/data/catalog.json), fetched in main.tsx before the app loads. */
export const publishedPeople:Person[]|null=(globalThis as any).__MUSEUM_PUBLISHED__||null;
/** Admin tools only on this computer (dev server + loopback). The public build is read-only. */
export const adminAvailable=adminAllowed(import.meta.env.DEV,window.location.hostname);
// Public visitors: read-only, never their own localStorage. Local admin: working copy in localStorage,
// starting from the published data the first time.
export const catalog=createCatalogStore(seed,{storage:adminAvailable?(storage||blockedStorage):null,published:publishedPeople}) as Store;
// Local inspection only: the supplied photo is never copied into dist.
export const samplePortraitMode=['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)&&new URLSearchParams(window.location.search).get('portrait')==='sample';
export const portraitPath=(p:Person)=>isPublishedPhoto(p.image)?import.meta.env.BASE_URL+p.image:isPhotoRef(p.image)?(photoURL(p.image)||`${import.meta.env.BASE_URL}portraits/default.jpg`):/^data:image\/(jpeg|png|webp);base64,/.test(p.image||'')?p.image:samplePortraitMode?'/__local-preview/portrait.jpg':`${import.meta.env.BASE_URL}portraits/${/^GV00[1-9]$|^GV01[0-2]$/.test(p.id)?p.id:'default'}.jpg`;
