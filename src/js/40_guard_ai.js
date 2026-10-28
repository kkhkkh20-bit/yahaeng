// ---------------------------------------------------------------- 자경대원 AI
// 멈춰 서서 둘러보기: 정면 → 한쪽 → 정면 → 반대쪽, 매번 잠깐씩 멈춰서 본다 (계속 고개를 흔들지 않는다)
function lookAround(g, dt, base, amp, hold) {
  if (g.lookT == null) { g.lookT = rnd(hold[0], hold[1]); g.lookI = 0; g.lookOff = 0; }
  g.lookT -= dt;
  if (g.lookT <= 0) { g.lookI = (g.lookI + 1) % 4; g.lookOff = [0, 1, 0, -1][g.lookI] * amp * rnd(0.8, 1.15) * (g.lookSide || (g.lookSide = Math.random() < 0.5 ? 1 : -1)); g.lookT = rnd(hold[0], hold[1]); }
  g.want = base + g.lookOff;
}
function moveAlong(g, speed, dt) {
  if (!g.path || !g.path.length) return true;
  // 비켜 걷기: 앞에 서 있는 사람은 옆으로 돌아가고, 마주 오면 서로 오른쪽으로, 같은 방향이면 속도를 맞춰 뒤따른다
  if (g.detourT > 0) g.detourT -= dt;
  if (S.guards.length > 1) {
    const p0 = g.path[0], dd = dist(g.x, g.y, p0.x, p0.y);
    if (dd > 1) {
      const ux = (p0.x - g.x) / dd, uy = (p0.y - g.y) / dd, rxv = -uy, ryv = ux; let sx = 0, sy = 0, slow = 1;
      const P = S.player, others = [P].concat(S.guards);
      for (const o of others) {
        if (o === g || o.state === 'DEAD' || o.state === 'CAPTIVE' || o.climb || o.trav || o.hide || o.vent || o.under || flOf(o) !== flOf(g) || (o.z || 0) !== (g.z || 0)) continue;
        if (o === P && (P.wire || P.jump || P.ledge)) continue;
        const ox = o.x - g.x, oy = o.y - g.y, d = Math.hypot(ox, oy); if (d > 48 || d < 0.01) continue;
        const ahead = (ox * ux + oy * uy) / d; if (ahead < 0.25) continue;
        const w = (48 - d) / 48 * ahead, oa = o === P ? Math.atan2(P.vy || 0, P.vx || 0) : o.a, om = o === P ? P.moving : o.moving;
        const rel = om ? Math.cos(angDiff(oa, Math.atan2(uy, ux))) : 0;
        if (rel > 0.55 && o !== P) { slow = Math.min(slow, Math.max(0.1, (d - 28) / 20)); continue; }  // 같은 방향: 뒤따르기
        const side = ox * rxv + oy * ryv, sg = rel < -0.55 ? 1 : side > 0 ? -1 : 1;  // 마주 오면 오른쪽, 서 있으면 반대쪽
        sx += rxv * sg * w; sy += ryv * sg * w; if (d < 30) slow = Math.min(slow, 0.55);
        // 우회 지점: 상대 옆 36px로 돌아갈 점을 경로 앞에 끼운다 (막힌 칸이면 반대쪽)
        if (!(g.detourT > 0) && d < 58) {
          const sol = g.z ? solidFor(g.z) : solidAt;
          for (const s2 of [sg, -sg]) {
            const dx = o.x + rxv * s2 * 38 + ux * 8, dy = o.y + ryv * s2 * 38 + uy * 8;
            const ex = o.x + rxv * s2 * 34 + ux * 40, ey = o.y + ryv * s2 * 34 + uy * 40;
            if (!sol(Math.floor(dx / TILE), Math.floor(dy / TILE)) && !sol(Math.floor(ex / TILE), Math.floor(ey / TILE)) && !sol(Math.floor((g.x + dx) / 2 / TILE), Math.floor((g.y + dy) / 2 / TILE))) {
              const last = g.path[g.path.length - 1];
              g.path = g.path.filter(q => q === last || dist(q.x, q.y, o.x, o.y) > 44);  // 상대가 선 칸은 건너뛴다
              g.path.unshift({ x: dx, y: dy, detour: true }, { x: ex, y: ey, detour: true }); g.detourT = 1.2; break;
            }
          }
        }
      }
      if (sx || sy) {
        const k = speed * dt * 1.1, nx = g.x + sx * k, ny = g.y + sy * k, sol = g.z ? solidFor(g.z) : solidAt;
        if (!sol(Math.floor(nx / TILE), Math.floor(ny / TILE))) { g.x = nx; g.y = ny; }
      }
      speed *= slow;
    }
  }
  let step = speed * dt;
  while (step > 0 && g.path.length) {
    const p = g.path[0]; const d = dist(g.x, g.y, p.x, p.y);
    if (d <= step) { g.x = p.x; g.y = p.y; step -= d; g.path.shift(); }
    else { const q = g.path[1] || p; g.want = Math.atan2((p.y + q.y) / 2 - g.y, (p.x + q.x) / 2 - g.x); g.x += (p.x - g.x) / d * step; g.y += (p.y - g.y) / d * step; step = 0; }
  }
  g.moving = true;
  return !g.path.length;
}
const solidAtG = (tx, ty) => solidAt(tx, ty);
function pathTo(g, x, y) {
  if (g.z) { g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE), solidFor(g.z)); if (g.path.length) { const last = g.path[g.path.length - 1]; if (rLv(Math.floor(x / TILE), Math.floor(y / TILE)) === g.z) { last.x = x; last.y = y; } } return; }
  g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
  // 쫓거나 뒤지는 중인데 길이 막혔으면 가까운 잠긴 문을 부수고 연다
  if (!g.path.length && dist(g.x, g.y, x, y) > 60 && ['ALERT', 'SEARCH', 'CHECK', 'BODY', 'SUSPICIOUS'].includes(g.state)) {
    const d = S.doors.filter(d => d.locked).sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
    if (d && dist(d.x, d.y, g.x, g.y) < 360) {
      setDoor(d, false); play('thud', 0.6 * proxVol(g)); noise(d.x, d.y, 160, 'door', flOf(g));
      if (dist(d.x, d.y, S.player.x, S.player.y) < 700) toast('자경대원이 잠긴 문을 부수고 열었다', 2.2, 'warn');
      g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
    }
  }
  if (g.path.length && !solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { const last = g.path[g.path.length - 1]; last.x = x; last.y = y; }
}
// ---- 높이 단계: 땅(g) · 건물 위층(f층_건물) · 옥상(r구역). 자경대원은 계단·배관·베란다로 단계를 옮겨 쫓는다
function lvlInit() {
  const RC = new Int32Array(MW * MH).fill(-1); let n = 0;
  for (let i = 0; i < MW * MH; i++) {
    const tx = i % MW, ty = (i / MW) | 0, z = rLv(tx, ty); if (z <= 0 || RC[i] >= 0) continue;
    const st = [i]; RC[i] = n;
    while (st.length) { const c = st.pop(), cx = c % MW, cy = (c / MW) | 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ox, ny = cy + oy; if (!inMap(nx, ny)) continue; const j = ny * MW + nx; if (RC[j] < 0 && rLv(nx, ny) === z) { RC[j] = n; st.push(j); } } }
    n++;
  }
  S.lvl = { RC, ends: [] };
  for (const l of S.ladders) {
    if (l.kind === 'chimney') continue;
    const A = { fl: l.bfl || 0, z: l.bz || 0, x: l.x, y: l.y };
    const B = l.kind === 'fstair' || l.kind === 'balc' ? { fl: l.tfl, z: 0, x: l.ux, y: l.uy } : { fl: 0, z: l.tz, x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
    A.k = lvlKey(A); B.k = lvlKey(B); if (A.k !== B.k) S.lvl.ends.push({ l, A, B });
  }
}
function lvlKey(o) {
  const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
  if (o.z) return 'r' + (inMap(tx, ty) ? S.lvl.RC[ty * MW + tx] : -1);
  if (o.fl) return 'f' + o.fl + '_' + bldAt(tx, ty);
  return 'g';
}
const gSpot = g => ({ fl: flOf(g), z: g.z || 0, x: g.x, y: g.y });
const pSpot = () => { const P = S.player; return { x: P.x, y: P.y, fl: flOf(P), z: P.wire || P.under || P.vent ? 0 : P.jump ? P.jump.z1 || 0 : P.z || 0 }; };
// 다음에 탈 사다리 (가장 적게 갈아타는 길의 첫 칸, 같은 연결이면 가까운 것)
function nextHop(g, fromK, toK) {
  const E = S.lvl.ends, prev = { [fromK]: null }, q = [fromK];
  while (q.length) {
    const k = q.shift(); if (k === toK) break;
    for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === k && !(b.k in prev)) { prev[b.k] = { k, e, from: a, to: b }; q.push(b.k); }
  }
  if (!(toK in prev) || !prev[toK]) return null;
  let h = prev[toK]; while (h.k !== fromK) h = prev[h.k];
  let best = h, bd = dist(g.x, g.y, h.from.x, h.from.y);
  for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === fromK && b.k === h.to.k) { const d = dist(g.x, g.y, a.x, a.y); if (d < bd) { bd = d; best = { e, from: a, to: b }; } }
  return best;
}
// 목표 지점(높이 포함)으로 길 찾기: 다른 단계면 사다리 입구로 먼저 간다
function routeTo(g, t) {
  if (!S.lvl) lvlInit();
  g.hop = null;
  if (g.civ || g.dog || t.fl == null) { pathTo(g, t.x, t.y); return; }
  const gk = lvlKey(gSpot(g)), tk = lvlKey(t);
  if (gk === tk) { pathTo(g, t.x, t.y); return; }
  const h = nextHop(g, gk, tk);
  if (!h) { pathTo(g, t.x, t.y); return; }
  g.hop = h; pathTo(g, h.from.x, h.from.y);
}
// 사다리 입구에 닿았으면 실제로 올라타(내려가) 움직인다. 올라타면 true
function hopClimb(g, arrived) {
  const h = g.hop; if (!h || g.climb) return !!g.climb;
  const d = dist(g.x, g.y, h.from.x, h.from.y);
  if (d > (arrived ? 90 : 22)) { if (arrived) g.hop = null; return false; }
  g.x = h.from.x; g.y = h.from.y;
  const lv = Math.max(Math.abs((h.to.z || 0) - (h.from.z || 0)), Math.abs((h.to.fl || 0) - (h.from.fl || 0)), 1);
  const k = h.e.l.kind, kind = k === 'fstair' || k === 'stair' ? 'stair' : 'climb';
  g.climb = { from: h.from, to: h.to, t: 0, dur: kind === 'stair' ? 0.7 : 0.25 + lv * 0.5, kind, up: (h.to.z || 0) + (h.to.fl || 0) > (h.from.z || 0) + (h.from.fl || 0) };
  g.hop = null; g.path = null;
  if (kind === 'climb') play('metal', 0.3 * proxVol(g));
  return true;
}
function updateClimbG(g, dt) {
  const c = g.climb; c.t += dt; const f = Math.min(1, c.t / c.dur);
  g.x = c.from.x + (c.to.x - c.from.x) * f; g.y = c.from.y + (c.to.y - c.from.y) * f; g.moving = true;
  if (c.kind === 'climb') g.a = c.up ? -Math.PI / 2 : Math.PI / 2;
  if (f >= 1) { g.climb = null; g.fl = c.to.fl || 0; g.z = c.to.z || 0; g.x = c.to.x; g.y = c.to.y; g.path = null; g.repath = 0; setLayer(flOf(g)); }
}
// 경계 단계: 0 평온 · 1 경계 · 2 수색 · 3 발각
const A_RANGE = [1, 1.12, 1.22, 1.3], A_SPEED = [1, 1.06, 1.12, 1.18], A_FOV = [1, 1.05, 1.12, 1.15];
const A_NAME = ['평온', '경계', '수색', '발각'];
function setAlert(lv, dur, msg) {
  if (lv >= 2 && S.alevel < 2) { S.stats.alarms++; after(0.4, roofCheck); }
  if (lv > S.alevel) {
    S.alevel = lv; if (lv === 3) { S.stats.full = (S.stats.full || 0) + 1; bossRadio('alert'); S.unseenT = 0; S.chaseSeen = true; if (!S.reinforced && STAGE.reinf) { S.reinforced = true; after(2.5, spawnReinforcements); } }
    if (lv >= 2) play('alarm', 0.55);
    if (STAGE.flee && lv >= 2) startFlee();
  }
  if (lv === S.alevel && dur) S.alevelT = Math.max(S.alevelT, dur);
  if (msg) toast(msg, 3, 'warn');
}
// 수색이 시작되면 가까운 자경대원 둘이 배관·계단으로 옥상에 올라가 둘러본다
function roofCheck() {
  if (!S || S.over) return; if (!S.lvl) lvlInit();
  const tops = S.lvl.ends.filter(e => e.A.k === 'g' && e.B.z > 0), used = new Set(), P = S.player;
  const cand = S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.elite && !(g.z || 0) && !flOf(g) && g.why !== 'blood' && ['PATROL', 'RETURN', 'SUSPICIOUS', 'SEARCH'].includes(g.state));  // 핏자국을 쫓는 경비는 옥상으로 돌리지 않는다
  let n = 0;
  for (const g of cand.sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))) {
    if (n >= 2) break;
    const e = tops.filter(e => !used.has(e)).sort((a, b) => dist(g.x, g.y, a.A.x, a.A.y) - dist(g.x, g.y, b.A.x, b.A.y))[0];
    if (!e || dist(g.x, g.y, e.A.x, e.A.y) > 640) continue;
    used.add(e); n++;
    g.state = 'SEARCH'; g.poi = { x: e.B.x, y: e.B.y - 30, fl: 0, z: e.B.z }; g.reached = false; g.path = null; g.waitBase = 4; setIcon(g, '?'); gsay(g, '옥상도 확인해!');
  }
}
const distracted = g => !!(g.chat || g.act === 'smoke' || g.act === 'yawn' || g.act === 'pickup');
function spawnReinforcements() {
  if (!S || S.over) return;
  const P = S.player, [rx, ry] = STAGE.reinf;
  const lt = [Math.floor(P.x / TILE), Math.floor(P.y / TILE)];
  for (let k = 0; k < D().reinf; k++) {
    const g = makeGuard({ kind: 'g2', route: [[rx, ry, 2], [lt[0], lt[1], 3]] }, S.guards.length);
    g.x += k * 30; g.reinf = true; buildRouteLine(g);
    if (S.alevel >= 2) { g.state = 'SEARCH'; g.poi = { x: P.x, y: P.y }; g.reached = false; g.waitBase = 3; g.icon = '!'; g.iconT = 2; }
    S.guards.push(g);
  }
  play('alarm', 0.5); toast(`증원 자경대원 ${D().reinf}명이 도착했다`, 3, 'warn');
}
function guardFov(g) { if (g.civ) return 0.55; if (g.dog) return 1.15; return (g.state === 'ALERT' ? 0.66 : 0.5) * A_FOV[S.alevel] * (distracted(g) ? (g.act === 'pickup' ? 0.4 : 0.6) : 1) * (g.elite ? 1.1 : 1); }
function guardRanges(g) {
  if (g.civ) return { lit: 175 * D().range, dark: 62 * D().range };
  if (g.dog) return { lit: 170 * D().range, dark: 85 * D().range };
  const m = D().range * A_RANGE[S.alevel] * (g.state === 'SUSPICIOUS' || g.state === 'ALERT' || g.state === 'CHECK' ? 1.1 : 1) * (g.target ? 0.85 : 1);
  const dm = distracted(g) ? 0.65 : 1;
  return { lit: 250 * m * dm, dark: 95 * m * dm * (S.mod === 'bright' ? 1.5 : 1) };
}
// elev = 대상이 옥상 위 (자경대원은 위를 잘 올려다보지 않는다)
function canSee(g, x, y, light, hidden, sneak, elev) {
  // 높이: 옥상 밑(건물 안)에서는 옥상 위를 못 보고, 옥상 위에서는 옥상 밑을 못 본다
  const gz = g.z || 0; elev = elev || 0;
  if (elev > gz && !gz && roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) return 0;
  if (gz && elev < gz && !elev && roofAt(Math.floor(x / TILE), Math.floor(y / TILE))) return 0;
  const ign = elev || gz; elev = elev > gz ? elev - gz : 0;
  const d = dist(g.x, g.y, x, y);
  const r = guardRanges(g);
  const watch = g.lookout && elev;  // 망꾼: 옥상 위 사람은 하늘을 배경으로 실루엣이 드러난다
  let eff = r.dark + (r.lit - r.dark) * (watch ? Math.max(light, 0.6) : light);
  if (hidden) eff = Math.min(eff, 36);
  if (elev) eff *= g.lookout ? (elev >= 3 ? 0.8 : 1.05) : elev >= 3 ? 0.35 : elev >= 2 ? 0.45 : 0.55;  // 망꾼은 옥상을 본다
  if (g.elite) eff *= 1.1;
  if (sneak === 2) eff *= COVER_HIDE;  // 벽에 기댐: 몸을 붙여 훨씬 덜 보인다
  if (d > eff) return 0;
  const near = !elev && (d < 24 || (!sneak && !hidden && d < 34) || (!sneak && !hidden && S.player.mode === 'run' && S.player.moving && d < 72 && Math.abs(x - S.player.x) + Math.abs(y - S.player.y) < 2));
  if (!near && Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > guardFov(g)) return 0;
  if (!los(g.x, g.y, x, y, ign)) return 0;
  // 쉐도우 택틱스식 줄무늬 구역: 시야 바깥쪽 45%에서는 웅크리면 보이지 않는다
  if (sneak && !watch && g.state !== 'ALERT' && d > eff * 0.55) return 0;
  // 코만도스식 낮은 엄폐: 모래주머니 바로 뒤에서 웅크리면 가려진다
  if (sneak && !elev && lowCovered(g.x, g.y, x, y)) return 0;
  return 1 - d / eff;
}
// 지금 내가 얼마나 드러나 있나: 0 숨음(누가 돌아봐도 안 보인다) · 1 들킬 수 있음(누가 이쪽을 보면 보인다) · 2 보이고 있다
function exposure() {
  const P = S.player;
  if (S.guards.some(g => g.seen && g.state !== 'DEAD' && g.state !== 'CAPTIVE')) return 2;
  if (P.hide || P.under || P.vent || P.ledge) return 0;
  const pv = (P.trav && P.trav.base) || P, sneak = P.cover ? 2 : P.mode === 'sneak' && !P.trav, elev = P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.climb || g.doomed) continue;
    if (flOf(g) !== flOf(P) || (flOf(P) && P.wire) || dist(g.x, g.y, pv.x, pv.y) > 560) continue;
    if (STAGE.zones && !g.dog && !knownFace(g) && pZoneEff() === Z_PUB && !suspAct(g)) continue;  // 공개 구역의 행인은 누가 돌아봐도 그냥 지나친다
    const gg = Object.create(g); gg.a = Math.atan2(pv.y - g.y, pv.x - g.x);  // 이쪽으로 돌아본다면
    if (canSee(gg, pv.x, pv.y, P.light, P.hidden, sneak, elev) > 0) return 1;
  }
  return 0;
}
function lowCovered(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1); if (d < 50) return false;
  const ux = (x0 - x1) / d, uy = (y0 - y1) / d;
  for (let s = 10; s <= 66; s += 8) { const t = tileAt(x1 + ux * s, y1 + uy * s); if (t === 'Z' || t === 'A' || t === 'K') return true; }
  return false;
}
const spdMul = () => A_SPEED[S.alevel] * D().spd * (STAGE.gspd || 1);

