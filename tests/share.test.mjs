import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

test('17/11 chia sẻ Zalo/Facebook: Open Graph tags with an absolute 1200×630 image that exists',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const p of ['og:title','og:description','og:url','og:image','og:image:width','og:image:height','og:type'])assert.ok(html.includes('property="'+p+'"'),p);
 assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
 const img=html.match(/property="og:image" content="([^"]+)"/)[1];assert.match(img,/^https:\/\/.+\/og\/chia-se\.jpg\?v=\d+$/,'absolute https URL (Zalo needs it)');
 const size=statSync(new URL('../public/og/chia-se.jpg',import.meta.url)).size;assert.ok(size<300*1024,'small enough for every share scraper');
 const jpg=readFileSync(new URL('../public/og/chia-se.jpg',import.meta.url));let i=2,w=0,h=0;
 while(i<jpg.length){const m=jpg[i+1],len=jpg.readUInt16BE(i+2);if(m>=0xC0&&m<=0xC2){h=jpg.readUInt16BE(i+5);w=jpg.readUInt16BE(i+7);break;}i+=2+len;}
 assert.deepEqual([w,h],[1200,630]);
});
