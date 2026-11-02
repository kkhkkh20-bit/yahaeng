function baseWindowSealed(w) {
  const blocked = (x,y) => !inMap(x,y) || (SOLID.has(G0[y][x]) && G0[y][x] !== 'X');
  return [[1,0],[0,1]].every(([x,y]) => blocked(w.tx+x,w.ty+y) || blocked(w.tx-x,w.ty-y));
}
function winInit() {
  S.winInit = true;
  for (const w of S.windows) w.sealed = baseWindowSealed(w); 
  if (STAGE.tutorial) { for (const w of S.windows) w.st = bldAt(w.tx, w.ty) >= 0 ? 'lock' : 'open'; for (const w of S.windows) w.b = bldAt(w.tx, w.ty); return; }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], doorT = new Set(S.doors.map(d => d.tx + ',' + d.ty));
  const keyPts = S.items.filter(i => !i.fl).concat((S.keyItems || []).filter(i => !i.fl)).map(i => [Math.floor(i.x / TILE), Math.floor(i.y / TILE)]);
  const byB = {};
  for (const w of S.windows) {
    const b = bldAt(w.tx, w.ty); w.b = b; if(w.sealed){w.st='bar';continue;} if (b < 0) { w.st = 'open'; continue; }
    let inner = null; for (const [dx, dy] of N4) { const x = w.tx + dx, y = w.ty + dy; if (bldAt(x, y) === b && !groundSolidP(x, y)) { inner = [x, y]; break; } }
    if (inner) {  // 창문 안쪽 방(문에서 끊긴다)에 물건·열쇠가 있으면 방범창
      const seen = new Set([inner + '']), q = [inner]; let hit = false, door = false;
      while (q.length && seen.size < 260) { const [x, y] = q.shift(); if (keyPts.some(([kx, ky]) => Math.abs(kx - x) <= 1 && Math.abs(ky - y) <= 1)) hit = true;
        for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (doorT.has(k)) door = true; if (seen.has(k) || bldAt(nx, ny) !== b || doorT.has(k) || groundSolidP(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
      if (hit) w.st = door ? 'bar' : 'lock';  // 문이 없는 방이면 창문이 유일한 길이니 막지 않고 잠가 둔다
    }
    (byB[b] = byB[b] || []).push(w);
  }
  // 건물마다 하나는 꼭 열어 두고, 나머지는 반쯤 열림 · 잠김 · 방범창이 적당히 섞이게 (예전엔 거의 다 잠겨 있었다)
  for (const b in byB) { const ws = byB[b].filter(w => !w.st).sort(() => Math.random() - 0.5); ws.forEach((w, i) => { w.st = groundedWorld() ? 'lock' : i === 0 || Math.random() < 0.45 ? 'open' : 'lock'; }); }  // 나머지는 잠김 — 락픽으로 딸 수 있다 (방범창은 물건 있는 방만)
  // 2층 창문: 반쯤 열려 있다. 열린 창문 밑에서는 벽을 타고 올라 들어갈 수 있다 (바깥 땅 칸 · 안쪽 바닥 칸을 적어 둔다)
  for (const w of S.fwindows || []) { w.st = !groundedWorld() && w.fl === 1 && Math.random() < 0.5 ? 'open' : 'lock'; w.out = null; w.inn = null;
    const g = GF[w.fl]; if (!g) continue;
    for (const [dx, dy] of N4) { const ox = w.tx + dx, oy = w.ty + dy, ix = w.tx - dx, iy = w.ty - dy;
      if (!inMap(ox, oy) || !inMap(ix, iy) || bldAt(ox, oy) >= 0 || groundSolidP(ox, oy) || SOLID.has(g[iy][ix]) || bldAt(ix, iy) < 0) continue;
      w.out = { x: tc(ox), y: tc(oy), d: [dx, dy] }; w.inn = { x: tc(ix), y: tc(iy) }; break; } }
  for(const [x,y,fl,state]of STAGE.windowStates||[]){const w=(fl?S.fwindows:S.windows).find(w=>w.tx===x&&w.ty===y&&flOf(w)===fl);if(w&&!w.sealed)w.st=state;}
}
// 2층 안에서 열린 창문 앞: 창틀을 넘어 벽을 타고 내려간다
function nearWinDrop() {
  const P = S.player; if (P.z || flOf(P) !== 1 || P.carrying || P.captive || P.jump || P.hide || P.trav) return null; let best = null, bd = 40;
  for (const w of S.fwindows || []) { if (ACT_SKIP.has(w) || w.fl !== 1 || w.st !== 'open' || !w.out || !w.inn) continue; const d = dist(P.x, P.y, w.inn.x, w.inn.y); if (d < bd) { bd = d; best = w; } }
  return best;
}
// 벽 타고 2층 열린 창문으로: 창문 바로 밑(바깥 땅 칸)에서. 열린 창문만 (매달린 채로는 락픽을 못 쓴다)
function nearWinClimb() {
  if (groundedWorld()) return null;
  const P = S.player; if (P.z || flOf(P) || P.carrying || P.captive || P.jump || P.hide || P.trav) return null; let best = null, bd = 36;
  for (const w of S.fwindows || []) { if (ACT_SKIP.has(w) || w.fl !== 1 || !w.out || w.st !== 'open') continue; const d = dist(P.x, P.y, w.out.x, w.out.y); if (d < bd) { bd = d; best = w; } }
  return best;
}
const winSt = w => w.st || 'open';
const pickDur = kind => (kind === 'door' ? 3.2 : kind === 'bar' ? 3.8 : kind === 'latch' ? 0.7 : 1.6) * (DKEY === 'easy' ? 0.8 : DKEY === 'hard' ? 1.25 : 1);
function startPick(o) { const P = S.player; P.pick = Object.assign({ t: 0, nt: 0.2 }, o, { dur: pickDur(o.kind) }); P.vx = P.vy = 0; P.cover = null; play('metal', 0.18, 1.8); hint('pick', '락픽: 따는 동안 움직이지 마라. 긁는 소리가 조금 난다. 안쪽 창문은 걸쇠만 풀면 된다'); }
// 반격 (메탈기어 CQC식): 경비가 칼을 들어 올린 뒤 내려치기 직전(0.35초)에 [행동]이면 붙잡아 넘어뜨려 기절시킨다. 소리가 커서 주변이 몰려온다
const COUNTER_WIN = 0.35;
function counterTarget() {
  const P = S.player; if (P.hide || P.vent || P.under || P.carrying || P.captive || P.trav || P.jump || P.wire) return null;
  let best = null; for (const g of S.guards) { if (!(g.atkT > 0) || g.dog || g.state === 'DEAD' || flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0) || dist(g.x, g.y, P.x, P.y) > 62) continue; if (g.atkT <= COUNTER_WIN && (!best || g.atkT < best.atkT)) best = g; }
  return best;
}
function doCounter(g) {
  const P = S.player; g.atkT = 0; g.atkCd = 0; P.a = Math.atan2(g.y - P.y, g.x - P.x); P.strikeT = 0.35; S.hitStop = 0.12; S.shakeT = 0.18;
  S.stats.counters = (S.stats.counters || 0) + 1; play('thud', 0.7); noise(g.x, g.y, 260, 'fight', flOf(g));
  S.koNext = true; killGuard(g, null, null, true); S.koHold = null; toast('반격 — 넘어뜨려 기절시켰다. 소리가 컸다', 2.2, 'good');  // 반격은 길게 눌러도 처치로 바뀌지 않는다
}
// 가구에서 훔치기: 물건을 가까운 책상·컴퓨터·서류장·금고 등에 올려 두고, 옆에 서서 [행동]으로 시간을 들여 빼 온다.
// it.x, it.y 는 가구 옆 '서는 자리'(길 찾기·거리 판정용), it.dx, it.dy 는 가구 위 그리는 자리
const LOOT = { pc: ['컴퓨터', '자료 빼내기', '빼내기', 3.0, 15], safe: ['금고', '금고에서 꺼내기', '꺼내기', 2.2, 25], cab: ['서류장', '서랍 뒤지기', '뒤지기', 1.6, 35], locker: ['사물함', '사물함 뒤지기', '뒤지기', 1.6, 40],
  desk2: ['책상', '책상에서 챙기기', '챙기기', 0.8, 15], desk: ['책상', '책상에서 챙기기', '챙기기', 0.8, 15], wardrobe: ['옷장', '옷장 뒤지기', '뒤지기', 1.6, 35], table: ['탁자', '탁자에서 챙기기', '챙기기', 0.8, 15], counter: ['계산대', '계산대 뒤지기', '뒤지기', 1.2, 25], tableS: ['탁자', '탁자에서 챙기기', '챙기기', 0.8, 15],
  nstand: ['협탁', '협탁 서랍 뒤지기', '뒤지기', 1.2, 25], bedD: ['침대', '침대 밑 뒤지기', '뒤지기', 1.4, 25], bed: ['침대', '침대 밑 뒤지기', '뒤지기', 1.4, 25] };
const LOOT_PREF = ['safe', 'pc', 'cab', 'desk2', 'desk', 'nstand', 'counter', 'locker', 'wardrobe', 'table', 'tableS', 'bedD', 'bed'];
