// ---------------------------------------------------------------- 자유 모드 독침 (조용한 암살)
// 약국에서 독침 두 개(120만). 걸어서 사람의 등 뒤 44px 안(그 사람이 보는 방향과 100° 넘게 어긋난 쪽)에 붙으면 [독침 찌르기].
// 0.4초 스치듯 찌르고 지나간다. 맞은 사람은 '...?' 하고 계속 걷다가 8초 뒤 가슴을 움켜쥐고 쓰러진다.
//   · 사인은 '독' — 사고 위장 의뢰에선 성공, 칼로만 의뢰에선 실패. 찌르는 순간 경호원이 나를 보고 있으면 들킨다.
//   · 쓰러질 때 나는 그 자리에 없어도 된다(오히려 멀리 있으면 아무도 나와 잇지 못한다: 수배가 붙지 않는다).
const POISON_T = 8, POISON_R = 44;
function poisonAction() {
  const P = S.player; if (!STAGE.cityLife || !(P.poison > 0) || P.car || P.trav || P.hide || flOf(P)) return null;
  let best = null, bd = 1e9;
  for (const g of actorsNearWide(P.x, P.y, 60)) { if (g === P || !npcAlive(g) || g.off || g.poisonT || g.dog || g.state === 'ALERT' || g.state === 'PANIC' || flOf(g) || g.z) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d > POISON_R || d >= bd) continue;
    if (Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) < 1.75) continue;  // 등 뒤에서만
    bd = d; best = g; }
  if (!best) return null;
  return { k: 'evAct', label: `독침 찌르기 (${P.poison})`, at: { x: best.x, y: best.y - 50 }, targetObject: best, fn: () => poisonPrick(best) };
}
function poisonPrick(g) {
  const P = S.player; if (!npcAlive(g) || !(P.poison > 0)) return;
  P.poison--; P.strikeT = 0.2; play('cloth', 0.3, 1.6); fstat('poisons');
  g.poisonT = S.t; gsay(g, '...?', 1.2);
  // 찌르는 걸 본 사람: 경호원·같은 편은 바로 덤빈다, 행인은 신고
  const seen = S.guards.find(o => o !== g && npcAlive(o) && !o.off && !o.civ && dist(o.x, o.y, P.x, P.y) < 260 && canSee(o, P.x, P.y, Math.max(0.4, P.light || 0), P.hidden, P.mode === 'sneak', P.z, flOf(P)) > 0);
  if (seen) { goAlert(seen); gsay(seen, '방금 뭐 한 거야!', 1.6); if (g.hit || g.hitEscort) addWanted(1, '독침을 찌르는 걸 봤다'); }
  after(POISON_T, () => poisonDrop(g));
  after(POISON_T - 2, () => { if (npcAlive(g)) gsay(g, '윽... 숨이...', 1.6); });
}
function poisonDrop(g) {
  if (!npcAlive(g)) return; const P = S.player;
  npcDown(g, null, true); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) { c.byNpc = true; c.poisoned = true; }  // 내 손이 닿은 시체가 아니다 (조직 호감도·목격 신고 없음)
  if (inView(g.x, g.y, 40)) play('thud', 0.4);
  for (const o of actorsNearWide(g.x, g.y, 220)) if (o.civ && npcAlive(o) && o.state !== 'PANIC') civPanic(o, g.x, g.y, 6);
  if (dist(P.x, P.y, g.x, g.y) < 120 && witnessed(g.x, g.y, 220)) addWanted(1, '쓰러진 사람 곁에 있었다');
}
// 독 맞은 사람: 걷는 동안 아주 옅은 초록 점 (내 눈에만)
function drawPoison() {
  for (const g of actorsNearWide(S.player.x, S.player.y, 700)) { if (!g.poisonT || !npcAlive(g) || !inView(g.x, g.y, 30)) continue;
    const k = (S.t - g.poisonT) / POISON_T; ctx.fillStyle = `rgba(120,230,120,${0.35 + 0.4 * k})`; ctx.fillRect(Math.round(g.x - 1), Math.round(g.y - 44 - (S.t * 3 % 2)), 2, 2); }
}
