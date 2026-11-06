const RISKY_K = new Set(['door', 'keypad', 'lamp', 'bfuse', 'fuse', 'read', 'keymsg', 'pick']);
const KILL_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'pull', 'ventKill', 'ledgeKill', 'pushOff', 'winJump']);
function stalkGuard() {
  if(!concealedMeleeAllowed())return null;
  const P = S.player; if (P.z || P.carrying || P.captive || P.hide || P.under || P.vent || P.wire) return null;
  let best = null, bd = 190;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'FLEE' || g.state === 'TERROR' || g.climb || (g.state === 'ALERT' && !radioBusy(g))) continue;
    if (flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd && los(P.x, P.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
// 물체가 겹칠 때: 주 행동 후보를 대상 하나씩 빼 가며 다시 구해 목록을 만들고(최대 4), 고른 것(S.actSel)을 주 행동으로 쓴다
// 바꾸기: Tab · 터치 ⇄ 버튼. 후보 묶음이 바뀌면 처음(가장 우선)으로 돌아간다
const ACT_SKIP = new Set();
const actObj = a => a.targetObject || a.it || a.g || (a.list && a.list[0]) || a.l || a.d || a.fb || (a.wv && a.wv.w) || a.w || (a.n && a.n.u) || a.n || a.h || a.p || a.c || a.v || (a.o && (a.o.w || a.o.d)) || a.o || (a.tp && (a.tp.t || a.tp.car || a.tp)) || a.j || a.lv || null;  // 함정·차 경보는 매번 새로 만든 묶음이 아니라 그 물건으로 구분
const _oid = new WeakMap(); let _oidN = 0; const oid = o => { if (!o || typeof o !== 'object') return ''; if (!_oid.has(o)) _oid.set(o, ++_oidN); return _oid.get(o); };
function actionChoices() {
  const out = []; ACT_SKIP.clear(); let pref;
  try { for (let i = 0; i < 4; i++) { const a = combatLabel(primaryActionOne()); if (!i) pref = S.ikPref; if (!a || a.k === 'none') { if (!out.length) out.push(a); break; }
    const o = actObj(a); if (out.length && (!o || ACT_SKIP.has(o) || out.some(x => x.k === a.k && x.label === a.label && actObj(x) === o))) break; out.push(a); if (!o) break; ACT_SKIP.add(o); } } finally { ACT_SKIP.clear(); if (pref !== undefined) S.ikPref = pref; }
  return out;
}
function primaryAction() {
  const L = actionChoices(); if (!S) return L[0];
  if (L.length > 1 && /^달려들어/.test(L[0].label || '')) L.push(L.shift());  // 거리를 좁히는 '달려들어' 공격은 다른 행동 뒤로 (문·금고 앞에서 실수로 덮치지 않게)
  if (L.length <= 1) { S.actKey = null; S.actSel = 0; return L[0] || { k: 'none', label: '' }; }
  const key = L.map(a => a.k + oid(actObj(a))).join('|'); const PP = S.player, stay = S.actPickP && Math.hypot(PP.x - S.actPickP.x, PP.y - S.actPickP.y) < 30; if (key !== S.actKey) { S.actKey = key; const j = stay ? L.findIndex(a => oid(actObj(a)) === S.actPick) : -1; S.actSel = j >= 0 ? j : 0; } else if (!stay) S.actSel = 0;  // 목록이 바뀌어도 고르던 대상이 남아 있으면 그대로 (대상이 쉽게 바뀌지 않게)
  const i = (S.actSel || 0) % L.length, a = L[i], pk = oid(actObj(a)); if (pk !== S.actPick) S.actPickP = { x: S.player.x, y: S.player.y }; S.actPick = pk;  // 고르던 대상은 그 자리(30px 안)에서만 유지 — 걸어서 옮기면 가까운 쪽부터 다시
  a.choices = L.length; a.choiceI = i; a.others = L.filter((x, j) => j !== i); return a;
}
function cycleAction() { if (!S) return; const a = primaryAction(); if (!(a.choices > 1)) return; S.actSel = (S.actSel || 0) + 1; play('click', 0.2); }
function primaryActionOne() {
  const a = electricalChoice(primaryActionRaw());
  if(a.skillLocked)return a;
  if (RISKY_K.has(a.k) && !(S.actPick && S.actPick === oid(actObj(a)))) { const sg = stalkGuard(); if (sg) return { k: 'none', stalk: sg, held: a, label: koTap(sg) ? '기절시키기' : '암살' }; }  // 이미 다루던 시설 행동은 사람이 다가와도 그대로 둔다 (공격은 F·⇄로)
  const v = a.g || (a.list && a.list[0]) || a.kill || ((a.k === 'execute' || a.k === 'drag') && S.player.captive) || null;
  if (v && ((koDefault(v) && !v.civ) || (koFirst(v) && (a.k === 'kill' || a.k === 'kill2'))) && a.label && /암살|처치/.test(a.label) && !['ledgeKill', 'pushOff'].includes(a.k)) { a.label = a.label.replace('표적 암살', '기절시키기').replace(/암살|처치/, '기절'); a.hold = '처치'; }
  return a;
}
function primaryActionRaw() {
  const P = S.player;
  if (actionBusy(P)) return { k: 'none', label: '…' };
  if (P.under) { const w = nearSewerExit(); return w ? { k: 'surface', w, label: '올라가기' } : { k: 'none', label: '지하' }; }
  if (P.vent) { const t = ventAmbushTarget(); if (t) return { k: 'ventKill', g: t.g, v: t.v, label: '끌어들여 기절' }; const v = nearVent(); return v ? { k: 'ventOut', v, label: v.roof ? '옥상으로 나가기' : v.street ? '거리로 나가기' : '실내로 나가기' } : { k: 'none', label: '환풍구' }; }
  if (P.hide) { const g = ambushTarget(); return g ? { k: 'ambush', g, label: '끌어들여 암살' } : { k: 'leave', label: '나오기' }; }
  if (P.jump) return { k: 'none', label: '…' };
  if (S.vehicles) { const ca = cityAction(); if (ca) return ca; }  // 도시: 차 타기·내리기·의뢰 받기
  { const cg = counterTarget(); if (cg) return { k: 'counter', g: cg, label: '반격!' }; }  // 내려치기 직전이면 무엇보다 먼저
  if (P.wire) {
    const h = wirePt(P.wire.w, P.wire.s), at = { x: h.x, y: h.y - 6 };
    const g = wireDropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const exit = wireExitAction(); if (exit) return exit;
    if (wireFallOk()) return { k: 'wireFall', at, label: '뛰어내리기' };
    return { k: 'none', label: '전깃줄' };
  }
  if (P.ledge) { const lg = ledgeTarget(); return lg ? { k: 'ledgeKill', g: lg, label: lg.civ ? '끌어내리기' : '끌어내려 떨어뜨리기' } : { k: 'ledgeUp', label: '올라서기' }; }
  if (P.z) {
    const po = pushOffTarget(); if (po) return { k: 'pushOff', g: po, at: po.climb.to, label: '배관에서 밀어 떨어뜨리기' };
    const kz = killList(); if (kz.length) return { k: kz.length === 2 && !kz.some(g => g.civ) ? 'kill2' : 'kill', list: kz.length === 2 && kz.some(g => g.civ) ? kz.slice(0, 1) : kz, label: (dist(P.x, P.y, kz[0].x, kz[0].y) > MELEE_CONTACT ? '달려들어 ' : '') + (kz[0].target ? '표적 암살' : '암살') };
    if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }  // 옥탑방 벽에 기대 있을 때
    const tz = nearTrap(); if (tz) return { k: 'trap', tp: tz, label: tz.label };
    const hz = nearHide(); if (hz && !(P.carrying && hz.bodies >= hz.cap)) return P.carrying ? { k: 'stash', label: '넣기' } : { k: 'hide', h: hz, label: `${hideName(hz)}에 숨기` };  // 옥탑방
    const g = dropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const wm = nearWireMount(); if (wm) return { k: 'wireOn', w: wm.w, s: wm.s, at: wm.at, label: STAGE.tutorial ? '훈련 로프 잡기' : wm.mid ? '손 뻗어 전깃줄 잡기' : '전깃줄 타기' };
    // 낮은 옥상(컨테이너 등) 위에서 더 높은 옥상으로 오르는 배관·사다리 — 내려가는 곳과 붙어 있으면 더 가까운 쪽이 먼저(나머지는 F·⇄로)
    const cuz = nearClimb(), cdz = nearClimbDown(true); if (cuz && cuz.kind !== 'balc' && cuz.kind !== 'fstair' && (!cdz || dist(P.x, P.y, cuz.x, cuz.y) <= dist(P.x, P.y, cdz.rx != null ? cdz.rx : cdz.ux, cdz.ry != null ? cdz.ry : cdz.uy))) return { k: 'up', l: cuz, label: cuz.kind === 'pipe' ? '배관 오르기' : '오르기' };
    if (cuz && cuz.kind !== 'balc' && cuz.kind !== 'fstair' && !cdz) return { k: 'up', l: cuz, label: cuz.kind === 'pipe' ? '배관 오르기' : '오르기' };
    const cd = cdz; if (cd) return cd.kind === 'chimney' ? (lampOn(cd.lamp) ? { k: 'smother', l: cd, label: '굴뚝 막기 (불 끄기)' } : { k: 'down', l: cd, label: '굴뚝으로 내려가기' }) : { k: 'down', l: cd, label: cd.kind === 'stair' ? `내려가기 · ${(cd.bfl || 0) + 1}층` : '내려가기' };
    const rv = nearVent(); if (rv) return { k: 'ventIn', v: rv, label: withJosa(ventName(rv),'으로/로')+' 들어가기' };
    const jt = jumpTarget(); if (jt) return { k: 'leap', j: jt, label: '건너뛰기' };
    { const wu = wallUpSpot(); if (wu) return { k: 'wallUp', s: wu, at: wu.at, label: `벽 잡고 오르기 · ${wu.z}층 옥상` }; }
    const ds = dropSpot(); if (ds) return { k: 'jump', s: ds, label: P.z >= 2 ? '1층 옥상으로' : '뛰어내리기' };
    return { k: 'none', label: '암살' };
  }
  if (P.captive) {
    return { k: 'execute', label: '기절', hold: '처치' };
  }
  if (P.hidden) { const ag = ambushTarget(); if (ag) return { k: 'ambush', g: ag, label: '끌어들여 암살' }; }
  if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }
  const kl = killList();
  if (kl.length === 2 && !kl.some(g => g.civ)) return { k: 'kill2', list: kl, label: '동시 암살' };
  if (kl.length === 2) kl.length = 1;
  if (kl.length === 1) return { k: 'kill', list: kl, label: kl[0].civ ? '기절시키기' : (dist(P.x, P.y, kl[0].x, kl[0].y) > MELEE_CONTACT ? '달려들어 ' : '') + (kl[0].target ? '표적 암살' : '암살') };
  const nt = nearNote(); if (nt) return { k: 'read', n: nt, at: nt, label: nt.read ? '메모 다시 읽기' : nt.title+' 읽기' };
  {const call=nearRendezvous();if(call)return call;}
  const lt = nearLoot(); if (lt) { const L = LOOT[lt.furn]; return { k: 'loot', it: lt, at: { x: lt.dx, y: lt.dy }, label: itemObjectiveAction(lt)?itemObjectiveText(lt)+(itemObjectiveBlock(lt)?(itemObjectiveAction(lt).requiresKey?' · 카드 필요':' · 명세서 필요'):''):`${L[1]} — ${(STAGE.itemNames || [])[S.items.indexOf(lt)] || STAGE.itemName || '서류'}` }; }
  { const fdE = nearFloorDown(), swE = fdE && fdE.kind !== 'balc' && nearSideWin();  // 내려가는 자리와 옆 건물 창문이 붙어 있으면 더 가까운 쪽 하나만
    if (swE && dist(P.x, P.y, downPt(fdE).x, downPt(fdE).y) <= dist(P.x, P.y, swE.x, swE.y)) return { k: 'fdown', l: fdE, at: downMark(fdE), label: `내려가기 · ${fdE.bfl + 1}층` }; }
  const sw = nearSideWin(); if (sw) { const L = sw.link, v = landingVictim(tc(L.tx + L.dir), tc(L.ty), sw.fl); if (v) return { k: 'winJump', w: sw, kill: v, at: { x: v.x, y: v.y }, label: v.civ ? '창문 넘어 기절시키기' : '창문 넘어 암살' }; return { k: 'winJump', w: sw, at: { x: sw.x, y: sw.y }, label: `창문 건너 옆 건물 ${sw.fl + 1}층으로` }; }
  const ww = nearWinWire(); if (ww) return { k: 'wireOn', w: ww.w, s: ww.s, at: ww.at, label: '창밖 전깃줄 타기' };
  const pw = nearPole(); if (pw) return { k: 'wireOn', w: pw.w, s: pw.s, at: pw.at, targetObject: pw.pole, pole: true, label: STAGE.tutorial ? '훈련 지주 올라 로프로' : '전봇대 올라 전깃줄로' };
  let cu = nearClimb(); if (cu && cu.kind !== 'fstair' && cu === S.stairBack && S.t - S.stairBackT < 2.5 && dist(P.x, P.y, S.stairBackP.x, S.stairBackP.y) < 60) cu = null;  // 방금 내려온 계단은 바로 다시 오르기로 잡지 않는다
  if (cu && cu.kind === 'balc') { const v = landingVictim(cu.ux, cu.uy, cu.tfl); if (v) return { k: 'up', l: cu, kill: v, at: { x: cu.x, y: cu.y - 30 }, label: v.civ ? '베란다 넘어 기절시키기' : '베란다 넘어 암살' }; }
  // 계단실: 계단 칸 위에 올라서야 [오르기], 그 앞(올라와 선 자리)은 [내리기] — 나머지는 F·⇄로
  const fd0 = cu && cu.kind !== 'balc' && nearFloorDown(); if (fd0 && fd0.kind !== 'balc' && (stairHole(fd0) ? dist(P.x, P.y, cu.x, cu.y) > 30 : dist(P.x, P.y, downPt(fd0).x, downPt(fd0).y) < dist(P.x, P.y, cu.x, cu.y))) return { k: 'fdown', l: fd0, at: downMark(fd0), label: `내리기 · ${fd0.bfl + 1}층` };
  if (cu) return { k: 'up', l: cu, at: cu.kind === 'fstair' || cu.kind === 'stair' ? stairLower(cu).up.marker : undefined, label: cu.kind === 'balc' ? '베란다 타고 2층으로' : cu.gas ? '가스관 타고 옥상으로' : cu.kind === 'pipe' ? '배관 오르기' : cu.kind === 'fstair' ? `오르기 · ${cu.tfl + 1}층` : cu.kind === 'stair' ? '오르기 · 옥상' : cu.kind === 'chimney' ? '굴뚝으로 오르기' : '오르기' };
  const gv = nearVent(); if (gv) return { k: 'ventIn', v: gv, label: withJosa(ventName(gv),'으로/로')+' 들어가기' };
  const fd = nearFloorDown(); if (fd) return { k: 'fdown', l: fd, at: fd.kind === 'balc' ? null : downMark(fd), label: fd.kind === 'balc' ? '내려가기 · 베란다로' : `내려가기 · ${fd.bfl + 1}층` };
  { const wd = nearWinDrop(); if (wd) return { k: 'winDrop', w: wd, at: { x: wd.x, y: wd.y }, label: '창문 넘어 내려가기' }; }
  const nw = nearWindow(); if (nw) {
    const ws = winSt(nw.w);
    if (ws === 'lock' || ws === 'bar') { const inside = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === nw.w.b, bar = ws === 'bar';
      if (inside) return { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: 'latch', w: nw.w, x: nw.w.x, y: nw.w.y }, label: bar ? '방범창 고정쇠 풀기' : '창문 걸쇠 풀기' };
      return P.picks > 0 ? { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: bar ? 'bar' : 'win', w: nw.w, x: nw.w.x, y: nw.w.y }, label: bar ? `방범창 — 락픽으로 풀기 (느림 · ${P.picks}개)` : `잠긴 창문 — 락픽으로 따기 (${P.picks}개)` } : { k: 'keymsg', at: { x: nw.w.x, y: nw.w.y }, label: bar ? '방범창 — 락픽이 없다' : '잠긴 창문 — 락픽이 없다' }; }
    return { k: 'window', wv: nw, label: '창문 넘기' };
  }
  { const wc = nearWinClimb(); if (wc) return { k: 'winClimb', w: wc, at: { x: wc.x, y: wc.y }, label: '벽 타고 2층 창문으로' }; }  /* 1층 창문이 먼저, 2층 창문 오르기는 ⇄ */
  const h = nearHide();
  if(h&&!P.carrying)return hideSpace(h,0,true)?{k:'hide',h,label:'들어가 숨기'}:{k:'keymsg',h,label:hideName(h)+' 가득 참'};
  if(h&&P.carrying)return hideSpace(h,1)?{k:'stash',h,c:P.carrying,label:P.carrying.ko?'기절자 넣기':'시체 넣기'}:{k:'keymsg',h,label:hideName(h)+' 가득 참'};
  if (P.carrying) {const bs=nearBushSpot();return bs?{k:'stash',h:bs,c:P.carrying,label:'화단에 숨기기'}:{k:'none',label:'—'};}
  const tp = nearTrap(); if (tp) return { k: 'trap', tp, label: tp.label };
  if (nearFuse()) return { k: 'fuse', targetObject: STAGE.fuse, at: { x: tc(STAGE.fuse[0]), y: tc(STAGE.fuse[1]) }, label: (STAGE.powerName || '구역 조명')+' 전원 차단' };
  // 문과 두꺼비집·조명이 함께 가까우면 더 가까운 쪽
  // 문·두꺼비집·조명이 함께 가까우면: 가까운 쪽, 단 방금 고른 것은 24px 더 멀어질 때까지 유지 (몇 픽셀 차이로 바뀌지 않게). 다른 하나는 Z로
  const dr = nearDoor(), bf = nearBFuse(), lp = nearLamp(), cands = [];
  if (dr && !P.carrying) cands.push({ k: 'door', d: dist(P.x, P.y, dr.x, dr.y), a: () => doorAct(dr) });
  if (bf) cands.push({ k: 'bfuse', d: dist(P.x, P.y, bf.x, bf.y), a: () => ({ k: 'bfuse', fb: bf, label: '건물 전원 끄기' }) });
  if (lp) cands.push({ k: 'lamp', d: dist(P.x, P.y, lampControl(lp).x, lampControl(lp).y), a: () => ({ k: 'lamp', l: lp, at: lampControl(lp), label: lp.hearth ? (lp.off ? '불 피우기' : '아궁이 불 끄기') : lampName(lp)+(lampCircuitOff(lp)?' 켜기':' 끄기') }) });
  if (cands.length) {
    cands.sort((a, b) => a.d - b.d); let pick = cands[0];
    const pref = cands.find(c => c.k === S.ikPref); if (pref && pref !== pick && pref.d - pick.d < 24) pick = pref;
    S.ikPref = pick.k; const res = pick.a(), other = cands.find(c => c !== pick); if (other) res.alt = other.a();
    return res;
  }
  { const cr = S.camRoom; if (cr && !ACT_SKIP.has(cr) && (!S.camsOff||cameraRecordingExists()) && flOf(P) === cr.fl && !P.z && !P.carrying && dist(P.x, P.y, cr.x, cr.y) < 46) return { k: 'camroom', targetObject: cr, at: { x: cr.x, y: cr.y }, label: S.camsOff?'녹화 기록 지우기':cameraRecordingExists()?'감시망 정지 · 녹화 기록 지우기':'감시망 정지' }; }  // 관리실 화면
  { const c=nearCameraCable();if(c)return{k:'camCable',targetObject:c,at:c,label:'CCTV 전선 분리 · 2초'}; }
  { const wu = wallUpSpot(); if (wu) return { k: 'wallUp', s: wu, at: wu.at, label: `벽 잡고 오르기 · ${wu.z}층 옥상` }; }
  { const bd = nearBlood(); if (bd) return { k: 'clean', d: bd, at: { x: bd.x, y: bd.y }, label: '핏자국 닦기' }; }
  { const rc = rumorTarget(); if (rc) return { k: 'rumor', c: rc, at: { x: rc.x, y: rc.y }, label: '소문 흘리기' }; }  // 거리 주민에게 조직 싸움을 부추긴다  // 닦기는 다른 할 일이 없을 때만 (숨기·문·계단을 가로채지 않게)
  return { k: 'none', label: '암살' };
}
