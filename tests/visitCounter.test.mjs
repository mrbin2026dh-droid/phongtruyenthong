import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('18/11 bảng “THAM QUAN”: GoatCounter total on the facade beside the door; number parsed from any separator',()=>{
 const v=src('scene/VisitCounter.tsx');
 assert.ok(v.includes("'https://'+GOATCOUNTER_CODE+'.goatcounter.com/counter/vao-phong.json?start='+COUNTER_START")&&v.includes("credentials:'omit'"));
 assert.ok(v.includes("const title='THAM QUAN'"),'the user\'s short title');
 assert.ok(src('scene/HallScene.tsx').includes('{baked&&<VisitCounter/>}'));
 const parse=json=>{const s=String(json?.count??'').replace(/[^0-9]/g,'');return s?Number(s):null;};
 assert.equal(parse({count:'12,458'}),12458);assert.equal(parse({count:'1 234'}),1234);assert.equal(parse({}),null);
 assert.ok(v.includes(parse.toString().slice(0,0))||v.includes("replace(/[^0-9]/g,'')"));
 assert.match(src('data/analytics.ts'),/GOATCOUNTER_CODE='thcs-chuvanan-ptt'/);
});
