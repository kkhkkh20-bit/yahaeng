// Source ownership must survive slow loads, stage changes and download failure.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/js/runtime/sprite_sources.js','utf8');
const context=vm.createContext({});vm.runInContext(source+';this.factory=createSpriteSources;',context);
(async()=>{
 const images=[];let clock=0;
 const store=context.factory({a:{src:'a'},b:{src:'b'}},()=>{const img={width:64,height:128};images.push(img);return img;},()=>clock);
 const first=store.load('a');assert.equal(store.load('a'),first);assert.equal(images.length,1);
 store.retain(['b']);images[0].onload();assert.equal(await first,null);assert.equal(store.loaded.a,undefined);
 const second=store.load('b');images[1].onload();await second;assert.equal(store.snapshot().decodedRgbaEstimate,64*128*4);
 store.retain(['a']);assert.equal(Object.keys(store.loaded).length,0);
 const failed=store.load('a');images[2].onerror();assert.equal(await failed,null);
 await store.load('a');assert.equal(images.length,3,'failed sources must back off');
 clock=3001;const retry=store.load('a');assert.equal(images.length,4);images[3].onload();assert.ok(await retry);assert.ok(store.loaded.a);
 assert.equal(await store.load('missing'),null);assert.equal(images.length,4);
 console.log('PASS sprite source ownership, deduplication, late-load discard, release, failure backoff and retry');
})().catch(e=>{console.error(e);process.exitCode=1});
