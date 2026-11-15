import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('PWA P1: icons exist, manifest is installable and fullscreen, iPhone tags present',()=>{
 for(const f of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon-180.png'])assert.ok(existsSync(new URL('../public/icons/'+f,import.meta.url)),f);
 const cfg=read('vite.config.js'),html=read('index.html');
 assert.ok(cfg.includes("display:'fullscreen',display_override:['fullscreen','standalone']"));
 assert.ok(cfg.includes("start_url:'./?nguon=app',scope:'./'"),'relative: works under /phongtruyenthong/ and locally');
 assert.ok(cfg.includes("purpose:'maskable'")&&cfg.includes("sizes:'192x192'")&&cfg.includes("sizes:'512x512'"));
 assert.ok(html.includes('apple-touch-icon-180.png')&&html.includes('apple-mobile-web-app-capable'));
 assert.ok(!html.includes('rel="manifest"'),'the plugin injects the manifest link (no duplicate)');
});
test('PWA P2: service worker only in production; data newest-first; heavy files cached by versioned URL',()=>{
 const cfg=read('vite.config.js'),main=read('src/main.tsx');
 assert.ok(main.includes("if(import.meta.env.PROD&&'serviceWorker' in navigator){"),'admin dev server never registers a SW');
 assert.ok(main.includes("addEventListener('controllerchange'")&&main.includes("data/catalog.json'"),'first visit also caches the published data');
 assert.ok(cfg.includes("injectRegister:false")&&cfg.includes("registerType:'prompt'"));
 assert.ok(/endsWith\('\/data\/catalog\.json'\),handler:'NetworkFirst'/.test(cfg),'published data is never served stale while online');
 assert.ok(/data\/photos\/'\),handler:'CacheFirst'/.test(cfg)&&/\(models\|textures\)[^\n]*handler:'CacheFirst'/.test(cfg));
 assert.ok(cfg.includes('rangeRequests:true'),'music plays from cache with Range requests');
 assert.ok(cfg.includes('clientsClaim:true,')&&!cfg.includes('skipWaiting:true'),'first visit cached; updates never swap code under a running tour');
 assert.ok(cfg.includes("cacheId:'ptt'")&&cfg.includes('cleanupOutdatedCaches:true'));
 assert.ok(!/globPatterns:\[[^\]]*(glb|m4a|webp|jpg)/.test(cfg),'heavy files are not forced on every visitor at install');
});
