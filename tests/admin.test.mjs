import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogStore,parseCatalogBackup} from '../src/data/catalog.mjs';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';
import {isPhotoRef,slotDefaults,storedRatio} from '../src/data/photoRef.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const newPerson=(slot,extra={})=>{const d=slotDefaults(slot.group);return {name:'Giáo viên mới thử',role:d.role,dept:'Toán',group:d.group,status:'Đang công tác',birthYear:null,description:'',image:'idb:abcdef1234567890',photoRatio:3/4,workHistory:[{id:'w1',startYear:2025,endYear:null,role:d.role}],displaySlot:slot.slotId,...extra};};

test('Photo references and slot defaults',()=>{
 assert.ok(isPhotoRef('idb:abcdef1234567890'));assert.ok(!isPhotoRef('idb:x'));assert.ok(!isPhotoRef('data:image/png;base64,AA'));
 assert.deepEqual(slotDefaults('principal'),{group:'management',role:'Hiệu trưởng',roleLocked:true});
 assert.equal(slotDefaults('teacher').group,'teacher');assert.equal(slotDefaults('nope'),null);
 assert.equal(storedRatio(354,472),3/4);assert.equal(storedRatio(400,600),2/3);
});

test('Admin adds a teacher into a chosen empty wall slot; nobody else moves',()=>{
 const store=createCatalogStore(seed,{storage:memory(),year:2026}),before=store.getSnapshot().people;
 const used=new Set(before.map(p=>p.displaySlot)),empty=exhibitSlots().filter(s=>s.group==='teacher'&&!used.has(s.slotId)).at(-1);
 const saved=store.savePerson(newPerson(empty));
 assert.equal(saved.displaySlot,empty.slotId);assert.equal(saved.image,'idb:abcdef1234567890');
 before.forEach(p=>assert.equal(store.getSnapshot().people.find(v=>v.id===p.id).displaySlot,p.displaySlot));
});

test('Admin replaces photo/info in place and removes a person: the slot becomes free, others stay',()=>{
 const store=createCatalogStore(seed,{storage:memory(),year:2026});const p=store.getSnapshot().people.find(v=>v.group==='teacher');
 const updated=store.savePerson({...p,name:'Tên đã sửa',image:'idb:0123456789abcdef'},{id:p.id});
 assert.equal(updated.displaySlot,p.displaySlot);assert.equal(updated.image,'idb:0123456789abcdef');
 const others=store.getSnapshot().people.filter(v=>v.id!==p.id).map(v=>[v.id,v.displaySlot]);
 store.removePerson(p.id);const after=store.getSnapshot().people;
 assert.ok(!after.some(v=>v.id===p.id));assert.ok(!after.some(v=>v.displaySlot===p.displaySlot));
 others.forEach(([id,slot])=>assert.equal(after.find(v=>v.id===id).displaySlot,slot));
 assert.throws(()=>store.removePerson('KHONG-CO'));
});

test('Leadership slots accept only the matching role; backups may hold IndexedDB photo references',()=>{
 const store=createCatalogStore(seed,{storage:memory(),year:2026});
 const principal=exhibitSlots().find(s=>s.group==='principal');const current=store.getSnapshot().people.find(p=>p.displaySlot===principal.slotId);
 if(current)store.removePerson(current.id);
 assert.equal(store.savePerson(newPerson(principal,{name:'Hiệu trưởng thử'})).displaySlot,principal.slotId);
 const json=JSON.stringify({schemaVersion:1,people:store.getSnapshot().people});
 assert.ok(parseCatalogBackup(json,2026).some(p=>p.image==='idb:abcdef1234567890'));
});

test('Admin mode wiring: login gate, wall editor, real data with empty slots, no scene rebuild on save',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/PeopleApp.tsx',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../src/data/adminAuth.ts',import.meta.url),'utf8');
 assert.match(tour,/get\('preview'\)!=='off'&&!admin/);assert.match(tour,/key=\{'page-'\+layout\.page\}/);
 assert.match(tour,/<AdminSlotEditor /);assert.match(tour,/emptySlots=\{p\.admin\?p\.adminEmpties:undefined\}/);
 assert.match(app,/\.filter\(\(\[v\]\)=>v!=='admin'\|\|\(adminAvailable&&admin\)\)/);assert.ok(!app.includes('<SceneBoundary key={snapshot.revision}>'));
 assert.match(auth,/crypto\.subtle\.digest\('SHA-256'/);assert.ok(!/password\s*[:=]\s*['"][^'"]+['"]/i.test(auth),'no hard-coded password');
});
