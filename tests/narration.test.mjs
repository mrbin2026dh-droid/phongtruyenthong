import test from 'node:test';
import assert from 'node:assert/strict';
import {vietnameseVoice} from '../src/data/narration.mjs';
test('MC chọn giọng Việt cục bộ, không đọc bằng giọng Anh khi thiếu giọng Việt',()=>{
 const local={lang:'vi-VN',localService:true},remote={lang:'vi_VN',localService:false};
 assert.equal(vietnameseVoice([{lang:'en-US'},remote,local]),local);
 assert.equal(vietnameseVoice([remote]),remote);
 assert.equal(vietnameseVoice([{lang:'en-US'}, {lang:'de-DE'}]),null);
 assert.equal(vietnameseVoice([]),null);
});

import {hallNarration} from '../src/data/narration.mjs';
test('MC introduces the selected zone without inventing achievements or duplicating people',()=>{
 for(const group of ['principal','deputy','teacher','staff'])assert.match(hallNarration({group}),/minh họa/);
 assert.match(hallNarration({group:'teacher'}),/một hồ sơ gốc/);
 assert.match(hallNarration({group:'memory',title:'Tư liệu',description:'Lưu giữ ký ức'}),/chưa phải thành tích được xác nhận/);
 assert.match(hallNarration(null,{displayed:120,mockCount:24}),/96 hồ sơ mẫu và 24 mẫu bổ sung/);
});
