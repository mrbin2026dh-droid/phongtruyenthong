import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('17/11 tắt MC tạm thời: one switch hides every MC surface (welcome card, room button, narration button, admin caption)',()=>{
 assert.ok(src('data/features.ts').includes('export const MC_ENABLED=false;'));
 assert.ok(src('components/Welcome.tsx').includes('{MC_ENABLED&&<VirtualHost'));
 const tour=src('scene/HallTour.tsx');assert.ok(tour.includes('{MC_ENABLED&&ready&&')&&tour.includes("{MC_ENABLED&&icon(p.speaking?'Tắt lời dẫn':'Nghe giới thiệu','sound',audio)}"));
 assert.ok(src('PeopleApp.tsx').includes("{MC_ENABLED&&(view==='list'||view==='admin')&&!minimal&&<aside className=\"mc\">"));
});
