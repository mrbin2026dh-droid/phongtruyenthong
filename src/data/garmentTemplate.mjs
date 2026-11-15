// 15/11 — Garment templates (vest / áo dài photos on a ghost mannequin) for the admin photo tool.
// Pure pixel maths (tests/garmentTemplate.test.mjs). The template is fitted to the sitter's neck and shoulders,
// lit to match the face, and drawn ONLY on editable pixels — face, hair and the neck above the collar stay on top.

const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;

/** Alpha of a template: its own transparency if it has some, otherwise flood-fill the flat background from the border. */
export function templateAlpha(rgba,w,h,tol=26){
 const a=new Float32Array(w*h);let transparent=0;
 for(let i=0;i<w*h;i++){a[i]=rgba[i*4+3]/255;if(rgba[i*4+3]<250)transparent++;}
 if(transparent>w*h*.05)return a;
 // background colour = median of the border pixels
 const border=[];for(let x=0;x<w;x++)border.push(x,(h-1)*w+x);for(let y=0;y<h;y++)border.push(y*w,y*w+w-1);
 const ch=k=>border.map(i=>rgba[i*4+k]).sort((p,q)=>p-q)[border.length>>1];
 const bg=[ch(0),ch(1),ch(2)],near=i=>Math.abs(rgba[i*4]-bg[0])+Math.abs(rgba[i*4+1]-bg[1])+Math.abs(rgba[i*4+2]-bg[2])<tol*3;
 a.fill(1);const seen=new Uint8Array(w*h),stack=border.filter(near);stack.forEach(i=>seen[i]=1);
 while(stack.length){const i=stack.pop();a[i]=0;const x=i%w,y=(i-x)/w;
  for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!seen[j]&&near(j)){seen[j]=1;stack.push(j);}}
 // 1 px soft edge
 const out=new Float32Array(a);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;out[i]=(a[i]*4+a[i-1]+a[i+1]+a[i-w]+a[i+w])/8;}
 return out;
}

/** Collar opening (centre, top row, half-width) and shoulder half-width of a template. */
export function analyzeTemplate(rgba,w,h){
 const alpha=templateAlpha(rgba,w,h),on=(x,y)=>alpha[y*w+x]>.5;
 let top=-1;for(let y=0;y<h&&top<0;y++)for(let x=0;x<w;x++)if(on(x,y)){top=y;break;}
 if(top<0)throw new Error('Mẫu áo không có nội dung.');
 // the neck opening: first row (from the top) where the garment exists on both sides of a gap at the centre
 const cx=Math.round(w/2);let neckY=-1,neckX=cx,neckHalf=w*.08;
 for(let y=top;y<h*.6&&neckY<0;y++){
  if(on(cx,y))continue;let l=cx,r=cx;while(l>0&&!on(l,y))l--;while(r<w-1&&!on(r,y))r++;
  if(l>0&&r<w-1&&r-l<w*.6){neckY=y;neckX=(l+r)/2;neckHalf=(r-l)/2;}
 }
 // Ghost-mannequin photos show the inside back of the collar instead of a hole: the collar top is then the
 // highest garment row at the centre, and its width a little below is the neck width. (15/11 AI templates)
 let ghost=false;
 // a tiny gap (between two collar points) is not a neck opening
 if(neckY>=0&&neckHalf<w*.05)neckY=-1;
 if(neckY<0){ghost=true;let y0=top;while(y0<h&&!on(cx,y0))y0++;neckY=y0;const yr=Math.min(h-1,y0+Math.round(h*.03));let a0=cx,b0=cx;while(a0>0&&on(a0-1,yr))a0--;while(b0<w-1&&on(b0+1,yr))b0++;neckX=(a0+b0)/2;neckHalf=Math.max(w*.04,(b0-a0)/2);}
 const row=Math.min(h-1,Math.round(neckY+(h-neckY)*.35));let l=-1,r=-1;
 for(let x=0;x<w;x++)if(on(x,row)){if(l<0)l=x;r=x;}
 // average brightness of the garment near the collar: used to match the face lighting
 let s=0,n=0;for(let y=neckY;y<Math.min(h,neckY+(h-neckY)*.4);y++)for(let x=0;x<w;x++){const i=y*w+x;if(alpha[i]>.9){s+=lum(rgba[i*4],rgba[i*4+1],rgba[i*4+2]);n++;}}
 // Collar opening (inside the garment, below the collar top): filled later with the sitter's own neck tone.
 const hole=new Uint8Array(w*h);
 // Ghost mannequin: above the front edge of the collar we see the INSIDE back of the collar. The sitter's neck
 // must show there (in front of it), while the front collar band stays in front of the neck. Find the front edge
 // on the centre column (first clear brightness change below the collar top) and mark a U-shaped window:
 // full neck width at the collar top, dipping to the front edge at the centre (the front collar curves round the neck).
 if(ghost){
  const c0=Math.round(neckX),L=y=>lum(rgba[(y*w+c0)*4],rgba[(y*w+c0)*4+1],rgba[(y*w+c0)*4+2]);
  let base=0,k=0;for(let y=neckY+2;y<neckY+12&&y<h;y++){base+=L(y);k++;}base/=Math.max(1,k);
  let front=-1;for(let y=neckY+12;y<Math.min(h-3,neckY+h*.2)&&front<0;y++)if(Math.abs(L(y)-base)>22&&Math.abs(L(y+1)-base)>22&&Math.abs(L(y+2)-base)>22)front=y;
  if(front<0)front=Math.round(neckY+neckHalf*.6);
  const dh=Math.max(1,front-neckY);
  for(let y=neckY;y<front;y++)for(let x=Math.max(0,Math.floor(neckX-neckHalf));x<=Math.min(w-1,neckX+neckHalf);x++){const ex=(x-neckX)/neckHalf;if((y-neckY)/dh<1-ex*ex)hole[y*w+x]=1;}
 }
 if(!ghost)for(let y=neckY;y<h;y++){const c0=Math.round(neckX);if(on(c0,y))continue;let a0=c0,b0=c0;while(a0>0&&!on(a0,y))a0--;while(b0<w-1&&!on(b0,y))b0++;if(a0>0&&b0<w-1&&b0-a0<w*.6)for(let x=a0+1;x<b0;x++)hole[y*w+x]=1;}
 return {w,h,alpha,hole,ghost,neckX,neckY,neckHalf,shoulderHalf:r>l?(r-l)/2:w*.45,meanL:n?s/n:128};
}

