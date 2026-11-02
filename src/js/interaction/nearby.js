function windowPassage(w,P=S.player) {
  if(w.sealed||flOf(P)||P.z||flOf(w))return null;
  const vert=winVert(w),nx=vert?1:0,ny=vert?0:1,along=(P.x-w.x)*-ny+(P.y-w.y)*nx,side=Math.sign((P.x-w.x)*nx+(P.y-w.y)*ny);
  if(!side||Math.abs(along)>30||dist(P.x,P.y,w.x,w.y)>52)return null;
  const tx=w.tx-nx*side,ty=w.ty-ny*side;
  if(groundSolidP(tx,ty))return null;
  return{w,tx,ty,nx:nx*side,ny:ny*side};
}
function nearWindow() {
  const P = S.player; if (P.z || P.fl || P.jump || P.carrying || P.captive || P.hide) return null;
  let best=null,bd=Infinity;
  for (const w of S.windows) { if (ACT_SKIP.has(w)) continue;
    const v=windowPassage(w,P),d=dist(P.x,P.y,w.x,w.y);
    if(v&&d<bd){best=v;bd=d;}
  }
  return best;
}
function dropSpot() {
  const P = S.player; if (!P.z || P.jump) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  let best = null, bd = 1e9;
  for (const o of N8) {
    const nx = tx + o[0], ny = ty + o[1];
    if (P.z === 1 ? (solidAt(nx, ny) || roofAt(nx, ny)) : (rLv(nx, ny) !== P.z - 1 || robAt(nx,ny))) continue;
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
  for (const c of S.corpses) { if (ACT_SKIP.has(c)) continue; if (c.carried || c.stashed || flOf(c) !== flOf(P)) continue; const d = dist(P.x, P.y, c.x, c.y); if (d < bd && objectReachable(c, 46)) { bd = d; best = c; } }
  return best;
}
function nearLamp() {
  const P = S.player; if (P.z || P.jump || P.hide) return null; let best = null, bd = 48;
  for (const l of S.lamps) { if (ACT_SKIP.has(l) || l.broken || l.cut != null || (l.outdoor && !S.lightsOn) || flOf(l) !== flOf(P)) continue; const at = lampControl(l), d = dist(P.x, P.y, at.x, at.y); if (d < bd && objectReachable(at, 48)) { bd = d; best = l; } }
  return best;
}
function nearDoor() {
  const P = S.player; if (P.z || P.fl || P.jump || P.hide) return null; let best = null, bd = 58;
  for (const d of S.doors) { if (ACT_SKIP.has(d)) continue; const dd = dist(P.x, P.y, d.x, d.y); if (dd < bd && objectReachable(d, 58)) { bd = dd; best = d; } }
  if (!best) return null;
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  if (best.group.some(d => d.tx === ptx && d.ty === pty)) return null;
  return best;
}
function doorBlocked(d) { return d.group.some(t => S.guards.some(g => g.state !== 'DEAD' && Math.floor(g.x / TILE) === t.tx && Math.floor(g.y / TILE) === t.ty) || S.corpses.some(c => !c.stashed && !c.carried && Math.floor(c.x / TILE) === t.tx && Math.floor(c.y / TILE) === t.ty)); }
function setDoor(d, lock) { d.group.forEach(t => { t.locked = lock; const grid=flOf(t)?GF[flOf(t)]:G0; grid[t.ty][t.tx] = lock ? 'X' : t.orig; }); }
function nearBushSpot() {
  const P = S.player; if (P.fl) return null; let best = null, bd = 64;
  for (const b of S.bushes) { if (ACT_SKIP.has(b)) continue; const d = dist(P.x, P.y, b.x, b.y); if (d < bd && objectReachable(b, 64)) { bd = d; best = b; } }
  return best;
}

function nearFuse() { const P = S.player; return !P.z && !P.fl && STAGE.fuse && !ACT_SKIP.has(STAGE.fuse) && S.lightsOn && objectReachable({ x: tc(STAGE.fuse[0]), y: tc(STAGE.fuse[1]) }, 62); }

function nearVent() {
  const P = S.player; if (P.jump || P.carrying || P.captive || P.hide || P.under || P.fl) return null;
  let best = null, bd = P.vent ? 34 : 42;
  for (const v of S.vents) { if (ACT_SKIP.has(v)) continue; if (!P.vent && (v.z !== P.z||!objectReachable(ventFixture(v),64))) continue; const d = dist(P.x, P.y, v.x, v.y); if (d < bd) { bd = d; best = v; } }
  return best;
}
// 바닥 환풍구를 지나는 경비를 안쪽으로 끌어들인다
function ventAmbushTarget() {
  const P = S.player; if (!P.vent) return null;
  const v = S.vents.filter(v => !v.roof && dist(P.x, P.y, v.x, v.y) < 34)[0]; if (!v) return null;
  let best = null, bd = 50;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE'].includes(g.state) || g.elite || g.dog || g.z || g.fl || g.climb) continue;
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
// 숫자판: 비밀번호 문 앞에서 직접 눌러 연다. 틀리면 삑 소리가 퍼진다
