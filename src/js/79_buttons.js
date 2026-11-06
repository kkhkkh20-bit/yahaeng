// ---------------------------------------------------------------- 버튼 네 개 (히트맨·메탈기어식으로 공격과 환경 행동을 나눈다)
// [공격] 큰 버튼 — 모든 사람은 톡 = 기절, 1초 길게 누르면 살해. 공격할 사람이 닿을 때만 켜진다
// [행동] 두 번째 — 문·창문·락픽·숨기·계단·줍기·시체 메기·옷 갈아입기. 절대 공격으로 바뀌지 않는다
// [붙잡기] 작은 버튼 — 등 뒤에서 잡기. 먼저 바깥에서 기절시키고 별도로 운반·은닉한다.
// [다트] 작은 버튼 — 톡 = 앞쪽 표시된 대상에 자동 조준, 끌기 = 직접 조준 (도구 바꾸기는 위 칩)
const ATK_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'ventKill', 'pull', 'ledgeKill', 'pushOff', 'counter']);
const isAtk = a => !!a && (ATK_K.has(a.k) || !!a.kill);
// 겹친 대상까지 훑은 행동 후보 (사람 근처 '공격 우선' 바꾸기 없이 날것 그대로)
// 한 프레임 안에서 화면·버튼·라벨이 같은 계산을 되풀이하지 않게 (시각·위치가 같으면 그대로). 버튼을 누를 땐 새로 구한다
let RC = null;
const rcKey = () => { const P = S.player; return S.t + '|' + P.x + '|' + P.y + '|' + (P.fl || 0) + '|' + (P.z || 0) + '|' + !!P.interact + !!P.pick + !!P.trav + !!P.lunge + !!P.grabIn + '|' + (P.strikeT > 0) + '|' + !!P.hidden + '|' + !!S.skills?.ambush + '|' + !!S.practiceSkills?.ambush + '|' + !!S.skills?.electric + '|' + !!S.practiceSkills?.electric + '|' + !!P.captive + !!P.carrying + !!P.hide + !!P.ledge + !!P.wire; };
function rawChoices(n = 7) {
  const key = rcKey(); if (RC && RC.key === key) return RC.out.slice();
  const out = rawChoices0(n); RC = { key, out }; return out.slice();
}
function rawChoices0(n) {
  const out = []; ACT_SKIP.clear(); let firstPref;
  try { for (let i = 0; i < n; i++) { const a = combatLabel(electricalChoice(primaryActionRaw())); if (!i) firstPref=S.ikPref; if (!a || a.k === 'none') break; const o = actObj(a); if (out.some(x => x.k === a.k && actObj(x) === o)) break; out.push(a); if (!o) break; ACT_SKIP.add(o); } }
  finally { ACT_SKIP.clear(); if(firstPref!==undefined)S.ikPref=firstPref; }
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
  const P = S.player; if (actionBusy(P)) {const next=followupCandidate(P);if(next)return{k:'kill',list:[next],label:P.followupAttack?'다음 기절 대기':'다음 기절',hold:'처치',busy:true};return canQueueGrabAttack(P) ? {k:'cap',g:P.grabIn.g,label:'기절',hold:'처치',queued:!!P.attackQueue} : { k: 'none', busy: true, label: P.skillHold ? ASSASSIN_SKILLS[P.skillHold.key].name+' 준비' : P.lethalHold ? '길게 누르는 중' : '공격' };}
  const down=nearFinish();if(down)return combatLabel({k:'finish',c:down,g:down.g});
  if(!concealedMeleeAllowed(P)){const near=concealedAttackCandidate(P);return near?{k:'none',label:'은신 기습 필요',skillLocked:'ambush'}:{k:'none',label:P.cover?'엄폐 중':'공격'};}
  if (P.car) return { k: 'none', label: '경적', honk: true };
  if (P.captive) return combatLabel({ k: 'cap', g:P.captive, label: '기절', hold: '처치' });
  const a = rawChoices().find(isAtk); if (a) {
    const action=koLabel(Object.assign({},a)),choice=assassinPreview();
    if(choice&&choice.ids[0]===(action.g||action.list?.[0])?.id)action.hold=ASSASSIN_SKILLS[choice.key].name;
    return action;
  }
  const c = nearFinish(); if (c) return combatLabel({ k: 'finish', c, g: c.g });
  // 다가가는 중: 미리 눌러 두면 닿는 순간 공격. 지나가는 행인까지 표시하지 않게 가까울 때만 (주민 90 · 조직원 150)
  // 등 뒤에 있을 때만 다가가기 표시 (정면이면 공격을 권하지 않는다)
  const sg = stalkGuard(); if (sg && dist(P.x, P.y, sg.x, sg.y) < (sg.civ ? 90 : 150) && Math.abs(angDiff(sg.a, Math.atan2(P.y - sg.y, P.x - sg.x))) > 1.75) return { k: 'none', stalk: sg, label: '더 가까이' };
  return { k: 'none', label: '공격' };
}
// [행동] 후보: 환경 행동 + 운반·내려놓기·옷 갈아입기·줍기. 붙잡은 뒤엔 먼저 기절.
const ENV_Z = new Set(['carry', 'dress', 'pickup', 'use', 'dropItem', 'candy', 'steal', 'ledge', 'tunnel','uncover']);
function secondaryEnvChoices() {
  const out = []; ACT_SKIP.clear();
  try {
    for (let i = 0; i < 6; i++) {
      const a = secondaryAction(true); if (!a || !ENV_Z.has(a.k)) break;
      const o = actObj(a); if (out.some(b => b.k === a.k && actObj(b) === o)) break;
      out.push(Object.assign({}, a, { fromZ: true }));
      if (a.k === 'dress') out.push({ k: 'carry', c: a.c, label: '운반', fromZ: true });
      if(a.c&&['dress','carry'].includes(a.k)){const quick=quickStashChoice(a.c);if(quick){if(a.k==='dress')out.push(quick);else out.unshift(quick);}}
      if (!o) break; ACT_SKIP.add(o);
    }
  } finally { ACT_SKIP.clear(); }
  return out;
}
// Release only our completed action; an externally vanished selection stays blocked.
function finishEnvSelection(){S.envExplicit=null;S.envKey=S.envPick=S.envPickK=S.envPickP=null;S.envSel=0;closeEnvPicker();}
function envChoices() {
  if (actionBusy()) return [];
  const hanging = S.player;
  if (hanging.ledge) return hanging.trav || hanging.jump ? [] : [{ k: 'ledgeUp', label: '올라가기', at: { x: hanging.x, y: hanging.y - 20 } }];
  if (hanging.wire) { const exit = wireExitAction(); return exit ? [exit] : []; }
  const P = S.player, z = secondaryEnvChoices(), sa = z[0];
  if(P.captive)return[combatLabel({k:'execute',g:P.captive,label:'먼저 기절시키기',hold:'처치'})];
  const stored=!P.hide&&!P.carrying&&!P.captive&&nearHide();
  const recover=stored&&S.corpses.filter(c=>c.stashed&&c.container===stored).sort((a,b)=>(b.target&&b.ko?2:!b.stripped&&b.outfit?1:0)-(a.target&&a.ko?2:!a.stripped&&a.outfit?1:0))[0];
  const retrieval=recover?{k:'retrieve',h:stored,c:recover,at:stored,label:recover.target&&recover.ko?'기절한 표적 꺼내기':recover.ko?'기절자 꺼내기':'시체 꺼내기'}:null;
  const env = rawChoices().filter(a => !isAtk(a) && a.k !== 'execute' && !(a.k === 'stash' && z.some(b => b.k === 'carry' && b.h === a.h)));
  if(retrieval){
    const blocked=env.findIndex(a=>a.k==='keymsg'&&a.h===stored);if(blocked>=0)env.splice(blocked,1);
    if(recover.target&&recover.ko||!recover.stripped&&recover.outfit&&recover.outfit!==P.outfit)env.unshift(retrieval);else env.push(retrieval);
  }
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
  const list=(P.carrying || (sa && (sa.k === 'quickStash' || sa.k === 'carry' || sa.k === 'dress' || sa.k === 'tunnel' || sa.k === 'uncover'))) ? z.concat(env) : env.concat(z);
  if(!P.carrying&&!P.hide&&!P.under&&!P.vent){const distance=a=>{const o=objectActionPoint(a);return o?.x!=null?dist(P.x,P.y,o.x,o.y):Infinity;},work=list.filter(a=>a.k==='pickup'||a.k==='use').sort((a,b)=>distance(a)-distance(b))[0];if(work&&list[0]!==work&&distance(work)+12<distance(list[0])){list.splice(list.indexOf(work),1);list.unshift(work);}}
  // At mission furniture, carrying or an already exposed uniform must not hide
  // collection. A useful new outfit and every explicit selection keep priority.
  if(!P.carrying){const loot=list.find(a=>a.k==='loot'&&S.items.includes(a.it)&&!a.it.got),dress=list.find(a=>a.k==='dress'&&!(P.blown||{})[a.c.outfit||'crew']);if(loot&&!dress){loot.missionPriority=true;list.splice(list.indexOf(loot),1);list.unshift(loot);}}
  if(!P.carrying&&!list[0]?.missionPriority){
    const body=list.find(a=>['dress','carry','quickStash'].includes(a.k)&&a.c?.playerHandled&&S.t-a.c.t0<12);
    if(body){body.missionPriority=true;list.splice(list.indexOf(body),1);list.unshift(body);}
  }
  if(!P.carrying&&P.outfit!=='crew'&&(STAGE.id==='tB'&&S.tutI===4||STAGE.starterContract==='disguise'||STAGE.apprenticeContract&&STAGE.id!=='e1'||STAGE.lessonIdentity)){const dress=list.find(a=>a.k==='dress'&&a.c.outfit==='crew');if(dress){list.splice(list.indexOf(dress),1);list.unshift(dress);}}
  // A wall switch beside a coded door must not replace opening that door.
  if(list[0]?.k==='lamp'){const keypad=list.find(a=>a.k==='keypad'&&!a.skillLocked);if(keypad){list.splice(list.indexOf(keypad),1);list.unshift(keypad);}}
  // Locked skill previews stay discoverable without hiding a usable door or object.
  return list.filter(a=>!a.skillLocked).concat(list.filter(a=>a.skillLocked));
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
  if (key !== S.envKey) { S.envKey = key; const j = stay && (S.envExplicit||!L[0].missionPriority) ? L.findIndex(a => a.k === S.envPickK && oid(actObj(a)) === S.envPick) : -1; S.envSel = j >= 0 ? j : 0; } else if (!stay||!S.envExplicit&&L[0].missionPriority) S.envSel = 0;
  const i = (S.envSel || 0) % L.length, a = L[i], pk = oid(actObj(a));
  if (!stay || pk !== S.envPick || a.k !== S.envPickK) S.envPickP = { x: PP.x, y: PP.y, fl: flOf(PP), z: PP.z || 0 };
  S.envPick = pk; S.envPickK = a.k;
  a.choices = L.length; a.choiceI = i; return a;
}
function grabAction() {
  const P = S.player; if (actionBusy(P)) return { k: 'none', busy: true, label: '붙잡기' };
  if (P.ledge || P.wire) { const ok = !P.jump && !P.trav && (P.ledge ? landBelow(P.x, P.y, P.ledge, P.z) : wireFallOk()); return { k: ok ? (P.ledge ? 'ledgeDrop' : 'wireFall') : 'none', label: '떨어지기', blocked: !ok }; }
  if (P.car) return { k: 'none', label: '붙잡기' }; if (P.captive) return { k: 'none', label: canInterrogate() ? '심문 중' : '붙잡는 중' };
  if(!concealedMeleeAllowed(P))return concealedAttackCandidate(P)?{k:'none',label:'은신 기습 필요',reason:'기술 트리에서 배우기'}:{k:'none',label:'붙잡기'};
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
  if (actionBusy(P)) { if(!queueFollowupAttack())queueGrabAttack(); return; }
  if (P.car) { honk(); return; }
  if (P.captive) { actPrimary({ k: 'execute', viaZ: true, inputGroup: 'atk' }); return; }  // 기절 → 계속 누르면 처치 (updateKoHold)
  const a = attackAction();
  if (a.k === 'none') {
    if(a.skillLocked)toast(abilityLockText(a.skillLocked),2);
    else if(a.stalk){if(!queueApproachAttack(a.stalk))toast('아직 손이 닿지 않는다 · 등 뒤로 더 가까이',1.5);}
    else toast('공격할 사람의 등 뒤 가까이 접근하기',1.5);
    return;
  }
  // 끌어당기기·끌어들이기·위에서 덮치기도 조직원은 먼저 기절 (계속 누르고 있으면 updateKoHold 가 처치)
  // 제압 의도는 대상에 묶는다. 비동기 끌어당기기가 다른 사람을 처치로 바꾸지 않는다.
  const choice=assassinOpportunity();
  if(choice&&choice.ids[0]===(a.g||a.list?.[0])?.id&&combatSource('atk')){beginAssassinSkill('atk',a);return;}
  actPrimary(Object.assign({}, a, { viaZ: true, inputGroup: 'atk' }));
}
function actEnv() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (DLG.modal) { advanceDialog(); return; }
  if (input.aiming) { queueAim(); return; }
  if (actionBusy()) {queueRecoveryInput();return;}
  const a = envAction(); if (a.k === 'none') { toast(a.blocked?'선택한 대상에 손이 닿지 않는다':unavailableEnvReason(),1.4,'warn'); return; }
  if (a.fromZ) actCarry(a); else actPrimary(Object.assign({}, a, { viaZ: true, inputGroup: 'env' }));
  S.envExplicit=null; closeEnvPicker();
}
// Clothing has its own input and remains selected while nearby candidates change.
function clothingAction(){
  const P=S.player;
  if(actionBusy(P)){const a=recoveryInputAction('dress');return a?{...a,bufferable:true}:null;}
  if(!nearCorpse()&&!S.props.some(p=>p.outfit&&!p.taken&&flOf(p)===flOf(P)&&dist(P.x,P.y,p.x,p.y)<64))return null;
  return envChoices().find(a=>a.k==='dress'||a.k==='pickup'&&a.p?.outfit)||null;
}
function actDress(){
  if(!S||S.over||paused||!running||tactical||S.amb||DLG.modal||STAGE.tutorial&&!STAGE.storyEpisode)return;
  if(actionBusy()){queueRecoveryInput('dress');return;}
  RC=null;const a=clothingAction();
  if(a&&selectEnvTarget(envToken(a)))actEnv();
}
function actGrab() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (DLG.modal) { advanceDialog(); return; }
  if (actionBusy()) return;
  if (S.player.ledge || S.player.wire) { const a = grabAction(); if (a.k !== 'none') actPrimary(Object.assign({}, a, { viaZ: true })); return; }
  if (S.player.captive) { if (canInterrogate()) interrogate(); return; }  // 잡은 채 한 번 더 = 바로 심문 (가만히 있어도 저절로 한다)
  const a = grabAction();if(!concealedMeleeAllowed())toast(abilityLockText('ambush'),2); if (a.k === 'grab') grab(a.g);
}
function cycleEnv() { if (!S || actionBusy()) return; const a = envAction(), L=envChoices(); if (!L.length || (L.length===1&&!a.blocked)) return; const i=L.findIndex(v=>envToken(v)===envToken(a)); selectEnvTarget(envToken(L[(i+1)%L.length])); play('click', 0.2); }
