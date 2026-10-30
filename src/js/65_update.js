const ESCAPE_T = 20;  // 발각 뒤 시야를 끊고 이만큼(초) 버티면 수색으로 내려간다
// ---------------------------------------------------------------- 갱신
function update(dt) {
  updateTraps(dt);
  S.t += dt;
  updatePlayer(dt);
  { const P = S.player; S.trail = S.trail || []; S.trailT = (S.trailT || 0) - dt;  // 임무 경로 기록
    if (S.trailT <= 0) { S.trailT = 0.35; const l = S.trail[S.trail.length - 1]; if (!l || dist(l.x, l.y, P.x, P.y) > 20) S.trail.push({ x: P.x, y: P.y, z: P.z || 0, fl: flOf(P) }); } }
  if (S.qRun && S.qRun.length && (S.qRunT -= dt) <= 0) { runQueued(S.qRun.shift()); S.qRunT = 0.1; syncTools(); }
  if (S.whistleT > 0) S.whistleT -= dt;
  if (S.pull) updatePull(dt);
  updateKoHold(); statsTick(); if (STAGE.zones || STAGE.stories) updateStories(dt);
  if (S.qBuf > 0) { S.qBuf -= dt; const qa = S.qKill ? attackAction() : primaryAction(); if (qa.k !== 'none' && (!S.qKill || isAtk(qa))) { S.qBuf = 0; actPrimary(S.qKill ? Object.assign({}, qa, { viaZ: true }) : undefined); } }  // [공격]을 미리 눌러 두면 닿는 순간 공격
  updateChats(dt);
  for (const g of S.guards) { setLayer(flOf(g)); updateGuard(g, dt); setLayer(flOf(S.player)); if (S.over) return; }
  if (STAGE.city) cityUpdate(dt); else if (S.vehicles) updateVehicles(dt);
  engineSound();  // 운전 중 엔진 (판이 바뀌면 꺼진다)
  separateBodies(dt); updateClubMusic(); updateCams(dt);
  if (S.shakeT > 0) S.shakeT = Math.max(0, S.shakeT - dt);
  updateRadioCall(dt); updateAmbush(dt); runTimers(); updateRadioCheck(dt); updateAlert(dt); updateCheckpoint(dt); updateWarn(dt); updateCorpseRisk(dt); if ((S.expoT = (S.expoT || 0) - dt) <= 0) { S.expoT = 0.1; const e = exposure(); if (e === 1 && S.expo === 0) hint('expo', '발밑 고리: 파랑 숨음 · 노랑 누가 보면 보임 · 빨강 보고 있음'); S.expo = e; } updateOpps(dt); if (!S.winInit) winInit(); updateChanges(dt); if (STAGE.steps) updateTutorial();
  if (S.timeLeft) {
    const active = !S.exitOpen && (!STAGE.timeTarget || S.guards.some(g => g.target && !targetEliminated(g)));
    if (active) { S.timeLeft -= dt; if (S.timeLeft <= 0) { S.timeLeft = 0; endGame(false, STAGE.timeFail || '시간이 다 됐다.'); return; } }
  }
  { let mood = S.alevel >= 3 || S.radioCall ? 2 : S.alevel === 2 ? 1 : 0;
    for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE') continue; if (g.state === 'ALERT') { mood = 2; break; } if (['NOTICE', 'SUSPICIOUS', 'SEARCH', 'BODY'].includes(g.state) || g.meter > 0.15) mood = Math.max(mood, 1); }
      if (mood >= (S.moodHi || 0)) { S.moodHi = mood; S.moodT = 4; } else if ((S.moodT -= dt) <= 0) S.moodHi = mood;
      setMusic(['n_calm', 'n_tense', 'n_fight'][S.moodHi]); }
  if (STAGE.fuse) {
    if (S.fuseGuard && S.fuseGuard.state !== 'FUSE') { S.fuseGuard.atFuse = false; S.fuseGuard = null; }
    if (!S.lightsOn && !S.fuseGuard && S.fuseT <= 0) S.fuseT = 3;
    if (S.fuseT > 0) {
      S.fuseT -= dt;
      if (S.fuseT <= 0 && !S.lightsOn) {
        let best = null, bd = 1e9;
        for (const g of S.guards) { if ((g.state !== 'PATROL' && g.state !== 'RETURN') || flOf(g) || g.civ || g.target || g.dog || g.post != null || g.follow != null) continue; const d = dist(g.x, g.y, tc(STAGE.fuse[2]), tc(STAGE.fuse[3])); if (d < bd) { bd = d; best = g; } }
        if (best) { best.state = 'FUSE'; best.path = null; best.atFuse = false; setIcon(best, '?'); S.fuseGuard = best; }
      }
    }
  }
  // 건물 두꺼비집: 내린 지 몇 초 뒤 근처 자경대원 하나가 올리러 온다
  for (const fb of S.bfuses || []) {
    if (!fb.cut) continue;
    if (fb.guard && (fb.guard.state !== 'FUSE' || fb.guard.fuseAt !== fb)) fb.guard = null;
    if (fb.guard) continue;
    fb.t -= dt; if (fb.t > 0) continue; fb.t = 4;
    let best = null, bd = 900;
    for (const g of S.guards) { if ((g.state !== 'PATROL' && g.state !== 'RETURN') || flOf(g) || g.civ || g.target || g.dog || g.post != null || g.follow != null) continue; const d = dist(g.x, g.y, fb.x, fb.y); if (d < bd) { bd = d; best = g; } }
    if (best) { best.state = 'FUSE'; best.fuseAt = fb; best.path = null; best.atFuse = false; setIcon(best, '?'); fb.guard = best; }
  }
  if (S._lightsWas !== S.lightsOn) { S._lightsWas = S.lightsOn; for (const c of S.corpses) c.light = lightAt(c.x, c.y); }
  for (const c of S.corpses) if (c.fly) { const f = c.fly; f.t += dt; const k = Math.min(1, f.t / f.dur); c.x = f.x0 + (f.x1 - f.x0) * k; c.y = f.y0 + (f.y1 - f.y0) * k; if (k >= 1) { c.fly = null; c.light = lightAt(c.x, c.y); play('thud', 0.7); if (c.accident) noise(c.x, c.y, 140, 'crash', c.fl || 0); else { S.decals.push({ x: c.x, y: c.y, r: 16, rot: rnd(0, TAU) }); terrorAt(c.x, c.y); } } }  // 추락사(사고)는 피·공포 없이 쿵 소리만 — 와서 보면 '사고가 났네'
  for (const s of S.stones) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; play('stone', 0.5 * clamp(1 - dist(s.x1, s.y1, S.player.x, S.player.y) / 600, 0.2, 1)); noise(s.x1, s.y1, 240, 'stone', flOf(s)); } }
  S.stones = S.stones.filter(s => s.t < s.dur + 0.6);
  for (const f of S.fx) f.t += dt; S.fx = S.fx.filter(f => f.t < 0.45);
  for (const l of S.lures) if (!l.landed) { l.t += dt; if (l.t > 0.35) { l.landed = true; play('click', 0.2); } }
  for (const k of S.kunais) { k.t += dt; if (k.t >= k.dur && !k.done) { k.done = true; kunaiHit(k); } }
  S.kunais = S.kunais.filter(k => !k.done);
  for (const n of S.noises) n.t += dt;
  S.noises = S.noises.filter(n => n.t < 0.7);
  let changed = false;
  for (const m of S.toasts) { m.t -= dt; if (m.t <= 0) changed = true; }
  if (changed) { S.toasts = S.toasts.filter(m => m.t > 0); renderToasts(); }
  if (S.flash > 0) S.flash -= dt;
  if (S.fade > 0) S.fade -= dt;
  moveCamera(dt);
  updateHUD();
}
// 집중(조준) 중: 주인공 방향만 돌고 세상은 멈춘다
function focusUpdate(dt) {
  updatePlayer(dt);
  for (const m of S.toasts) m.t -= dt * 0.5;
  moveCamera(dt); updateHUD();
}
function updateAlert(dt) {
  if (S.alevel === 3) {
    const seenNow = S.guards.some(g => g.seen && g.state === 'ALERT');
    S.unseenT = seenNow ? 0 : S.unseenT + dt;
    if (S.unseenT >= ESCAPE_T) {
      S.alevel = 2; S.alevelT = 30; S.unseenT = 0;
      for (const g of S.guards) if (g.state === 'ALERT' && !g.target) { g.state = 'SEARCH'; g.poi = g.lastSeen; g.reached = false; g.path = null; g.waitBase = 2; g.icon = '?'; g.iconT = 2; g.meter = 0.3; }
      toast('추적을 놓쳤다 — 자경대원들이 숨을 만한 곳을 뒤진다', 3, 'warn'); bark(anyGuard(g => g.state === 'SEARCH') || anyGuard(), 'lost');
    }
  } else if (S.alevel > 0) {
    S.alevelT -= dt;
    if (S.alevelT <= 0) {
      const was = S.alevel; S.alevel--; S.alevelT = S.alevel === 1 ? 45 : 0;
      if (was === 2) for (const g of S.guards) if (['SEARCH', 'CHECK', 'SUSPICIOUS', 'ALERT'].includes(g.state) && !g.target) { g.state = 'RETURN'; g.path = null; g.checks = []; g.inspect = null; g.icon = null; }
      toast(was === 2 ? '수색이 끝났다 — 자경대원들이 제자리로 돌아간다 (경계는 유지)' : '경계가 풀렸다', 2.6); if (was === 2) { bark(anyGuard(), S.chaseSeen && BARKS.calmLost ? 'calmLost' : S.stats.bodies && BARKS.calmBody ? 'calmBody' : 'calm'); S.chaseSeen = false; S.knownLooks = {}; S.guards.forEach(g => { g.chased = false; }); }
    }
  }
}
function moveCamera(dt) {
  { const P = S.player, low = !!(P.cover || (P.mode === 'sneak' && !P.trav) || (input.sneakToggle && !P.moving)); S.coneK = (S.coneK || 0) + ((low ? 1 : 0) - (S.coneK || 0)) * Math.min(1, dt * 12); }  // 시야 원뿔: 내 자세(서 있음 ↔ 웅크림)
  const k = 1 - Math.pow(0.0015, dt);
  SCALE += (targetScale() - SCALE) * Math.min(1, dt * 6);
  const vw = W / SCALE, vh = H / SCALE;
  if (tactical) {
    if (H > W * 1.3) {  // 세로 전술 지도: 나를 가운데로 시작, 손가락으로 끌어 옮긴다
      if (!S.tacCam) S.tacCam = { x: S.player.x, y: S.player.y };
      const hx = vw / 2, hy = vh / 2; S.tacCam.x = clamp(S.tacCam.x, Math.min(hx, MW * TILE / 2), Math.max(MW * TILE - hx, MW * TILE / 2)); S.tacCam.y = clamp(S.tacCam.y, Math.min(hy - 60 / SCALE, MH * TILE / 2), Math.max(MH * TILE - hy + 120 / SCALE, MH * TILE / 2));
      cam.x += (S.tacCam.x - cam.x) * Math.min(1, k * 2); cam.y += (S.tacCam.y - cam.y) * Math.min(1, k * 2); return; }
    cam.x += (MW * TILE / 2 - cam.x) * k; cam.y += (MH * TILE / 2 + 40 / SCALE - cam.y) * k; return; }
  if (S.tacCam) S.tacCam = null;
  if (isTouch) {
    const cv = S.player.car, lx = cv ? Math.cos(cv.a) * cv.v * 0.5 : 0, ly = cv ? Math.sin(cv.a) * cv.v * 0.5 : 0;  // 운전: 달리는 앞쪽을 더 보여 준다
    cam.x += (S.player.x + lx - cam.x) * k;
    cam.y += (S.player.y + ly + vh * 0.12 - cam.y) * k;
    // 가장자리: 맵 밖 빈 화면은 좌우 8%·위 10%까지만, 아래는 조작 버튼 자리(28%)만큼 허용
    // 맵 끝: 오른쪽은 세로 버튼 줄 폭만큼, 왼쪽은 조금, 아래는 버튼·도움말 자리만큼 더 따라가 주인공이 화면 가장자리 UI 밑에 깔리지 않게
    cam.x = clamp(cam.x, Math.min(vw / 2 - 40 / SCALE, MW * TILE / 2), Math.max(MW * TILE - vw / 2 + 78 / SCALE, MW * TILE / 2));
    cam.y = clamp(cam.y, Math.min(vh * 0.4, MH * TILE / 2), MH * TILE + vh * 0.06);
  } else {
    // 앞보기: 보는 방향(조준 중이면 겨누는 곳)으로 화면을 조금 앞세운다
    const P = S.player, ap = input.aiming && aimPoint();
    const cv = P.car, lx = cv ? Math.cos(cv.a) * cv.v * 0.5 : ap ? (ap.x - P.x) * 0.35 : Math.cos(P.a) * (P.moving ? 70 : 30), ly = cv ? Math.sin(cv.a) * cv.v * 0.5 : ap ? (ap.y - P.y) * 0.35 : Math.sin(P.a) * (P.moving ? 55 : 24);
    S.lead = S.lead || { x: 0, y: 0 }; const lk = 1 - Math.exp(-dt * 2.5); S.lead.x += (lx - S.lead.x) * lk; S.lead.y += (ly - S.lead.y) * lk;
    cam.x += (P.x + S.lead.x - cam.x) * k; cam.y += (P.y + S.lead.y - cam.y) * k;
    // 가장자리: 캐릭터가 화면 구석의 HUD(도움말·조작 안내) 밑에 깔리지 않도록 맵 밖으로 조금 더 따라간다
    const ox = vw * 0.16, oy = vh * 0.2;
    cam.x = vw >= MW * TILE ? MW * TILE / 2 : clamp(cam.x, vw / 2 - ox, MW * TILE - vw / 2 + ox);
    cam.y = vh >= MH * TILE ? MH * TILE / 2 : clamp(cam.y, vh / 2 - oy, MH * TILE - vh / 2 + oy);
  }
}

