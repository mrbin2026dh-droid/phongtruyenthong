import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogStore,parseCatalogBackup} from '../src/data/catalog.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url),'utf8'));
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const pack=people=>JSON.stringify({schemaVersion:1,people});
test('Backup roundtrip preserves IDs, slots, photos and work spells, commits atomically and survives reload',()=>{
 const mem=storage(),store=createCatalogStore(seed,{storage:mem,year:2026});const original=store.getSnapshot().people;
 const copy=structuredClone(original);copy[0].description='Bản sao đã đối chiếu';copy[0].image='data:image/jpeg;base64,YWJj';
 const text=pack(copy);assert.equal(parseCatalogBackup(text,2026)[0].id,original[0].id);
 store.restoreBackup(text,{expectedRevision:0});assert.equal(store.getSnapshot().revision,1);
 const reloaded=createCatalogStore(seed,{storage:mem,year:2026});assert.deepEqual(reloaded.getSnapshot().people,parseCatalogBackup(text,2026));
 assert.deepEqual(reloaded.getSnapshot().people.map(p=>p.displaySlot),original.map(p=>p.displaySlot));
});
test('Invalid backup, duplicate IDs, unsafe images, overlapping history and DEMO never mutate the catalog',()=>{
 const store=createCatalogStore(seed,{storage:storage(),year:2026});const original=store.getSnapshot();
 for(const change of [p=>p.push({...p[0]}),p=>p[0].image='https://external.invalid/photo.jpg',p=>p[0].id='DEMO-FAKE',p=>p[0].workHistory.push({...p[0].workHistory[0],id:'overlap'}),p=>p[1].displaySlot=p[0].displaySlot,p=>p[0].displaySlot='UNKNOWN-SLOT']){
  const people=structuredClone(original.people);change(people);assert.throws(()=>store.restoreBackup(pack(people),{expectedRevision:0}));assert.equal(store.getSnapshot(),original);
 }
 for(const text of ['{','{"schemaVersion":2,"people":[]}',pack([])])assert.throws(()=>parseCatalogBackup(text,2026));
});
test('Restore refuses a stale preview, a changed second tab or storage failure',()=>{
 const mem=storage(),first=createCatalogStore(seed,{storage:mem,year:2026}),second=createCatalogStore(seed,{storage:mem,year:2026});const text=pack(first.getSnapshot().people);
 first.restoreBackup(text,{expectedRevision:0});assert.throws(()=>first.restoreBackup(text,{expectedRevision:0}),/xem trước/);assert.throws(()=>second.restoreBackup(text,{expectedRevision:0}),/tab khác/);
 const fail=createCatalogStore(seed,{storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}},year:2026});const before=fail.getSnapshot();assert.throws(()=>fail.restoreBackup(text,{expectedRevision:0}),/Không lưu/);assert.equal(fail.getSnapshot(),before);
});
