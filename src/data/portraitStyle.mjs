// 15/11 — Admin photo tool: uniform attire + background for teacher portraits (pure pixel maths; tests/portraitStyle.test.mjs).
//
// Input: RGBA pixels + a per-pixel class mask from MediaPipe "selfie_multiclass_256x256":
//   0 background, 1 hair, 2 body skin (neck/chest/hands), 3 face skin, 4 clothes, 5 others (glasses, accessories).
// HARD RULE: face skin, hair and accessories on the head are NEVER modified — those pixels are copied verbatim
// (checked by `protectedPixelsUnchanged`). Only background and clothing (and bare chest below the neck line,
// when a jacket is added) are redrawn.

import {fitTemplate,sampleTemplate} from './garmentTemplate.mjs';

export const CLASS={background:0,hair:1,bodySkin:2,faceSkin:3,clothes:4,others:5};

/** House style chosen for the room (walnut/oak, cream walls, brass frames, deep teal panels). */
export const STYLE={
 jacket:[31,42,58],      // #1f2a3a  deep navy
 lapelEdge:[20,28,40],
 shirt:[241,236,226],    // ivory, not stark white
 tie:[122,36,48],        // #7a2430  burgundy
 tieStripe:[150,58,68],
 button:[18,22,30],
 bgCenter:[226,232,233], // light blue-grey, lighter at the centre
 bgEdge:[184,196,199],
};

const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const clamp=v=>v<0?0:v>255?255:v;

/** Geometry of the sitter, measured from the mask. */
export function measure(mask,w,h){
 let faceBottom=-1,faceTop=h,minX=w,maxX=-1,cx=0,n=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=mask[y*w+x];if(c===CLASS.faceSkin){faceBottom=Math.max(faceBottom,y);faceTop=Math.min(faceTop,y);cx+=x;n++;}}
 const neckX=n?cx/n:w/2;
 // Collar line: where the garment starts on BOTH SIDES of the neck. (15/11 real photo: an open white shirt +
 // tie is labelled as skin, so the lowest skin row would be the bottom of the V — far too low.)
 const yN=Math.min(h-1,Math.max(0,faceBottom)+3);let l=-1,rr=-1;
 for(let x=0;x<w;x++)if(mask[yN*w+x]===CLASS.bodySkin){if(l<0)l=x;rr=x;}
 const neckHalf=rr>l?(rr-l)/2:w*.08,cxN=rr>l?(l+rr)/2:neckX;
 const ys=[];for(const sx of [-1,1]){const x=Math.round(cxN+sx*neckHalf*1.3);if(x<0||x>=w)continue;for(let y=Math.max(0,faceBottom);y<h;y++)if(mask[y*w+x]===CLASS.clothes){ys.push(y);break;}}
 let neckY=ys.length?Math.round(ys.reduce((p,v)=>p+v,0)/ys.length):-1;
 if(neckY<0)neckY=Math.min(h-1,faceBottom+Math.round(h*.05));
 // Shoulder half-width: widest clothes span in the upper torso.
 const row=Math.min(h-1,neckY+Math.round((h-neckY)*.35));
 for(let x=0;x<w;x++)if(mask[row*w+x]===CLASS.clothes||mask[row*w+x]===CLASS.bodySkin){minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
 const shoulder=maxX>=minX?(maxX-minX)/2:w*.35;
 return {faceFound:n>0,faceTop,faceBottom,neckX:cxN,neckY,neckHalf,shoulder,torso:h-neckY};
}

/** Which pixels may be redrawn. Head pixels (face skin, hair, anything above the neck line except background) never. */
export function editable(mask,w,h,geo,{attire,ghost=false}){
 const out=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,c=mask[i];
  if(c===CLASS.faceSkin||c===CLASS.hair)continue;
  if(c===CLASS.background){out[i]=1;continue;}
  // garment: any clothes pixel from mid-face down (a ruffled or high collar can rise above the chin — 15/11 real photo)
  if(c===CLASS.clothes){if(y>geo.faceTop+(geo.faceBottom-geo.faceTop)*.6)out[i]=attire==='none'?0:1;continue;}
  if(y<=geo.neckY)continue;                         // neck skin / accessories around the head stay as they are
  if(c===CLASS.others)out[i]=attire==='none'?0:1;
  else if(c===CLASS.bodySkin&&(attire==='vest'||attire==='template')){
   // curved shirt collar: dips at the front of the neck, rises at the sides (no straight cut)
   const k=Math.max(0,1-Math.abs(x-geo.neckX)/Math.max(1,geo.neckHalf||geo.shoulder*.4));
   // with a ghost-mannequin template the neck stays in front of the inside of the collar
   // ghost template: the collar window decides where the neck shows, so all lower neck skin may be covered
   const keep=ghost?geo.neckY:geo.neckY+geo.torso*(.015+.075*k*k);
   if(y>keep)out[i]=1;
  }
 }
 return out;
}

