// Real cache/render helpers with controlled canvases: prevent recurring tile
// bakes, empty pixel readbacks, and omitted near furniture at cell boundaries.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,'src/js',p),'utf8');
let rect=[0,0,4095,4095],bakes=0;
const C=vm.createContext({console,Set,Map,WeakMap,Math,window:{matchMedia:()=>({matches:true})},matchMedia:()=>({matches:true}),document:{getElementById:()=>({getContext:()=>({})}),createElement:()=>({getContext:()=>({})})},viewRect:m=>[rect[0]-(m-60),rect[1]-(m-60),rect[2]+2*(m-60),rect[3]+2*(m-60)]});
let s=read('30_state.js');vm.runInContext(s.slice(0,s.indexOf('// 하수도 · 환풍구')),C);
C.bake=()=>{bakes++;return{width:1024,height:1024}};
vm.runInContext('var B=lazyBig(12288,12288,bake);var fill=()=>{for(const k of bigViewTiles(B))B.get(k);};fill();',C);
assert.equal(bakes,16);for(let i=0;i<90;i++)vm.runInContext('fill();prefetchBig(B)',C);
assert.equal(bakes,16,'stationary wide view/prefetch repeatedly rebakes visible tiles');
// A near-view ring larger than the budget must also settle, even when the
// actual displayed set is smaller. Otherwise optional prefetch churns forever.
rect=[1100,1100,2800,2800];vm.runInContext('var narrow=lazyBig(12288,12288,bake);for(const k of bigViewTiles(narrow))narrow.get(k);for(let i=0;i<40;i++)prefetchBig(narrow)',C);const ringBakes=bakes;
for(let i=0;i<90;i++)vm.runInContext('prefetchBig(narrow)',C);assert.equal(bakes,ringBakes,'oversized prefetch ring rebakes forever');
rect=[4096,4096,4095,4095];vm.runInContext('fill()',C);const afterMove=bakes;
for(let i=0;i<60;i++)vm.runInContext('fill();prefetchBig(B)',C);
assert.equal(bakes,afterMove,'driving to a second view does not settle');assert.equal(vm.runInContext('B.live.length',C),16);
rect=[0,0,100,100];vm.runInContext('fill()',C);assert(vm.runInContext('B.live.length',C)<=14,'walking cache does not return to its budget');
let roofs=0;C.buildRoofCanvas=()=>({width:100,height:100,id:++roofs});
vm.runInContext('var buildings=Array.from({length:71},(_,i)=>{const b={};lazyRoof(b,i);return b});for(let i=0;i<70;i++)void buildings[i].roofC;var first=buildings[0].roofC;void buildings[70].roofC;',C);
assert.equal(vm.runInContext('buildings[0].roofC===first',C),true,'recently used roof was evicted');
C.TILE=48;C.flOf=o=>o.fl||0;C.FURN=[];s=read('36_prop_finish.js');vm.runInContext(s.slice(s.indexOf('let furnitureOcclusionIndex='),s.indexOf('function withFurnitureOcclusion')),C);
for(let i=0;i<120;i++)C.FURN.push({x:(i*17)%90-5,y:(i*23)%90-5,w:i%4+1,h:i%3+1,t:i%2?'desk':'chair',fl:i%3});
let checked=0;for(const f of C.FURN)for(const dx of [-25,-.01,0,47,100])for(const dy of [-52,-.01,0,45,90]){
 const a={x:f.x*48+dx,y:f.y*48+dy,fl:f.fl};
 if(a.y>=(f.y+f.h)*48-5||a.x+25<f.x*48||a.x-25>(f.x+f.w)*48||a.y+12<f.y*48-40)continue;
 C.actor=a;assert(vm.runInContext('furnitureOccluders(actor)',C).includes(f),'near furniture missing at a bucket/floor boundary');checked++;
}
C.FURN.push({x:200,y:200,w:1,h:1,t:'desk',fl:0});C.actor={x:9600,y:9600,fl:0};assert(vm.runInContext('furnitureOccluders(actor)',C).includes(C.FURN.at(-1)),'furniture addition leaves stale index');
let pixels=0,draws=0;const P=vm.createContext({STAGE:{cityLife:true},S:{player:{x:0,y:0},t:1},pixelize:(_x,_y,_w,_h,fn)=>{pixels++;fn()},flOf:o=>o.fl||0,inView:()=>true,npcAlive:g=>g.state!=='DEAD',bldAt:()=>-1});
for(const n of ['drawCopGear','drawCrewBike','drawCarriedParcel','drawCuffs','drawElevDoors','drawScene','drawDamageDirection','drawNuisance'])P[n]=()=>draws++;
s=read('47zv_city_pixel.js');vm.runInContext(s.slice(s.indexOf('const pixWrap'),s.indexOf('// 바닥 핏자국')),P);
vm.runInContext("drawCopGear({x:0,y:0,state:'PATROL'});drawCrewBike({});drawCarriedParcel();drawCuffs();drawDamageDirection(S.player)",P);
assert.equal(pixels,0,'inactive equipment still allocates/reads pixel canvas');assert.equal(draws,0);
vm.runInContext("drawCopGear({x:0,y:0,state:'PATROL',police:true});drawCrewBike({x:0,y:0,state:'PATROL',crew:{kind:'bike'}});S.job={kind:'parcel',got:true};drawCarriedParcel();S.cuffs={t:1};drawCuffs();S.player.damageFeedback={until:2,angle:0};drawDamageDirection(S.player)",P);
assert.equal(pixels,5);assert.equal(draws,5,'active equipment feedback disappeared');
console.log(`PASS runtime stability: tile residency/prefetch, roof LRU, ${checked} furniture boundaries, inactive/active pixel effects`);
