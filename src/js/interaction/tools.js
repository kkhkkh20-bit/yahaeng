function actThrow(pt) {
  if (!S || S.over || paused || !running) return;
  const P = S.player; if (actionBusy(P) || P.hide || P.under || P.vent) return;
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
  const P = S.player; if (actionBusy(P) || P.hide || P.under || P.vent) return;
  if (P.z) { toast('옥상 위에서는 담배를 던질 수 없다', 1.6); return; }
  if (P.coins <= 0) { toast('담배가 없다', 1.4); return; }
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
function actKunai(forced, lethal = false) {
  if (!S || S.over || paused || !running || actionBusy()) return;
  const P = S.player;
  if (P.kunai <= 0) { toast('다트가 없다', 1.4); return; }
  const t = forced || kunaiTarget();
  if (!t) { toast('사거리 안에 경비나 조준할 시설물이 없다', 1.6); return; }
  P.kunai--; S.stats.kunaiUsed++;
  P.a = Math.atan2(t.y - P.y, t.x - P.x);
  const d = dist(P.x, P.y, t.x, t.y);
  (S.throwT = S.t + 0.7), S.kunais.push({ x0: P.x, y0: P.y, t: 0, dur: 0.08 + d / 1400, tgt: t, lethal });
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
    g.takedownIntent = { source: null, lethal: !!k.lethal }; S.lethalNext = !!k.lethal; if (!k.lethal) S.koNext = true;
    killGuard(g); S.stats.special++; dartBlame(g);
    toast(k.lethal ? '다트로 처치했다' : '다트로 기절시켰다', 1.6, 'good');
  }
}

// 1층 높이 벽 오르기: 땅에서 벽(건물·담·컨테이너)에 바짝 붙어 있고, 그 너머가 1층 높이 옥상이면
// 땅에서 1층 높이 옥상으로, 또는 옥상에서 한 층 더 높은 옆 옥상으로
