function startBodyAnim(k, c, dur, o) { const P = S.player; P.bodyAnim = Object.assign({ k, c, t0: S.t, dur, cx:c.x,cy:c.y,ca:c.a }, o || {}); P.strikeT = Math.max(P.strikeT || 0, dur); P.moving = false; }
function actCarry(force) {  // force: [행동] 버튼이 고른 보조 행동을 그대로 실행
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  const P = S.player;
  if (actionBusy(P) && !(P.interact && P.interact.committing)) return;
  if (P.hide) { if (P.hide.type === 'well') travelTunnel(); return; }
  if (P.z && !P.jump && !P.trav && !P.lunge && !P.wire) { const sa = force || secondaryAction(); if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 자경대원에게 안 보인다. 위로 밀면 올라서고, 가까이 온 자경대원은 끌어내린다'); } return; }
  if (P.z || P.jump || P.trav || P.lunge || P.grabIn || P.vent || P.under) return;
  if (P.captive) { actPrimary({ k: 'execute', viaZ: true, inputGroup: 'env' }); return; }
  const sa = force || secondaryAction();
  if (!(P.interact && P.interact.committing) && beginObjectAction(Object.assign({}, sa, { fromZ: true }))) return;
  if(sa.k==='quickStash'){beginQuickStash(sa);return;}
  if (sa.viaZ) { actPrimary(sa); return; }
  if (sa.k === 'cover') { enterCover(sa.n); return; }
  if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 자경대원에게 안 보인다. 위로 밀면 올라서고, 밖으로 밀면 손을 놓고 뛰어내린다(2층 높이까지). 가까이 온 자경대원은 끌어내린다'); return; }
  if (sa.k === 'uncover') { P.cover = null; play('cloth', 0.15); return; }
  if (sa.k === 'fdown') { actPrimary({ k: 'fdown', l: sa.l, at: sa.at, label: '', viaZ: true }); return; }  // 계단 내려가기는 늘 걸어 내려가는 동작으로
  if (sa.k === 'grab') { grab(sa.g); return; }
  if (sa.k === 'use') { useItem(sa.n); return; }
  if (sa.k === 'candy') { giveCandy(sa.g); return; }
  if (sa.k === 'pickup') { takeProp(sa.p); return; }
  if (sa.k === 'dropItem') { dropItem(); toast('내려놓았다', 1.2); return; }
  if (sa.k === 'dress') {  // 변장: 조직원 옷을 입으면 멀리서는 같은 편으로 보인다. 정예·표적은 얼굴을 알아보고, 뛰거나 가까이 붙으면 들킨다
    const c = sa.c, of = c.outfit || 'crew', previousLook = suspectLook(); c.stripped = true; after(0.9, () => bossRadio('disguise', true)); P.disguise = (c.ch || '').split('@')[0]; /* 주인공은 기본 체형 (모든 동작이 있다) */ P.outfit = of; P.disguiseBlown = !!(P.blown || {})[of]; onDisguiseChanged(previousLook); play('cloth', 0.6); noise(P.x, P.y, 30, 'cloth'); S.fade = 0.25; S.stats.dressed = (S.stats.dressed || 0) + 1;
    if (P.disguiseBlown) toast(`${withJosa(outfitName(of), '으로/로')} 갈아입었다 · 목격자가 기억하는 복장 · 재노출 주의`, 3, 'warn');
    else if (STAGE.zones) { toast(`${withJosa(outfitName(of), '으로/로')} 갈아입었다 — 허용 구역만 통과 · 보안구역 제외`, 3.2, 'good'); hint('disguise2', '복장은 일반 출입만 허용한다. 보안구역에서는 통하지 않고, 가까이 오래 있으면 일반 경비도 신원을 확인한다'); }
    else { toast('조직원 옷으로 갈아입었다 — 걸어 다니면 멀리서는 의심받지 않는다. 정예·표적은 얼굴을 안다', 3.2, 'good'); hint('disguise', '변장해도 범행이나 출입 권한이 없는 구역에서는 의심받는다'); }
    return;
  }
  if (sa.k === 'throwBody') {
    const c = P.carrying, g = sa.g; P.carrying = null; c.carried = false; c.discovered = true; S.stats.bodies++;
    const a = Math.atan2(g.y - P.y, g.x - P.x), d = Math.max(30, dist(P.x, P.y, g.x, g.y) - 26);
    c.fly = { x0: P.x, y0: P.y, x1: P.x + Math.cos(a) * d, y1: P.y + Math.sin(a) * d, t: 0, dur: 0.35 + d / 900 };
    P.strikeT = 0.25; play('throw', 0.6); return;
  }
  if (sa.k === 'steal') {
    const g = sa.g; const sk = g.hasKey; g.hasKey = null; P.keys[sk] = true; P.hasKey = true; finishEnvSelection();play('click', 0.4); S.stats.steal = (S.stats.steal || 0) + 1;
    if (P.mode !== 'sneak' && Math.random() < 0.5) { g.meter = 0.75; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.state = 'NOTICE'; g.poi = { x: P.x, y: P.y }; g.noticeT = 0; setIcon(g, '?'); toast('열쇠를 훔쳤다 — 그런데 눈치챈 것 같다!', 2.4, 'warn'); }
    else { toast('열쇠를 훔쳤다 (웅크린 채라 들키지 않았다)', 2.4, 'good'); bark('hero', 'key'); }
    return;
  }
  if (P.carrying) {
    const c = P.carrying; const b = sa.h || nearHide() || nearBushSpot(), pc = pairCarry(P);
    if (b) {beginHideFlow('stash',b,c);return;}
    if (pc) {  // 앞에 내려놓는다: 어깨에서 내려 → 안아 내림 → 허리 숙여 바닥에 눕힌다
      const ox = P.x + Math.cos(P.a) * 26, oy = P.y + Math.sin(P.a) * 26; if (!solidAt(Math.floor(ox / TILE), Math.floor(oy / TILE))) { c.x = ox; c.y = oy; } else { c.x = P.x; c.y = P.y; }
      c.a = P.a; c.t0 = null; c.td = null; c.hideT = S.t + 0.5; startBodyAnim('drop', c, 0.5); }
    c.carried = false; P.carrying = null;
    c.hidden = tileAt(c.x, c.y) === 'B';
    if (!c.hidden && solidAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE))) { c.x = P.x; c.y = P.y; c.hidden = P.hidden; }
    c.light = lightAt(c.x, c.y);
    play('drop', 0.5); noise(c.x, c.y, 70, 'drop');
    toast(c.hidden ? '시체를 화단에 숨겼다' : '시체를 내려놓았다 (눈에 띌 수 있음)', 2.2, c.hidden ? 'good' : '');
    return;
  }
  const c = sa.c || nearCorpse();
  if (c && !c.carried && !c.stashed && objectReachable(c, 46)) { const cx = c.x, cy = c.y, ca = c.a; c.carried = true; c.hidden = false; c.accident = null;c.playerHandled=true; P.carrying = c; if (pairCarry(P)) { P.a = Math.atan2(cy - P.y, cx - P.x); startBodyAnim('lift', c, 0.55, { cx, cy, ca }); } play('cloth', 0.5); if(!sa.quick)hint('carry', '운반 중엔 느리고 뛸 수 없다. 화단 위나 수거함·맨홀 옆에서 다시 누르면 숨긴다'); }
}
// 보조 버튼에 걸린 행동: 열쇠 훔치기 > 붙잡기 > 운반
function secondaryAction(envOnly) {  // envOnly: [행동] 버튼용 — 붙잡기·겹친 시설 행동은 빼고
  const P = S.player;
  if (actionBusy(P)) return busyEnvAction();
  if (P.under || P.vent) return { k: 'none', label: '보조' };
  if (P.ledge) return { k: 'none', label: '매달림' };
  if (P.z && !P.wire && !P.jump) { const lg = ledgeAt(P); if (lg) return { k: 'ledge', n: lg, label: '가장자리에 매달리기' }; }
  if (P.hide) return P.hide.type === 'well' && ugAt(P.hide.tx, P.hide.ty) ? { k: 'tunnel', label: '지하로' } : { k: 'none', label: '—' };
  if (P.captive) return { k: 'execute', label: '기절시키기', hold: '처치' };
  if (P.carrying) {
    if (!nearHide()) { const tg = S.guards.filter(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.target && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 300 && dist(g.x, g.y, P.x, P.y) > 70 && los(P.x, P.y, g.x, g.y) && Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))) < 1.0).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0]; if (tg) return { k: 'throwBody', g: tg, label: '시체 던지기 (겁주기)' }; }
    { const nh = nearHide()||nearBushSpot(); return { k: 'carry', c: P.carrying, h: nh, label: nh ? (hideSpace(nh,1)?(nh.type==='bush'?'화단에 숨기기':P.carrying.ko?'기절자 넣기':'시체 넣기'):hideName(nh)+' 가득 참'):'내려놓기' }; }
  }
  if (P.z || P.jump) return { k: 'none', label: '보조' };
  const ch = nearChild(); if (ch) return { k: 'candy', g: ch, label: `사탕 주기 · ${P.candy}개` };
  const kl0=killList(),kh=S.guards.filter(g=>g.hasKey&&meleeCandidate(g,P,60)).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0]; if (kh) return { k: 'steal', g: kh, label: keyName(kh.hasKey) + ' 훔치기' };
  const kg = kl0.filter(g => !g.elite && !g.dog); if (kg.length && !envOnly) return { k: 'grab', g: kg[0], label: kg[0].civ || kg[0].target ? '붙잡기' : '붙잡기 → 심문' };  // 암살이 닿는 거리면 붙잡기도 닿는다 (달려가 붙는다)
  const nu = nearUse(); if (nu) return { k: 'use', n: nu, label: nu.u.label };
  const pp = nearProp(); if (pp) return { k: 'pickup', p: pp, label: pp.outfit ? '옷 갈아입기 — ' + outfitName(pp.outfit) : '줍기 — ' + pp.name };
  const nc = nearCorpse(); if (nc && (STAGE.disguise || STAGE.zones) && !nc.dog && !nc.stripped && !nc.target && (nc.outfit || (!STAGE.zones && !(nc.ch || '').startsWith('civ'))) && !(P.disguise && !P.disguiseBlown && (nc.outfit || 'crew') === P.outfit)) return { k: 'dress', c: nc, label: (P.blown || {})[nc.outfit || 'crew'] ? '옷 갈아입기 (이미 들통난 옷)' : '옷 갈아입기 — ' + outfitName(nc.outfit || 'crew') };
  if (nc) return { k: 'carry', c: nc, label: '운반' };
  if(envOnly&&P.cover)return{k:'uncover',label:'엄폐에서 나오기'};
  const hp = envOnly ? {} : primaryAction(); if (hp.held) return Object.assign({}, hp.held, { viaZ: true }); if (hp.alt && hp.alt.k !== 'keymsg') return Object.assign({}, hp.alt, { viaZ: true });
  if (P.item) return { k: 'dropItem', label: P.item.name + ' 내려놓기' };
  return { k: 'none', label: '보조' };
}

