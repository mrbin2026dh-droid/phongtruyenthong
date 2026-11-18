// 15/11 — Bước 1 (game-style look): reflection probes.
// Two real 360° captures of the baked room (main hall + foyer) are taken once everything has loaded.
// Surfaces sample them with box-projected parallax correction (as Unity/Unreal reflection probes do),
// so the polished floor and the glass reflect the actual walls, frames and light in the right place.
// The uniform objects are shared: every material that uses them updates as soon as a capture lands.
import {Vector3} from 'three';

export const PROBES={
 room:{center:new Vector3(0,1.6,0),min:new Vector3(-12,0,-8),max:new Vector3(12,4.2,8.16)},
 foyer:{center:new Vector3(0,1.6,12.5),min:new Vector3(-4.6,0,8.16),max:new Vector3(4.6,3.95,16.86)},   // 18/11: deeper foyer
};

/** Shared shader uniforms (same objects in every program). uReflect: 0 = off (low quality), 1 = on. */
export const PROBE_UNIFORMS={
 uRoomCube:{value:/** @type {import('three').Texture|null} */(null)},uFoyerCube:{value:/** @type {import('three').Texture|null} */(null)},uReflect:{value:0},
 uRoomMin:{value:PROBES.room.min},uRoomMax:{value:PROBES.room.max},uRoomC:{value:PROBES.room.center},
 uFoyerMin:{value:PROBES.foyer.min},uFoyerMax:{value:PROBES.foyer.max},uFoyerC:{value:PROBES.foyer.center},
};

/** GLSL: box-projected probe lookup + Schlick fresnel. Expects the uniforms above. */
export const PROBE_GLSL=`
uniform samplerCube uRoomCube;uniform samplerCube uFoyerCube;uniform float uReflect;
uniform vec3 uRoomMin;uniform vec3 uRoomMax;uniform vec3 uRoomC;uniform vec3 uFoyerMin;uniform vec3 uFoyerMax;uniform vec3 uFoyerC;
vec3 boxProject(vec3 P,vec3 R,vec3 bmin,vec3 bmax,vec3 c){
 vec3 f1=(bmax-P)/R,f2=(bmin-P)/R;vec3 fm=max(f1,f2);float d=min(min(fm.x,fm.y),fm.z);return normalize(P+R*d-c);
}
vec3 probeReflect(vec3 P,vec3 R,float lod){
 if(P.z>8.1)return textureLod(uFoyerCube,boxProject(P,R,uFoyerMin,uFoyerMax,uFoyerC),lod).rgb;
 return textureLod(uRoomCube,boxProject(P,R,uRoomMin,uRoomMax,uRoomC),lod).rgb;
}
float fresnel(vec3 V,vec3 N,float f0){return f0+(1.0-f0)*pow(1.0-clamp(dot(-V,N),0.0,1.0),5.0);}
`;
