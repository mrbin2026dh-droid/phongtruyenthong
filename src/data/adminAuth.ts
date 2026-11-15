/** Local admin sign-in (this browser only).
 * IMPORTANT: this only keeps casual visitors on the same computer out of the editing tools.
 * It is NOT online security — anyone controlling the device/browser can bypass it. Real accounts need
 * Firebase Authentication + Firestore rules (planned in 05-HUONG-DAN-AI). Never reuse an important password. */
import {adminAllowed} from './photoRef.mjs';
const KEY='museum-admin-passcode-v1',SESSION='museum-admin-session-v1',EVENT='museum-admin-change';

async function digest(salt:string,pass:string){
 const data=new TextEncoder().encode(salt+'|'+pass);
 const buf=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&typeof v.salt==='string'&&typeof v.hash==='string'?v as {salt:string;hash:string}:null;}catch{return null;}}
function announce(){window.dispatchEvent(new Event(EVENT));}

export function hasPasscode(){return read()!==null;}
export function isAdmin(){if(!adminAllowed(import.meta.env.DEV,location.hostname))return false;try{return sessionStorage.getItem(SESSION)==='1'&&hasPasscode();}catch{return false;}}
export function subscribeAdmin(fn:()=>void){window.addEventListener(EVENT,fn);window.addEventListener('storage',fn);return()=>{window.removeEventListener(EVENT,fn);window.removeEventListener('storage',fn);};}

/** First use: create the passcode (min 6 characters). */
export async function createPasscode(pass:string){
 if(hasPasscode())throw new Error('Đã có mật khẩu quản trị trên máy này.');
 if(pass.length<6)throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
 const salt=crypto.randomUUID();
 try{localStorage.setItem(KEY,JSON.stringify({salt,hash:await digest(salt,pass)}));sessionStorage.setItem(SESSION,'1');}
 catch{throw new Error('Trình duyệt không cho lưu mật khẩu (chế độ ẩn danh?).');}
 announce();
}
export async function signIn(pass:string){
 const v=read();if(!v)throw new Error('Chưa có mật khẩu quản trị.');
 if(await digest(v.salt,pass)!==v.hash)throw new Error('Mật khẩu không đúng.');
 try{sessionStorage.setItem(SESSION,'1');}catch{/* session only */}
 announce();
}
export function signOut(){try{sessionStorage.removeItem(SESSION);}catch{/* ignore */}announce();}
