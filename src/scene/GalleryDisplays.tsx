// 17/11 (A+, người dùng: “như màn hình cảm ứng — ảnh tự chuyển hoặc người xem tự vuốt”) — màn trình chiếu lớn ở tường lối vào.
//  • Băng chuyền: ảnh trước / hiện tại / sau nằm cạnh nhau, cắt gọn trong khung (clipping planes). Vuốt hay kéo chuột trên
//    màn hình → ảnh trượt theo tay; thả tay → sang ảnh kế (kéo > 18 % hoặc vuốt nhanh) hoặc trượt về. Chạm nhẹ → xem toàn màn hình.
//  • Tự chuyển 7 s/ảnh (trượt êm 0,9 s); người xem vừa vuốt → tạm dừng tự chuyển 15 s. Chấm vị trí ở mép dưới (≤ 15 ảnh).
//  • Ảnh hoạt động cắt vừa 16:9; bằng khen / tư liệu hiện trọn trên nền ngà; ảnh mặc định (tranh tri ân) hiện trọn, không viền.
//  • Độ nét: máy tính dựng mỗi ảnh ở 2560×1440, điện thoại 1920×1080; lọc dị hướng tối đa của card đồ họa; giữ ≤ 5 ảnh trong bộ nhớ.
// Camera không xoay khi đang vuốt màn hình (screenGrab). Ảnh chỉ tải khi người xem ở nửa phòng phía lối vào.
import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,Group,Plane,Vector3} from 'three';
import {FRONT_SCREEN} from './hallLayout.mjs';
import {screenGrab} from './screenGrab';

export type DisplayItem={id:string;url:string;caption:string;fit:'cover'|'contain'|'bare'};
type Props={items:DisplayItem[];onOpen:(index:number)=>void};

const S=FRONT_SCREEN,FACE_Z=S.wallZ-.03;          // screen face 3 cm in front of the plaster (wall face z 8.0)
const near=(z:number)=>z>.5;                       // visitor in the entrance half of the room
const phone=(()=>{try{return Math.min(screen.width,screen.height)<600&&matchMedia('(pointer:coarse)').matches;}catch{return false;}})();
const W=phone?1920:2560,H=W*9/16;
const keyOf=(it:DisplayItem)=>it.id+'|'+it.url+'|'+it.caption+'|'+it.fit;
const AUTO_MS=7000,PAUSE_AFTER_TOUCH_MS=15000,SLIDE_MS=900;

/** One slide = picture + caption band, drawn once on a canvas, as a texture. */
const cache=new Map<string,Promise<CanvasTexture>>();
let maxAniso=8;
function slide(it:DisplayItem){
 const key=keyOf(it);
 if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,u=H/1080;
  const bg=g.createRadialGradient(W/2,H*.45,H*.1,W/2,H/2,W*.7);bg.addColorStop(0,'#163338');bg.addColorStop(1,'#091719');g.fillStyle=bg;g.fillRect(0,0,W,H);
  const iw=img.naturalWidth,ih=img.naturalHeight;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  if(it.fit==='cover'){const s=Math.max(W/iw,H/ih);g.drawImage(img,(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s);}
  else if(it.fit==='bare'){const s=Math.min(W/iw,H/ih);g.drawImage(img,(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s);}
  else{const pad=(it.caption?116:52)*u,s=Math.min((W-104*u)/iw,(H-pad-48*u)/ih),w=iw*s,h=ih*s,x=(W-w)/2,y=(H-pad-h)/2+14*u;
   g.shadowColor='#000a';g.shadowBlur=26*u;g.shadowOffsetY=8*u;g.fillStyle='#f6f0e1';g.fillRect(x-10*u,y-10*u,w+20*u,h+20*u);g.shadowColor='transparent';g.drawImage(img,x,y,w,h);}
  if(it.caption){const band=g.createLinearGradient(0,H-200*u,0,H);band.addColorStop(0,'#05121400');band.addColorStop(.55,'#051214c8');band.addColorStop(1,'#051214ee');
   g.fillStyle=band;g.fillRect(0,H-200*u,W,200*u);g.font=`500 ${Math.round(52*u)}px "Noto Sans"`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f6e7c3';
   let t=it.caption;while(t.length>3&&g.measureText(t).width>W-180*u)t=t.slice(0,-2);if(t!==it.caption)t=t.trimEnd()+'…';g.fillText(t,W/2,H-62*u);}
  const tex=new CanvasTexture(c);tex.colorSpace=SRGBColorSpace;tex.anisotropy=maxAniso;resolve(tex);};img.onerror=reject;img.src=it.url;}));
 return cache.get(key)!;
}
/** Free the slides that are no longer near the current one (a phone has little GPU memory). */
function trim(keep:Set<string>){for(const [k,p] of cache)if(!keep.has(k)){cache.delete(k);void p.then(t=>t.dispose()).catch(()=>undefined);}}

