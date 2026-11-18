import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {displayName,validatePerson,createCatalogStore} from '../src/data/catalog.mjs';
const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
const pub=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8')).people;

test('18/11 xưng hô: “Thầy …”/“Cô …” before the name; every published person has one',()=>{
 assert.equal(displayName({honorific:'Thầy',name:'Phan Văn Tuấn'}),'Thầy Phan Văn Tuấn');
 assert.equal(displayName({honorific:'Cô',name:'Phùng Thị Thu'}),'Cô Phùng Thị Thu');
 assert.equal(displayName({honorific:'',name:'Lê A'}),'Lê A');assert.equal(displayName({honorific:'Ông',name:'Lê A'}),'Lê A','only Thầy/Cô');
 assert.ok(pub.every(p=>p.honorific==='Thầy'||p.honorific==='Cô'));
 const p=pub[0];assert.equal(validatePerson({...p,honorific:'xx'}).honorific,'');
});

test('18/11 xưng hô: an old admin working copy takes it from the published data; shown in profile, list, nameplates, BGH plaque',()=>{
 const old={schemaVersion:1,layout:2,people:pub.map(({honorific,...rest})=>rest)};
 const mem=new Map([['school-museum-catalog-v1',JSON.stringify(old)]]);
 const s=createCatalogStore(null,{storage:{getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},published:pub});
 assert.ok(s.getSnapshot().people.every(p=>p.honorific===pub.find(q=>q.id===p.id).honorific));
 const app=src('PeopleApp.tsx');assert.ok(app.includes('title={displayName(person)}')&&app.includes('<b>{displayName(p)}</b>'));
 assert.ok(src('scene/BlenderMuseum.tsx').includes('fillText(label?displayName(person)'));
 assert.ok(src('scene/HallScene.tsx').includes('x.fillText(displayName(slot.person),600,108,1120);'));
 assert.ok(src('components/AdminSlotEditor.tsx').includes('<label>Xưng hô<select'));
});
