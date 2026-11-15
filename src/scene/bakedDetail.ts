// 15/11 (b) "Mức 2": crisp surface detail on top of the baked light.
// The Cycles lightmaps carry colour + light at about 1 px per cm, which looks soft up close.
// Here every baked surface gets a world-space (triplanar) detail layer drawn by the GPU at screen
// resolution: fine plaster grain, stone grain, and — for the oak cladding — the 4 cm slats with dark
// 1.5 cm gaps. The slats are baked as flat oak, so the stripes come only from here and stay sharp.
// Each pattern averages to 1.0, so the baked brightness and colour are preserved.
import {PROBE_GLSL,PROBE_UNIFORMS} from './probeShared.mjs';
import {CanvasTexture,LinearMipmapLinearFilter,MeshBasicMaterial,RepeatWrapping,type Texture} from 'three';

export type DetailKind='plaster'|'ceiling'|'stone'|'slats'|'none';

/** Which detail goes on which baked block (mesh names come from bake_hall_v3.py: baked-<group>). */
export function detailFor(meshName:string):DetailKind{
 const n=meshName.toLowerCase();
 if(n.includes('slats'))return 'slats';
 if(n.includes('floor'))return 'stone';
 if(n.includes('ceiling'))return 'ceiling';
 if(n.includes('walls')||n.includes('foyer'))return 'plaster';
 return 'none';
}

let noise:Texture|null=null;
/** Tileable multi-octave value noise, 512 px, mean 0.5 (drawn once, shared). */
function noiseTexture(){
 if(noise)return noise;
 const N=512,out=new Float32Array(N*N);
 let s=91131;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(const [cell,amp] of [[64,.5],[16,.3],[4,.2]] as const){
  const g=N/cell,grid=new Float32Array(g*g).map(()=>rnd());
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const fx=x/cell,fy=y/cell,x0=Math.floor(fx)%g,y0=Math.floor(fy)%g,x1=(x0+1)%g,y1=(y0+1)%g;
   const tx=fx-Math.floor(fx),ty=fy-Math.floor(fy),sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
   const v=(grid[y0*g+x0]*(1-sx)+grid[y0*g+x1]*sx)*(1-sy)+(grid[y1*g+x0]*(1-sx)+grid[y1*g+x1]*sx)*sy;
   out[y*N+x]+=v*amp;
  }
 }
 const c=document.createElement('canvas');c.width=c.height=N;const ctx=c.getContext('2d')!;const img=ctx.createImageData(N,N);
 for(let i=0;i<N*N;i++){const v=Math.round(Math.max(0,Math.min(1,out[i]))*255);img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v;img.data[i*4+3]=255;}
 ctx.putImageData(img,0,0);
 const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.minFilter=LinearMipmapLinearFilter;t.anisotropy=8;
 noise=t;return t;
}

const PARAMS:Record<Exclude<DetailKind,'none'>,{scale:number;amp:number}>={
 plaster:{scale:.9,amp:.07},   // ~0.9 m tile, ±7 %: trowelled plaster
 ceiling:{scale:1.8,amp:.025}, // 15/11: the ceiling read as sand at ±7 % — very soft here
 stone:{scale:1.6,amp:.06},    // floor stone grain
 slats:{scale:.35,amp:.10},    // wood grain along the slats
};

/** Adds the detail layer to a baked MeshBasicMaterial (lightmap in `map`). */
export function applyBakedDetail(material:MeshBasicMaterial,kind:DetailKind){
 if(kind==='none')return;
 const p=PARAMS[kind],tex=noiseTexture();
 material.onBeforeCompile=shader=>{
  if(kind==='stone')Object.assign(shader.uniforms,PROBE_UNIFORMS);
  shader.uniforms.uDetail={value:tex};shader.uniforms.uScale={value:1/p.scale};shader.uniforms.uAmp={value:p.amp};
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nvarying vec3 vDWorld;')
   .replace('#include <project_vertex>','#include <project_vertex>\nvDWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>',`#include <common>
varying vec3 vDWorld;uniform sampler2D uDetail;uniform float uScale;uniform float uAmp;
${kind==='stone'?PROBE_GLSL:''}
float triNoise(vec3 p,vec3 n,vec2 stretch){
 vec3 w=pow(abs(n),vec3(4.0));w/=(w.x+w.y+w.z+1e-5);
 float a=texture2D(uDetail,p.zy*stretch*uScale).r,b=texture2D(uDetail,p.xz*uScale).r,c=texture2D(uDetail,p.xy*stretch*uScale).r;
 return a*w.x+b*w.y+c*w.z;
}`)
   .replace('#include <map_fragment>',`#include <map_fragment>
// The baked GLB carries no normals (normal = 0 gave NaN = black, 15/11): face normal from screen derivatives.
vec3 vDNormal=normalize(cross(dFdx(vDWorld),dFdy(vDWorld)));
${kind==='slats'?`{
 // 4 cm oak slats + 1.5 cm dark gaps (period 5.5 cm) running vertically; across-axis = the wall's horizontal axis.
 float u=(abs(vDNormal.x)>0.5?vDWorld.z:vDWorld.x)/0.055;
 float f=fract(u),w=clamp(fwidth(u),0.0001,1.0);
 float oak=smoothstep(0.27-w,0.27+w,f)*(1.0-smoothstep(1.0-w,1.0,f));
 float stripe=mix(0.37,1.233,oak);                       // 0.27*0.37 + 0.73*1.233 = 1.0
 stripe=mix(stripe,1.0,clamp(w*2.0-0.6,0.0,1.0));        // far away: fade to the average (no moiré)
 float grain=triNoise(vDWorld,vDNormal,vec2(6.0,0.25));   // long grain along the slat
 diffuseColor.rgb*=stripe*(1.0+(grain-0.5)*2.0*uAmp*oak);
}`:`diffuseColor.rgb*=1.0+(triNoise(vDWorld,vDNormal,vec2(1.0))-0.5)*2.0*uAmp;`}
${kind==='stone'?`// polished stone: box-projected reflection of the real room, Schlick fresnel (stronger at grazing angles)
if(uReflect>0.5&&abs(vDNormal.y)>0.7){   // derivative normal sign depends on the view: use |y|
 vec3 V=normalize(vDWorld-cameraPosition),N=vec3(0.0,1.0,0.0),R=reflect(V,N);
 float F=fresnel(V,N,0.03);
 diffuseColor.rgb=mix(diffuseColor.rgb,probeReflect(vDWorld,R,1.6),clamp(F*0.85,0.0,0.45));
}`:''}`);
 };
 material.customProgramCacheKey=()=>'baked-detail-'+kind+'-v2';
 material.needsUpdate=true;
}
