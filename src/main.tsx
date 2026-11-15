import React from 'react';
import {createRoot} from 'react-dom/client';
import {preloadPhotos} from './data/photoStore';
import {markNeedRefresh,setUpdater} from './data/pwa';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/vietnamese-400.css';
import '@fontsource/noto-sans/latin-600.css';
import '@fontsource/noto-sans/vietnamese-600.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans/vietnamese-700.css';
import '@fontsource/noto-serif/latin-700.css';
import '@fontsource/noto-serif/vietnamese-700.css';
import './style.css';
import './guided.css';
import './navigation.css';
// PWA P2 (15/11): offline cache for the public site only. The admin computer runs the dev server, so DEV never registers.
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 // First visit: catalog.json was fetched before the worker took control — fetch it once more through the worker so the
 // published data (not the sample data) is there when the visitor opens the app offline later.
 navigator.serviceWorker.addEventListener('controllerchange',()=>{void fetch(import.meta.env.BASE_URL+'data/catalog.json',{cache:'no-cache'}).catch(()=>undefined);},{once:true});
 // P3: a new version waits (no skipWaiting) and the welcome page shows “Đã có nội dung mới — Cập nhật”.
 // Installed apps stay open for days: look for a new version every hour and whenever the app comes back to the screen.
 void import('virtual:pwa-register').then(({registerSW})=>{
  const update=registerSW({immediate:true,onNeedRefresh:markNeedRefresh,onRegisteredSW(_url,reg){
   if(!reg)return;const check=()=>{if(navigator.onLine)void reg.update().catch(()=>undefined);};
   setInterval(check,60*60*1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
  }});
  setUpdater(update);
 }).catch(()=>undefined);
}
const root=document.getElementById('root')!;
root.textContent='Đang chuẩn bị không gian tham quan…';
Promise.all([preloadPhotos().catch(err=>console.warn('Không đọc được kho ảnh',err)),document.fonts.load('400 16px "Noto Sans"','Phòng truyền thống nhà trường'),document.fonts.load('700 16px "Noto Sans"','Các thế hệ nhà giáo'),document.fonts.load('700 16px "Noto Serif"','Phòng truyền thống')]).catch(()=>undefined).then(loadPublished).then(()=>import('./App')).then(({default:App})=>createRoot(root).render(<React.StrictMode><App/></React.StrictMode>));
/** Cách 1: the public site reads data published from the admin computer (public/data/catalog.json).
 * Missing file (not published yet) → the sample data is shown. */
async function loadPublished(){
 try{const r=await fetch(import.meta.env.BASE_URL+'data/catalog.json',{cache:'no-cache'});
  if(r.ok){const data=await r.json();if(data?.schemaVersion===1&&Array.isArray(data.people)&&data.people.length)(globalThis as any).__MUSEUM_PUBLISHED__=data.people;}}
 catch{/* offline or not published yet */}
}
import './people.css';
import './visitor.css';
import './wayfinding.css';
import './joystick.css';
import './welcome.css';
import './landscape.css';
