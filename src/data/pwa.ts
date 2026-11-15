// PWA P3–P4 (16/11): shared state for “a new version is ready” and “this browser can install the app”.
// Imported by main.tsx before React starts, so the early `beforeinstallprompt` event is never missed.
import {isStandalone} from './browserEnv.mjs';

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type State={needRefresh:boolean;canInstall:boolean;installed:boolean};

let state:State={needRefresh:false,canInstall:false,installed:typeof window!=='undefined'&&isStandalone(window)};
let installEvent:InstallEvent|null=null;
let updater:((reload?:boolean)=>Promise<void>)|null=null;
const subs=new Set<()=>void>();
const set=(patch:Partial<State>)=>{state={...state,...patch};subs.forEach(fn=>fn());};

export const subscribePwa=(fn:()=>void)=>{subs.add(fn);return()=>{subs.delete(fn);};};
export const getPwa=()=>state;

if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e as InstallEvent;set({canInstall:true});});
 window.addEventListener('appinstalled',()=>{installEvent=null;set({canInstall:false,installed:true});});
}

/** Android/Chrome: show the browser's own install dialog. Returns true when the visitor accepted. */
export async function promptInstall(){
 const e=installEvent;if(!e)return false;
 installEvent=null;set({canInstall:false});
 try{await e.prompt();return (await e.userChoice).outcome==='accepted';}catch{return false;}
}

/** Called by main.tsx with vite-plugin-pwa's updater; `onNeedRefresh` marks the update bar. */
export function setUpdater(fn:(reload?:boolean)=>Promise<void>){updater=fn;}
export function markNeedRefresh(){set({needRefresh:true});}
export function dismissUpdate(){set({needRefresh:false});}
/** Activate the waiting version and reload the page with it. */
export async function applyUpdate(){set({needRefresh:false});if(updater)await updater(true);else location.reload();}
