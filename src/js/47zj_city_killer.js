// ---------------------------------------------------------------- 자유 모드 연쇄 살인마 추적
// 경찰이 덮어 두는 연쇄 살인. 강 형사가 현장 위치만 흘린다. 내 방식으로 찾아서 끝낸다.
//   1) 현장 셋: 시신 곁에서 [현장 살피기] — 단서 하나씩 (체격·옷 / 담배 / 활동 구역)
//   2) 용의자 넷이 그 구역을 돌아다닌다. 가까이 가면 생김새가 보인다 (단서와 맞춰 본다)
//   3) 놈은 혼자 걷는 여자를 골라 따라붙고, 오래 두면 또 죽인다 (피해자가 는다, 놈은 자리를 옮긴다)
//   4) 진범을 처리하면 끝 — 놈 품에서 피해자들 사원증이 나온다. 엉뚱한 사람을 죽이면 수배 둘, 사건은 계속
const SK_BODIES = [['coat', '긴 코트', '현장에 남은 검은 코트 보풀'], ['pack', '배낭', '시신 어깨에 배낭 끈 자국'], ['big', '큰 덩치', '진흙에 찍힌 큰 발자국 — 덩치가 크다'], ['vest', '조끼', '떨어진 작업 조끼 단추']];
const SK_VICTIM_NEWS = ['[속보] 또 여성 시신… 같은 수법 세 번째, 경찰 "연관성 확인 중"', '[속보] 귀갓길 여성 숨진 채 발견… 시민들 "밤길이 무섭다"', '[속보] 연쇄살인 의혹에도 경찰 "단정 어렵다"… 유족 오열'];
const skPx = () => ({ key: 'sk', actors: [] });
function killerInit() { if (!STAGE.cityLife) return; S.sk = null; S.skNext = S.t + 480; }  /* 8분쯤 돌아다니면 강 형사가 연락한다 */
function killerStart() {
  if (S.sk && !S.sk.done) return false; const bi = (Math.random() * SK_BODIES.length) | 0;
  S.sk = { bi, trait: SK_BODIES[bi], clues: [], scene: null, suspects: [], killer: null, victims: 3, stage: 'scene', area: null, px: skPx(), t0: S.t };
  evBanner('강 형사: "세 번째 여자다. 위에선 덮으래. 현장 위치 보낸다 — 알아서 해."', '#ffd066'); after(1.4, () => newsTicker(SK_VICTIM_NEWS[0]));
  skScene(); return true;
}
// 현장: 쓰러진 여성 시신 + 지키는 순경 하나
function skScene() {
  const K = S.sk; const p = offscreenSpot(520, 900); if (!p) { K.retryT = S.t + 3; return; }
  const v = evPerson(K.px, p.x, p.y, { body: ['fLong', 'fBob', 'fTail'][K.clues.length % 3] }); v.keep = true; npcDown(v, null, true);
  const c = S.corpses.find(o => o.g === v); if (c) { c.civSeen = true; c.discovered = true; c.skScene = true; }
  const cop = evPerson(K.px, p.x + 46, p.y - 10, { police: true }); cop.civ = true; cop.beat = true; cop.keep = true;
  K.scene = { x: p.x, y: p.y, v, c, cop }; K.retryT = 0;
}
function skClueText(K, i) { return i === 0 ? K.trait[2] : i === 1 ? '같은 상표 담배꽁초 — 놈은 담배를 피운다' : `피해자 셋 다 ${K.area} 근처에서 사라졌다`; }
function killerAction() {
  const K = S.sk, P = S.player; if (!K || K.done || P.car || actionBusy(P)) return null;
  if (K.stage === 'scene' && K.scene && dist(P.x, P.y, K.scene.x, K.scene.y) < 70) { const s = K.scene;
    return { k: 'evAct', label: '현장 살피기', at: { x: s.x, y: s.y - 46 }, fn: () => { if (npcAlive(s.cop)) gsay(s.cop, '...빨리 보고 가요. 난 못 본 걸로 할 테니.', 2.6);
      doMotion({ dur: 1.6, pose: 'crouch', at: [[0.6, () => play('cloth', 0.4)]], end: () => skClue() }); } }; }
  return null;
}
function skClue() {
  const K = S.sk; if (!K || K.stage !== 'scene') return; const i = K.clues.length;
  if (i === 2) K.area = evDist(S.player.x, S.player.y) || '이 동네';
  K.clues.push(skClueText(K, i)); play('switch', 0.5); evBanner(`단서 ${i + 1}/3 — ${K.clues[i]}`, '#ffd066'); fstat('skClues');
  const s = K.scene; if (s.cop) after(8, () => { if (S.sk === K && s.cop && !inView(s.cop.x, s.cop.y, 80)) evGone(s.cop); });
  K.scene = null;
  if (K.clues.length >= 3) after(1.5, () => skHunt()); else after(2, () => { if (S.sk === K) { evBanner('강 형사: "다음 현장이다."', '#ffd066'); skScene(); } });
}
// 용의자 넷: 하나만 체격·담배가 다 맞는다
function skHunt() {
  const K = S.sk; if (!K) return; K.stage = 'hunt'; const P = S.player, c = offscreenSpot(500, 800) || { x: P.x + 600, y: P.y };
  K.hx = c.x; K.hy = c.y; const others = SK_BODIES.map((b, i) => i).filter(i => i !== K.bi);
  const plan = [[K.bi, true, true], [K.bi, false, false], [others[0], true, false], [others[1], true, false]].sort(() => Math.random() - 0.5);
  for (const [bi, smoke, real] of plan) { const a = rnd(0, TAU), r = rnd(80, 260), w = walkableNear(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, { x: -1e5, y: -1e5 });
    const g = evPerson(K.px, w.x, w.y, { body: SK_BODIES[bi][0] }); g.smoker = smoke; g.skBi = bi; g.skSmoke = smoke; g.skReal = real; g.keep = true; K.suspects.push(g); if (real) K.killer = g; skWander(g); }
  K.stalkT = S.t + 40; evBanner(`용의자 넷이 ${K.area}를 돈다 — 가까이 가서 생김새를 보고, 진범만 처리하라`, '#ffd066');
}
function skWander(g) { const a = rnd(0, TAU), w = walkableNear(g.x + Math.cos(a) * 200, g.y + Math.sin(a) * 200, { x: -1e5, y: -1e5 }); g.route = [{ x: g.x, y: g.y, pause: 0 }, { x: w.x, y: w.y, pause: rnd(2, 5) }]; g.ri = 1; g.wait = 0; g.path = null; }
const skDesc = g => `${SK_BODIES[g.skBi][1]} · ${g.skSmoke ? '담배 핌' : '담배 안 핌'}`;
function killerUpdate(dt) {
  if (!STAGE.cityLife) return; const P = S.player;
  if (!S.sk || S.sk.done) { if (S.skNext && S.t > S.skNext && !S.hit && !S.ev && (S.wanted || 0) < 2) { S.skNext = 0; killerStart(); } return; }
  const K = S.sk;
  if (K.stage === 'scene') { if (!K.scene && K.retryT && S.t > K.retryT) skScene(); return; }
  if (K.stage !== 'hunt') return;
  // 용의자: 가까이 가면 생김새가 보인다 / 엉뚱한 사람을 죽였다
  for (const g of K.suspects) {
    if (!npcAlive(g) && !g.skChecked && (S.corpses || []).some(c => c.g === g && c.ko && !c.stashed)) { if (!g.koNoted) { g.koNoted = true; evBanner(`기절시켰다 (${skDesc(g)}) — 끝내거나, 트렁크에 실어 지하실로`, '#e8d8a8'); } continue; }
    if (!npcAlive(g) && !g.skChecked && (S.corpses || []).some(c => c.g === g && c.ko)) continue;  /* 트렁크 속 기절자 */
    if (!npcAlive(g)) { if (!g.skChecked) { g.skChecked = true; if (g === K.killer) skSolved(g); else { addWanted(2, '죄 없는 사람을 죽였다'); evBanner(`엉뚱한 사람이었다 (${skDesc(g)}) — 진범은 아직 돌아다닌다`, '#ff8a7a'); newsTicker(`[속보] ${K.area} 길에서 남성 숨진 채 발견… 연쇄살인과 별개 사건으로 추정`); } } continue; }
    if (!g.skSeen && !P.car && dist(P.x, P.y, g.x, g.y) < 90) { g.skSeen = true; gsay(g, g === K.killer ? '...뭘 봐요.' : ['네?', '무슨 일이세요?', '...'][g.id % 3], 1.8); evBanner(`용의자: ${skDesc(g)}`, '#e8d8a8'); }
    if (g !== K.stalking && g.state === 'PATROL' && g.route.length > 1 && dist(g.x, g.y, g.route[1].x, g.route[1].y) < 20 && Math.random() < 0.01) skWander(g); }
  const k = K.killer; if (!npcAlive(k)) return;
  // 놈의 사냥: 혼자 걷는 여자를 골라 따라붙는다 → 30초 안에 못 막으면 또 죽인다
  if (!K.prey && S.t > K.stalkT) { let best = null, bd = 500; for (const o of actorsNear(k.x, k.y)) { if (!o.civ || !npcAlive(o) || o.evt || o.off || !['fLong', 'fBob', 'fTail', 'femaleCoat'].includes(o.body)) continue; const d = dist(o.x, o.y, k.x, k.y); if (d < bd && los(k.x, k.y, o.x, o.y)) { bd = d; best = o; } }
    if (best) { K.prey = best; K.killT = S.t + 30; K.stalking = k; evBanner('진범이 혼자 걷는 여자를 따라붙는다 — 서둘러', '#ff8a7a'); } else K.stalkT = S.t + 8; }
  if (K.prey) { const v = K.prey;
    if (!npcAlive(v)) { K.prey = null; K.stalkT = S.t + 10; }
    else { if ((k.folT = (k.folT || 0) - dt) <= 0) { k.folT = 0.5; const a = Math.atan2(k.y - v.y, k.x - v.x); const gap = S.t > K.killT ? 10 : 50; k.route = [{ x: k.x, y: k.y, pause: 0 }, { x: v.x + Math.cos(a) * gap, y: v.y + Math.sin(a) * gap, pause: 999 }]; k.ri = 1; k.wait = 0; k.path = null; }
      if (S.t > K.killT) evRun(k, v.x, v.y, 130, dt);  /* 때가 되면 덮친다 */
      if (S.t > K.killT && dist(k.x, k.y, v.x, v.y) < 40) { k.swingT = 0.4; play('knife', 0.5 * proxVol(k)); bloodBurst(v.x, v.y - 12, Math.atan2(v.y - k.y, v.x - k.x), 5); npcDown(v, k, true); K.victims++; K.prey = null; K.stalking = null; K.stalkT = S.t + 45;
        newsTicker(SK_VICTIM_NEWS[(K.victims) % SK_VICTIM_NEWS.length].replace('세 번째', `${K.victims}번째`)); evBanner(`또 한 명 — 피해자 ${K.victims}명. 놈이 자리를 옮긴다`, '#ff8a7a');
        const w = walkableNear(k.x + rnd(-500, 500), k.y + rnd(-500, 500), { x: P.x, y: P.y }); k.x = w.x; k.y = w.y; skWander(k); } } }
  // 들킨 걸 알면 칼을 꺼내 덤빈다
  if (!P.car && dist(P.x, P.y, k.x, k.y) < 44 && (K.hitT || 0) < S.t && k.skSeen) { K.hitT = S.t + 1.4; k.swingT = 0.35; play('knife', 0.6); hurtPlayer(k, 'knife'); if (!K.bared) { K.bared = true; gsay(k, '알아챘어? 너도 똑같이 해 줄게.', 2.4); } }
}
function skSolved(g) {
  const K = S.sk; K.done = true; K.stage = 'done'; cash(500); fstat('skSolved');
  evBanner(`연쇄 살인마 처리 · 놈 품에서 피해자 ${K.victims}명의 사원증이 나왔다 · 500만`, '#9fe0b0');
  justiceMoment('연쇄 살인마 처리', `[속보] ${K.area} 연쇄살인 용의자, 길에서 숨진 채 발견… 품에서 피해자 ${K.victims}명 소지품 나와`, g.x, g.y);
  for (const o of K.suspects) if (o !== g && npcAlive(o)) after(4, () => { if (!inView(o.x, o.y, 80)) evGone(o); else o.keep = false; });
  S.skNext = S.t + 900;
}
function killerGoal(money) {
  const K = S.sk; if (!K || K.done) return null;
  if (K.stage === 'scene') { const s = K.scene; return s ? { text: `연쇄 살인 현장 ${K.clues.length + 1}/3 살피기 · ${money}`, where: '', x: s.x, y: s.y, fl: 0 } : null; }
  const k = K.killer; const tip = K.clues.slice(0, 2).map((c, i) => i === 0 ? K.trait[1] : '담배').join(' · ');
  return { text: `진범 찾아 처리 — 단서: ${tip} · ${K.area} · 피해자 ${K.victims}명 · ${money}`, where: '', x: K.hx, y: K.hy, fl: 0 };
}
function drawMiniKiller(x, T) {
  const K = S.sk; if (!K || K.done) return;
  if (K.scene) { const p = K.scene; x.strokeStyle = '#ff3b2f'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(T(p.x) - 3, T(p.y) - 3); x.lineTo(T(p.x) + 3, T(p.y) + 3); x.moveTo(T(p.x) + 3, T(p.y) - 3); x.lineTo(T(p.x) - 3, T(p.y) + 3); x.stroke(); }
  if (K.stage === 'hunt') { x.strokeStyle = 'rgba(255,90,70,.6)'; x.lineWidth = 1; x.beginPath(); x.arc(T(K.hx), T(K.hy), 9, 0, TAU); x.stroke(); }
}
