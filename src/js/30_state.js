// ---------------------------------------------------------------- 상태
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const darkC = document.createElement('canvas'); const dctx = darkC.getContext('2d');
let mapC = null, ugC = null, ventC = null, S_ugC = null, stripePat = {};
let W = 0, H = 0, DPR = 1, SCALE = 1, BASE_SCALE = 1;
let userZoom = 1.1, showRoutes = false, tactical = false, showOpps = true, oppMode = 1;  // 기회 안내: 2 전체 · 1 최소(기본 — 스스로 찾게) · 0 끔
try { const o = localStorage.getItem('yahaeng.opps'); if (o === '0') { showOpps = false; oppMode = 0; } else if (o === '2') oppMode = 2; } catch (e) {}
try { const z = parseFloat(localStorage.getItem('yahaeng.zoom2')); if (z >= 0.8 && z <= 1.6) userZoom = z;  // 예전 저장값(멀리 본 시점)은 쓰지 않는다
  const r = localStorage.getItem('yahaeng.routes2'); if (r === '1') showRoutes = true; } catch (e) {}
let cam = { x: 0, y: 0 };
let S = null;
let running = false, paused = false;

// 의뢰 변형 (깬 의뢰에만): 같은 지도를 다른 조건으로 다시 (히트맨 에스컬레이션 방식)
const MODS = { reinf: ['순찰 증원', '순찰 자경대원이 둘 늘어난다 (반대 방향으로 돈다)'], timer: ['제한 시간', '6분 안에 끝내야 한다'], bright: ['환한 밤', '어둠 속에서도 자경대원이 1.5배 멀리 본다'], bare: ['맨손', '락픽·빈 캔·다트 없이 시작한다'] };
let MOD = ''; try { const m = localStorage.getItem('yahaeng.mod'); if (MODS[m]) MOD = m; } catch (e) {}
const stageCleared = st => !!(loadCh()[st.id] || {})._clear;
// 판 안 예약 동작: 게임 시간(S.t)으로 센다 — 일시정지하면 멈추고, 판이 바뀌면 사라진다 (setTimeout 은 이전 판 일이 새 판에 끼어들었다)
function after(sec, fn) { if (S) (S.timers || (S.timers = [])).push({ at: S.t + sec, fn }); }
function runTimers() { const T = S && S.timers; if (!T || !T.length) return; const now = S.t, due = T.filter(o => o.at <= now); if (!due.length) return; S.timers = T.filter(o => o.at > now); for (const o of due) { if (S.over) return; try { o.fn(); } catch (e) { console.error(e); } } }
function newGame(si) {
  STAGE_I = si; STAGE = STAGES[si]; CP = null;
  const modNow = MOD && !STAGE.tutorial && stageCleared(STAGE) ? MOD : '';
  pickAlts(STAGE);
  buildMap(STAGE); setLayer(0); buildFRM(false);
  if (STAGE.startAt) { const q = planPt(STAGE.startAt.b, STAGE.startAt.fl || 0, STAGE.startAt.at); if (q) STAGE.start = q; }  // 건물 안에서 시작 (감방 등)
  const lamps = STAGE.lamps.concat(AUTO_LAMPS).map(l => ({ x: tc(l[0]), y: tc(l[1]), r: l[2], outdoor: !!l[3], poly: null, broken: false, fl: l[4] || 0, col: l[5] || null }));
  // 도시: 전봇대마다 보안등 (셋 중 하나는 고장 나 꺼져 있다 — 어두운 틈)
  POLES.forEach(([px, py], i) => { if ((px * 7 + py * 3) % 3 === 2) return; const oy = !SOLID.has(G0[py + 1] && G0[py + 1][px]) ? 0.55 : -0.55; lamps.push({ x: tc(px), y: tc(py) + oy * TILE, r: 170, outdoor: true, poly: null, broken: false, fl: 0, pole: true, flk: (px + py) % 4 === 0 ? { f: 2.3 + (px % 3), p: py } : null }); });
  if (STAGE.neon) lamps.forEach((l, i) => { if (l.outdoor && l.col && i % 3 === 1) l.flk = { f: 3.1 + (i % 4), p: i }; });
  // 아궁이(벽난로): 방을 밝히는 불. 옥상의 굴뚝과 이어진다
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'Q' || G[ty][tx] === 'q') lamps.push({ x: tc(tx), y: tc(ty), r: 135, outdoor: false, poly: null, broken: false, hearth: true, cold: G[ty][tx] === 'q', off: G[ty][tx] === 'q', tx, ty });
  lamps.forEach(l => { setLayer(l.fl); l.poly = []; for (let i = 0; i < 180; i++) { const a = i / 180 * TAU; const d = Math.min(l.r, castRay(l.x, l.y, a, l.r) + 20); l.poly.push(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d); } }); setLayer(0); for (const k in lightCache) delete lightCache[k];  // 새 판: 미리 그린 빛 지도 버림
  // 군중: 클럽 안(층마다)과 지정한 바깥 자리. 사람들이 돌아다니고, 그 사이에 섞이면 잘 안 보이고 소리도 묻힌다
  CROWD = [];
  PLANS.forEach((fls, bi) => (fls || []).forEach((p, f) => { if (p && p.store && (p.store.use === 'club' || p.store.use === 'vip')) CROWD.push({ x0: p.store.x0, y0: p.store.y0 + 1, x1: p.store.x1, y1: p.store.y1, fl: f, n: p.store.use === 'vip' ? 5 : 7, club: true, b: bi }); }));
  (STAGE.crowd || []).forEach(c => CROWD.push({ x0: c[0], y0: c[1], x1: c[2], y1: c[3], fl: c[4] || 0, n: c[5] || 5 }));
  const crowdGuys = []; CROWD.forEach((c, ci) => { const g = c.fl ? GF[c.fl] : G0; for (let k = 0; k < c.n; k++) { for (let t = 0; t < 30; t++) { const h = ((ci * 7919) ^ (k * 104729) ^ (t * 1299709)) >>> 0, x = c.x0 + h % (c.x1 - c.x0 + 1), y = c.y0 + (h >> 8) % (c.y1 - c.y0 + 1); if (!SOLID.has(g[y][x]) && g[y][x] !== 'Y') { crowdGuys.push({ kind: 'civ', look: (h >> 4) % 4, fl: c.fl, at: [x, y], post: ((h >> 6) % 4) * 90, wander: [c.x0, c.y0, c.x1, c.y1], club: true }); break; } } } });
  STAGE._g = STAGE.guards.map(resolveGuard).concat(autoResidents(), crowdGuys);
  STAGE._items = (STAGE.items || []).map(p => Array.isArray(p) ? p : (q => [q[0], q[1], p.fl || 0, p.b])(planPt(p.b, p.fl || 0, p.at || 'bed')));
  const guards = STAGE._g.map((d, i) => makeGuard(d, i));
  if (modNow === 'reinf') STAGE._g.filter(d => d.route && d.route.length > 1 && d.kind !== 'civ' && d.kind !== 'dog' && !d.target).slice(0, 2).forEach(d => { const g = makeGuard(Object.assign({}, d, { route: d.route.slice().reverse(), key: null }), guards.length); g.reinf = true; guards.push(g); });
  guards.forEach(g => { setLayer(g.fl); buildRouteLine(g); if (g.civ && g.sleep) g.state = 'SLEEP'; }); setLayer(0);
  guards.forEach(g => { if (!g.civ && !g.dog && !g.target && !g.elite && g.id % 2 === 0) g.torch = true; });  // 자경대원 절반은 손전등
  // 주민의 '집': 자기 세대(거실·방·욕실) 칸 범위. 계단실·가게·클럽 같은 공용 공간은 집이 아니다
  guards.forEach(g => {
    if (!g.civ || g.club) return; const tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE), bi = bldAt(tx, ty), p = bi >= 0 && PLANS[bi] && PLANS[bi][g.fl]; if (!p) return;
    for (const u of p.units) { const rs = [u.living, u.bath, ...u.rooms].filter(Boolean); const bx = { x0: Math.min(...rs.map(r => r.x0)), y0: Math.min(...rs.map(r => r.y0)), x1: Math.max(...rs.map(r => r.x1)), y1: Math.max(...rs.map(r => r.y1)) };
      if (tx >= bx.x0 && tx <= bx.x1 && ty >= bx.y0 && ty <= bx.y1) { g.home = Object.assign({ b: bi, fl: g.fl }, bx); break; } }
  });
  const hides = [], ladders = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (G[ty][tx] === 'H') hides.push({ type: 'box', tx, ty, x: tc(tx), y: tc(ty), bodies: 0, cap: 2 });
    if (G[ty][tx] === 'W') hides.push({ type: 'well', tx, ty, x: tc(tx), y: tc(ty), bodies: 0, cap: 99 });
    if (G[ty][tx] === 'L') {
      const o = N8.slice(0, 4).find(o => roofAt(tx + o[0], ty + o[1])) || N8.find(o => roofAt(tx + o[0], ty + o[1]));
      if (o) ladders.push({ kind: 'ladder', bx: tx, by: ty, bz: 0, tx: tx + o[0], ty: ty + o[1], tz: lvAt(tx + o[0], ty + o[1]) });
    }
  }
  PIPES.forEach(([px, py]) => {
    const tz = lvAt(px, py);
    for (const o of N8.slice(0, 4)) {
      const bx = px + o[0], by = py + o[1], bl = lvAt(bx, by);
      if (bl < tz && (bl > 0 || !solidAt(bx, by))) { ladders.push({ kind: 'pipe', bx, by, bz: bl, tx: px, ty: py, tz }); break; }
    }
  });
  ladders.forEach(l => { l.x = tc(l.bx); l.y = tc(l.by); l.ux = tc(l.tx); l.uy = tc(l.ty); });
  // 실내 가구 은신처: 옷장 · 침대 밑 · 사물함 (층마다)
  FURN.forEach(it => { const t = it.t === 'cbed' ? 'bed' : it.t; if (!FURN_HIDE[t]) return; hides.push({ type: t, furn: true, tx: it.x, ty: it.y, x: (it.x + it.w / 2) * TILE, y: (it.y + it.h / 2) * TILE, fl: it.fl || 0, bodies: 0, cap: 1 }); });
  S_ugC = null;
  const wells = hides.filter(h => h.type === 'well');
  wells.forEach((w, i) => { w.next = wells.length > 1 ? wells[(i + 1) % wells.length] : null; });
  buildSewers(wells);
  // 실내 계단: 건물 안 'Y' 칸에서 그 건물 옥상으로
  // 층계: 1층 → 2층 → … → 꼭대기 층 → 옥상 (같은 칸)
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'Y' && lvAt(tx, ty) > 0) {
    const top = lvAt(tx, ty);
    let f = 0; for (; f < top - 1 && GF[f + 1] && GF[f + 1][ty][tx] === 'Y'; f++) ladders.push({ kind: 'fstair', bx: tx, by: ty, bz: 0, bfl: f, tfl: f + 1, tx, ty, tz: 0, x: tc(tx), y: tc(ty), ux: tc(tx), uy: tc(ty) });
    ladders.push({ kind: 'stair', bx: tx, by: ty, bz: 0, bfl: f, tx, ty, tz: top, x: tc(tx), y: tc(ty), ux: tc(tx), uy: tc(ty) });
  }
  // 굴뚝: 옥상 위 굴뚝(아궁이 칸 바로 위) ↔ 아궁이 앞 바닥
  lamps.filter(l => l.hearth).forEach(l => {
    const tz = lvAt(l.tx, l.ty), b = bldAt(l.tx, l.ty); if (!tz || b < 0) return;
    const o = N8.find(o => !solidAt(l.tx + o[0], l.ty + o[1]) && bldAt(l.tx + o[0], l.ty + o[1]) === b); if (!o) return;
    ladders.push({ kind: 'chimney', lamp: l, bx: l.tx + o[0], by: l.ty + o[1], bz: 0, tx: l.tx, ty: l.ty, tz, x: tc(l.tx + o[0]), y: tc(l.ty + o[1]), ux: l.x, uy: l.y });
  });
  // 환풍구: 같은 무리의 창살끼리 덕트로 잇는다 ('r' = 옥상 환기구, 없으면 방 천장 창살)
  VG = new Uint8Array(MW * MH); const vents = [];
  const VSPEC = (STAGE.vents || []).concat((STAGE.ventB || []).map(sp => autoVents(typeof sp === 'number' ? { b: sp } : sp, hides, ladders, lamps)).filter(Boolean));
  VSPEC.forEach((grp, gi) => {
    const vs = grp.map(([tx, ty, k]) => ({ tx, ty, x: tc(tx), y: tc(ty), roof: k === 'r', street: k === 's', z: k === 'r' ? lvAt(tx, ty) : 0, group: gi, open: false }));
    carveNet(VG, vs); vents.push(...vs);
  });
  S = {
    t: 0, lamps, lightsOn: true, guards, corpses: [], decals: [], noises: [], stones: [], kunais: [], toasts: [], hides, ladders,
    items: STAGE._items.map(p => ({ b: p[3], x: tc(p[0]), y: tc(p[1]), got: false, fl: p[2] || 0 })),
    player: { x: tc(STAGE.start[0]), y: tc(STAGE.start[1]), z: 0, under: false, coins: D().coins, picks: D().picks, candy: STAGE.candy != null ? STAGE.candy : 2, jump: null, hasKey: false, keys: {}, hp: D().hp, hpMax: D().hp, hurtT: 0, a: STAGE.startA != null ? STAGE.startA : -Math.PI / 2, mode: 'walk', carrying: null, stones: D().stones, kunai: Math.max(1, (STAGE.kunai || 3) + D().kunaiAdd), hidden: false, light: 0, stepT: 0, strikeT: 0, moving: false, hide: null },
    rollT: D().roll, rollWarn: false, timeLeft: STAGE.timeLimit ? STAGE.timeLimit * D().time : 0,
    alevel: 0, alevelT: 0, unseenT: 0, lures: [], reinforced: false, fx: [], keyDrop: null, fuseGuard: null, fuseT: 0, fleeing: false, windows: [],
    stats: { kills: 0, extraKills: 0, bodies: 0, detected: 0, stonesUsed: 0, kunaiUsed: 0, alarms: 0, stashed: 0, special: 0 },
    over: false, hints: {}, keys: {}, exitOpen: false, vents
  };
  S.exit = { x: tc(STAGE.exit[0]), y: STAGE.exit[1] * TILE + TILE / 2, r: 70, name: STAGE.exitName || '' };
  S.exits = [S.exit].concat((STAGE.exits || []).map(e => ({ x: tc(e.at[0]), y: e.at[1] * TILE + TILE / 2, r: e.r || 60, name: e.name || '' })));  // 탈출구가 여럿이면 가까운 곳으로 (지름길)
  S.mod = modNow; applyPerks(); if (STAGE.tutorial) S.cpWant = true;
  (STAGE.dropGuards || []).forEach(i => { const g = S.guards[i]; if (g) { g.state = 'DEAD'; g.x = g.y = -9999; g.path = null; g.dropped = true; } });  // 연습 나눔: 이 판에서 쓰지 않는 자경대원
  if (STAGE.tutorial && !S.items.length) S.exitOpen = true;
  if (!STAGE.tutorial) S.items.forEach(it => lootPlace(it));  // 훔칠 물건은 바닥 대신 책상·컴퓨터·서류장·금고 위에 둔다
  if (S.mod === 'timer') S.timeLeft = 360 * D().time;
  if (S.mod === 'bare' || STAGE.bare) { S.player.picks = 0; S.player.stones = 0; S.player.kunai = 0; if (STAGE.bare) S.player.coins = 0; }  // 맨손 시작 (변형 '맨손' · 붙잡혀 온 판)
  trapsInit(); propsInit(); storiesInit(); S.intel = []; S.learned = []; S.shiftI = 0; S.shiftT = STAGE.shift ? STAGE.shift.first || STAGE.shift.every : 0;
  // 전봇대와 전깃줄: 줄 끝은 전봇대 꼭대기 또는 옥상 가장자리
  S.poles = POLES.map(([tx, ty, z]) => ({ tx, ty, x: tc(tx), y: tc(ty), z, top: 26 + z * 10 }));
  // 인입선: [전봇대 x, y, 층] → 그 전봇대에서 가장 가까운, 그 층 정면 창문으로
  const drops = [];
  (STAGE.drops || []).forEach(([px, py, f]) => {
    if (!GF[f]) return; let best = null, bd = 1e9;
    BLD.forEach(b => { if (b.h <= f || b.y1 >= py || py - b.y1 > 4) return; for (let x = b.x0 + 1; x < b.x1; x++) if (GF[f][b.y1][x] === 'N') { const d = Math.abs(x - px) * 1.3 + (py - b.y1); if (d < bd && !drops.some(w => w[1][0] === x && w[1][1] === b.y1 && (true))) { bd = d; best = [x, b.y1]; } } });
    if (best) drops.push([[px, py], [best[0], best[1]]]);  // 도시: 인입선은 창문이 아니라 옥상 난간 밑 벽에 붙는다
  });
  S.wires = (STAGE.wires || []).concat(drops).map(([p, q]) => {
    const node = ([tx, ty, f]) => { if (f != null) return { win: true, fl: f, b: bldAt(tx, ty), tx, ty, x: tc(tx), y: (ty + 1) * TILE + 10, z: f, dx: tc(tx), dy: (ty - f) * TILE + 22 }; const pole = S.poles.find(o => o.tx === tx && o.ty === ty); return pole ? { x: pole.x, y: pole.y, z: pole.z, pole, dx: pole.x, dy: pole.y - pole.top + 3 } : { x: tc(tx), y: tc(ty), z: lvAt(tx, ty), roof: true, tx, ty, dx: tc(tx), dy: tc(ty) - 4 }; };
    const a = node(p), b = node(q), L = Math.hypot(b.dx - a.dx, b.dy - a.dy);
    return { a, b, L, sag: Math.min(24, L * 0.07) };
  });
  S.poles.forEach(o => { o.wires = S.wires.filter(w => w.a.pole === o || w.b.pole === o); });
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'N') S.windows.push({ tx, ty, x: tc(tx), y: tc(ty) });
  S.fwindows = []; for (let f = 1; f < GF.length; f++) for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (GF[f][ty][tx] === 'N') S.fwindows.push({ tx, ty, x: tc(tx), y: tc(ty), fl: f });
  // 읽을 수 있는 쪽지·장부: { b, fl, at, title, lines }
  S.notes = (STAGE.notes || []).map(n => { const q = n.pos || planPt(n.b, n.fl || 0, n.at || 'bed'); return { x: tc(q[0]), y: tc(q[1]), fl: n.fl || 0, title: n.title, lines: n.lines, key: n.key, gives: n.gives, learn: n.learn, read: false }; });
  S.notes.forEach(n => { if (/책상/.test(n.title || '')) { lootPlace(n, ['desk', 'desk2', 'pc']); n.furn = null; } });  // '책상 밑 메모'는 실제 책상 옆에 둔다
  // 옆 건물 같은 층 창문과 마주 보면 건너뛸 수 있다 (틈 1~3칸)
  S.fwindows.forEach(w => {
    const A = bldAt(w.tx, w.ty); if (A < 0) return; const dir = w.tx === BLD[A].x0 ? -1 : w.tx === BLD[A].x1 ? 1 : 0; if (!dir) return;
    for (let n = 2; n <= 4; n++) { const t2 = w.tx + dir * n; if (!inMap(t2, w.ty)) break; const B = bldAt(t2, w.ty); if (B === A) break; if (B >= 0) { if (GF[w.fl][w.ty][t2] === 'N' && !SOLID.has(GF[w.fl][w.ty][t2 + dir])) w.link = { tx: t2, ty: w.ty, dir, b: B }; break; } }
  });
  // 문: 건물 테두리의 바닥 칸, 또는 양옆이 벽인 건물 안 바닥 칸
  S.doors = [];
  const wallish = v => v === '#' || v === 'N' || v === 'S';
  BLD.forEach(b => {
    if (b.piloti) return;  // 필로티 주차장 입구는 문이 아니다
    for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) {
      const ch = G[ty][tx]; if (SOLID.has(ch)) continue;
      const border = tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1;
      const lr = wallish(G[ty][tx - 1]) && wallish(G[ty][tx + 1]), ud = wallish((G[ty - 1] || [])[tx]) && wallish((G[ty + 1] || [])[tx]);
      if (!border && !lr && !ud) continue;
      if (S.doors.some(d => d.tx === tx && d.ty === ty)) continue;
      const horiz = (border && (ty === b.y0 || ty === b.y1)) || (!border && lr);
      S.doors.push({ tx, ty, x: tc(tx), y: tc(ty), orig: ch, locked: false, horiz });
    }
  });
  S.doors.forEach(d => { d.group = S.doors.filter(o => Math.abs(o.tx - d.tx) + Math.abs(o.ty - d.ty) <= 1 && o.horiz === d.horiz); });
  // 빗장 쪽문: 담장에 난 문. open 쪽(n·s·e·w)에서만 풀 수 있다
  (STAGE.gates || []).forEach(gt => { const [tx, ty] = gt.at; const horiz = G[ty][tx - 1] === '#' || G[ty][tx + 1] === '#'; const d = { tx, ty, x: tc(tx), y: tc(ty), orig: G[ty][tx] === 'X' ? '.' : G[ty][tx], locked: false, horiz, gate: gt.open }; d.group = [d]; S.doors.push(d); setDoor(d, true); });
  (STAGE.keyBld || []).forEach(bi => { const b = BLD[bi]; const d = S.doors.find(d => d.ty === b.y1 && d.tx > b.x0 && d.tx < b.x1); if (d) { d.group.forEach(t => t.keyLock = 'gold'); setDoor(d, true); } });
  (STAGE.keyDoors || []).forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (d) { d.group.forEach(t => t.keyLock = 'gold'); setDoor(d, true); } });
  // 색 잠금: { b, door: 'front'|'back'|'vip'|'vipBack'|'vault', key } 또는 { at: [x, y], key }
  (STAGE.locks || []).forEach(L => {
    const pts = []; const b = BLD[L.b], p = b && (PLANS[L.b] || [])[0];
    if (L.at) pts.push(L.at);
    else if (L.door === 'front') S.doors.filter(d => d.ty === b.y1 && d.tx >= b.x0 && d.tx <= b.x1).forEach(d => pts.push([d.tx, d.ty]));
    else if (L.door === 'back') S.doors.filter(d => d.ty === b.y0 && d.tx >= b.x0 && d.tx <= b.x1).forEach(d => pts.push([d.tx, d.ty]));
    else if (p && L.door === 'vip' && p.vip) pts.push(p.vip.door); else if (p && L.door === 'vipBack' && p.vip) pts.push(p.vip.back); else if (p && L.door === 'vault' && p.vault) pts.push(p.vault.door);
    pts.forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (d) { d.group.forEach(t => t.keyLock = L.key || 'gold'); setDoor(d, true); } });
  });
  // 바닥에 놓인 카드키: { key, b, fl, at } 또는 { key, pos: [x, y], fl }
  S.keyItems = (STAGE.keyItems || []).map(k => { const q = k.pos || planPt(k.b, k.fl || 0, k.at || 'bed'); return { key: k.key, x: tc(q[0]), y: tc(q[1]), fl: k.fl || 0, got: false }; });
  BLD.forEach(b => { let n = 0; for (let x = b.x0; x <= b.x1; x++) if ('#NSX'.includes(G[b.y1][x]) || S.doors.some(d => d.tx === x && d.ty === b.y1)) n++; b.facade = (n === b.x1 - b.x0 + 1 || b.piloti) && b.y1 - b.y0 >= 2; b.fh = b.facade ? clamp(b.h, 1, b.y1 - b.y0 - 1) : 0; b.fl = null; });
  buildFRM(true); autoSigns(); factionsInit();
  // CCTV: [x, y, 방향°, 좌우°, 층] 또는 { b, fl, at, sweep } (실내: 그 자리에서 위쪽 벽에 달고 아래를 본다)
  S.cams = (STAGE.cams || []).map(c => {
    let x, y, fl, base, sweep;
    if (Array.isArray(c)) { [x, y, base, sweep, fl] = c; fl = fl || 0; base = base * Math.PI / 180; }
    else { const p = planPt(c.b, c.fl || 0, c.at || 'S'); if (!p) return null; fl = c.fl || 0; const g = fl ? GF[fl] : G0; x = p[0]; y = p[1]; while (y > 0 && !SOLID.has(g[y - 1][x])) y--; base = Math.PI / 2; sweep = c.sweep || 55; }
    const cx = tc(x) - Math.cos(base) * 18, cy = tc(y) - Math.sin(base) * 18;
    return { x: cx, y: cy, tx: x, ty: y, fl, base, sweep: sweep * Math.PI / 180, period: 7 + ((x * 7 + y * 3) % 5), ph: (x + y) % 7, a: base, meter: 0, broken: false, cool: 0, b: bldAt(x, y), outdoor: bldAt(x, y) < 0 };
  }).filter(Boolean);
  // 서치라이트: [x, y, 방향°, 좌우°] — 옥상·망루에서 멀리 비춘다 (다트로 깨거나 두꺼비집으로 끈다)
  (STAGE.searchlights || []).forEach(([x, y, base, sweep]) => { const a = base * Math.PI / 180; S.cams.push({ x: tc(x), y: tc(y), tx: x, ty: y, fl: 0, base: a, sweep: sweep * Math.PI / 180, period: 11 + (x % 4), ph: y % 5, a, meter: 0, broken: false, cool: 0, b: -1, outdoor: true, search: true }); });
  // CCTV 관리실: { b, fl, at } — 화면 보는 사람(tag 'camop')이 있어야 CCTV가 경보로 이어진다
  S.camRoom = null; if (STAGE.camRoom) { const q = STAGE.camRoom.pos || planPt(STAGE.camRoom.b, STAGE.camRoom.fl || 0, STAGE.camRoom.at || 'L'); if (q) S.camRoom = { x: tc(q[0]), y: tc(q[1]), tx: q[0], ty: q[1], fl: STAGE.camRoom.fl || 0 }; }
  if (FRM) {
    // 정면 벽 가스관(노란 배관): 땅 → 옥상. 2층 베란다: 땅에서 난간을 타고 2층으로
    const occ = new Set(S.ladders.map(l => l.bx + ',' + l.by)); S.poles.forEach(o => occ.add(o.tx + ',' + o.ty));
    const reach = new Uint8Array(MW * MH), rq = [[STAGE.start[0] | 0, STAGE.start[1] | 0]]; reach[(STAGE.start[1] | 0) * MW + (STAGE.start[0] | 0)] = 1;
    const isDoor = (x, y) => S.doors.some(d => d.tx === x && d.ty === y);
    S.poles.forEach(o => { for (const [dx, dy] of N8) occ.add((o.tx + dx) + ',' + (o.ty + dy)); });
    while (rq.length) { const [x, y] = rq.pop(); for (const [dx, dy] of N8.slice(0, 4)) { const nx = x + dx, ny = y + dy; if (inMap(nx, ny) && !reach[ny * MW + nx] && (!groundSolidP(nx, ny) || isDoor(nx, ny))) { reach[ny * MW + nx] = 1; rq.push([nx, ny]); } } }
    const groundOk = (x, y) => inMap(x, y) && reach[y * MW + x] && !groundSolidP(x, y) && bldAt(x, y) < 0 && !occ.has(x + ',' + y) && !S.doors.some(d => d.tx === x && Math.abs(d.ty - y) <= 1);
    BLD.forEach((b, bi) => {
      if (!b.plan || !b.facade || b.piloti || b.h < 2) return;
      b.gas = []; b.balc = [];
      for (const x of (b.glass ? [] : [b.x0, b.x1, b.x0 + 1, b.x1 - 1])) {
        if (G0[b.y1][x] !== '#' || !groundOk(x, b.y1 + 1)) continue;
        S.ladders.push({ kind: 'pipe', gas: true, bx: x, by: b.y1 + 1, bz: 0, tx: x, ty: b.y1, tz: b.h, x: tc(x), y: tc(b.y1 + 1), ux: tc(x), uy: tc(b.y1) });
        occ.add(x + ',' + (b.y1 + 1)); b.gas.push(x); break;
      }
      if (b.kind === 'shop' || b.h < 3 || !GF[1]) return;
      const cand = []; for (let x = b.x0 + 2; x <= b.x1 - 2; x++) if (GF[1][b.y1][x] === 'N' && !SOLID.has(GF[1][b.y1 - 1][x]) && groundOk(x, b.y1 + 1) && !b.gas.includes(x) && !b.gas.includes(x + 1) && !b.gas.includes(x - 1)) cand.push(x);
      const pick = cand.length > 4 ? [cand[0], cand[cand.length - 1]] : cand.length ? [cand[Math.floor(cand.length / 2)]] : [];
      pick.forEach(x => { S.ladders.push({ kind: 'balc', bx: x, by: b.y1 + 1, bz: 0, bfl: 0, tfl: 1, tx: x, ty: b.y1 - 1, tz: 0, x: tc(x), y: tc(b.y1 + 1), ux: tc(x), uy: tc(b.y1 - 1), b: bi }); occ.add(x + ',' + (b.y1 + 1)); b.balc.push(x); });
    });
    // 두꺼비집(계량기함): 정면 벽 1층, 문 가까운 벽 칸 바깥
    S.bfuses = [];
    BLD.forEach((b, bi) => {
      if (!b.plan || !b.facade || b.piloti || STAGE.tutorial) return;
      const door = S.doors.find(d => d.ty === b.y1 && d.tx > b.x0 && d.tx < b.x1); const cx = door ? door.tx : (b.x0 + b.x1) >> 1;
      const xs = []; for (let x = b.x0 + 1; x < b.x1; x++) xs.push(x); xs.sort((p, q) => Math.abs(p - cx) - Math.abs(q - cx));
      for (const x of xs) { if (Math.abs(x - cx) < 1 || G0[b.y1][x] !== '#' || !groundOk(x, b.y1 + 1)) continue; S.bfuses.push({ b: bi, tx: x, ty: b.y1, x: tc(x), y: tc(b.y1 + 1), at: [x, b.y1, x, b.y1 + 1], cut: false, t: 5, guard: null }); occ.add(x + ',' + (b.y1 + 1)); b.fuse = x; break; }
    });
    S.ladders.forEach(l => { if (l.tz > 0 && facadeRow(l.tx, l.ty)) { l.rx = l.ux; l.ry = roofEdgeY(l.tx, l.ty); } });
    S.wires.forEach(w => [w.a, w.b].forEach(n => { if (n.roof && facadeRow(n.tx, n.ty)) { n.y = roofEdgeY(n.tx, n.ty); n.dy = n.y - 4; n.ty = Math.floor(n.y / TILE); } }));
    S.wires.forEach(w => { w.L = Math.hypot(w.b.dx - w.a.dx, w.b.dy - w.a.dy); w.sag = Math.min(24, w.L * 0.07); });
    for (const g of S.guards) if (g.z && g.route) g.route.forEach(r => { const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE); if (facadeRow(tx, ty)) r.y = roofEdgeY(tx, ty); });
    for (const g of S.guards) if (g.z && facadeRow(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) g.y = roofEdgeY(Math.floor(g.x / TILE), Math.floor(g.y / TILE));
  }
  {  // 건물마다 이름판·외벽 색·옥상 물건을 달리해 구분되게
    const PL = ['그린빌라', '한솔하이츠', '삼익맨션', '우성빌라', '동원파크빌', '명성하이빌', '대림빌라', '은하맨션', '청솔빌', '현대빌라', '새한주택', '해맑은빌', '금호빌라', '성원하이츠', '다복빌라', '소망빌라'];
    const hsh = (b, k) => ((b.x0 * 73856093) ^ (b.y0 * 19349663) ^ (STAGE_I * 83492791) ^ k) >>> 0;
    let church = null; BLD.forEach(b => { if (b.plan && b.kind !== 'shop' && b.kind !== 'house' && !b.name && b.h >= 3 && (!church || b.h > church.h)) church = b; });
    const HL = ['감나무집', '파란대문집', '구멍가게집', '옥상텃밭집', '대추나무집', '빨간벽돌집', '연탄집', '평상집', '장독대집', '담쟁이집'];
    let pk = (STAGE_I * 5 + 3) % PL.length, hk = STAGE_I % HL.length;
    BLD.forEach((b, i) => {
      b.tint = ['', '242,222,196', '200,212,228', '236,204,196', '214,226,204', '226,226,232'][hsh(b, 1) % 6];
      if (!b.plan) return;
      b.plate = b.kind === 'shop' ? (b.plateName || ((b.signs || [])[0] || '상가') + ' 빌딩') : b.kind === 'house' ? (b.name || b.plateName || HL[(hk++) % HL.length]) : (b.plateName || PL[(pk++) % PL.length]);
      if (b === church) { b.church = true; b.plate = '새빛교회'; }
    });
  }
  BLD.forEach((b, i) => { b.alt = (STAGE.bricks ? STAGE.bricks[i % STAGE.bricks.length] : i % 2); b.roofC = buildRoofCanvas(b, i); });
  kitAttach();
  S.bushes = []; for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'B') S.bushes.push({ type: 'bush', tx, ty, x: tc(tx), y: tc(ty) });
  mapC = renderMap(); ugC = renderSewers(); ventC = renderVents();
  S.floorC = {};
  cam.x = S.player.x; cam.y = S.player.y; S.fade = 0.6;  // 시작할 때 어둠에서 서서히
  clearTimeout(window.__hintT); clearTimeout(window.__hintT2);
  window.__hintT = setTimeout(() => S && !S.over && running && STAGE.hints && hint('stage', STAGE.hints[0]), 4500);
  if (STAGE.hints && STAGE.hints[1]) window.__hintT2 = setTimeout(() => S && !S.over && running && hint('stage2', STAGE.hints[1]), 10000);
  updateHUD(true);
}

