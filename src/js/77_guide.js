// 화면 글 수준. 기본은 '최소': 규칙 설명·해법 안내·이름표 글을 숨기고 색·아이콘·바닥 표시·소리로 전한다.
// 단서는 세계 안(엿듣는 대사, 간판, 조명, 시야 원뿔)에 남긴다. 설정의 '화면 글: 자세히'를 켜면 예전 안내가 모두 돌아온다.
// 조작을 처음 배우는 연습 판(tutorial · firstSteps)은 항상 자세히 보여 준다.
const GUIDE_KEY = 'yahaeng.guide';
function guideFull() {
  if (typeof STAGE !== 'undefined' && STAGE && (STAGE.tutorial || STAGE.firstSteps)) return true;
  try { return localStorage.getItem(GUIDE_KEY) === 'full'; } catch (e) { return false; }
}
// 자세히 모드에서만 보이는 이름표 (최소 모드에서는 같은 정보를 색·아이콘이 이미 보여 준다)
function infoTag(...args) { if (guideFull()) tag(...args); }
function syncGuideClass() { document.body.classList.toggle('guide-min', !guideFull()); }
function initGuidePreference() {
  const button = $('btnGuide'); if (!button) return;
  const update = () => { let full = false; try { full = localStorage.getItem(GUIDE_KEY) === 'full'; } catch (e) {} button.textContent = full ? '화면 글: 자세히' : '화면 글: 최소'; button.setAttribute('aria-pressed', String(full)); syncGuideClass(); };
  update();
  button.onclick = () => { const full = button.getAttribute('aria-pressed') !== 'true'; try { localStorage.setItem(GUIDE_KEY, full ? 'full' : 'min'); } catch (e) {} update(); if (typeof hudCache !== 'undefined') for (const k in hudCache) hudCache[k] = null; };
}
// 글 대신 쓰는 작은 표식. 화면 배율과 상관없이 같은 크기로 그린다.
//  eye: 얼굴을 알아보는 사람 · ask: 조사하는 지점 · alert: 발견된 것 · lock: 복장이 필요한 곳
function drawBadge(x, y, kind, col, alpha = 1) {
  if (window.__skip && window.__skip.ui) return;
  const k = Math.max(1, 0.95 / SCALE), r = 9 * k;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8,11,18,.82)'; ctx.beginPath(); ctx.arc(0, 0, r + 2 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8 * k; ctx.lineCap = 'round';
  if (kind === 'eye') {
    ctx.beginPath(); ctx.moveTo(-r * .85, 0); ctx.quadraticCurveTo(0, -r * .9, r * .85, 0); ctx.quadraticCurveTo(0, r * .9, -r * .85, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, TAU); ctx.fill();
  } else if (kind === 'lock') {
    ctx.strokeRect(-r * .5, -r * .1, r, r * .75); ctx.beginPath(); ctx.arc(0, -r * .1, r * .35, Math.PI, 0); ctx.stroke();
  } else {
    ctx.font = uiFont(Math.round(13 * k)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'alert' ? '!' : '?', 0, k);
  }
  ctx.restore();
}
