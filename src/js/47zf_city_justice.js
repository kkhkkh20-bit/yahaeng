// ---------------------------------------------------------------- 자유 모드 응징 연출
// 나는 영웅이 아니다 — 필요악이다. 악당을 끝냈을 때: 잠깐 느려지고(슬로모션) 붉은 "응징" 도장이 찍히고,
// 화면 아래로 뉴스 속보가 흐르는데 경찰은 '사적 제재'로 수사한다고 한다. 근처 시민들은 박수 치지 않는다 —
// 겁먹고 물러서며 수군댄다. 평판은 오르지 않는다 (속은 시원해도 사람들은 나를 무서워한다).
//   justiceMoment(제목, 속보 문구, x, y)
const WHISPERS = ['...속은 시원하네', '저 사람 뭐야...', '눈 마주치지 마', '당해도 싸긴 하지...', '경찰 불러야 하나?', '못 본 걸로 해', '또 그 사람이래', '무섭다...'];
const POLICE_LINE = ['경찰 "사적 제재도 명백한 범죄" 수사 착수', '경찰, 동일인 소행 가능성 무게', '경찰 "자경단 행세 엄단"… 목격자 진술 엇갈려', 'CCTV엔 모자 쓴 남성 뒷모습만'];
function justiceMoment(what, news, x, y) {
  if (!STAGE.cityLife) return; fstat('justice'); const n = (S.fst && S.fst.justice) || 1;
  slowMo(0.5); S.flash = Math.max(S.flash || 0, 0.18); play('bell', 0.45, 0.45);
  justiceStamp(what); after(1.0, () => newsTicker(`${news} — ${POLICE_LINE[n % POLICE_LINE.length]} (올해 ${n}번째 '그림자' 사건)`));
  // 시민: 그쪽을 보고 몇 걸음 물러서며 수군댄다 (박수 없음)
  let k = 0;
  for (const g of actorsNearWide(x, y, 360)) { if (k >= 5 || !g.civ || g.crew || g.evt || !npcAlive(g) || g.off || g.state === 'DEAD') continue;
    const i = k++; g.a = Math.atan2(y - g.y, x - g.x); after(0.3 + i * 0.4, () => { if (!npcAlive(g)) return; gsay(g, WHISPERS[(g.id + i) % WHISPERS.length], 2.4); if (i % 2) civPanic(g, x, y, 4); }); }
}
// 붉은 도장 (화면 가운데, 비스듬히 찍혔다가 흐려진다)
function justiceStamp(what) {
  let el = document.getElementById('justiceStamp');
  if (!el) { el = document.createElement('div'); el.id = 'justiceStamp'; el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;top:38%;z-index:42;pointer-events:none;text-align:center;color:#ff3b2f;font-family:"Yahaeng Title",var(--f-body);opacity:0;transition:opacity .4s,transform .25s cubic-bezier(.2,1.6,.4,1)';
    el.innerHTML = '<div data-t style="font-size:64px;line-height:1;padding:6px 18px;border:6px solid #ff3b2f;border-radius:10px;text-shadow:0 2px 0 #000;box-shadow:0 0 0 3px rgba(0,0,0,.35)">응징</div><div data-s style="margin-top:8px;font:600 17px/1.3 var(--f-body);color:#f2e7c8;text-shadow:0 2px 0 #000"></div>';
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
  const t = el.querySelector('[data-t]'); t.textContent = text.replace(/^\[속보\]\s*/, ''); el.style.opacity = '1';
  t.style.transition = 'none'; t.style.left = '100%'; void t.offsetWidth; t.style.transition = 'left 9s linear'; t.style.left = 'calc(120px - ' + Math.max(400, text.length * 16) + 'px)';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 9200);
}
