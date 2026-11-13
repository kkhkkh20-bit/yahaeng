// ---------------------------------------------------------------- 자유 모드 동네 이름 붙이기 (모든 건물이 실제로 있는 가게·집처럼)
// 1) 간판이 빈 가게에 업종을 채운다  2) 같은 업종이 여럿이면 상호를 붙여 서로 다르게 (을지 백반 · 영미네 백반 …)
// 3) 가장 큰 상가 둘을 학교·병원으로  4) 빌라엔 '○○빌라', 단독주택엔 '○씨네' 문패
// 학교 앞엔 학생들이 오가고, 병원 앞에서 [치료받기]로 체력을 채운다 (돈).
const FILL_SHOPS = ['세탁소', '미용실', '부동산', '안경점', '꽃집', '빵집', '정육점', '반찬가게', '수선집', '열쇠', '복권방', '문구점', '사진관', '한의원', '치킨', '중국집', '떡집', '오락실', '휴대폰', '노래방', '당구장', '헬스', '태권도', '학원', '세무사', '법무사', '인력사무소', '전당포'];
const SHOP_PREFIX = ['을지', '청계', '삼정', '대성', '우리', '동원', '한일', '제일', '신진', '금성', '영미네', '할매', '종로', '왕', '원조', '서울', '중앙', '새마을', '현대', '명동'];
const VILLA_NAMES = ['을지', '청계', '은행나무', '해오름', '대명', '삼성', '진주', '목련', '한빛', '소망', '우정', '태평', '장미', '수정', '동아', '그린', '로얄', '하나', '보람', '금호'];
const HOUSE_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const FILL_BY_USE = { store: ['세탁소', '미용실', '안경점', '꽃집', '빵집', '정육점', '반찬가게', '수선집', '열쇠', '복권방', '문구점', '사진관', '떡집', '휴대폰', '전당포'],
  office: ['부동산', '세무사', '법무사', '한의원', '인력사무소'], food: ['치킨', '중국집'], karaoke: ['노래방'], billiards: ['당구장'], gym: ['헬스', '태권도'], academy: ['학원'], pc: ['오락실'] };
