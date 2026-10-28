const A = window.__ASSETS__;
const NEONY = () => !!(STAGE && STAGE.neon);  // 네온 동네(강남 등): 건물 윤곽·간판·조명이 네온
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
if (A.font && window.FontFace) { try { const ff = new FontFace('Galmuri', `url(${A.font})`); ff.load().then(f => document.fonts.add(f)).catch(() => {}); } catch (e) {} }
const TILE = 48;
let MW = 44, MH = 30;
// 땅(z=0)에서 막히는 칸 / 시야를 가리는 칸
const SOLID = new Set(['#', 'C', 'O', 'F', 'T', 'K', 'E', 'R', '~', 'H', 'U', 'W', 'S', 'N', 'X', 'Z', 'M', 'Q', 'q', 'P', 'V', 'A', 'I']);  // 'A' 주차된 차 'I' 필로티 기둥  // 'V' 위층 바깥(허공)  // 'Q' 불 땐 아궁이 'q' 찬 아궁이 'P' 전봇대
const OPAQUE = new Set(['#', 'C', 'O', 'T', 'H', 'U', 'S', 'X', 'M', 'V', 'E']);
// 가구는 두 가지뿐: 높은 가구('E') = 막힘 + 시선 가림, 낮은 가구('K') = 막힘 + 시선 통과(웅크리면 뒤에 숨는다). 깔개·춤추는 자리만 밟고 지나간다
const FURN_TALL = new Set(['wardrobe', 'shelf', 'shelfS', 'locker', 'fridge', 'cab', 'boxes', 'plant', 'spk']);
const FURN_FLAT = new Set(['rug', 'dance']);
SOLID.delete('W');  // 도시: 맨홀 뚜껑은 밟고 지나간다 (막히면 도망치다 멈춘다)  // 'X' = 잠긴 문
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const tc = t => t * TILE + TILE / 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const N8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];

// 난이도
const DIFFS = {
  easy: { hp: 4, name: '쉬움', range: 0.9, rate: 0.8, spd: 0.95, stones: 5, coins: 3, picks: 5, kunaiAdd: 1, roll: 0, reinf: 1, time: 1.35 },
  normal: { hp: 3, name: '보통', range: 1.0, rate: 1.08, spd: 1.0, stones: 3, coins: 2, picks: 3, kunaiAdd: 0, roll: 80, reinf: 2, time: 1.0 },
  hard: { hp: 2, name: '어려움', range: 1.12, rate: 1.32, spd: 1.08, stones: 2, coins: 1, picks: 2, kunaiAdd: -1, roll: 55, reinf: 3, time: 0.85 }
};
let DKEY = 'normal'; try { const d = localStorage.getItem('yahaeng.diff'); if (DIFFS[d]) DKEY = d; } catch (e) {}
const D = () => DIFFS[DKEY];
// 속도(픽셀/초) — 자경대원은 플레이어보다 확실히 느리게
const SPD = { sneak: 84, walk: 130, run: 215, gPatrol: 48, gSusp: 60, gBody: 66, gAlert: 128, target: 36, flee: 92 };

