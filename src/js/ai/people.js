function separateBodies(dt) {
  const R = 26, L = S.guards.filter(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.doomed), k = Math.min(1, dt * 6), L0 = CUR_F;
  const push = (o, dx, dy) => { setLayer(flOf(o)); const sol = o.z ? solidFor(o.z) : solidAt, nx = o.x + dx, ny = o.y + dy; if (!sol(Math.floor(nx / TILE), Math.floor(o.y / TILE))) o.x = nx; if (!sol(Math.floor(o.x / TILE), Math.floor(ny / TILE))) o.y = ny; };
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (flOf(a) !== flOf(b) || (a.z || 0) !== (b.z || 0) || a.climb || b.climb) continue;
    let dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    let d = Math.hypot(dx, dy); if (d >= R) continue; if (d < 0.01) { dx = Math.cos(a.id + j); dy = Math.sin(a.id + j); d = 1; }
    const m = (R - d) / 2 * k / d; push(a, -dx * m, -dy * m); push(b, dx * m, dy * m);
  }
  const P = S.player;
  if (!P.hide && !P.wire && !P.jump && !P.vent && !P.under && !P.trav && !P.ledge) for (const g of L) {
    if (flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0) || g.climb || g === P.captive) continue; let dx = P.x - g.x, dy = P.y - g.y; if (Math.abs(dx) > 24 || Math.abs(dy) > 24) continue;
    const d = Math.hypot(dx, dy) || 1; if (d >= 24) continue; const m = (24 - d) / d * Math.min(1, dt * 10); push(g, -dx * m, -dy * m);
  }
  setLayer(L0);
}
function updateCiv(g, dt) {
  const P = S.player; g.moving = false;
  if (g.iconT > 0) { g.iconT -= dt; if (g.iconT <= 0) g.icon = null; }
  const sameF = flOf(g) === flOf(P) && !P.wire;
  if (!g.club && sameF && dist(g.x, g.y, P.x, P.y) < 220) hint('civ2', '주민은 싸우지 않는다. 집에 들어오거나 사람을 해치는 걸 보면 비명을 지른다');
  if (g.club && sameF && dist(g.x, g.y, P.x, P.y) < 220) hint('crowd', '손님 사이에서 걸으면 덜 눈에 띈다. 달리면 은폐 효과가 사라진다');
  if (g.state === 'SLEEP') {
    g.seen = false;
    if (sameF && !P.hide && dist(g.x, g.y, P.x, P.y) < (P.mode === 'run' ? 100 : P.mode === 'walk' ? 55 : 0)) civWake(g, P.x, P.y);
    return;
  }
  if (g.child && g.treatT > 0) { updateChildTreat(g, dt); g.a += clamp(angDiff(g.a, g.want), -4 * dt, 4 * dt); return; }
  if (g.state === 'REPORT') { updateReport(g, dt); g.a += clamp(angDiff(g.a, g.want), -4 * dt, 4 * dt); return; }
  if (STAGE.zones && g.enforcer && g.state !== 'PANIC') updateSharpEye(g, dt, (P.hide || P.under || P.vent || !sameF) ? 0 : canSee(g, P.x, P.y, P.light, P.hidden, P.mode === 'sneak', P.z));
  if (g.state === 'REPORT') return;
  if (g.state === 'PANIC') {
    if ((!g.path || !g.path.length) && !g.cowered) { const a = Math.atan2(g.y - g.fear.y, g.x - g.fear.x); pathTo(g, g.x + Math.cos(a) * 160, g.y + Math.sin(a) * 160); g.cowered = true; }
    moveAlong(g, SPD.flee * 0.8, dt); g.panicT -= dt; g.icon = '!'; g.iconT = 0.5;
    if (g.panicT <= 0) { g.state = 'PATROL'; g.cowered = false; g.meter = 0.3; g.path = null; g.icon = null; g.wait = 0; }
  } else {
    // 일반 주민은 조직원이 아니다: 길에서 마주친 사람은 신경 쓰지 않는다.
    // 비명을 지르는 건 ① 자기 집 안에 들어온 낯선 사람 ② 사람을 끌고 가거나 붙잡고 있거나 막 해치는 모습 (③ 시체는 아래에서 따로)
    const gb = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)), pb = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
    const H = g.home, ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    // 범죄(처치·기절·운반·붙잡기·락픽·몰래 약 타기)와 무단 침입(직원이 일터의 불청객을 봄)을 따로 본다
    const crimeNow = !!((P.interact && P.interact.illegal) || P.carrying || P.captive || P.strikeT > 0 || (STAGE.zones && (P.pick || (P.useT || 0) > S.t)));
    const homeNow = !!(H && gb === H.b && pb === H.b && flOf(P) === H.fl && !P.z && !P.wire && ptx >= H.x0 && ptx <= H.x1 && pty >= H.y0 && pty <= H.y1);
    const tresNow = !!(STAGE.zones && g.outfit && !g.child && pZoneEff(g) !== Z_PUB && dist(g.x, g.y, P.x, P.y) < 420);
    g.wary = homeNow || crimeNow || tresNow;
    const vis0 = (P.hide || P.under || P.vent || !sameF) ? 0 : canSee(g, P.x, P.y, P.light, P.hidden, P.mode === 'sneak', P.jump ? Math.max(1, P.z) : P.z);
    if (vis0 > 0 && !g.wary && dist(g.x, g.y, P.x, P.y) < 110 && Math.random() < dt * 0.6) g.want = Math.atan2(P.y - g.y, P.x - g.x);  // 힐끔 쳐다볼 뿐
    const vis = g.wary ? vis0 : 0;
    g.seen = vis > 0;
    if (g.seen) { if (crimeNow) g.sawCrimeT = S.t;
      g.meter = Math.min(1, g.meter + D().rate * (0.35 + vis * 1.4) * (g.club ? 0.35 : 1) * (STAGE.zones && crimeNow ? 3 : 1) * dt); g.want = Math.atan2(P.y - g.y, P.x - g.x); if (!g.icon) setIcon(g, '?');
      if (g.meter >= 1) {
        if (!STAGE.zones || S.t - (g.sawCrimeT || -99) < 2.5) { civScream(g, P.x, P.y, null, disguised() ? P.outfit : 'face', 'crime'); return; }
        // 무단 침입: 먼저 말로 나가라고 하고, 그래도 머물면 '수상한 사람이 들어갔다'고 알린다 (경보·얼굴 기억·감점 없음)
        if (!g.tresT || S.t - g.tresT > 20) { g.tresT = S.t; g.meter = 0.35; setIcon(g, '!?'); gsay(g, ['여기 들어오시면 안 돼요.', '저기요, 거긴 직원만 다녀요.', '어디 가세요? 거기 출입 금지예요.'][g.id % 3], 2.6); }
        else if (S.t - g.tresT > 3) { g.meter = 0; if (!startReport(g, P.x, P.y, null, null, 'trespass')) g.tresT = S.t; return; }
      } }
    else g.meter = Math.max(0, g.meter - dt * 0.25);
    for (const c of S.corpses) { if (c.stashed || c.carried || c.hidden || c.civSeen || flOf(c) !== flOf(g) || (c.z || 0) !== (g.z || 0)) continue; if (canSee(g, c.x, c.y, Math.max(0.45, c.light), false, false, c.z || 0, flOf(c)) > 0) { c.civSeen = true; if (c.accident) { setIcon(g, '!?'); continue; } if (c.byNpc) { civPanic(g, c.x, c.y, 5); return; } civScream(g, c.x, c.y, c); return; } }
    if (g.seen && g.chat) endChat(g);
    if (!g.seen && g.chat) { const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.path = null; if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 220) endChat(g); }
    else if (!g.seen) {
      if(updateStairYield(g,dt)){} // Perception above stays active while making room.
      else if (g.wander) {  // 군중: 구역 안에서 이리저리
        if (g.wait > 0) g.wait -= dt;
        else { if (!g.path) { const [x0, y0, x1, y1] = g.wander; for (let t = 0; t < 8; t++) { const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), ty = y0 + Math.floor(Math.random() * (y1 - y0 + 1)); if (!solidAt(tx, ty) && !serviceCell(tx,ty,flOf(g))) { pathTo(g, tc(tx), tc(ty)); break; } } if (!g.path) g.wait = 1; }
          if (g.path && moveAlong(g, SPD.gPatrol * 0.7 * (g.body === 'old' ? 0.65 : 1), dt)) { g.wait = rnd(1.5, 5); g.path = null; g.want = g.a + rnd(-2, 2); } }
      } else if (g.route.length > 1) { if (g.wait <= 0 && g.route.some(r => r.spent)) purgeDetour(g); const wp = g.route[g.ri] || g.route[(g.ri = 0)]; if (g.wait > 0) g.wait -= dt; else { if (!g.path) pathTo(g, wp.x, wp.y); if (moveAlong(g, SPD.gPatrol * 0.8 * (g.body === 'old' ? 0.65 : 1), dt)) { g.wait = wp.pause; if (wp.once) wp.spent = true; g.ri = (g.ri + 1) % g.route.length; g.path = null; } } }
      else { g.glanceT -= dt; if (g.glanceT <= 0) { g.glanceT = rnd(8, 16); g.want = (g.post != null ? g.post : g.a) + rnd(-0.9, 0.9); } }
    }
  }
  const tr = (g.state === 'PANIC' ? 4 : 1.8) * dt; g.a += clamp(angDiff(g.a, g.want), -tr, tr);
}
