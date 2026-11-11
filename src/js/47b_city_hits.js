// ---------------------------------------------------------------- 도시 안 의뢰 (GTA식): 공중전화에서 의뢰를 받으면 큰 도시 어딘가에 표적과 경호원이 나타나 거리를 돈다.
// 별도 의뢰 맵으로 넘어가지 않는다. 조용히 등 뒤에서 처치하든, 차로 들이받든, 들켜서 싸우고 도망치든 같은 도시 안에서 끝난다.
// 표적은 의뢰 맵의 target 표시를 쓰지 않는다(탈출·의뢰 완료 로직이 켜지지 않게). g.hit 으로만 구분한다.
const HIT_NAMES = ['문태식', '오정길', '백상만', '한두철', '유창배', '노기석', '서판수', '장덕구'];
const HIT_PAY = 50, HIT_QUIET_BONUS = 30;  // 만 원. 수배 없이 끝내면 보너스

function hitsInit() {
  S.hit = null; S.hitN = 0; S.cash = S.cash || 0;
  S.phones = (STAGE.phones || []).map(([tx, ty]) => ({ x: tc(tx), y: tc(ty) }));
}
// 지금 맡은 의뢰가 없을 때, 가까운 공중전화에서 [행동]
function hitAction() {
  const P = S.player; if (S.hit || P.car) return null;
  for (const p of S.phones || []) if (dist(P.x, P.y, p.x, p.y) < 60) return { k: 'hitPhone', p, at: { x: p.x, y: p.y - 40 }, label: '의뢰 받기' };
  return null;
}
// 블록 둘레 보도를 도는 길 (도시 행인과 같은 규칙)
function hitRing(bx, by, rev) {
  const x0 = 4 + bx * 20, y0 = 4 + by * 20, c = [[x0, y0, 2.5], [x0 + 15, y0, 0.6], [x0 + 15, y0 + 15, 3], [x0, y0 + 15, 0.6]];
  return rev ? c.slice().reverse() : c;
}
function takeHit() {
  if (S.hit) return;
  if (S.wanted > 0) { toast('수배 중에는 의뢰를 받을 수 없다', 2.2, 'warn'); return; }
  const P = S.player, BX = (STAGE.roadsX || []).length - 1, BY = (STAGE.roadsY || []).length - 1;
  // 나에게서 적당히 먼 블록 (화면 밖, 너무 멀지 않게)
  const blocks = [];
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const cx = tc(4 + bx * 20 + 7.5), cy = tc(4 + by * 20 + 7.5), d = dist(P.x, P.y, cx, cy); if (d > 1100 && d < 3600) blocks.push([bx, by, d]); }
  if (!blocks.length) return;
  const [bx, by] = blocks[(Math.random() * blocks.length) | 0], rev = Math.random() < 0.5, route = hitRing(bx, by, rev);
  const name = HIT_NAMES[S.hitN % HIT_NAMES.length];
  const tIdx = S.guards.length, t = makeGuard({ kind: 't', route, radio: false }, tIdx); t.hit = true; t.hitName = name; t.fac = 'A'; S.guards.push(t);
  const escorts = [];
  for (let k = 0; k < 1 + (S.hitN >= 2 ? 1 : 0); k++) {
    const g = makeGuard({ kind: k ? 'g1' : 'g2', route: [route[0]], follow: tIdx, radio: false }, S.guards.length); g.fac = 'A'; g.hitEscort = true;
    g.x += (k ? -1 : 1) * 30; g.y += 26; S.guards.push(g); escorts.push(g);
  }
  setLayer(0); for (const g of [t, ...escorts]) buildRouteLine(g); setLayer(flOf(P));
  if (PR) prWarm([t, ...escorts].map(charOf), true);
  S.hit = { g: t, escorts, name, t0: S.t, wantedAtStart: S.wanted };
  play('bell', 0.5); toast(`의뢰: ${name} 처치`, 2.4, 'good');
}
function hitsUpdate() {
  const h = S.hit; if (!h) return;
  const g = h.g;
  if (!S.guards.includes(g)) { S.hit = null; return; }
  if (g.state === 'DEAD' && !g.unconscious) {
    const quiet = !S.wanted, pay = HIT_PAY + (quiet ? HIT_QUIET_BONUS : 0);
    S.cash = (S.cash || 0) + pay; S.hitN++; S.hit = null;
    play('bell', 0.6); toast(`의뢰 완료 · ${pay}만${quiet ? ' (조용히)' : ''}`, 2.6, 'good');
    if (typeof feedbackPulse === 'function') feedbackPulse(document.querySelector('#hud .obj'), 'loot');
  }
}
function hitGoal() {
  const h = S.hit, P = S.player, money = `수입 ${S.cash || 0}만`;
  if (!h) {
    const p = (S.phones || []).slice().sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y))[0];
    return p ? { text: `공중전화에서 의뢰 받기 · ${money}`, where: '', x: p.x, y: p.y, fl: 0 } : null;
  }
  const g = h.g;
  return { text: (g.unconscious ? `${h.name} 기절 — 숨통을 끊어라` : `${h.name} 처치`) + ` · ${money}`, where: '', x: g.x, y: g.y, fl: flOf(g), g };
}
// 공중전화 부스와 표적 표시 (글 없이: 부스 그림, 표적 발밑의 붉은 고리)
// layer 'world': 조명을 받는 부스 그림 · 'ui': 어둠 위에 그리는 고리와 이름표
function drawHits(layer) {
  if (flOf(S.player) || S.player.z > 0 || S.player.wire) return;
  for (const p of S.phones || []) {
    if (!inView(p.x, p.y, 80)) continue;
    if (layer === 'ui') {
      if (!S.hit) { const pu = .5 + .4 * Math.sin(S.t * 4); ctx.strokeStyle = `rgba(80,220,170,${pu})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 24, 0, TAU); ctx.stroke(); }
      infoTag(p.x, p.y + 22, '공중전화', '#8fe0c4', .9); continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(p.x - 9, p.y - 6, 22, 16);
    ctx.fillStyle = S.hit ? '#5b6470' : '#2f8f6f'; ctx.fillRect(p.x - 11, p.y - 30, 22, 30);
    ctx.fillStyle = '#c9d6cf'; ctx.fillRect(p.x - 7, p.y - 26, 14, 10);
    ctx.fillStyle = '#1b2228'; ctx.fillRect(p.x - 3, p.y - 12, 6, 8);
  }
  if (layer !== 'ui') return;
  const h = S.hit; if (!h || h.g.state === 'DEAD' && !h.g.unconscious) return;
  const g = h.g; if (flOf(g) !== flOf(S.player) || !inView(g.x, g.y, 60)) return;
  const pu = .55 + .35 * Math.sin(S.t * 5);
  ctx.strokeStyle = `rgba(232,71,60,${pu})`; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  infoTag(g.x, g.y - 60, h.name + ' · 표적', '#ff9a86', .95);
}
