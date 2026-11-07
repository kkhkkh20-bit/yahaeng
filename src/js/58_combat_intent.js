// 짧게 제압, 같은 입력을 계속 누를 때만 처치. 동작 중에도 처음 고른 대상과 입력을 유지한다.
const COMBAT_INPUTS = { skill:['KeyB','btnSkill'], atk: ['KeyZ', 'Space', 'btnAct'], env: ['KeyX', 'KeyE', 'btnCarry'], grab: ['KeyC', 'KeyQ', 'btnGrab'] };
const LETHAL_HOLD = 1;
function combatPress(id) {
  input.pressSerial = (input.pressSerial || 0) + 1;
  (input.pressIds || (input.pressIds = {}))[id] = input.pressSerial;
  feedbackInput(id);
}
function combatSource(group = 'atk') {
  const ids = COMBAT_INPUTS[group] || COMBAT_INPUTS.atk;
  const id = ids.find(id => id.startsWith('btn') ? $(id) && $(id).classList.contains('down') : S.keys[id]);
  return id ? { id, serial: (input.pressIds || {})[id] || 0 } : null;
}
function combatHeld(source) {
  if (!source || ((input.pressIds || {})[source.id] || 0) !== source.serial) return false;
  return source.id.startsWith('btn') ? !!($(source.id) && $(source.id).classList.contains('down')) : !!S.keys[source.id];
}
function combatRelease(id, cancelled=false) {
  if (!S) return;
  const q=S.player.followupAttack;if(q?.source.id===id){if(cancelled)S.player.followupAttack=null;else q.tap=true;}
  const approach=S.player.approachAttack;if(approach?.source.id===id){if(cancelled)S.player.approachAttack=null;else approach.tap=true;}
  if (S.koHold && S.koHold.source && S.koHold.source.id === id) S.koHold = null;
  if (S.player.lethalHold && S.player.lethalHold.source.id === id) S.player.lethalHold = null;
  if(S.player.finishPose?.wind&&S.player.finishPose.source?.id===id)S.player.finishPose=null;
  if(S.player.skillHold?.source.id===id){const h=S.player.skillHold;S.player.skillHold=null;if(!cancelled)releaseAssassinTap(h);}
  if (input.pressIds) delete input.pressIds[id];
}
function combatVictims(a) {
  if (!['kill','kill2','drop','ambush','pull','ventKill','execute','cap','drag','ledgeKill','pushOff','finish'].includes(a.k) && !a.kill) return [];
  return a.list || [a.g || (a.c && a.c.g) || a.kill || (['cap', 'execute', 'drag'].includes(a.k) && S.player.captive)].filter(Boolean);
}
function needsLethalHold(a) {
  return ['ledgeKill', 'pushOff', 'finish'].includes(a.k) || (a.k === 'trap' && a.tp && !!a.tp.t) || combatVictims(a).some(g => g.dog);
}
function combatLabel(a) {
  if (!a || a.k === 'none' || a.busy) return a;
  if (needsLethalHold(a)) return Object.assign({}, a, { label: a.k === 'finish' ? '기절한 대상 살해' : a.k === 'ledgeKill' ? '끌어내려 처치' : a.k === 'pushOff' ? '밀어 처치' : a.label, holdOnly: true, hold: a.k==='trap'?'고정 풀기':'살해' });
  if (['kill', 'kill2', 'drop', 'ambush', 'pull', 'ventKill', 'execute', 'cap', 'drag'].includes(a.k) || a.kill) {
    const label = a.k === 'drag' ? '먼저 기절시키기' : a.k === 'kill2' ? '동시 기절' : a.k === 'cap' || a.k === 'execute' ? (a.label||'기절') : (a.label || '기절').replace(/암살|처치/g, '기절');
    return Object.assign({}, a, { label:combatVictims(a).some(g=>g.target)?'표적 기절':label, hold: '살해' });
  }
  return a;
}
function prepareCombat(a) {
  if(['kill','kill2','grab'].includes(a.k)&&!(a.list||[a.g]).every(g=>g&&canKill(g,S.player)))return false;
  if(a.k!=='finish'&&!abilityOn('ambush')&&(['ambush','pull','ventKill','ledgeKill'].includes(a.k)||!concealedMeleeAllowed()&&(combatVictims(a).length||a.k==='grab'))){toast(abilityLockText('ambush'),2);return false;}
  const source = a.combatSource || combatSource(a.inputGroup || 'atk');
  if (needsLethalHold(a) && !a.confirmedHold) {
    if (source) {S.player.lethalHold = { a: Object.assign({}, a), source, targets: combatVictims(a).map(g => ({ g, fl: flOf(g), z: g.z || 0 })), t: 0, x: S.player.x, y: S.player.y, fl: flOf(S.player), z: S.player.z || 0 };if(a.k==='finish')beginFinishFeedback(a.c,source,true);}
    return false;
  }
  for (const g of combatVictims(a)) g.takedownIntent = { source, lethal: !!a.confirmedHold, container: a.k === 'drag' ? a.h : null, fieldSkill: a.k==='drop'?'drop':['ambush','pull','ventKill','ledgeKill'].includes(a.k)||concealedAttackSource()?'ambush':a.k==='kill'&&dist(S.player.x,S.player.y,g.x,g.y)>MELEE_CONTACT?'reach':null };
  return true;
}
function updateLethalHold(P, dt) {
  const h = P.lethalHold; if (!h) return false;
  const a = h.a, gs = combatVictims(a);
  const invalid = gs.some(g => g.child || (a.k !== 'finish' && g.state === 'DEAD') || (a.k === 'pushOff' && !g.climb) || (a.k==='ledgeKill'&&!ledgeTargetValid(g)) || (a.k === 'finish' ? !a.c.container && dist(P.x, P.y, a.c.x, a.c.y) > 60 : dist(P.x, P.y, g.x, g.y) > 180));
  const obscured = gs.some(g => a.k === 'finish' ? !a.c.container && !objectReachable(a.c, 60) : !los(P.x, P.y, g.x, g.y, Math.max(P.z || 0, g.z || 0)));
  if (a.k!=='finish'&&gs.length&&!concealedMeleeAllowed(P) || !combatHeld(h.source) || obscured || h.targets.some(v => flOf(v.g) !== v.fl || (v.g.z || 0) !== v.z) || invalid || flOf(P) !== h.fl || (P.z || 0) !== h.z || dist(P.x, P.y, h.x, h.y) > 10 || S.over) { P.lethalHold = null; return false; }
  if ((a.k === 'finish' && (!a.c || !a.c.ko)) || (a.k === 'trap' && (!a.tp.t || a.tp.t.used))) { P.lethalHold = null; return false; }
  P.vx = P.vy = 0; P.moving = false; h.t += dt;
  if (h.t >= LETHAL_HOLD) { P.lethalHold = null; actPrimary(Object.assign({}, a, { viaZ: true, confirmedHold: true, combatSource: h.source })); }
  return true;
}
function armKoHold(c, g, intent) {
  const source = intent && intent.source;
  if (!combatHeld(source)) return;
  const old = S.koHold;
  if (old && old.source.id === source.id && old.source.serial === source.serial && Math.abs(S.t - old.t0) < .05) old.bodies.push({ c, g });
  else S.koHold = { c, g, bodies: [{ c, g }], source, t0: intent?.pairStarted ?? S.t, px: S.player.x, py: S.player.y, fl: flOf(S.player), z: S.player.z || 0, container: intent && intent.container };
}
// The final part of a grapple accepts one follow-up, bound to this victim and press.
function canQueueGrabAttack(P = S.player) {
  const A=P.grabIn;return !!(A&&A.dur-A.t<=.2&&A.g.state==='CAPTIVE'&&!A.g.child);
}
function queueGrabAttack() {
  const P=S.player,source=combatSource('atk');if(!source||!canQueueGrabAttack(P))return;
  if(!P.attackQueue)P.attackQueue={g:P.grabIn.g,source,fl:flOf(P),z:P.z||0};
}
function runGrabAttack(P) {
  const q=P.attackQueue;P.attackQueue=null;
  if(!q||S.over||P.captive!==q.g||!S.guards.includes(q.g)||q.g.state!=='CAPTIVE'||dist(P.x,P.y,q.g.x,q.g.y)>64||flOf(P)!==q.fl||(P.z||0)!==q.z||flOf(q.g)!==q.fl||(q.g.z||0)!==q.z||!los(P.x,P.y,q.g.x,q.g.y,P.z||0))return;
  actPrimary({k:'execute',g:q.g,viaZ:true,inputGroup:'atk',combatSource:q.source});
}
function grabTarget() {
  const P = S.player;
  if (P.captive || P.carrying || P.hide || P.jump || P.trav || P.grabIn || P.wire || P.ledge || P.car || actionBusy(P)) return null;
  return killList().find(g => !g.elite && !g.dog) || null;
}
function targetEliminated(g) {
  return g.state === 'DEAD' && !g.unconscious && !S.corpses.some(c => c.ko && c.g === g);
}
function targetPosition(g) {
  return S.corpses.find(c => c.ko && c.g === g) || g;
}