const sheen=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d')!;
 const gr=g.createLinearGradient(0,0,256,256);gr.addColorStop(0,'#ffffff22');gr.addColorStop(.35,'#ffffff05');gr.addColorStop(.6,'#ffffff00');gr.addColorStop(1,'#ffffff0a');
 g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();
const ease=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export default function GalleryDisplays({items,onOpen}:Props){
 const get=useThree(s=>s.get),invalidate=useThree(s=>s.invalidate),gl=useThree(s=>s.gl);
 const n=items.length,w=S.width,h=S.height;
 const [active,setActive]=useState(false),[index,setIndex]=useState(0),[tex,setTex]=useState<Record<string,CanvasTexture>>({});
 // carousel: offset in slide widths (−1 … 1) — the slide at `index` sits at offset, its neighbours at offset ± 1.
 // Local +x of the screen (rotated to face the room) is the visitor's RIGHT: the next picture waits on the right.
 const car=useRef({offset:0,from:0,to:0,t0:0,anim:false,dragging:false,startX:0,startT:0,base:0,pxWidth:1,lastTouch:0});
 const strip=useRef<Group>(null);
 useEffect(()=>{gl.localClippingEnabled=true;maxAniso=Math.min(16,gl.capabilities.getMaxAnisotropy?.()||8);},[gl]);
 // world-space clip: keep only what lies between the screen's left and right edges
 const clip=useMemo(()=>[new Plane(new Vector3(1,0,0),-(S.x-w/2)),new Plane(new Vector3(-1,0,0),S.x+w/2)],[w]);
 const at=(k:number)=>n?items[((k%n)+n)%n]:undefined;
 useEffect(()=>{if(active)return;const t=setInterval(()=>{if(near(get().camera.position.z))setActive(true);},700);return()=>clearInterval(t);},[active,get]);
 useEffect(()=>{setIndex(0);car.current.offset=0;},[items]);
 // load the current slide and its neighbours; free the rest
 useEffect(()=>{if(!active||!n)return;let live=true;
  for(const d of [0,1,-1,2]){const it=at(index+d);if(it)slide(it).then(t=>{if(!live)return;setTex(m=>m[keyOf(it)]===t?m:{...m,[keyOf(it)]:t});invalidate();}).catch(()=>undefined);}
  trim(new Set([-2,-1,0,1,2].map(d=>at(index+d)).filter(Boolean).map(it=>keyOf(it!))));
  return()=>{live=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,items,index]);
 const slideTo=(to:number)=>{const c=car.current;c.from=c.offset;c.to=n>1?to:0;c.t0=performance.now();c.anim=true;invalidate();};
 // auto-advance (not while dragging, far away, hidden, or for a while after the visitor swiped)
 useEffect(()=>{if(n<2)return;const t=setInterval(()=>{const c=car.current;
  if(document.hidden||c.dragging||c.anim||!near(get().camera.position.z)||performance.now()-c.lastTouch<PAUSE_AFTER_TOUCH_MS)return;slideTo(-1);},AUTO_MS);return()=>clearInterval(t);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[n,get]);
 useFrame(()=>{const c=car.current;
  if(c.anim){const p=Math.min(1,(performance.now()-c.t0)/SLIDE_MS);c.offset=c.from+(c.to-c.from)*ease(p);
   if(p>=1){c.anim=false;const to=c.to;c.offset=0;if(to!==0)setIndex(i=>(((i-to)%n)+n)%n);}else invalidate();}
  if(strip.current)strip.current.position.x=c.offset*w;});
 // swipe / drag on the screen (window listeners: the finger may leave the screen while swiping)
 const down=(e:any)=>{if(!n)return;e.stopPropagation();const c=car.current;screenGrab.active=true;c.dragging=true;c.anim=false;
  c.startX=e.clientX??e.nativeEvent?.clientX??0;c.startT=performance.now();c.lastTouch=c.startT;c.base=c.offset;
  const {camera,size}=get(),a=new Vector3(S.x-w/2,S.y,FACE_Z).project(camera),b=new Vector3(S.x+w/2,S.y,FACE_Z).project(camera);
  c.pxWidth=Math.max(80,Math.abs(a.x-b.x)/2*size.width);   // screen width in CSS pixels → drag as a fraction of one picture
  const move=(ev:PointerEvent)=>{if(!c.dragging)return;c.offset=Math.max(-1.15,Math.min(1.15,c.base+(ev.clientX-c.startX)/c.pxWidth));invalidate();};
  const up=(ev:PointerEvent)=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);
   c.dragging=false;setTimeout(()=>{screenGrab.active=false;},0);c.lastTouch=performance.now();
   const dx=ev.clientX-c.startX,dt=performance.now()-c.startT,fast=Math.abs(dx)>30&&dt<280;
   if(Math.abs(dx)<8&&dt<450){slideTo(0);onOpen((((index%n)+n)%n));return;}   // a tap → full-screen viewer
   slideTo(c.offset<-.18||(fast&&dx<0)?-1:c.offset>.18||(fast&&dx>0)?1:0);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);};
 const hover=(on:boolean)=>()=>{document.body.style.cursor=on?'grab':'';};
 if(!n)return null;
 const mapOf=(k:number)=>{const it=at(index+k);return it?tex[keyOf(it)]||null:null;};
 const current=((index%n)+n)%n;
 return <group position={[S.x,S.y,FACE_Z]} rotation={[0,Math.PI,0]}>
  {/* walnut frame with a gold fillet, like the portrait frames */}
  <mesh position={[0,0,-.012]}><planeGeometry args={[w+.16,h+.16]}/><meshBasicMaterial color="#4a3423" toneMapped={false}/></mesh>
  <mesh position={[0,0,-.010]}><planeGeometry args={[w+.06,h+.06]}/><meshBasicMaterial color="#c9a45e" toneMapped={false}/></mesh>
  <mesh position={[0,0,-.009]} onPointerDown={down} onPointerOver={hover(true)} onPointerOut={hover(false)}><planeGeometry args={[w+.03,h+.03]}/><meshBasicMaterial color="#081416" toneMapped={false}/></mesh>
  {/* the strip: previous · current · next, clipped to the screen */}
  <group ref={strip} position={[0,0,-.008]}>
   {[-1,0,1].map(k=>{const m=mapOf(k);return <mesh key={k} position={[k*w,0,0]} onPointerDown={down}><planeGeometry args={[w,h]}/>
    <meshBasicMaterial map={m} color={m?'#ffffff':'#0b1719'} toneMapped={false} clippingPlanes={clip}/></mesh>;})}
  </group>
  {sheen&&<mesh position={[0,0,-.006]}><planeGeometry args={[w,h]}/><meshBasicMaterial map={sheen} transparent depthWrite={false} toneMapped={false}/></mesh>}
  {/* position dots, like a touch screen (only for a short list) */}
  {n>1&&n<=15&&<group position={[0,-h/2+.09,-.005]}>{items.map((it,k)=>{const on=k===current,x=(k-(n-1)/2)*.11;
   return <mesh key={it.id} position={[x,0,0]}><circleGeometry args={[on?.026:.018,20]}/><meshBasicMaterial color={on?'#f0d18d':'#ffffff'} transparent opacity={on?.95:.45} depthWrite={false} toneMapped={false}/></mesh>;})}</group>}
 </group>;
}
