import {useState,useSyncExternalStore} from 'react';
import {getPwa,promptInstall,subscribePwa} from '../data/pwa';
import {inAppBrowser,iosBrowser,platformOf} from '../data/browserEnv.mjs';
import Dialog from './Dialog';
import '../pwa.css';

/** P4 (16/11): “Cài ứng dụng” under the start button. Android/desktop Chrome: the browser's own install dialog.
 * iPhone (Safari or Chrome): there is no install event — a short guide shows the Share → Add to Home Screen steps.
 * Hidden once installed or when the browser cannot install. */
export default function InstallApp(){
 const pwa=useSyncExternalStore(subscribePwa,getPwa);
 const [guide,setGuide]=useState(false);
 const ua=navigator.userAgent,ios=platformOf(ua,navigator.maxTouchPoints)==='ios';
 // inside Zalo/Facebook nothing can be installed (OpenInBrowser offers Chrome/Safari instead)
 if(pwa.installed||inAppBrowser(ua))return null;
 if(!pwa.canInstall&&!ios)return null;
 const chrome=iosBrowser(ua)==='chrome';
 return <>
  <button type="button" className="install-app" onClick={()=>{if(pwa.canInstall)void promptInstall();else setGuide(true);}}>
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10 18.5h4"/></svg>
   <span>{ios?'Cài lên màn hình chính':'Cài ứng dụng'}</span>
  </button>
  {guide&&<Dialog title="Cài lên màn hình chính" onClose={()=>setGuide(false)}>
   <ol className="install-steps">
    <li><span className="install-step-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>
     <span>Bấm nút <b>Chia sẻ</b> {chrome?'ở thanh địa chỉ phía trên':'ở thanh công cụ phía dưới màn hình'}.</span></li>
    <li><span className="install-step-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg></span>
     <span>Kéo xuống, chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</span></li>
    <li><span className="install-step-icon" aria-hidden="true"><img src={import.meta.env.BASE_URL+'icons/icon-192.png'} width="28" height="28" alt=""/></span>
     <span>Bấm <b>Thêm</b>. Biểu tượng <b>Phòng truyền thống</b> sẽ có trên màn hình chính, mở ra toàn màn hình.</span></li>
   </ol>
   <button className="gold" onClick={()=>setGuide(false)}>Đã hiểu</button>
  </Dialog>}
 </>;
}
