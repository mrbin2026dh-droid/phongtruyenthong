import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';

// 16/11 user report: “ảnh và khung chưa khít” — the photo was smaller than the frame opening (wall showed through).
test('Every portrait overlaps its frame bars on all four sides (no gap), never past the 2.8 cm bars',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 assert.ok(hall.includes('<planeGeometry args={photoSize(slot.width||.55,slot.height||.735)}/>'),'photo uses the shared size rule');
 const bar=.028,overlap=.006;
 const size=(fw,fh)=>{const ow=fw-2*bar,oh=fh-2*bar,w=Math.max(ow+2*overlap,(oh+2*overlap)/1.5);return [w,w*1.5];};
 for(const s of exhibitSlots()){
  const fw=s.width||.55,fh=s.height||.735,[w,h]=size(fw,fh);
  const sideX=(w-(fw-2*bar))/2,sideY=(h-(fh-2*bar))/2;
  assert.ok(sideX>=.0059&&sideY>=.0059,s.slotId+' photo covers the opening');
  assert.ok(sideX<bar&&sideY<bar,s.slotId+' photo edge stays hidden under the bars');
  assert.ok(Math.abs(h/w-1.5)<1e-9,'2:3 kept');
 }
});

test('Standing right in front of a frame uses the full 900×1350 upload; tiers have hysteresis',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const photo=readFileSync(new URL('../src/scene/HallPhoto.tsx',import.meta.url),'utf8');
 assert.ok(photo.includes('TIER_SIZE:[number,number][]=[[160,240],[600,900],[900,1350]]'));
 assert.ok(hall.includes('if(d<(cur===2?3:2.4))return 2;')&&hall.includes('return d<(cur>=1?8.5:6.5)?1:0;'));
 // same rule as photoTier(), evaluated here
 const tier=(cur,d)=>d<(cur===2?3:2.4)?2:(d<(cur>=1?8.5:6.5)?1:0);
 assert.equal(tier(0,2),2);assert.equal(tier(2,2.8),2);assert.equal(tier(2,3.2),1);assert.equal(tier(1,8),1);assert.equal(tier(0,8),0);
});

test('Heavy assets carry a content-hash version so phones never keep an old room after an update',()=>{
 const cfg=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
 assert.ok(cfg.includes("define:{__ASSET_V__:JSON.stringify(ASSET_V)}")&&cfg.includes("'models/hall-baked-mobile.glb'"));
 for(const f of ['BakedHall.tsx','ChuVanAnStatue.tsx','FoyerView.tsx','hallAudio.ts'])
  assert.ok(readFileSync(new URL('../src/scene/'+f,import.meta.url),'utf8').includes("?v='+__ASSET_V__"),f);
});

test('Public site: welcome card only, fullscreen + landscape on the start tap, rotate hint, phone-safe music',()=>{
 const app=readFileSync(new URL('../src/PeopleApp.tsx',import.meta.url),'utf8');
 const welcome=readFileSync(new URL('../src/components/Welcome.tsx',import.meta.url),'utf8');
 const imm=readFileSync(new URL('../src/data/immersive.ts',import.meta.url),'utf8');
 const audio=readFileSync(new URL('../src/scene/hallAudio.ts',import.meta.url),'utf8');
 const loading=readFileSync(new URL('../src/components/VisitLoading.tsx',import.meta.url),'utf8');
 assert.ok(app.includes('const minimal=!adminAvailable;')&&app.includes('function startVisit(){void enterImmersive();startHallSound();track(\'bat-dau-tham-quan\');navigate(\'room\');}'));
 assert.ok(welcome.includes('{!minimal&&<>')&&app.includes("{view!=='room'&&!minimal&&<footer>"));
 assert.ok(imm.includes("requestFullscreen({navigationUI:'hide'})")&&imm.includes("o.lock('landscape')"));
 assert.ok(loading.includes('visit-rotate-hint')&&loading.includes('Xoay ngang điện thoại'));
 assert.ok(!audio.includes('ctx.createMediaElementSource('),'music is a plain media element (silent on some phones through Web Audio)');
 assert.ok(audio.includes('export function primeHallSound()'));
});