// 평면 건물 안의 자리 찾기: where = 'L'(왼쪽 세대 거실) 'R'(오른쪽 세대 거실) 'S'(가게·사무실) 'bed'(첫 방) 'bath'
// 배치 무작위: 열쇠·물건·쪽지·자경대원에 alt 후보가 있으면 판마다 하나를 고른다 (window.__randPick 으로 고정 가능)
function pickAlts(st) {
  st._base = st._base || { keyItems: st.keyItems, notes: st.notes, items: st.items, guards: st.guards };
  const pick = arr => arr && arr.map(o => { if (!o || !o.alt) return o; const n = window.__randPick != null ? window.__randPick % (o.alt.length + 1) : Math.floor(Math.random() * (o.alt.length + 1)); return n ? Object.assign({}, o, o.alt[n - 1]) : o; });
  for (const k of ['keyItems', 'notes', 'items', 'guards']) if (st._base[k]) st[k] = pick(st._base[k]);
}
function planPt(bi, f, where) {
  const p = (PLANS[bi] || [])[f]; if (!p) return null;
  if ((where === 'L' || where === 'R') && !p.units.length && p.store) {  // 상가 층: 가게 자리 양 끝
    const st = p.store, y = Math.floor((st.y0 + st.y1) / 2), g = f ? GF[f] : G0;
    for (let k = 0; k <= st.x1 - st.x0; k++) { const x = where === 'L' ? st.x0 + k : st.x1 - k; for (const yy of [y, y + 1, y - 1, st.y1, st.y0]) if (yy >= st.y0 && yy <= st.y1 && !SOLID.has(g[yy][x])) return [x, yy]; }
  }
  if (where === 'VA' && p.vault) return [p.vault.door[0], p.vault.y0 + 1];
  if (where === 'VB' && p.vault) return [p.vault.door[0], p.vault.door[1] + 1];
  if (where === 'VC' && p.vault) { const g = f ? GF[f] : G0; for (let x = p.vault.x0; x <= p.vault.x1; x++) for (let y = p.vault.y0; y <= p.vault.y1; y++) if (!SOLID.has(g[y][x]) && !(x === p.vault.door[0] && y === p.vault.y0)) return [x, y]; }
  if (where === 'V' && p.vip) return [p.vip.x0 + Math.floor((p.vip.x1 - p.vip.x0) / 2), p.vip.y0 + 1];
  if (where === 'VD' && p.vip) return [p.vip.door[0], p.vip.door[1] + 1];
  const u0 = p.units[0], u1 = p.units[1] || p.units[0];
  const r = where === 'S' ? p.store : where === 'R' ? u1 && u1.living : where === 'room2' ? (u0 && (u0.rooms[1] || u0.rooms[0] || u0.living)) : where === 'bed' ? (u0 && (u0.rooms[0] || u0.living)) : where === 'bed2' ? (u1 && (u1.rooms[0] || u1.living)) : where === 'bath' ? (u0 && (u0.bath || u0.living)) : (u0 ? u0.living : p.store);
  if (!r) return null;
  const g = f ? GF[f] : G0, cx = Math.floor((r.x0 + r.x1) / 2), cy = Math.floor((r.y0 + r.y1) / 2);
  for (let k = 0; k < 4; k++) for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const x = cx + dx, y = cy + dy; if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && !SOLID.has(g[y][x]) && g[y][x] !== 'Y') return [x, y]; }
  return [cx, cy];
}
function resolveGuard(d) {
  if (d.sched && !d.route) d = Object.assign({}, d, { route: schedRoute(d) });  // 일과표 → 경로
  if (d.b == null) return d;
  const f = d.fl || 0, o = Object.assign({}, d);
  if (d.patrol) { const a = planPt(d.b, f, d.from || 'L'), c = planPt(d.b, f, d.to || 'R'); o.route = [[a[0], a[1], 2], [c[0], c[1], 2]]; delete o.at; }
  else o.at = planPt(d.b, f, d.at || 'L');
  return o;
}
// 빌라 세대마다 확률로 주민을 둔다: 방에서 자는 사람 또는 거실에서 TV 보는 사람
function autoResidents() {
  const rate = STAGE.residents || 0, out = []; if (!rate) return out;
  PLANS.forEach((fls, bi) => { if (!fls || (STAGE.noResidents || []).includes(bi)) return; const b = BLD[bi]; if (b.kind === 'shop') return;
    fls.forEach((p, f) => { if (!p || (f === 0 && b.piloti)) return; p.units.forEach((u, ui) => {
      const h = ((bi * 7919) ^ (f * 104729) ^ (ui * 1299709) ^ 0x5bd1) >>> 0; if ((h % 100) >= rate * 100) return;
      const sleep = (h >> 3) % 2 === 0 && u.rooms.length;
      const r = sleep ? u.rooms[0] : u.living, g = f ? GF[f] : G0; let pt = null;
      for (let y = r.y0; y <= r.y1 && !pt; y++) for (let x = r.x0; x <= r.x1; x++) { const c = g[y][x]; if (!SOLID.has(c) && c !== 'Y' && (sleep ? true : y > r.y0)) { pt = [x, y]; if (!sleep) break; } }
      if (!pt) return;
      out.push({ kind: 'civ', look: (h >> 5) % 4, fl: f, at: pt, post: sleep ? 90 : ((h >> 7) % 4) * 90, sleep: !!sleep });
    }); });
  });
  return out;
}
function floorCanvas(bi, f) {
  const k = bi + '_' + f; if (S.floorC[k]) return S.floorC[k];
  const b = BLD[bi], L0 = CUR_F; setLayer(f); const c = renderMap({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }); setLayer(L0);
  return (S.floorC[k] = c);
}
// 주민 체형 자동 배정 (어른만): 남자 기본 3 · 여자 셋 6 · 덩치·노인·코트·백팩 각 1
const BODY_MIX = [null, null, null, 'fLong', 'fLong', 'fBob', 'fBob', 'fTail', 'fTail', 'big', 'old', 'coat', 'pack'];
const autoBody = i => BODY_MIX[((i * 7919 + 13) >>> 0) % BODY_MIX.length];
function makeGuard(d, i) {
  let sx, sy;
  if (d.at) { sx = d.at[0]; sy = d.at[1]; }
  else if (d.route) { sx = d.route[0][0]; sy = d.route[0][1]; }
  else { const leader = (STAGE._g || STAGE.guards)[d.follow]; sx = leader.route[0][0] - 1; sy = leader.route[0][1]; }
  const post = d.post != null ? d.post * Math.PI / 180 : null;
  return {
    id: i, fl: d.fl || 0, civ: d.kind === 'civ', wander: d.wander || null, club: !!d.club, look: d.look || 0, doc: !!d.doc, sleep: !!d.sleep, kind: d.elite ? 'g3' : d.kind, elite: !!d.elite, lookout: !!d.lookout, dog: d.kind === 'dog', hasKey: d.key ? (d.key === true ? 'gold' : d.key) : null, target: !!d.target, follow: d.follow, x: tc(sx), y: tc(sy), a: post != null ? post : 0, want: post != null ? post : 0,
    route: d.route ? d.route.map(r => ({ x: tc(r[0]), y: tc(r[1]), pause: r[2] })) : [{ x: tc(sx), y: tc(sy), pause: 999 }],
    // 무전기: 의뢰마다 든 사람을 정해 둔다 (STAGE.radios — 무리마다 하나). 없으면 정예 + 셋 중 하나
    post, ri: d.route ? 1 % d.route.length : 0, path: null, z: 0, homeFl: d.fl || 0, radio: d.kind !== 'civ' && d.kind !== 'dog' && !d.target && (d.radio != null ? !!d.radio : STAGE.radios ? STAGE.radios.includes(i) : !!d.elite || i % 3 === 0), wait: d.route ? 0 : 999, waitBase: 0,
    carryTo: d.carryTo != null ? d.carryTo : null, child: !!d.child, parent: d.parent || null, tag: d.tag || null, body: d.child ? 'kid' : d.body !== undefined ? d.body : d.kind === 'civ' ? autoBody(i) : null, sched: d.sched ? d.sched.slice() : null, schedKey: d.schedKey || null, outfit: d.outfit || null, enforcer: !!d.enforcer, state: 'PATROL', meter: 0, poi: null, lostT: 0, still: !!d.still, glanceT: d.elite ? rnd(5, 9) : rnd(12, 24), glance: 0, glanceA: 0, stepT: 0, icon: null, iconT: 0, repath: 0, seen: false
  };
}
function buildRouteLine(g) {
  if (g.route.length < 2) return;
  g.routeLine = [];
  for (let i = 0; i < g.route.length; i++) {
    const a = g.route[i], b = g.route[(i + 1) % g.route.length];
    const seg = astar(Math.floor(a.x / TILE), Math.floor(a.y / TILE), Math.floor(b.x / TILE), Math.floor(b.y / TILE));
    g.routeLine.push({ x: a.x, y: a.y, stop: true }); seg.forEach(p => g.routeLine.push(p));
  }
}
// 지하 수로: 맨홀끼리 최소 신장 트리로 잇고 고리 하나를 더한다
function buildSewers(wells) {
  UG = new Uint8Array(MW * MH);
  if (wells.length < 2) return;
  const carve = (a, b) => {
    let x = a.tx, y = a.ty;
    const hFirst = ((a.tx * 7 + b.ty * 3) % 2) === 0;
    const stepTo = (tx, ty) => { while (x !== tx) { UG[y * MW + x] = 1; x += Math.sign(tx - x); } while (y !== ty) { UG[y * MW + x] = 1; y += Math.sign(ty - y); } UG[y * MW + x] = 1; };
    if (hFirst) { stepTo(b.tx, a.ty); stepTo(b.tx, b.ty); } else { stepTo(a.tx, b.ty); stepTo(b.tx, b.ty); }
  };
  const inTree = [wells[0]], rest = wells.slice(1), edges = [];
  while (rest.length) {
    let bi = 0, bj = 0, bd = 1e9;
    rest.forEach((w, i) => inTree.forEach((t, j) => { const d = Math.abs(w.tx - t.tx) + Math.abs(w.ty - t.ty); if (d < bd) { bd = d; bi = i; bj = j; } }));
    edges.push([inTree[bj], rest[bi]]); inTree.push(rest[bi]); rest.splice(bi, 1);
  }
  if (wells.length > 3) edges.push([wells[0], wells[wells.length - 1]]);
  edges.forEach(([a, b]) => carve(a, b));
  // 넓은 방(집수실) 몇 곳
  wells.forEach((w, i) => { if (i % 2) return; for (let y = w.ty - 1; y <= w.ty + 1; y++) for (let x = w.tx - 1; x <= w.tx + 1; x++) if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) UG[y * MW + x] = 1; });
}
const ugAt = (tx, ty) => inMap(tx, ty) && UG && UG[ty * MW + tx] === 1;
const ventAt = (tx, ty) => inMap(tx, ty) && VG && VG[ty * MW + tx] === 1;
// 도시 건물 덕트 자동 배치: 옥상 환기구 1 + 1층 방 천장 창살 2~3 (+ 건물 뒤 거리 환기구)
function autoVents(sp, hides, ladders, lamps) {
  const B = BLD[sp.b]; if (!B) return null;
  const busy = (tx, ty) => hides.some(h => !h.fl && Math.abs(h.tx - tx) <= 1 && Math.abs(h.ty - ty) <= 1) || lamps.some(l => !l.fl && l.tx === tx && l.ty === ty)
    || ladders.some(l => (l.bx === tx && l.by === ty) || (l.tx === tx && l.ty === ty) || ((l.kind === 'stair' || l.kind === 'fstair') && Math.abs(l.bx - tx) <= 2 && Math.abs(l.by - ty) <= 2));  // 계단 칸 둘레 2칸은 비운다 (환풍구와 계단 표시가 겹치지 않게)
  const pick = (cands, score) => { let best = null, bs = 1e9; for (const c of cands) { const v = score(c); if (v < bs) { bs = v; best = c; } } return best; };
  // 옥상: 걸을 수 있는 칸, 계단실·사다리·물탱크(오른쪽 위)를 피해 왼쪽 위 안쪽
  const roofC = [];
  for (let ty = B.y0; ty <= B.y1; ty++) for (let tx = B.x0 + 1; tx < B.x1; tx++) if (rLv(tx, ty) > 0 && bldAt(tx, ty) === sp.b && G[ty][tx] !== 'Y' && !busy(tx, ty) && !ladders.some(l => Math.abs(l.tx - tx) <= 1 && Math.abs(l.ty - ty) <= 1)) roofC.push([tx, ty]);
  const r = pick(roofC, ([x, y]) => Math.abs(x - (B.x0 + 2)) + Math.abs(y - (B.y0 + 1)) * 1.2); if (!r) return null;
  // 1층 바닥: 바깥벽 안쪽, 가구·계단·조명 없는 칸
  const fl = [];
  for (let ty = B.y0 + 1; ty < B.y1; ty++) for (let tx = B.x0 + 1; tx < B.x1; tx++) if (!groundSolidP(tx, ty) && G[ty][tx] !== 'Y' && bldAt(tx, ty) === sp.b && !busy(tx, ty)
    && N8.slice(0, 4).filter(o => !groundSolidP(tx + o[0], ty + o[1])).length >= 3) fl.push([tx, ty]);
  if (!fl.length) return null;
  const a = pick(fl, ([x, y]) => (x - B.x0) + (y - B.y0) * 0.8), b = pick(fl, ([x, y]) => (B.x1 - x) + (y - B.y0) * 0.8);
  const out = [[r[0], r[1], 'r'], a]; if (b && Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) >= 4) out.push(b);
  if (sp.at) { const c = pick(fl, ([x, y]) => Math.hypot(x - sp.at[0], y - sp.at[1]) + (Math.hypot(x - sp.at[0], y - sp.at[1]) < 1.5 ? 9 : 0)); if (c && !out.some(o => o[0] === c[0] && o[1] === c[1])) out.push(c); }
  // 거리 쪽 환기구: 건물 뒤(북쪽) 또는 옆 골목 바닥
  if (sp.street) {
    const sc = []; const mx = (B.x0 + B.x1) / 2;
    for (let tx = B.x0 - 1; tx <= B.x1 + 1; tx++) for (const ty of [B.y0 - 1]) if (inMap(tx, ty) && !groundSolidP(tx, ty) && bldAt(tx, ty) < 0 && !busy(tx, ty) && G[ty][tx] !== 'W') sc.push([tx, ty, Math.abs(tx - mx)]);
    for (let ty = B.y0; ty <= B.y1; ty++) for (const tx of [B.x0 - 1, B.x1 + 1]) if (inMap(tx, ty) && !groundSolidP(tx, ty) && bldAt(tx, ty) < 0 && !busy(tx, ty) && G[ty][tx] !== 'W') sc.push([tx, ty, 6 + Math.abs(ty - B.y0)]);
    const st = pick(sc, c => c[2]); if (st) out.push([st[0], st[1], 's']);
  }
  return out;
}
// 점들을 최소 신장 트리로 잇는 ㄱ자 통로를 grid에 판다
function carveNet(grid, nodes) {
  if (!nodes.length) return;
  const carve = (a, b) => { let x = a.tx, y = a.ty; const step = (tx, ty) => { while (x !== tx) { grid[y * MW + x] = 1; x += Math.sign(tx - x); } while (y !== ty) { grid[y * MW + x] = 1; y += Math.sign(ty - y); } grid[y * MW + x] = 1; }; if (a.street) { step(a.tx, b.ty); step(b.tx, b.ty); } else { step(b.tx, a.ty); step(b.tx, b.ty); } };  // 거리 환기구에서는 먼저 건물 안쪽으로
  const inT = [nodes[0]], rest = nodes.slice(1); grid[nodes[0].ty * MW + nodes[0].tx] = 1;
  while (rest.length) { let bi = 0, bj = 0, bd = 1e9; rest.forEach((w, i) => inT.forEach((t, j) => { const d = Math.abs(w.tx - t.tx) + Math.abs(w.ty - t.ty); if (d < bd) { bd = d; bi = i; bj = j; } })); carve(inT[bj], rest[bi]); inT.push(rest[bi]); rest.splice(bi, 1); }
}
function renderVents() {
  const c = document.createElement('canvas'); c.width = MW * TILE; c.height = MH * TILE;
  const x = c.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (!ventAt(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE, m = 9;
    const n = ventAt(tx, ty - 1), so = ventAt(tx, ty + 1), w = ventAt(tx - 1, ty), e = ventAt(tx + 1, ty);
    x.fillStyle = '#3f5a60';
    x.fillRect(px + m, py + m, TILE - 2 * m, TILE - 2 * m);
    if (n) x.fillRect(px + m, py, TILE - 2 * m, m); if (so) x.fillRect(px + m, py + TILE - m, TILE - 2 * m, m);
    if (w) x.fillRect(px, py + m, m, TILE - 2 * m); if (e) x.fillRect(px + TILE - m, py + m, m, TILE - 2 * m);
    x.fillStyle = 'rgba(160,220,215,.25)'; x.fillRect(px + m + 2, py + m + 2, TILE - 2 * m - 4, 3);
    x.fillStyle = 'rgba(0,0,0,.35)';
    for (const [k, on] of [[0, n], [1, so], [2, w], [3, e]]) if (!on) { if (k === 0) x.fillRect(px + m, py + m, TILE - 2 * m, 3); if (k === 1) x.fillRect(px + m, py + TILE - m - 3, TILE - 2 * m, 3); if (k === 2) x.fillRect(px + m, py + m, 3, TILE - 2 * m); if (k === 3) x.fillRect(px + TILE - m - 3, py + m, 3, TILE - 2 * m); }
    x.fillStyle = 'rgba(200,230,228,.35)'; for (const [dx, dy] of [[m + 4, m + 4], [TILE - m - 6, m + 4], [m + 4, TILE - m - 6], [TILE - m - 6, TILE - m - 6]]) x.fillRect(px + dx, py + dy, 2, 2);
  }
  return c;
}
function renderSewers() {
  const c = document.createElement('canvas'); c.width = MW * TILE; c.height = MH * TILE;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const f = F.stone0;
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (!ugAt(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE;
    x.drawImage(atlas, f[0], f[1], f[2], f[3], px, py, TILE, TILE);
    x.fillStyle = 'rgba(20,28,36,.55)'; x.fillRect(px, py, TILE, TILE);
    const hz = ugAt(tx - 1, ty) || ugAt(tx + 1, ty), vt = ugAt(tx, ty - 1) || ugAt(tx, ty + 1);
    x.fillStyle = 'rgba(70,110,120,.55)';
    if (hz) x.fillRect(px, py + 18, TILE, 12); if (vt) x.fillRect(px + 18, py, 12, TILE);
    x.fillStyle = 'rgba(0,0,0,.5)';
    if (!ugAt(tx, ty - 1)) x.fillRect(px, py, TILE, 5); if (!ugAt(tx, ty + 1)) x.fillRect(px, py + TILE - 5, TILE, 5);
    if (!ugAt(tx - 1, ty)) x.fillRect(px, py, 5, TILE); if (!ugAt(tx + 1, ty)) x.fillRect(px + TILE - 5, py, 5, TILE);
  }
  return c;
}
// 도시판 바닥: 구운 키트 타일 (아스팔트 · 보도 · 흙 · 잔디). 없으면 기존 그림
const lotC = [];
function lotTile(h) {  // 맨땅 칸: 어두운 콘크리트 + 잔 얼룩 + 가끔 금. 칸 경계가 드러나지 않게 가장자리는 건드리지 않는다
  const v = h % 4; if (lotC[v]) return lotC[v];
  const c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d');
  let r = 1234 + v * 977; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#34363a'; x.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 70; i++) { const a = 0.05 + rnd() * 0.08; x.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.5})`; x.fillRect(2 + rnd() * (TILE - 6), 2 + rnd() * (TILE - 6), 1 + rnd() * 3, 1 + rnd() * 3); }
  if (v === 1) { x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1; x.beginPath(); x.moveTo(8, 30); x.lineTo(19, 24); x.lineTo(27, 27); x.lineTo(38, 17); x.stroke(); }
  if (v === 3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.ellipse(26, 22, 12, 8, 0.4, 0, Math.PI * 2); x.fill(); }
  return (lotC[v] = c);
}
function kitGround(ch, tx, ty) {
  const h = (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 100;
  if (ch === 'T' || ch === 'B') { const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(o => G[ty + o[1]] && G[ty + o[1]][tx + o[0]]); ch = n.includes('g') ? 'g' : n.includes('d') ? 'd' : n.includes('=') ? '=' : '.'; }
  if (ch === 'w' || ch === 'K' || ch === 'E') return kitFloor('planks'); if (ch === 'v') return kitFloor('planks2'); if (ch === 't') return kitFloor('tiles'); if (ch === 'h') return kitFloor('concrete');
  if (ch === ',') return lotTile(h);  // 뒷마당·골목 맨땅: 같은 무늬가 칸마다 반복돼 격자로 보이지 않게 네 가지를 섞는다
  const k = ch === '.' || ch === 'R' ? 'asph0' : ch === '=' || ch === 'F' ? 'pave0' : ch === 'd' ? (h < 80 ? 'dirt0' : 'dirt1') : ch === 'g' ? 'grass0' : null;
  return k && kitOk(kitG[k]) ? kitG[k] : null;
}
// 실내 계단: 계단 칸('Y')과 올라오는 쪽 칸, 두 칸에 걸친 한 줄 계단. 위(계단 칸 쪽)로 갈수록 밝고, 칸마다 디딤판 그림자·코, 양옆 난간
function stairDir(tx, ty) {
  const w = STAIRW[CUR_F + ':' + tx + ',' + ty]; if (w) return w.d;
  const bi = bldAt(tx, ty);
  for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const nx = tx + dx, ny = ty + dy; if (inMap(nx, ny) && bldAt(nx, ny) === bi && !SOLID.has(G[ny][nx]) && G[ny][nx] !== 'Y') return [dx, dy]; }
  return [0, 1];
}
function drawStairs(x, tx, ty) {
  // 오르는 계단: 계단 칸과 들어서는 칸, 폭 한 칸 × 길이 두 칸. 위층에선 옆 줄(역시 한 칸 × 두 칸)이 아래층에서 올라오는 계단 구멍 — 꺾인 계단실
  // (옆 줄을 못 만든 곳만 한 칸 폭을 반씩 나눠 그린다)
  const [dx, dy] = stairDir(tx, ty), cx = (tx + 0.5 + dx / 2) * TILE, cy = (ty + 0.5 + dy / 2) * TILE, down = CUR_F > 0, wb = STAIRW[CUR_F + ':' + tx + ',' + ty];
  const hw = TILE / 2 - 3, hl = TILE, N = 8, st = (hl * 2) / N, rot = Math.atan2(-dy, -dx) + Math.PI / 2;
  const upFlight = (x0, x1) => {  // 오르는 줄: 먼 쪽(위층)으로 갈수록 밝다, 단마다 코에 빛·아래에 그림자
    for (let i = 0; i < N; i++) { const y0 = -hl + i * st, k = 1 - i / (N - 1), c = (a, b) => Math.round(a + (b - a) * k);
      x.fillStyle = `rgb(${c(120, 232)},${c(106, 208)},${c(86, 172)})`; x.fillRect(x0, y0, x1 - x0, st);
      x.fillStyle = 'rgba(255,242,215,.45)'; x.fillRect(x0, y0, x1 - x0, 2); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(x0, y0 + st - 3, x1 - x0, 3); }
  };
  const downFlight = (x0, x1, far) => {  // 내려가는 줄: 아래층 쪽 끝(far: -1 = 계단 칸 쪽, 1 = 들어서는 쪽)으로 갈수록 깊고 어둡다
    for (let i = 0; i < N; i++) { const y0 = -hl + i * st, k = far < 0 ? i / (N - 1) : 1 - i / (N - 1), c = (a, b) => Math.round(a + (b - a) * k);
      x.fillStyle = `rgb(${c(6, 78)},${c(6, 68)},${c(8, 58)})`; x.fillRect(x0, y0, x1 - x0, st);
      x.fillStyle = `rgba(255,242,215,${0.05 + 0.3 * k})`; x.fillRect(x0, far < 0 ? y0 + st - 2 : y0, x1 - x0, 2); }
  };
  const rails = (x0, x1) => { x.fillStyle = '#2e2a28'; x.fillRect(x0 - 3, -hl, 4, hl * 2); x.fillRect(x1 - 1, -hl, 4, hl * 2); x.fillStyle = '#aeb6c0'; x.fillRect(x1 - 1, -hl + 2, 2, hl * 2 - 4); for (let i = 0; i <= 3; i++) x.fillRect(x1 - 2, -hl + 4 + i * ((hl * 2 - 10) / 3), 4, 3); };
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(-hw - 3, -hl, hw * 2 + 6, hl * 2);
  if (down && !wb) { upFlight(-hw, -1); downFlight(1, hw, -1); x.fillStyle = '#aeb6c0'; x.fillRect(-1, -hl + 2, 2, hl * 2 - 4); rails(-hw, hw); }
  else { upFlight(-hw, hw); rails(-hw, hw); }
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(-hw - 3, -hl, hw * 2 + 6, 3);
  x.restore();
  if (down && wb) {  // 옆 줄: 아래층에서 올라오는 계단(반대 방향으로 오른다 → 들어서는 쪽 끝이 가장 깊다), 바깥쪽에 난간
    x.save(); x.translate(cx + wb.s[0] * TILE, cy + wb.s[1] * TILE); x.rotate(rot);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(-hw - 3, -hl, hw * 2 + 6, hl * 2);
    downFlight(-hw, hw, -1);   // 바닥 쪽 끝(+hl, 들어서는 줄 옆)이 가장 얕고, 계단 칸 줄(-hl)로 갈수록 깊다
    const gr = x.createLinearGradient(0, -hl + st * 3, 0, -hl); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)'); x.fillStyle = gr; x.fillRect(-hw, -hl, hw * 2, st * 3);
    x.fillStyle = '#aeb6c0'; x.fillRect(-hw - 3, -hl, 3, hl * 2); x.fillRect(hw, -hl, 3, hl * 2); x.fillRect(-hw - 3, -hl, hw * 2 + 6, 3);   // 구멍을 두른 난간 (바닥 쪽 끝만 트였다 — 거기서 내려간다)
    for (let i = 0; i <= 3; i++) { x.fillRect(-hw - 4, -hl + 4 + i * ((hl * 2 - 10) / 3), 5, 3); x.fillRect(hw - 1, -hl + 4 + i * ((hl * 2 - 10) / 3), 5, 3); }
    x.restore();
  }
}
// 어둠 위에 덧그리는 계단 표시: 오르는 줄은 위층 불빛이 새어 드는 것처럼 위로 갈수록 밝게(▲), 내려가는 줄은 검은 구멍으로(▼)
function drawStairGlow(P, openB) {
  if (P.z || P.wire || P.vent || P.under || P.hide || openB == null || openB < 0) return; const f = flOf(P);
  const seen = new Set();
  for (const l of S.ladders) {
    if ((l.kind !== 'fstair' && l.kind !== 'stair') || bldAt(l.tx, l.ty) !== openB) continue;
    const key = l.tx + ',' + l.ty; if (seen.has(key)) continue;
    const up = S.ladders.some(o => (o.kind === 'fstair' || o.kind === 'stair') && o.tx === l.tx && o.ty === l.ty && (o.bfl || 0) === f);
    const down = S.ladders.some(o => o.kind === 'fstair' && o.tx === l.tx && o.ty === l.ty && o.tfl === f);
    if (!up && !down) continue; seen.add(key);
    const [dx, dy] = stairDir(l.tx, l.ty), cx = (l.tx + 0.5 + dx / 2) * TILE, cy = (l.ty + 0.5 + dy / 2) * TILE, hw = TILE / 2 - 3, hl = TILE, rot = Math.atan2(-dy, -dx) + Math.PI / 2, wb = down ? STAIRW[f + ':' + l.tx + ',' + l.ty] : null;
    const lane = (x0, x1, isUp, farIn) => {
      const gr = ctx.createLinearGradient(0, hl, 0, -hl);
      if (isUp) { gr.addColorStop(0, 'rgba(255,214,150,.06)'); gr.addColorStop(1, 'rgba(255,214,150,.42)'); }
      else if (farIn) { gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); }
      else { gr.addColorStop(0, 'rgba(0,0,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); }
      ctx.fillStyle = gr; ctx.fillRect(x0, -hl, x1 - x0, hl * 2);
      const ax = (x0 + x1) / 2, ay = isUp || !farIn ? hl * 0.45 : -hl * 0.45, w = Math.min(14, (x1 - x0) * 0.6);
      ctx.fillStyle = isUp ? 'rgba(255,236,200,.9)' : 'rgba(170,200,235,.85)'; ctx.beginPath();
      for (const o of [0, (farIn ? 1 : -1) * w * 0.9 * (isUp ? -1 : 1)]) { const oy = isUp ? -Math.abs(o) : o; if (isUp) { ctx.moveTo(ax, ay + oy - w * 0.55); ctx.lineTo(ax + w / 2, ay + oy + w * 0.2); ctx.lineTo(ax - w / 2, ay + oy + w * 0.2); } else if (farIn) { ctx.moveTo(ax, ay + oy + w * 0.55); ctx.lineTo(ax + w / 2, ay + oy - w * 0.2); ctx.lineTo(ax - w / 2, ay + oy - w * 0.2); } else { ctx.moveTo(ax, ay + oy + w * 0.25); ctx.lineTo(ax + w / 2, ay + oy - w * 0.5); ctx.lineTo(ax - w / 2, ay + oy - w * 0.5); } ctx.closePath(); }
      ctx.fill();
    };
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    if (up && down && !wb) { lane(-hw, -1, true); lane(1, hw, false); } else lane(-hw, hw, up);
    ctx.restore();
    if (wb) { ctx.save(); ctx.translate(cx + wb.s[0] * TILE, cy + wb.s[1] * TILE); ctx.rotate(rot);  // 구멍: 깊은 쪽(-hl)이 어둡고, 바닥 쪽 끝(+hl)에서 깊은 쪽을 가리키는 ▼▼ (내려가는 방향)
      const gr = ctx.createLinearGradient(0, hl, 0, -hl); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = gr; ctx.fillRect(-hw, -hl, hw * 2, hl * 2);
      ctx.restore();
      // 내려가는 곳 표시: 누르는 자리(구멍 바닥 쪽 끝)에 화면 기준 ▼▼ — 오르는 곳은 ▲, 내려가는 곳은 ▼ 로만 구분한다
      const px = tc(l.tx + wb.s[0] + wb.d[0]), py = tc(l.ty + wb.s[1] + wb.d[1]), w = 13; ctx.fillStyle = 'rgba(170,205,240,.95)'; ctx.strokeStyle = 'rgba(7,10,18,.8)'; ctx.lineWidth = 1.5;
      for (const oy of [-7, 6]) { ctx.beginPath(); ctx.moveTo(px - w / 2, py + oy - w * 0.35); ctx.lineTo(px + w / 2, py + oy - w * 0.35); ctx.lineTo(px, py + oy + w * 0.45); ctx.closePath(); ctx.stroke(); ctx.fill(); } }
  }
}
// 높이 그림자: 건물·전봇대·전깃줄이 같은 방향(오른쪽 아래)으로 높이만큼 긴 그림자를 땅에 드리운다. 한 번만 구워 땅 그림에 넣는다
const SHD = { x: 20, y: 11 };  // 한 층 높이당 그림자가 밀리는 거리(px)
function bakeCastShadows(x) {
  const c = document.createElement('canvas'); c.width = MW * TILE; c.height = MH * TILE; const s = c.getContext('2d');
  s.fillStyle = '#000'; s.strokeStyle = '#000'; s.lineCap = 'round';
  BLD.forEach(b => { const h = b.h || 1, dx = h * SHD.x, dy = h * SHD.y, x0 = b.x0 * TILE, y0 = b.y0 * TILE, x1 = (b.x1 + 1) * TILE, y1 = (b.y1 + 1) * TILE;
    s.beginPath(); s.moveTo(x1, y0); s.lineTo(x1 + dx, y0 + dy); s.lineTo(x1 + dx, y1 + dy); s.lineTo(x0 + dx, y1 + dy); s.lineTo(x0, y1); s.lineTo(x1, y1); s.closePath(); s.fill(); });
  for (const o of S.poles || []) { s.lineWidth = 7; s.beginPath(); s.moveTo(o.x, o.y + 12); s.lineTo(o.x + o.z * SHD.x * 1.1, o.y + 12 + o.z * SHD.y * 1.1); s.stroke();
    s.lineWidth = 4; const tx = o.x + o.z * SHD.x * 1.1, ty = o.y + 12 + o.z * SHD.y * 1.1; s.beginPath(); s.moveTo(tx - 14, ty + 3); s.lineTo(tx + 14, ty - 3); s.stroke(); }
  for (const w of S.wires || []) { const a = w.a, b = w.b; s.lineWidth = 2.5; s.beginPath(); s.moveTo(a.x + a.z * SHD.x, a.y + a.z * SHD.y); s.lineTo(b.x + b.z * SHD.x, b.y + b.z * SHD.y); s.stroke(); }
  s.globalCompositeOperation = 'destination-out';  // 건물 바닥 안(실내)과 건물 자기 자리에는 드리우지 않는다
  BLD.forEach(b => s.fillRect(b.x0 * TILE, b.y0 * TILE, (b.x1 - b.x0 + 1) * TILE, (b.y1 - b.y0 + 1) * TILE));
  x.save(); x.globalAlpha = 0.45; x.filter = 'blur(3px)'; x.drawImage(c, 0, 0); x.restore();
}
function renderMap(R) {
  // R = {x0, y0, x1, y1}: 그 사각형(칸)만 그린다 (위층 평면 캐시용)
  const rx0 = R ? R.x0 : 0, ry0 = R ? R.y0 : 0, rx1 = R ? R.x1 : MW - 1, ry1 = R ? R.y1 : MH - 1;
  const c = document.createElement('canvas'); c.width = (rx1 - rx0 + 1) * TILE; c.height = (ry1 - ry0 + 1) * TILE;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(-rx0 * TILE, -ry0 * TILE);
  const hs = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 100;
  const base = (ch, tx, ty) => {
    const h = hs(tx, ty);
    switch (ch) {
      case '.': case 'T': case 'R': return h < 70 ? 'grass0' : h < 85 ? 'grass1' : 'grass2';
      case ',': return h < 75 ? 'dirt0' : 'dirt1';
      case 'g': return F.lawn0 ? (h < 70 ? 'lawn0' : h < 85 ? 'lawn1' : 'lawn2') : 'grass0';
      case 'J': return 'stone1';
      case 'x': case 'p': return 'grass0';
      case 'r': return F.fdirt0 ? 'fdirt1' : 'dirt1';
      case 'm': return 'stone1';
      case 'd': return F.fdirt0 ? (h < 75 ? 'fdirt0' : 'fdirt1') : 'dirt0';
      case '=': case 'F': return h < 80 ? 'stone0' : 'stone1';
      case 'w': case 'K': case 'E': return 'wood';
      case 'v': return 'wood2';
      case 'h': return 'stone1';
      case 't': return F.tileB ? 'tileB' : 'stone0';
      case '~': return 'water';
      default: return null;
    }
  };
  const draw = (name, dx, dy, dw = TILE, dh = TILE) => blit(x, name, dx, dy, dw, dh);
  const wallish = v => v === '#' || v === 'S' || v === 'N';
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx]; let b = base(ch, tx, ty);
    if (!b) { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(o => G[ty + o[1]] && G[ty + o[1]][tx + o[0]]).find(v => v && !wallish(v) && v !== '~' && base(v, tx, ty)); b = base(n || '=', tx, ty) || 'stone0'; }
    const kg = KIT ? kitGround(ch, tx, ty) : null;
    if (kg) x.drawImage(kg, tx * TILE, ty * TILE, TILE, TILE); else draw(b, tx * TILE, ty * TILE);
  }
  x.strokeStyle = 'rgba(200,225,245,.35)'; x.lineWidth = 2;
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === '~' && G[ty + 1] && G[ty + 1][tx] !== '~' && G[ty + 1][tx] != null) { x.beginPath(); x.moveTo(tx * TILE, ty * TILE + TILE - 1); x.lineTo(tx * TILE + TILE, ty * TILE + TILE - 1); x.stroke(); }
  // 도시: 개울('~')은 물빛과 잔물결, 물 위 보도블록('=')은 나무 다리
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE, hh = hs(tx, ty);
    if (ch === '~') { x.fillStyle = '#163650'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#1f4a6a'; x.fillRect(px, py + (hh % 3) * 6, TILE, 10); x.strokeStyle = 'rgba(170,215,240,.35)'; x.lineWidth = 2; for (let k = 0; k < 2; k++) { const yy = py + 12 + k * 20 + (hh % 5); x.beginPath(); x.moveTo(px + 4 + (hh % 7), yy); x.quadraticCurveTo(px + 16, yy - 4, px + 28 + (hh % 9), yy); x.stroke(); } }
    const water = (ox, oy) => G[ty + oy] && G[ty + oy][tx + ox] === '~';
    if (ch === '=' && (water(-1, 0) || water(1, 0) || water(0, -1) || water(0, 1))) { x.fillStyle = '#163650'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#7a5a3a'; x.fillRect(px, py + 2, TILE, TILE - 4); x.fillStyle = '#5a3e26'; for (let k = 0; k < TILE; k += 8) x.fillRect(px + k, py + 2, 2, TILE - 4); x.fillStyle = '#4a3220'; x.fillRect(px, py + 2, TILE, 3); x.fillRect(px, py + TILE - 5, TILE, 3); }
  }
  // 바닥 재질 그림
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE, hh = hs(tx, ty); if (!MAT[ch]) continue;
    if (ch === 'p') { x.fillStyle = 'rgba(40,70,110,.75)'; x.beginPath(); x.ellipse(px + 24, py + 26, 20, 12, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(170,210,240,.35)'; x.beginPath(); x.ellipse(px + 18, py + 22, 8, 3, 0, 0, TAU); x.fill(); }
    if (ch === 'x') { for (let k = 0; k < 9; k++) { const a = (hh + k * 37) % 40, b2 = (hh * 3 + k * 23) % 40; x.fillStyle = k % 2 ? 'rgba(200,235,255,.85)' : 'rgba(120,180,210,.8)'; x.beginPath(); x.moveTo(px + 4 + a, py + 4 + b2); x.lineTo(px + 9 + a, py + 6 + b2); x.lineTo(px + 6 + a, py + 10 + b2); x.fill(); } }
    if (ch === 'r') { for (let k = 0; k < 16; k++) { x.fillStyle = k % 3 ? '#8a8378' : '#5e594f'; x.fillRect(px + (hh + k * 29) % 44 + 2, py + (hh * 7 + k * 17) % 44 + 2, 4, 3); } }
    if (ch === 'm') { x.fillStyle = '#5d636e'; x.fillRect(px + 1, py + 1, TILE - 2, TILE - 2); x.fillStyle = '#7a818e'; for (let a = 0; a < 6; a++) for (let b2 = 0; b2 < 6; b2++) if ((a + b2) % 2 === 0) x.fillRect(px + 4 + a * 7, py + 4 + b2 * 7, 4, 2); x.strokeStyle = '#3a3f48'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2); }
  }
  // 돌계단('J'): 계단 줄무늬
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === 'J') { const px = tx * TILE, py = ty * TILE; for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,.32)'; x.fillRect(px, py + k * 12 + 9, TILE, 3); x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(px, py + k * 12, TILE, 2); } }
  // 보도 경계석: 보도블록('=')이 아스팔트('.')와 맞닿는 곳
    for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
      if (G[ty][tx] !== '=') continue; const px = tx * TILE, py = ty * TILE;
      const asph = (ox, oy) => G[ty + oy] && G[ty + oy][tx + ox] === '.';
      x.fillStyle = '#b4b6c4'; if (asph(0, 1)) x.fillRect(px, py + TILE - 6, TILE, 6); if (asph(0, -1)) x.fillRect(px, py, TILE, 5); if (asph(-1, 0)) x.fillRect(px, py, 5, TILE); if (asph(1, 0)) x.fillRect(px + TILE - 5, py, 5, TILE);
      x.fillStyle = 'rgba(0,0,0,.35)'; if (asph(0, 1)) x.fillRect(px, py + TILE, TILE, 3);
    }
  if (!CUR_F) (STAGE.decor || []).forEach(d => {
    if (d[0] === 'shade') { x.fillStyle = `rgba(${d[6] || '0,0,0'},${d[5]})`; x.fillRect(d[1] * TILE, d[2] * TILE, (d[3] - d[1] + 1) * TILE, (d[4] - d[2] + 1) * TILE); return; }
    if (d[0] === 'lane') { x.fillStyle = 'rgba(232,196,90,.75)'; for (let xx = d[1] * TILE; xx < (d[3] + 1) * TILE; xx += 48) x.fillRect(xx + 6, d[2] * TILE - 2, 28, 4); return; }
    if (d[0] === 'zebra') { x.fillStyle = 'rgba(226,228,236,.7)'; const vert = d[4] === 'v'; for (let k = 0; k < d[3]; k++) { if (vert) x.fillRect(d[1] * TILE + 4, (d[2] + k) * TILE + 8, TILE * 2 - 8, 14); else x.fillRect((d[1] + k) * TILE + 8, d[2] * TILE + 4, 14, TILE * 2 - 8); } return; }
    if (d[0] === 'park') { x.strokeStyle = 'rgba(226,228,236,.45)'; x.lineWidth = 3; for (let k = 0; k <= d[3]; k++) { x.beginPath(); x.moveTo((d[1] + k * 2) * TILE, d[2] * TILE); x.lineTo((d[1] + k * 2) * TILE, (d[2] + 2) * TILE); x.stroke(); } return; }
    if (d[0] === 'rug') { for (let yy = 0; yy < d[4]; yy++) for (let xx = 0; xx < d[3]; xx++) draw('wood2', (d[1] + xx) * TILE, (d[2] + yy) * TILE); }
    else draw('bench', d[1] * TILE, d[2] * TILE + 6, d[3] * TILE, TILE - 8);
  });
  TENTS.forEach(([tx, ty, cc]) => {
    const px = tx * TILE, py = ty * TILE, nm = cc === 'B' ? 'roofSlate' : 'roofRed';
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) draw(nm, px + xx * TILE, py + yy * TILE);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE * 2 - 8, TILE * 2, 8); x.fillRect(px + TILE - 2, py, 4, TILE * 2);
    x.strokeStyle = '#2a1a14'; x.lineWidth = 3; x.strokeRect(px + 1.5, py + 1.5, TILE * 2 - 3, TILE * 2 - 3);
  });
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE;
    if (wallish(ch)) {
      const n = wallish((G[ty - 1] || [])[tx]), so = wallish((G[ty + 1] || [])[tx]), e = wallish(G[ty][tx + 1]), w = wallish(G[ty][tx - 1]);
      let piece = 'wallH';
      if (e && so && !n && !w) piece = 'wallTL'; else if (w && so && !n && !e) piece = 'wallTR';
      else if (e && n && !so && !w) piece = 'wallBL'; else if (w && n && !so && !e) piece = 'wallBR';
      else if ((n || so) && !e && !w) piece = 'wallV';
      if (kitOk(kitTex.wall)) {
        x.fillStyle = '#2a2622'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#3e3832'; x.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); x.fillStyle = '#2a2622'; x.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        if (!so) {  // 앞(남쪽)이 열려 있으면 벽 앞면
          x.drawImage(kitTex.wall, 0, 16, 64, 48, px, py + 20, TILE, 28);
          x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE, TILE, 4);
        }  // 옆벽 창문은 drawWindow가 위에 그린다
      } else draw(piece, px, py);
      if (ch === 'S') { x.strokeStyle = 'rgba(15,10,8,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px + 22, py + 6); x.lineTo(px + 18, py + 20); x.lineTo(px + 26, py + 30); x.lineTo(px + 21, py + 42); x.stroke(); }
    }
    if (ch === 'Z') draw('sack', px, py);
    if (ch === 'I') { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 14, py + 14, 24, 24); x.fillStyle = '#8c8f97'; x.fillRect(px + 10, py + 10, 26, 26); x.fillStyle = '#b3b6bd'; x.fillRect(px + 10, py + 10, 26, 5); }
    if (ch === 'Q' || ch === 'q') {
      x.fillStyle = '#4a4a50'; x.fillRect(px + 3, py + 5, 42, 38); x.fillStyle = '#6c6c74'; x.fillRect(px + 6, py + 8, 36, 6);
      x.fillStyle = '#141014'; x.beginPath(); x.moveTo(px + 11, py + 40); x.lineTo(px + 11, py + 24); x.arc(px + 24, py + 24, 13, Math.PI, 0); x.lineTo(px + 37, py + 40); x.closePath(); x.fill();
      x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.strokeRect(px + 3, py + 5, 42, 38);
    }
    if (ch === 'C') draw(hs(tx, ty) % 3 ? 'crate' : 'crate2', px, py);
    if (ch === 'O') draw(tx % 2 ? 'pot0' : 'pot1', px, py);
    if (ch === 'R') draw('rock', px, py);
    if (ch === 'H' && KIT_PROP.dumpster) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 4, py + 8, TILE - 6, TILE - 8); }
    else if (ch === 'H') { draw('box', px, py); x.strokeStyle = 'rgba(242,196,107,.5)'; x.lineWidth = 2; x.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4); }
    if (ch === 'U') {  // 컨테이너·창고 옥상 (높이 1): 골함석, 남쪽 끝은 앞면
      const hh = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, cols = ['#5a82a8', '#a84e40', '#55906c', '#b88e3e'];
      let gx = tx; while (G[ty][gx - 1] === 'U') gx--; const base = cols[(gx * 7 + ty * 3) % 4];
      x.fillStyle = base; x.fillRect(px, py, TILE, TILE);
      x.fillStyle = 'rgba(255,255,255,.10)'; for (let k = 2; k < TILE; k += 6) x.fillRect(px + k, py, 2, TILE);
      x.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 5; k < TILE; k += 6) x.fillRect(px + k, py, 1, TILE);
      if (G[ty + 1] && G[ty + 1][tx] !== 'U') { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE - 12, TILE, 12); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px, py + TILE - 12, TILE, 2); }
      if (G[ty - 1] && G[ty - 1][tx] !== 'U') { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(px, py, TILE, 2); }
      if (G[ty][tx - 1] !== 'U') { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(px, py, 3, TILE); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px + 3, py, 1, TILE); }
      if (G[ty][tx + 1] !== 'U') { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(px + TILE - 3, py, 3, TILE); }
      if (hh % 9 === 0) { x.fillStyle = 'rgba(120,60,30,.35)'; x.fillRect(px + (hh % 20), py + (hh % 17), 10, 8); }
    } else if (ch === 'U') {
      draw(roofOf(0), px, py);
      x.fillStyle = 'rgba(0,0,0,.4)';
      if (!roofAt(tx, ty + 1)) x.fillRect(px, py + TILE - 6, TILE, 6);
      if (!roofAt(tx, ty - 1)) x.fillRect(px, py, TILE, 3);
      if (!roofAt(tx - 1, ty)) x.fillRect(px, py, 3, TILE);
      if (!roofAt(tx + 1, ty)) x.fillRect(px + TILE - 3, py, 3, TILE);
    }
    if (ch === 'L') {
      x.strokeStyle = '#9aa1aa'; x.lineWidth = 5; x.beginPath(); x.moveTo(px + 14, py + 3); x.lineTo(px + 14, py + 45); x.moveTo(px + 34, py + 3); x.lineTo(px + 34, py + 45); x.stroke();
      x.lineWidth = 4; x.beginPath(); for (let i = 0; i < 5; i++) { x.moveTo(px + 14, py + 7 + i * 9); x.lineTo(px + 34, py + 7 + i * 9); } x.stroke();
    }
    if (ch === 'W') {
      const man = STAGE.well === 'manhole';
      if (man) {
        // 주철 맨홀 뚜껑: 밝은 테두리, 격자 무늬, 아래쪽 그림자 (밤에도 바닥에서 구분되게)
        x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(px + 25, py + 27, 21, 0, TAU); x.fill();
        x.fillStyle = '#8a8c94'; x.beginPath(); x.arc(px + 24, py + 24, 21, 0, TAU); x.fill();
        x.fillStyle = '#4a4c54'; x.beginPath(); x.arc(px + 24, py + 24, 17, 0, TAU); x.fill();
        x.save(); x.beginPath(); x.arc(px + 24, py + 24, 15, 0, TAU); x.clip();
        x.strokeStyle = '#6e7078'; x.lineWidth = 2; for (let i = -15; i <= 15; i += 6) { x.beginPath(); x.moveTo(px + 9, py + 24 + i); x.lineTo(px + 39, py + 24 + i); x.stroke(); x.beginPath(); x.moveTo(px + 24 + i, py + 9); x.lineTo(px + 24 + i, py + 39); x.stroke(); }
        x.restore();
        x.strokeStyle = '#b4b6be'; x.lineWidth = 2; x.beginPath(); x.arc(px + 24, py + 24, 20, Math.PI * 1.05, Math.PI * 1.75); x.stroke();
        x.fillStyle = '#2a2c32'; x.fillRect(px + 20, py + 10, 8, 3);
      } else {
        x.fillStyle = '#7c776c'; x.beginPath(); x.arc(px + 24, py + 24, 21, 0, TAU); x.fill();
        x.fillStyle = '#58544c'; x.beginPath(); x.arc(px + 24, py + 24, 16, 0, TAU); x.fill();
        x.fillStyle = '#05070b'; x.beginPath(); x.arc(px + 24, py + 24, 12, 0, TAU); x.fill();
      }
    }
    if (ch === 'F') {
      x.fillStyle = '#3e3a36'; x.fillRect(px + 10, py + 8, 28, 32); x.strokeStyle = '#1c1a18'; x.lineWidth = 3; x.strokeRect(px + 10, py + 8, 28, 32);
      x.fillStyle = '#f2c46b'; x.beginPath(); x.moveTo(px + 26, py + 12); x.lineTo(px + 18, py + 26); x.lineTo(px + 24, py + 26); x.lineTo(px + 21, py + 36); x.lineTo(px + 30, py + 21); x.lineTo(px + 24, py + 21); x.closePath(); x.fill();
    }
  }
  // 방 이름 (Monaco처럼 바닥에 흐리게)
  drawRoomLabels(x, CUR_F, rx0, ry0, rx1, ry1);
  // 가구 (이 층 것만)
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === 'Y') drawStairs(x, tx, ty);
  FURN.filter(f => f.fl === CUR_F && f.x + f.w > rx0 && f.x <= rx1 && f.y + f.h > ry0 && f.y <= ry1).sort((a, b) => (a.y + a.h) - (b.y + b.h)).forEach(f => drawFurn(x, f));
  // 주차된 차 · 필로티 아래 그늘
  if (!CUR_F) {
    BLD.forEach(b => { if (b.piloti) { x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect((b.x0 + 1) * TILE, (b.y0 + 1) * TILE, (b.x1 - b.x0 - 1) * TILE, (b.y1 - b.y0) * TILE); } });
    CARS.forEach(([cx, cy, c]) => { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cx * TILE + 8, cy * TILE + 10, 38, 88); blit(x, 'car' + c, cx * TILE, cy * TILE, TILE, TILE * 2); });
  }
  if (!CUR_F && !R) bakeCastShadows(x);
  // 정면벽 아래 땅 그림자
  if (!CUR_F) BLD.forEach(b => { if (!b.facade) return; const sl = 9 + 8 * (b.h - 1); const g = x.createLinearGradient(0, (b.y1 + 1) * TILE, 0, (b.y1 + 1) * TILE + sl); g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(b.x0 * TILE + 4, (b.y1 + 1) * TILE, (b.x1 - b.x0 + 1) * TILE, sl); });
  // 석등
  S.lamps.forEach(l => { if (l.hearth || flOf(l) !== CUR_F) return; if (G[Math.floor(l.y / TILE)][Math.floor(l.x / TILE)] === 'P') return; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l.x - 3, l.y + 2, 9, 9); x.fillStyle = '#5d626c'; x.fillRect(l.x - 4, l.y - 4, 8, 8); x.fillStyle = '#9aa0aa'; x.fillRect(l.x - 2, l.y - 2, 4, 4); return; x.fillStyle = '#4a4640'; x.fillRect(l.x - 7, l.y - 7, 14, 14); x.fillStyle = '#7a746a'; x.fillRect(l.x - 5, l.y - 5, 10, 10); x.fillStyle = '#2a2622'; x.fillRect(l.x - 2, l.y - 2, 4, 4); });
  return c;
}

