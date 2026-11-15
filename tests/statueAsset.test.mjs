import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
// The Blender master lives outside the website repo (08-MO-HINH-3D); on GitHub these two checks are skipped.
const MASTER=new URL('../../08-MO-HINH-3D/chu-van-an/web-fix-2026-10-30/chu-van-an-seated-web-fixed-v2.glb',import.meta.url);
const noMaster=!existsSync(MASTER)&&'Blender master not in this checkout';

function asset(){
 const bytes=readFileSync(MASTER);
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.toString('utf8',20,20+jsonSize));
 const binStart=20+jsonSize+8;
 return {bytes,json,binStart};
}

test('Seated statue GLB retains all 11 parts and valid finite geometry, normals and UVs',{skip:noMaster},()=>{
 const {bytes,json,binStart}=asset();
 assert.equal(json.meshes.length,11);assert.ok(!json.cameras&&!json.animations);
 let triangles=0;
 for(const mesh of json.meshes)for(const p of mesh.primitives){
  assert.equal(p.mode??4,4);triangles+=json.accessors[p.indices].count/3;
  const pos=json.accessors[p.attributes.POSITION],norm=json.accessors[p.attributes.NORMAL];
  assert.equal(pos.type,'VEC3');assert.equal(norm.count,pos.count);
  const mat=json.materials[p.material],tex=mat.pbrMetallicRoughness.baseColorTexture;
  const uv=json.accessors[p.attributes['TEXCOORD_'+(tex.texCoord??0)]];
  assert.equal(uv.count,pos.count);assert.equal(uv.type,'VEC2');
  for(const acc of [pos,norm,uv]){
   assert.equal(acc.componentType,5126);
   const view=json.bufferViews[acc.bufferView],components=acc.type==='VEC3'?3:2;
   for(let i=0;i<acc.count;i++)for(let k=0;k<components;k++){
    const offset=binStart+(view.byteOffset??0)+(acc.byteOffset??0)+i*(view.byteStride??components*4)+k*4;
    assert.ok(Number.isFinite(bytes.readFloatLE(offset)),mesh.name);
   }
  }
 }
 assert.equal(triangles,52576);
});

test('Statue uses an embedded 2K repaired atlas without stale projected normal/ORM textures',{skip:noMaster},()=>{
 const {bytes,json,binStart}=asset();
 assert.equal(json.materials.length,1);assert.equal(json.images.length,1);
 const material=json.materials[0];assert.ok(!material.normalTexture&&!material.occlusionTexture);
 assert.ok(!material.pbrMetallicRoughness.metallicRoughnessTexture);
 assert.ok(material.pbrMetallicRoughness.roughnessFactor>=.5);
 const img=json.images[0];assert.ok(!img.uri);assert.equal(img.mimeType,'image/png');
 const view=json.bufferViews[img.bufferView],start=binStart+(view.byteOffset??0);
 assert.equal(bytes.toString('ascii',start+1,start+4),'PNG');
 assert.equal(bytes.readUInt32BE(start+16),2048);assert.equal(bytes.readUInt32BE(start+20),2048);
});

test('Web statue v3 is the compressed fixed-v2: meshopt + quantization + WebP 2K, 11 parts, small download',()=>{
 const bytes=readFileSync(new URL('../public/models/chu-van-an-seated-web-v3.glb',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 assert.ok(bytes.length<1.5*1024*1024,'statue download must stay under 1.5 MB');
 const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.toString('utf8',20,20+jsonSize)),binStart=20+jsonSize+8;
 for(const ext of ['EXT_meshopt_compression','KHR_mesh_quantization','EXT_texture_webp'])assert.ok(json.extensionsRequired.includes(ext),ext);
 assert.equal(json.meshes.length,11);
 let triangles=0;for(const mesh of json.meshes)for(const p of mesh.primitives)triangles+=json.accessors[p.indices].count/3;
 assert.equal(triangles,52576);
 assert.equal(json.images.length,1);const img=json.images[0];assert.equal(img.mimeType,'image/webp');
 const view=json.bufferViews[img.bufferView],start=binStart+(view.byteOffset??0);
 assert.equal(bytes.toString('ascii',start,start+4),'RIFF');assert.equal(bytes.toString('ascii',start+8,start+12),'WEBP');
});

test('Runtime statue component loads v3 with meshopt enabled',()=>{
 const src=readFileSync(new URL('../src/scene/ChuVanAnStatue.tsx',import.meta.url),'utf8');
 assert.match(src,/chu-van-an-seated-web-v3\.glb\?v='\+__ASSET_V__,false,true\)/);
});

test('Static hall boxes share materials and are batched by StaticInstancer',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.match(hall,/userData=\{\{staticBox:true\}\}/);assert.match(hall,/material=\{boxMaterial\(/);
 assert.match(hall,/<StaticInstancer><Architecture baked=\{baked\}\/><MonumentReservation baked=\{baked\}\/><MemoryCabinets baked=\{baked\}\/><\/StaticInstancer>/);
 assert.ok(!/function Box[\s\S]{0,400}<meshStandardMaterial/.test(hall),'Box must not create a material per mesh');
});

test('Baked shell (GĐ3) is the default (?scene=classic opts out), has a mobile variant and keeps live portraits, signs, statue, door motto',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const baked=readFileSync(new URL('../src/scene/BakedHall.tsx',import.meta.url),'utf8');
 assert.match(baked,/export function bakedEnabled\(\)\{return param\(\)!=='classic';\}/);
 assert.match(baked,/'hall-baked-mobile\.glb'/);assert.match(baked,/useGLTF\(import\.meta\.env\.BASE_URL\+'models\/'\+file\+'\?v='\+__ASSET_V__,false,true\)/);
 for(const f of ['hall-baked.glb','hall-baked-mobile.glb']){
  const b=readFileSync(new URL('../public/models/'+f,import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');
  const json=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  assert.equal(json.meshes.length,6,"floor, walls, ceiling, details, oak slats, foyer (15/11)");assert.equal(json.images.length,6);assert.ok(json.images.every(i=>i.mimeType==='image/webp'));
  assert.ok(json.extensionsRequired.includes('EXT_meshopt_compression'));assert.ok(b.length<(f==='hall-baked.glb'?4.6e6:2.8e6),f+' stays small');
 }
 assert.match(baked,/new MeshBasicMaterial\(\{map,toneMapped:false\}\)/);
 assert.match(hall,/function Architecture\(\{baked=false\}[^)]*\)\{if\(baked\)return <DoorMotto\/>;/);
 assert.match(hall,/<Frames slots=\{p\.layout\.slots\}\/>/);assert.match(hall,/<ChuVanAnStatue\/>/);
});
