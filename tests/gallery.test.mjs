import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGalleryStore,parseGallery,captionLine,GALLERY_CATS,MAX_PER_CAT} from '../src/data/gallery.mjs';
import {buildGalleryPublication} from '../scripts/publishData.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const JPEG='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(400,7)]).toString('base64');

test('17/11 Phương án B: three display groups mapped to the three cabinets',()=>{
 assert.deepEqual(GALLERY_CATS.map(c=>[c.id,c.niche]),[['activity',1],['award',2],['memento',0]]);
 assert.equal(captionLine({caption:'Hội khỏe Phù Đổng',year:2025}),'Hội khỏe Phù Đổng · 2025');
 assert.equal(captionLine({caption:'',year:null}),'');
});

test('Gallery store: add, caption/year, reorder within a group, remove; saved locally',()=>{
 const mem=memory(),s=createGalleryStore({storage:mem});
 const a=s.add({cat:'activity',image:'idb:abcdef1234567890'}),b=s.add({cat:'award',image:'idb:bbbbbbbb12345678'}),c=s.add({cat:'activity',image:'idb:cccccccc12345678'});
 s.update(a.id,{caption:'  Khai giảng   năm học ',year:'2026'});
 assert.equal(s.getSnapshot().items[0].caption,'Khai giảng năm học');assert.equal(s.getSnapshot().items[0].year,2026);
 s.move(c.id,-1);assert.deepEqual(s.getSnapshot().items.map(i=>i.id),[c.id,b.id,a.id],'swaps with the previous ACTIVITY item, award stays');
 s.remove(b.id);assert.equal(s.getSnapshot().items.length,2);
 assert.equal(createGalleryStore({storage:mem}).getSnapshot().items.length,2,'reloaded from localStorage');
 assert.throws(()=>s.update(a.id,{year:1800}),/Năm/);
 assert.throws(()=>s.add({cat:'nope',image:'idb:abcdef1234567890'}),/Nhóm/);
 assert.throws(()=>s.add({cat:'award',image:'https://example.com/x.jpg'}),/JPEG/);
 assert.throws(()=>parseGallery(Array.from({length:MAX_PER_CAT+1},(_,i)=>({id:'gtest'+i,cat:'award',image:'idb:abcdef1234567890'}))),/tối đa/);
});

test('Gallery publication: inline JPEG → data/gallery file, unchanged file kept, removed file deleted',()=>{
 const pub=buildGalleryPublication([{id:'gone1',cat:'activity',image:JPEG,caption:'A',year:2024}],new Set(['old-1.jpg']));
 const item=pub.gallery.items[0];assert.match(item.image,/^data\/gallery\/gone1-[0-9a-f]{10}\.jpg$/);
 assert.deepEqual(pub.removed,['old-1.jpg']);
 const again=buildGalleryPublication([item],new Set([item.image.slice(13)]));assert.equal(again.files.get(item.image.slice(13)),null);assert.equal(again.removed.length,0);
 assert.throws(()=>buildGalleryPublication([{id:'miss1',cat:'award',image:'data/gallery/x-1.jpg'}],new Set()),/Thiếu tệp/);
 assert.throws(()=>buildGalleryPublication([{id:'idb11',cat:'award',image:'idb:abcdef1234567890'}]),/chưa sẵn sàng/);
});

test('Wiring: displays in the scene, viewer on tap, admin dialog, sent with “Xuất bản”',()=>{
 const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
 assert.ok(src('scene/HallScene.tsx').includes('<GalleryDisplays items={p.gallery}'));
 const tour=src('scene/HallTour.tsx');assert.ok(tour.includes('<GalleryViewer')&&tour.includes('Ảnh trình diễn…'));
 assert.ok(src('components/AdminPublish.tsx').includes('gallery:galleryPayload'));
 assert.ok(src('main.tsx').includes("data/gallery.json"));
 const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');assert.ok(vite.includes('buildGalleryPublication(input.gallery'));
 const disp=src('scene/GalleryDisplays.tsx');assert.ok(disp.includes('if(!n)return null'),'no pictures at all → nothing drawn');
 assert.ok(disp.includes('screenGrab.active=true')&&src('scene/HallController.tsx').includes('if(screenGrab.active)'),'17/11: swiping the screen does not turn the camera');
 assert.ok(disp.includes('clippingPlanes={clip}')&&disp.includes("slideTo(-1)"),'touch-screen carousel: clipped strip, auto-advance');
 assert.ok(tour.includes("fit:'bare' as const"),'17/11: tri ân 20/11 picture until the school uploads its own');
});

test('17/11 (giật lag): the slide screen never drops the still resolution and only animates when looked at',()=>{
 const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
 const probe=src('scene/PerfProbe.tsx');assert.ok(probe.includes('if(!cameraMoved||!motionDelta(dt))return;'),'only camera motion lowers the resolution / is measured');
 const disp=src('scene/GalleryDisplays.tsx');
 assert.ok(disp.includes('renderer?.initTexture(tex)')&&disp.includes('requestIdleCallback'),'GPU upload while idle');
 assert.ok(disp.includes('!inView(get().camera)'),'auto-advance only when the screen is in view');
 assert.ok(disp.includes('const W=phone?1280:1920'),'slides at the source size 1920×1080');
 assert.ok(disp.includes("key={m?m.uuid:'empty'}"),'17/11 white screen: a new material when the picture arrives (shader with a map)');
 assert.ok(disp.includes('c.offset=to;if(to!==0)setIndex')&&disp.includes('useLayoutEffect(()=>{const c=car.current;if(c.anim||c.dragging)return;c.offset=0;'),'17/11 nhấp nháy: the strip re-centres in the same commit as the new pictures, never a frame of the old one');
 assert.ok(disp.includes('material={tvBody}')&&disp.includes('wallShadow()')&&!disp.includes('#4a3423'),'17/11: a wall-mounted display (black body, contact shadow), not a walnut picture frame');
 assert.ok(disp.includes('if(pt&&(Math.abs(pt.x-S.x)>w/2+.04||Math.abs(pt.y-S.y)>h/2+.04))return;'),'18/11: presses on the invisible neighbour slides (beyond the frame, behind the corner wall) are ignored');
});
