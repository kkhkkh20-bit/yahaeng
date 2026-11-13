// ---------------------------------------------------------------- 자유 모드 난타전 · 칼질
// 등 뒤에서 들키지 않으면 → 기존 암살(처치)이 먼저. 정면이거나 들켰으면 → [공격]이 주먹·칼질이 된다.
//   주먹: 잽 · 훅 · 세 번째는 묵직한 한 방 (더 밀리고 더 멈칫). 체력이 다하면 기절
//   칼(무기 고르기에서 '칼'): 휘두를 때마다 베는 궤적, 피, 두 번이면 쓰러진다 (죽는다). 등 뒤 처치도 칼이면 죽인다
// 맞은 사람: 행인은 대부분 도망치고 덩치들은 맞서 싸운다. 조직원·경찰·악당은 맞받아 주먹을 날린다.
// 행인·경찰을 때리는 걸 누가 보면 수배. 누구든 때릴 수 있다 (자유도) — 대가는 따른다.
WEAPONS.knife = { name: '칼', melee: true, ammo: 1, price: 80 };
if (!WPN_ORDER.includes('knife')) WPN_ORDER.unshift('knife');
const BRAWL_HP = g => g.bhpMax || (g.knifeman || g.assailant || g.skReal ? 5 : g.police ? 3 : g.fac && !g.civ ? 4 : ['big', 'vest'].includes(g.body) ? 4 : 2);
const knifeOn = () => STAGE.cityLife && S.wpn === 'knife' && (S.guns?.knife || 0) > 0;
const brawlTough = g => !g.civ || g.fac || g.police || g.evt || ['big', 'vest'].includes(g.body) || g.assailant || g.knifeman;
function brawlTarget() {
  const P = S.player; let best = null, bs = 1e9;
  for (const g of S.guards) { if (g === P || !npcAlive(g) || g.off || g.child || g.z || flOf(g) || Math.abs(g.x - P.x) > 60 || Math.abs(g.y - P.y) > 60) continue; const d = dist(P.x, P.y, g.x, g.y); if (d > 52) continue;
    const da = Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))); if (da > 1.3) continue; const s = d + da * 30; if (s < bs) { bs = s; best = g; } }
  return best;
}
// [공격] 한 번 = 한 방. 맞힐 사람이 없어도 헛손질은 한다 (모션)
function brawlStrike() {
  if (!STAGE.cityLife) return false; const P = S.player; if (P.car || P.captive || P.carrying || P.z || flOf(P) || P.hide || P.cover || P.booth) return false;  /* 숨은 채로는 주먹을 못 뻗는다 */
  const knife = knifeOn(), g = brawlTarget(); if (g) P.a = Math.atan2(g.y - P.y, g.x - P.x);
  if (S.t - (P.comboT || -9) > 0.8) P.combo = 0; P.combo = (P.combo || 0) + 1; P.comboT = S.t; const heavy = !knife && P.combo % 3 === 0;
  P.strikeT = knife ? 0.26 : heavy ? 0.42 : 0.3; P.killAnim = null; P.brawling = true; P.brawlQueued = false; play(knife ? 'cloth' : 'cloth', 0.35, knife ? 1.6 : 1.1);
  if (knife) (S.slashes || (S.slashes = [])).push({ x: P.x, y: P.y - 14, a: P.a, t0: S.t, side: P.combo % 2 ? 1 : -1 });
  after(knife ? 0.08 : heavy ? 0.16 : 0.1, () => { if (!g || !npcAlive(g) || dist(P.x, P.y, g.x, g.y) > 64) return; brawlHit(g, knife, heavy); });
  return true;
}
function brawlHit(g, knife, heavy) {
  const P = S.player, a = Math.atan2(g.y - P.y, g.x - P.x); if (g.bhp == null || g.bhp <= 0) g.bhp = BRAWL_HP(g);  /* 기절했다 깨어난 사람은 다시 처음부터 */
  g.bhp -= knife ? 2 : heavy ? 2 : 1; g.stunT = S.t + (heavy ? 0.7 : 0.42); g.hitT = S.t; fstat(knife ? 'slashes' : 'punches');
  const kb = heavy ? 24 : knife ? 8 : 13, nx = g.x + Math.cos(a) * kb, ny = g.y + Math.sin(a) * kb; if (!solidAt(Math.floor(nx / TILE), Math.floor(ny / TILE))) { g.x = nx; g.y = ny; }
  g.a = a + Math.PI; g.path = null;
  if (knife) { bloodBurst(g.x, g.y - 12, a, 3); play('knife', 0.6); } else { play('thud', heavy ? 0.85 : 0.6, heavy ? 0.7 : 1); spawnEffect('impact', { x: g.x, y: g.y - 18, fl: 0, z: 0 }, { scale: heavy ? 0.75 : 0.5 }); }
  S.hitStop = Math.max(S.hitStop || 0, heavy ? 0.09 : knife ? 0.05 : 0.04); S.shakeT = Math.max(S.shakeT || 0, heavy ? 0.22 : 0.1);
  // 수배: 행인·경찰을 때리는 걸 봤다
  if ((g.civ || g.police) && !g.evt && g.skBi == null && witnessed(P.x, P.y, 300)) { if (g.police) addWanted(1, '경찰을 폭행했다'); else if (!S.wanted) addWanted(1, knife ? '칼로 사람을 찔렀다' : '사람을 때리는 걸 봤다'); }
  if (g.bhp <= 0) { g.fist = false; npcDown(g, null, !!knife); if (!knife) gsay(g, '...', 1); return; }
  // 반응: 맞서거나 도망
  if (g.fist) { if (Math.random() < 0.3) saysLine(g, 'civ', 'fighting', 1.2); return; }
  if (brawlTough(g) || Math.random() < 0.25) { if (!g.fist && !g.routeQ) g.routeQ = g.route; g.fist = true; g.fistT = 0; saysLine(g, g.police ? 'cop' : 'civ', g.police ? 'resist' : 'fight', 1.8); }
  else { civPanic(g, P.x, P.y, 12); saysLine(g, 'civ', 'hurt', 1.6); }
}
// 맞서는 사람: 다가와 주먹을 휘두른다 (맞으면 잠깐 멈칫)
function brawlUpdate(dt) {
  if (!STAGE.cityLife) return; const P = S.player;
  for (const g of S.guards) { if (!g.fist) continue; if (!npcAlive(g) || g.off || dist(g.x, g.y, P.x, P.y) > 500 || P.car) { g.fist = false; if (g.routeQ) { g.route = g.routeQ; g.routeQ = null; g.ri = 0; g.path = null; } continue; }   /* 싸움이 끝나면 원래 다니던 길로 */
    if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; }
    if ((g.stunT || 0) > S.t) continue;
    const d = dist(g.x, g.y, P.x, P.y); g.a = Math.atan2(P.y - g.y, P.x - g.x);
    if (d > 34) evRun(g, P.x, P.y, g.police ? 150 : 135, dt);
    else if ((g.fistT || 0) < S.t) { g.fistT = S.t + 1.05 + Math.random() * 0.4; g.swingT = 0.32; after(0.16, () => { if (npcAlive(g) && (g.stunT || 0) < S.t && dist(g.x, g.y, P.x, P.y) < 44 && !P.car) { play('thud', 0.6); hurtPlayer(g, '주먹에 맞았다'); } }); } }
  if (P.brawlQueued && !(P.strikeT > 0)) { P.brawlQueued = false; brawlStrike(); } else if (!(P.strikeT > 0) && S.t - (P.comboT || -9) > 0.8) P.brawling = false;
  if (S.slashes) S.slashes = S.slashes.filter(s => S.t - s.t0 < 0.22);
}
// 칼 궤적: 휘두른 방향으로 흰 호가 잠깐 남는다
function drawSlashes() {
  if (!S.slashes?.length) return; ctx.save(); ctx.lineCap = 'round';
  for (const s of S.slashes) { const u = (S.t - s.t0) / 0.22, a0 = s.a - 1.1 * s.side, a1 = s.a + 1.1 * s.side * (u * 2 - 1);
    ctx.strokeStyle = `rgba(235,245,255,${0.85 * (1 - u)})`; ctx.lineWidth = 4 * (1 - u) + 1; ctx.beginPath(); ctx.arc(s.x, s.y, 26, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
  ctx.restore();
}
