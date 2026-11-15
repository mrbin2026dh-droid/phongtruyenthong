import test from 'node:test';import assert from 'node:assert/strict';
import {isStaleModuleError} from '../src/data/sceneFailure.mjs';
test('Lỗi tải chunk được phân biệt với lỗi WebGL hoặc lỗi mã',()=>{
 assert.equal(isStaleModuleError('Failed to fetch dynamically imported module: http://127.0.0.1:4173/assets/GuidedTour-i4F365S3.js'),true);
 assert.equal(isStaleModuleError('error loading dynamically imported module'),true);
 assert.equal(isStaleModuleError('Error creating WebGL context.'),false);
 assert.equal(isStaleModuleError("Cannot read properties of undefined (reading 'eye')"),false);
});
