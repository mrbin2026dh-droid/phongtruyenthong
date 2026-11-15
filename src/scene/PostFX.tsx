import {useEffect,useMemo} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {HalfFloatType,NoToneMapping,WebGLRenderTarget} from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** Final colour grade, in display space: gentle contrast + saturation, a touch of warmth, soft vignette. */
// 15/11 audit (histograms): p2 ≈ 35–41 (no real darks), R/B ≈ 1.45 in the hall → black point, a bit more contrast, cooler.
export const GRADE={contrast:1.08,saturation:1.06,warmth:-.006,vignette:.16,blackPoint:.045};
const GradeShader={
 uniforms:{tDiffuse:{value:null},uContrast:{value:GRADE.contrast},uSaturation:{value:GRADE.saturation},uWarmth:{value:GRADE.warmth},uVignette:{value:GRADE.vignette},uBlack:{value:GRADE.blackPoint}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uContrast,uSaturation,uWarmth,uVignette,uBlack;varying vec2 vUv;
void main(){
 vec4 c=texture2D(tDiffuse,vUv);vec3 col=max(c.rgb-uBlack,0.0)/(1.0-uBlack);   // black point: real darks
 col=(col-0.5)*uContrast+0.5;
 float l=dot(col,vec3(0.2126,0.7152,0.0722));col=mix(vec3(l),col,uSaturation);
 col+=vec3(uWarmth,uWarmth*.35,-uWarmth);
 vec2 d=vUv-0.5;col*=1.0-uVignette*smoothstep(0.25,0.85,dot(d,d)*2.0);
 gl_FragColor=vec4(clamp(col,0.0,1.0),c.a);
}`,
};

/** 15/11 — Bước 1 post-processing (game look): colour grade; low: not mounted.
 * 16/11 (user: real portraits looked soft — measured on a face crop, Laplacian variance): bloom −22 % detail
 * (white photo backgrounds/shirts glowed over faces), SMAA −13 % (it also smooths edges INSIDE textures).
 * Now: no bloom; anti-aliasing by 4× MSAA on the scene render target — geometry edges only, photos untouched.
 * The baked room is already tone-mapped in Blender (AgX), so the renderer runs without tone mapping here and the
 * OutputPass only converts to sRGB — the bake keeps its exact look, as before. */
export default function PostFX({level}:{level:string}){
 const {gl,scene,camera,size}=useThree();
 const composer=useMemo(()=>{
  const c=new EffectComposer(gl,new WebGLRenderTarget(1,1,{type:HalfFloatType,samples:level==='high'?4:2}));
  c.addPass(new RenderPass(scene,camera));
  c.addPass(new OutputPass());
  c.addPass(new ShaderPass(GradeShader));
  return c;
 },[gl,scene,camera,level]);
 useEffect(()=>{const prev=gl.toneMapping;gl.toneMapping=NoToneMapping;return()=>{gl.toneMapping=prev;composer.dispose();};},[gl,composer]);
 useEffect(()=>{composer.setPixelRatio(gl.getPixelRatio());composer.setSize(size.width,size.height);},[composer,gl,size]);
 // priority 1: this frame callback takes over rendering (frameloop stays "demand")
 // keep the composer at the renderer's current pixel ratio (the quality level can change it without a resize)
 useFrame(()=>{const pr=gl.getPixelRatio();if((composer as any)._pixelRatio!==pr){composer.setPixelRatio(pr);composer.setSize(size.width,size.height);}composer.render();},1);
 // DEV QA hook: capture exactly what the visitor sees (after post-processing).
 useEffect(()=>{if(!import.meta.env.DEV)return;(window as any).__fxShot=()=>{composer.render();return gl.domElement.toDataURL('image/jpeg',.92);};(window as any).__fx=composer;return()=>{delete (window as any).__fxShot;delete (window as any).__fx;};},[composer,gl]);
 return null;
}
