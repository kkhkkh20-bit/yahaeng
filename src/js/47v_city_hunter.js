// ---------------------------------------------------------------- 자유 모드 킬러 (내 목에 붙은 현상금)
// 의뢰를 세 건 끝내면 소문이 돈다. 그 뒤로 4~6분마다(의뢰·수배·광란 중이 아닐 때) 행인 차림의 킬러 하나가 화면 밖에서 나를 향해 걸어온다.
//   · 겉모습은 행인. 티: 똑바로 나에게 걸어온다 · 300px 안에선 가끔 품에서 쇠붙이가 번쩍인다.
//   · 170px 안에서 나를 보면 총을 꺼내 1초 겨눈다(붉은 조준선) → 쏜다. 벽·차 뒤로 시야를 끊거나 먼저 처리하라.
//   · 처리하면 현상금 사냥꾼의 품에서 돈(200만). 2600px 넘게 따돌리면 포기한다.
const HUNT_AFTER = 3, HUNT_GAP = [240, 360], HUNT_R = 170, HUNT_AIM = 1.0, HUNT_PAY = 200;
function hunterInit() { S.hunter = null; S.huntNext = S.t + rnd(...HUNT_GAP); }
function hunterUpdate(dt) {
  if (!STAGE.cityLife || !S.player) return; const P = S.player;
  if (!S.hunter) {
    if ((S.hitN || 0) < HUNT_AFTER || S.t < S.huntNext || S.hit || S.wanted || S.ramp || S.downing || S.cuffs || S.safeIn) return;
    if (!hunterSpawn()) S.huntNext = S.t + 30; return;
  }
  const H = S.hunter, g = H.g;
  if (g.state === 'DEAD') { hunterEnd(true); return; }
  if (dist(P.x, P.y, g.x, g.y) > 2600) { if ((H.lostT = (H.lostT || 0) + dt) > 8) hunterEnd(false); } else H.lostT = 0;
}
function hunterSpawn() {
  const p = offscreenSpot(520, 800); if (!p) return false;
  const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(p.x / TILE), Math.floor(p.y / TILE)], radio: false }, gi);
  g.x = p.x; g.y = p.y; g.route = [{ x: p.x, y: p.y, pause: 999 }]; g.civ = true; g.hunter = true; g.huntCd = 0; g.aimH = 0;
  placeGuard(g, gi); setLayer(0); if (PR) prWarm([charOf(g)], true);
  S.hunter = { g, t0: S.t }; fstat('hunters');
  play('click', 0.4, 0.6); evBanner('까마귀: "네 목에 돈이 걸렸다. 누가 오고 있다 — 행인 얼굴을 잘 봐."', '#ffb070');
  return true;
}
function hunterEnd(killed) {
  const H = S.hunter; if (!H) return; S.hunter = null; S.huntNext = S.t + rnd(...HUNT_GAP);
  const g = H.g; g.hunter = false;
  if (killed) { S.cash = (S.cash || 0) + HUNT_PAY; fstat('huntersDown'); fstat('earned', HUNT_PAY); play('loot', 0.5); evBanner(`킬러를 처리했다 — 품에서 ${HUNT_PAY}만`, '#9fe0b0'); }
  else { if (!inView(g.x, g.y, 80)) evGone(g); evBanner('킬러를 따돌렸다', '#c8c0b0'); }
}
// 매 프레임 (updateGuard 맨 앞에서): 나를 쫓아 걷고, 가까우면 겨누고 쏜다
function hunterStep(g, dt) {
  const P = S.player, d = dist(g.x, g.y, P.x, P.y), see = !P.car && !P.hide && !P.under && !flOf(P) && !S.safeIn && d < HUNT_R && los(g.x, g.y, P.x, P.y);
  g.huntCd = Math.max(0, (g.huntCd || 0) - dt);
  if (see && !g.huntCd) {
    g.moving = false; g.a = g.want = Math.atan2(P.y - g.y, P.x - g.x);
    if (!g.aimH) { sfx('aim'); gsay(g, '...', 0.8); }
    g.aimH += dt;
    if (g.aimH >= HUNT_AIM) { g.aimH = 0; g.huntCd = 1.6;
      const mx = g.x + Math.cos(g.a) * 16, my = g.y - 14 + Math.sin(g.a) * 16; spawnEffect('muzzle', { x: mx, y: my, fl: 0, z: 0 }, { scale: 0.6, angle: g.a, alpha: 1, startAt: 0 });
      gunSound(GUN_FX.npc, Math.max(0.4, proxVol(g))); noise(g.x, g.y, 600, 'gun', 0); g.shotT = S.t; const hitP = Math.random() < 0.55; bulletFly(mx, my, P.x + (hitP ? 0 : rnd(-30, 30)), P.y - 12 + (hitP ? 0 : rnd(-30, 30)), GUN_FX.npc, hitP ? 'body' : null);
      for (const c of actorsNearWide(g.x, g.y, 400)) if (c.civ && c !== g && npcAlive(c) && c.state !== 'PANIC') civPanic(c, g.x, g.y, 10);
      if (hitP) hurtPlayer(null, '킬러의 총에 맞았다.', g); }
    return;
  }
  g.aimH = 0;
  if (d < 40) { g.moving = false; return; }
  if (!g.path || (g.repH = (g.repH || 0) - dt) <= 0) { g.repH = 0.8; pathTo(g, P.x, P.y); }
  moveAlong(g, SPD.walk * (d > 500 ? 1.4 : 0.95) * spdMul(), dt); g.moving = true;
}
// 조준선 · 300px 안에서 가끔 번쩍이는 쇠붙이
function drawHunter() {
  const H = S.hunter; if (!H) return; const g = H.g, P = S.player; if (!npcAlive(g) || !inView(g.x, g.y, 40)) return;
  if (g.aimH > 0) { const k = g.aimH / HUNT_AIM; ctx.save(); ctx.strokeStyle = `rgba(255,40,30,${0.25 + 0.6 * k})`; ctx.lineWidth = 1 + k * 1.5; ctx.beginPath(); ctx.moveTo(g.x, g.y - 14); ctx.lineTo(P.x, P.y - 12); ctx.stroke(); ctx.restore(); }
  else if (dist(g.x, g.y, P.x, P.y) < 300 && ((S.t * 0.8 + g.id * 0.37) % 1.5) < 0.2) fxFrame('dart', ((S.t * 0.8 + g.id * 0.37) % 1.5) * 1.2, g.x + 5, g.y - 22, 0.45, 0.9);  // 품속 쇠붙이 번쩍임 (도트 섬광)
}
