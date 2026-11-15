import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorOffset,doorInnerEdge,doorStep,entryDelayMs,DOOR_JAMB,DOOR_LEAF,DOOR_SECONDS} from '../src/scene/doorMotion.mjs';
import {ARRIVAL_START} from '../src/scene/hallArrival.mjs';

test('Sliding doors: closed leaves meet at the centre, open leaves are fully past the jamb (inside the wall)',()=>{
 for(const side of [-1,1]){
  assert.equal(doorOffset(side,0),side*DOOR_LEAF);assert.equal(doorInnerEdge(side,0),0);
  assert.ok(Math.abs(doorInnerEdge(side,1))>DOOR_JAMB,'inner edge hidden at '+doorInnerEdge(side,1));
  assert.ok(Math.abs(doorInnerEdge(side,.1))<.1*DOOR_LEAF*.5,'starts slowly (eased)');
  assert.equal(doorOffset(side,2),doorOffset(side,1));
 }
 let v=0,t=0;while(v<1&&t<10){v=doorStep(v,1,1/60);t+=1/60;}assert.ok(Math.abs(t-DOOR_SECONDS)<.05);
 assert.ok(doorStep(.5,0,10)>.4,'a long idle gap must not jump the doors (demand frameloop)');
 assert.ok(doorStep(0,1,25)<.08,'first frame after waiting at the door moves only one frame step');
});

test('Visitor waits for the doors unless reduced motion, bench or effects off',()=>{
 assert.ok(entryDelayMs()>600&&entryDelayMs()<DOOR_SECONDS*1000);
 assert.equal(entryDelayMs({reducedMotion:true}),0);assert.equal(entryDelayMs({bench:true}),0);assert.equal(entryDelayMs({effects:false}),0);
});

test('Entry waits at the closed door for a tap; the plaque names the school; Về cổng vào closes the doors',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(ARRIVAL_START[2]>10.5&&ARRIVAL_START[2]<11.05,'stands inside the corridor, a few metres from the door');
 const has=(src,s)=>assert.ok(src.includes(s),'missing: '+s);
 has(tour,'if(benchOn||seen)openDoor();else setAtDoor(true);');
 has(tour,'className="hall-door-prompt" onClick={openDoor}');
 has(tour,"current==='gate'&&!atDoor){door.current.target=0;");
 has(doors,"['UBND XÃ ĐĂK HÀ','TRƯỜNG THCS CHU VĂN AN','PHÒNG TRUYỀN THỐNG']");
 has(doors,'gl.localClippingEnabled=true');has(doors,'new Plane(new Vector3(-side,0,0),DOOR_JAMB)');
 assert.ok(!doors.includes('position={[doorOffset'),'leaf position is driven by useFrame only');
});

test('Anti-flicker: wall headings stay visible, portraits use hysteresis and keep the previous image while loading',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const photo=readFileSync(new URL('../src/scene/HallPhoto.tsx',import.meta.url),'utf8');
 assert.ok(!/ref\.current\.visible=full/.test(hall));assert.match(hall,/const next=near\?d<8\.5:d<6\.5;/);
 assert.match(photo,/if\(target\.loaded\|\|!shown\.current\.e\.loaded\)shown\.current=/);
 assert.match(hall,/<EntranceDoors door=\{p\.door\}\/>/);
 assert.ok(!/rotation=\{\[0,side\*1\.50,0\]\}/.test(hall),'static open leaves removed');
});

test('A pause caused by a hidden tab is lifted when the visitor comes back; a manual pause is kept',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.match(tour,/if\(document\.hidden\)\{autoPaused\.current=true;setPause\(true\)/);
 assert.match(tour,/else if\(autoPaused\.current\)\{autoPaused\.current=false;setPause\(false\);\}/);
 assert.match(tour,/\(\)=>\{autoPaused\.current=false;if\(automatic\|\|moving\)setPause/);
});

test('Portraits fill their frames: 3D leadership photo covers the brass opening; profile image uses cover',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(hall,/principal\?\[\(slot\.height-\.07\)\/1\.5,slot\.height-\.07\]/);
 const h=1.5,w=1.0,ph=h-.07,pw=ph/1.5;assert.ok(ph>h-.056-.02&&pw>w-.056,'covers the 2.8 cm-bar opening');assert.ok(pw<w-.056+.012,'overlap stays hidden under the bars');
 assert.match(css,/\.profile img\{width:100%;aspect-ratio:2\/3;object-fit:cover;/);
});

test('Frames are 2.2 cm deep with the photo set inside them; doors reach the lintel',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(hall.includes('local.makeScale(w,h,.022);local.setPosition(x,y,.011);'));
 assert.ok(hall.includes('<mesh position={[0,0,principal ? .016 : .015]}>'),'photo sits inside the bars (front face z .022)');
 assert.ok(hall.includes("metalness:.35,roughness:.48"));
 assert.ok(doors.includes('[2.02,3.34,.08]'));
});
