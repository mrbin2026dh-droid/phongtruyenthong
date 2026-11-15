import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorAngle,doorStep,entryDelayMs,DOOR_OPEN_ANGLE,DOOR_SECONDS} from '../src/scene/doorMotion.mjs';
import {ARRIVAL_START} from '../src/scene/hallArrival.mjs';

test('Entrance doors swing outwards with easing and open fully within DOOR_SECONDS',()=>{
 assert.equal(doorAngle(1,0),0);assert.equal(doorAngle(-1,1),-DOOR_OPEN_ANGLE);assert.equal(doorAngle(1,2),DOOR_OPEN_ANGLE);
 assert.ok(doorAngle(1,.1)<DOOR_OPEN_ANGLE*.1,'starts slowly');
 let v=0,t=0;while(v<1&&t<10){v=doorStep(v,1,1/60);t+=1/60;}assert.ok(Math.abs(t-DOOR_SECONDS)<.05);
 assert.equal(doorStep(.5,0,10),0);
});

test('Visitor waits for the doors unless reduced motion, bench or effects off',()=>{
 assert.ok(entryDelayMs()>1000&&entryDelayMs()<DOOR_SECONDS*1000);
 assert.equal(entryDelayMs({reducedMotion:true}),0);assert.equal(entryDelayMs({bench:true}),0);assert.equal(entryDelayMs({effects:false}),0);
});

test('Open leaves lie along the corridor walls, clear of the walking line (|x| < 1.8 m)',()=>{
 for(const side of [-1,1]){
  const a=doorAngle(side,1),hinge=[side*2.02,8.15];
  // Leaf points from the hinge towards the centre (local −side·x), rotated by a about +Y.
  const tip=[hinge[0]+(-side*2.02)*Math.cos(a),hinge[1]-(-side*2.02)*Math.sin(a)];
  assert.ok(Math.abs(tip[0])>1.8,'tip x '+tip[0]);assert.ok(tip[1]>8.15&&tip[1]<11.05,'tip z '+tip[1]);
 }
 assert.ok(ARRIVAL_START[2]>8.15+2.02,'visitor starts beyond the swing radius');
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
