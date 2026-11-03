// The new equipment uses the existing throw/aim input and physical world layer.
const EXTRA_TOOLS={kunai:{skill:'dart',name:'다트'},blade:{skill:'kunai',name:'쿠나이'},smoke:{skill:'smoke',name:'연막탄'},radio:{skill:'radio',name:'무전기'},hack:{skill:'hack',name:'해킹기'}};
const availableTools=()=>TOOLS.filter(t=>!EXTRA_TOOLS[t]||abilityOn(EXTRA_TOOLS[t].skill));
const deviceReady=t=>t==='radio'?!S.player.hasRadio||S.t>=(S.radioReadyAt||0):t==='hack'?S.t>=(S.hackReadyAt||0):true;
function toolDetail(t){
 if(S.player.techWork)return S.player.techWork.kind==='hack'?'해킹 '+Math.floor(S.player.techWork.t/1.5*100)+'%':'무전기 확보 중';
 if(t==='blade')return '길게 · 살상 투척';
 if(t==='smoke')return skillOn('smokeMix')?'시선 차단 8초':'시선 차단 5초';
 if(t==='radio')return !S.player.hasRadio?'쓰러진 무전 담당에게 접근':!deviceReady(t)?'재사용 '+Math.ceil(S.radioReadyAt-S.t)+'초':'겨눈 위치로 점검 지시';
 if(t==='hack')return !deviceReady(t)?'재사용 '+Math.ceil(S.hackReadyAt-S.t)+'초':hackTarget()?'CCTV 해킹 · 1.5초':'같은 층 CCTV를 겨누기';
 return t==='kunai'?'길게 처치':'';
}
function actBlade(lethal=false){
 if(!skillOn('kunai'))return false;if(!lethal){toast('쿠나이는 살상 도구다 · 1초 이상 눌렀다 떼기',2);return false;}
 const P=S.player,t=kunaiTarget('blade');if(!canAim()||!t||!(P.blades>0))return false;
 P.blades--;S.stats.bladesUsed=(S.stats.bladesUsed||0)+1;P.a=Math.atan2(t.y-P.y,t.x-P.x);
 S.throwT=S.t+.7;S.kunais.push({x0:P.x,y0:P.y,t:0,dur:.08+dist(P.x,P.y,t.x,t.y)/1400,tgt:{...t,fl:flOf(t.ref),z:t.ref.z||0},fl:flOf(P),z:P.z||0,lethal:true,weapon:'blade'});play('kunai',.45);return true;
}
function smokeCells(at,r){
 const f0=CUR_F;setLayer(flOf(at));const cells={},queue=[[Math.floor(at.x/TILE),Math.floor(at.y/TILE)]],queued=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length&&i<100;i++){const[tx,ty]=queue[i],key=tx+','+ty;if(cells[key]||!inMap(tx,ty)||groundSolidP(tx,ty)||dist(at.x,at.y,tc(tx),tc(ty))>r+TILE*.6)continue;cells[key]=true;for(const[dx,dy]of N8.slice(0,4)){const k=(tx+dx)+','+(ty+dy);if(!queued.has(k)){queued.add(k);queue.push([tx+dx,ty+dy]);}}}
 setLayer(f0);return cells;
}
function actSmoke(pt){
 const P=S.player;if(!skillOn('smoke')||!canAim()||P.z||!(P.smokes>0)||(S.smokeThrows||[]).length>=3)return false;
 const target=pt||P,a=Math.atan2(target.y-P.y,target.x-P.x),d=Math.min(220,dist(P.x,P.y,target.x,target.y)),L0=CUR_F;setLayer(flOf(P));
 const reach=Math.max(0,Math.min(d,castRay(P.x,P.y,a,d)-12)),at={x:P.x+Math.cos(a)*reach,y:P.y+Math.sin(a)*reach,fl:flOf(P),z:0};setLayer(L0);
 P.smokes--;S.smokeThrows=S.smokeThrows||[];S.smokeThrows.push({x:P.x,y:P.y,at,t0:S.t,dur:.25+reach/500,r:skillOn('smokeMix')?112:96,life:skillOn('smokeMix')?8:5});S.throwT=S.t+.6;S.stats.smokesUsed=(S.stats.smokesUsed||0)+1;play('throw',.3);return true;
}
function updateSkillDevices(){
 for(const s of S.smokeThrows||[])if(!s.done&&S.t-s.t0>=s.dur){s.done=true;const at=s.at,c={...at,r:s.r,t0:S.t,until:S.t+s.life,cells:smokeCells(at,s.r)};S.smokes.push(c);if(S.smokes.length>3)S.smokes.shift();S.smokeSerial=(S.smokeSerial||0)+1;noise(at.x,at.y,140,'smoke',at.fl,0);play('land',.3);}
 S.smokeThrows=(S.smokeThrows||[]).filter(s=>!s.done);const count=S.smokes.length;S.smokes=S.smokes.filter(s=>s.until>S.t);if(S.smokes.length!==count)S.smokeSerial=(S.smokeSerial||0)+1;
}
function smokeContains(s,x,y){return !!s.cells[Math.floor(x/TILE)+','+Math.floor(y/TILE)]&&dist(x,y,s.x,s.y)<=s.r;}
function smokeRayRange(o,x,y,range=dist(o.x,o.y,x,y)){
 const d=dist(o.x,o.y,x,y);if(d<.01)return range;const dx=(x-o.x)/d,dy=(y-o.y)/d;let best=range;
 for(const s of S.smokes||[]){
  if(s.until<=S.t||flOf(s)!==flOf(o)||(s.z||0)!==(o.z||0))continue;
  const vx=s.x-o.x,vy=s.y-o.y,along=vx*dx+vy*dy,side=Math.max(0,vx*vx+vy*vy-along*along);if(side>s.r*s.r)continue;
  const span=Math.sqrt(s.r*s.r-side),entry=Math.max(0,along-span),exit=Math.min(d,along+span,best);if(entry>exit)continue;
  for(let t=entry;t<=exit+.001;t+=Math.min(8,Math.max(1,(exit-entry)/2))){if(smokeContains(s,o.x+dx*t,o.y+dy*t)){best=Math.min(best,t);break;}}
 }return best;
}

