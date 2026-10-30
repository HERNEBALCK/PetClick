'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {windowBounds}=require('../src/window-state');
const primary={workArea:{x:0,y:0,width:1920,height:1040}},left={workArea:{x:-1280,y:0,width:1280,height:984}};
test('fixed quarter area ignores old zoom settings and starts bottom right',()=>{
 for(const scale of [.75,1,1.25])assert.deepEqual(windowBounds({scale,position:null},[primary],primary),{x:1736,y:847,width:160,height:169});
});
test('removed display and offscreen position are recovered',()=>{
 assert.equal(windowBounds({position:{x:-1100,y:100}},[primary],primary).x,1736);
 assert.deepEqual(windowBounds({position:{x:1900,y:1000}},[primary],primary),{x:1760,y:871,width:160,height:169});
});
test('negative multi-monitor position survives at fixed size',()=>{
 assert.deepEqual(windowBounds({position:{x:-1000,y:200}},[left,primary],primary),{x:-1000,y:200,width:160,height:169});
});
