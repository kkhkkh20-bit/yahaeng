// ---------------------------------------------------------------- 상호작용 대상 찾기
// 숨을 곳 이름: 수거함(수거함) · 맨홀(맨홀) · 옷장 · 침대 밑 · 사물함
const FURN_HIDE = { wardrobe: '옷장', bed: '침대 밑', locker: '사물함', okt: '옥탑방' };
// 열쇠·카드키: 색마다 맞는 문만 연다 (gold = 예전 판의 그냥 열쇠)
const KEYS = { gold: ['열쇠', '#f2c46b'], red: ['빨강 카드', '#ff5a5a'], blue: ['파랑 카드', '#5aa8ff'], green: ['초록 카드', '#5ad88a'], code: ['비번', '#c8ccd2'] };
const keyName = k => k === 'code' ? (hasK('code') ? '비번 ' + (STAGE.code || '') : '숫자 자물쇠') : (KEYS[k] || KEYS.gold)[0], keyCol = k => (KEYS[k] || KEYS.gold)[1];
const hasK = k => !!(S.player.keys && S.player.keys[k]);
function giveKey(k, msg) { S.player.keys[k] = true; S.player.hasKey = true; play('click', 0.5); toast(msg || keyName(k) + '을(를) 챙겼다', 2.2, 'good'); }
const hideName = h => FURN_HIDE[h.type] || (h.type === 'well' ? (STAGE.well === 'manhole' ? '맨홀' : '맨홀') : h.type === 'bush' ? '화단' : '쓰레기통');
const hideIn = h => h.type === 'bed' ? '침대 밑' : hideName(h) + ' 안';
function nearHide() {
  const P = S.player; if (P.wire || P.jump) return null; let best = null, bd = 60;
  for (const b of S.hides) { if (ACT_SKIP.has(b)) continue; if ((b.fl || 0) !== flOf(P) || (b.z || 0) !== (P.z || 0)) continue; const d = dist(P.x, P.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
// 오르기: 바닥 쪽(b)에 서 있으면 / 내려가기: 위쪽(u)에 서 있으면
function nearClimb() {
  const P = S.player; if (P.carrying || P.captive || P.jump) return null; let best = null, bd = 44;
  for (const l of S.ladders) { if (ACT_SKIP.has(l)) continue; if (l.bz !== P.z || (P.z === 0 && (l.bfl || 0) !== flOf(P)) || (l.kind === 'chimney' && lampOn(l.lamp))) continue; const d = dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best;
}
// 계단실 (꺾인 두 줄): 올라가는 줄 = 계단 칸 Y + 들어서는 칸 e(=Y+d), 위층의 옆 줄 = 내려가는 구멍 c1(Y 옆, 깊은 쪽)·c2(e 옆, 바닥 쪽 끝)
// 내려가기는 구멍의 바닥 쪽 끝(c2)에서만, 오르기는 계단 칸(Y)에서만 — 한 자리에 둘을 두지 않는다
function stairHole(l) { const w = l.kind === 'fstair' && STAIRW[l.tfl + ':' + l.tx + ',' + l.ty]; if (!w) return null; const [sx, sy] = w.s, [dx, dy] = w.d;
  return { d: w.d, c1: { x: tc(l.tx + sx), y: tc(l.ty + sy) }, c2: { x: tc(l.tx + sx + dx), y: tc(l.ty + sy + dy) }, e: { tx: l.tx + dx, ty: l.ty + dy }, top: { tx: l.tx + sx + 2 * dx, ty: l.ty + sy + 2 * dy } }; }
// 내려가는 자리: 꺾인 계단실이면 구멍 바닥 쪽 끝(c2). 구멍을 못 만든 계단은 계단 칸 그 자리인데, 같은 칸에서 또 위로 오르는 계단(옥상·윗층)이 있으면
// 한 자리에 두 행동이 겹치므로 내려가는 자리를 계단 앞 칸(들어서는 칸)으로 옮긴다
const downPt = l => { const h = stairHole(l); if (h) return h.c2;
  if (l.kind === 'fstair' && S.ladders.some(o => o !== l && (o.kind === 'fstair' || o.kind === 'stair') && o.tx === l.tx && o.ty === l.ty && (o.bfl || 0) === l.tfl)) {
    if (l._dp) return l._dp;  // 옆 칸 중 막히지 않고, 옆 건물 창문 앞 자리와 겹치지 않는 칸 (계단 앞 칸 먼저)
    const L0 = CUR_F; setLayer(l.tfl); const [dx, dy] = stairDir(l.tx, l.ty), win = (x, y) => S.fwindows.some(w => w.link && w.fl === l.tfl && w.tx - w.link.dir === x && w.ty === y);
    const c = [[dx, dy], [0, 1], [0, -1], [-1, 0], [1, 0]].map(([ox, oy]) => [l.tx + ox, l.ty + oy]).find(([x, y]) => !solidAt(x, y) && G[y][x] !== 'Y' && !win(x, y)); setLayer(L0);
    if (c) return (l._dp = { x: tc(c[0]), y: tc(c[1]) }); }
  return { x: l.x, y: l.y }; };
// 위층에서 아래층으로
function nearFloorDown() {
  const P = S.player; if (P.z || !flOf(P) || P.jump || P.carrying || P.captive) return null; let best = null, bd = 1e9;
  for (const l of S.ladders) { if (ACT_SKIP.has(l)) continue; if ((l.kind !== 'fstair' && l.kind !== 'balc') || l.tfl !== flOf(P)) continue; const p = l.kind === 'balc' ? { x: l.ux, y: l.uy } : downPt(l), r = stairHole(l) ? 64 : 44, d = dist(P.x, P.y, p.x, p.y); if (d < r && d < bd) { bd = d; best = l; } }  // 구멍 끝은 난간이라 옆 칸에서 누른다 (64px)
  return best;
}
function nearNote() {
  const P = S.player; if (P.z || P.wire || P.jump || P.hide || !S.notes) return null; let best = null, bd = 44;
  for (const n of S.notes) { if (ACT_SKIP.has(n)) continue; if (n.fl !== flOf(P)) continue; const d = dist(P.x, P.y, n.x, n.y); if (d < bd) { bd = d; best = n; } }
  return best;
}
// 쪽지를 읽는다. 표적을 살려 둘 근거(spare)가 되는 쪽지면 선택이 열린다
function readNote(n) {
  const first = !n.read; n.read = true; play('cloth', 0.35);
  if (first && n.gives) { S.player.keys[n.gives] = true; S.player.hasKey = true; if (n.learn) S.learned.push(n.learn); toast('알아냈다 — ' + (n.learn || keyName(n.gives)), 3, 'good'); }
  const lines = n.lines.map(t => [{ note: n.title }, t]);
  const sp = STAGE.spare, tgt = S.guards.find(g => g.target);
  if (first && sp && n.key === sp.note && tgt) {
    if (tgt.state === 'DEAD') { S.realized = true; lines.push(['hero', sp.after]); }
    else { S.spare = true; lines.push(['hero', sp.before]); }
  }
  say(lines, true, () => { if (S.spare && tgt && tgt.state !== 'DEAD') { toast(sp.toast, 4.5, 'good'); checkObjective(); } });
}
// 위층 옆 창문 → 마주 보는 옆 건물 창문
// 넘어 들어가는 곳 바로 앞에 있는 사람(같은 층) — 착지와 함께 처리한다
function landingVictim(x, y, fl) {
  const L0 = CUR_F; setLayer(fl); let best = null, bd = 78;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== fl || g.z || g.climb || g.dog || (g.state === 'ALERT' && !g.target)) continue;
    const d = dist(x, y, g.x, g.y); if (d < bd && los(x, y, g.x, g.y)) { bd = d; best = g; }
  }
  setLayer(L0); return best;
}
function nearSideWin() {
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 46;
  for (const w of S.fwindows) { if (ACT_SKIP.has(w)) continue; if (!w.link || w.fl !== flOf(P)) continue; const ix = tc(w.tx - w.link.dir), d = dist(P.x, P.y, ix, w.y); if (d < bd) { bd = d; best = w; } }
  return best;
}
// 위층 창문 안쪽에서 창밖 전깃줄로
function nearWinWire() {
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 52;
  for (const w of S.wires) for (const [n, s] of [[w.a, 0], [w.b, 1]]) { if (!n.win || n.fl !== flOf(P)) continue; const d = dist(P.x, P.y, tc(n.tx), tc(n.ty - 1)); if (d < bd) { bd = d; best = { w, s, at: { x: tc(n.tx), y: tc(n.ty) } }; } }
  return best;
}
function nearClimbDown() {
  const P = S.player; if (!P.z || P.jump) return null; let best = null, bd = 52;
  for (const l of S.ladders) { if (ACT_SKIP.has(l)) continue; if (l.tz !== P.z) continue; const d = dist(P.x, P.y, l.rx != null ? l.rx : l.ux, l.ry != null ? l.ry : l.uy); if (d < bd) { bd = d; best = l; } }
  return best;
}
// 골목 건너뛰기: 바라보는 방향으로 1~2칸 틈 너머의 같은 높이(또는 한 층 아래) 옥상
function jumpTarget() {
  const P = S.player; if (!P.z || P.jump) return null;
  const k = Math.round(P.a / (Math.PI / 4)), a = k * Math.PI / 4;
  const dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a));
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (rLv(tx + dx, ty + dy) >= P.z) return null;
  const ex = tc(tx) + dx * TILE / 2, ey = tc(ty) + dy * TILE / 2;
  if (dist(P.x, P.y, ex, ey) > 34) return null;
  // 정면벽 줄(건물 옆면)은 거리에 넣지 않는다: 실제 틈은 골목 폭이다
  let real = 0;
  for (let n = 1; n <= 12; n++) {
    const lx = tx + dx * n, ly = ty + dy * n; if (!inMap(lx, ly)) return null;
    const lv = rLv(lx, ly);
    if (n > 1 && lv > 0 && (lv === P.z || lv === P.z - 1) && real >= 1) return { tx: lx, ty: ly, z: lv };
    if (lv >= P.z) return null;
    if (!facadeRow(lx, ly)) real++;
    if (real > 1) return null;  // 사람 한 칸 정도 틈만 건너뛴다
  }
  return null;
}
function canKill(g, P, reach = 56) {
  if (g.child || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed || g.climb || flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) return false;
  const d = dist(P.x, P.y, g.x, g.y); if (d > reach) return false;
  if (g.state === 'ALERT' && !g.target && !radioBusy(g)) return false;
  const behind = Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) > 1.75;
  if (g.civ) return (behind || g.state === 'SLEEP' || g.state === 'PANIC' || g.state === 'REPORT') && los(P.x, P.y, g.x, g.y);
  if (!behind && !(g.target && (g.state === 'FLEE' || (g.state !== 'ALERT' && d < 36))) && !(radioBusy(g) && d <= 56)) return false;
  return los(P.x, P.y, g.x, g.y) && (d <= 56 || lungeClear(P, g));
}
// 돌진 경로: 가는 길에 벽·가구가 없어야 한다
function lungeClear(P, g) {
  const n = Math.ceil(dist(P.x, P.y, g.x, g.y) / 12), sol = solidFor(P.z || 0);
  for (let i = 1; i < n; i++) { const x = P.x + (g.x - P.x) * i / n, y = P.y + (g.y - P.y) * i / n; if (sol(Math.floor(x / TILE), Math.floor(y / TILE))) return false; }
  return true;
}
const LUNGE = 112;  // 등 뒤에서 이 거리 안이면 달려들어 암살
// 땅 위 암살 대상 (최대 2명 — 붙어 있으면 동시 암살)
function killList() {
  const P = S.player; if (P.carrying || P.captive || P.strikeT > 0 || P.hide || P.jump || P.wire || P.trav || P.under || P.vent) return [];
  if (P.lunge || P.grabIn) return [];
  let list = S.guards.filter(g => !ACT_SKIP.has(g) && canKill(g, P)).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y));
  if (!list.length && !P.carrying) list = S.guards.filter(g => !g.civ && !ACT_SKIP.has(g) && canKill(g, P, (P.mode === 'run' && P.moving ? 64 : LUNGE) * (perkOn('reach') ? 1.2 : 1))).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y)).slice(0, 1);
  if (list.length >= 2 && dist(list[0].x, list[0].y, list[1].x, list[1].y) < 112) return [list[0], list[1]];
  return list.slice(0, 1);
}
// 옥상 위에서 아래로 떨어지며 암살
function dropTarget() {
  const P = S.player; if (!P.z || P.z >= 3 || P.strikeT > 0 || P.jump) return null;
  // 옥상 가장자리 바깥의 맨땅 칸(뛰어내릴 자리)을 먼저 찾는다
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  const edges = N8.map(o => [tx + o[0], ty + o[1]]).filter(([x, y]) => !roofAt(x, y) && bldAt(x, y) < 0 && !groundSolidP(x, y));
  if (!edges.length) return null;
  let best = null, bd = P.z >= 2 ? 132 : 118;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || (g.state === 'ALERT' && !g.target) || flOf(g) || g.z || g.climb) continue;
    // 옥상 아래(건물 안)에 있는 사람은 옥상 위에서 칠 수 없다
    const gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE);
    if (roofAt(gx, gy) || bldAt(gx, gy) >= 0) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d >= bd) continue;
    // 뛰어내릴 자리에서 표적까지 벽에 막히지 않아야 한다
    if (!edges.some(([x, y]) => dist(tc(x), tc(y), g.x, g.y) < 100 && los(tc(x), tc(y), g.x, g.y))) continue;
    bd = d; best = g;
  }
  return best;
}
// 맨홀 속에서 끌어들이는 기습 암살
// 숨은 곳(수거함·맨홀·화단)에서 지나가는 자경대원을 끌어들여 암살 — 등 뒤일 필요 없음
function ambushTarget() {
  const P = S.player;
  const from = P.hide ? P.hide : (P.hidden && P.z === 0 && !P.carrying && !P.captive ? P : null);
  if (!from || P.strikeT > 0) return null;
  let best = null, bd = P.hide ? 80 : 60;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || flOf(g) !== flOf(P) || g.z || g.climb) continue;
    const d = dist(from.x, from.y, g.x, g.y); if (d < bd && los(from.x, from.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
// 창문 넘기: 창문 옆에 서 있고 반대편이 비어 있으면
// 창문 상태 (도시): open 열림 · lock 잠김(밖에서는 락픽, 안에서는 걸쇠를 풀면 열린다) · bar 방범창(못 지나간다, 엿보기는 된다)
// 건물마다 하나만 열려 있고, 물건·열쇠가 있는 방의 창문은 방범창
// 자경대원이 알아채는 흔적: 원래 잠겨 있던 창문·문이 열려 있으면 다가가 다시 잠근다 (인비저블 Inc 방식)
function noteChange(kind, ref, key) { S.changes = S.changes || []; if (S.changes.some(c => c.ref === ref && !c.done)) return; S.changes.push({ kind, ref, key: key || null, x: ref.x, y: ref.y, fl: ref.fl || 0, by: null, done: false }); }
function changeOpen(c) { return c.kind === 'win' ? winSt(c.ref) === 'open' : !c.ref.locked; }
function updateChanges(dt) {
  if (!S.changes || !S.changes.length || (S.chgT = (S.chgT || 0) - dt) > 0) return; S.chgT = 0.25;
  const P = S.player;
  for (const c of S.changes) {
    if (c.done) continue; if (!changeOpen(c)) { c.done = true; continue; }
    if (c.by && (c.by.state === 'DEAD' || c.by.state === 'CAPTIVE' || c.by.state === 'ALERT' || c.by.state === 'FLEE' || c.by.state === 'TERROR')) c.by = null;
    if (!c.by) {
      for (const g of S.guards) {
        if (g.civ || g.dog || g.target || g.climb || g.z || !['PATROL', 'RETURN', 'CHECK'].includes(g.state) || flOf(g) !== c.fl) continue;
        const d = dist(g.x, g.y, c.x, c.y); if (d > 230 || Math.abs(angDiff(g.a, Math.atan2(c.y - g.y, c.x - g.x))) > guardFov(g) * 1.2) continue;
        setLayer(c.fl); const ok = los(g.x, g.y, c.x, c.y, true); setLayer(flOf(P)); if (!ok) continue;
        // 자경대원 쪽 칸으로 가서 본다
        let tx = Math.floor(c.x / TILE), ty = Math.floor(c.y / TILE), best = null, bd = 1e9;
        setLayer(c.fl); const sol = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sol.push(solidAt(tx + dx, ty + dy)); setLayer(flOf(P));
        for (const [i, [dx, dy]] of [[1, 0], [-1, 0], [0, 1], [0, -1]].entries()) { const x = tx + dx, y = ty + dy; if (sol[i]) continue; const dd = dist(g.x, g.y, tc(x), tc(y)); if (dd < bd) { bd = dd; best = { x: tc(x), y: tc(y) }; } }
        c.by = g; c.at = best || { x: c.x, y: c.y }; goSuspicious(g, c.at.x, c.at.y, 2.2); gsay(g, c.kind === 'win' ? '창문이 왜 열려 있지?' : '이 문이 왜 열려 있어?', 2.4);
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '자경대원이 열린 창문을 알아챘다 — 다시 잠그러 간다' : '자경대원이 열린 문을 알아챘다 — 다시 잠그러 간다', 2.4, 'warn');
        break;
      }
    } else {
      const g = c.by;
      if (g.state !== 'SUSPICIOUS' && g.state !== 'NOTICE') { if (dist(g.x, g.y, c.at.x, c.at.y) > 70) goSuspicious(g, c.at.x, c.at.y, 2.2); }
      if (dist(g.x, g.y, c.at.x, c.at.y) < 46 && dist(P.x, P.y, c.x, c.y) > 40) {
        if (c.kind === 'win') c.ref.st = 'lock'; else { if (doorBlocked(c.ref)) continue; if (c.key) c.ref.group.forEach(t => t.keyLock = c.key); setDoor(c.ref, true); for (const o of S.guards) if (o.path) o.path = null; }
        c.done = true; play('metal', 0.35 * proxVol(g)); noise(c.x, c.y, 40, 'door');
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '창문이 다시 잠겼다' : '문이 다시 잠겼다', 1.8);
      }
    }
  }
}
// 연습(훈련장): 단계를 차례로 확인하고 다음 할 일을 알려 준다
function updateTutorial() {
  const st = STAGE.steps; if (!st || S.over) return; S.tutI = S.tutI || 0;
  while (S.tutI < st.length && st[S.tutI][1](S, S.player, input)) {
    S.tutI++; S.cpWant = true; play('switch', 0.45, 1.5);
    if (S.tutI < st.length) toast('잘했다! 다음: ' + tutText(st[S.tutI][0]), 3.4, 'good'); else toast('연습 끝 — 이제 실제 의뢰로', 3, 'good');
  }
}
function winInit() {
  S.winInit = true; 
  if (STAGE.tutorial) { for (const w of S.windows) w.st = bldAt(w.tx, w.ty) >= 0 ? 'lock' : 'open'; for (const w of S.windows) w.b = bldAt(w.tx, w.ty); return; }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], doorT = new Set(S.doors.map(d => d.tx + ',' + d.ty));
  const keyPts = S.items.filter(i => !i.fl).concat((S.keyItems || []).filter(i => !i.fl)).map(i => [Math.floor(i.x / TILE), Math.floor(i.y / TILE)]);
  const byB = {};
  for (const w of S.windows) {
    const b = bldAt(w.tx, w.ty); w.b = b; if (b < 0) { w.st = 'open'; continue; }
    let inner = null; for (const [dx, dy] of N4) { const x = w.tx + dx, y = w.ty + dy; if (bldAt(x, y) === b && !groundSolidP(x, y)) { inner = [x, y]; break; } }
    if (inner) {  // 창문 안쪽 방(문에서 끊긴다)에 물건·열쇠가 있으면 방범창
      const seen = new Set([inner + '']), q = [inner]; let hit = false, door = false;
      while (q.length && seen.size < 260) { const [x, y] = q.shift(); if (keyPts.some(([kx, ky]) => Math.abs(kx - x) <= 1 && Math.abs(ky - y) <= 1)) hit = true;
        for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (doorT.has(k)) door = true; if (seen.has(k) || bldAt(nx, ny) !== b || doorT.has(k) || groundSolidP(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
      if (hit) w.st = door ? 'bar' : 'lock';  // 문이 없는 방이면 창문이 유일한 길이니 막지 않고 잠가 둔다
    }
    (byB[b] = byB[b] || []).push(w);
  }
  for (const b in byB) { const ws = byB[b].filter(w => !w.st).sort(() => Math.random() - 0.5); ws.forEach((w, i) => { w.st = i === 0 ? 'open' : Math.random() < 0.6 ? 'lock' : 'bar'; }); }
}
const winSt = w => w.st || 'open';
const pickDur = kind => (kind === 'door' ? 3.2 : kind === 'latch' ? 0.7 : 1.6) * (DKEY === 'easy' ? 0.8 : DKEY === 'hard' ? 1.25 : 1);
function startPick(o) { const P = S.player; P.pick = Object.assign({ t: 0, nt: 0.2 }, o, { dur: pickDur(o.kind) }); P.vx = P.vy = 0; P.cover = null; play('metal', 0.18, 1.8); hint('pick', '락픽: 따는 동안 움직이지 마라. 긁는 소리가 조금 난다. 안쪽 창문은 걸쇠만 풀면 된다'); }
function updatePick(P, mag, dt) {
  const K = P.pick; P.moving = false; P.mode = 'sneak'; P.light = lightAt(P.x, P.y, false); P.hidden = false;
  if (mag > 0.25 || P.hurtT > 0.4) { P.pick = null; toast('그만뒀다', 1.2); return; }
  K.t += dt; if ((K.nt -= dt) <= 0) { K.nt = 0.55; play('click', 0.14, 1.6 + Math.random() * 0.4); if (K.kind !== 'latch') noise(K.x, K.y, K.kind === 'door' ? 80 : 55, 'pick'); }
  if (K.t < K.dur) return;
  P.pick = null;
  if (K.kind === 'latch') { K.w.st = 'open'; noteChange('win', K.w); play('cloth', 0.3); toast('걸쇠를 풀었다 — 이 창문은 이제 열려 있다', 2); return; }
  P.picks--; S.stats.picks = (S.stats.picks || 0) + 1; play('switch', 0.5, 1.4);
  if (K.kind === 'win') { K.w.st = 'open'; noteChange('win', K.w); toast(`창문을 땄다 — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
  else { const d = K.d; noteChange('door', d, d.keyLock); d.keyLock = null; setDoor(d, false); toast(`잠금장치를 땄다 — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
}
function drawPickProgress(P) {
  const K = P.pick; if (!K) return; const k = Math.max(1, 0.95 / SCALE), f = Math.min(1, K.t / K.dur), x = P.x, y = P.y - 44 * k;
  ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 13 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(x, y, 13 * k, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  ctx.font = `700 ${Math.round(12 * k)}px "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#f2c46b'; ctx.fillText(K.kind === 'latch' ? '걸쇠' : '락픽', x, y + 4 * k); ctx.textAlign = 'left';
}
const onFacadeW = w => { const b = w.b != null ? w.b : bldAt(w.tx, w.ty); return b >= 0 && BLD[b].facade && w.ty >= BLD[b].y1 - BLD[b].fh + 1; };
// 방범창: 창살
function drawWinBars(w) {
  const vert = winVert(w), L = 40, T = 18;
  ctx.save(); ctx.translate(w.x, w.y + (vert ? 0 : 5)); if (vert) ctx.rotate(Math.PI / 2);
  ctx.strokeStyle = 'rgba(40,44,52,.95)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 8, -T / 2 - 1); ctx.lineTo(i * 8, T / 2 + 1); } ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(170,176,186,.75)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 8 - 1, -T / 2); ctx.lineTo(i * 8 - 1, T / 2); } ctx.stroke();
  ctx.restore();
}
function nearWindow() {
  const P = S.player; if (P.z || P.fl || P.jump || P.carrying || P.captive || P.hide) return null;
  for (const w of S.windows) { if (ACT_SKIP.has(w)) continue;
    if (dist(P.x, P.y, w.x, w.y) > 52) continue;
    const dx = Math.abs(P.x - w.x) > Math.abs(P.y - w.y) ? Math.sign(w.x - P.x) : 0, dy = dx ? 0 : Math.sign(w.y - P.y);
    const ox = w.tx + dx, oy = w.ty + dy;
    if (winSt(w) === 'bar') continue;
    if (!groundSolidP(ox, oy)) return { w, tx: ox, ty: oy };
  }
  return null;
}
function dropSpot() {
  const P = S.player; if (!P.z || P.jump) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  let best = null, bd = 1e9;
  for (const o of N8) {
    const nx = tx + o[0], ny = ty + o[1];
    if (P.z === 1 ? (solidAt(nx, ny) || roofAt(nx, ny)) : lvAt(nx, ny) !== P.z - 1) continue;
    const d = dist(P.x + Math.cos(P.a) * 40, P.y + Math.sin(P.a) * 40, tc(nx), tc(ny));
    if (d < bd) { bd = d; best = [nx, ny]; }
  }
  if (!best || dist(P.x, P.y, tc(best[0]), tc(best[1])) > 72) return null;
  return [best[0], best[1], P.z - 1];
}
function kunaiTarget() {
  const P = S.player; if (P.kunai <= 0 || P.hide || P.under || P.vent || P.carrying || P.captive || P.strikeT > 0 || P.jump) return null;
  const elev = P.z > 0;
  const aimOn = false;
  let best = null, bs = 1e9;
  const consider = (x, y, ref, type, maxD) => {
    if (flOf(ref) !== flOf(P)) return;
    const d = dist(P.x, P.y, x, y); if (d > maxD || d < 20) return;
    const ad = Math.abs(angDiff(P.a, Math.atan2(y - P.y, x - P.x)));
    if (!aimOn && ad > 1.2) return;
    if (elev && roofAt(Math.floor(x / TILE), Math.floor(y / TILE))) return;  // 옥상 위에서 옥상 아래(건물 안)는 못 맞힌다
    if (!los(P.x, P.y, x, y, elev || type === 'lamp')) return;
    const score = aimOn ? dist(input.aim.x, input.aim.y, x, y) : ad * 160 + d * 0.4;
    if (aimOn && score > 70) return;
    if (score < bs) { bs = score; best = { type, ref, x, y }; }
  };
  for (const g of S.guards) if (!g.child && g.state !== 'DEAD' && g.state !== 'CAPTIVE' && (g.state !== 'ALERT' || g.target || radioBusy(g))) consider(g.x, g.y, g, 'guard', 270 * (1 + P.z * 0.2));
  for (const l of S.lamps) if (lampOn(l) && !l.hearth) consider(l.x, l.y, l, 'lamp', 330);
  for (const c of S.cams || []) if (!c.broken) consider(c.x, c.y, c, 'cam', 330);
  return best;
}
function nearCorpse() {
  const P = S.player; if (P.z || P.jump) return null; let best = null, bd = 46;
  for (const c of S.corpses) { if (ACT_SKIP.has(c)) continue; if (c.carried || c.stashed || flOf(c) !== flOf(P)) continue; const d = dist(P.x, P.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function nearLamp() {
  const P = S.player; if (P.z || P.jump || P.hide) return null; let best = null, bd = 48;
  for (const l of S.lamps) { if (ACT_SKIP.has(l)) continue; if (l.broken || l.pole || l.cut != null || !(l.off || lampOn(l)) || flOf(l) !== flOf(P)) continue; const d = dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best;
}
function nearDoor() {
  const P = S.player; if (P.z || P.fl || P.jump || P.hide) return null; let best = null, bd = 58;
  for (const d of S.doors) { if (ACT_SKIP.has(d)) continue; const dd = dist(P.x, P.y, d.x, d.y); if (dd < bd) { bd = dd; best = d; } }
  if (!best) return null;
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  if (best.group.some(d => d.tx === ptx && d.ty === pty)) return null;
  return best;
}
function doorBlocked(d) { return d.group.some(t => S.guards.some(g => g.state !== 'DEAD' && Math.floor(g.x / TILE) === t.tx && Math.floor(g.y / TILE) === t.ty) || S.corpses.some(c => !c.stashed && !c.carried && Math.floor(c.x / TILE) === t.tx && Math.floor(c.y / TILE) === t.ty)); }
function setDoor(d, lock) { d.group.forEach(t => { t.locked = lock; G[t.ty][t.tx] = lock ? 'X' : t.orig; }); }
function nearBushSpot() {
  const P = S.player; if (P.fl) return null; let best = null, bd = 64;
  for (const b of S.bushes) { if (ACT_SKIP.has(b)) continue; const d = dist(P.x, P.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
function nearFuse() { const P = S.player; return !P.z && !P.fl && STAGE.fuse && S.lightsOn && dist(P.x, P.y, tc(STAGE.fuse[0]), tc(STAGE.fuse[1])) < 62; }

function nearVent() {
  const P = S.player; if (P.jump || P.carrying || P.captive || P.hide || P.under || P.fl) return null;
  let best = null, bd = P.vent ? 34 : 42;
  for (const v of S.vents) { if (ACT_SKIP.has(v)) continue; if (!P.vent && v.z !== P.z) continue; const d = dist(P.x, P.y, v.x, v.y); if (d < bd) { bd = d; best = v; } }
  return best;
}
// 환풍구 창살 바로 밑을 지나는 자경대원을 끌어올린다
function ventAmbushTarget() {
  const P = S.player; if (!P.vent) return null;
  const v = S.vents.filter(v => !v.roof && dist(P.x, P.y, v.x, v.y) < 34)[0]; if (!v) return null;
  let best = null, bd = 50;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE'].includes(g.state) || g.elite || g.dog || g.z || g.climb) continue;
    const d = dist(g.x, g.y, v.x, v.y); if (d < bd) { bd = d; best = g; }
  }
  return best ? { g: best, v } : null;
}
// 주 행동 버튼에 무엇이 걸려 있는지
function nearSewerExit() {
  const P = S.player; let best = null, bd = 50;
  for (const h of S.hides) if (h.type === 'well') { const d = dist(P.x, P.y, h.x, h.y); if (d < bd) { bd = d; best = h; } }
  return best;
}
const winUsable = w => !!w.link || S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === w.fl && n.tx === w.tx && n.ty === w.ty));
// 문 행동: 색 잠금 · 한쪽에서만 풀리는 빗장(지름길) · 보통 문
// 숫자판: 비번 문 앞에서 직접 눌러 연다. 틀리면 삑 소리가 퍼진다
function openKeypad(d) {
  const el = document.getElementById('keypad'); if (!el) { if (hasK('code')) { setDoor(d, false); d.group.forEach(t => t.keyLock = false); } return; }
  S.keypad = { d, buf: '', bad: 0 }; el.hidden = false; S.player.vx = 0; S.player.vy = 0; input.aiming = null;
  document.getElementById('kpHint').textContent = hasK('code') ? '메모: 알아낸 비번 ' + STAGE.code : '비번을 모른다 — 엿듣거나 쪽지를 찾아라';
  kpShow(); play('click', 0.3);
}
function kpShow() { const k = S.keypad; if (!k) return; const n = (STAGE.code || '0000').length; document.getElementById('kpDisp').textContent = Array.from({ length: n }, (_, i) => k.buf[i] || '·').join(' '); }
function closeKeypad() { const el = document.getElementById('keypad'); if (el) el.hidden = true; if (S) S.keypad = null; }
// 들킬 듯할 때 짧게 똑딱 — 알아채는 정도가 오를수록 높고 빠르게
function warnTick(m) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = 520 + 760 * m; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1); }
function updateWarn(dt) {
  let m = 0; for (const g of S.guards) if (!g.civ && g.seen && g.state !== 'ALERT' && g.state !== 'DEAD') m = Math.max(m, g.meter || 0);
  if (m < 0.15) { S.warnT = 0; return; }
  if ((S.warnT = (S.warnT || 0) - dt) <= 0) { S.warnT = 0.55 - 0.4 * Math.min(1, m); warnTick(m); }
}
// 시체가 자경대원 눈에 띌 수 있는 자리인가 (누가 그쪽을 보면 보인다)
function updateCorpseRisk(dt) {
  if ((S.crT = (S.crT || 0) - dt) > 0) return; S.crT = 0.3;
  for (const c of S.corpses) {
    c.risk = false; if (c.stashed || c.carried || c.discovered || c.hidden || c.accident) continue;
    for (const g of S.guards) { if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) !== flOf(c) || dist(g.x, g.y, c.x, c.y) > 520) continue;
      const gg = Object.create(g); gg.a = Math.atan2(c.y - g.y, c.x - g.x); if (canSee(gg, c.x, c.y, c.light, false, false, false) > 0) { c.risk = true; break; } }
  }
}
function kpBeep(ok) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = ok ? 1320 : 220; g.gain.setValueAtTime(0.08, t); g.gain.linearRampToValueAtTime(0, t + (ok ? 0.12 : 0.35)); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4); }
function kpPress(v) {
  const k = S && S.keypad; if (!k) return; const n = (STAGE.code || '0000').length;
  if (v === 'x') { closeKeypad(); return; }
  if (v === '<') { k.buf = k.buf.slice(0, -1); kpShow(); play('click', 0.15); return; }
  if (v === 'ok' || (v.length === 1 && k.buf.length + 1 === n && (k.buf += v))) {
    if (v !== 'ok' && v.length === 1) kpShow();
    if (k.buf.length < n) return;
    if (k.buf === STAGE.code) {
      const d = k.d; kpBeep(true); setTimeout(() => { if (!S) return; d.group.forEach(t => t.keyLock = false); setDoor(d, false); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; play('metal', 0.4); toast('비번이 맞았다 — 문이 열렸다', 1.8, 'good'); closeKeypad(); }, 260);
    } else {
      kpBeep(false); k.bad++; noise(k.d.x, k.d.y, 70 + k.bad * 30, 'beep', k.d.fl || 0);
      const el = document.getElementById('kpDisp'); el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
      toast(k.bad >= 2 ? '틀렸다 — 삑 소리가 커진다' : '틀렸다', 1.4, 'warn'); k.buf = ''; setTimeout(kpShow, 350);
    }
    return;
  }
  if (/^[0-9]$/.test(v) && k.buf.length < n) { k.buf += v; play('click', 0.2); kpShow(); }
}
function doorAct(dr) {
  const P = S.player;
  if (dr.gate && dr.locked) {
    const dx = P.x - dr.x, dy = P.y - dr.y, ok = dr.gate === 'n' ? dy < 0 : dr.gate === 's' ? dy > 0 : dr.gate === 'w' ? dx < 0 : dx > 0;
    return ok ? { k: 'door', d: dr, label: '빗장 풀기' } : { k: 'keymsg', d: dr, label: '반대편에 빗장이 걸렸다' };
  }
  if (dr.keyLock === 'code' && dr.locked) return { k: 'keypad', d: dr, label: '비번 입력' };
  if (dr.keyLock && dr.locked && !hasK(dr.keyLock) && P.picks > 0) return { k: 'pick', d: dr, o: { kind: 'door', d: dr, x: dr.x, y: dr.y }, label: `락픽으로 따기 (${keyName(dr.keyLock)} 대신 · ${P.picks}개)` };
  return dr.keyLock && dr.locked ? { k: hasK(dr.keyLock) ? 'door' : 'keymsg', d: dr, label: hasK(dr.keyLock) ? keyName(dr.keyLock) + '로 열기' : '잠김 (' + keyName(dr.keyLock) + ')' + ' — 락픽도 없다' } : { k: 'door', d: dr, label: dr.locked ? '문 열기' : '문 잠그기' };
}
// 암살하려고 다가가는 중에는 Space가 문·비번·조명·두꺼비집·쪽지 같은 다른 행동을 하지 않는다 (그 행동은 Z로 넘긴다)
const RISKY_K = new Set(['door', 'keypad', 'lamp', 'bfuse', 'fuse', 'read', 'keymsg', 'pick']);
const KILL_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'pull', 'ventKill', 'ledgeKill', 'pushOff', 'winJump']);
function stalkGuard() {
  const P = S.player; if (P.z || P.carrying || P.captive || P.hide || P.under || P.vent || P.wire) return null;
  let best = null, bd = 190;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'FLEE' || g.state === 'TERROR' || g.climb || (g.state === 'ALERT' && !radioBusy(g))) continue;
    if (flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd && los(P.x, P.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
// 물체가 겹칠 때: 주 행동 후보를 대상 하나씩 빼 가며 다시 구해 목록을 만들고(최대 4), 고른 것(S.actSel)을 주 행동으로 쓴다
// 바꾸기: Tab · 터치 ⇄ 버튼. 후보 묶음이 바뀌면 처음(가장 우선)으로 돌아간다
const ACT_SKIP = new Set();
const actObj = a => a.g || (a.list && a.list[0]) || a.l || a.d || a.fb || (a.wv && a.wv.w) || a.w || (a.n && a.n.u) || a.n || a.h || a.p || a.c || a.v || (a.o && (a.o.w || a.o.d)) || a.o || a.tp || a.j || a.lv || null;
const _oid = new WeakMap(); let _oidN = 0; const oid = o => { if (!o || typeof o !== 'object') return ''; if (!_oid.has(o)) _oid.set(o, ++_oidN); return _oid.get(o); };
function actionChoices() {
  const out = []; ACT_SKIP.clear(); let pref;
  try { for (let i = 0; i < 4; i++) { const a = primaryActionOne(); if (!i) pref = S.ikPref; if (!a || a.k === 'none') { if (!out.length) out.push(a); break; }
    const o = actObj(a); if (out.length && (!o || ACT_SKIP.has(o) || out.some(x => x.k === a.k && x.label === a.label && actObj(x) === o))) break; out.push(a); if (!o) break; ACT_SKIP.add(o); } } finally { ACT_SKIP.clear(); if (pref !== undefined) S.ikPref = pref; }
  return out;
}
function primaryAction() {
  const L = actionChoices(); if (!S) return L[0];
  if (L.length <= 1) { S.actKey = null; S.actSel = 0; return L[0] || { k: 'none', label: '' }; }
  const key = L.map(a => a.k + oid(actObj(a))).join('|'); if (key !== S.actKey) { S.actKey = key; S.actSel = 0; }
  const i = (S.actSel || 0) % L.length, a = L[i]; a.choices = L.length; a.choiceI = i; a.others = L.filter((x, j) => j !== i); return a;
}
function cycleAction() { if (!S) return; const a = primaryAction(); if (!(a.choices > 1)) return; S.actSel = (S.actSel || 0) + 1; play('click', 0.2); }
function primaryActionOne() {
  const a = primaryActionRaw();
  if (RISKY_K.has(a.k)) { const sg = stalkGuard(); if (sg) return { k: 'none', stalk: sg, held: a, label: koDefault(sg) ? '기절시키기' : '암살' }; }
  const v = a.g || (a.list && a.list[0]) || a.kill || ((a.k === 'execute' || a.k === 'drag') && S.player.captive) || null;
  if (v && koDefault(v) && !v.civ && a.label && /암살|처치/.test(a.label) && !['ledgeKill', 'pushOff'].includes(a.k)) { a.label = a.label.replace('표적 암살', '기절시키기').replace(/암살|처치/, '기절'); a.hold = '처치'; }
  return a;
}
function primaryActionRaw() {
  const P = S.player;
  if (P.trav || P.lunge || P.grabIn || (P.strikeT > 0 && (P.killAnim || P.bodyAnim))) return { k: 'none', label: '…' };
  if (P.under) { const w = nearSewerExit(); return w ? { k: 'surface', w, label: '올라가기' } : { k: 'none', label: '지하' }; }
  if (P.vent) { const t = ventAmbushTarget(); if (t) return { k: 'ventKill', g: t.g, v: t.v, label: '끌어올려 암살' }; const v = nearVent(); return v ? { k: 'ventOut', v, label: v.roof ? '옥상으로 나가기' : v.street ? '거리로 나가기' : '방으로 내려가기' } : { k: 'none', label: '환풍구' }; }
  if (P.hide) { const g = ambushTarget(); return g ? { k: 'ambush', g, label: '끌어들여 암살' } : { k: 'leave', label: '나오기' }; }
  if (P.jump) return { k: 'none', label: '…' };
  if (P.wire) {
    const h = wirePt(P.wire.w, P.wire.s), at = { x: h.x, y: h.y - 6 };
    const g = wireDropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const e = wireEnd(); if (e) return { k: 'wireOff', n: e, at, label: e.roof ? '옥상에 올라서기' : e.win ? `${e.fl + 1}층 창문으로 들어가기` : '전봇대 내려가기' };
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), lv = rLv(ptx, pty);
    if (lv > 0 && lv <= P.z + 1) return { k: 'wireRoof', lv, at, label: '옥상에 내리기' };
    const nr = wireNearRoof(h, P.z); if (nr) return { k: 'wireRoof', lv: nr.lv, to: nr, at, label: '옆 옥상으로 내려서기' };
    if (wireFallOk()) return { k: 'wireFall', at, label: '뛰어내리기' };
    return { k: 'none', label: '전깃줄' };
  }
  if (P.ledge) { const lg = ledgeTarget(); return lg ? { k: 'ledgeKill', g: lg, label: lg.civ ? '끌어내리기' : '끌어내려 떨어뜨리기' } : { k: 'ledgeUp', label: '올라서기' }; }
  if (P.z) {
    const po = pushOffTarget(); if (po) return { k: 'pushOff', g: po, at: po.climb.to, label: '배관에서 밀어 떨어뜨리기' };
    const kz = killList(); if (kz.length) return { k: kz.length === 2 && !kz.some(g => g.civ) ? 'kill2' : 'kill', list: kz.length === 2 && kz.some(g => g.civ) ? kz.slice(0, 1) : kz, label: (dist(P.x, P.y, kz[0].x, kz[0].y) > 56 ? '달려들어 ' : '') + (kz[0].target ? '표적 암살' : '암살') };
    if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }  // 옥탑방 벽에 기대 있을 때
    const tz = nearTrap(); if (tz) return { k: 'trap', tp: tz, label: tz.label };
    const hz = nearHide(); if (hz && !(P.carrying && hz.bodies >= hz.cap)) return P.carrying ? { k: 'stash', label: '넣기' } : { k: 'hide', h: hz, label: `${hideName(hz)}에 숨기` };  // 옥탑방
    const g = dropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const wm = nearWireMount(); if (wm) return { k: 'wireOn', w: wm.w, s: wm.s, at: wm.at, label: wm.mid ? '손 뻗어 전깃줄 잡기' : '전깃줄 타기' };
    // 낮은 옥상(컨테이너 등) 위에서 더 높은 옥상으로 오르는 배관·사다리 — 내려가는 곳과 붙어 있으면 더 가까운 쪽이 먼저(나머지는 F·⇄로)
    const cuz = nearClimb(), cdz = nearClimbDown(); if (cuz && cuz.kind !== 'balc' && cuz.kind !== 'fstair' && (!cdz || dist(P.x, P.y, cuz.x, cuz.y) <= dist(P.x, P.y, cdz.rx != null ? cdz.rx : cdz.ux, cdz.ry != null ? cdz.ry : cdz.uy))) return { k: 'up', l: cuz, label: cuz.kind === 'pipe' ? '배관 오르기' : '오르기' };
    if (cuz && cuz.kind !== 'balc' && cuz.kind !== 'fstair' && !cdz) return { k: 'up', l: cuz, label: cuz.kind === 'pipe' ? '배관 오르기' : '오르기' };
    const cd = cdz; if (cd) return cd.kind === 'chimney' ? (lampOn(cd.lamp) ? { k: 'smother', l: cd, label: '굴뚝 막기 (불 끄기)' } : { k: 'down', l: cd, label: '굴뚝으로 내려가기' }) : { k: 'down', l: cd, label: cd.kind === 'stair' ? '내리기 · 계단' : '내리기' };
    const rv = nearVent(); if (rv) return { k: 'ventIn', v: rv, label: '환풍구로 들어가기' };
    const jt = jumpTarget(); if (jt) return { k: 'leap', j: jt, label: '건너뛰기' };
    const ds = dropSpot(); if (ds) return { k: 'jump', s: ds, label: P.z >= 2 ? '1층 옥상으로' : '뛰어내리기' };
    return { k: 'none', label: '암살' };
  }
  if (P.captive) {
    const h = nearHide();
    if (h && h.bodies < h.cap) return { k: 'drag', h, label: h.type === 'well' ? '맨홀로 끌고 가 처치' : `${hideName(h)}${h.type === 'bed' ? '으로' : '으로'} 끌고 가 처치` };
    const bs = nearBushSpot(); if (bs) return { k: 'drag', h: bs, label: '화단로 끌고 가 처치' };
    return { k: 'execute', label: '처치' };
  }
  if (P.hidden) { const ag = ambushTarget(); if (ag) return { k: 'ambush', g: ag, label: '끌어들여 암살' }; }
  if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }
  const kl = killList();
  if (kl.length === 2 && !kl.some(g => g.civ)) return { k: 'kill2', list: kl, label: '동시 암살' };
  if (kl.length === 2) kl.length = 1;
  if (kl.length === 1) return { k: 'kill', list: kl, label: kl[0].civ ? '기절시키기' : (dist(P.x, P.y, kl[0].x, kl[0].y) > 56 ? '달려들어 ' : '') + (kl[0].target ? '표적 암살' : '암살') };
  const nt = nearNote(); if (nt) return { k: 'read', n: nt, at: { x: nt.x, y: nt.y }, label: nt.read ? '다시 읽기' : '읽기' };
  { const fdE = nearFloorDown(), swE = fdE && fdE.kind !== 'balc' && nearSideWin();  // 내려가는 자리와 옆 건물 창문이 붙어 있으면 더 가까운 쪽 하나만
    if (swE && dist(P.x, P.y, downPt(fdE).x, downPt(fdE).y) <= dist(P.x, P.y, swE.x, swE.y)) return { k: 'fdown', l: fdE, at: downPt(fdE), label: `내리기 · ${fdE.bfl + 1}층` }; }
  const sw = nearSideWin(); if (sw) { const L = sw.link, v = landingVictim(tc(L.tx + L.dir), tc(L.ty), sw.fl); if (v) return { k: 'winJump', w: sw, kill: v, at: { x: v.x, y: v.y }, label: v.civ ? '창문 넘어 기절시키기' : '창문 넘어 암살' }; return { k: 'winJump', w: sw, at: { x: sw.x, y: sw.y }, label: `창문 건너 옆 건물 ${sw.fl + 1}층으로` }; }
  const ww = nearWinWire(); if (ww) return { k: 'wireOn', w: ww.w, s: ww.s, at: ww.at, label: '창밖 전깃줄 타기' };
  const pw = nearPole(); if (pw) return { k: 'wireOn', w: pw.w, s: pw.s, at: pw.at, pole: true, label: '전봇대 올라 전깃줄로' };
  const cu = nearClimb(); if (cu && cu.kind === 'balc') { const v = landingVictim(cu.ux, cu.uy, cu.tfl); if (v) return { k: 'up', l: cu, kill: v, at: { x: cu.x, y: cu.y - 30 }, label: v.civ ? '베란다 넘어 기절시키기' : '베란다 넘어 암살' }; }
  // 계단실: 계단 칸 위에 올라서야 [오르기], 그 앞(올라와 선 자리)은 [내리기] — 나머지는 F·⇄로
  const fd0 = cu && cu.kind !== 'balc' && nearFloorDown(); if (fd0 && fd0.kind !== 'balc' && (stairHole(fd0) ? dist(P.x, P.y, cu.x, cu.y) > 30 : dist(P.x, P.y, downPt(fd0).x, downPt(fd0).y) < dist(P.x, P.y, cu.x, cu.y))) return { k: 'fdown', l: fd0, at: downPt(fd0), label: `내리기 · ${fd0.bfl + 1}층` };
  if (cu) return { k: 'up', l: cu, label: cu.kind === 'balc' ? '베란다 타고 2층으로' : cu.gas ? '가스관 타고 옥상으로' : cu.kind === 'pipe' ? '배관 오르기' : cu.kind === 'fstair' ? `오르기 · ${cu.tfl + 1}층` : cu.kind === 'stair' ? '오르기 · 옥상' : cu.kind === 'chimney' ? '굴뚝으로 오르기' : '오르기' };
  const gv = nearVent(); if (gv) return { k: 'ventIn', v: gv, label: '환풍구로 들어가기' };
  const fd = nearFloorDown(); if (fd) return { k: 'fdown', l: fd, at: fd.kind === 'balc' ? null : downPt(fd), label: fd.kind === 'balc' ? '내리기 · 베란다로' : `내리기 · ${fd.bfl + 1}층` };
  const nw = nearWindow(); if (nw) {
    if (winSt(nw.w) === 'lock') { const inside = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === nw.w.b;
      if (inside) return { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: 'latch', w: nw.w, x: nw.w.x, y: nw.w.y }, label: '창문 걸쇠 풀기' };
      return P.picks > 0 ? { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: 'win', w: nw.w, x: nw.w.x, y: nw.w.y }, label: `잠긴 창문 — 락픽으로 따기 (${P.picks}개)` } : { k: 'keymsg', at: { x: nw.w.x, y: nw.w.y }, label: '잠긴 창문 — 락픽이 없다' }; }
    return { k: 'window', wv: nw, label: '창문 넘기' };
  }
  const h = nearHide();
  if (h && !P.carrying) return { k: 'hide', h, label: '숨기' };
  if (h && P.carrying && h.bodies < h.cap) return { k: 'stash', label: '넣기' };
  const tp = nearTrap(); if (tp) return { k: 'trap', tp, label: tp.label };
  if (nearFuse()) return { k: 'fuse', label: '전체 조명 끄기' };
  // 문과 두꺼비집·조명이 함께 가까우면 더 가까운 쪽
  // 문·두꺼비집·조명이 함께 가까우면: 가까운 쪽, 단 방금 고른 것은 24px 더 멀어질 때까지 유지 (몇 픽셀 차이로 바뀌지 않게). 다른 하나는 Z로
  const dr = nearDoor(), bf = nearBFuse(), lp = nearLamp(), cands = [];
  if (dr && !P.carrying) cands.push({ k: 'door', d: dist(P.x, P.y, dr.x, dr.y), a: () => doorAct(dr) });
  if (bf) cands.push({ k: 'bfuse', d: dist(P.x, P.y, bf.x, bf.y), a: () => ({ k: 'bfuse', fb: bf, label: '두꺼비집 내리기 (이 건물 전등)' }) });
  if (lp) cands.push({ k: 'lamp', d: dist(P.x, P.y, lp.x, lp.y), a: () => ({ k: 'lamp', l: lp, label: lp.hearth ? (lp.off ? '불 피우기' : '아궁이 불 끄기') : lp.off ? '조명 켜기' : '조명 끄기' }) });
  if (cands.length) {
    cands.sort((a, b) => a.d - b.d); let pick = cands[0];
    const pref = cands.find(c => c.k === S.ikPref); if (pref && pref !== pick && pref.d - pick.d < 24) pick = pref;
    S.ikPref = pick.k; const res = pick.a(), other = cands.find(c => c !== pick); if (other) res.alt = other.a();
    return res;
  }
  return { k: 'none', label: '암살' };
}
function actPrimary(force) {
  if (!S || S.over || paused || !running || tactical) return;  // 전술 지도(시간 멈춤) 중에는 행동하지 않는다
  if (DLG.modal) { advanceDialog(); return; }
  const a = force && force.viaZ ? force : primaryAction(), P = S.player;
  // 입력 버퍼: 지금 할 수 있는 게 없으면 잠깐 안에 생기는 행동을 대신 실행 (암살하러 다가가는 중이면 암살만 기다린다)
  if (a.k === 'none') { S.qBuf = a.stalk ? 0.5 : 0.25; S.qKill = !!a.stalk; if (a.stalk) hint('stalk', '사람이 가까우면 [행동]은 기절만 한다. 문·조명·쪽지는 [특수]로'); return; }
  S.qBuf = 0; S.qKill = false; P.vx = 0; P.vy = 0;
  switch (a.k) {
    case 'leave': leaveHide(); break;
    case 'surface': {
      const w = a.w; P.under = false; P.x = w.x; P.y = w.y; P.hide = w; P.hideFrom = null; w.spotted = false; S.hideExitLock = true;
      play('metal', 0.35); S.fade = 0.35; toast('맨홀 아래로 올라왔다 — 아직 숨어 있다', 2); break;
    }
    case 'ambush': {
      const g = a.g, h = P.hide;
      if (h) {
        if (h.bodies < h.cap) { killGuard(g, 'stash', h); toast(h.type === 'well' ? '맨홀 속으로 끌어들였다' : `${hideIn(h)}으로 끌어들였다`, 2, 'good'); }
        else { killGuard(g); toast('끌어들였지만 수거함이 꽉 차 시체가 밖에 남았다', 2.4, 'warn'); }
      } else { killGuard(g, 'bush', P); toast('화단 속으로 끌어들였다', 2, 'good'); }
      S.stats.special++; break;
    }
    case 'window': {
      const v = a.wv;
      P.jump = { x0: P.x, y0: P.y, x1: tc(v.tx), y1: tc(v.ty), t: 0, dur: 0.6, z1: 0, arc: 14, noise: 45, vault: true };
      P.a = Math.atan2(P.jump.y1 - P.y, P.jump.x1 - P.x); play('cloth', 0.4);
      hint('window', '창문은 자경대원이 지나다니지 않는다. 안팎을 몰래 드나드는 길로 써라');
      break;
    }
    case 'drop': {
      const g = a.g; P.z = 0; P.jump = null; P.wire = null; P.x = g.x; P.y = g.y; P.strikeT = 0.4; P.a = g.a;
      play('land', 0.5); killGuard(g); S.stats.special++;
      toast(lastKO() ? '위에서 덮쳐 기절' : '낙하 암살', 1.8, 'good'); collide(P, 13, groundSolidP); break;
    }
    case 'wireOn': {
      const grab = () => { if (P.fl) { P.fl = 0; setLayer(0); S.fade = 0.15; }
        P.wire = { w: a.w, s: a.s }; P.z = Math.max(1, Math.round(a.w.a.z + (a.w.b.z - a.w.a.z) * a.s)); const h = wirePt(a.w, a.s); P.x = h.x; P.y = h.y + 40; };
      play(a.pole ? 'metal' : 'cloth', 0.3); noise(P.x, P.y, a.pole ? 45 : 25, 'climb');
      if (a.pole) {  // 전봇대를 붙잡고 꼭대기까지 기어오른다
        const o = { x: a.at.x, y: a.at.y + 30 }, h = wirePt(a.w, a.s);
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: o.x, y: o.y + 4, f: 0.15 }, { x: h.x, y: h.y + 36, f: 1 }], dur: 0.75, phases: [{ to: 1, pose: 'climb' }], face: -Math.PI / 2, base: { x: o.x, y: o.y }, step: 'metal', loud: 40, end: grab });
        hint('pole', '전봇대: 땅에서 올라 바로 전깃줄로 옮겨 탄다. 전봇대 끝에서 방향키를 밀면 다른 줄로 갈아탄다');
      } else grab();
      break;
    }
    case 'wireOff': wireDismount(a.n); break;
    case 'wireRoof': { P.wire = null; P.z = a.lv; if (a.to) { P.x = a.to.x; P.y = a.to.y; } play('land', 0.3); noise(P.x, P.y, 50 * floorMul(P.x, P.y, 1), 'land'); break; }
    case 'wireFall': {
      const h = wirePt(P.wire.w, P.wire.s); P.wire = null;
      P.jump = { x0: P.x, y0: P.y, x1: P.x, y1: P.y, t: 0, dur: 0.32, z1: 0, arc: 8, noise: 130 };
      play('throw', 0.3); break;
    }
    case 'down': {
      if (a.l && a.l.kind === 'stair') S.stats.roofStair = (S.stats.roofStair || 0) + 1;
      const l = a.l, fin = () => { P.z = l.bz; P.fl = l.bfl || 0; setLayer(P.fl); P.x = l.x; P.y = l.y;
        if (l.kind === 'chimney') { noise(l.ux, l.uy, 70, 'soot'); S.fx.push({ k: 'smoke', x: l.ux, y: l.uy, t: 0 }); toast('굴뚝을 타고 아궁이로 내려왔다 (그을음 소리가 조금 났다)', 2.2); } };
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.3);
      if (l.kind === 'pipe' || l.kind === 'ladder') {  // 배관·사다리를 붙잡고 한 칸씩 내려간다
        const top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy }, lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y + 18, f: 0.14 }, { x: l.x, y: l.y, f: 1 }], dur: 0.4 + lv * 0.36, phases: [{ to: 0.14, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'metal', loud: 45, end: fin });
      } else startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 1 }], dur: 0.45, phases: [{ to: 1, pose: 'walk' }], end: () => { fin(); S.fade = 0.12; } });
      break;
    }
    case 'read': readNote(a.n); break;
    case 'winJump': {
      const w = a.w, L = w.link, tx = tc(L.tx + L.dir), ty = tc(L.ty);
      P.jump = { x0: P.x, y0: P.y, x1: a.kill ? a.kill.x - L.dir * 26 : tx, y1: a.kill ? a.kill.y : ty, t: 0, dur: 0.62, z1: 0, arc: 22, noise: a.kill ? 20 : 45, killG: a.kill || null, vault: true };
      P.a = L.dir > 0 ? 0 : Math.PI; play('throw', 0.3); play('cloth', 0.3);
      hint('winJump', '창문 건너기: 붙어 있는 빌라는 같은 층 옆 창문끼리 건너뛴다. 착지 소리가 조금 난다');
      break;
    }
    case 'fdown': { const l = a.l;
      if (l.kind === 'balc') {  // 난간을 넘어 밖으로 나가 기둥을 타고 내려간다
        P.fl = 0; setLayer(0); S.fade = 0.12; play('cloth', 0.35);
        startTrav({ pts: [{ x: l.ux, y: l.uy - 10, f: 0 }, { x: l.ux, y: l.uy + 24, f: 0.28 }, { x: l.x, y: l.y, f: 1 }], dur: 1.0, phases: [{ to: 0.28, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'cloth', loud: 40,
          end: () => { P.z = 0; P.x = l.x; P.y = l.y; P.a = Math.PI / 2; noise(l.x, l.y, 45, 'climb'); } });
        break;
      }
      const ho = stairHole(l);
      // 구멍 바닥 쪽 끝(c2)으로 들어서 깊은 쪽(c1)으로 내려간 뒤, 아래층 계단 들어서는 칸(e)에 선다
      startTrav({ pts: ho ? [{ x: P.x, y: P.y, f: 0 }, { x: ho.c2.x, y: ho.c2.y, f: 0.45 }, { x: ho.c1.x, y: ho.c1.y, f: 1 }] : [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y + 8, f: 1 }], dur: ho ? 0.6 : 0.4, phases: [{ to: 1, pose: 'walk' }],
        end: () => { P.fl = l.bfl; setLayer(P.fl); const [dx, dy] = stairDir(l.tx, l.ty), ex = l.tx + dx, ey = l.ty + dy;
          if (!solidAt(ex, ey)) { P.x = tc(ex); P.y = tc(ey); P.a = Math.atan2(dy, dx); } else { P.x = l.x; P.y = l.y; } play('step_w0', 0.3); S.fade = 0.15; } });
      break; }
    case 'up': {
      const l = a.l, top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
      if (l.kind === 'balc') {  // 베란다: 난간까지 기어올라 넘어 들어간다
        const v = a.kill && a.kill.state !== 'DEAD' ? a.kill : null;
        play('cloth', 0.35); noise(l.x, l.y, v ? 30 : 55, 'climb');
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.12 }, { x: l.ux, y: l.uy + 26, f: 0.72 }, { x: l.ux, y: l.uy, f: 1 }], dur: 1.05, phases: [{ to: 0.72, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: 'cloth',
          end: () => { P.fl = 1; setLayer(1); P.x = l.ux; P.y = l.uy; P.a = -Math.PI / 2; S.fade = 0.12;
            if (v && v.state !== 'DEAD') { const g = v; P.x = g.x; P.y = g.y + 22; collide(P, 13, groundSolidP); P.strikeT = 0.35; P.a = Math.atan2(g.y - P.y, g.x - P.x); killGuard(g); if (!g.civ) { S.stats.special++; toast(lastKO() ? '베란다 넘어 기절' : '베란다 넘어 암살', 1.8, 'good'); } }
            else toast('베란다 난간을 타고 2층으로 들어왔다', 1.8); } });
        break;
      }
      if (l.kind === 'fstair') {  // 실내 계단: 계단 칸으로 걸어 올라간다
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y - 8, f: 1 }], dur: 0.42, phases: [{ to: 1, pose: 'walk' }],
          end: () => { P.fl = l.tfl; setLayer(P.fl); const ho = stairHole(l);  // 위층: 구멍(아래층에서 올라오는 계단) 바닥 쪽 끝 옆에 올라선다
            const at = ho ? [ho.top, ho.e].find(c => !solidAt(c.tx, c.ty)) : null; if (at) { P.x = tc(at.tx); P.y = tc(at.ty); P.a = Math.atan2(ho.d[1], ho.d[0]); } else { P.x = l.x; P.y = l.y; } play('step_w1', 0.3); S.fade = 0.15; hint('floors', '위층: 같은 계단으로 오르내린다. 위층은 밖에서 안 보인다'); } });
        break;
      }
      const climb = l.kind === 'pipe' || l.kind === 'chimney' || l.kind === 'ladder', lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.35); if (l.kind === 'chimney') noise(l.ux, l.uy, 60, 'soot');
      startTrav(climb ? { pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.1 }, { x: top.x, y: top.y + 18, f: 0.86 }, { x: top.x, y: top.y, f: 1 }], dur: 0.45 + lv * 0.42, phases: [{ to: 0.86, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: l.kind === 'pipe' ? 'metal' : 'cloth', loud: l.kind === 'pipe' ? 45 : 30 }
        : { pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y, f: 1 }], dur: 0.5, phases: [{ to: 1, pose: 'walk' }] },
        { end: null });
      P.trav.end = () => { P.fl = 0; setLayer(0); P.z = l.tz; P.x = top.x; P.y = top.y; };
      break;
    }
    case 'smother': {
      const l = a.l.lamp; l.off = true; play('cloth', 0.45); noise(l.x, l.y, 130, 'smoke');
      S.fx.push({ k: 'smoke', x: a.l.ux, y: a.l.uy, t: 0 });
      for (const c of S.corpses) c.light = lightAt(c.x, c.y);
      toast('굴뚝을 막았다 — 연기가 방에 차며 불이 꺼졌다. 안의 자경대원이 다시 불을 피우러 온다', 3, 'good');
      break;
    }
    case 'ventIn': { S.stats.vents = (S.stats.vents || 0) + 1;
      const v = a.v; P.vent = true; P.z = 0; P.x = v.x; P.y = v.y; v.open = !v.roof; play('metal', 0.3); noise(v.x, v.y, 40, 'vent'); S.fade = 0.3;
      toast('환풍구로 들어갔다', 1.6); break;
    }
    case 'ventOut': {
      const v = a.v; P.vent = false; P.z = v.z; P.x = v.x; P.y = v.y; v.open = !v.roof; play('metal', 0.3); noise(v.x, v.y, 40, 'vent'); S.fade = 0.25;
      if (!v.roof && v.z === 0) { const tx = v.tx, ty = v.ty; if (groundSolidP(tx, ty)) { const o = N8.find(o => !groundSolidP(tx + o[0], ty + o[1])); if (o) { P.x = tc(tx + o[0]); P.y = tc(ty + o[1]); } } }
      hint('ventOpen', '열어 둔 창살은 지나가던 자경대원이 보면 의심한다');
      break;
    }
    case 'ventKill': {
      const g = a.g; killGuard(g, 'stash', { bodies: 0 }); a.v.open = true; P.strikeT = 0.3; S.stats.special++;
      toast('창살 밑의 자경대원을 환풍구로 끌어올렸다', 2.2, 'good'); break;
    }
    case 'leap': case 'jump': {
      const t = a.k === 'leap' ? [a.j.tx, a.j.ty, a.j.z] : a.s;
      P.jump = { x0: P.x, y0: P.y, x1: tc(t[0]), y1: tc(t[1]), t: 0, dur: a.k === 'leap' ? 0.42 : 0.3, z1: t[2], arc: a.k === 'leap' ? 26 : 10 };
      P.a = Math.atan2(P.jump.y1 - P.y, P.jump.x1 - P.x); play('throw', 0.35);
      break;
    }
    case 'ledgeKill': {
      const g = a.g, n = P.ledge, from = { x: g.x, y: g.y }, to = groundBelow(P.x, P.y, n) || groundBelow(g.x, g.y, n) || { x: P.x + n.x * 60, y: P.y + n.y * 60 };
      P.strikeT = 0.3; play('cloth', 0.5); fallKill(g, from, to); toast('가장자리에서 끌어내렸다 — 추락사로 보인다', 2, 'good');
      break;
    }
    case 'ledgeUp': { const n0 = P.ledge, d = ledgeDraw(P); P.ledge = null; play('cloth', 0.3); startTrav({ pts: [{ x: d.x, y: d.y, f: 0 }, { x: P.x - n0.x * 6, y: P.y - n0.y * 6, f: 1 }], dur: 0.38, phases: [{ to: 1, pose: 'vault' }], face: Math.atan2(-n0.y, -n0.x) }); break; }
    case 'pushOff': {
      const g = a.g, c = g.climb; P.strikeT = 0.3; P.a = Math.atan2(g.y - P.y, g.x - P.x); play('metal', 0.5);
      fallKill(g, { x: g.x, y: g.y }, { x: c.from.x, y: c.from.y + 6 }); toast('배관에서 밀어 떨어뜨렸다 — 추락사로 보인다', 2, 'good');
      break;
    }
    case 'pull': {
      const g = a.g, n = P.cover || { x: 0, y: 0 };
      g.doomed = true; g.moving = false; g.path = null;
      const pd = dist(P.x, P.y, g.x, g.y), k = Math.min(0.35, 30 / Math.max(1, pd)); S.pull = { g, x0: g.x, y0: g.y, x1: P.x + (g.x - P.x) * k + n.x * 4, y1: P.y + (g.y - P.y) * k + n.y * 4, t: 0, dur: 0.16 + pd / 900 };
      P.a = Math.atan2(g.y - P.y, g.x - P.x); P.strikeT = 0.34; play('cloth', 0.55);
      break;
    }
    case 'kill': case 'kill2': {
      const g0 = a.list[0], d0 = dist(P.x, P.y, g0.x, g0.y);
      P.a = Math.atan2(g0.y - P.y, g0.x - P.x);
      if (d0 > 40) {  // 달려들기: 짧게 돌진해 등 뒤에 붙은 뒤 처치
        const ux = (g0.x - P.x) / d0, uy = (g0.y - P.y) / d0;
        a.list.forEach(g => { g.doomed = true; g.moving = false; });
        P.lunge = { x0: P.x, y0: P.y, x1: g0.x - ux * 26, y1: g0.y - uy * 26, t: 0, dur: 0.12 + d0 / 480, list: a.list, two: a.k === 'kill2' };
        play('cloth', 0.35); break;
      }
      strikeKill(a.list, a.k === 'kill2');
      break;
    }
    case 'fuse': cutLights(); break;
    case 'trap': fireTrap(a.tp); break;
    case 'bfuse': { bldPower(a.fb, false); play('fuse', 0.5); noise(a.fb.x, a.fb.y, 60, 'switch'); const B = BLD[a.fb.b]; toast(`${B.plate || B.name || '건물'} 전등이 모두 꺼졌다 — 곧 누가 두꺼비집을 올리러 온다`, 3); hint('bfuse', '두꺼비집: 건물 전등을 모두 끈다. 누군가 직접 와서 올려야 켜진다'); break; }
    case 'lamp': {
      const l = a.l; l.off = !l.off; play('switch', 0.45); noise(l.x, l.y, 25, 'switch');
      for (const c of S.corpses) c.light = lightAt(c.x, c.y);
      if (l.off) hint('lampHand', '손으로 끈 조명은 지나가던 자경대원이 다시 켠다. 영영 끄려면 다트로 깨라');
      break;
    }
    case 'keypad': openKeypad(a.d); break;
    case 'pick': startPick(a.o); break;
    case 'keymsg': if (!a.d) { toast(a.label, 1.8); break; } if (a.d.gate) { toast('반대편에서 빗장을 걸어 둔 쪽문이다. 안쪽으로 돌아 들어가 풀면 지름길이 된다', 2.6); break; } toast((a.d.keyLock === 'gold' && STAGE.keyHint) || '잠긴 문이다. ' + keyName(a.d.keyLock) + '이(가) 필요하다 — 아니면 창문·옥상·환풍구', 2.4); break;
    case 'door': {
      const d = a.d; if (d.gate && d.locked) { d.gate = null; toast('빗장을 풀었다 — 지름길이 열렸다', 2, 'good'); S.stats.gates = (S.stats.gates || 0) + 1; }
      if (d.keyLock && d.locked) { const kn = keyName(d.keyLock); noteChange('door', d, d.keyLock); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; d.group.forEach(t => t.keyLock = false); toast(kn + '로 문을 열었다', 1.8, 'good'); }
      if (!d.locked && doorBlocked(d)) { toast('문 앞에 무언가 있어 잠글 수 없다', 1.6); break; }
      setDoor(d, !d.locked); play(d.locked ? 'metal' : 'cloth', 0.45); noise(d.x, d.y, 35, 'door');
      for (const g of S.guards) if (g.path) g.path = null;
      if (d.locked) hint('lock', '잠긴 문은 자경대원이 돌아서 간다. 쫓기거나 수색 중인 자경대원은 문을 부순다');
      break;
    }
    case 'execute': execCaptive(); break;
    case 'drag': {
      const g = P.captive, h = a.h; P.captive = null; S.stats.special++;
      if (h.type === 'bush') { P.x = h.x; P.y = h.y; killGuard(g, 'bush', h, true); toast(lastKO() ? '화단 속으로 끌고 들어가 기절시켰다' : '화단 속으로 끌고 들어가 처치했다', 2, 'good'); }
      else { killGuard(g, 'stash', h, true); enterHide(h, true); const w = lastKO() ? '기절시켰다' : '처치했다'; toast(h.type === 'well' ? '맨홀 속으로 끌고 들어가 ' + w : `${hideIn(h)}으로 끌고 들어가 ${w}`, 2.2, 'good'); }
      break;
    }
    case 'hide': enterHide(a.h); break;
    case 'stash': actCarry(); break;
  }
}
// 붙잡기: 바로 붙지 않는다. 등 뒤로 몇 걸음 달려 붙고(run) → 팔로 목을 감아 끌어당긴다(clinch) → 그 뒤에 끌고 다닌다
const DRAG_SPD = 0.4, GRAB_CLINCH = 0.36;
function grab(g) {
  const P = S.player, d = Math.max(1, dist(P.x, P.y, g.x, g.y)), ux = (g.x - P.x) / d, uy = (g.y - P.y) / d;
  g.doomed = true; g.moving = false; g.path = null; P.a = Math.atan2(uy, ux); P.vx = P.vy = 0;
  const run = Math.max(0, d - 26) / 300;
  P.grabIn = { g, t: 0, run, dur: run + GRAB_CLINCH, x0: P.x, y0: P.y, x1: g.x - ux * 26, y1: g.y - uy * 26 };
  play('cloth', 0.4);
}
function updateGrabIn(P, dt) {
  const G = P.grabIn, g = G.g; G.t += dt;
  const f = G.run > 0 ? Math.min(1, G.t / G.run) : 1, e = 1 - (1 - f) * (1 - f);
  P.x = G.x0 + (G.x1 - G.x0) * e; P.y = G.y0 + (G.y1 - G.y0) * e; P.vx = P.vy = 0; P.moving = f < 1; P.mode = 'run';
  if (f >= 1 && g.state !== 'CAPTIVE') {  // 손이 닿는 순간: 붙잡힌 상태가 된다 (이때부터 버둥거림·소리)
    if (g.state === 'DEAD') { P.grabIn = null; return; }
    g.doomed = false; g.state = 'CAPTIVE'; g.captT = 0; g.squirm = 1; g.seen = false; g.icon = null; g.path = null; g.a = P.a;
    if (S.fuseGuard === g) S.fuseGuard = null;
    play('cloth', 0.55); play('thud', 0.3);
  }
  if (G.t >= G.dur) {
    P.grabIn = null; P.moving = false; collide(P, P.z ? 10 : 13, solidFor(P.z || 0));
    if (g.state !== 'CAPTIVE') return;
    P.captive = g;
    hint('grab', '붙잡음: 화단·수거함·맨홀 옆에서 [끌고 가 처치]. 9초 넘으면 빠져나간다');
  }
}
// 숨기: 바로 사라지지 않는다. 쓰레기통 = 다가가 테를 짚고 몸을 넘겨 안으로 가라앉음 · 화단 = 웅크려 파고듦 · 맨홀 = 가장자리에서 사다리로 내려감
function enterHide(b, quick) {
  const P = S.player;
  if (!quick && usePR('ninja') && PR.anims.vault && PR.anims.climb && !P.carrying && !P.captive) {
    const d = dist(P.x, P.y, b.x, b.y), a = Math.atan2(b.y - P.y, b.x - P.x); P.a = a; P.cover = null; play('cloth', 0.3);
    const fin = () => enterHideNow(b, false, true);
    if (b.type === 'box') {
      const ex = b.x - Math.cos(a) * 24, ey = b.y - Math.sin(a) * 24;
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: ex, y: ey, f: 0.28 }, { x: b.x, y: b.y - 4, f: 0.66 }, { x: b.x, y: b.y, f: 1 }], dur: 0.8 + d / 700, phases: [{ to: 0.28, pose: 'walk' }, { to: 0.66, pose: 'vault' }, { to: 1, pose: 'sink' }], face: a, rim: b.y + 2, hideB: b, end: () => { play('metal', 0.25); fin(); } });
    } else if (b.type === 'well') {
      const ex = b.x - Math.cos(a) * 20, ey = b.y - Math.sin(a) * 20;
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: ex, y: ey, f: 0.3 }, { x: b.x, y: b.y, f: 0.45 }, { x: b.x, y: b.y + 6, f: 1 }], dur: 0.9 + d / 700, phases: [{ to: 0.3, pose: 'walk' }, { to: 1, pose: 'climbDown' }], face: -Math.PI / 2, rim: b.y + 4, hideB: b, end: () => { play('metal', 0.3); fin(); } });
    } else {
      S.bushShake = { x: b.x, y: b.y, t: S.t };
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: b.x, y: b.y, f: 0.55 }, { x: b.x, y: b.y + 2, f: 1 }], dur: 0.55 + d / 700, phases: [{ to: 0.55, pose: 'walk' }, { to: 1, pose: 'sinkBush' }], face: a, rim: b.y + 14, hideB: b, end: () => { S.bushShake = { x: b.x, y: b.y, t: S.t }; fin(); } });
    }
    return;
  }
  enterHideNow(b, quick);
}
function enterHideNow(b, quick, keepFrom) {
  const P = S.player;
  b.spotted = S.guards.some(g => g.seen && g.state !== 'DEAD' && g.state !== 'CAPTIVE');
  P.hide = b; P.hideFrom = keepFrom && P.hideFrom ? P.hideFrom : { x: P.x, y: P.y }; P.x = b.x; P.y = b.y; S.hideExitLock = true; 
  play('cloth', 0.4); play('drop', 0.15);
  const where = hideIn(b);
  toast(b.spotted ? '숨는 모습을 들켰을지도 모른다…' : `${where}에 숨었다`, 2.2, b.spotted ? 'warn' : '');
}
// dir 가 있으면 그 방향에 가장 가까운 빈 칸으로 나온다 (조이스틱 방향 탈출)
function leaveHide(dir) {
  const P = S.player, b = P.hide; if (!b) return;
  b.spotted = false; P.hide = null;
  if (!dir) dir = b.type === 'well' || !P.hideFrom ? { x: Math.cos(P.a), y: Math.sin(P.a) } : { x: P.hideFrom.x - b.x, y: P.hideFrom.y - b.y };
  const dl = Math.hypot(dir.x, dir.y) || 1;
  let best = null, bs = -9;
  for (const o of N8) {
    const sol = b.z ? solidFor(b.z) : groundSolidP, tx = b.tx + o[0], ty = b.ty + o[1]; if (sol(tx, ty)) continue;
    if (o[0] && o[1] && (sol(b.tx + o[0], b.ty) && sol(b.tx, b.ty + o[1]))) continue;
    const sc = (o[0] * dir.x + o[1] * dir.y) / (Math.hypot(o[0], o[1]) * dl);
    if (sc > bs) { bs = sc; best = [tx, ty]; }
  }
  if (!best) { const sol = b.z ? solidFor(b.z) : groundSolidP; let bd = 1e9; for (let r = 1; r <= 3 && !best; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) { const tx = b.tx + ox, ty = b.ty + oy; if (Math.max(Math.abs(ox), Math.abs(oy)) !== r || sol(tx, ty)) continue; const dd = Math.hypot(ox - dir.x, oy - dir.y); if (dd < bd) { bd = dd; best = [tx, ty]; } } }  // 두 칸짜리 침대 등: 이웃이 다 막혔으면 조금 더 멀리
  if (best) {
    const tx = tc(best[0]), ty = tc(best[1]); P.a = Math.atan2(best[1] - b.ty, best[0] - b.tx);
    if (usePR('ninja') && PR.anims.vault && !b.z) {
      if (b.type === 'box') { P.x = b.x; P.y = b.y; P.jump = { x0: b.x, y0: b.y - 4, x1: tx, y1: ty, t: 0, dur: 0.45, z1: 0, arc: 16, noise: 30, vault: true }; play('metal', 0.2); }
      else if (b.type === 'well') { P.x = b.x; P.y = b.y + 6; startTrav({ pts: [{ x: b.x, y: b.y + 6, f: 0 }, { x: b.x, y: b.y, f: 0.6 }, { x: tx, y: ty, f: 1 }], dur: 0.8, phases: [{ to: 0.6, pose: 'climbUp' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, rim: b.y + 4 }); }
      else { S.bushShake = { x: b.x, y: b.y, t: S.t }; P.x = b.x; P.y = b.y; startTrav({ pts: [{ x: b.x, y: b.y, f: 0 }, { x: tx, y: ty, f: 1 }], dur: 0.35, phases: [{ to: 1, pose: 'walk' }] }); }
    } else { P.x = tx; P.y = ty; }
  }
  play('cloth', 0.35);
}
function travelTunnel() {
  const P = S.player; const w = P.hide; if (!w || w.type !== 'well' || !ugAt(w.tx, w.ty)) return;
  if (P.carrying || P.captive) return;
  w.spotted = false; P.hide = null; P.under = true; P.x = w.x; P.y = w.y;
  play('metal', 0.35); play('cloth', 0.3); S.fade = 0.4;
  toast('지하 수로로 내려왔다', 1.8);
}
// 제압 규칙 (메탈기어·코만도스식 손맛 + 히트맨식 동네): 조직원·자경대원은 [행동] = 암살(감점 없음), 붙잡은 뒤 [특수] = 기절.
// 주민은 늘 기절이 기본이고, 행동 버튼을 계속 누르고 있으면 숨을 끊는다(주민 살상 — 감점)
const actHeld = () => !!(S && S.keys && (S.keys.Space || S.keys.KeyQ)) || !!(document.getElementById('btnAct') && document.getElementById('btnAct').classList.contains('down'));
const koDefault = g => !!g && !g.dog && !g.target && !!g.civ;
const KO_HOLD = 0.5;
function koPerson(g, mode, where) {
  if (g.child) return;  // 안전장치: 아이는 어떤 경로로도 다치지 않는다
  logEv('ko', g.x, g.y);
  g.state = 'DEAD'; g.icon = null; g.path = null; g.doomed = false; g.say = null; play('thud', 0.45); play('cloth', 0.4);
  const c = { fl: flOf(g), ch: charOf(g), ko: true, g, tag: g.tag, outfit: outfitOf(g), x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), t0: S.t };
  S.corpses.push(c); S.stats.ko = (S.stats.ko || 0) + 1;
  if (mode === 'stash') { c.stashed = true; where.bodies++; S.stats.stashed++; }
  else if (mode === 'bush') { c.x = where.x + rnd(-6, 6); c.y = where.y + rnd(-6, 6); c.hidden = true; S.stats.stashed++; }
  noise(g.x, g.y, 30, 'ko', flOf(g));
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; giveKey(k, '기절한 ' + (g.civ ? '사람' : '자경대원') + '에게서 ' + keyName(k) + '을(를) 챙겼다'); }
  S.koHold = actHeld() ? { c, g, t0: S.t } : null;
  toast(g.civ ? '기절시켰다 — 주민은 죽이지 않는다. 남의 눈에 띄면 시체처럼 소란이 난다' : '기절시켰다 — 다른 조직원이 보면 깨워서 수색한다', 2.4);
  hint('ko', g.civ ? '주민은 기절시킨다(감점 없음). 길게 누르면 숨을 끊는다 — 감점' : '붙잡은 뒤 [특수]는 기절, [행동]은 처치');
}
// 누른 채로 있으면 기절 → 처치로 바뀐다
function updateKoHold() {
  const h = S.koHold; if (!h) return;
  if (!actHeld() || h.c.stashed && !h.c.ko) { S.koHold = null; return; }
  if (S.t - h.t0 < KO_HOLD) return;
  S.koHold = null; const c = h.c, g = h.g; if (!c.ko) return;
  c.ko = false; c.g = null; S.stats.ko--; S.stats.kills++; if (!g.target && g.civ) S.stats.extraKills++; else if (!g.target) S.stats.crewKills = (S.stats.crewKills || 0) + 1; logEv('kill', c.x, c.y);
  play(Math.random() < 0.5 ? 'kill' : 'kill2', 0.45); S.shakeT = 0.12; noise(c.x, c.y, 40, 'kill', c.fl);
  toast(g.civ ? '숨을 끊었다 — 주민 살상 (감점)' : '숨을 끊었다', 1.8, g.civ ? 'warn' : 'good');
}
// 기절한 사람이 발견되면 깨어나 함께 수색한다
function wakeKO(c, by) {
  const g = c.g, i = S.corpses.indexOf(c); if (!g || i < 0) return; S.corpses.splice(i, 1);
  g.x = c.x; g.y = c.y; g.fl = c.fl; g.z = 0; g.a = c.a; g.meter = 0.6; g.path = null; g.icon = null; g.woke = true;
  if (g.civ) { g.state = 'PATROL'; gsay(g, '으… 머리야. 누가 뒤에서…'); return; }
  g.state = 'SEARCH'; g.poi = { x: c.x + rnd(-40, 40), y: c.y + rnd(-40, 40) }; g.reached = false; g.waitBase = 4; setIcon(g, '?');
  gsay(g, ['누가 뒤에서 쳤어! 이 근처에 있다!', '으윽… 어떤 놈이 목을…', '정신 차려 보니 바닥이야. 찾아!'][g.id % 3], 3);
}
// 연속 처치: 8초 안에 조직원을 또 처치하면 손맛 표시 (메탈기어·코만도스식 소탕의 리듬)
function killStreak() {
  const k = S.streak && S.t - S.streak.t < 8 ? S.streak.n + 1 : 1; S.streak = { n: k, t: S.t }; S.stats.maxStreak = Math.max(S.stats.maxStreak || 0, k);
  if (k >= 2) { toast(k + '연속 처치', 1.4, 'good'); play('click', 0.35, 0.8 + k * 0.1); } if (k === 3) bossRadio('streak');
}
const lastKO = () => { const c = S.corpses[S.corpses.length - 1]; return !!(c && c.ko); };
function strikeKill(list, two) {
  const P = S.player; P.strikeT = 0.32; S.crimeT = S.t;
  // 혼자인 사람: 두 사람 동작으로 처치 — 칼(다가섬 → 입 막고 찌름 → 무릎 꺾임 → 내려놓음) / 목 조르기(번갈아, 주민은 늘 조르기로 기절)
  const g0 = list[0], pairK = !two && PAIR() && PR.anims.stab && !g0.dog && usePR(charOf(g0)) && usePR('ninja');
  const kind = pairK ? (g0.civ || koDefault(g0) || S.stats.kills % 2 === 1 ? 'choke' : 'stab') : null;
  if (pairK) P.a = g0.a;
  list.forEach(g => {
    g.doomed = false;
    if (pairK) pairKill(g, kind, 0); else killGuard(g);
  });
  S.hitStop = 0.07;
  if (two) { S.stats.special++; toast(lastKO() ? '동시 기절' : '동시 암살', 1.8, 'good'); }
}
// 두 사람 동작으로 처치: 다가섬 → 입·목을 감음 → 버둥거리다 힘이 빠짐 → 무릎이 꺾임 → 내려놓음. 쓰러진 몸은 동작이 끝난 뒤에 보인다
// from = 1 이면 이미 목을 감고 있는 상태(붙잡은 사람)에서 이어서 시작한다
const KILL_DUR = { stab: 0.95, choke: 1.15 };
function pairKill(g, kind, from, quiet) {
  const P = S.player, dur = KILL_DUR[kind] * (from ? 0.8 : 1);
  P.strikeT = dur; P.killAnim = { ch: charOf(g), t0: S.t, kind, dur, from }; P.riseT = S.t + dur + 0.22;
  { const S0 = S; setTimeout(() => { if (S === S0 && !S.over) { play('thud', 0.32); S.shakeT = Math.max(S.shakeT || 0, 0.08); } }, dur * 0.82 * 1000); }  // 무릎이 꺾여 내려놓는 순간
  const nd = S.decals.length, nf = S.fx.length, nc = S.corpses.length; killGuard(g, null, null, quiet); S.fx.length = nf; if (kind === 'choke') S.decals.length = nd;
  const c = S.corpses.length > nc ? S.corpses[S.corpses.length - 1] : null;
  if (c) { const fx = P.x + Math.cos(P.a) * 24, fy = P.y + Math.sin(P.a) * 24, ok = !solidAt(Math.floor(fx / TILE), Math.floor(fy / TILE));
    c.x = ok ? fx : P.x; c.y = ok ? fy : P.y; c.a = P.a; c.hideT = S.t + dur; c.t0 = S.t + dur; c.f0 = 4; c.light = lightAt(c.x, c.y);
    if (kind === 'stab' && S.decals.length > nd) { const d = S.decals[S.decals.length - 1]; d.x = c.x + rnd(-5, 5); d.y = c.y + rnd(-5, 5); } }
}
// 붙잡은 사람 처치: 목을 감은 자세에서 그대로 조여(또는 찔러) 내려놓는다
function execCaptive(ko) {
  const P = S.player, g = P.captive; if (!g) return; P.captive = null; S.stats.special++;
  if (solidAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) { g.x = P.x; g.y = P.y; }
  if (ko && !g.target) S.koNext = true;  // 붙잡은 뒤 [특수]: 목을 졸라 기절
  if (PAIR() && PR.anims.choke && !g.dog && usePR(charOf(g)) && usePR('ninja')) { S.crimeT = S.t; pairKill(g, g.civ || koDefault(g) || S.koNext ? 'choke' : 'stab', 1, true); return; }
  P.strikeT = 0.3; killGuard(g, null, null, true);
}
const logEv = (k, x, y) => { (S.events = S.events || []).push({ k, x, y, t: S.t }); };
function killGuard(g, mode, where, quiet) {
  if (g.child) return;
  if (S.koNext || g.civ || (koDefault(g) && !S.lethalNext)) { S.lethalNext = false; S.koNext = false; return koPerson(g, mode, where); }
  S.lethalNext = false;
  logEv(g.target ? 'target' : 'kill', g.x, g.y);
  g.state = 'DEAD'; g.icon = null;
  play(Math.random() < 0.5 ? 'kill' : 'kill2', quiet ? 0.45 : 0.7); setTimeout(() => play('thud', 0.45), 180); S.shakeT = quiet ? 0.12 : 0.18;  // 처치 손맛: 짧은 화면 흔들림
  S.stats.kills++; if (!g.target && g.civ) S.stats.extraKills++; if (!g.target && !g.civ && !g.dog) { S.stats.crewKills = (S.stats.crewKills || 0) + 1; killStreak(); if (S.stats.crewKills === 1) bossRadio('first'); }
  if (g.target) bossRadio('target', true); else if (g.civ) bossRadio('civ', true);
  S.fx.push({ k: 'slash', x: g.x, y: g.y, t: 0 });
  const c = { fl: flOf(g), ch: charOf(g), tag: g.tag, outfit: outfitOf(g), dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, t0: S.t };
  S.corpses.push(c);
  const intoWell = mode === 'stash';
  if (mode === 'stash') { c.stashed = true; where.bodies++; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else if (mode === 'bush') { c.x = where.x + rnd(-6, 6); c.y = where.y + rnd(-6, 6); c.hidden = true; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else { S.decals.push({ x: g.x + rnd(-6, 6), y: g.y + rnd(-6, 6), r: rnd(14, 19), rot: rnd(0, TAU), fl: flOf(g) }); noise(g.x, g.y, 60, 'kill', flOf(g)); }
  S.flash = 0.25;
  if (g.target) {
    if (S.player.disguise && !S.player.disguiseBlown) S.stats.disguiseKill = true;
    const left = S.guards.filter(o => o.target && o.state !== 'DEAD').length;
    toast(left ? `표적 제거 — 남은 표적 ${left}` : '표적 제거', 3, 'good'); if (left) bark('hero', 'kill');
  } else if (!mode) hint('body', '시체가 발견되면 경보가 울린다. [운반]해서 화단·수거함·맨홀에 숨겨라');
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; if (mode) giveKey(k, '끌어들인 자경대원에게서 ' + keyName(k) + '을(를) 챙겼다'); else S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  if (g.dog) c.dog = true;
  checkObjective();
}
// 사고사: 칼자국 없이 죽는다. 시체를 봐도 '사고'로 여겨 수색·비명이 없다 (옮기면 사고로 보이지 않는다)
function accidentKill(g, how) {
  if (g.state === 'DEAD' || g.child) return;
  logEv('accident', g.x, g.y);
  g.state = 'DEAD'; g.icon = null; g.path = null; play('thud', 0.6);
  S.stats.kills++; S.stats.accidents = (S.stats.accidents || 0) + 1; if (g.target) setTimeout(() => bossRadio('accident', true), 1200); if (!g.target && g.civ) S.stats.extraKills++; else if (!g.target && !g.dog) S.stats.crewKills = (S.stats.crewKills || 0) + 1;
  const c = { fl: flOf(g), ch: charOf(g), dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: false, discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, accident: how, t0: S.t };
  S.corpses.push(c);
  if (g.target) { const left = S.guards.filter(o => o.target && o.state !== 'DEAD').length; toast(left ? `표적 제거(사고) — 남은 표적 ${left}` : '표적 제거 — 사고로 보인다', 3, 'good'); }
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  checkObjective();
}
// 함정: { k: 'shock', sw: [x, y], zone: [x0, y0, x1, y1] } 전선 끊어 물웅덩이 감전 · { k: 'drop', at: [x, y], hit: [x0, y0, x1, y1] } 옥상 간판 떨어뜨리기
function trapsInit() {
  S.traps = (STAGE.traps || []).map((t, i) => Object.assign({ i, used: false }, t));
  S.carAlarms = CARS.map(([x, y]) => ({ x: tc(x), y: (y + 1) * TILE, tx: x, ty: y, used: false, t: 0 }));
}
const inZone = (g, z) => g.x >= z[0] * TILE && g.x < (z[2] + 1) * TILE && g.y >= z[1] * TILE && g.y < (z[3] + 1) * TILE;
function nearTrap() {
  const P = S.player; if (P.wire || P.jump || P.hide || P.carrying || P.vent || P.under || P.fl) return null;
  for (const t of S.traps || []) { if (ACT_SKIP.has(t)) continue;
    if (t.used) continue;
    if (t.k === 'shock' && !P.z && dist(P.x, P.y, tc(t.sw[0]), tc(t.sw[1])) < 52) return { t, label: '전선 끊기 — 물웅덩이 감전' };
    if (t.k === 'drop' && P.z && dist(P.x, P.y, tc(t.at[0]), tc(t.at[1])) < 52) return { t, label: t.label || '간판 떨어뜨리기' };
  }
  if (!P.z) for (const c of S.carAlarms || []) if (!c.used && dist(P.x, P.y, c.x, c.y) < 56) return { car: c, label: '차 경보 울리기' };
  return null;
}
function fireTrap(a) {
  if (a.car) { a.car.used = true; a.car.t = 7; play('metal', 0.4); toast('차 경보가 울린다 — 근처 자경대원이 보러 온다', 2.2); return; }
  const t = a.t; t.used = true;
  if (t.k === 'shock') {
    const z = t.zone, cx = (z[0] + z[2] + 1) / 2 * TILE, cy = (z[1] + z[3] + 1) / 2 * TILE; let n = 0;
    for (const g of S.guards) if (!g.civ && !flOf(g) && g.state !== 'DEAD' && inZone(g, z)) { accidentKill(g, 'shock'); n++; }
    t.fx = 1.6; play('fuse', 0.7); noise(cx, cy, 150, 'switch'); S.flash = 0.2;
    toast(n ? `감전 — ${n}명 쓰러졌다 (사고로 보인다)` : '물웅덩이에 전기가 흘렀지만 아무도 없었다', 2.6, n ? 'good' : '');
  } else if (t.k === 'drop') {
    const z = t.hit, cx = (z[0] + z[2] + 1) / 2 * TILE, cy = (z[1] + z[3] + 1) / 2 * TILE; let n = 0;
    for (const g of S.guards) if (!g.civ && !flOf(g) && g.state !== 'DEAD' && inZone(g, z)) { accidentKill(g, 'fall'); n++; }
    t.wreck = { x: cx, y: cy }; play('thud', 0.9); play('metal', 0.6); noise(cx, cy, 260, 'crash'); S.flash = 0.15;
    toast(n ? `간판이 떨어졌다 — ${n}명 깔렸다 (사고로 보인다)` : '간판이 떨어졌다 — 아무도 없었다. 소리에 사람들이 온다', 2.6, n ? 'good' : '');
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
    if (!calm(a) || !calm(b)) { a.say = b.say = null; st.i = -1; st.t = 8; return; }
    st.lt -= dt; if (st.lt > 0) return;
    if (st.i >= it.lines.length) { a.say = b.say = null; st.i = -1; st.t = it.every || 30; return; }
    const [who, text] = it.lines[st.i], sp = who ? b : a, ot = who ? a : b; ot.say = null; sp.say = text; st.lt = 2 + text.length * 0.07;
    sp.want = Math.atan2(ot.y - sp.y, ot.x - sp.x);
    // 엿듣기: 같은 층, 가까이(벽 너머는 더 가까이), 그 줄을 말할 때
    if (st.i === it.key && !st.done && flOf(P) === flOf(sp) && !P.under && !P.vent) {
      const d = dist(P.x, P.y, sp.x, sp.y), near = d < 190 * soundThrough(sp.x, sp.y, P.x, P.y) + 40;
      if (near) { st.done = true; if (it.gives) { S.player.keys[it.gives] = true; S.player.hasKey = true; } S.learned.push(it.learn); play('click', 0.4); toast('엿들었다 — ' + it.learn, 3.2, 'good'); }
    }
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
  S.shiftT = sh.every; play('bell', 0.4); toast(sh.msg || '교대 시간 — 순찰이 하나 늘었다', 2.8, 'warn');
}
function updateTraps(dt) {
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
    if (t.k === 'drop' && t.wreck) { const w = t.wreck; ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(0.18); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-40, -12, 84, 30); ctx.fillStyle = '#3a2a3a'; ctx.fillRect(-42, -16, 84, 28); ctx.strokeStyle = '#ff3ca8'; ctx.lineWidth = 2; ctx.strokeRect(-40, -14, 80, 24); ctx.fillStyle = '#ff9ad2'; ctx.font = '700 12px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.text || '간판', 0, 3); ctx.restore(); }
  }
  for (const c of S.carAlarms || []) if (c.t > 0 && Math.floor(S.t * 3) % 2) { ctx.fillStyle = 'rgba(255,170,60,.55)'; ctx.beginPath(); ctx.arc(c.x - 14, c.y - 30, 7, 0, TAU); ctx.arc(c.x + 14, c.y - 30, 7, 0, TAU); ctx.fill(); }
}
function drawTrapsRoof() {
  for (const t of S.traps || []) if (t.k === 'drop' && !t.used) {
    const x = t.at[0] * TILE, y = t.at[1] * TILE + 26;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 18, y + 4, 86, 22); ctx.fillStyle = '#2a1830'; ctx.fillRect(x - 20, y, 86, 22); ctx.strokeStyle = '#ff3ca8'; ctx.lineWidth = 2; ctx.strokeRect(x - 18, y + 2, 82, 18);
    ctx.fillStyle = '#ff9ad2'; ctx.font = '700 12px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.text || '간판', x + 23, y + 15);
    const P = S.player; if (P.z && dist(P.x, P.y, tc(t.at[0]), tc(t.at[1])) < 200) { const z = t.hit; ctx.strokeStyle = 'rgba(255,90,170,.6)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeRect(z[0] * TILE, z[1] * TILE, (z[2] - z[0] + 1) * TILE, (z[3] - z[1] + 1) * TILE); ctx.setLineDash([]); }
  }
}
function bldPower(fb, on) {
  fb.cut = !on; fb.t = 5;
  for (const l of S.lamps) if (!l.outdoor && !l.hearth && bldAt(Math.floor(l.x / TILE), Math.floor(l.y / TILE)) === fb.b) { if (on) { if (l.cut != null) { l.off = l.cutWas; l.cut = null; } } else if (l.cut == null) { l.cutWas = l.off; l.off = true; l.cut = fb.b; } }
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
  if (on) { const B = BLD[fb.b]; if (dist(S.player.x, S.player.y, fb.x, fb.y) < 900) toast(`${B.plate || B.name || '건물'} 전기가 다시 들어왔다`, 2.2); }
}
function nearBFuse() { const P = S.player; if (P.z || P.fl || P.wire || P.jump || P.hide || P.carrying || P.captive) return null; let best = null, bd = 50; for (const fb of S.bfuses || []) { if (fb.cut || ACT_SKIP.has(fb)) continue; const d = dist(P.x, P.y, fb.x, fb.y); if (d < bd) { bd = d; best = fb; } } return best; }
function cutLights() {
  S.lightsOn = false; play('fuse', 0.6); setTimeout(() => play('switch', 0.5), 120);
  toast('바깥 조명이 꺼졌다 — 곧 누군가 확인하러 온다', 3); setAlert(1, 30);
  S.fuseT = 2.5;
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
  if (STAGE.onLightsOut) try { STAGE.onLightsOut(S, SH); } catch (e) { console.warn('onLightsOut', e); }  // 의뢰마다: 정전에 반응하는 사람 (예: 발전기 보러 가는 표적)
}
function startBodyAnim(k, c, dur, o) { const P = S.player; P.bodyAnim = Object.assign({ k, c, t0: S.t, dur }, o || {}); P.strikeT = Math.max(P.strikeT || 0, dur); P.moving = false; }
function actCarry() {
  if (!S || S.over || paused || !running || tactical) return;
  const P = S.player;
  if (P.hide) { if (P.hide.type === 'well') travelTunnel(); return; }
  if (P.z && !P.jump && !P.trav && !P.lunge && !P.wire) { const sa = secondaryAction(); if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 자경대원에게 안 보인다. 위로 밀면 올라서고, 가까이 온 자경대원은 끌어내린다'); } return; }
  if (P.z || P.jump || P.trav || P.lunge || P.grabIn || P.vent || P.under) return;
  if (P.captive) { actPrimaryForce(P.captive.target ? 'execute' : 'choke'); return; }
  const sa = secondaryAction();
  if (sa.viaZ) { actPrimary(sa); return; }
  if (sa.k === 'cover') { enterCover(sa.n); return; }
  if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 자경대원에게 안 보인다. 위로 밀면 올라서고, 가까이 온 자경대원은 끌어내린다'); return; }
  if (sa.k === 'uncover') { P.cover = null; play('cloth', 0.15); return; }
  if (sa.k === 'fdown') { const l = sa.l; P.fl = l.bfl; setLayer(P.fl); P.x = l.x; P.y = l.y; play('step_w0', 0.3); S.fade = 0.15; return; }
  if (sa.k === 'grab') { grab(sa.g); return; }
  if (sa.k === 'use') { useItem(sa.n); return; }
  if (sa.k === 'candy') { giveCandy(sa.g); return; }
  if (sa.k === 'pickup') { takeProp(sa.p); return; }
  if (sa.k === 'dropItem') { dropItem(); toast('내려놓았다', 1.2); return; }
  if (sa.k === 'dress') {  // 변장: 조직원 옷을 입으면 멀리서는 같은 편으로 보인다. 정예·표적은 얼굴을 알아보고, 뛰거나 가까이 붙으면 들킨다
    const c = sa.c, of = c.outfit || 'crew'; c.stripped = true; P.disguise = (c.ch || '').split('@')[0]; /* 주인공은 기본 체형 (모든 동작이 있다) */ P.outfit = of; P.disguiseBlown = !!(P.blown || {})[of]; play('cloth', 0.6); noise(P.x, P.y, 30, 'cloth'); S.fade = 0.25; S.stats.dressed = (S.stats.dressed || 0) + 1;
    if (P.disguiseBlown) toast(`${outfitName(of)}으로 갈아입었지만 이미 들통난 옷이다 — 이 옷으로는 통과할 수 없다`, 3, 'warn');
    else if (STAGE.zones) { toast(`${outfitName(of)}으로 갈아입었다 — 초록 경계선 안은 걸어서 지나다닐 수 있다`, 3.2, 'good'); hint('disguise2', '변장: 초록 경계선 구역은 지나다녀도 된다. 뛰기·운반·락픽은 수상하다. 눈 표시 사람은 오래 보면 알아챈다'); }
    else { toast('조직원 옷으로 갈아입었다 — 걸어 다니면 멀리서는 의심받지 않는다. 정예·표적은 얼굴을 안다', 3.2, 'good'); hint('disguise', '변장: 뛰기·시체 들기·옥상·너무 가까이 붙기는 의심받는다'); }
    return;
  }
  if (sa.k === 'throwBody') {
    const c = P.carrying, g = sa.g; P.carrying = null; c.carried = false; c.discovered = true; S.stats.bodies++;
    const a = Math.atan2(g.y - P.y, g.x - P.x), d = Math.max(30, dist(P.x, P.y, g.x, g.y) - 26);
    c.fly = { x0: P.x, y0: P.y, x1: P.x + Math.cos(a) * d, y1: P.y + Math.sin(a) * d, t: 0, dur: 0.35 + d / 900 };
    P.strikeT = 0.25; play('throw', 0.6); return;
  }
  if (sa.k === 'steal') {
    const g = sa.g; const sk = g.hasKey; g.hasKey = null; P.keys[sk] = true; P.hasKey = true; play('click', 0.4); S.stats.steal = (S.stats.steal || 0) + 1;
    if (P.mode !== 'sneak' && Math.random() < 0.5) { g.meter = 0.75; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.state = 'NOTICE'; g.poi = { x: P.x, y: P.y }; g.noticeT = 0; setIcon(g, '?'); toast('열쇠를 훔쳤다 — 그런데 눈치챈 것 같다!', 2.4, 'warn'); }
    else { toast('열쇠를 훔쳤다 (웅크린 채라 들키지 않았다)', 2.4, 'good'); bark('hero', 'key'); }
    return;
  }
  if (P.carrying) {
    const c = P.carrying; const b = nearHide(), pc = pairCarry(P);
    if (b && b.bodies < b.cap) {
      if (pc) { P.a = Math.atan2(b.y - P.y, b.x - P.x); startBodyAnim('stash', c, 0.5); }
      c.carried = false; c.stashed = true; P.carrying = null; b.bodies++; S.stats.stashed++;
      play('drop', 0.4); play('cloth', 0.3);
      toast(b.type === 'well' ? '시체를 맨홀 속에 떨어뜨렸다' : `${hideIn(b)}에 시체를 숨겼다 (${b.bodies}/${b.cap})`, 2.2, 'good');
      return;
    }
    if (b && b.bodies >= b.cap) toast(`${hideName(b)}은 꽉 찼다`, 1.6);
    if (pc) {  // 앞에 내려놓는다: 어깨에서 내려 → 안아 내림 → 허리 숙여 바닥에 눕힌다
      const ox = P.x + Math.cos(P.a) * 26, oy = P.y + Math.sin(P.a) * 26; if (!solidAt(Math.floor(ox / TILE), Math.floor(oy / TILE))) { c.x = ox; c.y = oy; } else { c.x = P.x; c.y = P.y; }
      c.a = P.a; c.t0 = null; c.td = null; c.hideT = S.t + 0.5; startBodyAnim('drop', c, 0.5); }
    c.carried = false; P.carrying = null;
    c.hidden = tileAt(c.x, c.y) === 'B';
    if (!c.hidden && solidAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE))) { c.x = P.x; c.y = P.y; c.hidden = P.hidden; }
    c.light = lightAt(c.x, c.y);
    play('drop', 0.5); noise(c.x, c.y, 70, 'drop');
    toast(c.hidden ? '시체를 화단에 숨겼다' : '시체를 내려놓았다 (눈에 띌 수 있음)', 2.2, c.hidden ? 'good' : '');
    return;
  }
  const c = nearCorpse();
  if (c) { const cx = c.x, cy = c.y, ca = c.a; c.carried = true; c.hidden = false; c.accident = null; P.carrying = c; if (pairCarry(P)) { P.a = Math.atan2(cy - P.y, cx - P.x); startBodyAnim('lift', c, 0.55, { cx, cy, ca }); } play('cloth', 0.5); hint('carry', '운반 중엔 느리고 뛸 수 없다. 화단 위나 수거함·맨홀 옆에서 다시 누르면 숨긴다'); }
}
function actPrimaryForce(k) { if (k === 'execute') execCaptive(); else if (k === 'choke') execCaptive(true); }
// 보조 버튼에 걸린 행동: 열쇠 훔치기 > 붙잡기 > 운반
function secondaryAction() {
  const P = S.player;
  if (P.trav || P.lunge || P.grabIn) return { k: 'none', label: '…' };
  if (P.under || P.vent) return { k: 'none', label: '특수' };
  if (P.ledge) return { k: 'none', label: '매달림' };
  if (P.z && !P.wire && !P.jump) { const lg = ledgeAt(P); if (lg) return { k: 'ledge', n: lg, label: '가장자리에 매달리기' }; }
  if (P.hide) return P.hide.type === 'well' && ugAt(P.hide.tx, P.hide.ty) ? { k: 'tunnel', label: '지하로' } : { k: 'none', label: '—' };
  if (P.captive) return { k: 'execute', label: P.captive.target ? '처치' : '기절시키기' };
  if (P.carrying) {
    if (!nearHide()) { const tg = S.guards.filter(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.target && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 300 && dist(g.x, g.y, P.x, P.y) > 70 && los(P.x, P.y, g.x, g.y) && Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))) < 1.0).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0]; if (tg) return { k: 'throwBody', g: tg, label: '시체 던지기 (겁주기)' }; }
    { const nh = nearHide(); return { k: 'carry', label: nh && nh.bodies < nh.cap ? '넣기' : nh ? '내려놓기 (가득 참)' : '내려놓기' }; }
  }
  if (P.z || P.jump) return { k: 'none', label: '특수' };
  const ch = nearChild(); if (ch) return { k: 'candy', g: ch, label: `사탕 주기 (${P.candy})` };
  const kl = killList().filter(g => dist(g.x, g.y, P.x, P.y) <= 60); const kh = kl.find(g => g.hasKey); if (kh) return { k: 'steal', g: kh, label: keyName(kh.hasKey) + ' 훔치기' };
  const kg = kl.filter(g => !g.elite && !g.dog); if (kg.length) return { k: 'grab', g: kg[0], label: '붙잡기' };
  const nu = nearUse(); if (nu) return { k: 'use', n: nu, label: nu.u.label };
  const pp = nearProp(); if (pp) return { k: 'pickup', p: pp, label: pp.outfit ? '옷 갈아입기 — ' + outfitName(pp.outfit) : '줍기 — ' + pp.name };
  const nc = nearCorpse(); if (nc && (STAGE.disguise || STAGE.zones) && !nc.dog && !nc.stripped && !nc.target && (nc.outfit || (!STAGE.zones && !(nc.ch || '').startsWith('civ'))) && !(P.disguise && !P.disguiseBlown && (nc.outfit || 'crew') === P.outfit)) return { k: 'dress', c: nc, label: (P.blown || {})[nc.outfit || 'crew'] ? '옷 갈아입기 (이미 들통난 옷)' : '옷 갈아입기 — ' + outfitName(nc.outfit || 'crew') };
  if (nc) return { k: 'carry', label: '운반' };
  const hp = primaryAction(); if (hp.held) return Object.assign({}, hp.held, { viaZ: true }); if (hp.alt && hp.alt.k !== 'keymsg') return Object.assign({}, hp.alt, { viaZ: true });
  if (P.item) return { k: 'dropItem', label: P.item.name + ' 내려놓기' };
  return { k: 'none', label: '특수' };
}
function actThrow(pt) {
  if (!S || S.over || paused || !running) return;
  const P = S.player; if (P.hide || P.jump || P.trav || P.under || P.vent) return;
  if (P.stones <= 0) { toast('빈 캔이 없다', 1.4); return; }
  const tx = pt ? pt.x : P.x + Math.cos(P.a) * 230, ty = pt ? pt.y : P.y + Math.sin(P.a) * 230;
  const ang = Math.atan2(ty - P.y, tx - P.x); let d = Math.min(330, dist(P.x, P.y, tx, ty));
  d = Math.max(20, Math.min(d, castRay(P.x, P.y, ang, d, P.z > 0) - 6));
  P.stones--; S.stats.stonesUsed++;
  (S.throwT = S.t + 0.7), S.stones.push({ x0: P.x, y0: P.y, x1: P.x + Math.cos(ang) * d, y1: P.y + Math.sin(ang) * d, t: 0, dur: 0.25 + d / 900, fl: flOf(P) });
  play('throw', 0.4);
  hint('stone', '빈 캔이 떨어진 곳으로 근처 자경대원이 확인하러 간다');
}
function actCoin(pt) {
  if (!S || S.over || paused || !running) return;
  const P = S.player; if (P.hide || P.jump || P.under || P.vent) return;
  if (P.z) { toast('옥상 위에서는 담배를 던질 수 없다', 1.6); return; }
  if (P.coins <= 0) { toast('담배이 없다', 1.4); return; }
  const tx = pt ? pt.x : P.x + Math.cos(P.a) * 110, ty = pt ? pt.y : P.y + Math.sin(P.a) * 110;
  const ang = Math.atan2(ty - P.y, tx - P.x); let d = Math.min(160, dist(P.x, P.y, tx, ty));
  d = Math.max(16, Math.min(d, castRay(P.x, P.y, ang, d) - 8));
  const lx = P.x + Math.cos(ang) * d, ly = P.y + Math.sin(ang) * d;
  if (solidAt(Math.floor(lx / TILE), Math.floor(ly / TILE))) return;
  P.coins--; S.stats.coins = (S.stats.coins || 0) + 1;
  const l = { x: lx, y: ly, x0: P.x, y0: P.y, t: 0, landed: false, claim: null, fl: flOf(P) };
  (S.throwT = S.t + 0.7), S.lures.push(l); play('throw', 0.25);
  hint('coin', '담배: 본 자경대원이 주우러 와서 고개를 숙인다. 정예는 안 넘어간다');
}
function actKunai(forced) {
  if (!S || S.over || paused || !running) return;
  const P = S.player;
  if (P.kunai <= 0) { toast('다트가 없다', 1.4); return; }
  const t = forced || kunaiTarget();
  if (!t) { toast('사거리 안에 노릴 자경대원나 조명이 없다', 1.6); return; }
  P.kunai--; S.stats.kunaiUsed++;
  P.a = Math.atan2(t.y - P.y, t.x - P.x);
  const d = dist(P.x, P.y, t.x, t.y);
  (S.throwT = S.t + 0.7), S.kunais.push({ x0: P.x, y0: P.y, t: 0, dur: 0.08 + d / 1400, tgt: t });
  play('kunai', 0.55);
}
function kunaiHit(k) {
  const t = k.tgt;
  if (t.type === 'cam') {
    if (t.ref.broken) return; t.ref.broken = true; play('glass', 0.5); play('metal', 0.3); noise(t.x, t.y, 90, 'glass', t.ref.fl);
    for (let i = 0; i < 3; i++) S.fx.push({ k: 'smoke', x: t.x, y: t.y, t: -i * 0.1 }); toast('다트로 CCTV를 부쉈다', 1.8, 'good'); return;
  }
  if (t.type === 'lamp') {
    if (t.ref.broken) return;
    t.ref.broken = true; play('glass', 0.6);
    for (const c of S.corpses) c.light = lightAt(c.x, c.y);
    noise(t.x, t.y, 150, 'glass');
    toast('다트로 조명을 깨뜨렸다', 1.8, 'good'); setAlert(1, 30);
    hint('kunaiLamp', '깨진 조명은 다시 켜지지 않는다. 깨지는 소리에 근처 자경대원이 다가온다');
  } else {
    const g = t.ref; if (g.state === 'DEAD') { play('metal', 0.4); return; }
    S.lethalNext = true; killGuard(g); S.stats.special++;
    toast('원격 암살', 1.6, 'good');
  }
}

