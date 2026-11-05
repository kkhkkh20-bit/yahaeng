const koFirst = g => !!g && !g.dog && !g.civ;
const koTap = g => koDefault(g) || koFirst(g);
const KO_HOLD = 1.0;  // 주민 기절 뒤 이만큼 더 누르고 있어야 숨을 끊는다 (휴대폰에서 실수로 감점되지 않게)
function koPerson(g, mode, where, intent, quiet) {
  const vipApproach=vipHitContext(g);
  if (g.child) return;  // 안전장치: 아이는 어떤 경로로도 다치지 않는다
  const assailantLook = intent?.assailantLook !== undefined ? intent.assailantLook : witnessedAssailant(g);
  g.unconscious = true; logEv('ko', g.x, g.y);
  g.state = 'DEAD'; g.icon = null; g.path = null; g.doomed = false; g.say = null; if(!g.pairDown)play('thud', 0.45); play('cloth', 0.4);
  facWitness(g); cityVictim(g);
  const c = { assailantLook, guardId:g.id, fl: flOf(g), z: g.z || 0, ch: charOf(g), ko: true, target: !!g.target, playerHandled:mode==='stash'||!!intent?.source, g, container: mode === 'stash' ? where : null, fac: g.fac, tag: g.tag, outfit: outfitOf(g), x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), t0: S.t };
  spawnEffect('dust',{x:g.x,y:g.y-12,fl:flOf(g),z:g.z||0},{scale:.55});
  c.vipApproach=vipApproach;S.corpses.push(c); S.stats.ko = (S.stats.ko || 0) + 1;
  if (mode === 'stash') { c.stashed = true;c.container=where;if(Number.isFinite(where.x)){c.x=where.x;c.y=where.y;}where.bodies++;where.found=false; S.stats.stashed++; }
  else if (mode === 'bush') { c.x = where.x + rnd(-6, 6); c.y = where.y + rnd(-6, 6); c.hidden = true; S.stats.stashed++; }
  noise(g.x, g.y, quiet?12:30, 'ko', flOf(g),g.z||0);
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; giveKey(k, '기절한 ' + (g.civ ? '사람' : '자경대원') + '에게서 ' + withJosa(keyName(k), '을/를') + (k === 'code' ? ' 알아냈다' : ' 챙겼다')); }
  armKoHold(c, g, intent);
  toast(g.civ ? '주민을 기절시켰다 · 다른 사람이 발견하면 신고할 수 있다' : '기절시켰다 · 동료가 발견하면 깨우고 수색한다', 2.4);
  hint('ko', g.civ ? '주민을 기절시키면 살상 감점은 없다. 길게 눌러 처치하면 수고비가 줄어든다' : '[공격]을 톡 누르면 기절, 계속 누르고 있으면 처치');
}
// 누른 채로 있으면 기절 → 처치로 바뀐다
function updateKoHold() {
  const h = S.koHold; if (!h) return;
  const P = S.player;
  if (!combatHeld(h.source) || flOf(P) !== h.fl || (P.z || 0) !== h.z || (dist(P.x, P.y, h.px, h.py) > 40 && !(h.container && ((P.hide && h.container.x === P.hide.x && h.container.y === P.hide.y)||P.trav?.hideFlow?.h===h.container)))) { S.koHold = null; return; }
  if (!h.bodies.some(({c}) => c.ko && S.corpses.includes(c))) { S.koHold = null; return; }
  if (S.t - h.t0 < KO_HOLD) return;
  S.koHold = null;
  for (const { c, g } of h.bodies) finishKo(c, g);
  S.shakeT = .12; toast('처치했다', 1.8); checkObjective();
}
// 기절한 사람이 발견되면 깨어나 함께 수색한다
function wakeKO(c, by) {
  const g = c.g, i = S.corpses.indexOf(c); if (!g || i < 0) return; S.corpses.splice(i, 1);
  g.unconscious = false; g.x = c.x; g.y = c.y; g.fl = c.fl; g.z = c.z || 0; g.a = c.a; g.meter = 0.6; g.path = null; g.icon = null; g.woke = true;
  if (c.assailantLook) { rememberSuspect(g,c.assailantLook); if (by) rememberSuspect(by,c.assailantLook); }
  if (g.civ) { g.state = 'PATROL'; gsay(g, c.assailantLook ? '나를 때린 사람을 봤어요!' : '뒤에서 맞았어요. 누군지는 못 봤어요.'); return; }
  g.state = 'SEARCH'; g.poi = { x: c.x + rnd(-40, 40), y: c.y + rnd(-40, 40) }; g.reached = false; g.waitBase = 4; setIcon(g, '?');
  gsay(g, c.assailantLook ? '때린 사람 봤어. 인상착의 보낼게.' : '뒤에서 당했어. 주변 확인해 줘.', 3);
}
// 연속 처치: 8초 안에 조직원을 또 처치하면 손맛 표시 (메탈기어·코만도스식 소탕의 리듬)
function killStreak() {
  const k = S.streak && S.t - S.streak.t < 8 ? S.streak.n + 1 : 1; S.streak = { n: k, t: S.t }; S.stats.maxStreak = Math.max(S.stats.maxStreak || 0, k);
  if (k >= 2) { toast(k + '연속 처치', 1.4, 'good'); play('click', 0.35, 0.8 + k * 0.1); } if (k === 3) bossRadio('streak');
}
const lastKO = () => { const c = S.corpses[S.corpses.length - 1]; return !!(c && c.ko); };
function strikeKill(list, two) {
  const P=S.player;if(!concealedMeleeAllowed()||!list.length||list.some(g=>dist(P.x,P.y,g.x,g.y)>(STAGE.artSlice?134:MELEE_CONTACT)||flOf(P)!==flOf(g)||(P.z||0)!==(g.z||0)||!los(P.x,P.y,g.x,g.y))){list.forEach(g=>{g.doomed=false;delete g.takedownIntent;});return;}
  P.strikeT = 0.32;
  // 혼자인 사람: 두 사람 동작으로 처치 — 칼(다가섬 → 입 막고 찌름 → 무릎 꺾임 → 내려놓음) / 목 조르기(번갈아, 주민은 늘 조르기로 기절)
  const g0 = list[0], pairK = !two && PAIR() && PR.anims.stab && !g0.dog && usePR(charOf(g0)) && usePR('ninja');
  const kind = pairK ? 'choke' : null;
  if (pairK) hint('killKind', '짧게 누르면 기절, 같은 버튼을 계속 누르면 처치. 붙잡기는 별도 버튼');
  if (pairK) P.a = g0.a;
  list.forEach(g => {
    g.doomed = false; if (koFirst(g)) S.koNext = true;  // 조직원은 먼저 기절 (계속 누르면 updateKoHold 가 숨을 끊는다)
    if (pairK) pairKill(g, koFirst(g) ? 'choke' : kind, 0); else killGuard(g);
  });
  if(!pairK)S.hitStop = 0.07;
  if (two) { S.stats.special++; toast(lastKO() ? '동시 기절' : '동시 암살', 1.8, 'good'); }
}
// 두 사람 동작으로 처치: 다가섬 → 입·목을 감음 → 버둥거리다 힘이 빠짐 → 무릎이 꺾임 → 내려놓음. 쓰러진 몸은 동작이 끝난 뒤에 보인다
// from = 1 이면 이미 목을 감고 있는 상태(붙잡은 사람)에서 이어서 시작한다
const KILL_DUR = { stab: 0.95, choke: 1.15 };
function pairKill(g, kind, from, quiet) {
  const P = S.player;if(!from&&!STAGE.artSlice&&dist(P.x,P.y,g.x,g.y)>MELEE_CONTACT)return;const dur = KILL_DUR[kind] * (from ? 0.8 : 1);
  const intent=g.takedownIntent||{source:combatSource('atk'),lethal:false};
  if(intent.assailantLook===undefined)intent.assailantLook=from?(g.capturedLook||null):witnessedAssailant(g);
  delete g.takedownIntent;
  const ko=S.koNext||!intent.lethal;S.koNext=S.lethalNext=false;
  P.strikeT=dur;P.vx=P.vy=0;P.moving=false;
  P.killAnim={ch:charOf(g),t0:S.t,kind,dur,from,g,intent:{...intent,pairStarted:S.t},ko,quiet,fl:flOf(P),z:P.z||0,x:P.x,y:P.y,
    victimOffset:from?null:{x:g.x-P.x-Math.cos(P.a)*24,y:g.y-P.y-Math.sin(P.a)*24}};
  P.riseT=S.t+dur+.22;g.doomed=true;g.moving=false;g.path=null;g.say=null;g.icon=null;
}
// Contact, incapacitation and lowering all advance on the same clock as the pose.
function updatePairCombat(P,dt) {
  const A=P.killAnim;if(!A?.g)return false;
  const g=A.g,t=S.t-A.t0;
  if(!A.committed&&(!concealedMeleeAllowed(P)||!A.from&&!STAGE.artSlice&&dist(P.x,P.y,g.x,g.y)>MELEE_CONTACT)||!S.guards.includes(g)||flOf(P)!==A.fl||(P.z||0)!==A.z||flOf(g)!==A.fl||(g.z||0)!==A.z||dist(P.x,P.y,A.x,A.y)>20||(!A.committed&&g.state==='DEAD')){
    g.doomed=false;if(g.state==='CAPTIVE')g.state='RETURN';P.killAnim=null;P.strikeT=0;return false;
  }
  P.vx=P.vy=0;P.moving=false;P.strikeT=Math.max(0,A.dur-t);
  P.hidden=!P.z&&tileAt(P.x,P.y)==='B'&&P.mode==='sneak';P.light=lightAt(P.x,P.y,!!P.z);
  if(t<A.dur&&P.hurtT>0)P.hurtT=Math.max(0,P.hurtT-dt);
  if(!A.committed)g.doomed=true;
  if(!A.contact&&t>=(A.from ? .04 : .14)){
    A.contact=true;play('cloth',.35);contactFeedback({x:P.x+Math.cos(P.a)*14,y:P.y+Math.sin(P.a)*14,fl:A.fl,z:A.z},'takedown');
    S.hitStop=Math.max(S.hitStop||0,.025);
  }
  const at=A.kind==='choke'?(A.from ? .38 : .54):.24;
  if(!A.committed&&t>=at){
    A.committed=true;g.takedownIntent=A.intent;g.pairDown=true;S.koNext=A.ko;
    const nd=S.decals.length,nf=S.fx.length,nc=S.corpses.length;
    try{killGuard(g,null,null,A.quiet||A.kind==='choke');}finally{delete g.pairDown;}
    S.fx.length=nf;if(A.kind==='choke')S.decals.length=nd;
    A.c=S.corpses.length>nc?S.corpses.at(-1):null;
    if(A.c){const x=P.x+Math.cos(P.a)*24,y=P.y+Math.sin(P.a)*24,ok=!solidAt(Math.floor(x/TILE),Math.floor(y/TILE));
      Object.assign(A.c,{x:ok?x:P.x,y:ok?y:P.y,a:P.a,hideT:A.t0+A.dur,t0:A.t0+A.dur,f0:4});A.c.light=lightAt(A.c.x,A.c.y);
      if(A.kind==='choke')A.c.bleed=0;
    }
    S.hitStop=Math.max(S.hitStop||0,.035);
  }
  if(!A.landed&&t>=A.dur*.82){A.landed=true;play('thud',.32);S.shakeT=Math.max(S.shakeT||0,.06);}
  const moving=input.joy?.mag>.15||['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].some(k=>S.keys[k]);
  const held=S.koHold,lethalPending=held?.bodies.some(b=>b.c===A.c&&b.c.ko)&&combatHeld(held.source);
  if(A.landed&&t>=A.dur*.88&&(moving||P.followupAttack)&&!P.recoveryQueue&&!lethalPending){
    if(A.c){A.c.hideT=S.t;A.c.t0=null;}
    P.killAnim=null;P.strikeT=0;P.riseT=S.t+.12;return false;
  }
  if(t>=A.dur){P.killAnim=null;P.strikeT=0;return false;}
  return true;
}
// 붙잡은 사람 처치: 목을 감은 자세에서 그대로 조여(또는 찔러) 내려놓는다
function execCaptive(ko) {
  const P = S.player, g = P.captive; if (!g) return; P.captive = null; S.stats.special++;
  if (solidAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) { g.x = P.x; g.y = P.y; }
  if (!g.takedownIntent) g.takedownIntent = { source: combatSource('atk') || combatSource('env'), lethal: false };
  if (!g.takedownIntent.lethal) S.koNext = true;  // 붙잡은 뒤 [보조]: 목을 졸라 기절
  if (PAIR() && PR.anims.choke && !g.dog && usePR(charOf(g)) && usePR('ninja')) { pairKill(g, g.civ || koDefault(g) || S.koNext ? 'choke' : 'stab', 1, true); return; }
  P.strikeT = 0.3; killGuard(g, null, null, true);
}
const logEv = (k, x, y) => { (S.events = S.events || []).push({ k, x, y, t: S.t }); };
function killGuard(g, mode, where, quiet) {
  const vipApproach=vipHitContext(g);
  if (g.child) return;
  const intent = g.takedownIntent; delete g.takedownIntent;
  if (S.koNext || (intent && !intent.lethal) || (!S.lethalNext && (g.civ || koDefault(g)))) { S.lethalNext = false; S.koNext = false; sfx('stingerKO'); return koPerson(g, mode, where, intent, quiet); }
  g.unconscious = false;
  sfx('stinger');  // 조용한 처치의 손맛 (플레이어만 듣는다)
  S.lethalNext = false;
  logEv(g.target ? 'target' : 'kill', g.x, g.y);
  g.state = 'DEAD'; g.icon = null;
  play(Math.random() < 0.5 ? 'kill' : 'kill2', quiet ? 0.45 : 0.7); if(!g.pairDown)after(.18,()=>{if(!S.over)play('thud',.45);}); S.shakeT = quiet ? 0.12 : 0.18;
  S.stats.kills++; if (!g.target && g.civ) S.stats.extraKills++; if (!g.target && !g.civ && !g.dog) { S.stats.crewKills = (S.stats.crewKills || 0) + 1; killStreak(); if (S.stats.crewKills === 1) bossRadio('first'); }
  if (g.target) bossRadio('target', true); else if (g.civ) bossRadio('civ', true);
  if(intent?.visual!=='assassin'){
    if(pixelFxEnabled())spawnEffect(quiet?'dust':'strike',{x:g.x,y:g.y-18,fl:flOf(g),z:g.z||0},{angle:quiet?0:S.player.a,scale:quiet?.5:.8});
    else S.fx.push({ k: 'slash', x: g.x, y: g.y, t: 0 });
  }
  facWitness(g); cityVictim(g);
  const c = { guardId:g.id, ko:false, fl: flOf(g), z: g.z || 0, ch: charOf(g), fac: g.fac, tag: g.tag, outfit: outfitOf(g), dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, t0: S.t };
  c.vipApproach=vipApproach;S.corpses.push(c);
  const intoWell = mode === 'stash';
  if (mode === 'stash') { c.stashed = true;c.container=where;if(Number.isFinite(where.x)){c.x=where.x;c.y=where.y;}where.bodies++;where.found=false; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else if (mode === 'bush') { c.x = where.x + rnd(-6, 6); c.y = where.y + rnd(-6, 6); c.hidden = true; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else if (g.z) noise(g.x, g.y, 60, 'kill', flOf(g));  // 옥상: 핏자국을 남기지 않는다 (아래층에서 보이거나 닦을 수 없는 피가 생기지 않게)
  else { c.bleed = ++S.trailN || (S.trailN = 1); S.decals.push({ x: g.x + rnd(-6, 6), y: g.y + rnd(-6, 6), r: rnd(14, 19), rot: rnd(0, TAU), fl: flOf(g), trail: c.bleed, k: 0 }); noise(g.x, g.y, 60, 'kill', flOf(g)); }  // 처치한 자리에 핏자국. 이 시체를 옮기면 같은 번호로 핏방울이 이어진다
  S.flash = 0.25;
  if (g.target) {
    if (S.player.disguise && !S.player.disguiseBlown) S.stats.disguiseKill = true;
    const left = S.guards.filter(o => o.target && !targetEliminated(o)).length;
    toast(left ? `표적 제거 — 남은 표적 ${left}` : '표적 제거', 3, 'good'); if (left) bark('hero', 'kill');
  } else if (!mode) hint('body', '시체가 발견되면 수색이 시작된다. [행동]으로 운반해 화단·수거함·맨홀에 숨길 수 있다');
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; if (mode) giveKey(k, '끌어들인 자경대원에게서 ' + withJosa(keyName(k), '을/를') + (k === 'code' ? ' 알아냈다' : ' 챙겼다')); else S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  if (g.dog) c.dog = true;
  checkObjective();
}
// 사고사: 칼자국 없이 죽는다. 시체를 봐도 '사고'로 여겨 수색·비명이 없다 (옮기면 사고로 보이지 않는다)
