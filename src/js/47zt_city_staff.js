// ---------------------------------------------------------------- 자유 모드 가게 일꾼: 건물마다 층의 쓰임새대로 일하는 사람과 옷
// 편의점 조끼 · 약국 흰 가운 · 철물점 작업복 · 식당 조리복/앞치마 · PC방·노래방 직원 · 헬스 트레이너 · 학원 선생님 · 사무실 양복.
// 내가 들어간 건물에만 세우고, 나오면 들여보낸다 (사람 수가 늘어 느려지지 않게 · 바깥 목격자가 늘지 않게). 무작위는 쓰지 않는다.
const STAFF_SAY = { staff: ['어서 오세요.', '봉투 필요하세요?'], pharm: ['어디가 불편하세요?', '처방전 있으세요?'], hardware: ['뭐 찾으세요?', '그건 안쪽에 있어요.'], chef: ['주문 들어왔어!', '불 조심해.'], cater: ['몇 분이세요?', '앉으세요, 금방 갖다드릴게요.'],
  gamer: ['몇 번 자리 하실래요?', '라면 드릴까요?'], karaoke: ['몇 분이세요? 방 드릴게요.', '서비스 10분 넣어 드렸어요.'], trainer: ['하나 더! 하나 더!', '자세 무너졌어요.'], teacher: ['자, 다음 문제.', '조용히 하자.'], clerk: ['...야근이네.', '보고서 언제 끝나지.'] };
function staffOutfit(b, f, use) {
  const sign = (b.signs || [])[f] || '';
  if (use === 'store') return /약국/.test(sign) ? 'pharm' : /철물|공구|타일|조명|전파|지물/.test(sign) ? 'hardware' : 'staff';
  return { food: (b.x0 + f) % 2 ? 'chef' : 'cater', pc: 'gamer', karaoke: 'karaoke', billiards: 'gamer', gym: 'trainer', academy: 'teacher', office: 'clerk' }[use] || null;
}
function staffInit() { S.staffT = 0; S.staffB = new Map(); }
const furnAt = (f, tx, ty) => FURN.some(it => (it.fl || 0) === f && tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h);
function staffSpot(f, A) {   // 가게 안 빈 칸: 앞줄(손님 통로) 한 줄 위, 가운데에 가까운 곳
  const old = CUR_F; setLayer(f); let best = null, bd = 1e9; const cx = (A.x0 + A.x1) / 2, cy = A.y1 - 1;
  for (let ty = A.y0; ty <= A.y1; ty++) for (let tx = A.x0; tx <= A.x1; tx++) { if (solidAt(tx, ty) || furnAt(f, tx, ty)) continue; const d = Math.abs(tx - cx) + Math.abs(ty - cy) * 1.5; if (d < bd) { bd = d; best = [tx, ty]; } }
  setLayer(old); return best;
}
function staffSpawn(bi) {
  const b = BLD[bi], plans = PLANS[bi] || [], out = [];
  plans.forEach((p, f) => { const A = p && p.store; if (!A) return; const o = staffOutfit(b, f, A.use); if (!o) return; const t = staffSpot(f, A); if (!t) return;
    const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: t, fl: f, radio: false }, gi);
    g.evt = '__staff'; g.staff = o; g.outfit = o; g.fl = f; g.homeFl = f; g.x = tc(t[0]); g.y = tc(t[1]); g.route = [{ x: g.x, y: g.y, pause: 6 }, { x: g.x + (t[0] > A.x0 ? -TILE : TILE), y: g.y, pause: 4 }]; g.ri = 0; g.a = Math.PI / 2;
    placeGuard(g, gi); out.push(g); });
  if (PR && out.length) prWarm(out.map(charOf), true);
  return out;
}
function staffUpdate(dt) {
  if (!STAGE.cityLife || !S.staffB || (S.staffT -= dt) > 0) return; S.staffT = 0.5; const P = S.player;
  // 실내는 들어가야 보인다: 내가 들어간 건물에만 일꾼을 세우고, 나오면 들여보낸다 (바깥 사람 수·목격자 수는 그대로)
  const inB = P.z ? -1 : bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  for (const [bi, have] of S.staffB) if (bi !== inB) { for (const g of have) if (!g.off && g.evt === '__staff') { if (npcAlive(g)) evGone(g); else g.keep = false; } S.staffB.delete(bi); }
  if (inB >= 0 && PLANS[inB] && !BLD[inB].vacant && !S.staffB.has(inB)) S.staffB.set(inB, staffSpawn(inB));
  // 손님이 들어오면 한마디 (같은 층 가까이)
  for (const list of S.staffB.values()) for (const g of list) if (npcAlive(g) && !g.off && flOf(g) === flOf(P) && !g.greeted && dist(g.x, g.y, P.x, P.y) < 120 && !P.car) { g.greeted = true; const L = STAFF_SAY[g.staff] || ['어서 오세요.']; gsay(g, L[g.id % L.length], 2.2); }
}
