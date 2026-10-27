// ---------------------------------------------------------------- 버튼 (레퍼런스: 히트맨의 [키] 동작 표시·길게 누르기 고리, 어쌔신 크리드의 상황별 버튼 지도, 모바일 액션 게임의 아이콘 버튼)
// 행동마다 아이콘 하나와 짧은 동사 하나. 버튼에는 짧게, 대상 위에는 길게(자세히) 적는다
const ICON_P = {
  ko: 'M7 12c0-3 2-5 5-5s5 2 5 5M5 12h14M9 16l-2 4M15 16l2 4M12 12v8',                       // 목 조르기(팔)
  kill: 'M4 20l9-9M13 11l6-6 1 1-6 6M11 13l2 2M6 15l3 3',                                      // 칼
  grab: 'M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-3 7-6 7s-5-2-6-5l-1-3a1.5 1.5 0 012.7-1.2L8 13', // 손
  hide: 'M4 9h16l-1.5 11h-13zM3 9l1-3h16l1 3M9 13h6',                                           // 수거함
  stash: 'M4 9h16l-1.5 11h-13zM3 9l1-3h16l1 3M12 12v6M9 15l3 3 3-3',                            // 넣기
  climb: 'M7 21V3M17 21V3M7 7h10M7 12h10M7 17h10M12 1l-3 3M12 1l3 3',                            // 사다리 위
  down: 'M12 4v14M6 12l6 6 6-6M5 21h14',                                                          // 아래
  door: 'M6 21V3h11v18M6 21h13M14 12h.01',                                                        // 문
  window: 'M4 5h16v14H4zM12 5v14M4 12h16',                                                        // 창문
  wire: 'M2 8c5 6 15 6 20 0M9 11v5l-2 3M9 16l2 3M9 11a1.5 1.5 0 100-3',                           // 줄 타기
  carry: 'M8 6a2 2 0 104 0 2 2 0 10-4 0M4 13l6-3 6 2 4-2M10 10v6l-2 5M12 16l3 5',                 // 메기
  dress: 'M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z',                                                     // 옷
  pickup: 'M5 10h14v10H5zM5 10l3-5h8l3 5M12 10v10',                                               // 상자
  use: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',  // 쓰기
  read: 'M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h4',                                                  // 쪽지
  pick: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v3',                                           // 자물쇠
  light: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z',                         // 전구
  trap: 'M13 2L4 14h7l-1 8 9-12h-7z',                                                             // 번개
  leave: 'M14 4h6v16h-6M3 12h12M10 7l5 5-5 5',                                                    // 나가기
  wall: 'M4 3v18M8 7a2 2 0 104 0 2 2 0 10-4 0M10 9v6l-2 6M10 12l4 2',                             // 기대기
  key: 'M8 15a4 4 0 110-8 4 4 0 010 8zM12 11h9M18 11v3M21 11v2',                                  // 열쇠
  stone: 'M7 5h10v15H7zM7 9h10M9 3h6',                                                          // 빈 캔
  coin: 'M3 14h15v3H3zM18 14h3v3h-3M19 11c0-2 2-2 2-4',                                          // 담배
  kunai: 'M4 20L15 9M15 9l5-5-1 6zM15 9l-6-1 5-5zM6 14l4 4',                                     // 다트
  candy: 'M8 12a4 4 0 108 0 4 4 0 10-8 0M8 12l-5-3v6zM16 12l5-3v6z',                       // 사탕
  dot: 'M12 12h.01'
};
const icon = (k, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_P[k] || ICON_P.dot}"/></svg>`;
const KILLISH = new Set(['kill', 'kill2', 'drop', 'ambush', 'ventKill', 'pull', 'execute', 'drag', 'ledgeKill', 'pushOff']);
function actIcon(a) {
  const k = a.k, lb = a.label || '';
  if (KILLISH.has(k) || ((k === 'winJump' || k === 'up') && a.kill)) return /기절|끌어내리기/.test(lb) ? 'ko' : 'kill';
  return ({ hide: 'hide', stash: 'stash', carry: lb.startsWith('넣기') ? 'stash' : 'carry', throwBody: 'carry', leave: 'leave', surface: 'climb', up: 'climb', wireRoof: 'down', ledgeUp: 'climb', leap: 'climb', jump: 'down', ventIn: 'climb', ventOut: 'down',
    down: 'down', fdown: 'down', tunnel: 'down', ledge: 'down', wireFall: 'down', wireOn: 'wire', wireOff: 'down', window: 'window', winJump: 'window', door: 'door', keypad: 'door', keymsg: 'door', pick: 'pick',
    read: 'read', fuse: 'light', bfuse: 'light', lamp: 'light', smother: 'light', trap: 'trap', grab: 'grab', dress: 'dress', pickup: lb.startsWith('옷') ? 'dress' : 'pickup', use: 'use', dropItem: 'pickup',
    cover: 'wall', uncover: 'wall', steal: 'key', candy: 'candy' })[k] || 'dot';
}
const VERB = { ko: '기절', kill: '처치', grab: '붙잡기', hide: '숨기', stash: '넣기', climb: '오르기', down: '내려가기', door: '문', window: '넘어가기', wire: '줄 타기', carry: '운반', dress: '옷 입기', pickup: '줍기', use: '쓰기', read: '읽기', pick: '따기', light: '불', trap: '함정', leave: '나오기', wall: '기대기', key: '훔치기', candy: '사탕' };
// 버튼용 짧은 동사: 원래 이름이 짧으면 그대로, 길면 아이콘 동사
function actVerb(a, ic) {
  const lb = (a.label || '').split(/ \(| — /)[0];
  if (a.k === 'none') return a.stalk ? (koDefault(a.stalk) ? '기절' : '처치') : '';
  if (a.k === 'dropItem') return '내려놓기';
  if (a.k === 'door' || a.k === 'keypad') return lb.length <= 6 ? lb : '문';
  return lb.length <= 5 ? lb : VERB[ic] || lb.slice(0, 5);
}
// 모바일 버튼: 아이콘 + 짧은 동사 (+ 길게 누르기 안내)
function padButton(el, key, a, idle) {
  const ic = a.k === 'none' && a.stalk ? (koDefault(a.stalk) ? 'ko' : 'kill') : actIcon(a), v = actVerb(a, ic) || idle, hold = a.hold ? `<small>길게: ${a.hold}</small>` : '';
  const html = (a.k === 'none' && !a.stalk ? '' : icon(ic, 24)) + `<b>${v}</b>` + hold;
  if (hudCache[key] !== html) { hudCache[key] = html; el.innerHTML = html; el.setAttribute('aria-label', a.label || v); }
}
// PC 아래 키 안내: 지금 그 키로 할 수 있는 것 (어쌔신 크리드식 상황별 버튼 지도). 할 게 없으면 흐리게
function keyMap(pa, sa) {
  const set = (id, t, on) => { const el = $(id); if (!el) return; setText(el, id, t); el.parentNode.classList.toggle('on', !!on); };
  set('kmAct', pa.k === 'none' ? (pa.stalk ? actVerb(pa) : '행동') + (pa.hold ? '' : '') : actVerb(pa, actIcon(pa)) + (pa.hold ? ` · 길게 ${pa.hold}` : ''), pa.k !== 'none' || pa.stalk);
  set('kmZ', sa.k === 'none' ? '특수' : actVerb(sa, actIcon(sa)), sa.k !== 'none');
  set('kmX', `${TOOL_NAME[input.tool]} ${toolCount(input.tool)}`, toolCount(input.tool) > 0);
  set('kmSneak', S.player.mode === 'sneak' || input.sneakToggle ? '살금 켜짐' : '살금', S.player.mode === 'sneak' || input.sneakToggle);
}
// 길게 누르는 중: 버튼 둘레와 대상 위에 차오르는 고리 (히트맨식)
function holdFrac() { const h = S.koHold; return h ? clamp((S.t - h.t0) / KO_HOLD, 0, 1) : 0; }
function drawHoldRing() {
  const h = S.koHold; if (!h) return; const f = holdFrac(), c = h.c, x = c.x, y = c.y - 30;
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#e8473c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); ctx.restore();
  tag(x, y - 30, '계속 누르면 처치', '#ff8a76', 0.9);
}
