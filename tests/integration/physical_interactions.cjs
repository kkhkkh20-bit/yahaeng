/* Execute the actual interaction functions in isolated scenes. Browser journeys
 * separately verify native input, rendering, collision maps and mission flow. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const slice=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,'missing source boundary '+a);return s.slice(i,j);};
const kit=read('src/js/graphics/kit.js');
const looks=slice(kit,'const charOf =','// ---- 프리렌더 배경');
const sprite=read('src/js/graphics/sprite_sheets.js');
const stripped=slice(sprite,'const strippedKey =','const pairCarry =');
const gait=slice(read('src/js/45_player.js'),'function advancePlayerGait(','// 바닥 재질:');
function scene(){
 const P={x:0,y:0,a:0,fl:0,z:0,mode:'walk',hurtT:0,stepT:0,strikeT:0,moving:false};
 const q={Math,Set,Object,Number,Infinity,console,
  S:{player:P,t:10,keys:{},stats:{},corpses:[],guards:[],hides:[],bushes:[],notes:[],knownLooks:{},alevel:0,usesDone:{}},
  STAGE:{pspd:1,disguise:true,zones:[[0,0,99,99,'pub']]},CUR_F:0,TILE:48,MW:100,
  SPD:{walk:100,sneak:65,run:140},MAT:{},OUTFIT_PAL:{crew:true},BLD:[],PLANS:[],
  PR:{style:'modular',looks:{crew:'maleWorker'},bodies:{male:true,fBob:true},bodyGender:{fBob:'female',male:'male'}},
  window:{__PR:true},input:{joy:null},hudCache:{},ACT_SKIP:new Set(),running:true,paused:false,tactical:false,RC:null,
  effects:[],sounds:[],toasts:[],collision:()=>{},ray:d=>d,
  dist:(x,y,a,b)=>Math.hypot(x-a,y-b),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),angDiff:(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a)),flOf:o=>o.fl||0,
  setLayer:()=>{},solidFor:()=>()=>false,solidAt:()=>false,bldAt:()=>-1,groundedWorld:()=>true,
  surfacePoint:o=>({x:o.x,y:o.y}),surfaceFixture:o=>o,
  withJosa:s=>s,play:()=>{},hint:()=>{},after:()=>{},gsay:()=>{},bossRadio:()=>{},rnd:(a,b)=>(a+b)/2,
  prSplit:k=>(k||'').split('@'),lightAt:()=>1,tileAt:()=>'.',floorMul:()=>1,stepSound:()=> 'step',pairCarry:()=>true,
  nearHide:()=>null,nearBushSpot:()=>null,nearCorpse:()=>null,beginHideFlow:()=>{P.trav={hideFlow:{}};return true;},hideSpace:()=>true,hideApproach:()=>({length:24}),hideDistance:()=>24,
  electricalActionAllowed:()=>true,actObj:a=>a.p||a.d||a.l||a.targetObject||a.c,
  closeEnvPicker:()=>{},finishEnvSelection:()=>{},contactFeedback:()=>{},
  logEv:()=>{},vipHitContext:()=>null,witnessedAssailant:()=>null,facWitness:()=>{},cityVictim:()=>{},spawnEffect:()=>{},armKoHold:()=>{},
  setIcon:()=>{},rememberSuspect:()=>{},startReport:()=>false,civScream:()=>{},goAlert:g=>g.state='ALERT'
 };
 q.collide=P=>q.collision(P);q.castRay=(x,y,a,d)=>q.ray(d);q.noise=(...a)=>q.sounds.push(a);q.toast=t=>q.toasts.push(t);
 q.actPrimary=a=>{q.effects.push(a.k);if(a.p)a.p.taken=true;if(a.d)a.d.locked=!a.d.locked;};
 q.takeProp=p=>{p.taken=true;P.item=p;};
 vm.createContext(q);
 vm.runInContext([looks,stripped,gait,read('src/js/38_zones.js'),read('src/js/59_interaction_flow.js'),read('src/js/interaction/carry.js'),read('src/js/interaction/takedown.js'),
  'globalThis.api={charOf,outfitOf,stripBodyClothing,bodyName,actCarry,secondaryAction,beginQuickStash,updateQuickStash,actionBusy,wakeKO,koPerson,objectApproachPoint,beginObjectAction,updateObjectAction,updateSharpEye};'].join('\n'),q);
 q.P=P;q.tick=(s,dt=.01)=>{for(let t=0;t<s-1e-8;t+=dt){q.S.t+=dt;if(P.interact)q.api.updateObjectAction(P,dt);}};
 return q;
}
let passed=0;
function check(name,run){run();passed++;console.log('PASS',name);}
check('stripped uniform stays removed after wake and a second knockout',()=>{
 const q=scene(),g={x:24,y:0,fl:0,z:0,kind:'g1',outfit:'crew',state:'DEAD'},c={g,ch:'crew',outfit:'crew',x:24,y:0,fl:0,z:0,ko:true};
 q.S.corpses=[c];q.api.actCarry({k:'dress',c});q.tick(2.9);assert(!c.stripped);q.tick(.15);assert.equal(c.stripped,true);q.api.wakeKO(c);
 assert.equal(q.api.charOf(g),'strip@male');assert.equal(q.api.outfitOf(g),null);assert.equal(g.state,'SEARCH');
 q.api.koPerson(g);const next=q.S.corpses[0];assert.equal(next.stripped,true);assert.equal(next.outfit,null);assert.equal(next.ch,'strip@male');
});
check('old checkpoints repair stripped clothing and preserve body shape',()=>{
 const q=scene(),g={x:0,y:0,kind:'civ',civ:true,body:'fBob',outfit:'staff'},c={g,ch:'staff@fBob',stripped:true,ko:true,x:24,y:0,fl:0,z:0};
 q.S.corpses=[c];q.api.wakeKO(c);assert.equal(q.api.charOf(g),'strip@fBob');assert.equal(q.api.outfitOf(g),null);
});
check('unstripped colleague keeps their own uniform after wake',()=>{
 const q=scene(),g={kind:'g1',outfit:'crew'},c={g,ch:'crew',ko:true,x:24,y:0};
 q.S.corpses=[c];q.api.wakeKO(c);assert.equal(q.api.outfitOf(g),'crew');assert.equal(g.stripped,undefined);
});
check('carry lift and grounded drop retain nonlethal identity',()=>{
 const q=scene(),c={x:24,y:0,a:0,ch:'crew',ko:true,fl:0,z:0};q.S.corpses=[c];
 q.api.actCarry({k:'carry',c});assert.equal(q.P.carrying,c);assert.equal(q.P.bodyAnim.dur,.7);
 q.P.strikeT=0;q.S.t+=.69;assert.equal(q.api.actionBusy(),true);q.S.t+=.02;assert.equal(q.api.actionBusy(),false);
 q.api.actCarry({k:'carry',c});assert.equal(q.P.carrying,null);assert.equal(q.P.bodyAnim.dur,.6);assert.equal(c.ko,true);
 assert(q.toasts.at(-1).includes('기절자'));assert(!q.toasts.at(-1).includes('시체'));
});
check('body projectiles are unavailable and old queued throws are harmless',()=>{
 const q=scene(),c={x:0,y:0,ch:'crew',ko:true,carried:true};q.P.carrying=c;q.S.corpses=[c];q.S.guards=[{x:200,y:0,state:'PATROL',fl:0}];
 assert.equal(q.api.secondaryAction(true).k,'carry');q.api.actCarry({k:'throwBody',g:q.S.guards[0]});
 assert.equal(q.P.carrying,c);assert.equal(c.carried,true);assert.equal(c.fly,undefined);
});
check('quick storage waits for the full lift',()=>{
 const q=scene(),c={x:24,y:0,ch:'crew',fl:0,z:0},h={x:24,y:24,type:'box'};q.S.corpses=[c];q.S.hides=[h];
 q.api.beginQuickStash({c,h});assert.equal(q.P.carrying,c);assert(q.P.quickStash.readyAt>=q.S.t+q.P.bodyAnim.dur);
});
check('quick storage keeps waiting through the last busy lift frame',()=>{
 const q=scene(),c={x:24,y:0,ch:'crew',fl:0,z:0},h={x:24,y:24,type:'box'};q.S.corpses=[c];q.S.hides=[h];
 q.api.beginQuickStash({c,h});q.S.t+=.7001;q.P.strikeT=.02;q.api.updateQuickStash(q.P,.005);
 assert(q.P.quickStash);assert.equal(q.P.trav,undefined);q.S.t+=.02;q.api.updateQuickStash(q.P,.02);assert(q.P.trav?.hideFlow?.quick);
});
check('distant pickup approaches physically before its single contact effect',()=>{
 const q=scene(),p={x:60,y:0,fl:0};q.api.beginObjectAction({k:'pickup',p});
 assert(q.P.interact.approach);assert.equal(q.P.x,0);q.tick(.08);assert(q.P.x>0&&q.P.x<32);assert.equal(q.effects.length,0);
 q.tick(1);assert.equal(q.P.x,32);assert.equal(q.effects.length,1);assert.equal(p.taken,true);assert.equal(q.P.interact,null);assert(q.sounds.some(n=>n[3]==='step'));
});
check('near pickup uses the existing contact beat without extra movement',()=>{
 const q=scene(),p={x:24,y:0,fl:0};q.api.beginObjectAction({k:'pickup',p});
 assert.equal(q.P.interact.approach,null);q.tick(.24);assert.equal(q.effects.length,0);q.tick(.04);assert.equal(q.effects.length,1);assert.equal(q.P.x,0);
});
check('a wall surface sets the approach stop before the wall',()=>{
 const q=scene();q.ray=()=>34;
 const at=q.api.objectApproachPoint({k:'lamp'},{x:44,y:0});assert.equal(at.x,6);
});
check('approach collision cancels without teleport or remote acquisition',()=>{
 const q=scene(),p={x:60,y:0,fl:0};q.collision=P=>P.x=0;q.api.beginObjectAction({k:'pickup',p});q.tick(.1);
 assert.equal(q.P.x,0);assert.equal(q.P.interact,null);assert.equal(p.taken,undefined);assert.equal(q.effects.length,0);
});
check('low frame rates still collide in short substeps',()=>{
 const q=scene(),p={x:60,y:0,fl:0};q.collision=P=>{if(P.x>=10)P.x=9;};q.api.beginObjectAction({k:'pickup',p});q.tick(.3,.1);
 assert(q.P.x<=9);assert.equal(q.effects.length,0);assert.equal(p.taken,undefined);
});
check('moved targets cannot finish a queued hand action',()=>{
 const q=scene(),p={x:60,y:0,fl:0};q.api.beginObjectAction({k:'pickup',p});p.x=160;q.tick(.1);assert.equal(q.P.interact,null);assert.equal(q.effects.length,0);
});
check('external displacement, damage and floor changes cancel contact',()=>{
 for(const change of [q=>q.P.x+=30,q=>q.P.hurtT=.2,q=>q.P.fl=1]){
  const q=scene(),p={x:60,y:0,fl:0};q.api.beginObjectAction({k:'pickup',p});change(q);q.tick(.6);assert.equal(q.effects.length,0);assert.equal(q.P.interact,null);
 }
});
check('an existing injury does not block a fresh action, but a new hit interrupts it',()=>{
 const q=scene(),p={x:24,y:0,fl:0};q.P.hurtT=.5;q.api.beginObjectAction({k:'pickup',p});q.tick(.5);assert.equal(p.taken,true);
 const next={x:24,y:0,fl:0};q.api.beginObjectAction({k:'pickup',p:next});q.P.hurtT=.8;q.tick(.5);assert.equal(next.taken,undefined);
});
check('door handle and clothing actions keep their existing authored position',()=>{
 const q=scene(),d={x:60,y:0,fl:0,locked:true};q.api.beginObjectAction({k:'door',d});assert.equal(q.P.interact.approach,null);
 q.tick(.35);assert.equal(d.locked,true);q.tick(.06);assert.equal(d.locked,false);assert.equal(q.P.x,0);
 assert.equal(q.api.objectApproachPoint({k:'dress'},{x:40,y:0}),null);
});
check('ordinary guards never identify an innocent uniform by walking or standing',()=>{
 for(const moving of [false,true]){const q=scene();Object.assign(q.P,{x:80,a:Math.PI,outfit:'crew',disguise:'sam',moving});const g={x:0,y:0,state:'PATROL',outfit:'crew'};
  for(let n=0;n<240;n++)q.api.updateSharpEye(g,.05,1);assert(!q.P.disguiseBlown);assert.equal(g.eyeT,0);}
});
check('marked colleagues allow passers and gradually forget an existing check',()=>{
 const q=scene();Object.assign(q.P,{x:80,a:Math.PI,outfit:'crew',disguise:'sam',moving:true});const g={id:1,x:0,y:0,state:'PATROL',outfit:'crew',enforcer:true};
 for(let n=0;n<240;n++)q.api.updateSharpEye(g,.05,1);assert.equal(g.eyeT,0);assert.equal(g.eyeWatching,false);
 q.P.moving=false;q.api.updateSharpEye(g,.8,1);const seen=g.eyeT;q.P.moving=true;q.api.updateSharpEye(g,.1,1);
 assert(g.eyeT>0&&g.eyeT<seen);assert.equal(g.eyeWatching,false);assert(!q.P.disguiseBlown);
 for(let n=0;n<40;n++)q.api.updateSharpEye(g,.05,1);assert.equal(g.eyeT,0);
 q.P.moving=false;for(let n=0;n<64;n++)q.api.updateSharpEye(g,.05,1);assert.equal(q.P.disguiseBlown,true);assert.equal(g.state,'ALERT');
});
console.log('PASS physical interaction logic:',passed,'groups');
