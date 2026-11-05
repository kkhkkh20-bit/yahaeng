// Most objectives are recoverable objects; authored terminal work uses the same
// interruptible action and checkpoint progress, with explicit prerequisite text.
const itemObjectiveAction = it => STAGE.itemActions?.[S.items.indexOf(it)] || null;
const itemObjectiveText = (it,verb=STAGE.itemVerb||'훔치기') => itemObjectiveAction(it)?.label || ((STAGE.itemNames||[])[S.items.indexOf(it)]||STAGE.itemName||'서류')+' '+verb;
function lootPlace(it, only) {  // only: 지정한 가구 종류만, 같은 건물 안에서 접근할 수 있는 자리를 찾는다
  const f0 = it.fl || 0, g = f0 ? GF[f0] : G0, tx0 = Math.floor(it.x / TILE), ty0 = Math.floor(it.y / TILE), b0 = bldAt(tx0, ty0); let best = null, bs = 1e9;
  for (const F of FURN) {
    if ((F.fl || 0) !== f0 || !LOOT[F.t] || F.w * F.h > 4 || (only && !only.includes(F.t))) continue;
    const cx = (F.x + F.w / 2) * TILE, cy = (F.y + F.h / 2) * TILE, d = dist(cx, cy, it.x, it.y); if ((!only && d > 4.2 * TILE) || bldAt(F.x, F.y) !== b0) continue;
    let st = null, sd = 1e9; for (let y = F.y - 1; y <= F.y + F.h; y++) for (let x = F.x - 1; x <= F.x + F.w; x++) { if (x >= F.x && x < F.x + F.w && y >= F.y && y < F.y + F.h) continue; if ((x === F.x - 1 || x === F.x + F.w) && (y === F.y - 1 || y === F.y + F.h)) continue; if (g[y] && !SOLID.has(g[y][x]) && g[y][x] !== 'Y' && bldAt(x, y) === b0) { const e = Math.hypot(x - tx0, y - ty0); if (e < sd) { sd = e; st = [x, y]; } } }  // 원래 물건 자리에서 가장 가까운 옆 칸에 선다
    if (!st) continue; const sc = d + LOOT_PREF.indexOf(F.t) * 40; if (sc < bs) { bs = sc; best = { F, st, cx, cy }; }
  }
  if (!best) return;
  it.furn = best.F.t; it.dx = best.cx; it.dy = best.cy - 6; it.x = tc(best.st[0]); it.y = tc(best.st[1]);
}
function nearLoot() {
  const P = S.player; if (P.z || P.carrying || P.captive || P.hide || P.vent || P.under) return null;
  let best = null, bd = Infinity;
  for (const it of S.items) {
    if (ACT_SKIP.has(it) || it.got || !it.furn || flOf(it) !== flOf(P)) continue;
    const stand = dist(P.x, P.y, it.x, it.y), face = { x: it.dx, y: it.dy + 6, fl: flOf(it) }, d = dist(P.x, P.y, face.x, face.y);
    if (((stand < 34 && objectReachable(it, 34)) || objectReachable(face, 58)) && Math.min(stand, d) < bd) { best = it; bd = Math.min(stand, d); }
  }
  return best;
}
function itemObjectiveBlock(it){const A=itemObjectiveAction(it);return A?.requiresKey&&!S.player.keys?.[A.requiresKey]||A?.requires!=null&&!S.items[A.requires]?.got?A.requiresText||'먼저 필요한 물품을 확보해야 한다':'';}
function startLoot(it) { const P=S.player,A=itemObjectiveAction(it);if(itemObjectiveBlock(it)){toast(itemObjectiveBlock(it),2.4,'warn');return;}if(P.hurtT>.4){toast('피격에서 회복 중 — 잠시 뒤 다시 챙기기',1.8,'warn');return;}if (!S.saidLoot) { S.saidLoot = true; bossRadio('loot', true); } const L = LOOT[it.furn]; P.pick = { kind: 'loot', it, x: it.dx, y: it.dy, t: 0, nt: 0.15, dur: A?.duration??L[3], short: A?.short||L[2], loud: A?.loud??L[4] }; P.vx = P.vy = 0; P.cover = null; P.a = Math.atan2(it.dy - P.y, it.dx - P.x);
  hint(A&&A.kind!=='recovery'?'terminalWork':'loot', A&&A.kind!=='recovery'?'작업 중에는 움직이면 중단된다. 작업 모습이 보이면 들킬 수 있다.':'가구에서 훔치기: 끝날 때까지 움직이지 마라. 하는 동안은 수상한 행동이라 보이면 들킨다'); }
