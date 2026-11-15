import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stickVector,writeStick,resetStick} from '../src/scene/stickInput.mjs';
test('Joystick có vùng chết, không trôi khi ở tâm và chặn độ lớn tối đa',()=>{
 for(const [x,y] of [[0,0],[2,-1]])assert.deepEqual(stickVector(x,y,30),{x:0,y:0,px:0,py:0});
 const v=stickVector(100,-100,30);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-10);assert.ok(Math.abs(Math.hypot(v.px,v.py)-30)<1e-10);
 assert.deepEqual(stickVector(NaN,1,30),{x:0,y:0,px:0,py:0});
});
test('Kéo xa tăng tốc tuyến tính sau vùng chết; đi chéo không nhanh hơn',()=>{
 const low=stickVector(0,-12,30),high=stickVector(0,-30,30),diagonal=stickVector(30,-30,30);
 assert.ok(low.y<0&&Math.abs(low.y)<Math.abs(high.y));assert.equal(high.y,-1);
 assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-Math.abs(high.y))<1e-10);
});
test('Hai cần độc lập: nhả cần nhìn không ngắt di chuyển của ngón còn lại',()=>{
 const input={forward:0,strafe:0,turn:0,look:0};
 writeStick(input,'move',stickVector(0,-30,30));writeStick(input,'look',stickVector(30,-30,30));
 assert.equal(input.forward,1);assert.ok(input.turn<0&&input.look>0);
 resetStick(input,'look');assert.equal(input.forward,1);assert.equal(input.turn,0);assert.equal(input.look,0);
 resetStick(input,'move');assert.equal(input.forward,0);assert.equal(input.strafe,0);
});
