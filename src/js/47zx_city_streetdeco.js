// ---------------------------------------------------------------- 자유 모드 거리 소품 (을지로의 밤): 지도에 없는 잔살림을 판 시작 때 한 번 정해 둔다
// 가게 앞(포차 플라스틱 탁자·맥주 상자·입간판·자판기·아이스크림 냉장고·종이 묶음), 집 앞(스티로폼 텃밭·재활용 봉투·배달 오토바이·자전거),
// 공장 마당(팔레트·컨테이너·드럼통), 주차장 칸 선, 공원(벤치·가로등·운동 기구·정자), 청계천 산책로 벤치, 공사장 고깔.
// 모두 바닥 장식이라 길을 막지 않는다(충돌 없음). 그림은 2px 칸 도트(작은 캔버스에 그려 흐림 없이 키운다), 화면 안 덩어리만 그린다.
const SD_PX = 3, SD_CH = 16;   // 도트 한 칸 = 3 월드 px (아틀라스 16px×3과 같은 굵기) · 공간 나눔 16칸
const SD_SCALE = { container: 2, pavilion: 2, pochaTable: 2.5 };   // 큰 것은 칸 수에 맞춰 조금 작게
const SD_SPR = {};
function sdSprite(key, w, h, paint) {
  if (SD_SPR[key]) return SD_SPR[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  paint(R, x); return (SD_SPR[key] = c);
}
const sdHash = (a, b, k = 0) => ((((a * 73856093) ^ (b * 19349663) ^ (k * 83492791)) >>> 0) % 1000) / 1000;
// ---- 그림 (색은 밤거리 기준으로 조금 눅인다). 키 뒤 숫자는 색 변형
const SD_ART = {
  pochaTable: v => sdSprite('pochaTable' + v, 22, 18, R => {   // 접이식 탁자 + 플라스틱 의자 넷
    const st = ['#c23a36', '#2f62b0', '#c23a36', '#2f62b0'], tb = v ? '#c9c4b8' : '#b8854a';
    [[0, 3], [18, 3], [0, 12], [18, 12]].forEach(([a, b], i) => { R(a, b + 1, 4, 4, '#1a1a20'); R(a, b, 4, 4, st[(i + v) % 4]); R(a + 1, b, 2, 1, '#f0b0a0'); });
    R(5, 5, 12, 10, '#1a1a20'); R(5, 4, 12, 9, tb); R(5, 4, 12, 1, '#ece6d8');
    R(7, 6, 2, 3, '#3a9a5a'); R(7, 6, 2, 1, '#a8e0b0'); R(13, 8, 3, 2, '#e8e2d2'); R(10, 9, 2, 2, '#d8a040'); R(14, 5, 1, 3, '#3a9a5a');
  }),
  crates: v => sdSprite('crates' + v, 10, 14, R => {   // 맥주·소주 상자 더미
    const c = v ? ['#2f8a4a', '#1f6a36'] : ['#d8a12a', '#a87a1a'];
    for (let k = 0; k < 3; k++) { const y = 10 - k * 4; R(0, y, 10, 4, '#14141a'); R(0, y, 10, 3, c[0]); R(1, y + 1, 8, 1, c[1]); R(2, y, 1, 3, c[1]); R(7, y, 1, 3, c[1]); }
  }),
  aboard: v => sdSprite('aboard' + v, 9, 14, R => {   // 입간판 (글씨는 흰 줄 몇 개로)
    const bg = ['#1c1c24', '#7a1f24', '#1f3a6a'][v % 3];
    R(0, 12, 2, 2, '#14141a'); R(7, 12, 2, 2, '#14141a'); R(0, 0, 9, 12, '#0e0e14'); R(1, 1, 7, 10, bg);
    R(2, 2, 5, 1, '#f2e6c0'); R(2, 4, 4, 1, '#e8e8e8'); R(2, 6, 5, 1, '#e8e8e8'); R(2, 8, 3, 1, '#ffd24a');
  }),
  vending: v => sdSprite('vending' + v, 12, 20, R => {   // 음료 자판기
    const body = ['#b62b36', '#2a5aa8', '#e8e2d6'][v % 3];
    R(0, 18, 12, 2, '#0e0e14'); R(0, 0, 12, 18, '#0e0e14'); R(1, 1, 10, 16, body); R(2, 2, 8, 8, '#d8e6f2');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) R(3 + k * 2, 3 + r * 2, 1, 1, ['#d83a3a', '#f0c030', '#3a9a5a', '#3a6ad8'][(k + r + v) % 4]);
    R(8, 11, 2, 3, '#1a1a20'); R(2, 14, 6, 2, '#1a1a20');
  }),
  freezer: () => sdSprite('freezer', 14, 10, R => {   // 아이스크림 냉장고
    R(0, 8, 14, 2, '#0e0e14'); R(0, 2, 14, 7, '#e8eef2'); R(1, 0, 12, 4, '#8ac8e8'); R(2, 1, 4, 1, '#d8f0ff'); R(0, 5, 14, 1, '#3a6ad8');
  }),
  bundles: v => sdSprite('bundles' + v, 12, 12, R => {   // 종이 묶음·택배 상자 (인쇄골목·공구상가)
    for (let k = 0; k < 3; k++) { const y = 8 - k * 4, x = (k % 2) * 2; R(x, y, 10, 4, '#14141a'); R(x, y, 10, 3, v ? '#e8e2d2' : '#b0844e'); R(x + 4, y, 1, 3, v ? '#c84a3a' : '#e0c8a0'); }
  }),
  styro: v => sdSprite('styro' + v, 12, 9, R => {   // 스티로폼 상자 텃밭 (고추·상추)
    R(0, 4, 12, 5, '#0e0e14'); R(0, 4, 12, 4, '#e8e8ec'); R(0, 4, 12, 1, '#ffffff');
    for (let k = 0; k < 5; k++) { R(1 + k * 2, 1 + (k % 2), 2, 3, k % 2 ? '#3a7a34' : '#5aa84a'); }
    if (v) { R(3, 2, 1, 2, '#d83a2a'); R(8, 1, 1, 2, '#d83a2a'); }
  }),
  recycle: () => sdSprite('recycle', 14, 10, R => {   // 재활용 봉투 · 납작한 상자
    R(0, 6, 14, 4, '#0e0e14'); R(0, 6, 9, 3, '#a8804a'); R(1, 6, 7, 1, '#c8a06a');
    R(5, 1, 6, 7, '#5a7ab0'); R(6, 1, 3, 1, '#9ab4e0'); R(9, 3, 5, 5, '#c8d0d8'); R(10, 3, 2, 1, '#f0f4f8');
  }),
  scooter: v => sdSprite('scooter' + v, 16, 10, R => {   // 배달 오토바이 (뒤에 배달통)
    const c = ['#c83a3a', '#e8e2d6', '#2a5aa8'][v % 3];
    R(1, 7, 3, 3, '#14141a'); R(12, 7, 3, 3, '#14141a'); R(3, 5, 10, 3, '#2a2a30'); R(4, 4, 7, 2, c);
    R(12, 2, 2, 4, '#3a3a40'); R(11, 1, 4, 1, '#7a7a80'); R(0, 0, 6, 5, '#d8d4c8'); R(0, 0, 6, 1, '#f0ece0'); R(1, 2, 4, 1, '#c83a3a');
  }),
  bike: () => sdSprite('bike', 16, 9, R => {   // 자전거
    for (const cx of [3, 12]) { R(cx - 2, 3, 4, 1, '#3a3a44'); R(cx - 2, 8, 4, 1, '#3a3a44'); R(cx - 3, 4, 1, 4, '#3a3a44'); R(cx + 2, 4, 1, 4, '#3a3a44'); }
    R(3, 5, 9, 1, '#2f8a8a'); R(6, 2, 1, 4, '#2f8a8a'); R(5, 1, 3, 1, '#14141a'); R(11, 1, 3, 1, '#9a9aa0');
  }),
  pallets: v => sdSprite('pallets' + v, 16, 12, R => {   // 팔레트 더미 (위에 포대)
    for (let k = 0; k < 3; k++) { const y = 9 - k * 3; R(0, y, 16, 3, '#14141a'); R(0, y, 16, 2, '#9a7a4a'); for (let j = 0; j < 4; j++) R(1 + j * 4, y, 2, 2, '#b8955e'); }
    if (v) { R(2, 0, 12, 3, '#e8e2d2'); R(3, 1, 10, 1, '#c8c0b0'); }
  }),
  drums: v => sdSprite('drums' + v, 14, 10, R => {   // 드럼통 둘
    const c = v ? ['#2a5aa8', '#4a7ad0'] : ['#a83a2a', '#c85a3a'];
    for (const ox of [0, 7]) { R(ox, 2, 7, 8, '#14141a'); R(ox, 2, 7, 7, c[0]); R(ox + 1, 2, 5, 2, c[1]); R(ox, 5, 7, 1, '#1a1a20'); }
  }),
  container: v => sdSprite('container' + v, 44, 22, R => {   // 화물 컨테이너 (가로 두 칸)
    const c = [['#2f5a8a', '#24486e'], ['#9a3a2a', '#7a2e22'], ['#4a7a4a', '#3a603a']][v % 3];
    R(0, 18, 44, 4, '#0e0e14'); R(0, 0, 44, 18, c[1]); R(0, 0, 44, 3, c[0]);
    for (let k = 2; k < 44; k += 4) R(k, 4, 2, 13, c[0]);
    R(38, 4, 1, 13, '#1a1a20'); R(40, 8, 2, 4, '#c8c0b0'); R(3, 7, 2, 2, '#c87a3a'); R(20, 12, 3, 2, '#7a4a2a');
  }),
  bench: v => sdSprite('bench' + v, 22, 10, R => {   // 벤치 (나무 살 셋)
    R(1, 8, 2, 2, '#14141a'); R(19, 8, 2, 2, '#14141a'); R(0, 6, 22, 3, '#1a1a20');
    for (let k = 0; k < 3; k++) R(0, k * 2 + (v ? 0 : 1), 22, 1, k % 2 ? '#a67a4a' : '#c8955a');
    R(0, 6, 22, 1, '#8a6038');
  }),
  lamp: () => sdSprite('lamp', 8, 32, R => {   // 공원·산책로 가로등
    R(3, 6, 2, 25, '#2a2e36'); R(2, 30, 4, 2, '#14141a'); R(0, 0, 8, 6, '#14141a'); R(1, 1, 6, 4, '#3a3e48'); R(2, 4, 4, 2, '#ffe6a0');
  }),
  gym: () => sdSprite('gym', 18, 14, R => {   // 야외 운동 기구 (노란 틀)
    R(1, 12, 16, 2, '#14141a'); R(1, 2, 2, 11, '#e0b020'); R(15, 2, 2, 11, '#e0b020'); R(1, 2, 16, 2, '#e0b020'); R(1, 2, 16, 1, '#f8d860');
    R(6, 6, 6, 2, '#3a6ad8'); R(8, 4, 2, 4, '#3a3e48'); R(5, 10, 8, 2, '#3a3e48');
  }),
  bollard: () => sdSprite('bollard', 14, 9, R => { for (const a of [1, 9]) { R(a, 7, 4, 2, '#14141a'); R(a, 1, 4, 7, '#b8bcc6'); R(a, 1, 4, 1, '#e8ecf2'); R(a, 4, 4, 1, '#d8a020'); } }),
  bin: v => sdSprite('bin' + v, 10, 13, R => {   // 길가 분리수거함 (일반·재활용)
    R(0, 11, 10, 2, '#14141a'); R(0, 2, 10, 10, v ? '#2f6a4a' : '#3a4a6a'); R(0, 0, 10, 3, '#1c1c24'); R(2, 1, 6, 1, '#0a0a10');
    R(1, 5, 8, 1, '#e8e8e8'); R(3, 7, 4, 3, v ? '#5aa87a' : '#6a8ad0');
  }),
  sign: v => sdSprite('sign' + v, 8, 22, R => {   // 도로 표지 (주정차 금지·어린이 보호 등)
    R(3, 8, 2, 13, '#7a7e88'); R(2, 20, 4, 2, '#14141a'); const c = ['#c83a3a', '#2f62b0', '#e0b020'][v % 3];
    R(0, 0, 8, 8, '#14141a'); R(1, 1, 6, 6, c); R(2, 3, 4, 2, '#f0f0f0');
  }),
  cone: () => sdSprite('cone', 6, 8, R => { R(0, 7, 6, 1, '#14141a'); R(0, 6, 6, 1, '#d8601a'); R(1, 2, 4, 4, '#f07a2a'); R(1, 3, 4, 1, '#f0f0f0'); R(2, 0, 2, 2, '#f07a2a'); }),
};
// 정자: 3×3칸 기와지붕 (사람은 밑으로 지나간다)
function sdPavilion() { return sdSprite('pavilion', 72, 66, R => {
  for (const [a, b] of [[6, 30], [62, 30], [6, 58], [62, 58]]) { R(a, b, 4, 8, '#14141a'); R(a, b, 4, 7, '#a83a2a'); }
  R(0, 4, 72, 30, '#14141a'); R(2, 2, 68, 28, '#3a3a44'); for (let k = 4; k < 68; k += 4) R(k, 3, 2, 26, '#4a4a56');
  R(0, 28, 72, 4, '#2a2a32'); R(30, 0, 12, 4, '#2a2a32'); R(2, 30, 68, 2, '#5a8a6a');
}); }
// ---- 배치: 판마다 한 번 (지도 칸만 보고 정하므로 매번 같은 자리)
let SD = null;
function sdInit() {
  const list = [], parkLines = [], add = (k, tx, ty, o = {}) => list.push(Object.assign({ k, x: tx * TILE, y: ty * TILE }, o));
  const at = (x, y) => inMap(x, y) ? G0[y][x] : '#', open = c => c === ',' || c === '=';
  const used = new Set(), take = (x, y, w = 1) => { for (let k = 0; k < w; k++) if (used.has((x + k) + ',' + y)) return false; for (let k = 0; k < w; k++) used.add((x + k) + ',' + y); return true; };
  const wallCh = c => '#NSXV'.includes(c), carNear = (x, y, r = 90) => (S.vehicles || []).some(v => Math.abs(v.x - (x + 0.5) * TILE) < r && Math.abs(v.y - (y + 0.5) * TILE) < r);
  const FOOD = /포차|호프|노가리|골뱅이|곱창|국밥|순댓국|백반|분식|치킨|족발|맥주|식당/, STORE = /편의점|마트|슈퍼|약국/, CRAFT = /인쇄|공구|철물|타일|조명|전파|지물|자재|상회|시장/;
  // 1) 건물 앞: 앞벽 칸(벽인 칸만 — 문·창 앞은 비운다) 바로 아래 한 칸이 맨땅·보도이면
  BLD.forEach((b, bi) => {
    if (b.vacant) return; const y = b.y1 + 1, sign = (b.signs?.[0] || '').trim(), up = (b.floorsUse || []).slice(1).some(u => u === 'pc' || u === 'karaoke' || u === 'billiards');
    const spots = []; for (let x = b.x0 + 1; x <= b.x1 - 1; x++) if (wallCh(at(x, b.y1)) && open(at(x, y)) && bldAt(x, y) < 0) spots.push(x);
    if (!spots.length) return; const pick = k => spots[Math.floor(sdHash(bi, k, 7) * spots.length)];
    const put = (k, x, w = 1, o) => { if (x != null && x + w - 1 <= b.x1 && !carNear(x, y, 60) && take(x, y, w)) add(k, x, y, Object.assign({ sy: -30 }, o)); };   // 앞벽에 붙여 세운다: 발밑이 칸 가운데보다 위라 지나가는 사람이 소품 앞으로 그려진다 (전엔 칸 아래쪽에 서 있어 사람이 소품을 뚫고 지나갔다)
    if (b.kind === 'shop') {
      if (FOOD.test(sign)) { const n = Math.min(2, Math.floor(spots.length / 3)); for (let k = 0; k < n; k++) put('pochaTable', pick(k), 1, { v: (bi + k) % 2, night: true }); put('crates', pick(5), 1, { v: bi % 2 }); }
      else if (STORE.test(sign)) { put('vending', pick(0), 1, { v: bi % 3, glow: true }); if (/편의점|마트|슈퍼/.test(sign)) put('freezer', pick(1)); }
      else if (CRAFT.test(sign)) { put('bundles', pick(0), 1, { v: bi % 2 }); put('bundles', pick(3), 1, { v: (bi + 1) % 2 }); if (sdHash(bi, 2) < 0.5) put('scooter', pick(4), 1, { v: bi % 3 }); }
      if (sign && sdHash(bi, 9) < 0.7) put('aboard', pick(2), 1, { v: bi % 3, glow: up });
      if (up) put('aboard', pick(6), 1, { v: (bi + 1) % 3, glow: true });
      if (sdHash(bi, 11) < 0.35) put('vending', pick(8), 1, { v: (bi + 2) % 3, glow: true });
    } else {   // 집·빌라 앞
      if (sdHash(bi, 1) < 0.7) put('styro', pick(0), 1, { v: bi % 2 });
      if (sdHash(bi, 2) < 0.6) put('recycle', pick(1));
      if (sdHash(bi, 3) < 0.45) put('scooter', pick(2), 1, { v: bi % 3 });
      else if (sdHash(bi, 4) < 0.5) put('bike', pick(3));
    }
  });
  // 1-2) 보도 연석가: 블록 둘레 보도('=')가 차도와 맞닿는 칸에 띄엄띄엄 볼라드·분리수거함·표지판 (모퉁이·횡단보도 근처는 비운다)
  // 공중전화 부스 칸과 그 둘레 한 칸은 비운다 (부스 위에 표지판·수거함이 겹쳐 그려지던 것)
  const booths = (STAGE.phones || []).map(([x, y]) => [Math.floor(x), Math.floor(y)]), booth = (x, y) => booths.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1);
  { const [BX0, BY0] = STAGE.blockCount || [0, 0], BS0 = STAGE.blockSize || 0;
    for (let by = 0; by < BY0; by++) for (let bx = 0; bx < BX0; bx++) { const [x0, y0] = STAGE.blockOrigin(bx, by), e = BS0 - 1;
      const side = (pts, off) => pts.forEach(([x, y], i) => { if (i < 3 || i > pts.length - 4 || at(x, y) !== '=' || bldAt(x, y) >= 0 || booth(x, y)) return; const h = sdHash(x, y, 13); if (h > 0.16 || !take(x, y)) return;
        add(h < 0.06 ? 'bollard' : h < 0.12 ? 'bin' : 'sign', x, y, Object.assign({ v: (x + y) % 3 }, off)); });   // 연석 쪽(차도 쪽)으로 붙인다: 칸 가운데를 걷는 행인과 겹치지 않게 · 공중전화 부스 칸과 둘레는 비운다
      const N = [], S2 = [], Wl = [], E = []; for (let k = 0; k <= e; k++) { N.push([x0 + k, y0]); S2.push([x0 + k, y0 + e]); Wl.push([x0, y0 + k]); E.push([x0 + e, y0 + k]); }
      side(N, { sy: -36 }); side(S2, {}); side(Wl, { sx: -15 }); side(E, { sx: 15 }); } }
  // 2) 블록 안 마당: 주차된 차(A 두 칸) 옆 주차선 · 공장지대 맨땅엔 팔레트·드럼통·컨테이너 · 공원(풀밭이 많은 블록)엔 벤치·가로등·운동 기구·정자
  const [BX, BY] = STAGE.blockCount || [0, 0], BS = STAGE.blockSize || 0;
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    const [x0, y0] = STAGE.blockOrigin(bx, by), x1 = x0 + BS - 1, y1 = y0 + BS - 1, dname = STAGE.districtAt?.(x0 + 2, y0 + 2) || '';
    let grass = 0; for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) if (at(x, y) === 'g') grass++;
    const park = grass > (BS - 2) * (BS - 2) * 0.3, factory = /공장/.test(dname);
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
      const c = at(x, y); if (bldAt(x, y) >= 0) continue;
      if (c === 'A' && at(x, y + 1) === 'A' && at(x, y - 1) !== 'A') parkLines.push([(x + 0.5) * TILE, (y + 1) * TILE, true]);   // 차 한 대 = 세로 두 칸
      if (factory && c === '.' && sdHash(x, y, 3) < 0.13 && !carNear(x, y, 72)) {
        const free = (w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = at(x + i, y + j); if (q !== '.' || bldAt(x + i, y + j) >= 0 || used.has((x + i) + ',' + (y + j))) return false; } return true; };
        const r = sdHash(x, y, 5);
        if (r < 0.3 && free(2, 2)) { for (let j = 0; j < 2; j++) take(x, y + j, 2); add('container', x, y, { v: (x + y) % 3 }); }
        else if (r < 0.65 && free(1, 1)) { take(x, y); add('pallets', x, y, { v: (x * 3 + y) % 2 }); }
        else if (free(1, 1)) { take(x, y); add('drums', x, y, { v: (x + y * 3) % 2 }); }
      }
      if (c === 'U') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const q = at(x + dx, y + dy); if ((q === ',' || q === '.') && take(x + dx, y + dy)) add('cone', x + dx, y + dy); }   // 공사장 구덩이 둘레 고깔
    }
    if (park) {
      for (let y = y0 + 2; y < y1 - 1; y++) for (let x = x0 + 2; x < x1 - 1; x++) {
        if (at(x, y) !== 'g') continue; const nearPath = ['=', ','].includes(at(x, y + 1)) ? 's' : ['=', ','].includes(at(x, y - 1)) ? 'n' : ['=', ','].includes(at(x + 1, y)) || ['=', ','].includes(at(x - 1, y)) ? 'e' : null;
        if (!nearPath) continue;
        if ((x + y) % 5 === 0 && nearPath !== 'e' && at(x + 1, y) === 'g' && take(x, y, 2)) add('bench', x, y, { v: (x + y) % 2 });
        else if ((x * 3 + y) % 7 === 0 && take(x, y)) add('lamp', x, y, { glow: true });
      }
      // 운동 기구 한 무더기 · 정자 하나: 나무 없는 3×3 풀밭
      let gymDone = false, pavDone = false;
      for (let y = y0 + 2; y < y1 - 3 && !(gymDone && pavDone); y++) for (let x = x0 + 2; x < x1 - 3 && !(gymDone && pavDone); x++) {
        let ok = true; for (let j = 0; j < 3 && ok; j++) for (let i = 0; i < 3; i++) if (at(x + i, y + j) !== 'g' || used.has((x + i) + ',' + (y + j))) { ok = false; break; }
        if (!ok) continue; for (let j = 0; j < 3; j++) take(x, y + j, 3);
        if (!pavDone && x > x0 + BS / 2) { pavDone = true; add('pavilion', x, y); }
        else if (!gymDone) { gymDone = true; add('gym', x, y); add('gym', x + 1, y + 2); }
      }
    }
  }
  // 주차된 차(판 시작 때 세워 둔 차) 둘레 주차 칸: 도로가 아닌 블록 안 맨땅·아스팔트에 선 차만
  const onRoad = (tx, ty) => (STAGE.roadsX || []).some(r => tx >= r && tx < r + 4) || (STAGE.roadsY || []).some(r => ty >= r && ty < r + 4);
  for (const v of S.vehicles || []) { if (!v.parked) continue; const tx = Math.floor(v.x / TILE), ty = Math.floor(v.y / TILE); if (onRoad(tx, ty) || bldAt(tx, ty) >= 0) continue; parkLines.push([v.x, v.y, Math.abs(Math.sin(v.a || 0)) > 0.7]); }
  // 3) 청계천 남쪽 산책로: 난간 앞 벤치와 가로등 (다리 칸은 뺀다)
  const Rv = STAGE.river; if (Rv) { const yy = Rv.y + Rv.rows - 3; for (let x = 4; x < MW - 4; x++) { if (at(x, yy) !== '=' || at(x + 1, yy) !== '=' || at(x, yy - 1) !== '¦') continue;
    if (x % 9 === 3 && take(x, yy, 2)) add('bench', x, yy, { v: 1 }); else if (x % 9 === 7 && take(x, yy)) add('lamp', x, yy, { glow: true }); } }
  // 공간 나눔
  const grid = new Map(); for (const o of list) { const k = Math.floor(o.x / TILE / SD_CH) + ',' + Math.floor(o.y / TILE / SD_CH); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); }
  for (const a of grid.values()) a.sort((p, q) => p.y - q.y);
  SD = { stage: STAGE.id, list, grid, parkLines };
}
function sdVisible(fn) {
  const vw = W / SCALE / 2 + 160, vh = H / SCALE / 2 + 160, cx0 = Math.floor((cam.x - vw) / TILE / SD_CH), cx1 = Math.floor((cam.x + vw) / TILE / SD_CH), cy0 = Math.floor((cam.y - vh) / TILE / SD_CH), cy1 = Math.floor((cam.y + vh) / TILE / SD_CH);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const a = SD.grid.get(cx + ',' + cy); if (a) for (const o of a) if (inView(o.x + TILE / 2, o.y + TILE / 2, 80)) fn(o); }
}
// 땅 단계 (사람·차보다 먼저): 주차선과 소품
function drawStreetDeco() {
  if (!STAGE.cityLife || CUR_F || !G0) return; if (!SD || SD.stage !== STAGE.id) sdInit();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(214,218,226,.55)';   // 주차선: 차 칸 양옆 세로선 + 앞쪽 가로선 (2px 굵기)
  for (const [cx, cy, vert] of SD.parkLines) { if (!inView(cx, cy, 90)) continue; const hw = vert ? 33 : 54, hh = vert ? 54 : 33;   // 차 칸: 양옆 선 + 앞쪽 끝선
    if (vert) { ctx.fillRect(cx - hw, cy - hh, 3, hh * 2); ctx.fillRect(cx + hw - 3, cy - hh, 3, hh * 2); ctx.fillRect(cx - hw, cy + hh - 3, hw * 2, 3); }
    else { ctx.fillRect(cx - hw, cy - hh, hw * 2, 3); ctx.fillRect(cx - hw, cy + hh - 3, hw * 2, 3); ctx.fillRect(cx + hw - 3, cy - hh, 3, hh * 2); } }
  sdVisible(o => {
    const k = SD_SCALE[o.k] || SD_PX;
    if (o.k === 'pavilion') { ctx.drawImage(sdPavilion(), o.x, o.y + 4, 72 * k, 66 * k); return; }
    const s = SD_ART[o.k](o.v || 0), w = s.width * k, h = s.height * k;
    const bx = (o.k === 'container' ? o.x + 4 : o.x + (TILE - w) / 2) + (o.sx || 0), by = o.y + TILE - h + (o.k === 'lamp' ? 6 : 4) + (o.sy || 0);
    ctx.drawImage(s, Math.round(bx), Math.round(by), w, h);
  });
  ctx.restore();
}
// 어둠 뒤 단계: 자판기 앞면·불 켜진 입간판·가로등 불빛·포차 탁자 위 알전구 (스스로 빛나는 것만, 도트 칸으로)
function drawStreetDecoGlow() {
  if (!STAGE.cityLife || CUR_F || !SD) return; const night = (STAGE.nightShade ?? 0.6) > 0.3; if (!night) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  sdVisible(o => {
    const k = SD_SCALE[o.k] || SD_PX, box = (sw, sh, dy) => [o.x + (TILE - sw * k) / 2 + (o.sx || 0), o.y + TILE - sh * k + dy + (o.sy || 0)];
    if (o.k === 'vending') { const [x, y] = box(12, 20, 4); ctx.fillStyle = 'rgba(200,225,255,.35)'; ctx.fillRect(x + 2 * k, y + 2 * k, 8 * k, 8 * k); ctx.fillStyle = 'rgba(160,200,255,.12)'; ctx.fillRect(x - 2 * k, y + 18 * k, 16 * k, 4 * k); }
    else if (o.k === 'aboard' && o.glow) { const [x, y] = box(9, 14, 4); ctx.fillStyle = 'rgba(255,220,150,.28)'; ctx.fillRect(x + k, y + k, 7 * k, 10 * k); }
    else if (o.k === 'lamp') { const [x, y] = box(8, 32, 6); ctx.fillStyle = 'rgba(255,226,150,.5)'; ctx.fillRect(x + 2 * k, y + 4 * k, 4 * k, 2 * k); ctx.fillStyle = 'rgba(255,214,140,.06)'; for (let j = 0; j < 3; j++) ctx.fillRect(x - (2 + j * 3) * k, y + (29 - j) * k, (12 + j * 6) * k, (3 + j * 2) * k); }
    else if (o.k === 'pochaTable') { const [x, y] = box(22, 18, 4); ctx.fillStyle = 'rgba(255,190,110,.14)'; ctx.fillRect(x - 2 * k, y - k, 26 * k, 20 * k); ctx.fillStyle = 'rgba(255,230,170,.6)'; for (let j = 0; j < 4; j++) ctx.fillRect(x + (2 + j * 6) * k, y - 3 * k, k, k); }
  });
  ctx.restore();
}
