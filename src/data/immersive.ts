import {isStandalone} from './browserEnv.mjs';
// 16/11 (user): the public site is for the 3D visit first. On a phone, the "Bắt đầu tham quan" tap — a user
// gesture, the only moment browsers allow it — puts the page in fullscreen and turns it landscape (Android).
// The browser's own "how to exit fullscreen" notice then appears during loading, not over the 3D room.
// iPhone Safari has no page fullscreen: the loading screen shows a "rotate your phone" hint instead.

export function touchDevice(){try{return matchMedia('(pointer:coarse)').matches;}catch{return false;}}

export async function enterImmersive(){
 if(!touchDevice())return;
 const el=document.documentElement as HTMLElement&{webkitRequestFullscreen?:(o?:FullscreenOptions)=>Promise<void>|void};
 try{
  // installed app (P3): already fullscreen — asking again would only show the browser's “exit fullscreen” notice
  if(!document.fullscreenElement&&!isStandalone(window)){
   if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});
   else if(el.webkitRequestFullscreen)await el.webkitRequestFullscreen();
  }
  const o=screen.orientation as ScreenOrientation&{lock?:(t:string)=>Promise<void>};
  if(o?.lock)await o.lock('landscape');
 }catch{/* not supported (iPhone) or refused: the rotate hint covers it */}
}
