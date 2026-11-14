// ---------------------------------------------------------------- 자유 모드 살아 있는 잔디테일 (을지로의 밤): 들여다볼수록 보이는 것들
// 골목 고양이(담 밑에 앉아 꼬리를 흔들다 다가가면 달아난다) · 비둘기 떼(공원·산책로·가게 앞에서 쪼다가 뛰거나 차가 오거나 총소리가 나면 푸드덕 날아간다)
// 하수구·식당 앞 김 · 가로등 둘레 날벌레 · 비 올 때 웅덩이(네온이 비치고 빗방울 고리가 퍼진다) · 자판기 불빛이 숨 쉬듯 깜빡임.
// 자리는 판 시작 때 지도에서 한 번 정하고(같은 판이면 늘 같은 자리), 화면 안 덩어리만 그린다. 충돌·사람 행동·스토리와는 무관하다.
// 그림은 3px 칸 도트(작은 캔버스를 흐림 없이 키움) — 그라데이션·원 없이 사각형만.
const AM_PX = 3, AM_CH = 16;
const amHash = (a, b, k = 0) => ((((a * 2654435761) ^ (b * 40503) ^ (k * 97531)) >>> 0) % 10000) / 10000;
const AM_SPR = {};
function amArt(key, rows, pal) {   // rows: 문자 그림, pal: 문자 → 색
  if (AM_SPR[key]) return AM_SPR[key];
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  return (AM_SPR[key] = c);
}
// ---- 고양이: 앉음(꼬리 둘) · 달림(둘). 털색 넷
const CAT_COAT = [{ b: '#16161c', d: '#0a0a0e', e: '#d8e04a' }, { b: '#d88a3a', d: '#a85a1e', e: '#5ac04a' }, { b: '#8a8c94', d: '#5c5e66', e: '#e0c040' }, { b: '#ece6da', d: '#2a2a30', e: '#4aa0e0' }];
const CAT_SIT = [['.d...d...', '.bb.bb...', '.bebeb...', '..bbb....', '..bbbb...', '.bbbbbb..', '.bbbbbbt.', '.bb..bbt.', '........t'],
                 ['.d...d...', '.bb.bb...', '.bebeb...', '..bbb....', '..bbbb...', '.bbbbbb..', '.bbbbbb..', '.bb..bbtt', '.......t.']];
const CAT_RUN = [['.......d.d', 't.....bbbb', '.tbbbbbbeb', '..bbbbbbb.', '..b.b..b.b'],
                 ['t......d.d', '.t....bbbb', '..bbbbbbeb', '..bbbbbbb.', '...bb.bb..']];
const catArt = (coat, run, f) => { const C = CAT_COAT[coat], rows = (run ? CAT_RUN : CAT_SIT)[f];
  return amArt('cat' + coat + run + f, rows, { b: C.b, d: C.d, e: C.e, t: C.d === '#2a2a30' ? C.d : C.d }); };
// ---- 비둘기: 쪼기(고개 듦·숙임) · 날기(날개 위·아래)
const PIG_PAL = { g: '#7a7e8c', d: '#4a4e5a', n: '#5a9a8a', w: '#b8bcc8', o: '#d86a3a', k: '#1a1a20' };
const PIG = { up: ['..dd..', '.dnd..', 'oggg..', '.gggg.', '.gwggd', '..k.k.'], down: ['......', '..dd..', '.dndg.', 'oggggd', '.gwgg.', '..k.k.'],
  fa: ['w....w', 'ww..ww', '.wggw.', '..gg..', '...o..'], fb: ['......', '..gg..', 'wwggww', 'w.oo.w', '......'] };
