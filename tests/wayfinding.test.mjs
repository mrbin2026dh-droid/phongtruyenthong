import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stopLabel,mapPoint,routeDotDistances} from '../src/scene/wayfindingMath.mjs';
import {layoutHall} from '../src/scene/hallLayout.mjs';

test('Floor stop labels are short Vietnamese zone names',()=>{
 const l=layoutHall([]);
 assert.equal(stopLabel({id:'entrance'}),'Toàn cảnh');assert.equal(stopLabel({id:'principal-0',title:'Ban Giám hiệu'}),'Ban Giám hiệu');
 assert.equal(stopLabel({id:'teacher-1',title:'Các thế hệ nhà giáo · 2'}),'Nhà giáo · 2');
 for(const s of l.stops.filter(s=>s.id!=='finish')){const t=stopLabel(s);assert.ok(t.length>0&&t.length<=28,s.id+': '+t);}
});

test('"Bạn đang ở đây": plan position and heading follow the camera',()=>{
 const gate=mapPoint({x:0,z:9.1,yaw:0});assert.equal(gate.left,50);assert.equal(gate.top,100);
 assert.ok(Math.abs(gate.heading+Math.PI/2)<1e-9,'yaw 0 looks towards the back wall = up on the plan');
 assert.ok(Math.abs(mapPoint({x:0,z:0,yaw:-Math.PI/2}).heading)<1e-9,'turning right looks right on the plan');
 const corner=mapPoint({x:-12,z:-8,yaw:0});assert.equal(corner.left,0);assert.equal(corner.top,0);
});

test('Route dots start ahead of the visitor and stop before the destination',()=>{
 assert.deepEqual(routeDotDistances(1),[]);
 const d=routeDotDistances(10);assert.equal(d[0],.7);assert.ok(d.at(-1)<9.65);assert.ok(d.every((v,i)=>!i||v>d[i-1]));
 assert.ok(routeDotDistances(1000).length<=160);
});

test('Controls: keyboard works without clicking the scene, pinch zoom, home can interrupt, progress counts the destination',()=>{
 const ctl=readFileSync(new URL('../src/scene/HallController.tsx',import.meta.url),'utf8');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.match(ctl,/window\.addEventListener\('keydown',keydown\)/);assert.ok(!/c\.addEventListener\('keydown'/.test(ctl));
 assert.match(ctl,/keyTargetIgnored\(e\.target\)/);assert.match(ctl,/pinch\.current/);
 assert.ok(tour.includes("icon('Về cổng vào','home',()=>go('gate',true),!ready||atDoor)"));
 assert.match(tour,/s\.id===baseStopId\(moving\?command\.to:current\)/);
 assert.match(tour,/<YouAreHere pose=\{pose\}\/>/);
});

test('No two source files differ only by letter case (Windows/macOS resolve them as the same module)',async()=>{
 const {readdirSync}=await import('node:fs');const seen=new Map();
 const walk=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walk(p);else{const key=p.replace(/\.[^.\/]+$/,'').toLowerCase();assert.ok(!seen.has(key),'case clash: '+p+' vs '+seen.get(key));seen.set(key,p);}}};
 const {fileURLToPath}=await import('node:url');walk(fileURLToPath(new URL('../src',import.meta.url)));
});

test('Route arrows point along the walking direction',async()=>{
 const {arrowYaw}=await import('../src/scene/wayfindingMath.mjs');
 const dir=yaw=>[-Math.sin(yaw),-Math.cos(yaw)];// local −Z after rotating by yaw about +Y
 for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0],[.6,.8]]){const [x,z]=dir(arrowYaw(dx,dz)),len=Math.hypot(dx,dz);assert.ok(Math.abs(x-dx/len)<1e-9&&Math.abs(z-dz/len)<1e-9);}
});

test('Phone landscape: room fills the screen, overlays stay small, no clutter text',()=>{
 const css=readFileSync(new URL('../src/landscape.css',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.match(main,/import '\.\/landscape\.css';/);
 assert.match(css,/@media \(max-height:500px\) and \(orientation:landscape\)/);
 assert.match(css,/\.guided-scene\{height:calc\(100dvh - 44px\)/);
 assert.ok(!tour.includes('Toàn cảnh → Kỷ vật'),'chooser has buttons only');
 assert.ok(!tour.includes('ảnh · Minh họa'),'no photo counter in the location chip');
 assert.match(tour,/p\.mockCount>0&&<span className="location-period">Ảnh minh họa<\/span>/);
});
