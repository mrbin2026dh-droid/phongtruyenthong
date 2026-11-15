import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import VisitLoading from '../components/VisitLoading';
import {assetProgressKey,isAssetReady,subscribeAssets} from './sceneAssets';
import {STALL_MS,loadProgress,loadStage} from '../data/loadWatch.mjs';

/** 15/11 (việc 1): the loading overlay of the hall with real progress and a stall detector.
 * Kept in its own component so progress updates (one per portrait) do not re-render the whole tour. */
export default function HallLoading({required,onList}:{required:string[];onList?:()=>void}){
 const key=useSyncExternalStore(subscribeAssets,()=>assetProgressKey(required));
 const [, ,imagesDone,imagesTotal]=key.split('/').map(Number);
 const needRoom=required.includes('baked');
 // read each asset by name (the statue may finish before the room); key changes re-render this component
 const state={needRoom,roomReady:!needRoom||isAssetReady('baked'),statueReady:isAssetReady('statue'),imagesDone,imagesTotal};
 const best=useRef(0);
 const pct=Math.max(best.current,loadProgress(state));
 useEffect(()=>{best.current=pct;},[pct]);
 // no asset finished for STALL_MS → the download is probably stuck
 const [stalled,setStalled]=useState(false);
 useEffect(()=>{setStalled(false);const t=setTimeout(()=>setStalled(true),STALL_MS);return()=>clearTimeout(t);},[key]);
 return <VisitLoading overlay pct={pct} stage={loadStage(state)} stalled={stalled} onList={onList}/>;
}