// 주민: 싸우지 않는다. 보거나 시체를 보면 비명을 질러 자경대원을 부르고 달아난다
function civWake(g, x, y) { g.state = 'PATROL'; g.meter = Math.max(g.meter, 0.45); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '!?'); play('question', 0.3 * proxVol(g)); }
function civScream(g, x, y, c, saw, kind) {
  if (g.state === 'PANIC' || g.state === 'REPORT') return;
  if (STAGE.zones && startReport(g, x, y, c, saw, kind)) return;  // 구역이 있는 판: 비명 대신 자경대원에게 뛰어가 신고한다 (도중에 막을 수 있다)
  endChat(g); g.state = 'PANIC'; g.panicT = rnd(6, 9); g.fear = { x, y }; g.path = null; g.cowered = false; g.meter = 1; S.stats.screams = (S.stats.screams || 0) + 1;
  say([[g, ['도둑이야!', '누, 누구세요!', '사람 살려!'][(Math.random() * 3) | 0]]]);
  play('call', 0.7 * proxVol(g), 1.6); noise(g.x, g.y, 380, 'scream', flOf(g));
  for (const o of S.guards) { if (o.civ || o.dog || o.target || ['DEAD', 'CAPTIVE', 'ALERT', 'FLEE', 'TERROR'].includes(o.state)) continue; if (flOf(o) !== flOf(g) && dist(o.x, o.y, g.x, g.y) < 520) goSuspicious(o, g.x + rnd(-30, 30), g.y + rnd(-30, 30), 5); }
  setAlert(2, 30, '주민이 비명을 질렀다 — 자경대원이 몰려온다');
}
// 사람끼리 겹치지 않게: 가까우면 서로 밀어낸다 (벽 안으로는 밀지 않는다). 나도 사람을 뚫고 지나가지 못한다
// CCTV: 좌우로 천천히 돌며(끝에서 잠깐 멈춤) 빨간 시야 안의 나·시체를 찍는다. 다트로 부수거나, 두꺼비집·전체 조명을 내리면 꺼진다
const camOn = c => !c.broken && !(c.outdoor ? !S.lightsOn : (S.bfuses || []).some(f => f.b === c.b && f.cut));
const CAM_FOV = 0.42;
function camRange(c, light) { return light > 0.3 ? 300 : 135; }
function updateCams(dt) {
  const P = S.player, L0 = CUR_F;
  for (const c of S.cams || []) {
    if (!camOn(c)) { c.meter = Math.max(0, c.meter - dt); continue; }
    const s = Math.sin((S.t + c.ph) * TAU / c.period); c.a = c.base + c.sweep * clamp(s * 1.35, -1, 1);
    if (c.cool > 0) { c.cool -= dt; continue; }
    setLayer(c.fl);
    const sees = (x, y, light) => { const d = dist(c.x, c.y, x, y); if (d > camRange(c, light)) return 0; if (Math.abs(angDiff(c.a, Math.atan2(y - c.y, x - c.x))) > CAM_FOV) return 0; if (castRay(c.x, c.y, Math.atan2(y - c.y, x - c.x), d) < d - 6) return 0; return 1 - d / 360; };
    let v = 0;
    if (flOf(P) === c.fl && !P.hide && !P.under && !P.vent && !P.z && !P.wire) v = sees(P.x, P.y, P.light);
    if (v > 0 && STAGE.zones && pZoneEff() === Z_PUB && !suspAct(null) && !knownFace({ state: '' })) v = 0;  // 구역 판: 공개 구역의 손님(허가 옷 포함)은 찍혀도 문제없다 — 수상한 짓을 할 때만
    c.seen = v > 0;
    if (v > 0) { c.meter = Math.min(1, c.meter + dt * (0.9 + v * 1.8) * (S.player.disguise && !S.player.disguiseBlown && S.player.mode !== 'run' ? 0.12 : 1)); if (c.meter >= 1) {
      c.meter = 0; c.cool = 6; S.stats.camRec = (S.stats.camRec || 0) + 1; play('alarm', 0.4); setAlert(2, 40, 'CCTV에 찍혔다 — 자경대원이 몰려온다');
      for (const g of S.guards) if (!g.civ && !g.dog && flOf(g) === c.fl && !['DEAD', 'CAPTIVE', 'ALERT'].includes(g.state) && dist(g.x, g.y, c.x, c.y) < 800) goSuspicious(g, P.x, P.y, 5);
    } } else c.meter = Math.max(0, c.meter - dt * 0.4);
    for (const k of S.corpses) { if (k.stashed || k.carried || k.discovered || k.camSeen || flOf(k) !== c.fl) continue; if (k.accident && sees(k.x, k.y, Math.max(0.5, k.light || 0))) { k.camSeen = true; continue; }  // 사고로 보이는 시체는 CCTV도 경보를 울리지 않는다
      if (sees(k.x, k.y, Math.max(0.5, k.light || 0))) { k.camSeen = true; k.discovered = true; S.stats.bodies++; bossRadio('body'); S.stats.camRec = (S.stats.camRec || 0) + 1; setAlert(2, 40, 'CCTV에 쓰러진 사람이 찍혔다 — 수색 시작'); for (const g of S.guards) if (!g.civ && !g.dog && flOf(g) === c.fl && !['DEAD', 'CAPTIVE', 'ALERT'].includes(g.state) && dist(g.x, g.y, k.x, k.y) < 900) goSuspicious(g, k.x, k.y, 6); } }
  }
  setLayer(L0);
  if ((S.cams || []).some(c => camOn(c) && c.fl === flOf(P) && dist(c.x, c.y, P.x, P.y) < 420)) hint('cctv', 'CCTV: 빨간 시야가 천천히 돈다. 찍히면 경보. 다트나 두꺼비집으로 끈다');
}
function drawCams(fl) {
  for (const c of S.cams || []) {
    if (c.fl !== fl) continue; const on = camOn(c);
    if (on) {
      setLayer(fl); const pts = []; const R = camRange(c, 1); for (let i = 0; i <= 14; i++) { const a = c.a - CAM_FOV + 2 * CAM_FOV * i / 14; pts.push([a, castRay(c.x, c.y, a, R)]); } setLayer(flOf(S.player));
      const path = r => { ctx.beginPath(); ctx.moveTo(c.x, c.y); for (const [a, d] of pts) { const dd = Math.min(d, r); ctx.lineTo(c.x + Math.cos(a) * dd, c.y + Math.sin(a) * dd); } ctx.closePath(); };
      ctx.fillStyle = `rgba(255,60,60,${0.17 + c.meter * 0.2})`; path(R); ctx.fill();  // CCTV 시야: 자경대원 원뿔만큼 또렷하게
      ctx.fillStyle = `rgba(255,60,60,${0.24 + c.meter * 0.25})`; path(135); ctx.fill();
      ctx.strokeStyle = `rgba(255,110,110,${0.85 + c.meter * 0.15})`; ctx.lineWidth = 2.2; ctx.setLineDash([5, 5]); path(R); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-7, -5, 20, 12); ctx.fillStyle = c.broken ? '#4a4d55' : '#d8dbe2'; ctx.fillRect(-9, -6, 18, 11); ctx.fillStyle = '#2a2d34'; ctx.fillRect(7, -4, 5, 7);
    ctx.fillStyle = c.broken ? '#666' : on && Math.floor(S.t * 2) % 2 ? '#ff3b3b' : '#601818'; ctx.beginPath(); ctx.arc(-4, 0, 2.2, 0, TAU); ctx.fill(); ctx.restore();
    if (c.broken && Math.random() < 0.05) S.fx.push({ k: 'smoke', x: c.x, y: c.y, t: 0 });
    if (c.meter > 0.02 && on) { ctx.strokeStyle = 'rgba(255,90,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * c.meter); ctx.stroke(); }
  }
}
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
  if (g.club && sameF && dist(g.x, g.y, P.x, P.y) < 220) hint('crowd', '군중: 걸으면 사람들 사이에 섞여 잘 안 띈다. 뛰면 소용없다');
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
    const crimeNow = !!(P.carrying || P.captive || P.strikeT > 0 || (STAGE.zones && (P.pick || (P.useT || 0) > S.t)));
    const homeNow = !!(H && gb === H.b && pb === H.b && flOf(P) === H.fl && !P.z && !P.wire && ptx >= H.x0 && ptx <= H.x1 && pty >= H.y0 && pty <= H.y1);
    const tresNow = !!(STAGE.zones && g.outfit && !g.child && pZoneEff() !== Z_PUB && dist(g.x, g.y, P.x, P.y) < 420);
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
    for (const c of S.corpses) { if (c.stashed || c.carried || c.hidden || c.civSeen || flOf(c) !== flOf(g)) continue; if (canSee(g, c.x, c.y, Math.max(0.45, c.light), false, false, false) > 0) { c.civSeen = true; if (c.accident) { setIcon(g, '!?'); continue; } civScream(g, c.x, c.y, c); return; } }
    if (g.seen && g.chat) endChat(g);
    if (!g.seen && g.chat) { const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.path = null; if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 220) endChat(g); }
    else if (!g.seen) {
      if (g.wander) {  // 군중: 구역 안에서 이리저리
        if (g.wait > 0) g.wait -= dt;
        else { if (!g.path) { const [x0, y0, x1, y1] = g.wander; for (let t = 0; t < 8; t++) { const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), ty = y0 + Math.floor(Math.random() * (y1 - y0 + 1)); if (!solidAt(tx, ty)) { pathTo(g, tc(tx), tc(ty)); break; } } if (!g.path) g.wait = 1; }
          if (g.path && moveAlong(g, SPD.gPatrol * 0.7 * (g.body === 'old' ? 0.65 : 1), dt)) { g.wait = rnd(1.5, 5); g.path = null; g.want = g.a + rnd(-2, 2); } }
      } else if (g.route.length > 1) { if (g.wait <= 0 && g.route.some(r => r.spent)) purgeDetour(g); const wp = g.route[g.ri] || g.route[(g.ri = 0)]; if (g.wait > 0) g.wait -= dt; else { if (!g.path) pathTo(g, wp.x, wp.y); if (moveAlong(g, SPD.gPatrol * 0.8 * (g.body === 'old' ? 0.65 : 1), dt)) { g.wait = wp.pause; if (wp.once) wp.spent = true; g.ri = (g.ri + 1) % g.route.length; g.path = null; } } }
      else { g.glanceT -= dt; if (g.glanceT <= 0) { g.glanceT = rnd(8, 16); g.want = (g.post != null ? g.post : g.a) + rnd(-0.9, 0.9); } }
    }
  }
  const tr = (g.state === 'PANIC' ? 4 : 1.8) * dt; g.a += clamp(angDiff(g.a, g.want), -tr, tr);
}
const NOTICE_AT = 0.35;  // 이 아래(흰색)는 '눈치' 단계, 넘으면 노랑(의심 — 멈춰 보고 확인하러 온다), 1이면 빨강(발각)
const awareCol = g => g.state === 'ALERT' ? '#ff4a3c' : g.meter >= NOTICE_AT || ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state) ? '#f2c46b' : '#f4f1ea';
function updateGuard(g, dt) {
  if (g.yank) return;  // 숨은 곳으로 끌려가는 중 (updateAmbush가 움직인다)
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed) { if (g.doomed) g.moving = false; return; }
  if (g.civ) { updateCiv(g, dt); return; }
  if (g.climb) { g.seen = false; if (g.iconT > 0) g.iconT -= dt; updateClimbG(g, dt); if (g.state === 'ALERT' && S.player) g.lostT = 0; return; }
  const P = S.player;
  g.moving = false;
  if (g.iconT > 0) { g.iconT -= dt; if (g.iconT <= 0 && g.state !== 'ALERT') g.icon = null; }
  if (radioBusy(g)) { g.lastSeen = pSpot(); g.lostT = 0; g.path = null; return; }  // 무전 보고 중: 멈춰 선다
  const spd = (g.target ? SPD.target : SPD.gPatrol * (S.alevel ? 1 : 0.85) * (g.dog ? 1.25 : 1)) * spdMul();
  if (S.alevel && (g.chat || g.act)) { endChat(g); g.act = null; }
  // 공포: 겁에 질려 달아난다. 주변을 못 보고, 가까운 동료를 잘못 벨 수 있다
  if (g.state === 'TERROR') {
    g.seen = false; g.terrorT -= dt;
    if (!g.path || !g.path.length) { const a = Math.atan2(g.y - g.fearFrom.y, g.x - g.fearFrom.x) + rnd(-0.6, 0.6); pathTo(g, g.x + Math.cos(a) * 220, g.y + Math.sin(a) * 220); }
    moveAlong(g, SPD.flee * spdMul(), dt);
    if (!g.slashed && !g.dog) for (const o of S.guards) {
      if (o === g || o.child || o.state === 'DEAD' || o.state === 'CAPTIVE' || dist(o.x, o.y, g.x, g.y) > 40) continue;
      g.slashed = true;
      if (Math.random() < 0.35) { S.lethalNext = true; killGuard(o, null, null, false); S.stats.kills--; if (!o.target && o.civ) S.stats.extraKills--; else if (!o.target) S.stats.crewKills = Math.max(0, (S.stats.crewKills || 0) - 1); S.stats.friendly = (S.stats.friendly || 0) + 1; if (dist(g.x, g.y, P.x, P.y) < 800) toast('겁에 질린 자경대원이 동료를 베었다!', 2.4, 'good'); }
      break;
    }
    if (g.terrorT <= 0) { g.state = 'SEARCH'; g.poi = { x: g.fearFrom.x, y: g.fearFrom.y }; g.reached = false; g.path = null; g.waitBase = 3; setIcon(g, '?'); }
    return;
  }

  if (g.startle) { const da = angDiff(g.a, g.startle.a), st = 16 * dt; if (Math.abs(da) <= st) { g.a = g.startle.a; g.want = g.a; g.startle = null; } else g.a += Math.sign(da) * st; }  // 화들짝 돌아보기 (약 0.2초)
  const sameF = flOf(g) === flOf(P) && !(flOf(P) && P.wire);
  const pv = (P.trav && P.trav.base) || P, onLedge = P.ledge && (g.z || 0) === (P.z || 0);
  let vis = (P.hide || P.under || P.vent || !sameF || onLedge) ? 0 : canSee(g, pv.x, pv.y, P.light, P.hidden, P.cover ? 2 : P.mode === 'sneak' && !P.trav, P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z);
  if (g.dog && sameF && !vis && !P.hide && !P.under && !P.vent && !P.z && !P.jump && dist(g.x, g.y, P.x, P.y) < 100 && los(g.x, g.y, P.x, P.y)) vis = 0.5;  // 냄새
  let zk = 1; const pz = STAGE.zones ? pZoneEff() : Z_HOS;
  if (STAGE.zones) updateSharpEye(g, dt, vis);  // 눈썰미: 변장을 가까이서 오래 보면 알아챈다
  if (vis > 0 && pz === Z_PUB && !g.dog && !knownFace(g)) { zk = suspAct(g); if (!zk) vis = 0; }  // 공개 구역(또는 허가 옷을 입은 금지 구역): 행인으로 보인다
  g.seen = vis > 0; g.sense = null;
  if (STAGE.zones && g.seen && !g.dog && g.state !== 'ALERT' && (P.strikeT > 0 || (S.crimeT && S.t - S.crimeT < 1.2) || P.captive)) { g.meter = 1; goAlert(g); }  // 처치·기절·붙잡는 걸 보면 그 자리에서 발각
  if (g.state === 'WARN') { updateTrespass(g, dt, pz); if (g.state === 'WARN') return; }
  if (g.seen && g.state !== 'FLEE') {
    // 어쌔신 크리드식 발견: 한 번에 들키지 않고 게이지가 찬다. 보통 거리 2~3초, 코앞·밝은 곳은 1초 남짓
    const wary = ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state);
    const dP = dist(g.x, g.y, P.x, P.y), runK = P.mode === 'run' && P.moving ? 2 : 1, nearK = dP < 120 ? 1.5 * (1 - dP / 120) : 0;  // 뛰는 사람·코앞의 사람은 금방 알아본다
    const rate = disguiseMul(g) * D().rate * (0.08 + vis * 0.6 + nearK) * runK * (P.carrying || P.captive ? 1.8 : 1) * (g.state === 'SUSPICIOUS' || g.state === 'SEARCH' ? 1.3 : 1) * (P.mode !== 'run' && !P.carrying && inCrowd(P.x, P.y, flOf(P)) ? 0.35 : 1);
    g.meter = Math.min(pz === Z_PUB && zk < 1 ? 0.9 : 1, g.meter + rate * zk * dt); g.holdT = 0.8;  // 거리에서 웅크린 정도로는 쳐다보기만 한다
    if (g.state !== 'ALERT') {
      if (g.meter >= 1 && pz === Z_RES && !g.warned && !suspAct(g) && !knownFace(g) && !g.civ && !g.target) startWarn(g);  // 출입 금지: 처음엔 나가라고 경고한다
      else if (g.meter >= 1) goAlert(g);
      else if (g.meter < NOTICE_AT && !wary) g.sense = Math.atan2(P.y - g.y, P.x - g.x);  // 흰색: 아직 확신이 없다 — 하던 걸 하며 고개만 돌린다
      else if (g.state !== 'NOTICE') {
        if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35); }
        endChat(g); g.act = null; g.bubble = null;
        g.state = 'NOTICE'; g.poi = { x: P.x, y: P.y }; g.noticeT = 0; g.why = 'saw';
      } else g.poi = { x: P.x, y: P.y };
    }
  } else if (g.state !== 'ALERT') { if (g.holdT > 0) g.holdT -= dt; else g.meter = Math.max(0, g.meter - dt * 0.3); }  // 시야에서 벗어나도 잠깐은 게이지가 남는다
  const sx0 = g.x, sy0 = g.y;
  if (g.hearT > 0) {
    if (g.state !== 'PATROL' && g.state !== 'RETURN') g.hearT = 0;
    else { g.hearT -= dt; if (g.hearT > 0) return; g.hearT = 0; goSuspicious(g, g.hearP.x + rnd(-20, 20), g.hearP.y + rnd(-20, 20), 3.5); g.why = 'heard'; }
  }

  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && S.decals.length && (g.bloodT = (g.bloodT || 0) - dt) <= 0) {  // 핏자국을 보면 다가가 살핀다
    g.bloodT = 0.35;
    for (const d of S.decals) { if (d.seen || flOf(d) !== flOf(g) || (g.z || 0) || dist(g.x, g.y, d.x, d.y) > 170) continue;
      if (canSee(g, d.x, d.y, Math.max(0.45, lightAt(d.x, d.y)), false, false, 0) > 0) {
        // 핏자국을 보면 의심이 아니라 바로 수색: 핏방울이 이어져 있으면 그 끝(시체를 옮겨 간 곳)까지 따라간다
        let end = d; if (d.trail) for (const o of S.decals) if (o.trail === d.trail) { o.seen = true; if (flOf(o) === flOf(g) && (o.k || 0) > (end.k || 0)) end = o; }
        d.seen = true; endChat(g); g.state = 'SEARCH'; g.poi = { x: end.x, y: end.y, fl: flOf(end), z: 0 }; g.reached = false; g.path = null; g.waitBase = 5; g.meter = Math.max(g.meter, 0.6); g.why = 'blood'; setIcon(g, '!');
        gsay(g, end !== d ? ['피가 저쪽으로 이어져 있어!', '누가 끌고 갔어. 따라가 본다.', '핏자국이다… 어디까지 가나 보자.'][g.id % 3] : ['피다! 근처를 뒤져!', '바닥에 피가 있어. 누가 당했어!', '여기서 무슨 일이 있었어.'][g.id % 3]);
        setAlert(2, 30); bossRadio('blood'); break; } }
  }
  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && !g.target && S.vents.length) {
    for (const v of S.vents) if (v.open && !v.roof && dist(g.x, g.y, v.x, v.y) < 150 && Math.abs(angDiff(g.a, Math.atan2(v.y - g.y, v.x - g.x))) < guardFov(g) && los(g.x, g.y, v.x, v.y)) {
      v.open = false; goSuspicious(g, v.x, v.y, 3); if (dist(g.x, g.y, P.x, P.y) < 600) toast('자경대원이 열린 환풍구 창살을 보고 다가간다', 2.2, 'warn'); break;
    }
  }
  if (g.state !== 'ALERT' && g.state !== 'BODY' && g.state !== 'FLEE' && !g.target && !STAGE.tutorial) {  // 연습에서는 시체를 찾지 않는다 (시키는 대로 했는데 수색이 시작되지 않게)
    for (const c of S.corpses) {
      if ((c.hidden && !g.dog) || c.discovered || c.carried || c.stashed || flOf(c) !== flOf(g)) continue;
      if (canSee(g, c.x, c.y, c.light, false, false, false) > 0 || (g.dog && dist(g.x, g.y, c.x, c.y) < 90)) { if (g.dog) { play('bark', 0.5 * proxVol(g)); noise(g.x, g.y, 260, 'bark', flOf(g)); } g.state = 'BODY'; g.body = c; g.path = null; setIcon(g, '!?'); play('question', 0.5); break; }
    }
  }

  switch (g.state) {
    case 'PATROL': {
      if (g.relight) {
        const l = g.relight.l; g.want = Math.atan2(l.y - g.y, l.x - g.x); g.relight.t -= dt;
        if (g.relight.t <= 0) { l.off = false; g.relight = null; g.icon = null; play('switch', 0.4 * proxVol(g)); for (const c of S.corpses) c.light = lightAt(c.x, c.y); if (dist(g.x, g.y, P.x, P.y) < 700) toast('자경대원이 꺼진 조명을 다시 켰다', 2); setAlert(1, 20); }
        break;
      }
      g.lampScan = (g.lampScan || 0) - dt;
      if (g.lampScan <= 0 && !g.target) {
        g.lampScan = 0.6;
        const l = g.dog ? null : S.lamps.find(l => l.off && !l.broken && !l.cold && l.cut == null && flOf(l) === flOf(g) && dist(l.x, l.y, g.x, g.y) < 95 && los(g.x, g.y, l.x, l.y));
        if (l) { g.relight = { l, t: 1.8 }; g.path = null; setIcon(g, '?'); break; }
        const bc = g.dog ? null : (S.cams || []).find(c => c.broken && !c.noticed && c.fl === flOf(g) && dist(c.x, c.y, g.x, g.y) < 170 && los(g.x, g.y, c.x, c.y));
        if (bc) { bc.noticed = true; goSuspicious(g, bc.x, bc.y + 30, 4); bark(g, 'calm'); if (dist(g.x, g.y, S.player.x, S.player.y) < 700) toast('자경대원이 부서진 CCTV를 발견했다', 2.2, 'warn'); break; }
      }
      if (g.follow != null) { followLeader(g, dt, spd); break; }
      if (!g.elite && !g.target && !g.dog && S.lures.length) {
        g.lureScan = (g.lureScan || 0) - dt;
        if (g.lureScan <= 0) {
          g.lureScan = 0.4;
          const l = S.lures.find(l => !l.claim && l.landed && flOf(l) === flOf(g) && canSee(g, l.x, l.y, Math.max(0.5, lightAt(l.x, l.y)), false, false, 0) > 0);
          if (l) { endChat(g); g.act = null; l.claim = g; g.lure = l; g.state = 'LURE'; g.path = null; g.lureT = null; setIcon(g, '?'); break; }
        }
      }
      if (g.chat) {
        const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.bubble = null;
        if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 200) endChat(g);
        break;
      }
      if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = g.elite ? rnd(5, 9) : S.alevel ? rnd(3.5, 7) : rnd(14, 26); break; }
      if (S.alevel >= 1 && !g.target && g.post == null) {
        g.peekT = (g.peekT == null ? rnd(6, 14) : g.peekT) - dt;
        if (g.peekT <= 0) { g.peekT = S.alevel >= 2 ? rnd(8, 14) : rnd(16, 26); if (startCheck(g, { x: g.x, y: g.y }, 1, 230)) break; }
      }
      if (g.wait > 0) {
        g.wait -= dt;
        // 딴짓: 담배 · 하품 (평상시에만)
        if (g.act) {
          g.actT -= dt; g.bubble = g.act === 'smoke' ? '후—' : '하암';
          if (g.actT <= 0) { g.act = null; g.bubble = null; g.idleT = rnd(10, 22); }
        } else if (!S.alevel && !g.target && !g.elite && !g.dog) {
          g.idleT = (g.idleT == null ? rnd(4, 14) : g.idleT) - dt;
          if (g.idleT <= 0) { g.act = Math.random() < 0.6 ? 'smoke' : 'yawn'; g.actT = g.act === 'smoke' ? rnd(5, 8) : rnd(1.6, 2.4); }
        }
        if (g.post != null) {
          g.want = g.act === 'smoke' ? g.post + 0.5 : g.post;
          g.glanceT -= dt; if (g.glanceT <= 0 && !g.act && !g.still) { g.glance = rnd(1.4, 2.2); g.glanceA = g.post + (Math.random() < 0.3 ? Math.PI : (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2); }
        } else if (!g.act && !g.still) lookAround(g, dt, g.waitBase, 1.1, [1.8, 3.2]);
        break;
      }
      if (g.route.some(r => r.spent)) purgeDetour(g);
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) pathTo(g, wp.x, wp.y);
      g.glanceT -= dt;
      if (g.glanceT <= 0 && g.route.length > 1 && !g.still) { g.glance = rnd(2.2, 3.2); g.glanceA = g.a + Math.PI; break; }  // 걷다가 멈춰 뒤돌아보기
      if (moveAlong(g, spd, dt)) {
        g.wait = wp.pause * (S.alevel || wp.once ? 1 : 1.8); g.waitBase = g.a; g.waitT = 0; g.path = null; g.lookT = null;
        if (wp.once) wp.spent = true;
        if (g.route.length > 1) g.ri = (g.ri + 1) % g.route.length; else g.wait = 999;
      }
      break;
    }
    case 'LURE': {
      const l = g.lure;
      if (!l) { g.state = 'RETURN'; break; }
      if (g.lureT == null) {
        if (!g.path) pathTo(g, l.x, l.y);
        if (moveAlong(g, SPD.gSusp, dt) || dist(g.x, g.y, l.x, l.y) < 30) { g.lureT = 3.4; g.act = 'pickup'; g.path = null; }
      } else {
        g.want = Math.atan2(l.y - g.y, l.x - g.x); g.bubble = '담배?'; g.lureT -= dt;
        if (g.lureT <= 0) { S.lures = S.lures.filter(o => o !== l); g.lure = null; g.act = null; g.bubble = null; g.state = 'RETURN'; g.path = null; }
      }
      break;
    }
    case 'NOTICE': {
      g.want = Math.atan2(g.poi.y - g.y, g.poi.x - g.x);
      if (!g.seen) { g.noticeT += dt; if (g.noticeT > 0.9 || g.meter <= 0) goSuspicious(g, g.poi.x, g.poi.y, 4); }
      break;
    }
    case 'SUSPICIOUS': case 'SEARCH': {
      if (!g.reached) {
        if (!g.path) routeTo(g, g.poi);
        const arr = moveAlong(g, SPD.gSusp * spdMul(), dt) || !g.path.length;
        if (hopClimb(g, arr)) break;
        if (arr) { g.reached = true; g.wait = g.waitBase; g.waitBase2 = g.a; g.waitT = 0; g.path = null; g.lookT = null; }
      } else {
        g.waitT += dt; lookAround(g, dt, g.waitBase2, 1.4, [0.9, 1.5]);
        g.wait -= dt;
        if (g.wait <= 0) {
          if (S.alevel >= 2 && !g.target) startCheck(g, g.poi, 4); else { g.state = 'RETURN'; g.path = null; g.icon = null; if (g.chased && !g.civ && !g.dog) { g.chased = false; gsay(g, BARKS.giveup ? BARKS.giveup[g.id % BARKS.giveup.length] : '놓쳤다…'); } }
        }
      }
      break;
    }
    case 'CHECK': {
      const spot = g.checks[0];
      if (!spot || g.z || flOf(g) !== g.homeFl) { g.state = 'RETURN'; g.path = null; g.icon = null; break; }
      if (g.inspect == null) {
        if (!g.path) pathTo(g, spot.x, spot.y);
        if (moveAlong(g, SPD.gSusp * spdMul(), dt) || dist(g.x, g.y, spot.x, spot.y) < 54) { g.path = null; g.inspect = 1.6; setIcon(g, '?'); }
      } else {
        g.want = Math.atan2(spot.y - g.y, spot.x - g.x);
        g.inspect -= dt;
        if (g.inspect <= 0) {
          g.inspect = null; g.checks.shift();
          const inThis = (P.hide && P.hide === spot) || (spot.type === 'bush' && P.hidden && dist(P.x, P.y, spot.x, spot.y) < 44);
          if (inThis) { dragOut(g, spot.type === 'bush' ? '화단을 헤치던 자경대원에게 들켰다.' : spot.type === 'well' ? '맨홀 안을 비추던 자경대원에게 들켰다.' : `${hideIn(spot)}을 뒤지던 자경대원에게 들켰다.`); if (S.over) return; break; }
          if (spot.bodies > 0 && !spot.found) { spot.found = true; S.stats.bodies++; bossRadio('body'); setIcon(g, '!?'); setAlert(2, 35, '숨겨둔 시체가 발견됐다'); }
          if (spot.type === 'bush') for (const c of S.corpses) if (c.hidden && !c.discovered && !c.stashed && dist(c.x, c.y, spot.x, spot.y) < 50) { c.discovered = true; c.hidden = false; S.stats.bodies++; bossRadio('body'); setAlert(2, 35, '화단 속 시체가 발견됐다'); }
        }
      }
      break;
    }
    case 'RETURN': {
      if (g.follow != null) { g.state = 'PATROL'; break; }
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) routeTo(g, { x: wp.x, y: wp.y, fl: g.homeFl, z: 0 });
      const arr = moveAlong(g, spd, dt);
      if (hopClimb(g, arr)) break;
      if (arr) { g.state = 'PATROL'; g.path = null; g.wait = g.post != null ? 999 : 0.5; g.waitBase = g.a; }
      break;
    }
    case 'ALERT': {
      if (g.seen) { g.lastSeen = pSpot(); g.lostT = 0; } else g.lostT += dt;
      g.chased = true;
      // 눈앞에서 계단·배관·전깃줄로 높이를 바꿔 사라지면, 어디로 갔는지는 안다 (같은 단계에 있던 마지막 자리 근처에서 1.5초 안)
      if (!g.seen && g.lostT < 1.5 && g.lastSeen && !P.hide && !P.under && !P.vent) { const ps = pSpot(); if (S.lvl && lvlKey(ps) !== lvlKey(g.lastSeen) && dist(ps.x, ps.y, g.lastSeen.x, g.lastSeen.y) < 200) { g.lastSeen = ps; g.path = null; g.repath = 0; } }
      if (g.target) { if (STAGE.flee) { goFlee(g); break; } g.want = Math.atan2(P.y - g.y, P.x - g.x); if (g.lostT > 5) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0.4; } break; }
      g.repath -= dt;
      if (g.repath <= 0 || !g.path) { routeTo(g, g.lastSeen); g.repath = 0.4; }
      if (hopClimb(g, moveAlong(g, SPD.gAlert * spdMul() * (g.dog ? 1.2 : 1), dt))) break;
      if (g.seen) g.want = Math.atan2(P.y - g.y, P.x - g.x);
      // 가까이 오면 칼을 들었다가(예비 동작) 내려친다 — 그 사이 피하면 산다
      g.atkCd = Math.max(0, (g.atkCd || 0) - dt);
      if (g.atkT > 0) {
        g.atkT -= dt; g.want = Math.atan2(P.y - g.y, P.x - g.x);
        if (g.atkT <= 0) { g.swingT = 0.2; g.atkCd = 1.1; if (sameF && !P.hide && !P.under && !P.vent && (P.z || 0) === (g.z || 0) && !P.jump && !P.wire && !P.trav && dist(g.x, g.y, P.x, P.y) < 54 && los(g.x, g.y, P.x, P.y)) hurtPlayer(g, g.dog ? '들개에게 물렸다.' : '자경대원의 칼에 베였다.'); else play('throw', 0.4 * proxVol(g)); }
      } else if (g.seen && (P.z || 0) === (g.z || 0) && !P.trav && !g.atkCd && dist(g.x, g.y, P.x, P.y) < 46) { g.atkT = g.dog ? 0.35 : 0.55; play('knife', 0.4); }
      if (g.swingT > 0) g.swingT -= dt;
      if (g.seen && P.z > (g.z || 0) && !roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) && dist(g.x, g.y, P.x, P.y) < (g.lookout ? 260 : 130) && (g.shootT = (g.shootT || 0) + dt) > 2.2) { g.shootT = 0; play('kunai', 0.5); hurtPlayer(null, g.lookout ? '옥상 위에서 석궁 화살에 맞았다.' : ('옥상 위로 던진 병에 맞았다.')); if (S.over) return; }
      if (P.hide && P.hide.spotted && dist(g.x, g.y, P.hide.x, P.hide.y) < 60) { P.hide.spotted = false; dragOut(g, P.hide.type === 'well' ? '숨는 모습을 들켜 맨홀에서 끌려 나왔다.' : '숨는 모습을 들켜 수거함에서 끌려 나왔다.'); if (S.over) return; }
      if (g.lostT > 4.5) { g.state = 'SEARCH'; g.poi = g.lastSeen; g.reached = false; g.path = null; g.waitBase = 3; g.meter = 0.5; g.shootT = 0; setIcon(g, '?'); }
      break;
    }
    case 'BODY': {
      const c = g.body;
      if (!c || c.carried || (c.hidden && !g.dog) || c.stashed) { g.state = 'RETURN'; g.path = null; break; }
      if (!g.path) pathTo(g, c.x, c.y);
      if (moveAlong(g, SPD.gBody * spdMul(), dt) || dist(g.x, g.y, c.x, c.y) < 40) {
        if (c.accident) { c.discovered = true; g.state = 'RETURN'; g.path = null; g.icon = null; gsay(g, ['사고가 났네…', '감전됐나 봐. 손대지 마.', '저런, 재수도 없지.'][(g.id + S.corpses.indexOf(c)) % 3]); break; }
        c.discovered = true; S.stats.bodies++; bossRadio('body'); logEv('found', c.x, c.y); setAlert(2, 35, c.ko ? '자경대원이 쓰러진 사람을 깨웠다 — 수색 시작' : '자경대원이 시체를 발견했다 — 수색 시작');
        if (c.ko && c.g) wakeKO(c, g);  // 기절한 사람은 깨워 일으킨다 — 깬 사람도 함께 수색한다
        for (const o of S.guards) if (o !== g && o.state !== 'DEAD' && o.state !== 'ALERT' && !o.target && o.state !== 'FLEE' && flOf(o) === flOf(c) && dist(o.x, o.y, c.x, c.y) < 520) goSuspicious(o, c.x + rnd(-40, 40), c.y + rnd(-40, 40), 5);
        g.state = 'SEARCH'; g.poi = { x: c.x, y: c.y }; g.reached = true; g.wait = 5; g.waitBase2 = g.a; g.waitT = 0; g.path = null;
      }
      break;
    }
    case 'FUSE': {
      const fs = g.fuseAt ? g.fuseAt.at : STAGE.fuse;
      if (!g.path && !g.atFuse) pathTo(g, tc(fs[2]), tc(fs[3]));
      if (!g.atFuse) { if (moveAlong(g, spd, dt)) { g.atFuse = true; g.fuseWork = 2.8; } }
      else {
        g.want = Math.atan2(tc(fs[1]) - g.y, tc(fs[0]) - g.x); g.fuseWork -= dt;
        if (g.fuseWork <= 0 && g.fuseAt) { bldPower(g.fuseAt, true); g.fuseAt.guard = null; g.fuseAt = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); break; }
        if (g.fuseWork <= 0) { S.lightsOn = true; S.fuseGuard = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); toast('자경대원이 조명을 다시 켰다', 2.4); }
      }
      break;
    }
    case 'FLEE': {
      const fp = STAGE.flee;
      if (!g.path) pathTo(g, tc(fp[0]), tc(fp[1]));
      if (moveAlong(g, SPD.flee, dt) || dist(g.x, g.y, tc(fp[0]), tc(fp[1])) < 30) { endGame(false, '표적이 북문으로 달아났다.'); return; }
      break;
    }
  }
  if (g.sense != null && (g.state === 'PATROL' || g.state === 'RETURN')) { g.want = g.sense; g.x = sx0 + (g.x - sx0) * 0.4; g.y = sy0 + (g.y - sy0) * 0.4; }  // 흰색 단계: 걸음이 느려지고 이쪽으로 고개를 돌린다
  const tr = (g.state === 'ALERT' || g.state === 'NOTICE' ? 5.5 : ['SEARCH', 'SUSPICIOUS', 'CHECK', 'BODY'].includes(g.state) ? 3 : 1.7 + S.alevel * 0.35) * dt;  // 평소엔 천천히 고개를 돌린다
  g.a += clamp(angDiff(g.a, g.want), -tr, tr);
  if (g.moving) {
    g.stepT -= dt;
    if (g.stepT <= 0) {
      g.stepT = g.state === 'ALERT' || g.state === 'FLEE' ? 0.32 : 0.58;
      const d = dist(g.x, g.y, P.x, P.y);
      if (d < 360) play(stepSound(g.x, g.y), (1 - d / 360) * (g.state === 'ALERT' ? 0.5 : 0.28));
    }
  }
}
// 숨을 만한 곳 목록을 만들어 하나씩 확인하러 간다
function startCheck(g, at, max, radius) {
  const R = radius || 330;
  const gf = flOf(g);
  const cand = S.hides.filter(h => (h.fl || 0) === gf && (h.z || 0) === (g.z || 0) && dist(h.x, h.y, at.x, at.y) < R);
  const bushes = gf ? [] : S.bushes.filter(b => dist(b.x, b.y, at.x, at.y) < Math.min(R, 240)).sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
  const picked = []; for (const b of bushes) if (!picked.some(p => dist(p.x, p.y, b.x, b.y) < 80)) picked.push(b);
  const list = cand.concat(picked.slice(0, 2)).filter(s => astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), s.tx, s.ty).length || dist(g.x, g.y, s.x, s.y) < 60)
    .sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y)).slice(0, max);
  if (!list.length) { g.state = 'RETURN'; g.path = null; g.icon = null; return false; }
  g.state = 'CHECK'; g.checks = list; g.inspect = null; g.path = null; setIcon(g, '?');
  return true;
}
// 평상시 두 자경대원이 가까이 서 있으면 잠시 잡담 — 서로를 보느라 주변을 덜 본다
function endChat(g) { if (!g.chat) return; const o = g.chat.with; g.chat = null; g.bubble = null; g.say = null; g.chatCd = rnd(20, 40); if (o.chat && o.chat.with === g) endChat(o); }

