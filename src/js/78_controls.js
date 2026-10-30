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
  dress: 'M12 7a2 2 0 112-2M12 7v1.5L3 15.5c-.8.6-.4 1.5.5 1.5h17c.9 0 1.3-.9.5-1.5L12 8.5',               // 옷걸이 (갈아입기)
  pickup: 'M5 10h14v10H5zM5 10l3-5h8l3 5M12 10v10',                                               // 상자
  use: 'M10 3h4M11 3v5l-5 8a3 3 0 002.6 4.5h6.8A3 3 0 0018 16l-5-8V3M8 14h8',                       // 약병 (타기·쓰기)
  loot: 'M4 5h16v6H4zM4 11h16v8H4zM10 8h4M10 15h4',                                              // 서랍 (빼 오기)
  clean: 'M12 3c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9zM4 21h16',                             // 물방울 (닦기)
  manhole: 'M12 3a9 9 0 100 18 9 9 0 100-18zM7 9h10M6 12h12M7 15h10',                            // 맨홀
  vent: 'M4 5h16v14H4zM4 9h16M4 13h16M4 17h16',                                                   // 창살
  counter: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',                                          // 방패 (반격)
  read: 'M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h4',                                                  // 쪽지
  pick: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v3',                                           // 자물쇠
  light: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z',                         // 전구
  trap: 'M13 2L4 14h7l-1 8 9-12h-7z',                                                             // 번개
  leave: 'M14 4h6v16h-6M3 12h12M10 7l5 5-5 5',                                                    // 나가기
  wall: 'M4 3v18M8 7a2 2 0 104 0 2 2 0 10-4 0M10 9v6l-2 6M10 12l4 2',                             // 기대기
  key: 'M8 15a4 4 0 110-8 4 4 0 010 8zM12 11h9M18 11v3M21 11v2',                                  // 열쇠
  stone: 'M7 5h10v15H7zM7 9h10M9 3h6',                                                          // 빈 캔
  coin: 'M3 14h15v3H3zM18 14h3v3h-3M19 11c0-2 2-2 2-4',                                          // 담배
  kunai: 'M20 4l-7 2 5 5zM15.5 8.5L6 18M6 18l-3 0 0-3 3 3zM8 16l-3-3M8 16l3 3',                    // 다트 (바늘 끝 · 대 · 꼬리 깃)
  candy: 'M8 12a4 4 0 108 0 4 4 0 10-8 0M8 12l-5-3v6zM16 12l5-3v6z',                       // 사탕
  car: 'M5 17h14v-5l-2-5H7l-2 5zM5 12h14M7 17v2M17 17v2M8 14.5h.01M16 14.5h.01',                // 차
  dot: 'M12 12h.01'
};
const icon = (k, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_P[k] || ICON_P.dot}"/></svg>`;
const KILLISH = new Set(['kill', 'kill2', 'drop', 'ambush', 'ventKill', 'pull', 'execute', 'drag', 'finish', 'ledgeKill', 'pushOff']);
function actIcon(a) {
  if (a.k === 'pickup' && a.p && a.p.outfit) return 'dress';
  const k = a.k, lb = a.label || '';
  if (KILLISH.has(k) || ((k === 'winJump' || k === 'up') && a.kill)) return /기절|끌어내리기/.test(lb) ? 'ko' : 'kill';
  return ({ hide: 'hide', stash: 'stash', carry: lb.startsWith('넣기') ? 'stash' : 'carry', throwBody: 'carry', leave: 'leave', surface: 'climb', up: 'climb', wireRoof: 'down', ledgeUp: 'climb', leap: 'climb', jump: 'down', ventIn: 'climb', ventOut: 'down',
    down: 'down', fdown: 'down', tunnel: 'down', ledge: 'down', ledgeDrop: 'down', wireFall: 'down', wireOn: 'wire', wireOff: 'down', window: 'window', winJump: 'window', door: 'door', keypad: 'door', keymsg: 'door', pick: 'pick',
    read: 'read', fuse: 'light', bfuse: 'light', lamp: 'light', smother: 'light', trap: 'trap', grab: 'grab', dress: 'dress', pickup: lb.startsWith('옷') ? 'dress' : 'pickup', use: 'use', dropItem: 'pickup',
    clean: 'clean', loot: 'loot', counter: 'counter', carIn: 'car', carOut: 'car', contract: 'read', wallUp: 'climb', winClimb: 'climb', winDrop: 'down', cover: 'wall', uncover: 'wall', steal: 'key', candy: 'candy', camroom: 'light' })[k] || 'dot';
}
const VERB = { counter: '반격', loot: '빼 오기', clean: '닦기', use: '쓰기', ko: '기절', kill: '처치', grab: '붙잡기', hide: '숨기', stash: '넣기', climb: '오르기', down: '내려가기', door: '문', window: '넘어가기', wire: '줄 타기', carry: '운반', dress: '옷 입기', pickup: '줍기', use: '쓰기', read: '읽기', pick: '따기', light: '불', trap: '함정', leave: '나오기', wall: '기대기', key: '훔치기', candy: '사탕' };
// 버튼용 짧은 동사: 원래 이름이 짧으면 그대로, 길면 아이콘 동사
function actVerb(a, ic) {
  if (a.busy) return a.label;
  const lb = (a.label || '').split(/ \(| — | → | · /)[0];  // '오르기 · 2층' → '오르기'
  if (a.honk) return '경적';
  if (a.k === 'none') return a.stalk ? (koTap(a.stalk) ? '기절' : '처치') : '';
  if (a.k === 'cap') return a.label;
  if (a.k === 'dropItem') return '내려놓기';
  if (a.k === 'drag') return '끌고 기절';
  if (a.k === 'finish') return '처치';
  if (a.k === 'camroom') return 'CCTV 끄기';
  if (a.k === 'door' || a.k === 'keypad') return lb.length <= 6 ? lb : '문';
  if (a.k === 'loot' && a.it && LOOT[a.it.furn]) return LOOT[a.it.furn][2];  // 챙기기 · 뒤지기 · 꺼내기 · 빼내기
  if (lb.length <= 6) return lb;
  const ws = lb.split(' '), two = ws.slice(-2).join(' ');  // 길면 끝말(무엇을 하는지)만: '실장 술병에 배탈약 타기' → '배탈약 타기'
  return two.length <= 6 ? two : ws[ws.length - 1].length <= 6 ? ws[ws.length - 1] : VERB[ic] || lb.slice(0, 5);
}
// 모바일 버튼: 아이콘 + 짧은 동사 (+ 길게 누르기 안내)
function padButton(el, key, a, idle) {
  el.setAttribute('aria-busy', a.busy ? 'true' : 'false');
  const ic = a.k === 'cap' ? (a.hold ? 'ko' : 'kill') : a.k === 'none' && a.stalk ? (koTap(a.stalk) ? 'ko' : 'kill') : actIcon(a), v = actVerb(a, ic) || idle, hold = a.hold ? `<small>${holdHint(a)}</small>` : '';
  // 그림 없이 글자만: 무엇을 하는지 동사로 바로 읽히게
  const html = `<b>${v}</b>` + hold;
  if (hudCache[key] !== html) { hudCache[key] = html; el.innerHTML = html; el.setAttribute('aria-label', actionCaption(a, a.label || v)); }
}
// PC 아래 키 안내: 지금 그 키로 할 수 있는 것 (어쌔신 크리드식 상황별 버튼 지도). 할 게 없으면 흐리게
function keyMap(ka, ea, ga) {
  const set = (id, t, on) => { const el = $(id); if (!el) return; setText(el, id, t); el.parentNode.classList.toggle('on', !!on); };
  if (hudCache.kset !== (input.kset || 'arrow')) { hudCache.kset = input.kset || 'arrow'; [['kkAtk', 'atk'], ['kkEnv', 'env'], ['kkGrab', 'grab'], ['kkTool', 'tool']].forEach(([id, k]) => { const el = $(id); if (el) el.textContent = KK(k); }); }
  set('kmAct', actionCaption(ka, ka.k === 'none' ? (ka.stalk ? actVerb(ka) : '공격') : ka.k === 'cap' ? ka.label : actVerb(ka, actIcon(ka))), ka.k !== 'none' || ka.stalk);
  set('kmZ', actionCaption(ea, ea.busy ? ea.label : ea.k === 'none' ? '행동' : actVerb(ea, actIcon(ea))), ea.k !== 'none');
  set('kmQ', S.player.ledge || S.player.wire ? '떨어지기' : S.player.captive ? (canInterrogate() ? '심문' : '붙잡는 중') : '붙잡기', ga.k !== 'none' || canInterrogate());
  set('kmX', `${TOOL_NAME[input.tool]} ${toolCount(input.tool)}${input.tool === 'kunai' ? ' · 짧게 기절 / 길게 처치' : ''}`, toolCount(input.tool) > 0);
  set('kmSneak', S.player.mode === 'sneak' || input.sneakToggle ? '웅크림' : '웅크리기', S.player.mode === 'sneak' || input.sneakToggle);
}
// 길게 누르는 중: 버튼 둘레와 대상 위에 차오르는 고리 (히트맨식)
function holdFrac() { const p = S.player.lethalHold, h = S.koHold; return p ? clamp(p.t / LETHAL_HOLD, 0, 1) : h ? clamp((S.t - h.t0) / KO_HOLD, 0, 1) : 0; }
function drawHoldRing() {
  const h = S.koHold || S.player.lethalHold; if (!h) return; const f = holdFrac(), c = h.container || h.c || (h.a && h.a.c) || combatVictims(h.a)[0] || actObj(h.a) || S.player, x = c.x != null ? c.x : S.player.x, y = (c.y != null ? c.y : S.player.y) - 30;
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#e8473c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); ctx.restore();
  tag(x, y - 30, '계속 누르면 처치', '#ff8a76', 0.9);
}