// 물건을 손에 넣음 (바닥에서 줍기·가구에서 빼오기 공용)
function takeItem(it) {
  const P = S.player; it.got = true; spawnEffect('loot',{x:it.dx??it.x,y:it.dy??it.y,fl:flOf(it),z:0},{scale:.8});finishEnvSelection(); play('switch', 0.6); play('cloth', 0.3); if (!S.stats.gotAs) { const zi = STAGE.zones ? pZoneInfo() : null, by = zi && zi.k !== Z_PUB ? myPermits().find(o => zi.allow && zi.allow.includes(o)) : disguised() ? P.outfit : null; const U = S.usedPermit || {}; S.stats.gotAs = by || (P.item && P.item.permit && U[P.item.permit] ? P.item.permit : disguised() && U[P.outfit] ? P.outfit : 'self'); }  // 그 신분이 실제로 금지 구역에 들여보내 준 적이 있으면 인정  // 어떤 신분으로 훔쳤나 (도전 과제) — 그 자리를 실제로 허가해 준 신분만 친다
  const left = S.items.filter(i => !i.got).length, nm = (STAGE.itemNames || [])[S.items.indexOf(it)] || STAGE.itemName || '서류';
  const A=itemObjectiveAction(it),remaining=S.items.some(i=>!i.got&&itemObjectiveAction(i)&&itemObjectiveAction(i).kind!=='recovery')?'작업':'물품';
  toast(A?.complete||(left ? `${nm} 회수 · 남은 ${remaining} ${left}개` : `${nm} 회수`), 2.4, 'good');
  // A stopped dispatch is a local, observable fault: its operator comes over.
  // It does not reveal the player's identity or raise a remote alarm.
  const g=A?.inspectTag&&npc(A.inspectTag);
  if(g&&['PATROL','RETURN'].includes(g.state)&&flOf(g)===flOf(it)){
    endChat(g);goSuspicious(g,it.x,it.y,7);g.why='heard';gsay(g,'배차가 멈췄네. 단말부터 확인해 보자.',3);
  }
}
// 핏자국 닦기: 핏자국 위에서 [행동]. 움직이면 멈춘다. 큰 자국 2.6초 · 핏방울 0.9초. 닦는 동안은 수상한 행동이라 보이면 들킨다
function nearBlood() {
  const P = S.player; if (P.z || P.carrying || P.captive || P.hide || P.vent || P.under) return null;
  let best = null, bd = 34; for (const d of S.decals) { if (flOf(d) !== flOf(P) || ACT_SKIP.has(d) || (d.z || 0) !== (P.z || 0)) continue; const e = dist(P.x, P.y, d.x, d.y); if (e < bd) { bd = e; best = d; } }
  return best;
}
function startClean(d) { const P = S.player; P.pick = { kind: 'clean', d, x: d.x, y: d.y, t: 0, nt: 0.1, dur: d.r >= 10 ? 2.6 : 0.9 }; P.vx = P.vy = 0; P.cover = null; P.a = Math.atan2(d.y - P.y, d.x - P.x); hint('clean', '핏자국 닦기: 움직이면 멈춘다. 닦는 모습이 보이면 수상하게 여긴다'); }
function updatePick(P, mag, dt) {
  const K = P.pick; P.moving = false; P.mode = 'sneak'; P.light = lightAt(P.x, P.y, false); P.hidden = false;
  if (mag > 0.25 || P.hurtT > 0.4) { P.pick = null; toast(P.hurtT>.4?'피격으로 작업 중단':'이동해서 작업 중단', 1.2); return; }
  K.t += dt; if ((K.nt -= dt) <= 0) { K.nt = 0.55; if (K.kind === 'clean') { play('cloth', 0.12, 1.3); noise(K.x, K.y, 30, 'pick'); } else if (K.kind === 'loot') { play(K.short === '빼내기' ? 'click' : 'cloth', 0.12, 1.4); noise(K.x, K.y, K.loud, 'pick'); } else { play('click', 0.14, 1.6 + Math.random() * 0.4); if (K.kind !== 'latch') noise(K.x, K.y, K.kind === 'door' ? 80 : 55, 'pick'); } }
  if (K.t < K.dur) return;
  P.pick = null;
  if (K.kind === 'loot') { if (!K.it.got) takeItem(K.it); return; }
  if (K.kind === 'clean') {  // 그 자국과 바로 옆 핏방울까지 지운다
    const n0 = S.decals.length; S.decals = S.decals.filter(o => !(o === K.d || (flOf(o) === flOf(K.d) && dist(o.x, o.y, K.d.x, K.d.y) < 40)));
    S.stats.cleaned = (S.stats.cleaned || 0) + (n0 - S.decals.length); play('cloth', 0.3); toast(S.decals.some(o => o.trail && o.trail === K.d.trail) ? '닦았다 — 이어진 핏방울이 더 남아 있다' : '핏자국을 닦았다', 1.8, 'good'); return; }
  if (K.kind === 'latch') { K.w.st = 'open'; noteChange('win', K.w); play('cloth', 0.3); toast('걸쇠를 풀었다 — 이 창문은 이제 열려 있다', 2); return; }
  P.picks--; S.stats.picks = (S.stats.picks || 0) + 1; play('switch', 0.5, 1.4);
  if (K.kind === 'win' || K.kind === 'bar') { K.w.st = 'open'; noteChange('win', K.w); toast(`${K.kind === 'bar' ? '방범창을 풀었다' : '창문을 땄다'} — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
  else { const d = K.d; noteChange('door', d, d.keyLock); d.keyLock = null; setDoor(d, false); toast(`잠금장치를 땄다 — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
}
function drawPickProgress(P) {
  const K = P.pick || P.interact; if (!K || (P.interact && K.dur < 0.5)) return; const k = Math.max(1, 0.95 / SCALE), f = Math.min(1, K.t / K.dur), x = P.x, y = P.y - 44 * k;
  ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 13 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(x, y, 13 * k, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  ctx.font = uiFont(Math.round(12 * k)); ctx.textAlign = 'center'; ctx.fillStyle = '#f2c46b'; ctx.fillText(P.interact ? (K.pose === 'dress' ? '변장' : '사용') : K.kind === 'latch' ? '걸쇠' : K.kind === 'clean' ? '닦기' : K.kind === 'loot' ? K.short : '락픽', x, y + 4 * k); ctx.textAlign = 'left';
}
const onFacadeW = w => { const b = w.b != null ? w.b : bldAt(w.tx, w.ty); return b >= 0 && BLD[b].facade && w.ty >= BLD[b].y1 - BLD[b].fh + 1; };
// 방범창: 창살