// 대화: 가까이 선 둘이 멈춰 서서 말풍선으로 주고받는다 (엿들으면 정보가 나오기도 한다)
const TALK_GUARD = [
  [[0, '오늘도 통조림 반 개야.'], [1, '총대 쪽은 고기 먹는다더라.'], [0, '…목소리 낮춰.']],
  [[0, '어젯밤 3동에서 비명 들었어?'], [1, '고양이겠지.'], [0, '고양이가 문을 열고 다니냐.']],
  [[0, '교대 언제야?'], [1, '새벽 네 시.'], [0, '그때까지 버티면 담배 한 갑이다.']],
  [[0, '옥상도 봐야 하나?'], [1, '위엔 아무도 없어. 올라가기 귀찮아.'], [0, '그러다 당한다.']],
  [[0, '전깃줄에 뭐가 매달린 것 같던데.'], [1, '까마귀야.'], [0, '까마귀치곤 컸어.']],
  [[0, '열쇠는 누가 갖고 있어?'], [1, '순찰 도는 놈이 차고 다녀.'], [0, '그놈 또 졸겠네.']],
  [[0, '전쟁 끝난 거 맞아?'], [1, '누가 이겼는지 아무도 몰라.'], [0, '그럼 우린 누구 편인데.']],
  [[0, '두꺼비집 근처는 네가 봐.'], [1, '불 꺼지면 우리만 손해지.'], [0, '그러니까.']],
  [[0, 'CCTV 하나 또 나갔대.'], [1, '부품이 없어. 그냥 둬.'], [0, '그러다 찍힐 것도 못 찍지.']]
];
const TALK_CIV = [
  [[0, '쌀 좀 남았어요?'], [1, '한 되요. 애들 먹여야지.']],
  [[0, '밤엔 나가지 마요. 자경대 눈이 벌개요.'], [1, '알아요. 문 잠갔어요.']],
  [[0, '한 선생님 댁 가 봤어요?'], [1, '어제 약 받아 왔어요. 돈도 안 받으시더라.']],
  [[0, '담배 한 갑에 통조림 셋이래.'], [1, '지난주엔 둘이었는데.']],
  [[0, '옆 동 할머니 괜찮으세요?'], [1, '기침이 안 멎어요.']]
];
const TALK_CLUB = [
  [[0, '여기 술은 어디서 나는 거야?'], [1, '묻지 마. 그냥 마셔.']],
  [[0, '강 실장 왔대.'], [1, 'VIP석? 또 총대 손님 데려왔겠지.']],
  [[0, '노래 좋다!'], [1, '뭐라고? 안 들려!']],
  [[0, '강 건너는 굶는다던데.'], [1, '여긴 남쪽이잖아.']],
  [[0, '2층 올라가 봤어?'], [1, '경호원이 막아. 계단 옆에 서 있어.']]
];
function startTalk(a, b) {
  const pool = a.civ ? (a.club && STAGE.neon ? TALK_CLUB : TALK_CIV).concat((STAGE.talks || {})[a.club ? 'club' : 'civ'] || []) : TALK_GUARD.concat((STAGE.talks || {}).guard || []);
  const lines = pool[(Math.random() * pool.length) | 0];
  const C = { a, b, lines, i: -1, lt: 0.4 }; a.chat = { with: b, C, t: 99 }; b.chat = { with: a, C, t: 99 }; a.path = null; b.path = null;
}
function updateTalks(dt) {
  const seen = new Set();
  for (const g of S.guards) { const C = g.chat && g.chat.C; if (!C || seen.has(C)) continue; seen.add(C);
    C.lt -= dt; if (C.lt > 0) continue;
    C.i++; C.a.say = C.b.say = null;
    if (C.i >= C.lines.length) { endChat(C.a); continue; }
    const [who, text] = C.lines[C.i], sp = who ? C.b : C.a; sp.say = text; C.lt = 1.6 + text.length * 0.07;
  }
}
// 말풍선 (어둠 위에 그린다): 같은 층, 가까이 있을 때만 (들리는 거리)
// 머리 위 말풍선: 밝은 바탕·둥근 모서리, 말하는 사람 역할 색 테두리, 길면 두 줄. 겹치면 위로 쌓는다
function drawSpeech() {
  const P = S.player, placed = [], who = [];
  for (const g of S.guards) if (g.say && g.state !== 'DEAD' && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) <= 560) who.push(g);
  if (P.say && !P.hide) who.push(P);
  ctx.font = '600 13px "IBM Plex Sans KR", sans-serif';
  for (const g of who) {
    const hero = g === P, col = hero ? DLG_COL.hero : g.civ ? DLG_COL.civ : g.target ? DLG_COL.target : g.elite ? DLG_COL.elite : DLG_COL.guard;
    const words = g.say.split(' '), lines = ['']; for (const w of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (ctx.measureText(t).width > 200 && lines[lines.length - 1] && lines.length < 2) lines.push(w); else lines[lines.length - 1] = t; }
    const tw = Math.min(210, Math.max(...lines.map(l => ctx.measureText(l).width))), w = tw + 20, h = 10 + lines.length * 17, vx0 = cam.x - W / SCALE / 2 + 6, vx1 = cam.x + W / SCALE / 2 - 6, x = Math.max(vx0, Math.min(vx1 - w, g.x - w / 2));  // 화면 밖으로 잘리지 않게
    let y = g.y - 58 - h + 24; for (let k = 0; k < 6 && placed.some(r => x < r.x + r.w + 4 && x + w + 4 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y); k++) y -= h + 6;
    placed.push({ x, y, w, h });
    if (y + h < g.y - 40) { ctx.strokeStyle = 'rgba(232,236,244,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, y + h); ctx.lineTo(g.x, g.y - 40); ctx.stroke(); }
    const rr = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px + r, py); ctx.arcTo(px + pw, py, px + pw, py + ph, r); ctx.arcTo(px + pw, py + ph, px, py + ph, r); ctx.arcTo(px, py + ph, px, py, r); ctx.arcTo(px, py, px + pw, py, r); ctx.closePath(); };
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(x + 1, y + 3, w, h, 8); ctx.fill();
    ctx.fillStyle = '#f3f5f9'; rr(x, y, w, h, 8); ctx.fill(); { const tx = Math.max(x + 10, Math.min(x + w - 10, g.x)); ctx.beginPath(); ctx.moveTo(tx - 6, y + h - 1); ctx.lineTo(tx + 6, y + h - 1); ctx.lineTo(tx, y + h + 7); ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x + 1, y + 1, w - 2, h - 2, 7); ctx.stroke();
    ctx.fillStyle = '#16181f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 5 + 17 * i + 9, 214)); ctx.textBaseline = 'alphabetic';
  }
}
function updateChats(dt) {
  updateTalks(dt);
  const gs = S.guards.filter(g => g.state === 'PATROL' && !g.target && !g.dog && g.follow == null && !g.relight && !(g.civ && (g.sleep || g.seen)) && !(g.elite && !g.civ));
  for (const g of gs) g.chatCd = (g.chatCd == null ? rnd(4, 14) : g.chatCd) - dt;
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = gs[i], b = gs[j];
    if (a.civ !== b.civ || (S.alevel && !a.civ)) continue;
    if (a.chat || b.chat || a.chatCd > 0 || b.chatCd > 0 || flOf(a) !== flOf(b)) continue;
    if (dist(a.x, a.y, b.x, b.y) > (a.civ ? 170 : 200)) continue;
    setLayer(flOf(a)); const ok = los(a.x, a.y, b.x, b.y); setLayer(flOf(S.player)); if (!ok) continue;
    startTalk(a, b);
  }
}
function followLeader(g, dt, spd) {
  const L = S.guards[g.follow];
  if (!L || L.state === 'DEAD') {  // 앞서 가던 짝이 사라졌다: 마지막 자리로 찾으러 간다
    g.follow = null; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.post = g.a;
    if (L && !g.civ && !g.dog) { goSuspicious(g, L.x, L.y, 6); g.why = 'saw'; gsay(g, ['어디 갔어? 대답해!', '야… 어디 간 거야?', '방금까지 앞에 있었는데…'][g.id % 3]); setIcon(g, '?'); }
    return;
  }
  const bx = L.x - Math.cos(L.a) * 52, by = L.y - Math.sin(L.a) * 52;
  const d = dist(g.x, g.y, bx, by);
  g.repath -= dt;
  if (d > 30) {
    if (g.repath <= 0 || !g.path) { pathTo(g, bx, by); g.repath = 0.6; }
    moveAlong(g, Math.max(spd, SPD.target * 1.5), dt);
  } else {
    g.path = null;
    g.glanceT -= dt;
    if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = rnd(5, 9); }
    else if (g.glanceT <= 0) { g.glance = rnd(1.2, 1.8); g.glanceA = L.a + Math.PI + rnd(-0.6, 0.6); }
    else g.want = L.a;
  }
}
// 순라꾼에게 맞음: 체력 1 감소, 뒤로 밀림, 잠깐 무적. 체력이 다하면 실패
function hurtPlayer(g, why) {
  const P = S.player; if (P.hurtT > 0 || S.over) return;
  if (!S.saidHurt && P.hp > 1) { S.saidHurt = true; after(0.6, () => bark('hero', 'hurt')); }
  P.hp--; P.hurtT = 2.0; P.adrenT = 1.6; S.flash = 0.28;  // 맞으면 2초 무적 + 1.6초 동안 더 빨리 뛴다 (도망칠 여유)
  play(Math.random() < 0.5 ? 'kill' : 'kill2', 0.6); play('thud', 0.5);
  if (g) g.atkCd = Math.max(g.atkCd || 0, 2.2);  // 때린 자경대원은 잠깐 숨을 고른다
  for (const o of S.guards) if (o !== g && o.state === 'ALERT' && dist(o.x, o.y, P.x, P.y) < 80) o.atkCd = Math.max(o.atkCd || 0, 1.2);  // 옆 자경대원이 바로 이어 베지 않게
  if (g) {  // 뒤로 밀림: 조금씩 밀다가 벽에 닿으면 멈춘다 (한 번에 30px 밀면 벽 속에 박혔다)
    const a = dist(P.x, P.y, g.x, g.y) < 4 ? g.a : Math.atan2(P.y - g.y, P.x - g.x), sol = P.z ? solidFor(P.z) : groundSolidP, px0 = P.x, py0 = P.y;
    for (let k = 0; k < 6; k++) { const nx = P.x + Math.cos(a) * 5, ny = P.y + Math.sin(a) * 5; if (sol(Math.floor((nx + Math.cos(a) * 12) / TILE), Math.floor((ny + Math.sin(a) * 12) / TILE))) break; P.x = nx; P.y = ny; }
    collide(P, P.z ? 10 : 13, sol); if (sol(Math.floor(P.x / TILE), Math.floor(P.y / TILE))) { P.x = px0; P.y = py0; } }
  if (P.carrying) { const c = P.carrying; c.carried = false; c.hidden = false; P.carrying = null; }
  if (P.captive) { const c = P.captive; P.captive = null; c.state = 'PATROL'; goAlert(c); }
  if (P.hp <= 0) { endGame(false, why); return; }
  toast(P.hp === 1 ? `${why.replace(/\.$/, '')} — 마지막 체력! 지금 시야를 끊고 숨어라` : `${why.replace(/\.$/, '')} — 체력 ${P.hp}/${P.hpMax}. 시야를 끊고 숨어라`, 2.6, P.hp === 1 ? 'warn big' : 'warn');
}
// 숨은 곳에서 끌려 나옴
function dragOut(g, why) {
  const P = S.player; const b = P.hide; if (b) { leaveHide({ x: P.x - g.x, y: P.y - g.y }); }
  goAlert(g); hurtPlayer(g, why);
}
// 시체를 던져 겁주기 (Mark of the Ninja의 공포): 떨어진 곳 주변의 자경대원이 비명을 지르고 달아난다
function terrorAt(x, y) {
  let n = 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.target || flOf(g) || dist(g.x, g.y, x, y) > 190 || !los(g.x, g.y, x, y)) continue;
    if (g.civ) { civScream(g, x, y); continue; }
    if (g.elite) { goSuspicious(g, x, y, 4); setIcon(g, '흥'); continue; }
    endChat(g); g.act = null; g.state = 'TERROR'; g.terrorT = rnd(3.5, 4.8); g.fearFrom = { x, y }; g.path = null; g.slashed = false; g.icon = '!?'; g.iconT = 4; g.meter = 0; n++;
    if (g.dog) play('bark', 0.6 * proxVol(g));
  }
  play('call', 0.7, 1.45); play('question', 0.5, 0.8); noise(x, y, 260, 'terror');
  if (n) { S.stats.terror = (S.stats.terror || 0) + n; setAlert(2, 30, `공포! 자경대원 ${n}명이 겁에 질려 달아난다`); bark(anyGuard(g => g.state === 'TERROR'), 'terror'); hint('terror', '겁에 질린 자경대원은 잠시 아무것도 못 보고 달아난다. 그 틈에 지나가거나 처리하라'); }
  else toast('시체가 떨어졌지만 본 자경대원이 없다', 2);
}
function goAlert(g) {
  if (g.dog && g.state !== 'ALERT') { play('bark', 0.7); noise(g.x, g.y, 320, 'bark', flOf(g)); }
  const P = S.player; endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'ALERT') { S.stats.detected++; logEv('seen', S.player.x, S.player.y); play('alert', 0.65); if (S.alevel < 3) { if (g.dog) say([[g, '멍! 멍멍!']]); else bark(g, 'alert'); } }
  if (P.disguise && !P.disguiseBlown) { if (P.outfit) (P.blown = P.blown || {})[P.outfit] = true; P.disguiseBlown = true; toast(P.outfit && STAGE.zones ? `들통났다 — 이제 ${outfitName(P.outfit)}은 통하지 않는다` : '변장이 들통났다', 2.4, 'warn'); }
  if (g.seen) S.chaseSeen = true;  // 본 사람이 있으면 수색이 끝날 때까지 얼굴을 안다 (무전기와 상관없이)
  g.state = 'ALERT'; g.icon = '!'; g.iconT = 99; g.lastSeen = pSpot(); g.lostT = 0; g.path = null; g.repath = 0; g.meter = 1; g.shootT = 0;
  if (S.fuseGuard === g) { S.fuseGuard = null; g.atFuse = false; }
  if (g.target) toast('표적이 소리쳤다 — 자경대원이 몰려온다', 2.6, 'warn');
  let radio = !!g.radio;
  for (const o of S.guards) {
    if (o === g || o.civ || o.yank || o.state === 'DEAD' || o.state === 'ALERT' || o.target || o.state === 'FLEE' || o.state === 'CAPTIVE' || o.state === 'TERROR' || flOf(o) !== flOf(g)) continue;
    if (dist(o.x, o.y, g.x, g.y) < 340) { o.state = 'ALERT'; o.icon = '!'; o.iconT = 99; o.lastSeen = pSpot(); o.lostT = 0.5; o.path = null; o.repath = 0; o.meter = 1; o.shootT = 0; if (o.radio) radio = true; }
  }
  if (!radio && !g.target) {  // 무전기를 가진 자경대원이 없으면 경보가 근처에만 머문다 (증원·전체 경보 없음)
    if (S.alevel < 2) toast('근처 자경대원만 알아챘다 — 무전기 자경대원이 없다', 2.4);
    setAlert(2, 30);
  } else if (!g.target) {  // 무전: 바로 퍼지지 않는다. 무전기 자경대원이 몇 초간 보고하는 사이 처치하면 끊긴다
    if (S.alevel < 3 && !S.radioCall) {
      const rg = g.radio ? g : S.guards.filter(o => o.radio && o.state === 'ALERT' && o.state !== 'DEAD').sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
      if (rg) { const dur = DKEY === 'easy' ? 3.4 : DKEY === 'hard' ? 2.2 : 2.8; S.radioCall = { g: rg, t: dur, dur, at: pSpot() }; rg.icon = '!'; rg.iconT = 99;
        toast('무전기 자경대원이 보고한다 — ' + dur.toFixed(1) + '초 안에 처치하면 끊긴다', 2.4, 'warn'); play('metal', 0.25, 1.9); hint('radioCall', '무전 중인 자경대원은 멈춰 있다. 등 뒤가 아니어도 처치할 수 있다'); }
    }
    setAlert(2, 30);
  } else if (!S.radioCall) {  // 표적도 바로 전체 경보가 아니라 2초 동안 소리친다 — 그 사이 처치하면 막힌다
    S.radioCall = { g, t: 2.0, dur: 2.0, at: pSpot(), shout: true }; toast('표적이 사람을 부른다 — 2초 안에 막으면 퍼지지 않는다', 2.4, 'warn');
    setAlert(2, 30);
  } else setAlert(2, 30);
  hint('alert', '발각! 시야를 끊고 20초 숨어 버티면 수색으로 바뀐다');
}
function radioSpread(at) {
  toast('무전으로 경보가 퍼졌다', 2.4, 'warn');
  for (const o of S.guards) if (!o.civ && !o.dog && !o.target && !o.yank && o.state !== 'DEAD' && o.state !== 'ALERT' && o.state !== 'CAPTIVE' && flOf(o) === (at.fl || 0) && dist(o.x, o.y, at.x, at.y) < 1100) { o.state = 'SEARCH';  // 같은 층만 몰려온다 (다른 층은 모른다)
    o.poi = { x: at.x + rnd(-60, 60), y: at.y + rnd(-60, 60), fl: at.fl, z: at.z }; o.reached = false; o.path = null; o.waitBase = 4; setIcon(o, '!'); }
  setAlert(3);
}
const radioBusy = g => !!(S.radioCall && S.radioCall.g === g);
function updateRadioCall(dt) {
  const R = S.radioCall; if (!R) return;
  const g = R.g;
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.doomed) { S.radioCall = null; S.stats.radioCut = (S.stats.radioCut || 0) + 1; toast(R.shout ? '소리치기 전에 막았다 — 경보가 퍼지지 않았다' : '무전을 끊었다 — 경보가 퍼지지 않았다', 2.4, 'good'); logEv && logEv('radioCut', g.x, g.y); return; }
  if (g.state !== 'ALERT') { S.radioCall = null; return; }
  if ((R.t -= dt) <= 0) { S.radioCall = null; radioSpread(R.at); }
}
// 벽 너머 발소리: 보이지 않는 자경대원이 들리는 거리 안에서 움직이면 발밑에 작은 소리 원 (마크 오브 더 도둑 방식)
function drawHeardSteps(P, openB, gVis) {
  if (P.under || P.vent) return;
  const fP = flOf(P);
  for (const g of S.guards) {
    if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !g.moving) continue;
    const fG = flOf(g); if (fG !== fP) continue;  // 다른 층 사람은 아예 보이지도 들리지도 않는다 (헷갈리지 않게)
    const hidden = coveredG(g, openB) || !gVis(g); if (!hidden) continue;
    const d = dist(P.x, P.y, g.x, g.y), R = 330 * (g.state === 'ALERT' || g.state === 'SEARCH' ? 1.3 : 1); if (d > R) continue;
    const per = g.state === 'ALERT' ? 0.34 : 0.5, f = ((S.t + (g.id || 0) * 0.37) % per) / per, a = (1 - f) * (1 - d / R * 0.6);
    ctx.strokeStyle = g.state === 'ALERT' || g.state === 'SEARCH' ? `rgba(255,140,110,${0.75 * a})` : `rgba(160,210,255,${0.9 * a})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.x, g.y + 6, 5 + 15 * f, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(150,200,255,${0.55 * (1 - d / R * 0.5)})`; ctx.beginPath(); ctx.arc(g.x, g.y + 6, 2.2, 0, TAU); ctx.fill();
  }
}
function drawRadioCall() {
  const R = S.radioCall; if (!R) return; const g = R.g; if (flOf(g) !== flOf(S.player)) return;
  const k = 1 - R.t / R.dur, x = g.x + 34, y = g.y - 30;
  ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8473c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  drawRadio(x, y + 4);
  ctx.strokeStyle = `rgba(232,71,60,${0.5 + 0.4 * Math.sin(S.t * 12)})`; ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + 4, y - 8, 6 * i, -1.2, -0.2); ctx.stroke(); }
  ctx.font = '700 12px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3a8'; ctx.fillText('무전 중', x + 6, y - 21); ctx.textAlign = 'left';
}
function startFlee() {
  if (S.fleeing) return; S.fleeing = true;
  for (const g of S.guards) if (g.target && g.state !== 'DEAD') goFlee(g);
  toast('표적이 북문으로 도주한다 — 빠져나가기 전에 막아라', 3.5, 'warn');
}
function goFlee(g) { g.state = 'FLEE'; g.path = null; g.icon = '!'; g.iconT = 99; }