function nearFinish() {
  const P = S.player; if (actionBusy(P) || P.carrying || P.captive || P.wire || P.ledge) return null;
  return S.corpses.filter(c => c.ko && c.g && flOf(c) === flOf(P) && (c.z || 0) === (P.z || 0) &&
    (c.container ? P.hide && c.container.x === P.hide.x && c.container.y === P.hide.y : !c.stashed && objectReachable(c, 46)))
    .sort((a,b) => dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0] || null;
}
function finishKo(c, g) {
  if (!c || !c.ko || !S.corpses.includes(c)) return;
  delete g.takedownIntent; c.ko = false; c.g = null; g.unconscious = false; S.stats.ko--; S.stats.kills++;
  if (g.target) {
    if(S.player.disguise&&!S.player.disguiseBlown)S.stats.disguiseKill=true;
    bossRadio('target', true);
    const left = S.guards.filter(o => o.target && !targetEliminated(o)).length;
    feedbackToast('takedown',left ? `표적 제거 · 남은 표적 ${left}` : '표적 제거 · 남은 목표 확인',1.8);
  } else if (g.civ) S.stats.extraKills++; else if (!g.dog) { S.stats.crewKills = (S.stats.crewKills || 0) + 1; killStreak(); if (S.stats.crewKills === 1) bossRadio('first'); }
  beginFinishFeedback(c,null);feedbackEvent('kill',c,{effect:'strike',scale:.32,lift:10});
  if(!g.target&&feedbackOnce('kill'))feedbackToast('takedown','살해 · 다시 깨어나지 않는다',1.7);
  logEv(g.target ? 'target' : 'kill', c.x, c.y); play('kill', .45); noise(c.x, c.y, 40, 'kill', c.fl);
}
