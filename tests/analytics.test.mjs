import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('17/11 thống kê không cookie: only fixed event names, nothing personal, never on the admin computer',()=>{
 const a=src('src/data/analytics.ts');
 assert.ok(!/document\.cookie|localStorage|sessionStorage|indexedDB/.test(a.replace(/\/\*[\s\S]*?\*\//g,'')),'no cookie / browser storage');
 assert.ok(a.includes("if(!import.meta.env.PROD||!GOATCOUNTER_CODE)return false;"),'off in DEV and until a site code is set');
 assert.ok(/localhost/.test(a)&&a.includes("n.doNotTrack==='1'")&&a.includes('globalPrivacyControl'),'off on localhost, honours DNT / GPC');
 assert.ok(!/<script|createElement\('script'\)/.test(a),'no third-party script is loaded');
 // the URL carries only a fixed path/title (+ random cache buster) — no referrer, screen size or names
 const url=a.slice(a.indexOf("const url="),a.indexOf(";",a.indexOf("const url=")));
 assert.deepEqual([...url.matchAll(/[?&]([a-z]+)=/g)].map(m=>m[1]),['p','t','e','rnd'],'only p (fixed path), t (fixed title), e, rnd');
 const ev=[...a.matchAll(/'([a-z-]+)':'/g)].map(m=>m[1]);
 assert.deepEqual(ev,['trang-chao','bat-dau-tham-quan','vao-phong','xem-ho-so','tra-cuu','xem-trinh-chieu']);
});

test('17/11 thống kê: wired to the six visitor actions; the QR page uses the same site code',()=>{
 const app=src('src/PeopleApp.tsx');
 assert.ok(app.includes("track('bat-dau-tham-quan')")&&app.includes("if(v==='list')track('tra-cuu')")&&app.includes("track('xem-ho-so');setPerson(id)"));
 assert.ok(src('src/components/VisitLoading.tsx').includes("track('vao-phong');onEnter();"));
 assert.ok(src('src/scene/HallTour.tsx').includes("track('xem-trinh-chieu'),setViewer({index})"));
 assert.ok(src('src/main.tsx').includes("track('trang-chao',{once:true});"));
 const code=src('src/data/analytics.ts').match(/GOATCOUNTER_CODE='([^']*)'/)[1];
 const qr=src('public/tri-an/index.html');assert.equal(qr.match(/const CODE='([^']*)'/)[1],code,'same code on the QR page');
 assert.ok(!/cookie|localStorage/.test(qr.slice(qr.lastIndexOf('<script>')).replace(/\/\/.*$/gm,'')));
});
