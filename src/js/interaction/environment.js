function accidentKill(g, how) {
  if (g.state === 'DEAD' || g.child) return;
  logEv('accident', g.x, g.y);
  g.state = 'DEAD'; g.icon = null; g.path = null; play('thud', 0.6);
  S.stats.kills++; S.stats.accidents = (S.stats.accidents || 0) + 1; if (g.target) after(1.2, () => bossRadio('accident', true)); if (!g.target && g.civ) S.stats.extraKills++; else if (!g.target && !g.dog) S.stats.crewKills = (S.stats.crewKills || 0) + 1;
  const c = { guardId:g.id, fl: flOf(g), z: g.z || 0, ch: charOf(g), fac: g.fac, dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: false, discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, accident: how, t0: S.t };
  S.corpses.push(c);
  if (g.target) { const left = S.guards.filter(o => o.target && !targetEliminated(o)).length; toast(left ? `표적 제거(사고) — 남은 표적 ${left}` : '표적 제거 — 사고로 보인다', 3, 'good'); }
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  checkObjective();
}
// 함정: { k: 'shock', sw: [x, y], zone: [x0, y0, x1, y1] } 전선 끊어 물웅덩이 감전 · { k: 'drop', at: [x, y], hit: [x0, y0, x1, y1] } 옥상 간판 떨어뜨리기
// 간판 달린 건물(상가)마다 옥상 끝 간판을 떨어뜨릴 수 있다 — 정면 높이(b.fh)가 정해진 뒤에 부른다
function autoSigns() {
  BLD.forEach(b => {
    if (b.kind !== 'shop' || !b.fh) return; const cx = Math.round((b.x0 + b.x1) / 2), ey = b.y1 - b.fh;
    if (ey < b.y0 || S.traps.some(t => t.k === 'drop' && Math.abs(t.at[0] - cx) <= 4 && Math.abs(t.at[1] - ey) <= 3)) return;
    const hit = [Math.max(0, cx - 2), b.y1 + 1, Math.min(MW - 1, cx + 2), Math.min(MH - 1, b.y1 + 2)]; let open = 0;
    for (let y = hit[1]; y <= hit[3]; y++) for (let x = hit[0]; x <= hit[2]; x++) if (!solidAt(x, y)) open++;
    // 아래가 막혀 있으면(벽·다른 건물) 떨어뜨릴 곳이 아니다
    if (open < 4) return;
    S.traps.push({ i: S.traps.length, used: false, k: 'drop', at: [cx, ey], hit, text: ((b.signs || [])[0] || b.name || '간판').slice(0, 6), auto: true, noOpp: true });
  });
}
function trapsInit() {
  S.traps = (STAGE.traps || []).map((t, i) => Object.assign({ i, used: false }, t));
  S.carAlarms = CARS.map(([x, y]) => ({ x: tc(x), y: (y + 1) * TILE, tx: x, ty: y, used: false, t: 0 }));
}
const inZone = (g, z) => g.x >= z[0] * TILE && g.x < (z[2] + 1) * TILE && g.y >= z[1] * TILE && g.y < (z[3] + 1) * TILE;
function nearTrap() {
  const P = S.player; if (P.wire || P.jump || P.hide || P.carrying || P.vent || P.under) return null;
  for (const t of S.traps || []) { if (ACT_SKIP.has(t)) continue;
    if (t.used) continue;
    if (t.k === 'shock' && !P.z && !P.fl && dist(P.x, P.y, tc(t.sw[0]), tc(t.sw[1])) < 52) return { t, label: '전선 끊기 — 물웅덩이 감전' };
    if(t.k==='drop'&&canReleaseSign(t))return{t,label:t.text==='실외기'?'실외기 고정 풀기':'간판 고정 풀기'};
  }
  if (!P.z) for (const c of S.carAlarms || []) if (!c.used && !ACT_SKIP.has(c) && dist(P.x, P.y, c.x, c.y) < 56) return { car: c, label: '차 경보 울리기' };
  return null;
}
function fireTrap(a) {
  if (a.t && a.t.used) return;
  if (a.car) { a.car.used = true; a.car.t = 7; play('metal', 0.4); toast('차 경보가 울린다 — 근처 자경대원이 보러 온다', 2.2); return; }
  const t = a.t;if(t.k==='drop'){beginSignRelease(t);return;}t.used=true;
  if (t.k === 'shock') {
    const z = t.zone, cx = (z[0] + z[2] + 1) / 2 * TILE, cy = (z[1] + z[3] + 1) / 2 * TILE; let n = 0;
    for (const g of S.guards) if (!g.child && !flOf(g) && g.state !== 'DEAD' && inZone(g, z)) { accidentKill(g, 'shock'); n++; }
    t.fx = 1.6; play('fuse', 0.7); noise(cx, cy, 150, 'switch'); S.flash = 0.2;
    toast(n ? `감전 — ${n}명 쓰러졌다 (사고로 보인다)` : '물웅덩이에 전기가 흘렀지만 아무도 없었다', 2.6, n ? 'good' : '');

  }
}
function updateIntel(dt) {
  const P = S.player;
  (STAGE.intel || []).forEach((it, k) => {
    const st = S.intel[k] || (S.intel[k] = { t: it.first || 6, i: -1, lt: 0, done: false });
    const a = S.guards[it.g[0]], b = S.guards[it.g[1]];
    if (!a || !b || a.state === 'DEAD' || b.state === 'DEAD') return;
    const calm = g => ['PATROL', 'RETURN'].includes(g.state);
    a.chatCd = b.chatCd = 99;  // 정해진 대화를 하는 둘은 잡담을 하지 않는다
    if (st.i < 0) { st.t -= dt; if (st.t <= 0 && calm(a) && calm(b) && dist(a.x, a.y, b.x, b.y) < 230) { st.i = 0; st.lt = 0; } else return; }
    if (!calm(a) || !calm(b)) { a.say = b.say = null; st.i = -1; st.cur = null; st.t = 8; return; }
    // 엿듣기: 들리는 거리(같은 층, 벽 너머는 더 가까이) 안에서만 말이 들린다 — 멀면 말풍선은 '소곤소곤'뿐 (보이는 대사 = 알게 된 정보)
    const hear = sp0 => flOf(P) === flOf(sp0) && !P.under && !P.vent && dist(P.x, P.y, sp0.x, sp0.y) < 190 * soundThrough(sp0.x, sp0.y, P.x, P.y) + 40;
    if (st.cur) { const c = st.cur; c.sp.say = hear(c.sp) ? c.text : '(소곤소곤…)';
      if (c.key && !st.done && hear(c.sp)) { st.done = true; if (it.gives) { S.player.keys[it.gives] = true; S.player.hasKey = true; } S.learned.push(it.learn); play('click', 0.4); toast('엿들었다 — ' + it.learn, 3.2, 'good'); } }
    st.lt -= dt; if (st.lt > 0) return;
    if (st.i >= it.lines.length) { a.say = b.say = null; st.i = -1; st.cur = null; st.t = it.every || 30; return; }
    const [who, text] = it.lines[st.i], sp = who ? b : a, ot = who ? a : b; ot.say = null; sp.say = hear(sp) ? text : '(소곤소곤…)'; st.lt = 2 + text.length * 0.07;
    sp.want = Math.atan2(ot.y - sp.y, ot.x - sp.x); st.cur = { sp, text, key: st.i === it.key };
    st.i++;
  });
}
function disguiseMul(g) {
  const P = S.player; if (!P.disguise || P.disguiseBlown || g.dog || STAGE.zones) return 1;  // 구역이 있는 판은 허가 옷·눈썰미 규칙으로 따진다
  const d = dist(g.x, g.y, P.x, P.y);
  if (g.elite || g.target) return d < 220 ? 1.25 : 0.4;      // 얼굴을 아는 사람
  if (P.mode === 'run' || P.carrying || P.captive || P.z || P.strikeT > 0 || P.wire) return 1;  // 수상한 짓
  return d < 64 ? 0.45 : 0.07;
}
function gsay(g, text, t = 2.6) { if (g.chat) return; g.say = text; g.sayT = t; }
function updateShift(dt) {
  const sh = STAGE.shift; if (!sh || S.shiftI >= sh.add.length) return;
  S.shiftT -= dt; if (S.shiftT > 0) return;
  const d = sh.add[S.shiftI++], g = makeGuard(d, S.guards.length); g.reinf = true; buildRouteLine(g); S.guards.push(g);
  S.shiftT = sh.every; play('bell', 0.4); toast(sh.msg || '교대 시간 · 순찰 경비 1명 추가', 2.8, 'warn');
}
function updateTraps(dt) {
  updateFallingSigns(dt);
  updateShift(dt);
  updateIntel(dt);
  for (const g of S.guards) if (g.sayT > 0) { g.sayT -= dt; if (g.sayT <= 0 && !g.chat) g.say = null; }
  for (const c of S.carAlarms || []) if (c.t > 0) { c.t -= dt; c.beep = (c.beep || 0) - dt; if (c.beep <= 0) { c.beep = 0.9; noise(c.x, c.y, 300, 'alarm'); play('metal', 0.18 * proxVol({ x: c.x, y: c.y })); } }
  for (const t of S.traps || []) if (t.fx > 0) t.fx -= dt;
}
function drawTrapsGround() {
  for (const t of S.traps || []) {
    if (t.k === 'shock') {
      const x = t.sw[0] * TILE, y = t.sw[1] * TILE;
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(x + 12, y + 6, 24, 30); ctx.fillStyle = t.used ? '#55585f' : '#e8c23a'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 12, y + 8 + k * 7, 24, 3);
      ctx.strokeStyle = t.used ? '#3a3d44' : '#1a1c20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 24, y + 36); ctx.lineTo(x + 24, y + 46); ctx.stroke();
      if (t.fx > 0) { const z = t.zone; ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { const px = (z[0] + Math.random() * (z[2] - z[0] + 1)) * TILE, py = (z[1] + Math.random() * (z[3] - z[1] + 1)) * TILE; ctx.strokeStyle = `rgba(160,220,255,${t.fx / 1.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + rnd(-14, 14), py + rnd(-14, 14)); ctx.lineTo(px + rnd(-14, 14), py + rnd(-14, 14)); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
    }

  }
  for (const c of S.carAlarms || []) if (c.t > 0 && Math.floor(S.t * 3) % 2) { ctx.fillStyle = 'rgba(255,170,60,.55)'; ctx.beginPath(); ctx.arc(c.x - 14, c.y - 30, 7, 0, TAU); ctx.arc(c.x + 14, c.y - 30, 7, 0, TAU); ctx.fill(); }
}
function drawTrapsRoof(openB=-1){drawHangingSigns(openB);}
function bldPower(fb, on) {
  fb.cut = !on; fb.t = 5;
  for (const l of S.lamps) if (!l.outdoor && !l.hearth && bldAt(Math.floor(l.x / TILE), Math.floor(l.y / TILE)) === fb.b) { if (on) { if (l.cut != null) { l.off = l.cutWas; l.cut = null; } } else if (l.cut == null) { l.cutWas = l.off; l.off = true; l.cut = fb.b; } }
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
  if (on) { const B = BLD[fb.b]; if (dist(S.player.x, S.player.y, fb.x, fb.y) < 900) toast(`${B.plate || B.name || '건물'} 전기가 다시 들어왔다`, 2.2); }
}
function nearBFuse() { const P = S.player; if (P.z || P.fl || P.wire || P.jump || P.hide || P.carrying || P.captive) return null; let best = null, bd = 50; for (const fb of S.bfuses || []) { if (fb.cut || ACT_SKIP.has(fb)) continue; const d = dist(P.x, P.y, fb.x, fb.y); if (d < bd && objectReachable(fb, 50)) { bd = d; best = fb; } } return best; }
function cutLights() {
  S.lightsOn = false; play('fuse', 0.6); setTimeout(() => play('switch', 0.5), 120);
  toast('바깥 조명이 꺼졌다 — 곧 누군가 확인하러 온다', 3); setAlert(1, 30);
  S.fuseT = 2.5;
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
  if (STAGE.onLightsOut) try { STAGE.onLightsOut(S, SH); } catch (e) { console.warn('onLightsOut', e); }  // 의뢰마다: 정전에 반응하는 사람 (예: 발전기 보러 가는 표적)
}
