// ---------------------------------------------------------------- 자유 모드 참교육 연출
// 민폐·범죄를 끝냈을 때의 후련함: 잠깐 느려지고(슬로모션) 붉은 "참교육" 도장이 찍히며,
// 화면 아래로 뉴스 속보 자막이 흐르고, 근처 시민들이 그쪽을 보며 환호하고, 한 명은 다가와 고맙다고 한다.
//   justiceMoment(제목, 속보 문구, x, y, {thank})
const CHEERS = ['속이 다 시원하네!', '잘했다!', '저런 건 당해도 싸지', '와... 진짜 참교육이네', '박수!', '경찰보다 빠르네'];
function justiceMoment(what, news, x, y, o = {}) {
  if (!STAGE.cityLife) return; fstat('justice');
  slowMo(0.5); S.flash = Math.max(S.flash || 0, 0.18); play('bell', 0.45, 0.6);
  justiceStamp(what); after(1.0, () => newsTicker(news));
  // 시민 환호: 가까운 행인 다섯까지 그쪽을 돌아보고 한마디
  let n = 0;
  for (const g of actorsNearWide(x, y, 360)) { if (n >= 5 || !g.civ || g.crew || g.evt || !npcAlive(g) || g.off || g.state === 'DEAD') continue;
    if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; g.panicT = 0; g.icon = null; }
    g.a = Math.atan2(y - g.y, x - g.x); g.wait = Math.max(g.wait || 0, 3); const k = n++; after(0.3 + k * 0.35, () => { if (npcAlive(g)) gsay(g, CHEERS[(g.id + k) % CHEERS.length], 2.4); }); }
  // 한 사람은 다가와 고맙다고 한다
  if (o.thank !== false) { const P = S.player; let best = null, bd = 420;
    for (const g of actorsNearWide(P.x, P.y, 420)) { if (!g.civ || g.crew || g.evt || !npcAlive(g) || g.off) continue; const d = dist(g.x, g.y, P.x, P.y); if (d < bd && d > 40) { bd = d; best = g; } }
    if (best) { evGo(best, P.x + 34, P.y + 10); after(Math.min(3.5, bd / 90), () => { if (npcAlive(best)) { best.a = Math.atan2(P.y - best.y, P.x - best.x); gsay(best, o.thank || '정말 고맙습니다. 아무도 안 나서던데...', 3); } }); } }
}
// 붉은 도장 (화면 가운데, 비스듬히 찍혔다가 흐려진다)
function justiceStamp(what) {
  let el = document.getElementById('justiceStamp');
  if (!el) { el = document.createElement('div'); el.id = 'justiceStamp'; el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;top:38%;z-index:42;pointer-events:none;text-align:center;color:#ff3b2f;font-family:"Yahaeng Title",var(--f-body);opacity:0;transition:opacity .4s,transform .25s cubic-bezier(.2,1.6,.4,1)';
    el.innerHTML = '<div data-t style="font-size:64px;line-height:1;padding:6px 18px;border:6px solid #ff3b2f;border-radius:10px;text-shadow:0 2px 0 #000;box-shadow:0 0 0 3px rgba(0,0,0,.35)">참교육</div><div data-s style="margin-top:8px;font:600 17px/1.3 var(--f-body);color:#f2e7c8;text-shadow:0 2px 0 #000"></div>';
    document.body.appendChild(el); }
  el.querySelector('[data-s]').textContent = what; el.style.transform = 'translate(-50%,-50%) rotate(-9deg) scale(1.8)'; el.style.opacity = '1';
  requestAnimationFrame && setTimeout(() => { el.style.transform = 'translate(-50%,-50%) rotate(-9deg) scale(1)'; play('thud', 0.6, 0.7); }, 30);
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2300);
}
// 뉴스 속보 자막 (화면 아래, 오른쪽에서 왼쪽으로 흐른다)
function newsTicker(text) {
  let el = document.getElementById('newsTicker');
  if (!el) { el = document.createElement('div'); el.id = 'newsTicker';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:41;pointer-events:none;height:34px;overflow:hidden;background:linear-gradient(90deg,#b3121b 0 120px,rgba(10,12,16,.92) 120px);color:#fff;font:600 16px/34px var(--f-body);opacity:0;transition:opacity .4s';
    el.innerHTML = '<span style="position:absolute;left:0;width:120px;text-align:center;font-weight:800;letter-spacing:.08em">속보</span><span data-t style="position:absolute;left:100%;white-space:nowrap"></span>';
    document.body.appendChild(el); }
  const t = el.querySelector('[data-t]'); t.textContent = text; el.style.opacity = '1';
  t.style.transition = 'none'; t.style.left = '100%'; void t.offsetWidth; t.style.transition = 'left 9s linear'; t.style.left = 'calc(120px - ' + Math.max(400, text.length * 16) + 'px)';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 9200);
}
