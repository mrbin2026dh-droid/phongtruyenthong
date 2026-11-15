import {useEffect,useRef,useState} from 'react';
import Dialog from './Dialog';
import {composePortrait,protectedPixelsUnchanged} from '../data/portraitStyle.mjs';

/** 15/11 — “Chuẩn hóa trang phục” (admin computer only; loaded lazily from the on-wall editor).
 * Everything runs in this browser: MediaPipe segmentation (model served by the local dev server),
 * then portraitStyle.mjs redraws background + clothing. Face, hair and glasses are copied untouched
 * and verified pixel by pixel. The original file on the computer is never changed. */
type Seg={segment:(img:HTMLCanvasElement)=>any};
let segmenter:Promise<Seg>|null=null;
function loadSegmenter(){
 segmenter??=(async()=>{
  const vision=await import('@mediapipe/tasks-vision');
  const fileset=await vision.FilesetResolver.forVisionTasks('/__local-tools');
  return vision.ImageSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:'/__local-tools/selfie_multiclass_256x256.tflite',delegate:'CPU'},runningMode:'IMAGE',outputCategoryMask:true,outputConfidenceMasks:false}) as unknown as Seg;
 })().catch(err=>{segmenter=null;throw err;});
 return segmenter;
}

type Source={blob:Blob;width:number;height:number};
export type StyledPhoto={blob:Blob;url:string;width:number;height:number;small:boolean};

export default function PortraitStyler({source,onUse,onClose}:{source:Source;onUse:(p:StyledPhoto)=>void;onClose:()=>void}){
 const [attire,setAttire]=useState<'vest'|'recolor'>('recolor'),[gender,setGender]=useState<''|'male'|'female'>('');
 const [background,setBackground]=useState(true),[consent,setConsent]=useState(false);
 const [status,setStatus]=useState('Đang tải công cụ nhận diện (lần đầu khoảng 5–10 giây)…'),[error,setError]=useState('');
 const [original,setOriginal]=useState(''),[result,setResult]=useState(''),[checked,setChecked]=useState(0);
 const data=useRef<{canvas:HTMLCanvasElement;pixels:Uint8ClampedArray;mask:Uint8Array}|null>(null),out=useRef<HTMLCanvasElement|null>(null);

 // 1) decode the photo, 2) segment it once.
 useEffect(()=>{let alive=true;const url=URL.createObjectURL(source.blob);setOriginal(url);
  (async()=>{
   const img=new Image();img.src=url;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(img,0,0);
   const seg=await loadSegmenter();if(!alive)return;
   setStatus('Đang nhận diện khuôn mặt, tóc, áo, nền…');
   const r=seg.segment(canvas),m=r.categoryMask;
   const raw:Uint8Array=m.getAsUint8Array(),mw:number=m.width,mh:number=m.height;
   const w=canvas.width,h=canvas.height,mask=new Uint8Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[y*w+x]=raw[Math.min(mh-1,Math.floor(y*mh/h))*mw+Math.min(mw-1,Math.floor(x*mw/w))];
   r.close?.();
   if(!mask.some(c=>c===3))throw new Error('Không tìm thấy khuôn mặt trong ảnh. Hãy dùng ảnh chân dung chính diện.');
   data.current={canvas,pixels:ctx.getImageData(0,0,w,h).data,mask};
   if(alive)setStatus('');
  })().catch(err=>{if(alive){setStatus('');setError(err instanceof Error?err.message:'Không chạy được công cụ nhận diện.');}});
  return()=>{alive=false;URL.revokeObjectURL(url);};
 },[source.blob]);

 // 3) recompose whenever an option changes.
 useEffect(()=>{
  const d=data.current;if(!d||status||error)return;
  if(attire==='vest'&&!gender){setResult('');return;}
  const {canvas,pixels,mask}=d,w=canvas.width,h=canvas.height;
  const r=composePortrait(pixels,mask,w,h,{attire,gender:gender||undefined,background});
  try{setChecked(protectedPixelsUnchanged(pixels,r.pixels,mask));}catch(err){setError(err instanceof Error?err.message:'Lỗi kiểm tra khuôn mặt.');return;}
  const c=out.current??document.createElement('canvas');out.current=c;c.width=w;c.height=h;
  c.getContext('2d')!.putImageData(new ImageData(r.pixels,w,h),0,0);
  setResult(c.toDataURL('image/jpeg',.9));
 },[attire,gender,background,status,error]);

 async function use(){
  const c=out.current;if(!c)return;
  const blob=await new Promise<Blob>((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('Không nén được ảnh.')),'image/jpeg',.92));
  onUse({blob,url:URL.createObjectURL(blob),width:c.width,height:c.height,small:Math.min(c.width,c.height*2/3)<400});
 }

 return <Dialog title="Chuẩn hóa trang phục" onClose={onClose}>
  <div className="styler">
   <div className="styler-compare">
    <figure><figcaption>Ảnh gốc</figcaption>{original&&<img src={original} alt="Ảnh gốc"/>}</figure>
    <figure><figcaption>Sau chuẩn hóa</figcaption>{result?<img src={result} alt="Ảnh sau chuẩn hóa"/>:<div className="styler-wait">{status||(error?'—':attire==='vest'&&!gender?'Chọn Nam hoặc Nữ để ghép vest':'…')}</div>}</figure>
   </div>
   <fieldset className="styler-options"><legend>Trang phục</legend>
    <label><input type="radio" name="attire" checked={attire==='recolor'} onChange={()=>setAttire('recolor')}/> Đổi màu áo sang xanh than, giữ sơ mi trắng (khuyên dùng — tự nhiên nhất)</label>
    <label><input type="radio" name="attire" checked={attire==='vest'} onChange={()=>setAttire('vest')}/> Ghép vest đồng phục (thử nghiệm — hợp với ảnh mặc áo thun/áo không cổ; kiểm tra kỹ trước khi dùng)</label>
   </fieldset>
   {attire==='vest'&&<fieldset className="styler-options"><legend>Kiểu vest (chọn theo người trong ảnh)</legend>
    <label><input type="radio" name="gender" checked={gender==='male'} onChange={()=>setGender('male')}/> Nam — có cà vạt đỏ đô</label>
    <label><input type="radio" name="gender" checked={gender==='female'} onChange={()=>setGender('female')}/> Nữ — cổ V, không cà vạt</label>
   </fieldset>}
   <label className="styler-check"><input type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/> Thay nền chung (xám xanh nhạt)</label>
   {checked>0&&!error&&<p className="fine">✓ Khuôn mặt, tóc, kính giữ nguyên 100 % ({checked.toLocaleString('vi-VN')} điểm ảnh đã kiểm tra). Ảnh gốc trên máy không bị thay đổi.</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <label className="styler-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Thầy/cô trong ảnh đã đồng ý dùng ảnh chỉnh trang phục.</label>
   <div className="admin-actions"><button type="button" className="gold" disabled={!result||!consent} onClick={()=>void use()}>Dùng ảnh này</button><button type="button" onClick={onClose}>Giữ ảnh gốc</button></div>
   <p className="fine">Tóc dài phủ vai, khăn choàng hoặc ảnh nghiêng có thể bị lem ở viền vai — khi đó hãy giữ ảnh gốc hoặc nhờ chụp lại.</p>
  </div>
 </Dialog>;
}
