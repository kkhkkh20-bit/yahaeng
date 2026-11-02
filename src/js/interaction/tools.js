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
  hint('coin', '담배는 쉬는 중인 흡연자만 관심을 보인다. 경계 중이거나 자리를 지키는 경비는 움직이지 않는다');
}
function actKunai(forced, lethal = false) {
  if (!S || S.over || paused || !running || actionBusy()) return;
  const P = S.player;
  if (P.kunai <= 0) { toast('다트가 없다', 1.4); return; }
  const t = forced || kunaiTarget();
  if (!t || t.type !== 'guard' || !S.guards.includes(t.ref) || t.ref.child || t.ref.state === 'DEAD') { toast('조준할 사람이 없다 · 조명과 CCTV는 스위치나 전원으로 끈다', 1.6); return; }
  P.kunai--; S.stats.kunaiUsed++;
  P.a = Math.atan2(t.y - P.y, t.x - P.x);
  const d = dist(P.x, P.y, t.x, t.y);
  (S.throwT = S.t + 0.7), S.kunais.push({ x0: P.x, y0: P.y, t: 0, dur: 0.08 + d / 1400, tgt: {...t,fl:flOf(t.ref),z:t.ref.z||0}, fl:flOf(P), z:P.z||0, lethal });
  play('kunai', 0.55);
}
function kunaiHit(k) {
  const t = k.tgt;
  if (t.type !== 'guard') return;
  const origin={x:k.x0,y:k.y0,fl:k.fl||0,z:k.z||0},g=t.ref;
  if (!g || g.state === 'DEAD' || flOf(g)!==(t.fl||0) || (g.z||0)!==(t.z||0) || dist(g.x,g.y,t.x,t.y)>24 || !sightLine(origin,g.x,g.y,g.z||0,false,flOf(g))) {
    play('metal',.25);noise(t.x,t.y,45,'dart',t.fl||0,t.z||0);toast('다트가 빗나갔다',1.4);return;
  }
  {
    g.takedownIntent = { source: null, lethal: !!k.lethal }; S.lethalNext = !!k.lethal; if (!k.lethal) S.koNext = true;
    killGuard(g); S.stats.special++; dartBlame(g);
    toast(k.lethal ? '다트로 처치했다' : '다트로 기절시켰다', 1.6, 'good');
  }
}

// 1층 높이 벽 오르기: 땅에서 벽(건물·담·컨테이너)에 바짝 붙어 있고, 그 너머가 1층 높이 옥상이면
// 땅에서 1층 높이 옥상으로, 또는 옥상에서 한 층 더 높은 옆 옥상으로
