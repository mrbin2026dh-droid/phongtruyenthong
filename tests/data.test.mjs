import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalize,listMembers,workYears} from '../src/data/model.mjs';
const seed=JSON.parse(readFileSync(new URL('../src/data/legacy-seed.json',import.meta.url)));
test('Bảo tồn 96 mã và danh sách từng thời kỳ của mã nguồn gốc',()=>{const d=normalize(seed);assert.equal(new Set(d.people.map(p=>p.id)).size,96);for(const t of d.periods)assert.deepEqual(listMembers(d,t.id).map(m=>m.person.id),seed.people.filter(p=>p.periods.includes(t.id)).map(p=>p.id));assert.equal(new Set(d.memberships.map(m=>m.id)).size,d.memberships.length);});
test('Sửa hồ sơ một lần cập nhật mọi thời kỳ, không đổi vai trò lịch sử',()=>{const d=normalize(seed);const original=d.people.find(p=>p.id==='GV001');const role=d.memberships[0].roleInPeriod;original.status='Đã nghỉ hưu';original.endYear=2026;original.role='Cố vấn';for(const t of d.periods){const m=listMembers(d,t.id).find(m=>m.person.id==='GV001');assert.equal(m.person,original);assert.equal(m.person.status,'Đã nghỉ hưu');assert.equal(m.membership.roleInPeriod,role);}assert.equal(workYears(original),'1990 – 2026');});
test('Gỡ liên kết không xóa người; không suy diễn nay khi nghỉ hưu thiếu năm',()=>{const d=normalize(seed);d.memberships=d.memberships.filter(m=>m.id!=='TK01_GV001');assert.ok(d.people.some(p=>p.id==='GV001'));assert.ok(listMembers(d,'TK02').some(m=>m.person.id==='GV001'));assert.equal(workYears({startYear:1990,endYear:null,status:'Đã nghỉ hưu'}),'1990 – chưa xác định năm kết thúc');});
