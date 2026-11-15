import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUALITY_LEVELS,dprFor,initialLevel,nextLevel,benchSummary,benchVerdict,benchRoute,motionDelta} from '../src/scene/quality.mjs';
import {layoutHall} from '../src/scene/hallLayout.mjs';

test('Quality levels lower the render resolution and never exceed the screen ratio',()=>{
 assert.deepEqual(QUALITY_LEVELS.map(l=>l.id),['high','medium','low']);
 assert.equal(dprFor('high',3),1.5);assert.equal(dprFor('high',1),1);assert.equal(dprFor('low',3),.85);assert.equal(dprFor('nope',2),1.5);
 assert.equal(initialLevel({coarse:true,smallScreen:true}),'medium');assert.equal(initialLevel({}),'high');assert.equal(initialLevel({deviceMemory:2}),'low');
});

test('Auto quality steps down quickly and up only after sustained headroom',()=>{
 assert.deepEqual(nextLevel('high',24),{level:'medium',highStreak:0});
 assert.deepEqual(nextLevel('low',10),{level:'low',highStreak:0});
 let s={level:'low',highStreak:0};for(let i=0;i<2;i++)s=nextLevel(s.level,60,s.highStreak);assert.equal(s.level,'low');
 s=nextLevel(s.level,60,s.highStreak);assert.equal(s.level,'medium');
 assert.deepEqual(nextLevel('medium',40,2),{level:'medium',highStreak:0});
});

test('Benchmark summary ignores idle gaps and reports average and 1%/5% lows',()=>{
 assert.equal(motionDelta(2),false);assert.equal(motionDelta(1/60),true);
 const d=[...Array(95).fill(1/60),...Array(5).fill(1/20),3];
 const s=benchSummary(d);assert.equal(s.frames,100);assert.ok(s.avgFps>50&&s.avgFps<60);assert.equal(s.low1Fps,20);assert.equal(s.low5Fps,20);assert.equal(s.maxFrameMs,50);
 assert.equal(benchSummary([]).frames,0);
 assert.equal(benchVerdict({frames:10,avgFps:58,low5Fps:40}),'Rất mượt');assert.match(benchVerdict({frames:10,avgFps:12,low5Fps:8}),/Tra cứu 2D/);
});

test('Benchmark walk covers leadership, side walls, staff, cabinets and returns, all reachable stops',()=>{
 const stops=layoutHall([]).stops,r=benchRoute(stops);
 assert.equal(r[0],'principal-0');assert.equal(r.at(-1),'entrance');assert.ok(r.length>=6);
 assert.ok(r.every(id=>stops.some(s=>s.id===id)));assert.equal(new Set(r).size,r.length);
});

test('Bench mode, quality selector and LAN result endpoint are wired',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
 assert.match(tour,/get\('bench'\)==='1'/);assert.match(tour,/aria-label="Chất lượng hình"/);
 assert.match(vite,/\/__local-preview\/bench/);assert.match(vite,/privateClient/);
});
