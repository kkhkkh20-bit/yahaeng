// ---------------------------------------------------------------- 버튼 네 개 (히트맨·메탈기어식으로 공격과 환경 행동을 나눈다)
// [공격] 큰 버튼 — 톡 = 기절, 계속 누르면 처치 (표적도 같은 기준). 공격할 사람이 닿을 때만 켜진다
// [행동] 두 번째 — 문·창문·락픽·숨기·계단·줍기·시체 메기·옷 갈아입기. 절대 공격으로 바뀌지 않는다
// [붙잡기] 작은 버튼 — 등 뒤에서 잡기. 잡은 뒤: [공격] 톡 기절 / 계속 처치, [행동] 숨을 곳으로 끌고 가기, 가만히 있으면 심문
// [다트] 작은 버튼 — 톡 = 앞쪽 표시된 대상에 자동 조준, 끌기 = 직접 조준 (도구 바꾸기는 위 칩)
const ATK_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'ventKill', 'pull', 'ledgeKill', 'pushOff', 'counter']);
const isAtk = a => !!a && (ATK_K.has(a.k) || !!a.kill);
// 겹친 대상까지 훑은 행동 후보 (사람 근처 '공격 우선' 바꾸기 없이 날것 그대로)
// 한 프레임 안에서 화면·버튼·라벨이 같은 계산을 되풀이하지 않게 (시각·위치가 같으면 그대로). 버튼을 누를 땐 새로 구한다
let RC = null;
const rcKey = () => { const P = S.player; return S.t + '|' + P.x + '|' + P.y + '|' + (P.fl || 0) + '|' + (P.z || 0) + '|' + !!P.interact + !!P.pick + !!P.trav + !!P.lunge + !!P.grabIn + '|' + (P.strikeT > 0) + '|' + !!P.captive + !!P.carrying + !!P.hide + !!P.ledge + !!P.wire; };
function rawChoices(n = 7) {
  const key = rcKey(); if (RC && RC.key === key) return RC.out.slice();
  const out = rawChoices0(n); RC = { key, out }; return out.slice();
}
function rawChoices0(n) {
  const out = []; ACT_SKIP.clear();
  try { for (let i = 0; i < n; i++) { const a = combatLabel(primaryActionRaw()); if (!a || a.k === 'none') break; const o = actObj(a); if (out.some(x => x.k === a.k && actObj(x) === o)) break; out.push(a); if (!o) break; ACT_SKIP.add(o); } }
  finally { ACT_SKIP.clear(); }
  return out;
}
// 톡 = 기절, 계속 = 처치가 되는 공격 (떨어뜨리기·밀어 떨어뜨리기는 떨어지는 것 자체가 죽음이라 제외)
const KO_K = new Set(['kill', 'kill2', 'pull', 'ambush', 'drop', 'ventKill', 'winJump', 'up']);
function koLabel(a) {  // 조직원·주민은 먼저 기절 (계속 누르면 처치)
  const v = a.g || (a.list && a.list[0]) || a.kill;
  if (v && (koDefault(v) || (koFirst(v) && KO_K.has(a.k))) && /암살|처치/.test(a.label || '')) { a.label = a.label.replace('표적 암살', '기절시키기').replace(/암살|처치/, '기절'); a.hold = '처치'; }
  return a;
}
function attackAction() {
  const P = S.player; if (actionBusy(P)) return { k: 'none', busy: true, label: P.lethalHold ? '길게 누르는 중' : '공격' };
  if (P.car) return { k: 'none', label: '경적', honk: true };
  if (P.captive) return { k: 'cap', label: '기절', hold: '처치' };
  const a = rawChoices().find(isAtk); if (a) return koLabel(Object.assign({}, a));
  const c = nearFinish(); if (c) return combatLabel({ k: 'finish', c, g: c.g });
  // 다가가는 중: 미리 눌러 두면 닿는 순간 공격. 지나가는 행인까지 표시하지 않게 가까울 때만 (주민 90 · 조직원 150)
  // 등 뒤에 있을 때만 다가가기 표시 (정면이면 공격을 권하지 않는다)
  const sg = stalkGuard(); if (sg && dist(P.x, P.y, sg.x, sg.y) < (sg.civ ? 90 : 150) && Math.abs(angDiff(sg.a, Math.atan2(P.y - sg.y, P.x - sg.x))) > 1.75) return { k: 'none', stalk: sg, label: koTap(sg) ? '기절' : '처치' };
  return { k: 'none', label: '공격' };
}
// [행동] 후보: 환경 행동 + (시체 메기·내려놓기·옷 갈아입기·줍기 등 예전 [보조] 쪽 일). 붙잡은 뒤엔 '끌고 가기'
const ENV_Z = new Set(['carry', 'dress', 'pickup', 'use', 'dropItem', 'candy', 'steal', 'ledge', 'tunnel', 'throwBody']);
function secondaryEnvChoices() {
  const out = []; ACT_SKIP.clear();
  try {
    for (let i = 0; i < 6; i++) {
      const a = secondaryAction(true); if (!a || !ENV_Z.has(a.k)) break;
      const o = actObj(a); if (out.some(b => b.k === a.k && actObj(b) === o)) break;
      out.push(Object.assign({}, a, { fromZ: true }));
      if (a.k === 'dress') out.push({ k: 'carry', c: a.c, label: '운반', fromZ: true });
      if (!o) break; ACT_SKIP.add(o);
    }
  } finally { ACT_SKIP.clear(); }
  return out;
}
function envChoices() {
  if (actionBusy()) return [];
  const hanging = S.player;
  if (hanging.ledge) return hanging.trav || hanging.jump ? [] : [{ k: 'ledgeUp', label: '올라가기', at: { x: hanging.x, y: hanging.y - 20 } }];
  if (hanging.wire) { const exit = wireExitAction(); return exit ? [exit] : []; }
  const P = S.player, z = secondaryEnvChoices(), sa = z[0];
  if(P.captive){const d=rawChoices().find(a=>a.k==='drag');if(d)return[d];const h=nearHide();return h&&!hideSpace(h,1,true)?[{k:'keymsg',h,at:h,label:'공간 부족'}]:[];}
  const env = rawChoices().filter(a => !isAtk(a) && a.k !== 'execute' && !(a.k === 'stash' && z.some(b => b.k === 'carry' && b.h === a.h)));
  // 손이 스위치 쪽에 더 가까울 때만 조명을 먼저 제안한다. 명시적으로 고른 대상은 envAction이 유지한다.
  const lamp = env.find(a => a.k === 'lamp' && a.l.pole), pole = lamp && env.find(a => a.k === 'wireOn' && a.pole && a.targetObject && dist(a.targetObject.x, a.targetObject.y, lamp.l.x, lamp.l.y) < TILE);
  if (pole && dist(P.x, P.y, lamp.at.x, lamp.at.y) < dist(P.x, P.y, pole.targetObject.x, pole.targetObject.y)) {
    env.splice(env.indexOf(lamp), 1); env.unshift(lamp);
  }
  { const rc = !P.carrying && rumorTarget(); if (rc && !env.some(a => a.k === 'rumor')) env.push({ k: 'rumor', c: rc, at: { x: rc.x, y: rc.y }, label: '소문 흘리기' }); }  // 문·창문 옆이어도 [대상]으로 고를 수 있게
  // 시체 옆·메고 있을 때는 시체 일이 먼저, 그 밖엔 환경 행동이 먼저
  // 시체를 멘 채 계단 칸: 오르내리기가 먼저 (내려놓기는 ⇄)
  if (P.carrying) { const st = env.filter(a => (a.k === 'up' || a.k === 'fdown') && a.l && a.l.kind === 'fstair'); if (st.length) return st.concat(z, env.filter(a => !st.includes(a))); }
  // 맨홀 안: [행동] = 지하로 (나오기는 조이스틱을 밀면)
  return (P.carrying || (sa && (sa.k === 'carry' || sa.k === 'dress' || sa.k === 'tunnel'))) ? z.concat(env) : env.concat(z);
}
function envAction() {
  if (actionBusy()) return busyEnvAction();
  const L = envChoices(); if (!L.length) {
    const p=S.player,a=S.envPickP;
    if(S.envExplicit && a && a.fl===flOf(p) && a.z===(p.z||0) && dist(p.x,p.y,a.x,a.y)<30) return {k:'none',label:'대상이 사라짐',blocked:true};
    S.envExplicit=null; S.envKey = S.envPick = S.envPickK = S.envPickP = null; S.envSel = 0; return { k: 'none', label: S.player.ledge || S.player.wire ? '올라가기' : '행동' }; }
  const key = L.map(a => a.k + oid(actObj(a))).join('|'), PP = S.player, anchor = S.envPickP;
  const stay = anchor && anchor.fl === flOf(PP) && anchor.z === (PP.z || 0) && Math.hypot(PP.x - anchor.x, PP.y - anchor.y) < 30;
  if (!stay) S.envExplicit = null;
  if (stay && S.envExplicit && !L.some(a=>envToken(a)===S.envExplicit)) return {k:'none',label:'대상이 사라짐',blocked:true,choices:L.length,choiceI:-1};
  if (key !== S.envKey) { S.envKey = key; const j = stay ? L.findIndex(a => a.k === S.envPickK && oid(actObj(a)) === S.envPick) : -1; S.envSel = j >= 0 ? j : 0; } else if (!stay) S.envSel = 0;
  const i = (S.envSel || 0) % L.length, a = L[i], pk = oid(actObj(a));
  if (!stay || pk !== S.envPick || a.k !== S.envPickK) S.envPickP = { x: PP.x, y: PP.y, fl: flOf(PP), z: PP.z || 0 };
  S.envPick = pk; S.envPickK = a.k;
  a.choices = L.length; a.choiceI = i; return a;
}
function grabAction() {
  const P = S.player; if (actionBusy(P)) return { k: 'none', busy: true, label: '붙잡기' };
  if (P.ledge || P.wire) { const ok = !P.jump && !P.trav && (P.ledge ? landBelow(P.x, P.y, P.ledge, P.z) : wireFallOk()); return { k: ok ? (P.ledge ? 'ledgeDrop' : 'wireFall') : 'none', label: '떨어지기', blocked: !ok }; }
  if (P.car) return { k: 'none', label: '붙잡기' }; if (P.captive) return { k: 'none', label: canInterrogate() ? '심문 중' : '붙잡는 중' };
  const g = grabTarget(); if (g) return { k: 'grab', g, label: '붙잡기' };
  // 공격 사거리 밖에서도 별도 붙잡기 입력을 먼저 알린다. 실행 가능 판정은 grabTarget 그대로다.
  if (P.hide || P.carrying || P.under || P.vent || P.z) return { k: 'none', label: '붙잡기' };
  const near = S.guards.filter(g => !g.child && !g.dog && !g.doomed && !g.climb && !['DEAD','CAPTIVE'].includes(g.state) && flOf(g)===flOf(P) && (g.z||0)===(P.z||0) &&
    dist(P.x,P.y,g.x,g.y)<(g.elite||g.civ||g.state==='ALERT'?72:150) && los(P.x,P.y,g.x,g.y))
    .sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0];
  if (!near) return { k: 'none', label: '붙잡기' };
  const behind=Math.abs(angDiff(near.a,Math.atan2(P.y-near.y,P.x-near.x)))>1.75;
  return { k: 'none', near, label: '붙잡기', reason: near.elite?'정예 불가':near.state==='ALERT'?(near.seen?'교전 중':'경계 중'):!behind?'등 뒤로':'더 가까이' };
}
function actAttack() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) { if (S && DLG.modal) advanceDialog(); return; }
  if (DLG.modal) { advanceDialog(); return; }
  const P = S.player;
  if (actionBusy(P)) return;
  if (P.car) { honk(); return; }
  if (P.captive) { actPrimary({ k: 'execute', viaZ: true, inputGroup: 'atk' }); return; }  // 기절 → 계속 누르면 처치 (updateKoHold)
  const a = attackAction();
  if (a.k === 'none') { if (a.stalk) { S.qBuf = 0.5; S.qKill = true; } return; }
  // 끌어당기기·끌어들이기·위에서 덮치기도 조직원은 먼저 기절 (계속 누르고 있으면 updateKoHold 가 처치)
  // 제압 의도는 대상에 묶는다. 비동기 끌어당기기가 다른 사람을 처치로 바꾸지 않는다.
  actPrimary(Object.assign({}, a, { viaZ: true, inputGroup: 'atk' }));
}
function actEnv() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (DLG.modal) { advanceDialog(); return; }
  if (input.aiming) { queueAim(); return; }
  if (actionBusy()) return;
  const a = envAction(); if (a.k === 'none') { if(a.blocked)toast('선택한 대상에 손이 닿지 않는다',1.4); return; }
  if (a.fromZ) actCarry(a); else actPrimary(Object.assign({}, a, { viaZ: true, inputGroup: 'env' }));
  S.envExplicit=null; closeEnvPicker();
}
function actGrab() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (DLG.modal) { advanceDialog(); return; }
  if (actionBusy()) return;
  if (S.player.ledge || S.player.wire) { const a = grabAction(); if (a.k !== 'none') actPrimary(Object.assign({}, a, { viaZ: true })); return; }
  if (S.player.captive) { if (canInterrogate()) interrogate(); return; }  // 잡은 채 한 번 더 = 바로 심문 (가만히 있어도 저절로 한다)
  const a = grabAction(); if (a.k === 'grab') grab(a.g);
}
function cycleEnv() { if (!S || actionBusy()) return; const a = envAction(), L=envChoices(); if (!L.length || (L.length===1&&!a.blocked)) return; const i=L.findIndex(v=>envToken(v)===envToken(a)); selectEnvTarget(envToken(L[(i+1)%L.length])); play('click', 0.2); }
