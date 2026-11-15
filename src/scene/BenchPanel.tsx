import {useEffect,useRef,useState} from 'react';
import {benchVerdict,QUALITY_CHOICES} from './quality.mjs';
const qLabel=(id:unknown)=>QUALITY_CHOICES.find(c=>c.id===id)?.label||String(id);

export type BenchResult={summary:{frames:number;avgFps:number;low1Fps:number;low5Fps:number;maxFrameMs:number;seconds:number};device:Record<string,unknown>;finishedAt:string};

/** Collects device facts for the report (no personal data: GPU name, screen, memory class, browser). */
export function deviceInfo(extra:Record<string,unknown>={}){
 const nav=navigator as Navigator&{deviceMemory?:number};
 let gpu='không rõ';
 try{const c=document.querySelector('.hall-scene canvas') as HTMLCanvasElement|null;const gl=(c?.getContext('webgl2')||c?.getContext('webgl')) as WebGLRenderingContext|null;
  const ext=gl?.getExtension('WEBGL_debug_renderer_info');gpu=String(ext&&gl?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER)||'không rõ');}catch{/* keep default */}
 return {gpu,screen:`${screen.width}×${screen.height} @${window.devicePixelRatio}`,viewport:`${innerWidth}×${innerHeight}`,
  deviceMemoryGB:nav.deviceMemory??'không rõ',cpuThreads:navigator.hardwareConcurrency??'không rõ',touch:matchMedia('(pointer: coarse)').matches,
  reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,userAgent:navigator.userAgent,...extra};
}

/** On-screen report after ?bench=1, sent to the dev PC (LAN) when possible and copyable otherwise. */
export default function BenchPanel({result,onClose}:{result:BenchResult;onClose:()=>void}){
 const [sent,setSent]=useState<'đang gửi'|'đã lưu trên máy tính'|'không gửi được — hãy chụp màn hình'>('đang gửi');
 const text=JSON.stringify(result,null,1),posted=useRef('');
 // Send once per result (React dev StrictMode runs effects twice).
 useEffect(()=>{if(posted.current===text)return;posted.current=text;fetch('/__local-preview/bench',{method:'POST',headers:{'content-type':'application/json'},body:text})
  .then(r=>setSent(r.ok?'đã lưu trên máy tính':'không gửi được — hãy chụp màn hình')).catch(()=>setSent('không gửi được — hãy chụp màn hình'));},[text]);
 const s=result.summary,d=result.device;
 return <div className="hall-bench" role="dialog" aria-label="Kết quả đo hiệu năng">
  <h2>Kết quả đo trên thiết bị này</h2>
  <p className="hall-bench-verdict">{benchVerdict(s)}</p>
  <dl>
   <div><dt>FPS trung bình</dt><dd>{s.avgFps}</dd></div>
   <div><dt>FPS 5% chậm nhất</dt><dd>{s.low5Fps}</dd></div>
   <div><dt>FPS 1% chậm nhất</dt><dd>{s.low1Fps}</dd></div>
   <div><dt>Khung chậm nhất</dt><dd>{s.maxFrameMs} ms</dd></div>
   <div><dt>Thời gian đo</dt><dd>{s.seconds} s · {s.frames} khung</dd></div>
   <div><dt>Chất lượng cuối</dt><dd>{qLabel(d.qualityLevel)} (chọn: {qLabel(d.qualityChoice)})</dd></div>
   <div><dt>Bản cảnh</dt><dd>{String(d.sceneFile)}</dd></div>
   <div><dt>GPU</dt><dd>{String(d.gpu)}</dd></div>
   <div><dt>Màn hình</dt><dd>{String(d.screen)}</dd></div>
  </dl>
  <p className="hall-bench-status">Kết quả: {sent}.</p>
  <div className="hall-bench-actions"><button onClick={()=>{void navigator.clipboard?.writeText(text);}}>Sao chép kết quả</button><button onClick={onClose}>Đóng</button></div>
 </div>;
}
