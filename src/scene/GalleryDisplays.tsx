// 17/11 (A+) — màn trình chiếu lớn trên tường lối vào (thay 3 hốc tủ): ảnh hoạt động, thành tích, tư liệu chạy luân phiên.
//  • Ảnh hoạt động: cắt vừa khung 16:9. Bằng khen / tư liệu: hiện TRỌN ảnh trên nền tối (không bao giờ cắt chữ).
//  • Chuyển ảnh: mờ dần 1,3 s + phóng nhẹ; chú thích ở dải dưới ảnh. Chạm → bộ xem toàn màn hình.
// Hiệu năng: ảnh chỉ tải khi người xem ở nửa phòng phía lối vào; giữ tối đa 2 ảnh trong bộ nhớ; cảnh chỉ vẽ lại lúc chuyển.
// Chưa có ảnh nào → không vẽ gì (tường trơn, khẩu hiệu giữ nguyên).
import {useEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,Group,MeshBasicMaterial} from 'three';
import {FRONT_SCREEN} from './hallLayout.mjs';

export type DisplayItem={id:string;url:string;caption:string;fit:'cover'|'contain'};
type Props={items:DisplayItem[];onOpen:(index:number)=>void};

const S=FRONT_SCREEN,FACE_Z=S.wallZ-.03;          // screen face 3 cm in front of the plaster (wall face z 8.0)
const near=(z:number)=>z>.5;                       // visitor in the entrance half of the room
const W=1600,H=900;
const keyOf=(it:DisplayItem)=>it.id+'|'+it.url+'|'+it.caption;

/** One slide = picture + caption band, drawn once on a canvas (cover or contain), as a texture. */
const cache=new Map<string,Promise<CanvasTexture>>();
function slide(it:DisplayItem){
 const key=keyOf(it);
 if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
  const bg=g.createRadialGradient(W/2,H*.45,H*.1,W/2,H/2,W*.7);bg.addColorStop(0,'#163338');bg.addColorStop(1,'#091719');g.fillStyle=bg;g.fillRect(0,0,W,H);
  const iw=img.naturalWidth,ih=img.naturalHeight;g.imageSmoothingQuality='high';
  if(it.fit==='cover'){const s=Math.max(W/iw,H/ih);g.drawImage(img,(W-iw*s)/2,(H-ih*s)/2,iw*s,ih*s);}
  else{const pad=it.caption?96:44,s=Math.min((W-88)/iw,(H-pad-40)/ih),w=iw*s,h=ih*s,x=(W-w)/2,y=(H-pad-h)/2+14;
   g.shadowColor='#000a';g.shadowBlur=26;g.shadowOffsetY=8;g.fillStyle='#f6f0e1';g.fillRect(x-10,y-10,w+20,h+20);g.shadowColor='transparent';g.drawImage(img,x,y,w,h);}
  if(it.caption){const band=g.createLinearGradient(0,H-170,0,H);band.addColorStop(0,'#05121400');band.addColorStop(.55,'#051214c8');band.addColorStop(1,'#051214ee');
   g.fillStyle=band;g.fillRect(0,H-170,W,170);g.font='500 44px "Noto Sans"';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f6e7c3';
   let t=it.caption;while(t.length>3&&g.measureText(t).width>W-160)t=t.slice(0,-2);if(t!==it.caption)t=t.trimEnd()+'…';g.fillText(t,W/2,H-52);}
  const tex=new CanvasTexture(c);tex.colorSpace=SRGBColorSpace;tex.anisotropy=8;resolve(tex);};img.onerror=reject;img.src=it.url;}));
 return cache.get(key)!;
}
/** Free the slides that are no longer needed (a phone has little GPU memory). */
function trim(keep:Set<string>){for(const [k,p] of cache)if(!keep.has(k)){cache.delete(k);void p.then(t=>t.dispose()).catch(()=>undefined);}}

