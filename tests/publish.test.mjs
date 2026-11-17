import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPublication,writePublication,existingPhotoFiles,readPublished,summarize} from '../scripts/publishData.mjs';
import {createCatalogStore,migratePeople} from '../src/data/catalog.mjs';
import {attachExhibitSlots} from '../src/data/exhibitSlots.mjs';
import {adminAllowed} from '../src/data/photoRef.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(400,7)]).toString('base64');
const people=()=>attachExhibitSlots(migratePeople(seed));

test('Admin tools only exist on this computer (dev server + loopback), never on the public site',()=>{
 assert.equal(adminAllowed(true,'127.0.0.1'),true);assert.equal(adminAllowed(true,'localhost'),true);
 assert.equal(adminAllowed(false,'127.0.0.1'),false,'production build');assert.equal(adminAllowed(true,'192.168.1.171'),false,'LAN phone');
 assert.equal(adminAllowed(false,'truong.github.io'),false);
});

test('Publication: photos become content-addressed JPEG files; the catalog keeps slots; unchanged photo = same file',()=>{
 const list=people();list[0]={...list[0],image:jpeg};
 const a=buildPublication(list,new Set(),2026);
 const p0=a.catalog.people.find(p=>p.id===list[0].id);
 assert.match(p0.image,/^data\/photos\/GV\d+-[0-9a-f]{10}\.jpg$/);assert.equal(p0.displaySlot,list[0].displaySlot);
 assert.equal(a.files.size,1);
 const again=buildPublication(a.catalog.people,new Set([p0.image.slice(12)]),2026);
 assert.equal(again.catalog.people.find(p=>p.id===p0.id).image,p0.image);assert.equal(again.removed.length,0);
 assert.throws(()=>buildPublication(a.catalog.people,new Set(),2026),/Thiếu tệp ảnh/);
 assert.throws(()=>buildPublication([{...list[0],image:'data:image/png;base64,AAAA'}],new Set(),2026),/JPEG/);
});

test('Write + read back in a temp project; removed person’s photo file is deleted; nothing outside public/data',()=>{
 const root=mkdtempSync(join(tmpdir(),'museum-'));
 const list=people();list[0]={...list[0],image:jpeg};list[1]={...list[1],image:jpeg.replace('B','C')};
 writePublication(root,buildPublication(list,existingPhotoFiles(root),2026));
 assert.equal(readdirSync(join(root,'public/data/photos')).length,2);
 const published=readPublished(root);assert.equal(published.length,list.length);
 const next=published.filter(p=>p.id!==list[1].id);
 const pub2=buildPublication(next,existingPhotoFiles(root),2026);writePublication(root,pub2);
 assert.equal(readdirSync(join(root,'public/data/photos')).length,1);assert.deepEqual(readdirSync(root),['public']);
 const s=summarize(published,pub2.catalog.people);assert.deepEqual(s.removed,[list[1].id]);assert.equal(s.added.length,0);assert.equal(s.changed,true);
});

test('Public site starts from the published catalog (read-only, no localStorage)',()=>{
 const list=people();const pub=buildPublication(list,new Set(),2026).catalog.people;
 const store=createCatalogStore(seed,{storage:null,published:pub,year:2026});
 assert.equal(store.getSnapshot().people.length,pub.length);
 for(const p of pub)assert.equal(store.getSnapshot().people.find(v=>v.id===p.id).displaySlot,p.displaySlot,'slots kept');
 const repo=readFileSync(new URL('../src/data/repository.ts',import.meta.url),'utf8');
 assert.match(repo,/storage:adminAvailable\?\(storage\|\|blockedStorage\):null,published:publishedPeople/,'visitors never use localStorage');
});

test('Publish endpoint: dev-only, loopback-only, same-origin, consent required, Git limited to public/data + the keepsake pictures',()=>{
 const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
 assert.match(vite,/name:'local-admin-publish',apply:'serve'/);assert.match(vite,/if\(!loopback\(req\.socket\.remoteAddress\)/);
 assert.match(vite,/if\(!origin\|\|origin!=='http:\/\/'\+req\.headers\.host\)/);assert.match(vite,/input\.consent!==true/);
 assert.match(vite,/git\(\['add','--',\.\.\.PUBLISH_PATHS\]\)/);
 assert.match(vite,/const PUBLISH_PATHS=\['public\/data','public\/tri-an\/tri-an-thay-co-20-11\.jpg',\.\.\.\[1200,1800,2600\]\.map\(w=>'public\/welcome\/tri-an-20-11-v2-'\+w\+'\.webp'\)\]/,'17/11: exact keepsake files only, never a whole folder');assert.ok(!/--force|reset --hard/.test(vite));
 const ignore=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
 for(const p of ['node_modules/','dist/','local-preview/','.env'])assert.ok(ignore.includes(p),p);
});