function radioAcquireTarget(){
 const P=S.player;if(P.hasRadio)return null;
 for(const c of S.corpses){const g=c.g||S.guards.find(g=>g.id===c.guardId);if(g?.radio&&!c.carried&&!c.stashed&&objectReachable(c,48))return{c,g};}
 return null;
}
function hackTarget(){
 const P=S.player;if(!skillOn('hack')||P.z)return null;const r=skillOn('signal')?180:120;
 return(S.cams||[]).filter(c=>camOn(c)&&!c.search&&flOf(c)===flOf(P)&&(c.z||0)===(P.z||0)&&objectReachable(c,r)&&Math.abs(angDiff(P.a,Math.atan2(c.y-P.y,c.x-P.x)))<.9).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0]||null;
}
function beginTechWork(kind,target){
 if(!canAim()||!deviceReady(kind))return false;const P=S.player;
 P.techWork={kind,target,x:P.x,y:P.y,fl:flOf(P),z:P.z||0,t:0};P.vx=P.vy=0;P.moving=false;P.a=Math.atan2(target.y-P.y,target.x-P.x);return true;
}
function actRadio(pt){
 const P=S.player;if(!skillOn('radio')||!canAim())return false;
 if(!P.hasRadio){const a=radioAcquireTarget();if(!a){toast('쓰러진 무전 담당 경비 옆에서 무전기를 확보해야 한다',2.5);return false;}return beginTechWork('radio',a.c);}
 if(!deviceReady('radio')||!(P.radioCharges>0)){toast(toolDetail('radio'),2);return false;}
 const at=pt||{x:P.x+Math.cos(P.a)*120,y:P.y+Math.sin(P.a)*120},f0=CUR_F;setLayer(flOf(P));let chosen=null;
 if(!groundSolidP(Math.floor(at.x/TILE),Math.floor(at.y/TILE)))for(const g of S.guards.filter(g=>g.radio&&!g.civ&&!g.dog&&!g.target&&!g.elite&&!g.doomed&&!g.climb&&flOf(g)===flOf(P)&&!(g.z||0)&&['PATROL','RETURN'].includes(g.state)&&dist(g.x,g.y,at.x,at.y)<420).sort((a,b)=>dist(a.x,a.y,at.x,at.y)-dist(b.x,b.y,at.x,at.y))){
  const route=astar(Math.floor(g.x/TILE),Math.floor(g.y/TILE),Math.floor(at.x/TILE),Math.floor(at.y/TILE),npcRouteSolid(g));if(route.length||dist(g.x,g.y,at.x,at.y)<TILE){chosen=g;break;}
 }
 if(chosen){endChat(chosen);goSuspicious(chosen,at.x,at.y,6);chosen.why='radio';gsay(chosen,'통로 점검 지시 확인. 이동한다.',2.4);P.radioCharges--;S.radioReadyAt=S.t+30;S.throwT=S.t+.7;S.stats.radioDecoys=(S.stats.radioDecoys||0)+1;play('call',.3);toast('경비 한 명이 점검 지시를 받았다',2);}else toast('같은 층에 점검 지시를 받을 경비나 연결된 경로가 없다',2.2);
 setLayer(f0);return !!chosen;
}
function actHack(){
 if(!canAim()||!skillOn('hack')||!S.player.hackDevice)return false;if(!deviceReady('hack')){toast(toolDetail('hack'),2);return false;}const c=hackTarget();if(!c){toast('같은 층에서 가까운 CCTV를 겨눠야 한다',2);return false;}return beginTechWork('hack',c);
}
function updateTechWork(P,dt){
 const w=P.techWork;if(!w)return false;
 const target=w.target,r=w.kind==='radio'?48:skillOn('signal')?180:120;
 if(P.hurtT>0||dist(P.x,P.y,w.x,w.y)>8||flOf(P)!==w.fl||(P.z||0)!==w.z||!objectReachable(target,r)||w.kind==='hack'&&(!S.cams.includes(target)||!camOn(target))||w.kind==='radio'&&(!S.corpses.includes(target)||target.carried||target.stashed)) {P.techWork=null;toast('장비 작업 중단',1.5);return false;}
 P.vx=P.vy=0;P.moving=false;P.light=lightAt(P.x,P.y);P.hidden=false;w.t+=dt;
 if(w.t>=(w.kind==='hack'?1.5:1)){
  if(w.kind==='radio'){P.hasRadio=true;if(!S.skillGrants.radio){P.radioCharges=2;S.skillGrants.radio=true;}toast('무전기 확보 · 도구를 다시 사용해 점검 위치를 지시',2.6);}
  else{target.hackedUntil=S.t+(skillOn('signal')?15:10);target.meter=0;S.hackReadyAt=S.t+25;S.stats.hacks=(S.stats.hacks||0)+1;spawnEffect('hack',{x:target.x,y:target.y,fl:flOf(target),z:0},{scale:.85});toast('CCTV 일시 정지 · 기존 녹화 기록은 남아 있다',2.5);}
  P.techWork=null;play('switch',.3);syncTools();
 }return true;
}
function drawSkillDevices(P,openB){
 for(const s of S.smokes||[]){if(flOf(s)!==flOf(P)||s.until<=S.t||P.z||!inView(s.x,s.y,s.r))continue;
  ctx.save();ctx.beginPath();let cells=0;for(const key of Object.keys(s.cells)){const[tx,ty]=key.split(',').map(Number),b=bldAt(tx,ty);if(b>=0&&b!==openB)continue;ctx.rect(tx*TILE,ty*TILE,TILE,TILE);cells++;}if(!cells){ctx.restore();continue;}ctx.clip();
  ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.clip();
  const fade=clamp((s.until-S.t)/.8,0,1)*clamp((S.t-s.t0)/.25,0,1),meta=FX_META?.effects.smoke;ctx.globalAlpha=.66*fade;
  for(let i=0;i<3;i++){
   const a=i*TAU/3,dx=Math.cos(a)*s.r*.18,dy=Math.sin(a)*s.r*.12;
   if(meta&&fxAtlas?.complete&&fxAtlas.naturalWidth){const phase=1.7+clamp((S.t-s.t0)/(s.until-s.t0),0,1)*1.25+i*.08,rect=meta.frames[Math.min(meta.frames.length-1,Math.floor(phase*meta.fps))];ctx.drawImage(fxAtlas,...rect,s.x-s.r*1.3+dx,s.y-s.r*1.2+dy,s.r*2.6,s.r*2.6);}
   else blit(ctx,'fx_smoke',s.x-s.r+dx,s.y-s.r+dy,s.r*2,s.r*2,Math.floor((S.t-s.t0)*8)%6*32,0,32,32);
  }ctx.restore();
  if(smokeContains(s,P.x,P.y))drawPlayerLocator(P);

 }
 for(const s of S.smokeThrows||[])if(flOf(s.at)===flOf(P)){const f=clamp((S.t-s.t0)/s.dur,0,1),x=s.x+(s.at.x-s.x)*f,y=s.y+(s.at.y-s.y)*f-Math.sin(f*Math.PI)*30;ctx.fillStyle='#a5ada2';ctx.fillRect(x-3,y-5,6,10);}
 if(input.aiming&&input.tool==='hack'){const c=hackTarget();if(c){ctx.strokeStyle='#bdc9ae';ctx.lineWidth=1.5;ctx.strokeRect(c.x-13,c.y-17,26,26);}}
 for(const c of S.cams||[])if(c.hackedUntil>S.t&&flOf(c)===flOf(P)&&dist(P.x,P.y,c.x,c.y)<220&&inView(c.x,c.y)){ctx.fillStyle='#c8d5bd';ctx.font=uiFont(11);ctx.textAlign='center';ctx.fillText('정지 '+Math.ceil(c.hackedUntil-S.t)+'초',c.x,c.y-24);}
}