const sheen=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d')!;
 const gr=g.createLinearGradient(0,0,256,256);gr.addColorStop(0,'#ffffff26');gr.addColorStop(.35,'#ffffff06');gr.addColorStop(.6,'#ffffff00');gr.addColorStop(1,'#ffffff0c');
 g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();

export default function GalleryDisplays({items,onOpen}:Props){
 const get=useThree(s=>s.get),invalidate=useThree(s=>s.invalidate);
 const [active,setActive]=useState(false),[index,setIndex]=useState(0);
 const [cur,setCur]=useState<CanvasTexture|null>(null),[prev,setPrev]=useState<CanvasTexture|null>(null);
 const shown=useRef<string[]>([]),curMat=useRef<MeshBasicMaterial>(null),img=useRef<Group>(null),fade=useRef({t0:0,on:false});
 // start loading once the visitor comes to the entrance half; then advance every 7 s while near and visible
 useEffect(()=>{if(active)return;const t=setInterval(()=>{if(near(get().camera.position.z))setActive(true);},700);return()=>clearInterval(t);},[active,get]);
 useEffect(()=>{setIndex(0);if(items.length<2)return;const t=setInterval(()=>{if(!document.hidden&&near(get().camera.position.z))setIndex(v=>(v+1)%items.length);},7000);return()=>clearInterval(t);},[items,get]);
 useEffect(()=>{const it=items[index%Math.max(1,items.length)];if(!active||!it)return;let live=true;
  slide(it).then(t=>{if(!live)return;setPrev(cur);setCur(t);fade.current={t0:performance.now(),on:true};invalidate();
   const next=items[(index+1)%items.length];
   // keep: the slide under the fade (previous), the current one and the next one being prepared
   shown.current=[shown.current.at(-1)||'',keyOf(it)];trim(new Set([...shown.current,next?keyOf(next):'']));if(next)void slide(next);}).catch(()=>undefined);
  return()=>{live=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,items,index]);
 useFrame(()=>{const f=fade.current;if(!f.on||!curMat.current||!img.current)return;
  const p=Math.min(1,(performance.now()-f.t0)/1300),e=p*p*(3-2*p);
  curMat.current.opacity=e;img.current.scale.setScalar(1.025-.025*e);
  if(p<1)invalidate();else f.on=false;});
 if(!items.length)return null;
 const open=(e:any)=>{if(e.delta>8)return;e.stopPropagation();onOpen(index%items.length);};
 const hover=(on:boolean)=>()=>{document.body.style.cursor=on?'pointer':'';};
 const w=S.width,h=S.height;
 return <group position={[S.x,S.y,FACE_Z]} rotation={[0,Math.PI,0]}>
  {/* walnut frame with a gold fillet, like the portrait frames */}
  <mesh position={[0,0,-.012]}><planeGeometry args={[w+.16,h+.16]}/><meshBasicMaterial color="#4a3423" toneMapped={false}/></mesh>
  <mesh position={[0,0,-.010]}><planeGeometry args={[w+.06,h+.06]}/><meshBasicMaterial color="#c9a45e" toneMapped={false}/></mesh>
  <mesh position={[0,0,-.009]}><planeGeometry args={[w+.03,h+.03]}/><meshBasicMaterial color="#081416" toneMapped={false}/></mesh>
  <group onClick={open} onPointerOver={hover(true)} onPointerOut={hover(false)}>
   <mesh position={[0,0,-.008]}><planeGeometry args={[w,h]}/><meshBasicMaterial color={prev||cur?'#ffffff':'#0b1719'} map={prev||cur} toneMapped={false}/></mesh>
   <group ref={img} position={[0,0,-.007]}>
    {cur&&<mesh><planeGeometry args={[w,h]}/><meshBasicMaterial ref={curMat} map={cur} transparent opacity={0} toneMapped={false} depthWrite={false}/></mesh>}
   </group>
  </group>
  {sheen&&<mesh position={[0,0,-.006]}><planeGeometry args={[w,h]}/><meshBasicMaterial map={sheen} transparent depthWrite={false} toneMapped={false}/></mesh>}
 </group>;
}
