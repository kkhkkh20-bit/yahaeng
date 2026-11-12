// 무작위 고정: 주소에 ?seed=숫자 가 있거나 window.__seed 가 정해져 있으면, 판을 시작할 때마다 Math.random 을 그 수로 시작하는 같은 수열로 바꾼다
// (같은 장면을 똑같이 다시 볼 수 있다 — 버그 재현 · 테스트). 없으면 브라우저 기본 무작위 그대로.
const NATIVE_RANDOM = Math.random;
function seedRandom(seed) {
  if (seed == null || seed === '') { Math.random = NATIVE_RANDOM; return; }
  let a = (Number(seed) >>> 0) || 1;
  Math.random = function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };  // mulberry32
}
function gameSeed() { try { const q = new URLSearchParams(location.search).get('seed'); if (q != null) return q; } catch (e) {} return window.__seed ?? null; }
const A = window.__ASSETS__;
const NEONY = () => !!(STAGE && STAGE.neon);  // 네온 동네(강남 등): 건물 윤곽·간판·조명이 네온
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };

const TILE = 48;
let MW = 44, MH = 30;
// 땅(z=0)에서 막히는 칸 / 시야를 가리는 칸
const SOLID = new Set(['#', 'C', 'O', 'F', 'T', 'K', 'E', 'R', '~', 'H', 'U', 'W', 'S', 'N', 'X', 'Z', 'M', 'Q', 'q', 'P', 'V', 'A', 'I']);  // 'A' 주차된 차 'I' 필로티 기둥  // 'V' 위층 바깥(허공)  // 'Q' 불 땐 아궁이 'q' 찬 아궁이 'P' 전봇대
const OPAQUE = new Set(['#', 'C', 'O', 'T', 'H', 'U', 'S', 'X', 'M', 'V', 'E']);
// 그림으로 깐 구역(큰 도시 을지로): '§' 건물 = 막힘 + 시선 가림 · '¦' 난간·축대·다리 난간 = 막힘 + 시선 통과
SOLID.add('§'); SOLID.add('¦'); OPAQUE.add('§');
// 가구는 두 가지뿐: 높은 가구('E') = 막힘 + 시선 가림, 낮은 가구('K') = 막힘 + 시선 통과(웅크리면 뒤에 숨는다). 깔개·춤추는 자리만 밟고 지나간다
const FURN_TALL = new Set(['wardrobe', 'shelf', 'shelfS', 'locker', 'fridge', 'cab', 'boxes', 'plant', 'spk']);
const FURN_FLAT = new Set(['rug', 'dance']);
SOLID.delete('O'); OPAQUE.delete('O'); // Loose rubbish does not occupy a full impassable metre or block a standing observer.
SOLID.delete('W');  // 도시: 맨홀 뚜껑은 밟고 지나간다 (막히면 도망치다 멈춘다)  // 'X' = 잠긴 문
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const tc = t => t * TILE + TILE / 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const N8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];

// 난이도: 한 가지(보통)로 통일. easy·hard 값은 시험용으로만 남긴다 (__game.setDiff)
const DIFFS = {
  easy: { hp: 4, name: '쉬움', range: 0.9, rate: 0.8, spd: 0.95, stones: 5, coins: 3, picks: 5, kunaiAdd: 1, roll: 0, reinf: 1, time: 1.35 },
  normal: { hp: 3, name: '보통', range: 1.08, rate: 1.25, spd: 1.0, stones: 2, coins: 2, picks: 2, kunaiAdd: 0, roll: 80, reinf: 3, time: 1.0 },  // 난이도 상향(v78): 시야 +8%, 알아채는 속도 +16%, 빈 캔·락픽 하나씩 줄임, 증원 +1
  hard: { hp: 2, name: '어려움', range: 1.12, rate: 1.32, spd: 1.08, stones: 2, coins: 1, picks: 2, kunaiAdd: -1, roll: 55, reinf: 3, time: 0.85 }
};
let DKEY = 'normal';
const D = () => DIFFS[DKEY];
// 속도(픽셀/초) — 자경대원은 플레이어보다 확실히 느리게
// 속도(px/초) — 한 칸(48px)이 문 하나 폭(약 1m). 걷기 애니메이션(9fps)이 발이 미끄러지지 않는 빠르기가 약 70px/초(1.4m/초)
// 주인공: 살금 1.1m/초 · 걷기 1.7m/초 · 달리기 3.3m/초. 추격하는 자경대원(112)은 달리는 주인공보다 조금 느리다
const SPD = { sneak: 55, walk: 82, run: 160, gPatrol: 48, gSusp: 60, gBody: 66, gAlert: 112, target: 36, flee: 92 };

