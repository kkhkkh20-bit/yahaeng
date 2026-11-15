// ---------------------------------------------------------------- 자유 모드 옷차림: 사람마다 다른 옷 (밤 을지로 거리)
// 고정 팔레트 20벌 대신, 사람마다(번호로 정해진 대로) '차림새'를 고르고 그 차림새에 어울리는 색 묶음에서 웃옷·아래옷·신발·머리·피부를 고른다.
// 차림새는 체형에 맞춘다 (정장 체형 → 회사원, 후드 → 캐주얼·스트릿, 노인 → 어르신, 헬멧 → 배달). 비 오면 어두운 겉옷이, 유흥가 늦은 밤엔 약속 차림이 늘어난다.
// 팔레트 열쇠('cv' + 색 번호들)는 처음 그릴 때 PR_PAL 에 등록해 기존 칠하기(prPalette·prSheet·prWarm)를 그대로 쓴다.
// 칠한 시트(prVar)는 열쇠마다 2~3MB라 오래 안 쓴 것은 비운다 (outfitEvict) — 종류는 늘려도 메모리는 일정하다.
const OUTFIT_SKIN = ['#f2cba8', '#eec4a0', '#e8ba92', '#e4b48c', '#efc49e', '#dcae86', '#d8a882', '#e6b68e', '#c99068', '#b07a52'];
const OUTFIT_SKIN_W = [12, 14, 14, 12, 10, 10, 8, 10, 4, 1];
const OUTFIT_HAIR = ['#141214', '#1c1a1a', '#221e1c', '#2a2220', '#3a2a22', '#4a3426', '#6a4430', '#7a5232', '#8a8478', '#c8a86a', '#7a2e28', '#2e2a3a'];
const OUTFIT_HAIR_W = [18, 18, 14, 10, 10, 8, 6, 4, 2, 1, 1, 1];
const OUTFIT_GREY = ['#a8a8a4', '#c4c4c4', '#8a8884', '#d6d4ce'];
// 차림새: 웃옷(top) · 아래옷(bot) · 신발/소지품(shoe) — 같은 줄 안에서 고르면 어색한 조합이 나오지 않는다
const OUTFIT_STYLES = {
  office: { top: ['#2a2d33', '#22304a', '#18191c', '#4a4e56', '#e8e6e0', '#a8c0d8', '#c8ad84', '#1c1d22', '#3a3428'], bot: ['#1c1d21', '#2c2e34', '#262c3c', '#4a4c52', '#8a7a62', '#141416'], shoe: ['#141416', '#4a3022', '#1e1e20', '#2c2018'] },
  casual: { top: ['#ecebe6', '#7a7d82', '#2a3a5a', '#5a6040', '#c8962e', '#8ab0d0', '#d898a8', '#3a7a5a', '#6a2430', '#1c1c20', '#e2d6be', '#141416', '#9a6a4a', '#b8c8a0'], bot: ['#3c5a86', '#2c3e5e', '#5a78a0', '#1c1d21', '#a8946c', '#6a6c70', '#7a7050', '#2a2a2e'], shoe: ['#f0f0ec', '#f0f0ec', '#e8e6e0', '#9a9a9a', '#1a1a1a', '#b03a30', '#3a5a8a'] },
  street: { top: ['#141416', '#f2f2ee', '#9ad040', '#e07030', '#6a4a9a', '#4a5034', '#b8302c', '#2a2a30', '#d8d040'], bot: ['#121214', '#4a4a3a', '#4a6a96', '#5a5c60', '#1e1e24'], shoe: ['#f2f2f2', '#1c1c1c', '#d0f040', '#c03030', '#f2f2f2'] },
  student: { top: ['#22304a', '#f0efe8', '#8a8c90', '#18181c', '#3a4a6a', '#e8e0d0'], bot: ['#1e2a44', '#5a5c62', '#18181c', '#3a3a52', '#2a3a5a'], shoe: ['#f2f2ee', '#1c1c1e', '#e8e6e0'] },
  outdoor: { top: ['#c03a32', '#2a8a8a', '#6a3a8a', '#e86a2a', '#2a5ab0', '#8ab030', '#d8a020', '#3a6a4a'], bot: ['#1a1a1e', '#4a4c52', '#22283a', '#3a3a34'], shoe: ['#7a7a7a', '#1c1c1e', '#5a3a22', '#4a4a50'] },
  elder: { top: ['#6a4a32', '#6a2a2a', '#b8a07a', '#6a6a6a', '#2a3040', '#7a4a7a', '#4a5a3a', '#8a3a4a'], bot: ['#4a4a50', '#4a3a2a', '#1c1c20', '#5a5248', '#2a2a30'], shoe: ['#1c1c1e', '#4a3022', '#6a5a4a'] },
  date: { top: ['#121214', '#a82030', '#f4f2ec', '#b8905a', '#2a6a50', '#a890c8', '#5a3420', '#e8b8c0', '#1e2a4a'], bot: ['#141416', '#22304a', '#e8e6e0', '#4a1a24', '#2a2a2e'], shoe: ['#141416', '#f2f2ee', '#a82828', '#c8b088', '#1c1c1e'] },
  delivery: { top: ['#b8d030', '#3ab8a0', '#e07a20', '#2a6ac0', '#d83a3a', '#1c1c20'], bot: ['#1a1a1e', '#3a3c42', '#2a2a30'], shoe: ['#e8d040', '#f2f2f2', '#d83a3a', '#2a6ac0', '#1c1c1e'] },
};
const OUTFIT_RAIN = ['#141416', '#2a2a30', '#1c2438', '#32382a', '#8a7a4a', '#d8b030', '#1a1a1e'];
// 체형 → 차림새 비율
const OUTFIT_BY_BODY = {
  suit: { office: 70, date: 30 }, femaleSuit: { office: 65, date: 35 }, femaleBlazer: { office: 55, date: 35, casual: 10 }, bossBig: { office: 75, date: 25 },
  worker: { outdoor: 35, casual: 35, delivery: 15, office: 15 }, femaleWorker: { outdoor: 30, casual: 40, delivery: 15, office: 15 }, workApron: { casual: 45, outdoor: 35, delivery: 20 }, vest: { outdoor: 40, casual: 40, street: 20 },
  hoodieCasual: { casual: 45, street: 35, student: 20 }, jacket: { casual: 40, date: 30, street: 20, office: 10 },
  coat: { office: 40, casual: 30, date: 30 }, femaleCoat: { office: 35, casual: 30, date: 35 },
  old: { elder: 80, outdoor: 20 }, kid: { student: 70, casual: 30 }, helmet: { delivery: 75, outdoor: 25 }, pack: { casual: 40, student: 30, street: 15, delivery: 15 },
  big: { casual: 45, outdoor: 25, street: 15, office: 15 },
  _: { casual: 45, street: 15, student: 10, date: 15, outdoor: 10, office: 5 },
};
const OUTFIT_FEMALE_SKIRT = new Set(['fLong', 'fTail']);
function outfitHash(n, salt) { let h = (n * 2654435761 + salt * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; }
const outfitPick = (list, h) => list[h % list.length];
const outfitWeighted = (list, w, h) => { let s = 0; for (const x of w) s += x; let r = h % s; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; } return list[0]; };
// 그 사람의 실루엣(체형): 몸이 따로 없는 행인은 예전처럼 번호에 따른 실루엣을 쓴다
const civSilhouette = g => g.body || (PR && PR.looks && PR.looks['civ' + (((g.look || 0) + g.id * 3) % 10)]) || null;
function outfitStyleOf(g, body) {
  const W = Object.assign({}, OUTFIT_BY_BODY[body] || OUTFIT_BY_BODY._);
  // 유흥가의 늦은 밤: 약속·스트릿 차림이 늘어난다 (시계 47zy_city_clock: S.clock.h, 24 이상은 자정 넘김)
  const h = S && S.clock ? S.clock.h : 21, late = h >= 23, d = STAGE.districtAt?.(Math.floor(g.x / TILE), Math.floor(g.y / TILE));
  if (late && d === '종로 유흥가') { if (W.date) W.date = Math.round(W.date * 2.5); if (W.street) W.street = Math.round(W.street * 1.5); }
  if (d === '중구 관청가' && W.office) W.office = Math.round(W.office * 1.6);
  if (d === '성수 공장지대' && W.outdoor) W.outdoor = Math.round(W.outdoor * 1.5);
  const keys = Object.keys(W); return outfitWeighted(keys, keys.map(k => W[k]), outfitHash(g.id, 1));
}
// 한 사람의 팔레트 열쇠: 처음 그릴 때 한 번 정하고 그 사람에게 붙여 둔다 (비·시간·동네는 그때 기준)
function civOutfitKey(g) {
  if (g.cvk) return g.cvk;
  const body = civSilhouette(g), style = outfitStyleOf(g, body), St = OUTFIT_STYLES[style], id = g.id;
  const skin = outfitWeighted(OUTFIT_SKIN, OUTFIT_SKIN_W, outfitHash(id, 2));
  const hair = body === 'old' || style === 'elder' ? outfitPick(OUTFIT_GREY, outfitHash(id, 3)) : outfitWeighted(OUTFIT_HAIR, OUTFIT_HAIR_W, outfitHash(id, 3));
  let top = outfitPick(St.top, outfitHash(id, 4));
  if (typeof rainK === 'function' && rainK() > 0.3 && outfitHash(id, 9) % 10 < 4) top = outfitPick(OUTFIT_RAIN, outfitHash(id, 10));   // 비: 어두운 겉옷·우비
  let bot = outfitPick(St.bot, outfitHash(id, 5)); if (bot === top) bot = St.bot[(St.bot.indexOf(bot) + 1) % St.bot.length];   // 위아래 같은 색은 피한다 (정장 한 벌은 예외 없이 다른 톤)
  if (OUTFIT_FEMALE_SKIRT.has(body) && outfitHash(id, 8) % 3 === 0) bot = outfitPick(['#2a2a30', '#6a2430', '#c8b8a0', '#3a4a6a', '#1c1c20', '#8a6a8a'], outfitHash(id, 11));   // 치마 색
  const shoe = outfitPick(St.shoe, outfitHash(id, 6)), acc = outfitPick([shoe, '#9c8c78', '#5a4a3a', '#2a2a2e', '#c8b8a0'], outfitHash(id, 7));
  const pal = [skin, hair, top, bot, shoe, acc], key = 'cv' + pal.map(c => c.slice(1)).join('');
  if (!PR_PAL[key]) PR_PAL[key] = pal;
  return (g.cvk = key);
}
// ---- 칠한 시트 비우기: 자유 모드에서 오래(20초) 안 그린 행인 옷은 지운다 (다시 보이면 다시 칠한다). 주인공·최근 것은 남긴다
let outfitEvictT = 0;
function outfitEvict() {
  if (!STAGE.cityLife || typeof prVar === 'undefined') return; const now = performance.now(); if (now < outfitEvictT) return; outfitEvictT = now + 4000;
  const keep = typeof playerKey === 'function' && S && S.player ? playerKey(S.player) : null, keys = Object.keys(prVar).filter(k => !k.endsWith('_ol'));
  if (keys.length <= 36) return;
  const old = keys.filter(k => k !== keep && k.split('@')[0] !== 'ninja' && now - (prVar[k].lu || 0) > 20000).sort((a, b) => (prVar[a].lu || 0) - (prVar[b].lu || 0));
  for (const k of old.slice(0, Math.max(0, keys.length - 36))) { delete prVar[k]; delete prVar[k + '_ol']; }
}
if (typeof staffUpdate === 'function') { const _ou = staffUpdate; staffUpdate = function (dt) { const r = _ou.apply(this, arguments); outfitEvict(); return r; }; }