/** Scale + offset placing the template collar on the sitter's neck. */
export function fitTemplate(tpl,geo){
 // Shoulders set the size (a garment is chosen to fit the body); the collar opening must still be at least
 // as wide as the neck, otherwise the size grows (max +15 %). 15/11: neck-only sizing blew a template up 4×.
 const byShoulder=geo.shoulder/tpl.shoulderHalf,neck=geo.neckHalf||geo.shoulder*.3;
 const s=Math.min(byShoulder*1.15,Math.max(byShoulder,neck*.6/tpl.neckHalf));
 // collar sits up the neck: a ghost-mannequin collar top (back of the collar) rises higher behind the neck
 const collarY=geo.neckY-(geo.neckHalf||20)*(tpl.ghost?.55:.35);
 return {s,ox:geo.neckX-tpl.neckX*s,oy:collarY-tpl.neckY*s};
}

/** Bilinear template sample at output pixel (x,y): [r,g,b,a] in 0..255 / 0..1. Rows below the template repeat its last row. */
export function sampleTemplate(trgba,tpl,fit,x,y){
 let tx=(x-fit.ox)/fit.s,ty=(y-fit.oy)/fit.s;
 if(tx<0||tx>tpl.w-1||ty<0)return null;if(ty>tpl.h-1)ty=tpl.h-1;
 const hole=tpl.hole?tpl.hole[Math.round(ty)*tpl.w+Math.round(tx)]:0;
 if(hole&&tpl.ghost)return [0,0,0,0,1];   // neck window: the sitter's neck shows here
 const x0=Math.floor(tx),y0=Math.floor(ty),x1=Math.min(tpl.w-1,x0+1),y1=Math.min(tpl.h-1,y0+1),fx=tx-x0,fy=ty-y0;
 const px=(i,k)=>trgba[i*4+k],i00=y0*tpl.w+x0,i10=y0*tpl.w+x1,i01=y1*tpl.w+x0,i11=y1*tpl.w+x1;
 const mix=(a,b,c,d)=>(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
 const a=mix(tpl.alpha[i00],tpl.alpha[i10],tpl.alpha[i01],tpl.alpha[i11]);if(a<=.002)return hole?[0,0,0,0,1]:null;
 return [mix(px(i00,0),px(i10,0),px(i01,0),px(i11,0)),mix(px(i00,1),px(i10,1),px(i01,1),px(i11,1)),mix(px(i00,2),px(i10,2),px(i01,2),px(i11,2)),a,hole];
}
