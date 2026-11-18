// 18/11 (người dùng): điểm góp ý 3D ở sảnh — bục hiện đại (gỗ óc chó, mặt kính đen viền đồng, đèn hắt dưới mặt bục,
// chân lùi tạo cảm giác nổi), huy hiệu tròn xanh ngọc viền đồng với biểu tượng bong bóng trò chuyện ba chấm (mẫu 3,
// thay biểu tượng theo ảnh người dùng gửi). KHÔNG có chữ trong 3D. Chạm bục → mở Zalo của nhà trường.
// Vẽ trên web (không nướng): bóng đổ là một lớp mờ dưới chân; vòng sáng chỉ “thở” khi người xem đang ở sảnh.
import {useEffect,useMemo,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import {AdditiveBlending,CanvasTexture,MeshBasicMaterial,MeshStandardMaterial,SRGBColorSpace} from 'three';
import {FEEDBACK_LECTERN} from './hallLayout.mjs';
import {PHONE} from './device';

export const FEEDBACK_URL='https://zalo.me/0818810007';
/** pulse of the medallion's glow (s, emissive range) — the same calm breathing as the door switch */
export const FEEDBACK_PULSE={period:2.2,low:.35,high:1};

function medallionTexture(){
 const N=PHONE?512:1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d')!,u=N/200;
 g.fillStyle='#17383e';g.beginPath();g.arc(N/2,N/2,N/2,0,Math.PI*2);g.fill();
 g.strokeStyle='#c9a560';g.lineWidth=6*u;g.beginPath();g.arc(N/2,N/2,N/2-6*u,0,Math.PI*2);g.stroke();
 g.lineWidth=1.6*u;g.beginPath();g.arc(N/2,N/2,N/2-15*u,0,Math.PI*2);g.stroke();
 // speech bubble: rounded square, tail at the lower left, three dots (the user's picture)
 const x0=56*u,y0=54*u,w=88*u,h=72*u,r=16*u;g.strokeStyle='#e6c98a';g.lineWidth=8*u;g.lineJoin='round';g.lineCap='round';
 g.beginPath();g.moveTo(x0+r,y0);g.lineTo(x0+w-r,y0);g.quadraticCurveTo(x0+w,y0,x0+w,y0+r);g.lineTo(x0+w,y0+h-r);g.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);
 g.lineTo(x0+34*u,y0+h);g.lineTo(x0+12*u,y0+h+20*u);g.lineTo(x0+14*u,y0+h);g.lineTo(x0+r,y0+h);g.quadraticCurveTo(x0,y0+h,x0,y0+h-r);g.lineTo(x0,y0+r);g.quadraticCurveTo(x0,y0,x0+r,y0);g.closePath();g.stroke();
 g.fillStyle='#e6c98a';for(const dx of [-24,0,24]){g.beginPath();g.arc(N/2+dx*u,y0+h/2,7*u,0,Math.PI*2);g.fill();}
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}
let shadowMap:CanvasTexture|null=null;
function shadowTex(){if(shadowMap)return shadowMap;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;
 const r=x.createRadialGradient(64,64,8,64,64,62);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(0,0,128,128);
 return shadowMap=new CanvasTexture(c);}

