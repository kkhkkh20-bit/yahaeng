// Presentation consumes committed events; it never emits gameplay noise or grants access.
const FEEDBACK_LEVEL={ko:1,kill:2,hurt:2,death:3,stash:1,dress:1,loot:2,pickup:1,light:1,record:2,camCut:1,camClear:2,arrival:1,skill:1};
const feedbackMemo=new WeakMap();
function feedbackState(){let f=feedbackMemo.get(S);if(!f){f={recent:new Map(),events:[],receipts:new Map()};feedbackMemo.set(S,f);}return f;}
function feedbackOnce(key){
 let seen;try{seen=JSON.parse(localStorage.getItem(progressKey('yahaeng.feedbackSeen'))||'{}');}catch(e){seen={};}
 if(seen[key])return false;seen[key]=true;try{localStorage.setItem(progressKey('yahaeng.feedbackSeen'),JSON.stringify(seen));}catch(e){}return true;
}
function feedbackToast(channel,text,seconds=1.5,kind='good'){
 S.toasts=S.toasts.filter(t=>t.channel!==channel);toast(text,seconds,kind);if(S.toasts.length)S.toasts.at(-1).channel=channel;
}
function feedbackPulse(el,key){if(!el)return;el.dataset.feedback=key;el.classList.remove('feedback-pulse');void el.offsetWidth;el.classList.add('feedback-pulse');}
function hapticFeedback(kind){
 if(!isTouch||typeof navigator.vibrate!=='function'||document.hidden)return false;
 try{if(localStorage.getItem('yahaeng.haptic')!=='1')return false;}catch(e){return false;}
 const now=performance.now(),f=feedbackState();if(now-(f.hapticAt??-1000)<120)return false;
 const pattern=kind==='hurt'?[18,25,18]:kind==='death'?[24,30,30]:kind==='kill'?16:kind==='record'?12:null;
 if(!pattern)return false;f.hapticAt=now;try{return navigator.vibrate(pattern);}catch(e){return false;}
}
function initHapticPreference(){
 const row=$('hapticSetting'),button=$('btnHaptic');if(!row||!button)return;
 row.hidden=!isTouch||typeof navigator.vibrate!=='function';
 const update=()=>{let on=false;try{on=localStorage.getItem('yahaeng.haptic')==='1';}catch(e){}button.textContent=on?'켜짐':'꺼짐';button.setAttribute('aria-pressed',String(on));};
 update();button.onclick=()=>{const on=button.getAttribute('aria-pressed')!=='true';try{localStorage.setItem('yahaeng.haptic',on?'1':'0');}catch(e){}update();if(on)hapticFeedback('kill');};
}
function feedbackEvent(kind,at=S.player,options={}){
 if(!S||!at)return false;const f=feedbackState(),key=kind+':'+(options.key??at.guardId??at.id??`${Math.round(at.x)},${Math.round(at.y)}`),last=f.recent.get(key);
 if(last!=null&&S.t-last<.16)return false;
 f.recent.set(key,S.t);if(f.recent.size>64)f.recent.delete(f.recent.keys().next().value);
 const event={kind,t:S.t,x:at.x,y:at.y,fl:flOf(at),z:at.z||0,level:FEEDBACK_LEVEL[kind]||0,label:options.label||''};f.events.push(event);if(f.events.length>24)f.events.shift();
 f.receipts.set(kind,{...event,until:S.t+(options.duration||1)});
 if(options.sound)sfx(options.sound);hapticFeedback(kind);
 if(options.effect){spawnEffect(options.effect,{...event,y:at.y-(options.lift||0)},{scale:options.scale??.45,alpha:options.alpha??.7});if(!fxAtlas?.complete||!fxAtlas.naturalWidth)S.contact={...event};}
 if(options.text)feedbackToast(options.channel||kind,options.text,options.seconds||1.5,options.warning?'warn':'good');
 if(['loot','camClear','kill'].includes(kind))feedbackPulse(document.querySelector('#hud .obj'),kind);
 return true;
}
function feedbackReceipt(kind){const r=feedbackState().receipts.get(kind);return r&&r.until>=S.t?r:null;}
function cancelWork(P,reason='이동해서 작업 중단'){
 const active=P.pick||P.interact;if(!active)return false;
 const committed=!!P.interact?.committed;P.pick=null;P.interact=null;P.moving=false;RC=null;
 if(!committed)feedbackToast('work',reason,1.4,'warn');else finishEnvSelection();return true;
}
function workMovementRequested(){return (input.joy?.mag||0)>.25||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>S.keys[k]);}
function drawCorpseStatus(c){
 const P=S.player;if(c.carried||c.stashed||c.hideT>S.t||!c.playerHandled||flOf(c)!==flOf(P)||(c.z||0)!==(P.z||0)||dist(P.x,P.y,c.x,c.y)>104)return;

 const k=1/SCALE,x=c.x+18*k,y=c.y-8*k;ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#101820eb';ctx.beginPath();ctx.arc(x,y,9*k,0,TAU);ctx.fill();ctx.strokeStyle=c.ko?'#a9d2de':'#df9488';ctx.lineWidth=1.5*k;
 if(c.ko){ctx.font=uiFont(10*k);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#b8dbe4';ctx.fillText('Zz',x,y);}
 else{ctx.beginPath();ctx.moveTo(x-3*k,y-3*k);ctx.lineTo(x+3*k,y+3*k);ctx.moveTo(x+3*k,y-3*k);ctx.lineTo(x-3*k,y+3*k);ctx.stroke();}ctx.restore();
}
function drawNearbyBodyStatus(P,openB){
 let closest=null,best=104;
 for(const c of S.corpses){if(!c.playerHandled||c.carried||c.stashed||c.skillAnimating||c.hideT>S.t||flOf(c)!==flOf(P)||(c.z||0)!==(P.z||0)||roofOccludes(c,openB))continue;const d=dist(P.x,P.y,c.x,c.y);if(d<best){best=d;closest=c;}}
 if(closest)drawCorpseStatus(closest);
}
function guardTaskCue(g){
 if(g.state==='ALERT'||g.seen||knownFace(g))return null;
 if(g.relight||g.lightNoticeUntil>S.t)return'light';if(investigationReadout(g).kind==='sound'||g.state==='LURE')return'sound';return null;
}
function drawGuardTaskCue(g){
 const task=guardTaskCue(g);if(!task)return false;
 const k=Math.max(1,.9/SCALE),x=g.x,y=g.y-40*k;ctx.save();ctx.strokeStyle=task==='light'?'#d4c6a5':'#9ebbc8';ctx.fillStyle='#11191fec';ctx.lineWidth=1.6*k;ctx.beginPath();ctx.arc(x,y,10*k,0,TAU);ctx.fill();
 if(task==='light'){ctx.beginPath();ctx.arc(x,y-2*k,4*k,Math.PI*.15,Math.PI*2.85);ctx.moveTo(x-2*k,y+3*k);ctx.lineTo(x+2*k,y+3*k);ctx.moveTo(x-2*k,y+6*k);ctx.lineTo(x+2*k,y+6*k);ctx.stroke();}
 else{ctx.beginPath();ctx.moveTo(x-4*k,y+2*k);ctx.lineTo(x-4*k,y-2*k);ctx.moveTo(x,y-5*k);ctx.quadraticCurveTo(x+7*k,y,x,y+5*k);ctx.moveTo(x+3*k,y-7*k);ctx.quadraticCurveTo(x+12*k,y,x+3*k,y+7*k);ctx.stroke();}ctx.restore();return true;
}
function beginFinishFeedback(c,source,wind=false){
 const P=S.player;if(P.killAnim)return;P.finishPose={c,source,wind,t0:S.t,dur:wind?1:.24,x:P.x,y:P.y,fl:flOf(P),z:P.z||0};P.a=Math.atan2(c.y-P.y,c.x-P.x);warmFluidPose(playerKey(P),'workLow');warmFluidPose(playerKey(P),'finish');
}
function drawFinishFeedback(P){
 const f=P.finishPose;if(!f)return false;
 if(f.fl!==flOf(P)||f.z!==(P.z||0)||P.carrying||P.hide||P.trav||P.pick||P.interact||P.moving||dist(P.x,P.y,f.x,f.y)>8||f.wind&&!combatHeld(f.source)||!f.wind&&S.t-f.t0>f.dur){P.finishPose=null;return false;}
 if(P.killAnim)return false;const t=clamp((S.t-f.t0)/f.dur,0,1),key=playerKey(P),meta=PR.bodies[prSplit(key)[1]]||PR,n=meta.anims.openLow?.[1]||17,frame=f.wind?Math.min(.55,t)*Math.max(1,n-1):(1-t)*.55*Math.max(1,n-1);
 if(!f.wind&&prBodies[fluidSource(key,'finish')]){drawPR(key,P.x,P.y,P.a,'finish',0,1,1,0,t*8);return true;}
 drawPR(key,P.x,P.y,P.a,'openLow',0,1,1,0,frame);return true;
}
function beginDefeatFeedback(P){
 P.defeat={t0:performance.now(),x:P.x,y:P.y,a:P.a};P.trav=null;P.killAnim=null;P.assassinAnim=null;P.finishPose=null;P.hide=null;
 feedbackEvent('death',P);warmFluidPose(playerKey(P),'death');
}
function drawDefeatFeedback(P){
 if(!P.defeat)return false;const d=P.defeat,f=reducedFxMotion.matches?1:clamp((performance.now()-d.t0)/550,0,1),key=playerKey(P),m=PR.bodies[prSplit(key)[1]]||PR,n=m.anims.death?.[1]||10;
 drawPR(key,d.x,d.y,d.a,'death',0,1,1,0,Math.round(f*(n-1)));return true;
}
function rememberDamage(P,from){
 P.damageFeedback={t:S.t,oldHp:P.hp,until:S.t+.45,angle:from?Math.atan2(from.y-P.y,from.x-P.x):null};
 feedbackEvent('hurt',P);feedbackPulse($('hpBox'),'hurt');
}
function syncDamagePips(P){
 const d=P.damageFeedback,pips=hud.hp.children;for(let i=0;i<pips.length;i++)pips[i].classList.toggle('lost',!!d&&S.t<d.until&&i>=P.hp&&i<d.oldHp);
}
function drawDamageDirection(P){
 const d=P.damageFeedback;if(!d||d.until<S.t||d.angle==null||P.defeat)return;
 ctx.save();ctx.globalAlpha=clamp((d.until-S.t)/.45,0,1);ctx.strokeStyle='#ed8a7b';ctx.lineWidth=2.5/SCALE;ctx.beginPath();ctx.arc(P.x,P.y-16,25,d.angle-.38,d.angle+.38);ctx.stroke();ctx.restore();
}
function cameraRecordedFeedback(c,reason){c.recordUntil=S.t+1.5;c.recordReason=reason;feedbackEvent('record',c,{label:reason,sound:'terminal'});}
function settleHideFeedback(F){
 if(F.receipted||!F.committed||!['stash','drag'].includes(F.kind))return;
 F.receipted=true;feedbackEvent('stash',F.h,{text:feedbackOnce('stash')?'흔적 은폐 완료 · 몸을 숨겼다':undefined,seconds:1.2});
}
function feedbackInput(id){
 const entry=Object.entries(COMBAT_INPUTS).find(([,ids])=>ids.includes(id));if(!entry)return;
 const b=$(entry[0]==='atk'?'btnAct':entry[0]==='env'?'btnCarry':entry[0]==='grab'?'btnGrab':'btnSkill');
 if(b){feedbackPulse(b,'input');if(b.classList.contains('ready'))sfx('actionTap');}
}
let resultTrainingTimer=null;
function clearResultTransition(){if(resultTrainingTimer!=null)clearTimeout(resultTrainingTimer);resultTrainingTimer=null;}
function continueResultTraining(){clearResultTransition();return openEpisodeTraining();}
function queueResultTraining(){
 clearResultTransition();if(!S?.over||$('end').dataset.win!=='1'||!LEARNING_ROUTE.includes(STAGE.id))return;
 const run=S,delay=reducedFxMotion.matches?350:S.resultFresh===false?350:850;
 $('end').dataset.phase='complete';$('btnNext').hidden=false;$('btnNext').textContent='기술 익히고 다음 의뢰';
 resultTrainingTimer=setTimeout(()=>{resultTrainingTimer=null;if(S!==run||!S.over||$('end').hidden||!$('skillScreen').hidden)return;openEpisodeTraining();},delay);
}
