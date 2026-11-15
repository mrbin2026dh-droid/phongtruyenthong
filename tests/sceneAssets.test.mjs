import test from 'node:test';
import assert from 'node:assert/strict';
import {markAssetReady,imageStarted,sceneAssetsLoaded,pendingImages} from '../src/scene/sceneAssets.ts';

test('Asset gate: waits for named assets and every started image; finishing twice is harmless',()=>{
 assert.equal(sceneAssetsLoaded(['baked','statue']),false);
 const a=imageStarted(),b=imageStarted();markAssetReady('baked');markAssetReady('statue');
 assert.equal(sceneAssetsLoaded(['baked','statue']),false);a();a();assert.equal(pendingImages(),1);
 b();assert.equal(sceneAssetsLoaded(['baked','statue']),true);
});
