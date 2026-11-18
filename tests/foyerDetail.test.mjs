import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {dprFor} from '../src/scene/quality.mjs';
import {isWalkable} from '../src/scene/hallLayout.mjs';

const src=f=>readFileSync(new URL('../src/scene/'+f,import.meta.url),'utf8');

test('Mức 2: every baked block gets a sharp world-space detail layer that keeps the baked average',async()=>{
 const {detailFor}=await import('../src/scene/bakedDetail.ts');
 assert.equal(detailFor('baked-slats'),'slats');assert.equal(detailFor('baked-floor'),'stone');
 for(const n of ['baked-walls','baked-foyer'])assert.equal(detailFor(n),'plaster');
 assert.equal(detailFor('baked-ceiling'),'ceiling','softer ceiling grain (it read as sand)');
 assert.equal(detailFor('baked-details'),'none');
 const d=src('bakedDetail.ts');
 assert.ok(d.includes('mix(0.37,1.233,oak)'));assert.ok(Math.abs(.27*.37+.73*1.233-1)<.002,'slat pattern averages to 1');
 assert.ok(d.includes('fwidth(u)'),'antialiased stripes');
 // the baked GLB has no normals: the shader must not read the normal attribute (black room, 15/11)
 assert.ok(!d.includes('*normal)')&&d.includes('normalize(cross(dFdx(vDWorld),dFdy(vDWorld)))'));assert.ok(src('BakedHall.tsx').includes('applyBakedDetail(m,detailFor(o.name))'));
});

test('A 1× screen is never rendered below its own resolution (blur); phones may still step down',()=>{
 assert.equal(dprFor('low',1),1);assert.equal(dprFor('medium',1),1);assert.equal(dprFor('low',3),.85);
});

test('Foyer: glazed back wall with the blurred schoolyard view, walkable foyer floor, stair hall in the bake',()=>{
 const f=src('FoyerView.tsx'),hall=src('HallScene.tsx');
 assert.ok(hall.includes('{baked&&<FoyerView/>}'));assert.ok(f.includes("'textures/san-truong-qua-kinh.webp'"));
 const size=statSync(new URL('../public/textures/san-truong-qua-kinh.webp',import.meta.url)).size;assert.ok(size<1.2e6,'backdrop stays light');
 assert.ok(isWalkable([3.5,1.7,11.2])&&isWalkable([-3.8,1.7,10])&&isWalkable([0,1.7,12.9]),'whole foyer floor (18/11: aisle between the benches to the glass)');
 assert.ok(!isWalkable([2.15,1.7,15.85])&&!isWalkable([-2.15,1.7,15.85]),'18/11: the two benches by the glass are obstacles');
 assert.ok(!isWalkable([3.5,1.7,8.6]),'facade/door zone stays narrow');assert.ok(!isWalkable([0,1.7,16.6]),'not into the glass');assert.ok(isWalkable([0,1.7,15.0]),'18/11: the deeper foyer is walkable');
 // The Blender source lives outside the website repo (not on GitHub CI).
 const B=new URL('../../08-MO-HINH-3D/museum-hall-24x16/v3-baked/build_hall_v3.py',import.meta.url);
 if(existsSync(B)){const build=readFileSync(B,'utf8');assert.ok(build.includes("box(f'foyer-step-a{i}'")&&build.includes("box('foyer-glass-sill'")&&build.includes("for (x, z) in L['benches']:")&&build.includes('def slab(nm, cx, cz, w, d, top, mat):'),'18/11: benches are built; rug layers are flat slabs (no z-fighting)');}
});

test('Bước 1: real-room reflection probes (floor, glass, environment) and quality-gated post-processing',()=>{
 const hall=src('HallScene.tsx'),probes=src('RoomProbes.tsx'),shared=src('probeShared.mjs'),fx=src('PostFX.tsx'),detail=src('bakedDetail.ts'),foyer=src('FoyerView.tsx');
 assert.ok(hall.includes("{baked&&p.quality&&p.quality.level!=='low'&&<PostFX level={p.quality.level}/>}"),'no post-processing on low');
 assert.ok(shared.includes('vec3 boxProject(')&&detail.includes('probeReflect(vDWorld,R,1.6)')&&foyer.includes('probeReflect(vGWorld'));
 assert.ok(probes.includes('PROBE_UNIFORMS.uRoomCube.value=null;PROBE_UNIFORMS.uFoyerCube.value=null;'),'no feedback loop while capturing');
 assert.ok(probes.includes("addEventListener('museum-doors-open',reopen)"),'hall probe re-captured once the doors are open');
 assert.ok(fx.includes('gl.toneMapping=NoToneMapping')&&fx.includes("samples:level==='high'?4:2"));
 // 16/11: bloom and SMAA blurred the portraits (measured −22 % / −13 % detail on a face) — must not come back
 assert.ok(!fx.includes('new UnrealBloomPass')&&!fx.includes('new SMAAPass'),'no soft post effects over the portraits');
});

test('18/11 (người dùng): bục góp ý ở sảnh — mở Zalo, không có chữ, không đi xuyên, chỉ “thở” ở sảnh',async()=>{
 const {FEEDBACK_LECTERN:L,isWalkable,BENCHES}=await import('../src/scene/hallLayout.mjs');
 const src=readFileSync(new URL('../src/scene/FeedbackLectern.tsx',import.meta.url),'utf8');
 assert.ok(src.includes("FEEDBACK_URL='https://zalo.me/0818810007'")&&src.includes("'noopener,noreferrer'"));
 assert.ok(!/fillText|Inscription|GildedSign/.test(src),'no text in 3D — icon only');
 assert.ok(src.includes('if(get().camera.position.z<8.6)return;'),'pulse only while in the foyer');
 assert.equal(isWalkable([L.x,1.7,L.z]),false,'cannot walk through the lectern');
 const {DOOR_SWITCH}={DOOR_SWITCH:{x:3.375}};assert.ok(Math.abs(L.x-DOOR_SWITCH.x)<1e-9&&L.z-.15>8.56&&L.yaw===0,'centred under the door switch, back to the stone wall, facing the foyer');
 for(const [bx,bz] of BENCHES)assert.ok(Math.abs(L.z-bz)>.6||Math.abs(L.x-bx)>1.6,'clear of the benches');
 assert.equal(isWalkable([0,1.7,13]),true,'foyer centre still walkable');
});
