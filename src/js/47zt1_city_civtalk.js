// ---------------------------------------------------------------- 자유 모드 행인 대사 (대사집 47zt0의 civ)
// 행인은 실제로 일이 생겼을 때만 말한다. 부딪힘, 내가 든 무기, 총소리, 쓰러진 사람, 바짝 붙어 달리는 차, 가끔 혼잣말.
// 한 사람은 몇 초에 한 번만 말하고, 거리 전체도 1초 남짓에 한 마디로 묶는다 (말풍선이 한꺼번에 뜨지 않게).
const CIV_TALK_GAP = 1.2;
function civTalkOk(g) {
  return g && g.civ && !g.dog && !g.child && !g.staff && !g.police && !g.off && !g.evt && !g.crew && !g.chat && npcAlive(g) && g.state !== 'CAPTIVE' && !g.rideIn;
}
function civSay(g, sit, dur = 1.8, gap = 6) {
  if (S.t < (S.civTalkT || 0) || S.t < (g.talkT || 0)) return false;
  if (!saysLine(g, 'civ', sit, dur)) return false;
  S.civTalkT = S.t + CIV_TALK_GAP; g.talkT = S.t + gap; return true;
}
function civTalkUpdate() {
  if (!STAGE.cityLife || !S.guards) return; const P = S.player, pf = flOf(P);
  // 내가 방금 쏜 총 (소음 권총은 빼고): S.gunT가 바뀐 순간
  const W = S.wpn && typeof WEAPONS !== 'undefined' ? WEAPONS[S.wpn] : null;
  const shot = W && !W.throw && !W.silent && S.civShotGunT !== undefined && S.gunT !== S.civShotGunT && S.gunT > S.t - 1; S.civShotGunT = S.gunT;   // 불러온 직후(처음 확인)는 총소리로 치지 않는다
  const armed = !P.car && (typeof wpnOn === 'function' && wpnOn());
  const lp = S.civLP || { x: P.x, y: P.y }, walking = !P.car && dist(lp.x, lp.y, P.x, P.y) > 8; S.civLP = { x: P.x, y: P.y };   // 지난 확인(0.5초) 뒤로 걸었나
  let near = null, nd = 1e9;
  for (const g of S.guards) {
    if (!civTalkOk(g) || flOf(g) !== pf) continue; const d = dist(g.x, g.y, P.x, P.y); if (d > 520) continue;
    if (shot && d < 480 && civSay(g, 'gunshot', 1.6, 10)) continue;
    if (P.car) { const v = P.car; const dd = dist(v.x, v.y, g.x, g.y), toward = ((g.x - v.x) * Math.cos(v.a) + (g.y - v.y) * Math.sin(v.a)) / Math.max(1, dd);
      if (Math.abs(v.v || 0) > 100 && dd < 70 + Math.abs(v.v) * 0.5 && toward > 0.55 && civSay(g, 'car', 1.8, 8)) continue; }   // 0.5초마다 보므로 속도만큼 앞을 내다본다   // 나를 향해 바짝 달려들 때만 (옆 차로로 지나가는 건 말하지 않는다)
    else if (d < 28 && walking && !P.hide && civSay(g, 'bump', 1.6, 8)) continue;
    if (armed && d < 170 && !g.sawArmed && g.state !== 'PANIC' && los(g.x, g.y - 10, P.x, P.y - 10) && civSay(g, 'weapon', 1.8, 8)) { g.sawArmed = true; continue; }
    if (!armed) g.sawArmed = false;
    for (const c of S.corpses || []) { if (c.civTalked || c.stashed || c.hidden || c.carried || flOf(c) !== pf || dist(c.x, c.y, g.x, g.y) > 110) continue;
      if (civSay(g, 'corpse', 2, 10)) c.civTalked = true; break; }
    if (g.state === 'PATROL' && d < nd) { nd = d; near = g; }
  }
  // 혼잣말: 내가 곁에 멈춰 있을 때 가까운 행인이 가끔 (밤거리 분위기)
  if (near && nd < 90 && !walking && !P.car && S.t > (S.civIdleT || 0)) { S.civIdleT = S.t + 14; civSay(near, 'idle', 2.2, 30); }
}
// ---- 악당 도발: 동네 사건의 악당이 내가 다가가면 얄밉게 한마디 (8초에 한 번) · 맞으면 뻔뻔하게 (47zp brawlHit 에서)
function villainOf(g) { const E = S.ev; if (!E || E.done || !E.def?.villain || !g) return null; const k = 'v_' + E.def.key; if (!LINES[k]) return null;
  const f = E.def.focus?.(E); return (f === g || E.crew?.members?.includes(g) || E.thugs?.includes(g)) ? k : null; }
function villainTalk() {
  const E = S.ev; if (!STAGE.cityLife || !E || E.done || !E.def?.villain || !E.engaged) return; const k = 'v_' + E.def.key; if (!LINES[k]) return;
  const g = E.def.focus?.(E), P = S.player; if (!g || !npcAlive(g) || g.off || flOf(g) !== flOf(P)) return;
  if (dist(g.x, g.y, P.x, P.y) < 150 && S.t > (E.tauntT || 0)) { E.tauntT = S.t + 8; g.want = Math.atan2(P.y - g.y, P.x - g.x); saysLine(g, k, 'taunt', 2.6); }
}
function villainHit(g) { const k = villainOf(g); if (k && npcAlive(g) && S.t > (g.vHitT || 0)) { g.vHitT = S.t + 2.5; saysLine(g, k, 'hit', 1.8); } }