const KEEP_SIGNS = /PC방|119|지구대|편의점|CLUB|중고차/;  // 이미 의미가 정해진 곳 (사건·장소에서 찾는 이름)
function placesInit() {
  if (!STAGE.cityLife) return; const shops = BLD.map((b, i) => ({ b, i })).filter(o => o.b.kind === 'shop' && !o.b.vacant);
  const area = b => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
  // 학교·병원: 가장 넓은 상가 둘 (특별한 곳은 빼고)
  const shopBld = new Set((S.shops || []).map(o => o.b));  /* 물건 파는 가게(철물·약국 …)는 이름을 바꾸지 않는다 — 문을 열면 그 가게 메뉴다 */
  const big = shops.filter(o => !KEEP_SIGNS.test(signOf(o.b)) && !shopBld.has(o.i) && !o.b.plateName && !o.b.name)   /* 조직 본부·사무실·지구대처럼 판에서 이름 붙인 건물은 빼고 (본부가 커져 병원이 되던 것) */.sort((p, q) => area(q.b) - area(p.b) || p.i - q.i);
  if (big[0]) { setSign(big[0].b, '을지초등학교'); big[0].b.school = true; big[0].b.plate = big[0].b.plateName = '교무실 · 행정실'; }
  if (big[1]) { setSign(big[1].b, '을지 중앙병원'); big[1].b.hospital = true; big[1].b.plate = big[1].b.plateName = '응급실 24시'; }
  // 빈 간판 채우기
  // 1층 실내가 이미 지어져 있으니 그 실내에 맞는 업종 이름만 고른다 (사무실 책상이 놓인 층에 '꽃집' 간판이 붙던 것)
  const fillN = {}; for (const { b } of shops) if (!signOf(b) && !b.school && !b.hospital) { const u = (b.floorsUse || [])[0] || 'store', L = FILL_BY_USE[u] || FILL_BY_USE.store; fillN[u] = (fillN[u] || 0) + 1; setSign(b, L[(fillN[u] - 1) % L.length]); }
  // 같은 이름 여럿: 둘째부터 상호를 붙인다 (편의점·PC방 같은 체인은 '○○점'). 이미 쓴 이름은 피한다
  const used = new Set(), seen = {};
  for (const { b, i } of shops) { const t = signOf(b); if (!t) continue;  /* CLUB 둘째부터는 'CLUB ○○점' (사건은 /^CLUB/ 로 찾는다). 물건 파는 가게는 상호만 붙는다 (메뉴는 S.shops 의 업종 이름으로 연다) */ const n = seen[t] = (seen[t] || 0) + 1; if (n === 1 && !used.has(t)) { used.add(t); continue; }
    const chain = /편의점|PC방|CLUB|약국/.test(t), base = t.replace(/^\S+\s/, '');
    for (let k = 0; k < SHOP_PREFIX.length * 2; k++) { const pf = SHOP_PREFIX[(i + n + k) % SHOP_PREFIX.length], nm = chain ? `${t} ${pf.replace('네', '')}점` : `${pf}${k >= SHOP_PREFIX.length ? ' 2호' : ''} ${base}`; if (!used.has(nm)) { setSign(b, nm); used.add(nm); break; } } }
  // 문패
  BLD.forEach((b, i) => { if (b.plate) return; if (b.kind === 'villa') b.plate = `${VILLA_NAMES[i % VILLA_NAMES.length]}빌라`; else if (b.kind === 'house') b.plate = `${HOUSE_NAMES[i % HOUSE_NAMES.length]}씨네`; });
  S.school = BLD.find(b => b.school) || null; S.hospital = BLD.find(b => b.hospital) || null;
  schoolKids();
}
const setSign = (b, n) => cozyRename(b, n);  /* 47zh 와 같은 이름 바꾸기 */
// 학교 앞 학생들: 가까운 행인 몇을 학생으로 (교문 앞을 오간다)
function schoolKids() {
  const b = S.school; if (!b) return; const p = shopFront(b); if (!p) return; let n = 0;
  for (const g of S.guards) { if (n >= 6) break; if (!g.civ || g.evt || g.crew || g.off || g.dog || g.home || g.wander) continue;
    g.outfit = 'student'; g.body = n % 2 ? 'kid' : 'hoodieCasual'; const k = (n * 53) % 120 - 60; g.x = p.x + k; g.y = p.y + 8 + (n * 7) % 22;  /* 시드 난수를 쓰지 않는다 (다른 시험 장면이 바뀌지 않게) */
    const side = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) && !solidAt(tx, ty) && G0[ty][tx] !== '=' && bldAt(tx, ty) < 0; };  /* 인도만 (차도로 나가면 차가 선다) */
    let wx = p.x + ((n * 97) % 440) - 220; for (let t = 0; t < 8 && !side(wx, p.y + 6); t++) wx = p.x + (wx - p.x) * 0.6; const w = side(wx, p.y + 6) ? { x: wx, y: p.y + 6 } : { x: p.x, y: p.y + 6 };
    g.y = p.y + 6; if (!side(g.x, g.y)) g.x = p.x; g.route = [{ x: g.x, y: g.y, pause: 2 + n % 4 }, { x: w.x, y: w.y, pause: 3 + n % 3 }]; g.ri = 1; g.path = null; g.student = true; n++; }
}
// 병원: 정문 앞에서 치료 (잃은 체력 한 칸당 20만)
function hospitalAction() {
  const b = S.hospital, P = S.player; if (!b || P.car || actionBusy(P)) return null; const p = shopFront(b); if (!p || dist(P.x, P.y, p.x, p.y) > 70) return null;
  const lost = (P.hpMax || 3) - P.hp; if (lost <= 0) return { k: 'evAct', label: '병원 · 다친 데 없다', at: { x: p.x, y: p.y - 50 }, fn: () => evBanner('간호사: "멀쩡하신데요?"', '#c8c0b0') };
  const cost = lost * 20;
  return { k: 'evAct', label: `치료받기 (${cost}만)`, at: { x: p.x, y: p.y - 50 }, fn: () => { if (!pay(cost)) { evBanner('(...지갑이 얇네.)', '#ff8a7a'); return; }
    doMotion({ dur: 1.4, pose: 'idle', at: [[0.4, () => play('door', 0.4)]], end: () => { P.hp = P.hpMax || 3; P.hurtT = 0; evBanner(`체력 ${P.hp}/${P.hpMax || 3} · 간호사: "...어쩌다 이렇게 다치셨어요?"`, '#9fe0b0'); fstat('hospital'); } }); } };
}
// 문패: 빌라·주택 정면 출입구 옆 작은 판
function drawHomePlate(b) {
  if (!b.plate || !STAGE.cityLife || (b.kind !== 'villa' && b.kind !== 'house')) return; const x0 = b.x0 * TILE, w = (b.x1 - b.x0 + 1) * TILE, y = b.y1 * TILE - 44; if (!inView(x0 + w / 2, y, w)) return;
  ctx.save(); ctx.font = '700 11px ' + UI_FONT_FAMILY; const tw = ctx.measureText(b.plate).width + 10, px = x0 + w / 2 + 34;  /* 출입문 차양 오른쪽 벽 */
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px + 1, y + 2, tw, 15); ctx.fillStyle = b.kind === 'villa' ? '#e8e2d0' : '#2c3a52'; ctx.fillRect(px, y, tw, 15);
  ctx.fillStyle = b.kind === 'villa' ? '#2a2620' : '#f2ead8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.plate, px + tw / 2, y + 8); ctx.restore();
}
function drawMiniPlaces(x, T) {
  for (const [b, c] of [[S.school, '#5ad08a'], [S.hospital, '#ff5a5a']]) { if (!b) continue; const p = shopFront(b); if (!p) continue; x.fillStyle = c; x.fillRect(T(p.x) - 3, T(p.y) - 1, 6, 2); x.fillRect(T(p.x) - 1, T(p.y) - 3, 2, 6); }
}
