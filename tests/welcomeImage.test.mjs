import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';

const pub=f=>new URL('../public/welcome/'+f,import.meta.url);
test('Welcome image: light AVIF/WebP first, full 1600 px on wide screens, PNG kept only as last fallback',()=>{
 const w=readFileSync(new URL('../src/components/Welcome.tsx',import.meta.url),'utf8');
 for(const f of ['welcome-architecture-1600.avif','welcome-architecture-1600.webp','welcome-architecture-1024.avif','welcome-architecture-1024.webp']){
  assert.ok(existsSync(pub(f)),f);assert.ok(statSync(pub(f)).size<260*1024,f+' stays small');
 }
 assert.ok(existsSync(pub('welcome-architecture.png')),'original kept for very old browsers');
 assert.ok(!existsSync(pub('museum-entrance.png')),'unused 1,3 MB image removed (backup in SAO-LUU)');
 assert.ok(w.indexOf('type="image/avif"')<w.indexOf('type="image/webp"'),'AVIF preferred');
 assert.ok(w.includes('<source type="image/avif" srcSet={WELCOME+\'-1600.avif\'}/>'),'wide screens: always the full-size file');
 assert.equal((w.match(/media="\(max-width:700px\)"/g)||[]).length,2,'1024 px only on narrow screens');
 assert.ok(w.includes("<img src={WELCOME+'.png'}"));
});