export default function FeedbackLectern(){
 const invalidate=useThree(s=>s.invalidate),get=useThree(s=>s.get);
 const L=FEEDBACK_LECTERN;
 const m=useMemo(()=>{const icon=medallionTexture();return {icon,
  walnut:new MeshStandardMaterial({color:'#5b3b2a',roughness:.42,metalness:.05}),
  dark:new MeshStandardMaterial({color:'#2a1d16',roughness:.6}),
  brass:new MeshStandardMaterial({color:'#c9a560',roughness:.28,metalness:.85}),
  glass:new MeshStandardMaterial({color:'#101a1d',roughness:.08,metalness:.5,envMapIntensity:1.2}),
  face:new MeshStandardMaterial({map:icon,emissive:'#ffffff',emissiveMap:icon,emissiveIntensity:.45,roughness:.3,metalness:.15}),
  led:new MeshBasicMaterial({color:'#ffcf86',toneMapped:false}),
  halo:new MeshBasicMaterial({color:'#ffc46a',transparent:true,opacity:.05,blending:AdditiveBlending,depthWrite:false,toneMapped:false}),
  shadow:new MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.9})};},[]);
 useEffect(()=>()=>{for(const v of Object.values(m))(v as any).dispose?.();},[m]);
 // breathe only while the visitor is in the foyer (~30 fps there, nothing elsewhere)
 const raf=useRef(0);
 useEffect(()=>{let last=0;const t0=performance.now();
  const tick=(now:number)=>{raf.current=requestAnimationFrame(tick);if(now-last<33)return;last=now;
   if(get().camera.position.z<8.6)return;
   const k=.5-.5*Math.cos((now-t0)/1000*2*Math.PI/FEEDBACK_PULSE.period);
   m.face.emissiveIntensity=FEEDBACK_PULSE.low+(FEEDBACK_PULSE.high-FEEDBACK_PULSE.low)*k;m.halo.opacity=.03+.10*k;invalidate();};
  raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current);},[m,get,invalidate]);
 const open=(e:any)=>{e.stopPropagation();try{window.open(FEEDBACK_URL,'_blank','noopener,noreferrer');}catch{location.href=FEEDBACK_URL;}};
 const over=()=>{document.body.style.cursor='pointer';},out=()=>{document.body.style.cursor='';};
 const tilt=.30;   // reading surface slopes down towards the visitor (~17°)
 return <group position={[L.x,0,L.z]} rotation={[0,L.yaw,0]}>
  {/* contact shadow on the baked floor */}
  <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]} material={m.shadow}><planeGeometry args={[1.0,.8]}/></mesh>
  <group onClick={open} onPointerOver={over} onPointerOut={out}>
   {/* recessed plinth: the body seems to float 6 cm above the floor */}
   <mesh position={[0,.03,0]} material={m.dark}><boxGeometry args={[.34,.06,.22]}/></mesh>
   {/* walnut body, slim; brass seams at the top and bottom */}
   <mesh position={[0,.53,0]} material={m.walnut}><boxGeometry args={[.46,.94,.30]}/></mesh>
   <mesh position={[0,.07,0]} material={m.brass}><boxGeometry args={[.465,.012,.305]}/></mesh>
   <mesh position={[0,.985,0]} material={m.brass}><boxGeometry args={[.465,.012,.305]}/></mesh>
   {/* vertical brass inlay running down the front, interrupted by the medallion */}
   <mesh position={[0,.24,.151]} material={m.brass}><boxGeometry args={[.012,.30,.004]}/></mesh>
   <mesh position={[0,.86,.151]} material={m.brass}><boxGeometry args={[.012,.16,.004]}/></mesh>
   {/* medallion: brass rim + icon face + breathing halo */}
   <mesh position={[0,.60,.156]} rotation={[Math.PI/2,0,0]} material={m.brass}><cylinderGeometry args={[.135,.135,.014,48]}/></mesh>
   <mesh position={[0,.60,.1645]} material={m.face}><circleGeometry args={[.122,48]}/></mesh>
   <mesh position={[0,.60,.152]} material={m.halo}><ringGeometry args={[.135,.19,48]}/></mesh>
   {/* reading top: black glass with a brass edge, tilted towards the visitor, warm LED line under its front lip */}
   <group position={[0,1.04,.02]} rotation={[tilt,0,0]}>
    <mesh material={m.walnut}><boxGeometry args={[.60,.03,.44]}/></mesh>
    <mesh position={[0,0,.2205]} material={m.brass}><boxGeometry args={[.602,.032,.004]}/></mesh>
    <mesh position={[0,.016,0]} material={m.glass}><boxGeometry args={[.56,.004,.40]}/></mesh>
    <mesh position={[0,.0185,0]} rotation={[-Math.PI/2,0,0]} material={m.face}><circleGeometry args={[.07,40]}/></mesh>
    <mesh position={[0,-.017,.205]} material={m.led}><boxGeometry args={[.5,.004,.006]}/></mesh>
   </group>
  </group>
 </group>;
}
