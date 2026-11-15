import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS,STYLE,composePortrait,protectedPixelsUnchanged,measure} from '../src/data/portraitStyle.mjs';

// Synthetic 120×180 portrait: green background, brown hair cap, face oval, neck, red sweater.
function sample(){
 const w=120,h=180,rgba=new Uint8ClampedArray(w*h*4),mask=new Uint8Array(w*h);
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,o=i*4;let c=CLASS.background,col=[60,150,70];
  const fx=(x-60)/22,fy=(y-62)/30;
  if(fx*fx+fy*fy<1){c=CLASS.faceSkin;col=[214,170,140];}
  else if(fx*fx+((y-52)/34)**2<1.35&&y<60){c=CLASS.hair;col=[50,35,30];}
  else if(Math.abs(x-60)<11&&y>=90&&y<104){c=CLASS.bodySkin;col=[205,160,130];}
  else if(y>=104&&Math.abs(x-60)<14+(y-104)*1.4){c=CLASS.clothes;col=[180,40,40];}
  if(c===CLASS.faceSkin&&Math.abs(x-50)<3&&Math.abs(y-58)<2)c=CLASS.others;   // glasses on the face
  mask[i]=c;const n=(rnd()-.5)*20;rgba[o]=col[0]+n;rgba[o+1]=col[1]+n;rgba[o+2]=col[2]+n;rgba[o+3]=255;
 }
 return {w,h,rgba,mask};
}

for(const opt of [{attire:'none'},{attire:'recolor'},{attire:'vest',gender:'male'},{attire:'vest',gender:'female'}]){
 test('Face, hair and glasses stay byte-identical — '+JSON.stringify(opt),()=>{
  const {w,h,rgba,mask}=sample(),before=new Uint8ClampedArray(rgba);
  const r=composePortrait(rgba,mask,w,h,opt);
  assert.ok(protectedPixelsUnchanged(before,r.pixels,mask)>2000,'checked the whole face + hair');
  // glasses (class "others" above the neck) untouched as well
  for(let i=0;i<mask.length;i++)if(mask[i]===CLASS.others)for(let k=0;k<4;k++)assert.equal(r.pixels[i*4+k],before[i*4+k]);
  // neck above the neck line untouched
  const g=measure(mask,w,h);for(let y=0;y<=g.neckY;y++)for(let x=0;x<w;x++){const i=y*w+x;if(mask[i]===CLASS.bodySkin)assert.equal(r.pixels[i*4],before[i*4]);}
  assert.deepEqual(rgba,before,'input buffer is not modified');
 });
}

test('Background becomes the house blue-grey; clothes become navy (recolor) or a blazer with shirt and tie (vest)',()=>{
 const {w,h,rgba,mask}=sample();
 const px=(r,x,y)=>Array.from(r.pixels.slice((y*w+x)*4,(y*w+x)*4+3));
 const near=(a,b,t)=>a.every((v,k)=>Math.abs(v-b[k])<=t);
 const plain=composePortrait(rgba,mask,w,h,{attire:'recolor'});
 assert.ok(near(px(plain,4,4),STYLE.bgEdge,40),'background corner replaced');
 const sweater=px(plain,90,170);assert.ok(sweater[2]>sweater[0],'red sweater is now navy: '+sweater);
 const vest=composePortrait(rgba,mask,w,h,{attire:'vest',gender:'male'});
 const g=vest.geometry,shirtY=Math.round(g.neckY+g.torso*.12);
 const centre=px(vest,Math.round(g.neckX),shirtY),side=px(vest,Math.round(g.neckX+g.shoulder*.2),shirtY);
 assert.ok(centre[0]>centre[2]+40,'burgundy tie at the centre: '+centre);
 assert.ok(side[0]>200&&side[2]>190,'ivory shirt inside the V: '+side);
 const body=px(vest,Math.round(g.neckX+g.shoulder*.75),Math.round(g.neckY+g.torso*.7));assert.ok(body[2]>body[0]&&body[0]<90,'navy jacket body: '+body);
 const female=composePortrait(rgba,mask,w,h,{attire:'vest',gender:'female'});
 const fc=px(female,Math.round(g.neckX),shirtY);assert.ok(fc[0]>200,'no tie for the female cut: '+fc);
});

test('The tool is admin-only: served from the dev server for this computer, never in the public build',()=>{
 const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
 assert.ok(vite.includes("{name:'local-admin-tools',apply:'serve',configureServer:localTools}"));
 assert.ok(vite.includes("if(!(a==='::1'||a.startsWith('127.'))||req.method!=='GET')"),'loopback only');
 const editor=readFileSync(new URL('../src/components/AdminSlotEditor.tsx',import.meta.url),'utf8');
 assert.ok(editor.includes("lazy(()=>import('./PortraitStyler'))"),'tool loaded lazily from the admin editor');
});
