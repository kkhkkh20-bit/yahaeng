({sid,alt=0,mobile=false})=>{
 const G=__game,check=(v,m)=>{if(!v)throw Error(m)},solid=new Set('#COFTKER~HUSNXZM QqPVAI'.replaceAll(' ',''));
 window.__randPick=alt;G.start(G.STAGES.findIndex(s=>s.id===sid));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
 const S=G.S,P=S.player,dt=1/60,trace=[];check(!S.exitOpen&&!S.over,'mission starts already completed');window.__flowTrace=trace;G.input.sneakToggle=false;G.input.walkLock=true;
 // Functional route checks freeze NPC simulation; separate live-AI tests cover disguise, detection and schedules.
 const stop=()=>{S.keys={};G.input.joy=null};
 const tick=()=>{S.t+=dt;G.updatePlayer(dt);G.updateKoHold();G.runTimers();};
 const settle=(n=20)=>{stop();for(let i=0;i<n;i++)tick()};
 const idle=()=>{stop();for(let i=0;i<1500&&(G.actionBusy()||P.pick||P.strikeT>0);i++)tick();check(!G.actionBusy()&&!P.pick,'action never finishes');settle(3)};
 const drive=(dx,dy)=>{stop();if(mobile){const n=Math.hypot(dx,dy);G.input.joy=n?{x:dx/n*.45,y:dy/n*.45,mag:.45}:null}else{S.keys.ArrowLeft=dx<-.1;S.keys.ArrowRight=dx>.1;S.keys.ArrowUp=dy<-.1;S.keys.ArrowDown=dy>.1}};
 const K=(x,y,f)=>f+':'+x+','+y;
 const grids=G.GF.slice();grids[0]=Array.from({length:G.MH},(_,y)=>Array.from({length:G.MW},(_,x)=>G.tileG(x,y)));
 const ds=new Map();for(const d of S.doors)ds.set(K(d.tx,d.ty,d.fl||0),d);
 const canDoor=d=>!d.locked||(!d.gate&&(d.keyLock==='code'||!d.keyLock||P.keys[d.keyLock]||P.picks>0));
 const pass=(x,y,f)=>{const g=grids[f];if(!g||!g[y]||g[y][x]===undefined)return false;const d=ds.get(K(x,y,f));return d?canDoor(d):!solid.has(g[y][x]);};
 const edges=new Map(),shaft=new Set();
 const add=(a,b,l,up)=>{const k=K(...a);if(!edges.has(k))edges.set(k,[]);edges.get(k).push({x:b[0],y:b[1],f:b[2],l,up})};
 for(const l of S.ladders.filter(l=>l.kind==='fstair')){
  const lo=G.stairFloor(l.tx,l.ty,l.bfl||0),hi=G.stairFloor(l.tx,l.ty,l.tfl),a=lo.compact?lo.shaft:lo.up.entry,b=hi.down.entry;
  const A=[Math.floor(a.x/48),Math.floor(a.y/48),l.bfl||0],B=[Math.floor(b.x/48),Math.floor(b.y/48),l.tfl];
  add(A,B,l,true);add(B,A,l,false);shaft.add(K(l.tx,l.ty,l.bfl||0));
 }
 for(const l of S.ladders.filter(l=>l.kind==='stair'))shaft.add(K(l.tx,l.ty,l.bfl||0));
 const plan=goals=>{
  const start={x:Math.floor(P.x/48),y:Math.floor(P.y/48),f:P.fl||0},key=K(start.x,start.y,start.f),want=new Set(goals.map(g=>K(g.x,g.y,g.f))),seen=new Map([[key,null]]),q=[start];
  let end=null;
  for(let i=0;i<q.length;i++){
   const n=q[i],k=K(n.x,n.y,n.f);if(want.has(k)){end=n;break}
   for(const e of [...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:n.x+dx,y:n.y+dy,f:n.f})),...(edges.get(k)||[])]){
    const kk=K(e.x,e.y,e.f);if(seen.has(kk)||!pass(e.x,e.y,e.f))continue;
    if(!e.l&&shaft.has(kk)&&!want.has(kk)&&!edges.has(kk))continue;
    seen.set(kk,{from:n,node:e});q.push(e);
   }
  }
  if(!end)return null;const r=[];for(let k=K(end.x,end.y,end.f);seen.get(k);){const v=seen.get(k);r.unshift(v.node);k=K(v.from.x,v.from.y,v.from.f)}return r;
 };
 const doDoor=d=>{
  const a=G.envChoices().find(a=>a.d===d||a.o?.d===d);check(a,'door has no action '+K(d.tx,d.ty,d.fl||0)+' at '+P.x+','+P.y+' '+G.envChoices().map(a=>a.k));
  check(['door','pick','keypad'].includes(a.k),'cannot open door '+a.k);trace.push('door '+d.tx+','+d.ty+' '+a.k);G.doAct(a);
  if(a.k==='keypad'){
   for(const v of G.STAGE.code)document.querySelector('#keypad [data-k="'+v+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));document.querySelector('#keypad [data-k="ok"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
   settle(30);check(!S.keypad&&!d.locked,'code did not open door');
  }else idle();
  check(!d.locked,'door remains closed');
 };
 const walk=(goals,label)=>{
  idle();let attempts=0;
  for(;attempts<8;attempts++){
   let path=plan(goals);check(path,'no route: '+label+' from '+K(Math.floor(P.x/48),Math.floor(P.y/48),P.fl||0)+' keys '+JSON.stringify(P.keys)+' picks '+P.picks);
   let replan=false;
   for(const n of path){
    if(n.l){const a=G.envChoices().find(a=>a.l===n.l&&a.k===(n.up?'up':'fdown'));check(a,'stair action missing '+label+' '+K(n.x,n.y,n.f)+' '+JSON.stringify({P:[P.x,P.y,P.fl,P.z],l:n.l,access:G.stairAccess(n.l,n.up),actions:G.envChoices().map(a=>[a.k,a.l?.tx,a.l?.ty])}));G.doAct(a);idle();continue}
    const d=ds.get(K(n.x,n.y,n.f));if(d?.locked)doDoor(d);
    const tx=n.x*48+24,ty=n.y*48+24;let moved=false;
    for(let frames=0;frames<180;frames++){
     const dx=tx-P.x,dy=ty-P.y;if(Math.hypot(dx,dy)<3){moved=true;break}
     drive(Math.abs(dx)>2?dx:0,Math.abs(dy)>2?dy:0);tick();
     if(P.trav||(P.fl||0)!==n.f||P.z){idle();replan=true;break}
    }
    stop();if(replan)break;check(moved,'blocked walking '+label+' '+K(n.x,n.y,n.f)+' actual '+P.x+','+P.y);
   }
   if(replan)continue;
   settle(10);check(goals.some(g=>g.f===(P.fl||0)&&Math.hypot(P.x-g.x*48-24,P.y-g.y*48-24)<5),'route ended elsewhere '+label);trace.push(label);return;
  }
  throw Error('unexpected stair loop '+label);
 };
 const at=o=>[{x:Math.floor(o.x/48),y:Math.floor(o.y/48),f:o.fl||0}];
 const approach=(g,r=40)=>{const goals=[];for(let y=Math.floor(g.y/48)-1;y<=Math.floor(g.y/48)+1;y++)for(let x=Math.floor(g.x/48)-1;x<=Math.floor(g.x/48)+1;x++)if(Math.hypot(x*48+24-g.x,y*48+24-g.y)<=r&&pass(x,y,g.fl||0)&&(g.target||Math.cos(Math.atan2(y*48+24-g.y,x*48+24-g.x)-g.a)<-.2))goals.push({x,y,f:g.fl||0});return goals};
 const attack=(g,lethal)=>{
  walk(approach(g),'approach '+g.id);P.a=Math.atan2(g.y-P.y,g.x-P.x);
  const a=G.attackAction();check((a.list||[a.g]).includes(g),'target not selected '+g.id+' '+JSON.stringify({k:a.k,at:[P.x,P.y],g:[g.x,g.y]}));
  S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();
  for(let i=0;i<(lethal?180:5);i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');idle();
  check(lethal?G.targetEliminated(g):!!g.unconscious,'wrong attack outcome '+g.id);if(S.keyDrop)walk(at(S.keyDrop),'key drop');trace.push((lethal?'kill ':'KO ')+g.id);
 };
 // Prioritize obtainable cards so the playthrough exercises their intended door pairings.
 for(const g of S.guards.filter(g=>g.hasKey))if(plan(approach(g,60))){if(g.target)attack(g,true);else{const key=g.hasKey;walk(approach(g,60),'approach '+g.id);const a=G.secondaryAction();check(a.k==='steal'&&a.g===g,'card theft not selectable');G.actCarry();idle();check(P.keys[key],'card theft failed');trace.push('steal '+key)}}
 for(const it of S.keyItems)if(!it.got&&plan(at(it)))walk(at(it),'key '+it.key);
 for(const it of S.items){
  walk(at(it),'objective '+S.items.indexOf(it));
  if(!it.got){const a=G.envChoices().find(a=>a.k==='loot'&&a.it===it);check(a,'objective has no physical loot action');G.doAct(a);idle();}
  check(it.got,'objective not taken');settle();check(S.exitOpen===(!S.items.some(i=>!i.got)&&!S.guards.some(g=>g.target&&!G.targetEliminated(g))),'exit condition inconsistent after loot');
 }
 for(const g of S.guards.filter(g=>g.target&&!G.targetEliminated(g)))attack(g,true);
 settle();check(S.exitOpen,'all objectives done but exit closed');
 const e=[];for(const exit of S.exits)for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++)if(Math.hypot(x*48+24-exit.x,y*48+24-exit.y)<exit.r-5&&pass(x,y,0))e.push({x,y,f:0});walk(e,'exit');settle();check(S.over&&S.exitOpen,'escape did not finish successfully '+JSON.stringify({over:S.over,success:S.success}));
 stop();return {sid,alt,mobile,objectives:S.items.length,targets:S.guards.filter(g=>g.target).length,seconds:Math.round(S.t),trace};
}
