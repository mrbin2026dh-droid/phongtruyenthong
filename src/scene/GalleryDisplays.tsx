// 17/11 (Phương án B) — ảnh trình diễn ở 3 hốc tủ tường lối vào.
//  • Hốc giữa: màn trình chiếu 16:9 khung vàng, ảnh hoạt động chuyển mờ dần + phóng nhẹ, chú thích dưới ảnh.
//  • Hai hốc bên: khung trên (đã có trong phòng) hiện bằng khen / tư liệu thật, tự lật chậm từng tấm; hiện vật 3D giữ nguyên.
// Hiệu năng: ảnh chỉ tải khi người xem ở nửa phòng phía lối vào; cảnh chỉ vẽ lại trong lúc chuyển ảnh (frameloop “demand”).
// Khu nào chưa có ảnh → không vẽ gì, tủ giữ hiện vật minh họa như cũ.
import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,Texture,TextureLoader,LinearFilter,Group,MeshBasicMaterial} from 'three';
import {CABINETS,CABINET_NICHE} from './hallLayout.mjs';

export type DisplayItem={id:string;url:string;caption:string};
export type DisplayItemsByCat={activity:DisplayItem[];award:DisplayItem[];memento:DisplayItem[]};
type Props={items:DisplayItemsByCat;onOpen:(cat:'activity'|'award'|'memento',index:number)=>void};

const SCREEN={w:1.84,h:1.035,y:2.0},CAPTION_Y=1.36;
const near=(z:number)=>z>.5;   // visitor in the entrance half of the room (the wall with the cabinets)

const loader=new TextureLoader();
const textures=new Map<string,Promise<Texture>>();
function loadTexture(url:string){
 if(!textures.has(url))textures.set(url,loader.loadAsync(url).then(t=>{t.colorSpace=SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;return t;}));
 return textures.get(url)!;
}
/** Crop a picture to the 16:9 screen (cover). */
function cover(t:Texture,aspect:number){
 const img=t.image as {width:number;height:number};const a=img.width/Math.max(1,img.height);
 t.repeat.set(1,1);t.offset.set(0,0);
 if(a>aspect){t.repeat.x=aspect/a;t.offset.x=(1-t.repeat.x)/2;}else{t.repeat.y=a/aspect;t.offset.y=(1-t.repeat.y)/2;}
 t.needsUpdate=true;return t;
}
/** Certificates must never be cropped: draw the picture whole on an ivory mat (contain). */
const mats=new Map<string,Promise<CanvasTexture>>();
function matTexture(url:string,aspect:number){
 const key=url+'|'+aspect.toFixed(3);
 if(!mats.has(key))mats.set(key,new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>{
  const W=1024,H=Math.round(W/aspect),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
  g.fillStyle='#f6f0e1';g.fillRect(0,0,W,H);
  const m=.05,bw=W*(1-2*m),bh=H*(1-2*m),s=Math.min(bw/img.naturalWidth,bh/img.naturalHeight),w=img.naturalWidth*s,h=img.naturalHeight*s;
  g.shadowColor='#0003';g.shadowBlur=10;g.shadowOffsetY=3;g.imageSmoothingQuality='high';g.drawImage(img,(W-w)/2,(H-h)/2,w,h);
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=4;resolve(t);};img.onerror=reject;img.src=url;}));
 return mats.get(key)!;
}
function captionTexture(text:string){
 const c=document.createElement('canvas');c.width=2048;c.height=140;const g=c.getContext('2d')!;
 g.clearRect(0,0,c.width,c.height);g.font='500 68px "Noto Sans"';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f3e4c4';
 let s=text;while(s.length>3&&g.measureText(s).width>c.width-80)s=s.slice(0,-2);if(s!==text)s=s.trimEnd()+'…';
 g.fillText(s,c.width/2,c.height/2+2);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.minFilter=LinearFilter;return t;
}
const panelLight=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=8;c.height=256;const g=c.getContext('2d')!;
 const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#2a5458');gr.addColorStop(.18,'#173a3e');gr.addColorStop(1,'#0c2225');g.fillStyle=gr;g.fillRect(0,0,8,256);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();
