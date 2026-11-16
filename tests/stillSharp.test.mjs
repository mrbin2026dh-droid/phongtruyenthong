import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dprFor,stillDpr,STILL_DELAY} from '../src/scene/quality.mjs';

test('Standing still renders one frame at the screen resolution (sharp portraits), moving stays light',()=>{
 assert.equal(dprFor('medium',3),1.15);assert.equal(stillDpr('medium',3),2.5,'phone 3× screen: 2.5× when still');
 assert.equal(stillDpr('high',2),2);assert.equal(stillDpr('low',3),1.75);assert.equal(stillDpr('medium',1),1,'1× screens unchanged');
 for(const l of ['high','medium','low'])for(const d of [1,1.25,2,2.6,3])assert.ok(stillDpr(l,d)>=dprFor(l,d),'never blurrier than moving');
 assert.ok(STILL_DELAY>=150&&STILL_DELAY<=400);
 const probe=readFileSync(new URL('../src/scene/PerfProbe.tsx',import.meta.url),'utf8');
 assert.ok(probe.includes('timer.current=setTimeout(sharpen,STILL_DELAY)')&&probe.includes('if(still.current){still.current=false;setDpr(dprFor('),'sharp after stopping, back to the light resolution on the next moving frame');
});
