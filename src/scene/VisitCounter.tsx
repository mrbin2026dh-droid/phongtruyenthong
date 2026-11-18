// 18/11 (người dùng): bảng điện tử “THAM QUAN” trên mảng tường đá bên trái cửa vào phòng (phía sảnh) — số lượt tham
// quan lấy từ GoatCounter (một con số tổng, không có dữ liệu cá nhân). Web vẽ (không nướng) nên số luôn mới.
// Cần bật trong GoatCounter: Settings → “Allow adding visitor counts on your website”. Chưa bật / mất mạng → hiện “—”.
import {useEffect,useMemo,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,MeshStandardMaterial,AdditiveBlending} from 'three';
import {GOATCOUNTER_CODE} from '../data/analytics';
import {FACADE_Z} from './hallArrival.mjs';
import {PHONE} from './device';

/** Centre of the left facade stone panel (x −2.21 … −4.54), eye height, 3 cm proud of the stone. */
// 18/11 (người dùng: gọn hơn, cân với công tắc): 1,1 × 0,48 m; tâm ở 1,62 m = tâm công tắc bên kia cửa (đối xứng)
// 18/11 (lần 2: “bằng viên gạch”): the stone tiles of the facade are 0,78 m wide (2,33 m panel / 3) → a 0,62 × 0,30 m
// display centred in the middle tile, same centre height as the switch on the other side of the door.
export const COUNTER_PANEL={x:-3.375,y:1.62,z:FACADE_Z+.03,w:.62,h:.30};
export const COUNTER_URL=GOATCOUNTER_CODE?'https://'+GOATCOUNTER_CODE+'.goatcounter.com/counter/TOTAL.json':'';
/** “1,234” / “1 234” / 1234 → 1234 (GoatCounter formats the number with the account's separator). */
export function parseCount(json:any):number|null{const s=String(json?.count??'').replace(/[^0-9]/g,'');return s?Number(s):null;}
export const formatCount=(n:number)=>n.toLocaleString('vi-VN');   // 12.458

const frame=new MeshStandardMaterial({color:'#3a2a1f',roughness:.45,metalness:.1});
const gold=new MeshStandardMaterial({color:'#c9a560',roughness:.32,metalness:.75});

let shadow:CanvasTexture|null=null;
/** blurred rectangle: a soft contact shadow, darker below (as under a wall-hung panel) */
function shadowTex(){if(shadow)return shadow;const c=document.createElement('canvas');c.width=256;c.height=160;const x=c.getContext('2d')!;
 x.filter='blur(12px)';x.fillStyle='#000';x.fillRect(36,30,184,108);shadow=new CanvasTexture(c);return shadow;}
function draw(c:HTMLCanvasElement,value:string){
 const g=c.getContext('2d')!,W=c.width,H=c.height,u=W/1500;
 // black glass with a faint vertical sheen
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0b0f12');bg.addColorStop(1,'#050708');g.fillStyle=bg;g.fillRect(0,0,W,H);
 const sh=g.createLinearGradient(0,0,W,H);sh.addColorStop(0,'rgba(255,255,255,.06)');sh.addColorStop(.35,'rgba(255,255,255,0)');g.fillStyle=sh;g.fillRect(0,0,W,H);
 // title, tracked capitals in gold
 g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e6c98a';g.font=`600 ${Math.round(70*u)}px "Noto Sans",sans-serif`;
 const title='THAM QUAN';(g as any).letterSpacing=Math.round(22*u)+'px';g.fillText(title,W/2+11*u,H*.2);(g as any).letterSpacing='0px';
 // thin gold rule with a diamond
 g.fillStyle='#c9a560';g.fillRect(W*.3,H*.33,W*.16,2*u);g.fillRect(W*.54,H*.33,W*.16,2*u);
 g.save();g.translate(W/2,H*.33);g.rotate(Math.PI/4);g.fillRect(-7*u,-7*u,14*u,14*u);g.restore();
 // LED digits: amber, soft glow, faint “ghost” cells behind (unlit segments of a display)
 const size=Math.round(300*u);g.font=`700 ${size}px "Noto Sans",sans-serif`;g.textBaseline='alphabetic';
 const y=H*.88;g.fillStyle='rgba(255,170,60,.07)';g.fillText(value.replace(/[0-9]/g,'8'),W/2,y);
 g.shadowColor='rgba(255,170,60,.85)';g.shadowBlur=36*u;g.fillStyle='#ffc565';g.fillText(value,W/2,y);
 g.shadowBlur=0;g.fillStyle='#ffe2a6';g.globalAlpha=.55;g.fillText(value,W/2,y-2*u);g.globalAlpha=1;
 // scan lines (LED panel texture)
 g.fillStyle='rgba(0,0,0,.18)';for(let yy=0;yy<H;yy+=Math.max(3,Math.round(5*u)))g.fillRect(0,yy,W,1);
}

export default function VisitCounter(){
 const invalidate=useThree(s=>s.invalidate);
 const [count,setCount]=useState<number|null>(null);
 const P=COUNTER_PANEL;
 const {canvas,tex}=useMemo(()=>{const c=document.createElement('canvas');c.width=PHONE?750:1500;c.height=Math.round(c.width*P.h/P.w);
  draw(c,'—');const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return {canvas:c,tex:t};},[P.h,P.w]);
 useEffect(()=>()=>tex.dispose(),[tex]);
 // read once per visit (the number changes slowly); never blocks or breaks the room
 useEffect(()=>{if(!COUNTER_URL)return;const ctl=new AbortController();
  fetch(COUNTER_URL,{signal:ctl.signal,referrerPolicy:'no-referrer',credentials:'omit'}).then(r=>r.ok?r.json():null).then(j=>{const n=parseCount(j);if(n!==null)setCount(n);}).catch(()=>undefined);
  return()=>ctl.abort();},[]);
 // count up to the number like an airport board (≈1.4 s), then rest — a few frames only
 useEffect(()=>{if(count===null)return;let raf=0;const t0=performance.now(),from=Math.max(0,Math.floor(count*.9));
  const step=()=>{const k=Math.min(1,(performance.now()-t0)/1400),e=1-Math.pow(1-k,3);draw(canvas,formatCount(Math.round(from+(count-from)*e)));tex.needsUpdate=true;invalidate();if(k<1)raf=requestAnimationFrame(step);};
  raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);},[count,canvas,tex,invalidate]);
 return <group position={[P.x,P.y,P.z]}>
  {/* soft contact shadow on the stone (the bake knows nothing of the panel) */}
  <mesh position={[0,-.03,-.028]}><planeGeometry args={[P.w+.3,P.h+.3]}/><meshBasicMaterial map={shadowTex()} color="#000" transparent opacity={.5} depthWrite={false}/></mesh>
  <mesh position={[0,0,-.012]} material={frame}><boxGeometry args={[P.w+.05,P.h+.05,.025]}/></mesh>
  <mesh position={[0,0,.0035]} material={gold}><boxGeometry args={[P.w+.016,P.h+.016,.004]}/></mesh>
  <mesh position={[0,0,.006]}><planeGeometry args={[P.w,P.h]}/><meshBasicMaterial map={tex} toneMapped={false}/></mesh>
  {/* faint amber light the display throws on the stone */}
  <mesh position={[0,0,-.026]}><planeGeometry args={[P.w*1.7,P.h*2]}/><meshBasicMaterial color="#ffb25a" transparent opacity={.05} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
 </group>;
}