const pigArt = k => amArt('pig' + k, PIG[k], PIG_PAL);
let AM = null;
function amInit() {
  const at = (x, y) => (G0[y] || '')[x] || '#', list = [], used = new Set();
  const free = (x, y) => !used.has(x + ',' + y);
  const add = o => { list.push(o); used.add(o.tx + ',' + o.ty); };
  // 고양이: 건물 앞벽 밑 보도 칸(위가 건물, 칸은 보도) · 블록 안 맨땅의 주차된 차 옆 — 50마리 남짓
  let cats = 0;
  for (let y = 2; y < MH - 2 && cats < 70; y++) for (let x = 2; x < MW - 2 && cats < 70; x++) {
    if (at(x, y) !== '=' || bldAt(x, y) >= 0 || bldAt(x, y - 1) < 0 || amHash(x, y, 1) > 0.04 || !free(x, y)) continue;
    add({ k: 'cat', tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.55) * TILE, coat: (x * 3 + y) % 4, hx: (x + 0.5) * TILE, hy: (y + 0.55) * TILE, st: 'sit', t0: amHash(x, y, 2) * 9 }); cats++; }
  // 블록 안 주차된 차 옆에 웅크린 고양이 (차 밑 그늘에서 나와 앉은 것처럼, 넷 중 하나)
  const onRoad = (tx, ty) => (STAGE.roadsX || []).some(r => tx >= r && tx < r + 4) || (STAGE.roadsY || []).some(r => ty >= r && ty < r + 4);
  for (const v of S.vehicles || []) { if (cats >= 70 || !v.parked) continue; const tx = Math.floor(v.x / TILE), ty = Math.floor(v.y / TILE); if (onRoad(tx, ty) || bldAt(tx, ty) >= 0 || amHash(tx, ty, 17) > 0.25) continue;
    const x = v.x + (amHash(tx, ty, 18) < 0.5 ? -44 : 44), y = v.y + 30, gx = Math.floor(x / TILE), gy = Math.floor(y / TILE); if (bldAt(gx, gy) >= 0 || !free(gx, gy)) continue;
    add({ k: 'cat', tx: gx, ty: gy, x, y, coat: (tx + ty) % 4, hx: x, hy: y, st: 'sit', t0: amHash(tx, ty, 19) * 9 }); cats++; }
  // 비둘기 떼: 공원 풀밭 가장자리 · 청계천 산책로 · 식당 앞 보도 (떼마다 3~5마리)
  const flock = (x, y) => { const n = 3 + Math.floor(amHash(x, y, 4) * 3), birds = [];
    for (let i = 0; i < n; i++) birds.push({ dx: (amHash(x, y, 10 + i) - 0.5) * 70, dy: (amHash(x, y, 20 + i) - 0.5) * 34, ph: amHash(x, y, 30 + i) * 6, fl: amHash(x, y, 40 + i) < 0.5 ? -1 : 1 });
    add({ k: 'pig', tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, birds, st: 'peck' }); };
  let flocks = 0;
  const R = STAGE.river; if (R) for (let x = 6; x < MW - 6 && flocks < 10; x += 17) { const y = R.y; if (at(x, y) === '=' && amHash(x, y, 5) < 0.6) { flock(x, y); flocks++; } }
  for (let y = 2; y < MH - 2 && flocks < 30; y++) for (let x = 2; x < MW - 2 && flocks < 30; x++) {
    const c = at(x, y); if (bldAt(x, y) >= 0 || !free(x, y)) continue;
    if (c === 'g' && ['=', ','].includes(at(x, y + 1)) && amHash(x, y, 6) < 0.025) { flock(x, y); flocks++; }
    else if (c === '=' && bldAt(x, y - 1) >= 0 && amHash(x, y, 7) < 0.004) { flock(x, y); flocks++; } }
  // 김: 맨홀('W') · 식당 앞 (간판으로 고른다)
  const FOOD = /포차|호프|곱창|골뱅이|노가리|국밥|백반|분식|순댓국|치킨|식당|반점|중국집|족발|횟집|주점|맛집|라면|김밥/;
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (at(x, y) === 'W' && amHash(x, y, 8) < 0.7) add({ k: 'steam', tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, sz: 1, ph: amHash(x, y, 9) * 4 });
  BLD.forEach((b, bi) => { if (b.kind !== 'shop' || b.vacant || !FOOD.test((b.signs || [])[0] || '')) return; const p = typeof shopFront === 'function' ? shopFront(b) : null; if (!p) return;
    const x = Math.floor(p.x / TILE) + 1, y = Math.floor(b.y1); add({ k: 'steam', tx: x, ty: y, x: p.x + TILE * 0.9, y: (b.y1 + 0.85) * TILE, sz: 0.8, ph: amHash(bi, 1, 9) * 4, kitchen: true }); });
  // 웅덩이: 보도·차도 가장자리 (비 올 때만 보인다). 비치는 네온 색은 자리마다
  const NEON = ['255,80,170', '80,220,255', '255,190,90', '150,110,255', '120,255,160'];
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) { const c = at(x, y); if (!(c === '=' || c === '.') || bldAt(x, y) >= 0 || amHash(x, y, 11) > 0.009 || used.has(x + ',' + y)) continue;
    add({ k: 'pud', tx: x, ty: y, x: (x + amHash(x, y, 12) * 0.5) * TILE, y: (y + 0.3 + amHash(x, y, 13) * 0.4) * TILE, w: 9 + Math.floor(amHash(x, y, 14) * 7), neon: NEON[Math.floor(amHash(x, y, 15) * NEON.length)], ph: amHash(x, y, 16) * 3 }); }
  const grid = new Map(); for (const o of list) { const k = Math.floor(o.tx / AM_CH) + ',' + Math.floor(o.ty / AM_CH); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); }
  AM = { stage: STAGE.id, list, grid, gunT: S.gunT, t: 0 };
}
function amVisible(fn, m = 120) {
  const vw = W / SCALE / 2 + 200, vh = H / SCALE / 2 + 200, cx0 = Math.floor((cam.x - vw) / TILE / AM_CH), cx1 = Math.floor((cam.x + vw) / TILE / AM_CH), cy0 = Math.floor((cam.y - vh) / TILE / AM_CH), cy1 = Math.floor((cam.y + vh) / TILE / AM_CH);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const a = AM.grid.get(cx + ',' + cy); if (a) for (const o of a) if (inView(o.x, o.y, m)) fn(o); }
}
// ---- 움직임: 화면 둘레만 (고양이 달아나기 · 비둘기 날기). 0.1초마다
function amUpdate() {
  if (!STAGE.cityLife || !AM || AM.stage !== STAGE.id || CUR_F) return;
  const P = S.player, car = P.car, lp = AM.lp || { x: P.x, y: P.y, t: S.t }, el = Math.max(0.05, S.t - lp.t), pv = dist(P.x, P.y, lp.x, lp.y) / el; AM.lp = { x: P.x, y: P.y, t: S.t };
  const fast = car ? Math.abs(car.v || 0) > 120 : pv > 200 && pv < 2000, shot = S.gunT !== AM.gunT && S.gunT > S.t - 1; AM.gunT = S.gunT;   // 뛰는지는 실제 움직인 속도로 (순간이동은 빼고)
  amVisible(o => {
    const d = dist(o.x, o.y, P.x, P.y);
    if (o.k === 'cat') {
      if (o.st === 'sit' && (d < (fast ? 170 : 95) || (shot && d < 600))) { o.st = 'run'; o.rt = S.t; o.dir = (o.x >= P.x ? 1 : -1); }
      else if (o.st === 'run') { const e = S.t - o.rt; o.x = o.hx + o.dir * e * 270; if (e > 1.6) o.st = 'gone'; }
      else if (o.st === 'gone' && S.t - o.rt > 35 && !inView(o.hx, o.hy, 60) && dist(o.hx, o.hy, P.x, P.y) > 500) { o.st = 'sit'; o.x = o.hx; o.y = o.hy; }
    } else if (o.k === 'pig') {
      if (o.st === 'peck' && (d < (fast ? 190 : 70) || (shot && d < 700) || (car && d < 230 && Math.abs(car.v || 0) > 40))) { o.st = 'fly'; o.ft = S.t; o.fdir = Math.atan2(o.y - P.y, o.x - P.x); }
      else if (o.st === 'fly' && S.t - o.ft > 2.2) o.st = 'gone';
      else if (o.st === 'gone' && S.t - o.ft > 28 && !inView(o.x, o.y, 60)) o.st = 'peck';
    }
  }, 260);
}
// ---- 땅 단계: 웅덩이(비) · 고양이 · 비둘기 (사람·차보다 먼저 = 발밑)
function drawAmbientGround() {
  if (!STAGE.cityLife || CUR_F || !G0) return; if (!AM || AM.stage !== STAGE.id) amInit();
  const t = S.t, rk = typeof rainK === 'function' ? rainK() : 0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  amVisible(o => {
    if (o.k === 'pud') { if (rk < 0.05) return; const w = o.w, px = AM_PX, x0 = Math.round(o.x), y0 = Math.round(o.y);
      // 도트 타원: 줄마다 폭을 줄인다 (가운데 3줄)
      ctx.fillStyle = `rgba(14,20,34,${0.7 * rk})`; ctx.fillRect(x0, y0, w * px * 2, px * 2); ctx.fillRect(x0 + px * 2, y0 - px, (w - 2) * px * 2, px); ctx.fillRect(x0 + px * 2, y0 + px * 2, (w - 2) * px * 2, px);
      ctx.fillStyle = `rgba(${o.neon},${0.5 * rk})`; ctx.fillRect(x0 + px * 3, y0, (w - 3) * px, px); ctx.fillStyle = `rgba(${o.neon},${0.25 * rk})`; ctx.fillRect(x0 + px * 5, y0 + px, (w - 6) * px, px);   // 비친 네온 한 줄
      ctx.fillStyle = `rgba(210,225,245,${0.35 * rk})`; ctx.fillRect(x0 + w * px, y0 + px, px * 3, px);
      const r = ((t + o.ph) % 0.9) / 0.9, rw = Math.round(2 + r * (w - 2)), cx = x0 + w * px, a = (1 - r) * 0.55 * rk;   // 빗방울 고리: 네모 테두리가 퍼진다
      ctx.fillStyle = `rgba(200,220,245,${a})`; ctx.fillRect(cx - rw * px / 2, y0 - px / 2, rw * px, px / 2); ctx.fillRect(cx - rw * px / 2, y0 + px * 1.5, rw * px, px / 2);
      ctx.fillRect(cx - rw * px / 2, y0, px / 2, px * 1.5); ctx.fillRect(cx + rw * px / 2 - px / 2, y0, px / 2, px * 1.5); return; }
    if (o.k === 'cat') {
      if (o.st === 'gone') return;
      if (o.st === 'run') { const el = S.t - o.rt, rx = o.hx + o.dir * el * 270; if (el > 1.6) return;
        const s = catArt(o.coat, 1, Math.floor(el * 12) % 2), w = s.width * AM_PX, h = s.height * AM_PX; ctx.save(); ctx.translate(Math.round(rx), Math.round(o.y)); if (o.dir < 0) ctx.scale(-1, 1); ctx.drawImage(s, -w / 2, -h, w, h); ctx.restore(); return; }
      const f = Math.floor((t + o.t0) * 1.5) % 2, s = catArt(o.coat, 0, f), w = s.width * AM_PX, h = s.height * AM_PX;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(o.x - w / 2), Math.round(o.y - 2), w, 3);
      ctx.drawImage(s, Math.round(o.x - w / 2), Math.round(o.y - h), w, h); return; }
    if (o.k === 'pig') {
      if (o.st === 'gone') return; const fly = o.st === 'fly', el = fly ? S.t - o.ft : 0; if (fly && el > 2.2) return;
      for (const b of o.birds) {
        let bx = o.x + b.dx + Math.sin(t * 0.4 + b.ph) * 8, by = o.y + b.dy, key;
        if (fly) { const sp = 210 + b.ph * 20, a = o.fdir + (b.ph - 3) * 0.12; bx += Math.cos(a) * sp * el; by += Math.sin(a) * sp * el - el * el * 60; key = Math.floor(el * 14 + b.ph) % 2 ? 'fa' : 'fb'; }
        else key = Math.floor(t * 2.2 + b.ph) % 3 === 0 ? 'down' : 'up';
        const s = pigArt(key), w = s.width * AM_PX, h = s.height * AM_PX;
        if (!fly) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(Math.round(bx - w / 2 + 2), Math.round(by - 2), w - 4, 3); }
        ctx.save(); ctx.translate(Math.round(bx), Math.round(by)); if (b.fl < 0) ctx.scale(-1, 1); ctx.drawImage(s, -w / 2, -h, w, h); ctx.restore(); } }
  });
  ctx.restore();
}
// ---- 위 단계(어둠 뒤): 김(도트 덩어리가 피어오르며 흩어진다) · 가로등 날벌레 · 자판기 숨 쉬는 불빛
function drawAmbientAbove() {
  if (!STAGE.cityLife || CUR_F || !AM || AM.stage !== STAGE.id) return;
  const t = S.t, px = AM_PX; ctx.save();
  amVisible(o => { if (o.k !== 'steam') return;
    for (let i = 0; i < 4; i++) { const p = ((t * 0.45 + o.ph + i / 4) % 1), x = o.x + Math.sin((p + i) * 5 + o.ph) * 10 * p, y = o.y - p * 70 * o.sz, s = Math.round((3 + p * 5) * o.sz), a = (o.kitchen ? 0.5 : 0.42) * (1 - p) * Math.min(1, p * 5);
      ctx.fillStyle = `rgba(214,220,230,${a})`; const gx = Math.round(x / px) * px, gy = Math.round(y / px) * px;
      ctx.fillRect(gx - s * px / 2, gy, s * px, px * 2); ctx.fillRect(gx - (s - 2) * px / 2, gy - px, (s - 2) * px, px); ctx.fillRect(gx - (s - 2) * px / 2, gy + px * 2, (s - 2) * px, px); } });
  if ((STAGE.nightShade ?? 0.6) > 0.3 && typeof SD !== 'undefined' && SD && SD.stage === STAGE.id && typeof sdVisible === 'function') {
    ctx.globalCompositeOperation = 'lighter';
    sdVisible(o => { if (o.down) return;
      if (o.k === 'lamp') {   // 날벌레 셋: 등 머리 둘레를 8자로 맴돈다 (1칸 도트)
        const k = 3, lx = o.x + TILE / 2 + (o.sx || 0), ly = o.y + TILE - 32 * k + 6 + 4 * k + (o.sy || 0);
        ctx.fillStyle = 'rgba(255,240,200,.75)';
        for (let i = 0; i < 3; i++) { const a = t * (2.3 + i * 0.7) + i * 2.1; ctx.fillRect(Math.round((lx + Math.sin(a) * (10 + i * 4)) / 2) * 2, Math.round((ly + Math.sin(a * 2) * (5 + i * 2)) / 2) * 2, 2, 2); } }
      else if (o.k === 'vending') {   // 자판기: 앞면 불빛이 천천히 숨 쉬고, 동전 넣는 곳 초록 불이 깜빡인다
        const k = 3, x = o.x + (TILE - 12 * k) / 2 + (o.sx || 0), y = o.y + TILE - 20 * k + 4 + (o.sy || 0), br = 0.5 + 0.5 * Math.sin(t * 1.7 + o.x * 0.01);
        ctx.fillStyle = `rgba(190,215,255,${0.06 + 0.1 * br})`; ctx.fillRect(x + 2 * k, y + 2 * k, 8 * k, 8 * k);
        if (Math.floor(t * 2 + o.y * 0.01) % 2) { ctx.fillStyle = 'rgba(90,255,140,.8)'; ctx.fillRect(x + 8 * k, y + 11 * k, k, k); } }
    });
  }
  ctx.restore();
}
// 거리 소품 그리기에 붙인다 (frame.js는 손대지 않는다): 땅 단계 = 소품 다음, 위 단계 = 소품 불빛 다음
if (typeof drawStreetDeco === 'function') { const _d = drawStreetDeco; drawStreetDeco = function () { const r = _d.apply(this, arguments); drawAmbientGround(); return r; }; }
if (typeof drawStreetDecoGlow === 'function') { const _g = drawStreetDecoGlow; drawStreetDecoGlow = function () { const r = _g.apply(this, arguments); drawAmbientAbove(); return r; }; }
if (typeof cityUpdate === 'function') { const _cu = cityUpdate; cityUpdate = function (dt) { const r = _cu.apply(this, arguments); if (AM && ((AM.t -= dt) <= 0)) { AM.t = 0.1; amUpdate(); } return r; }; }