function blur(src,w,h,r){
 const tmp=new Float32Array(w*h),out=new Float32Array(w*h);const k=2*r+1;
 for(let y=0;y<h;y++){let s=0;for(let x=-r;x<=r;x++)s+=src[y*w+Math.min(w-1,Math.max(0,x))];for(let x=0;x<w;x++){tmp[y*w+x]=s/k;s+=src[y*w+Math.min(w-1,x+r+1)]-src[y*w+Math.max(0,x-r)];}}
 for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=tmp[Math.min(h-1,Math.max(0,y))*w+x];for(let y=0;y<h;y++){out[y*w+x]=s/k;s+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
 return out;
}

/** Blazer + shirt + (tie) colour at a pixel, given the measured geometry. Returns [r,g,b] or null (= jacket body). */
function attireAt(x,y,geo,{gender}){
 const {neckX,neckY,shoulder,torso}=geo,dy=(y-neckY)/torso,dx=Math.abs(x-neckX)/shoulder;
 // V opening (fractions of the shoulder half-width), never narrower than the neck — otherwise the jacket cuts the neck.
 const vDepth=gender==='female'?.42:.55,vTop=Math.max(gender==='female'?.30:.27,(geo.neckHalf||0)*1.2/shoulder);
 const v=dy<vDepth?vTop*(1-dy/vDepth):0;
 if(dx<v){
  if(gender==='male'){
   const knot=dy<.06,tieW=knot?.075:.06+.05*Math.min(1,dy/vDepth);
   if(dx<tieW){const stripe=((x-neckX)*.6+y)%(torso*.06)<torso*.012;return stripe&&!knot?STYLE.tieStripe:STYLE.tie;}
  }
  // shirt with a soft collar shadow next to the lapels
  const s=dx>v-.03?.86:1;return STYLE.shirt.map(c=>c*s);
 }
 if(dx<v+.14&&dy<vDepth+.05){const edge=dx<v+.012;return edge?STYLE.lapelEdge:null;}   // lapel (same cloth, crisp edge)
 if(Math.abs(dx)<.03&&dy>vDepth+.04&&dy<vDepth+.30&&(dy-vDepth-.04)%.13<.035)return STYLE.button;
 return null;
}

/**
 * Compose the styled portrait.
 * @param {Uint8ClampedArray} rgba source pixels (w*h*4)
 * @param {Uint8Array} mask class per pixel (w*h)
 * @param {{attire:'none'|'recolor'|'vest'|'template',gender?:'male'|'female',background?:boolean,template?:{rgba:Uint8ClampedArray,info:any}}} opt
 */
export function composePortrait(rgba,mask,w,h,opt){
 const geo=measure(mask,w,h),attire=opt.attire||'none',bg=opt.background!==false;
 const ed=editable(mask,w,h,geo,{attire,ghost:Boolean(attire==='template'&&opt.template?.info?.ghost)});
 if(!bg)for(let i=0;i<w*h;i++)if(mask[i]===CLASS.background)ed[i]=0;
 // Soft edges only towards editable pixels; protected pixels keep alpha 0 (copied exactly).
 const soft=blur(Float32Array.from(ed),w,h,2);
 const clothesSoft=blur(Float32Array.from(mask,(c,i)=>(c===CLASS.clothes||c===CLASS.others||(attire==='vest'&&c===CLASS.bodySkin&&ed[i]))?1:0),w,h,2);
 let sum=0,cnt=0,dark=0;for(let i=0;i<w*h;i++)if(mask[i]===CLASS.clothes){const L=lum(rgba[i*4],rgba[i*4+1],rgba[i*4+2]);sum+=L;cnt++;if(L<90)dark++;}
 // Keep a white shirt only when it is worn under a dark jacket (jacket + shirt). A single light garment (blouse,
 // white shirt alone) is recoloured as a whole — otherwise its bright fabric highlights stay as white speckles.
 const jacketAndShirt=cnt>0&&dark/cnt>.3;
 const meanL=cnt?sum/cnt:128;
 const out=new Uint8ClampedArray(rgba);
 // Template mode: fit the garment photo to the neck/shoulders and light it like the face.
 const T=attire==='template'&&opt.template?opt.template:null,fit=T?fitTemplate(T.info,geo):null;
 let fs=0,fn=0;if(T)for(let i=0;i<w*h;i++)if(mask[i]===CLASS.faceSkin){fs+=lum(rgba[i*4],rgba[i*4+1],rgba[i*4+2]);fn++;}
 const expo=T?Math.max(.82,Math.min(1.12,(fn?fs/fn:185)/185)):1;
 const shadowLen=(geo.neckHalf||geo.shoulder*.35)*.9;
 // the sitter's neck tone (mean of neck skin just under the chin), used inside the template's collar opening
 let nk=[0,0,0],nn=0;if(T)for(let y=geo.faceBottom;y<Math.min(h,geo.faceBottom+shadowLen);y++)for(let x=0;x<w;x++){const i=y*w+x;if(mask[i]===CLASS.bodySkin){nk[0]+=rgba[i*4];nk[1]+=rgba[i*4+1];nk[2]+=rgba[i*4+2];nn++;}}
 const neckTone=nn?nk.map(v=>v/nn):[200,160,135];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;if(!ed[i])continue;
  const a=Math.min(1,soft[i]*1.6);if(a<=0)continue;
  const o=i*4,r=rgba[o],g=rgba[o+1],b=rgba[o+2];
  // background: radial light blue-grey, lighter behind the head
  const dxn=(x-geo.neckX)/w,dyn=(y-geo.neckY*.6)/h,t=Math.min(1,Math.sqrt(dxn*dxn*1.4+dyn*dyn)*1.6);
  const bgc=STYLE.bgCenter.map((c,k)=>c+(STYLE.bgEdge[k]-c)*t);
  if(T){
   // base = background, or the sitter's own neck skin inside the collar opening
   const t=sampleTemplate(T.rgba,T.info,fit,x,y);
   // only inside the sitter's own neck width — wider openings show the background, never a flat skin block
   const inHole=t&&t[4]&&Math.abs(x-geo.neckX)<(geo.neckHalf||40)*1.05,deep=Math.min(1,Math.max(0,(y-geo.neckY)/((geo.neckHalf||40)*2)));
   const base=mask[i]===CLASS.bodySkin?[r,g,b]:inHole?neckTone.map(v=>v*(1-.35*deep)):bgc;
   let nr=base[0],ng=base[1],nb=base[2];
   if(t){const dy=y-geo.faceBottom,near=Math.abs(x-geo.neckX)<(geo.neckHalf||40)*1.8;
    const sh=near&&dy>0&&dy<shadowLen?1-.24*(1-dy/shadowLen):1;           // soft shadow under the chin
    const k=expo*sh;nr+=(t[0]*k-nr)*t[3];ng+=(t[1]*k-ng)*t[3];nb+=(t[2]*k-nb)*t[3];}
   out[o]=clamp(r+(nr-r)*a);out[o+1]=clamp(g+(ng-g)*a);out[o+2]=clamp(b+(nb-b)*a);continue;
  }
  let cloth=bgc;
  if(attire!=='none'){
   // keep the original folds/shading of the garment, at gentle contrast
   const shade=Math.max(.55,Math.min(1.35,1+(lum(r,g,b)/meanL-1)*(attire==='vest'?.18:.6)));
   const special=attire==='vest'?attireAt(x,y,geo,opt):null;
   // 'recolor' keeps a white/ivory shirt white: only the outer garment changes colour.
   const mx=Math.max(r,g,b),mn=Math.min(r,g,b),shirtLike=attire==='recolor'&&jacketAndShirt&&lum(r,g,b)>165&&mx-mn<38;
   cloth=shirtLike?STYLE.shirt.map(c=>c*Math.min(1.04,lum(r,g,b)/225)):(special||STYLE.jacket).map(c=>c*(special===STYLE.button?1:shade));
  }
  const cw=attire==='none'?0:Math.min(1,clothesSoft[i]*1.15);
  const nr=bgc[0]+(cloth[0]-bgc[0])*cw,ng=bgc[1]+(cloth[1]-bgc[1])*cw,nb=bgc[2]+(cloth[2]-bgc[2])*cw;
  out[o]=clamp(r+(nr-r)*a);out[o+1]=clamp(g+(ng-g)*a);out[o+2]=clamp(b+(nb-b)*a);
 }
 return {pixels:out,geometry:geo,changed:ed.reduce((s,v)=>s+v,0)};
}

/** Verifies the hard rule: every face-skin / hair pixel is byte-identical. Returns the number checked (throws if any differs). */
export function protectedPixelsUnchanged(before,after,mask){
 let n=0;
 for(let i=0;i<mask.length;i++){const c=mask[i];if(c!==CLASS.faceSkin&&c!==CLASS.hair)continue;n++;
  const o=i*4;if(before[o]!==after[o]||before[o+1]!==after[o+1]||before[o+2]!==after[o+2]||before[o+3]!==after[o+3])throw new Error('Khuôn mặt bị thay đổi tại điểm ảnh '+i);}
 return n;
}