// Explicit one-press clean-up: only an existing downed body, then lift, walk and store.
function quickStashChoice(c){
  const P=S.player;
  if(STAGE.tutorial&&!STAGE.flowPractice||P.carrying||P.captive||P.hide||P.under||P.vent||P.z||actionBusy(P)||!S.corpses.includes(c)||c.carried||c.stashed||c.hidden||!objectReachable(c,46))return null;
  const places=[...S.hides,...(S.bushes||[])].filter(h=>hideSpace(h,1)&&(h.type!=='bush'||tileAt(h.x,h.y)==='B')&&objectReachable(h,60)).sort((a,b)=>hideDistance(a)-hideDistance(b));
  for(const h of places){const route=hideApproach(h);if(route&&route.length<=96)return{k:'quickStash',c,h,fromZ:true,label:c.ko?'기절자 숨기기':'시체 숨기기'};}
  return null;
}
function beginQuickStash(a){
  const P=S.player,choice=quickStashChoice(a.c);
  if(!choice||choice.h!==a.h)return;
  actCarry({k:'carry',c:a.c,quick:true});if(P.carrying!==a.c)return;
  P.quickStash={c:a.c,h:a.h,x:P.x,y:P.y,fl:flOf(P),z:P.z||0,readyAt:S.t+.55};
}
function updateQuickStash(P,dt){
  const q=P.quickStash;if(!q)return false;
  if(S.over||P.hurtT>0||P.carrying!==q.c||!S.corpses.includes(q.c)||flOf(P)!==q.fl||(P.z||0)!==q.z||dist(P.x,P.y,q.x,q.y)>8||P.trav||!hideSpace(q.h,1)||q.h.type==='bush'&&tileAt(q.h.x,q.h.y)!=='B'||!objectReachable(q.h,60)||![...S.hides,...(S.bushes||[])].includes(q.h)){P.quickStash=null;return false;}
  P.hidden=false;P.light=lightAt(P.x,P.y,!!P.z);P.vx=P.vy=0;P.moving=false;P.strikeT=Math.max(0,(P.strikeT||0)-dt);
  if(S.t<q.readyAt)return true;
  P.quickStash=null;const route=hideApproach(q.h);
  if(route&&route.length<=96&&beginHideFlow('stash',q.h,q.c)&&P.trav?.hideFlow)P.trav.hideFlow.quick=true;
  return !!P.trav;
}
