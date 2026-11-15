import test from 'node:test';
import assert from 'node:assert/strict';
import {CABINETS,CABINET_NICHE as n,cabinetWallPieces,HALL} from '../src/scene/hallLayout.mjs';
test('Recesses leave actual openings, preserve entrance, and fill the surrounding wall without overlaps',()=>{
 const pieces=cabinetWallPieces();
 for(const p of pieces){assert.ok(p.width>0&&p.height>0);assert.ok(p.x-p.width/2>=2-1e-9&&p.x+p.width/2<=12+1e-9);}
 for(const c of CABINETS)for(const p of pieces){const overlapX=Math.min(c.x+n.width/2,p.x+p.width/2)-Math.max(c.x-n.width/2,p.x-p.width/2);const overlapY=Math.min(n.top,p.y+p.height/2)-Math.max(n.bottom,p.y-p.height/2);assert.ok(overlapX<=1e-9||overlapY<=1e-9);}
 const filled=pieces.reduce((a,p)=>a+p.width*p.height,0)+CABINETS.length*n.width*(n.top-n.bottom);assert.ok(Math.abs(filled-10*HALL.height)<1e-9);
 for(let i=1;i<CABINETS.length;i++)assert.ok(CABINETS[i].x-CABINETS[i-1].x>n.width+n.frame);
 assert.ok(n.bottom>.58&&n.top<3.32&&n.depth<.6);
});
