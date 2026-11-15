import {useEffect,useRef,useState} from 'react';
import {chromeIntentUrl,iosOpenUrls} from '../data/browserEnv.mjs';
import '../pwa.css';

type Props={app:string;platform:'android'|'ios';onStay:()=>void};
/** 16/11 (user, screenshot from another site): a link opened inside Zalo/Facebook offers to continue in Chrome (Android)
 * or Safari / Chrome (iPhone), where the 3D visit runs best and the app can be installed. If the switch is blocked by the
 * in-app browser, the manual steps appear after a moment. */
export default function OpenInBrowser({app,platform,onStay}:Props){
 // the link to hand over: this exact page, without the computer-preview switch (?xem-thu=…)
 const href=(()=>{const u=new URL(location.href);u.searchParams.delete('xem-thu');return u.href;})();
 const [copied,setCopied]=useState(false),[manual,setManual]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),field=useRef<HTMLInputElement>(null),first=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{first.current?.focus();return()=>clearTimeout(timer.current);},[]);
 // still on this page after the tap → the in-app browser refused to hand over: show the manual way
 const tried=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>{if(document.visibilityState==='visible')setManual(true);},1800);};
 async function copy(){
  try{await navigator.clipboard.writeText(href);setCopied(true);}
  catch{const f=field.current;if(f){f.hidden=false;f.select();try{setCopied(document.execCommand('copy'));}catch{/* user copies by hand */}}}
 }
 const ios=platform==='ios',urls=ios?iosOpenUrls(href):null,browser=ios?'Safari':'Chrome';
 return <div className="open-browser" role="dialog" aria-modal="true" aria-labelledby="open-browser-title">
  <div className="open-browser-card">
   <img className="open-browser-icon" src={import.meta.env.BASE_URL+'icons/icon-192.png'} width="64" height="64" alt=""/>
   <h1 id="open-browser-title">Mở Phòng truyền thống bằng trình duyệt</h1>
   <p>Bạn đang mở link trong {app}. {browser} giúp tham quan 3D mượt hơn, cài được ứng dụng lên màn hình chính và xem cả khi mất mạng.</p>
   {ios
    ?<><a ref={first} className="open-browser-primary" href={urls!.safari} onClick={tried}>Mở bằng Safari</a>
      <a className="open-browser-secondary" href={urls!.chrome} onClick={tried}>Mở bằng Chrome <small>(nếu máy có)</small></a></>
    :<a ref={first} className="open-browser-primary" href={chromeIntentUrl(href)} onClick={tried}>Mở bằng Chrome</a>}
   <button type="button" className="open-browser-secondary" onClick={onStay}>Ở lại trình duyệt hiện tại</button>
   <button type="button" className="open-browser-copy" onClick={copy} aria-live="polite">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>
    {copied?'Đã sao chép link':'Sao chép link'}
   </button>
   <input ref={field} className="open-browser-field" value={href} readOnly hidden aria-label="Link trang"/>
   {manual&&<div className="open-browser-manual" role="status">
    <b>{app} chưa cho mở thẳng. Làm theo 2 bước:</b>
    <ol>{ios
     ?<><li>Bấm nút <b>⋯</b> hoặc <b>⋮</b> ở góc trên bên phải.</li><li>Chọn <b>Mở bằng trình duyệt</b> / <b>Mở trong Safari</b>.</li></>
     :<><li>Bấm nút <b>⋮</b> hoặc <b>⋯</b> ở góc trên bên phải.</li><li>Chọn <b>Mở bằng trình duyệt</b> (hoặc dán link đã sao chép vào Chrome).</li></>}
    </ol>
   </div>}
   <p className="open-browser-note">Trang sẽ mở đúng nơi bạn đang xem.</p>
  </div>
 </div>;
}