const sheen=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d')!;
 const gr=g.createLinearGradient(0,0,256,256);gr.addColorStop(0,'#ffffff30');gr.addColorStop(.35,'#ffffff08');gr.addColorStop(.6,'#ffffff00');gr.addColorStop(1,'#ffffff10');
 g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();

/** Advance an index every `period` ms while the visitor is near and the page is visible. */
function useCycle(count:number,period:number,delay:number){
 const get=useThree(s=>s.get);const [i,setI]=useState(0);
 useEffect(()=>{setI(0);if(count<2)return;let t:ReturnType<typeof setInterval>|undefined;
  const start=setTimeout(()=>{t=setInterval(()=>{if(document.hidden||!near(get().camera.position.z))return;setI(v=>(v+1)%count);},period);},delay);
  return()=>{clearTimeout(start);clearInterval(t);};},[count,period,delay,get]);
 return i;
}
/** True once the visitor has come to the entrance half (then textures start loading). */
function useNearOnce(){
 const get=useThree(s=>s.get);const [on,setOn]=useState(false);
 useEffect(()=>{if(on)return;const t=setInterval(()=>{if(near(get().camera.position.z))setOn(true);},700);return()=>clearInterval(t);},[on,get]);
 return on;
}

function Screen({items,onOpen,active}:{items:DisplayItem[];onOpen:(i:number)=>void;active:boolean}){
 const index=useCycle(items.length,7000,0),invalidate=useThree(s=>s.invalidate);
 const [cur,setCur]=useState<Texture|null>(null),[prev,setPrev]=useState<Texture|null>(null);
 const curMat=useRef<MeshBasicMaterial>(null),img=useRef<Group>(null),fade=useRef({t0:0,on:false});
 const caption=useMemo(()=>captionTexture(items[index]?.caption||''),[items,index]);
 useEffect(()=>()=>caption.dispose(),[caption]);
 useEffect(()=>{if(!active||!items[index])return;let live=true;
  loadTexture(items[index].url).then(t=>{if(!live)return;cover(t,SCREEN.w/SCREEN.h);setPrev(p=>cur??p);setCur(t);fade.current={t0:performance.now(),on:true};invalidate();
   const next=items[(index+1)%items.length];if(next)void loadTexture(next.url);}).catch(()=>undefined);
  return()=>{live=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,items,index]);
 useFrame(()=>{const f=fade.current;if(!f.on||!curMat.current||!img.current)return;
  const p=Math.min(1,(performance.now()-f.t0)/1300),e=p*p*(3-2*p);
  curMat.current.opacity=e;img.current.scale.setScalar(1.035-.035*e);
  if(p<1)invalidate();else f.on=false;});
 const open=(e:any)=>{if(e.delta>8)return;e.stopPropagation();onOpen(index);};
 const hover=(on:boolean)=>()=>{document.body.style.cursor=on?'pointer':'';};
 return <group>
  {/* gold frame + dark bezel */}
  <mesh position={[0,SCREEN.y,-.011]}><planeGeometry args={[SCREEN.w+.07,SCREEN.h+.07]}/><meshBasicMaterial color="#c9a45e" toneMapped={false}/></mesh>
  <mesh position={[0,SCREEN.y,-.0105]}><planeGeometry args={[SCREEN.w+.035,SCREEN.h+.035]}/><meshBasicMaterial color="#0b1719" toneMapped={false}/></mesh>
  <group onClick={open} onPointerOver={hover(true)} onPointerOut={hover(false)}>
   <mesh position={[0,SCREEN.y,-.0100]}><planeGeometry args={[SCREEN.w,SCREEN.h]}/><meshBasicMaterial color="#0b1719" map={prev||cur} toneMapped={false}/></mesh>
   <group ref={img} position={[0,SCREEN.y,-.0095]}>
    {cur&&<mesh><planeGeometry args={[SCREEN.w,SCREEN.h]}/><meshBasicMaterial ref={curMat} map={cur} transparent opacity={0} toneMapped={false} depthWrite={false}/></mesh>}
   </group>
  </group>
  {sheen&&<mesh position={[0,SCREEN.y,-.009]}><planeGeometry args={[SCREEN.w,SCREEN.h]}/><meshBasicMaterial map={sheen} transparent depthWrite={false} toneMapped={false}/></mesh>}
  <mesh position={[0,CAPTION_Y,-.0105]}><planeGeometry args={[SCREEN.w,.125]}/><meshBasicMaterial map={caption} transparent toneMapped={false} depthWrite={false}/></mesh>
 </group>;
}

/** A frame that turns over slowly to the next certificate / document. */
function FlipFrame({items,face,period,delay,onOpen,active}:{items:DisplayItem[];face:{y:number;z:number;w:number;h:number};period:number;delay:number;onOpen:(i:number)=>void;active:boolean}){
 const index=useCycle(items.length,period,delay),invalidate=useThree(s=>s.invalidate);
 const [tex,setTex]=useState<CanvasTexture|null>(null),pending=useRef<CanvasTexture|null>(null);
 const g=useRef<Group>(null),flip=useRef({t0:0,on:false,swapped:false});
 useEffect(()=>{if(!active||!items[index])return;let live=true;
  matTexture(items[index].url,face.w/face.h).then(t=>{if(!live)return;
   if(!tex){setTex(t);invalidate();}else{pending.current=t;flip.current={t0:performance.now(),on:true,swapped:false};invalidate();}
   const next=items[(index+1)%items.length];if(next)void matTexture(next.url,face.w/face.h);}).catch(()=>undefined);
  return()=>{live=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,items,index]);
 useFrame(()=>{const f=flip.current;if(!f.on||!g.current)return;
  const p=Math.min(1,(performance.now()-f.t0)/1000);
  if(p>=.5&&!f.swapped&&pending.current){f.swapped=true;setTex(pending.current);}
  g.current.rotation.y=p<.5?p*Math.PI:(p-1)*Math.PI;   // 0 → 90° (edge-on, swap) → −90° → 0
  if(p<1)invalidate();else{f.on=false;g.current.rotation.y=0;}});
 const open=(e:any)=>{if(e.delta>8)return;e.stopPropagation();onOpen(index);};
 if(!tex)return null;
 return <group ref={g} position={[0,face.y,face.z]} onClick={open} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
  <mesh><planeGeometry args={[face.w,face.h]}/><meshBasicMaterial map={tex} toneMapped={false}/></mesh>
 </group>;
}

// Upper frame faces of the side cabinets (same numbers as MemoryCabinets in HallScene; local coords of a cabinet).
const FACES:Record<number,{y:number;z:number;w:number;h:number}>={
 0:{y:2.44,z:-.122,w:1.27,h:.51},   // Tư liệu và kỷ vật
 2:{y:2.43,z:-.167,w:.97,h:.52}     // Thành tích tập thể
};

export default function GalleryDisplays({items,onOpen}:Props){
 const active=useNearOnce(),n=CABINET_NICHE,mid=(n.bottom+n.top)/2;
 return <>{CABINETS.map((c:any,i:number)=>{
  const cat=i===1?'activity':i===2?'award':'memento',list=items[cat as keyof Props['items']];
  if(!list.length)return null;
  return <group key={c.id} position={[c.x,0,n.wallZ]} rotation={[0,Math.PI,0]}>
   {i===1
    ?<>{/* dark display panel in front of the old sample objects */}
     <mesh position={[0,mid+.025,-.012]}><planeGeometry args={[n.width-.11,n.top-n.bottom-.05]}/><meshBasicMaterial color={panelLight?"#ffffff":"#10292d"} map={panelLight} toneMapped={false}/></mesh>
     <Screen items={list} active={active} onOpen={k=>onOpen('activity',k)}/></>
    :<FlipFrame items={list} face={FACES[i]} period={9000} delay={i===2?2500:6000} active={active} onOpen={k=>onOpen(cat as 'award'|'memento',k)}/>}
  </group>;})}</>;
}
