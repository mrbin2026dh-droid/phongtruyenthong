import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLOW_MS,STALL_MS,loadProgress,loadStage,webglAvailable} from '../src/data/loadWatch.mjs';
import {assetProgressKey,imageStarted,markAssetReady} from '../src/scene/sceneAssets.ts';

const base={needRoom:true,roomReady:false,statueReady:false,imagesDone:0,imagesTotal:0};

test('Loading progress: weighted, never 100 %, room counts more than one portrait',()=>{
 assert.equal(loadProgress(base),0);
 assert.equal(loadProgress({...base,roomReady:true}),40);
 assert.equal(loadProgress({...base,statueReady:true}),15,'statue may finish first');
 assert.equal(loadProgress({...base,roomReady:true,statueReady:true,imagesDone:64,imagesTotal:128}),77);
 assert.equal(loadProgress({...base,roomReady:true,statueReady:true,imagesDone:128,imagesTotal:128}),99);
 assert.equal(loadProgress({...base,needRoom:false,statueReady:true,imagesDone:1,imagesTotal:2}),70);
});

test('Loading stage: tells the visitor what is being downloaded',()=>{
 assert.equal(loadStage(base),'Đang tải mô hình phòng');
 assert.equal(loadStage({...base,roomReady:true}),'Đang tải tượng Chu Văn An');
 assert.equal(loadStage({...base,roomReady:true,statueReady:true,imagesDone:3,imagesTotal:10}),'Đang tải ảnh chân dung (3/10)');
 assert.equal(loadStage({...base,roomReady:true,statueReady:true,imagesDone:10,imagesTotal:10}),'Đang dựng không gian 3D');
});

test('WebGL check: false when no context or creation throws, releases the probe context',()=>{
 let lost=false;
 const doc=ctx=>({createElement:()=>({getContext:ctx})});
 assert.equal(webglAvailable(doc(()=>null)),false);
 assert.equal(webglAvailable(doc(()=>{throw new Error('blocked');})),false);
 assert.equal(webglAvailable(doc(()=>({getExtension:()=>({loseContext:()=>{lost=true;}})}))),true);
 assert.ok(lost);
});

test('Asset progress key counts named assets and finished images',()=>{
 const before=assetProgressKey(['lw-room','lw-statue']).split('/').map(Number);
 const done=imageStarted();markAssetReady('lw-statue');
 let k=assetProgressKey(['lw-room','lw-statue']).split('/').map(Number);
 assert.deepEqual([k[0],k[1],k[3]-before[3]],[1,2,1]);
 done();k=assetProgressKey(['lw-room','lw-statue']).split('/').map(Number);
 assert.equal(k[2]-before[2],1);
});

test('No dead ends: slow/stalled loading, scene errors and missing WebGL all offer retry + photo list',()=>{
 const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
 assert.ok(SLOW_MS<=20000&&STALL_MS<=30000);
 const loading=src('components/VisitLoading.tsx'),app=src('PeopleApp.tsx'),hall=src('scene/HallTour.tsx');
 assert.ok(loading.includes('setTimeout(()=>setSlow(true),SLOW_MS)')&&loading.includes('Thử lại')&&loading.includes('Xem danh sách ảnh'));
 assert.ok(hall.includes('<HallLoading required={required} onList={p.onList}/>'));
 assert.ok(hall.includes('(assetsLoaded||(assetTimeout&&modelsReady))'),'timeout never reveals a scene without room + statue');
 assert.ok(app.includes('<VisitLoading onList={()=>navigate(\'list\')}/>'),'chunk download screen can also leave');
 assert.ok(app.includes('<SceneBoundary onList={()=>navigate(\'list\')}>')&&!app.includes('Tra cứu trên thanh đầu trang'),'public site has no header menu');
 assert.ok(app.includes("view==='room'&&!webgl&&")&&app.includes('webglAvailable(document)'));
 assert.ok(app.includes("minimal&&view==='list'?<div className=\"list-back\">"),'public list has a way back');
});
