// 짧게 제압, 같은 입력을 계속 누를 때만 처치. 동작 중에도 처음 고른 대상과 입력을 유지한다.
const COMBAT_INPUTS = { atk: ['KeyZ', 'Space', 'btnAct'], env: ['KeyX', 'KeyE', 'btnCarry'], grab: ['KeyC', 'KeyQ', 'btnGrab'] };
const LETHAL_HOLD = 1;
function combatPress(id) {
  input.pressSerial = (input.pressSerial || 0) + 1;
  (input.pressIds || (input.pressIds = {}))[id] = input.pressSerial;
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
function combatRelease(id) {
  if (!S) return;
  if (S.koHold && S.koHold.source && S.koHold.source.id === id) S.koHold = null;
  if (S.player.lethalHold && S.player.lethalHold.source.id === id) S.player.lethalHold = null;
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
  if (needsLethalHold(a)) return Object.assign({}, a, { label: a.k === 'finish' ? '기절한 대상 처치' : a.k === 'ledgeKill' ? '끌어내려 처치' : a.k === 'pushOff' ? '밀어 처치' : a.label, holdOnly: true, hold: '처치' });
  if (['kill', 'kill2', 'drop', 'ambush', 'pull', 'ventKill', 'execute', 'cap', 'drag'].includes(a.k) || a.kill) {
    const label = a.k === 'drag' ? hideName(a.h) + '으로 끌고 가 기절' : a.k === 'kill2' ? '동시 기절' : a.k === 'cap' || a.k === 'execute' ? '기절' : (a.label || '기절').replace(/암살|처치/g, '기절');
    return Object.assign({}, a, { label, hold: '처치' });
  }
  return a;
}
function prepareCombat(a) {
  const source = a.combatSource || combatSource(a.inputGroup || 'atk');
  if (needsLethalHold(a) && !a.confirmedHold) {
    if (source) S.player.lethalHold = { a: Object.assign({}, a), source, targets: combatVictims(a).map(g => ({ g, fl: flOf(g), z: g.z || 0 })), t: 0, x: S.player.x, y: S.player.y, fl: flOf(S.player), z: S.player.z || 0 };
    return false;
  }
  for (const g of combatVictims(a)) g.takedownIntent = { source, lethal: !!a.confirmedHold, container: a.k === 'drag' ? a.h : null };
  return true;
}
function updateLethalHold(P, dt) {
  const h = P.lethalHold; if (!h) return false;
  const a = h.a, gs = combatVictims(a);
  const invalid = gs.some(g => g.child || (a.k !== 'finish' && g.state === 'DEAD') || (a.k === 'pushOff' && !g.climb) || (a.k === 'finish' ? !a.c.container && dist(P.x, P.y, a.c.x, a.c.y) > 60 : dist(P.x, P.y, g.x, g.y) > 180));
  const obscured = gs.some(g => a.k === 'finish' ? !a.c.container && !objectReachable(a.c, 60) : !los(P.x, P.y, g.x, g.y, Math.max(P.z || 0, g.z || 0)));
  if (!combatHeld(h.source) || obscured || h.targets.some(v => flOf(v.g) !== v.fl || (v.g.z || 0) !== v.z) || invalid || flOf(P) !== h.fl || (P.z || 0) !== h.z || dist(P.x, P.y, h.x, h.y) > 10 || S.over) { P.lethalHold = null; return false; }
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
  else S.koHold = { c, g, bodies: [{ c, g }], source, t0: S.t, px: S.player.x, py: S.player.y, fl: flOf(S.player), z: S.player.z || 0, container: intent && intent.container };
}
function grabTarget() {
  const P = S.player;
  if (P.captive || P.carrying || P.hide || P.jump || P.trav || P.grabIn || P.wire || P.ledge || P.car || actionBusy(P)) return null;
  return killList().find(g => !g.elite && !g.dog) || null;
}
function targetEliminated(g) {
  return g.state === 'DEAD' && !g.unconscious && !S.corpses.some(c => c.ko && c.g === g);
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
  if (g.target) bossRadio('target', true); else if (g.civ) S.stats.extraKills++; else if (!g.dog) { S.stats.crewKills = (S.stats.crewKills || 0) + 1; killStreak(); if (S.stats.crewKills === 1) bossRadio('first'); }
  logEv(g.target ? 'target' : 'kill', c.x, c.y); play('kill', .45); noise(c.x, c.y, 40, 'kill', c.fl);
}
