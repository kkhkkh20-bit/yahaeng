const NOTICE_AT = 0.35;  // 이 아래(흰색)는 '눈치' 단계, 넘으면 노랑(의심 — 멈춰 보고 확인하러 온다), 1이면 빨강(발각)
const awareCol = g => guardAwareness(g).color;
function updateGuard(g, dt) {
  g.moving = false; g.seen = false;
  if (g.searchJob && g.state !== 'SEARCH') releaseSearchJob(g);
  g.swingT = Math.max(0, (g.swingT || 0) - dt);  // 싸움 종료·상태 변경 뒤에도 공격 동작은 끝난다
  if (g.yank) return;  // 숨은 곳으로 끌려가는 중 (updateAmbush가 움직인다)
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed) { if (g.doomed) g.moving = false; return; }
  // 세력: 조직끼리 싸움·목격자 입막음·구역 단속이 평소 행동보다 먼저
  if (S.facOn && updateFaction(g, dt)) return;
  if (g.civ) { updateCiv(g, dt); return; }
  if (g.climb) { g.seen = false; if (g.iconT > 0) g.iconT -= dt; updateClimbG(g, dt); if (g.state === 'ALERT' && S.player) g.lostT = 0; return; }
  const P = S.player;
  g.moving = false;
  if (g.iconT > 0) { g.iconT -= dt; if (g.iconT <= 0 && g.state !== 'ALERT') g.icon = null; }
  const spd = (g.target ? SPD.target*(rendezvousHurry(g)?1.75:vipDrinkHurry(g)?1.5:1) : SPD.gPatrol * (S.alevel ? 1 : 0.85) * (g.dog ? 1.25 : 1) * (diningHurry(g) ? 1.5 : 1)) * spdMul();
  if (S.alevel && (g.chat || g.act)) { endChat(g); g.act = null; }
  // 공포: 겁에 질려 달아난다. 주변을 못 보고, 가까운 동료를 잘못 벨 수 있다
  if (g.state === 'TERROR') {
    g.seen = false; g.terrorT -= dt;
    if (!g.path || !g.path.length) { const a = Math.atan2(g.y - g.fearFrom.y, g.x - g.fearFrom.x) + rnd(-0.6, 0.6); pathTo(g, g.x + Math.cos(a) * 220, g.y + Math.sin(a) * 220); }
    moveAlong(g, SPD.flee * spdMul(), dt);
    if (!g.slashed && !g.dog) for (const o of S.guards) {
      if (o === g || o.child || o.state === 'DEAD' || o.state === 'CAPTIVE' || dist(o.x, o.y, g.x, g.y) > 40) continue;
      g.slashed = true;
      if (Math.random() < 0.35) { S.lethalNext = true; killGuard(o, null, null, false); S.stats.kills--; if (!o.target && o.civ) S.stats.extraKills--; else if (!o.target) S.stats.crewKills = Math.max(0, (S.stats.crewKills || 0) - 1); S.stats.friendly = (S.stats.friendly || 0) + 1; if (dist(g.x, g.y, P.x, P.y) < 800) toast('겁에 질린 자경대원이 동료를 베었다!', 2.4, 'good'); }
      break;
    }
    if (g.terrorT <= 0) { g.state = 'SEARCH'; g.poi = { x: g.fearFrom.x, y: g.fearFrom.y }; g.reached = false; g.path = null; g.waitBase = 3; setIcon(g, '?'); }
    return;
  }

  if (g.startle) { const da = angDiff(g.a, g.startle.a), st = 16 * dt; if (Math.abs(da) <= st) { g.a = g.startle.a; g.want = g.a; g.startle = null; } else g.a += Math.sign(da) * st; }  // 화들짝 돌아보기 (약 0.2초)
  const sameF = flOf(g) === flOf(P) && !(flOf(P) && P.wire);
  const pv = (P.trav && P.trav.base) || P, onLedge = P.ledge && (g.z || 0) === (P.z || 0),stairHidden=P.trav?.stairs&&travPose(P.trav).pose==='stairHidden';
  let vis = (P.hide || P.under || P.vent || !sameF || onLedge || stairHidden) ? 0 : canSee(g, pv.x, pv.y, P.light, P.hidden, P.cover ? 2 : P.mode === 'sneak' && !P.trav, P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z);
  if (!vis && !sameF && flOf(g) >= 1 && !flOf(P) && !P.z && !P.hide && !P.under && !P.vent && !P.wire&&!stairHidden) vis = winSee(g, pv);  // 위층 창가의 사람은 창밖 거리를 내려다본다
  if (g.dog && sameF && !vis && !P.hide && !P.under && !P.vent && !P.z && !P.jump&&!stairHidden && dist(g.x, g.y, P.x, P.y) < 100 && los(g.x, g.y, P.x, P.y)) vis = 0.5;  // 냄새
  let zk = 1; const pz = STAGE.zones ? (g.police && g.beat ? Z_PUB : pZoneEff(g)) : Z_HOS;  // 순찰 경찰은 구역 출입을 따지지 않는다 (범행만 본다). 지구대를 지키는 경찰은 따진다
  g.rawSeen=vis>0;g.rawSightAt=S.t; // Physical sight before an authorized passerby is ignored.
  if (STAGE.zones) updateSharpEye(g, dt, vis);  // 눈썰미: 변장을 가까이서 오래 보면 알아챈다
  if (vis > 0 && pz === Z_PUB && !g.dog && !knownFace(g)) { zk = publicSuspicion(g); if (!zk) { if (!g.civ) permitNod(g); vis = 0; } }  // 허가 신분으로 금지 구역을 지나가면 한마디 하고 들여보내 준다 · 공개 구역(또는 허가 옷을 입은 금지 구역): 행인으로 보인다
  g.seen = vis > 0; g.sense = null;
  if(g.rawSeen)resolveVisibleFootstep(g,g.seen);
  if(g.seen){g.sightAt=S.t;g.sightFl=flOf(P);g.sightZ=P.z||0;}
  if (radioBusy(g)) {
    if (g.seen) { g.lastSeen = observedPlayerSpot(g); g.lostT = 0; } else g.lostT += dt;
    g.path = null; return;  // 보고 중에도 실제 시야만 사용한다
  }
  if (g.state === 'NOTICE' && g.why === 'saw' && pz === Z_PUB && !knownFace(g) && !publicSuspicion(g)) {
    g.state = 'RETURN'; g.path = null; g.poi = null; g.icon = null; g.meter = 0; g.holdT = 0; g.noticeT = 0; g.why = null;
  }
  if (STAGE.zones && g.seen && !g.dog && g.state !== 'ALERT' && (P.strikeT > 0 || P.captive)) { g.meter = 1; goAlert(g); }  // 지금 해치는 동작을 실제로 보는 경우만. 지난 범행 시각으로 새 목격자를 만들지 않는다
  if (g.state === 'WARN') { updateTrespass(g, dt, pz); if (g.state === 'WARN') return; }
  if (g.seen && g.state !== 'FLEE') {
    // 어쌔신 크리드식 발견: 한 번에 들키지 않고 게이지가 찬다. 보통 거리 2~3초, 코앞·밝은 곳은 1초 남짓
    const wary = ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state);
    const dP = dist(g.x, g.y, P.x, P.y), runK = P.mode === 'run' && P.moving ? 2 : 1, nearK = dP < 120 ? 1.5 * (1 - dP / 120) : 0;  // 뛰는 사람·코앞의 사람은 금방 알아본다
    const rate = disguiseMul(g) * D().rate * (0.08 + vis * 0.6 + nearK) * runK * (P.carrying || P.captive ? 1.8 : 1) * (g.state === 'SUSPICIOUS' || g.state === 'SEARCH' ? 1.3 : 1) * skillDetection(g,P.light,P.mode==='sneak',dP) * (P.mode !== 'run' && !P.carrying && inCrowd(P.x, P.y, flOf(P)) ? 0.35 : 1);
    g.meter = Math.min(pz === Z_PUB && zk < 1 ? 0.9 : 1, g.meter + rate * zk * dt); g.holdT = 0.8;  // 거리에서 웅크린 정도로는 쳐다보기만 한다
    if (g.state !== 'ALERT') {
      if (g.meter >= 1 && pz === Z_RES && !g.warned && !suspAct(g) && !knownFace(g) && !g.civ && !g.target) startWarn(g);  // 출입 금지: 처음엔 나가라고 경고한다
      else if (g.meter >= 1) goAlert(g);
      else if (g.meter < NOTICE_AT && !wary) g.sense = Math.atan2(P.y - g.y, P.x - g.x);  // 흰색: 아직 확신이 없다 — 하던 걸 하며 고개만 돌린다
      else if (g.state !== 'NOTICE') {
        if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35); }
        endChat(g); g.act = null; g.bubble = null;
        g.state = 'NOTICE'; g.poi = pSpot(); g.noticeT = 0; g.why = 'saw';
      } else g.poi = pSpot();
    }
  } else if (g.state !== 'ALERT') { if (g.holdT > 0) g.holdT -= dt; else g.meter = Math.max(0, g.meter - dt * 0.3); }  // 시야에서 벗어나도 잠깐은 게이지가 남는다
  const sx0 = g.x, sy0 = g.y;
  if (g.hearT > 0) {
    if (!['run','surface','drag'].includes(g.hearKind) || !g.hearP || g.state !== 'PATROL' && g.state !== 'RETURN') { clearFootstepReaction(g); }
    else { g.hearT -= dt; if (g.hearT > 0) return; const at={...g.hearP};clearFootstepReaction(g);goSuspicious(g,at.x+rnd(-20,20),at.y+rnd(-20,20),3.5,'heard');g.poi.clue='step'; }
  }

  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && S.decals.length && (g.bloodT = (g.bloodT || 0) - dt) <= 0) {  // 핏자국을 보면 다가가 살핀다
    g.bloodT = 0.35;
    for (const d of S.decals) { if (d.seen || flOf(d) !== flOf(g) || (g.z || 0) || dist(g.x, g.y, d.x, d.y) > 170) continue;
      if (canSee(g, d.x, d.y, Math.max(0.45, lightAt(d.x, d.y)), false, false, 0) > 0) {
        // 핏자국을 보면 의심이 아니라 바로 수색: 핏방울이 이어져 있으면 그 끝(시체를 옮겨 간 곳)까지 따라간다
        let end = d; if (d.trail) for (const o of S.decals) if (o.trail === d.trail) { o.seen = true; if (flOf(o) === flOf(g) && (o.k || 0) > (end.k || 0)) end = o; }
        d.seen = true; endChat(g); g.state = 'SEARCH'; g.poi = { x: end.x, y: end.y, fl: flOf(end), z: 0 }; g.reached = false; g.path = null; g.waitBase = 5; g.meter = Math.max(g.meter, 0.6); g.why = 'blood'; setIcon(g, '!');
        gsay(g, end !== d ? ['핏자국이 저쪽으로 이어져.', '끌린 흔적이 있어. 따라가 볼게.', '핏자국 끝까지 확인할게.'][g.id % 3] : ['바닥에 피가 있어. 주변 확인해.', '여기 핏자국 있다.', '여기 무슨 일이 있었나 봐.'][g.id % 3]);
        setAlert(2, 30); bossRadio('blood'); break; } }
  }
  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && !g.target && S.vents.length) {
    for (const v of S.vents) if (v.open && !v.roof && dist(g.x, g.y, v.x, v.y) < 150 && Math.abs(angDiff(g.a, Math.atan2(v.y - g.y, v.x - g.x))) < guardFov(g) && los(g.x, g.y, v.x, v.y)) {
      v.open = false; goSuspicious(g, v.x, v.y, 3); if (dist(g.x, g.y, P.x, P.y) < 600) toast('자경대원이 열린 환풍구 창살을 보고 다가간다', 2.2, 'warn'); break;
    }
  }
  if (g.state !== 'ALERT' && g.state !== 'BODY' && g.state !== 'FLEE' && !g.target && !STAGE.tutorial) {  // 연습에서는 시체를 찾지 않는다 (시키는 대로 했는데 수색이 시작되지 않게)
    for (const c of S.corpses) {
      if (c.hideT>S.t || (c.hidden && !g.dog) || c.discovered || c.carried || c.stashed || flOf(c) !== flOf(g) || (c.z || 0) !== (g.z || 0)) continue;
      if (canSee(g, c.x, c.y, c.light, false, false, c.z || 0, flOf(c)) > 0 || (g.dog && dist(g.x, g.y, c.x, c.y) < 90)) { if (facBody(g, c) || !claimBodyExam(g, c)) continue; if (g.dog) { play('bark', 0.5 * proxVol(g)); noise(g.x, g.y, 260, 'bark', flOf(g)); } releaseSearchJob(g); g.state = 'BODY'; g.body = c; g.path = null; setIcon(g, '!?'); play('question', 0.5); break; }
    }
  }

  if(!updateStairYield(g,dt))switch (g.state) {
    case 'PATROL': {
      if (updateBodyCover(g)) break;
      if (updateRoomRelight(g,dt,spd)) break;
      g.lampScan = (g.lampScan || 0) - dt;
      if (g.lampScan <= 0 && !g.target && !(g.relightRetryAt>S.t)) {
        g.lampScan = 0.6;
        const l = g.dog ? null : S.lamps.find(l => l.off && !l.broken && !l.cold && l.cut == null && (l.outdoor||l.hearth||l.control) && flOf(l) === flOf(g) && dist(l.x, l.y, g.x, g.y) < 95 && los(g.x, g.y, l.x, l.y) && !S.guards.some(o=>o!==g&&o.state==='PATROL'&&!o.doomed&&sameLampCircuit(o.relight?.l,l)));
        if (l) { g.relight = { l, t: 1.8 }; g.path = null; setIcon(g, '?'); break; }
        const bc = g.dog ? null : (S.cams || []).find(c => (c.broken||c.unplugged) && !c.noticed && c.fl === flOf(g) && dist(c.x, c.y, g.x, g.y) < 170 && los(g.x, g.y, c.x, c.y));
        if (bc) { bc.noticed = true; goSuspicious(g, bc.x, bc.y + 30, 4); bark(g, 'calm'); if (dist(g.x, g.y, S.player.x, S.player.y) < 700) toast('자경대원이 '+(bc.unplugged?'전선이 빠진':'부서진')+' CCTV를 발견했다', 2.2, 'warn'); break; }
      }
      if(g.soundWatchUntil>S.t){g.want=g.glanceA;g.path=null;break;}
      if (g.follow != null) { followLeader(g, dt, spd); break; }
      if (!g.elite && !g.target && !g.dog && S.lures.length) {
        g.lureScan = (g.lureScan || 0) - dt;
        if (g.lureScan <= 0 && g.smoker && !S.alevel && !g.lureTaken && g.post == null) {
          g.lureScan = 0.4;
          const l = S.lures.find(l => !l.claim && l.landed && flOf(l) === flOf(g) && canSee(g, l.x, l.y, Math.max(0.5, lightAt(l.x, l.y)), false, false, 0) > 0);
          if (l) { endChat(g); g.act = null; l.claim = g; g.lureTaken = true; g.lure = l; g.state = 'LURE'; g.path = null; g.lureT = null; setIcon(g, '?'); break; }
        }
      }
      if (updateSecurityBuddy(g,dt,spd)) break;
      if (g.chat) {
        const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.bubble = null;
        if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 200) endChat(g);
        break;
      }
      if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = g.elite ? rnd(5, 9) : S.alevel ? rnd(3.5, 7) : rnd(14, 26); break; }
      if (S.alevel >= 1 && !g.target && g.post == null) {
        g.peekT = (g.peekT == null ? rnd(6, 14) : g.peekT) - dt;
        if (g.peekT <= 0) { g.peekT = S.alevel >= 2 ? rnd(8, 14) : rnd(16, 26); if (startCheck(g, { x: g.x, y: g.y }, 1, 230)) break; }
      }
      if (g.wait > 0) {
        g.wait -= dt;
        // 딴짓: 담배 · 하품 (평상시에만)
        if (g.act) {
          g.actT -= dt; g.bubble = g.act === 'smoke' ? '후—' : '하암';
          if (g.actT <= 0) { g.act = null; g.bubble = null; g.idleT = rnd(10, 22); }
        } else if (!S.alevel && !g.target && !g.elite && !g.dog && !g.still) {
          g.idleT = (g.idleT == null ? rnd(4, 14) : g.idleT) - dt;
          if (g.idleT <= 0) { g.act = g.smoker&&Math.random() < 0.6 ? 'smoke' : 'yawn'; g.actT = g.act === 'smoke' ? rnd(5, 8) : rnd(1.6, 2.4); }
        }
        if (g.post != null) {
          g.want = g.act === 'smoke' ? g.post + 0.5 : g.post;
          g.glanceT -= dt; if (g.glanceT <= 0 && !g.act && !g.still) { g.glance = rnd(1.4, 2.2); g.glanceA = g.post + (Math.random() < 0.3 ? Math.PI : (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2); }
        } else if (!g.act && !g.still) lookAround(g, dt, g.waitBase, 1.1, [1.8, 3.2]);
        break;
      }
      if (g.route.some(r => r.spent)) purgeDetour(g);
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) pathTo(g, wp.x, wp.y);
      g.glanceT -= dt;
      if (g.glanceT <= 0 && g.route.length > 1 && !g.still && !rendezvousHurry(g)) { g.glance = rnd(2.2, 3.2); g.glanceA = g.a + Math.PI; break; }  // 걷다가 멈춰 뒤돌아보기
      if (moveAlong(g, spd, dt) || (g.target && dist(g.x,g.y,wp.x,wp.y)<12)) {
        g.wait = securityPatrolPause(g,wp); g.waitBase = g.a; g.waitT = 0; g.path = null; g.lookT = null;
        if (wp.once) wp.spent = true;
        if (g.route.length > 1) g.ri = (g.ri + 1) % g.route.length; else g.wait = 999;
      }
      break;
    }
    case 'LURE': {
      const l = g.lure;
      if (!l) { g.state = 'RETURN'; break; }
      if (g.lureT == null) {
        if (!g.path) pathTo(g, l.x, l.y);
        if (moveAlong(g, SPD.gSusp, dt) || dist(g.x, g.y, l.x, l.y) < 30) { g.lureT = 4.2; g.act = 'pickup'; g.path = null;g.moving=false; }
      } else {
        g.want = Math.atan2(l.y - g.y, l.x - g.x); g.bubble = null; g.lureT -= dt;
        if(g.lureT<3.5)g.act='smoke';
        if (g.lureT <= 0) { S.lures = S.lures.filter(o => o !== l); g.lure = null; g.act = null; g.bubble = null; g.state = 'RETURN'; g.path = null; }
      }
      break;
    }
    case 'NOTICE': {
      g.want = Math.atan2(g.poi.y - g.y, g.poi.x - g.x);
      if (!g.seen) { g.noticeT += dt; if (g.noticeT > 0.9 || g.meter <= 0) goSuspicious(g, g.poi.x, g.poi.y, 4,'saw'); }
      break;
    }
    case 'SUSPICIOUS': case 'SEARCH': {
      if (g.state === 'SEARCH' && g.searchJob) { updateBuildingSearch(g, dt); break; }
      if (!g.reached) {
        if (!g.path) routeTo(g,g.why==='heard'&&g.soundApproach||g.poi);
        const arr = moveAlong(g, SPD.gSusp * spdMul(), dt);
        if (hopClimb(g, arr)) break;
        if (arr) { g.reached = true; g.wait = g.waitBase; g.waitBase2 = g.a; g.waitT = 0; g.path = null; g.lookT = null; }
      } else {
        g.waitT += dt; lookAround(g, dt, g.waitBase2, 1.4, [0.9, 1.5]);
        g.wait -= dt;
        if (g.wait <= 0) {
          if(g.why==='heard'&&g.soundApproach&&startCheck(g,g.poi,1,96)){gsay(g,'안쪽도 봐야겠어.');break;}
          if (S.alevel >= 2 && !g.target) startCheck(g, g.poi, 4); else { g.state = 'RETURN'; g.path = null; g.icon = null; if (g.chased && !g.civ && !g.dog) { g.chased = false; gsay(g, BARKS.giveup ? BARKS.giveup[g.id % BARKS.giveup.length] : '놓쳤다…'); } }
        }
      }
      break;
    }
    case 'CHECK': {
      const spot = g.checks[0];
      if (!spot || (spot.fl || 0) !== flOf(g) || (spot.z || 0) !== (g.z || 0)) { g.state = 'RETURN'; g.path = null; g.icon = null; break; }
      if (g.inspect == null) {
        const at=searchStandNear(spot);if(!at){g.checks.shift();g.path=null;break;}
        if (!g.path) pathTo(g, at.x, at.y);
        moveAlong(g, SPD.gSusp * spdMul(), dt);
        if(dist(g.x,g.y,at.x,at.y)<24){g.path = null; g.inspect = 1.6;setIcon(g,'?');beginHideInspection(g,spot,g.inspect);}
      } else {
        g.want = Math.atan2(spot.y - g.y, spot.x - g.x);
        g.inspect -= dt;
        if (g.inspect <= 0) {
          g.inspect = null; g.checks.shift();
          const inThis = (P.hide && P.hide === spot) || (spot.type === 'bush' && P.hidden && flOf(P) === flOf(g) && (P.z || 0) === (g.z || 0) && dist(P.x, P.y, spot.x, spot.y) < 44);
          if (inThis) { dragOut(g, spot.type === 'bush' ? '화단을 헤치던 자경대원에게 들켰다.' : spot.type === 'well' ? '맨홀 안을 비추던 자경대원에게 들켰다.' : `${hideIn(spot)}을 뒤지던 자경대원에게 들켰다.`); if (S.over) return; break; }
          if (spot.bodies > 0 && !spot.found) { spot.found = true;for(const c of S.corpses)if(c.container===spot)securityBodyFound(c,g); S.stats.bodies++; bossRadio('body'); setIcon(g, '!?'); setAlert(2, 35, '숨겨둔 시체가 발견됐다'); }
          if (spot.type === 'bush') for (const c of S.corpses) if (c.hidden && !c.discovered && !c.stashed && flOf(c)===flOf(g)&&(c.z||0)===(g.z||0)&&dist(c.x, c.y, spot.x, spot.y) < 50) { securityBodyFound(c,g);c.discovered = true; c.hidden = false; S.stats.bodies++; bossRadio('body'); setAlert(2, 35, '화단 속 사람이 발견됐다'); }
        }
      }
      break;
    }
    case 'RETURN': {
      if (g.follow != null) { g.state = 'PATROL'; break; }
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) routeTo(g, { x: wp.x, y: wp.y, fl: g.homeFl, z: 0 });
      const arr = moveAlong(g, spd, dt);
      if (hopClimb(g, arr)) break;
      if (arr) { g.state = 'PATROL'; g.path = null; g.wait = g.post != null ? 999 : 0.5; g.waitBase = g.a; }
      break;
    }
    case 'ALERT': {
      if (g.seen) { g.lastSeen = observedPlayerSpot(g); g.lostT = 0; } else g.lostT += dt;
      g.chased = true;
      if (g.target) { if (STAGE.flee) { goFlee(g); break; } if (g.seen) g.want = Math.atan2(P.y - g.y, P.x - g.x); if (g.lostT > 5) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0.4; } break; }
      if (!g.seen && g.lostT > 1.2 && (dist(g.x,g.y,g.lastSeen.x,g.lastSeen.y)<72||g.lostT>4.5) && !g.dog && startBuildingSearch(g.lastSeen, g.fac || 'A', 'sighting', g)) break;
      g.repath -= dt;
      if (updateGun(g, dt, sameF)) break;  // 권총을 겨누는 동안은 멈춰 선다
      if (g.repath <= 0 || !g.path) { routeTo(g, g.lastSeen); g.repath = 0.4; }
      if (hopClimb(g, moveAlong(g, SPD.gAlert * spdMul() * (g.dog ? 1.2 : 1), dt))) break;
      if (g.seen) g.want = Math.atan2(P.y - g.y, P.x - g.x);
      // 가까이 오면 칼을 들었다가(예비 동작) 내려친다 — 그 사이 피하면 산다
      g.atkCd = Math.max(0, (g.atkCd || 0) - dt);
      if (g.atkT > 0) {
        g.atkT -= dt; if (g.seen) g.want = Math.atan2(P.y - g.y, P.x - g.x);
        if (g.atkT <= 0) { g.swingT = 0.2; g.atkCd = 1.1; if (sameF && !P.hide && !P.under && !P.vent && (P.z || 0) === (g.z || 0) && !P.jump && !P.wire && !P.trav && dist(g.x, g.y, P.x, P.y) < 54 && sightLine(g, P.x, P.y, P.z, P.mode === 'sneak', flOf(P))) hurtPlayer(g, g.dog ? '들개에게 물렸다.' : g.police ? '경찰 곤봉에 맞았다.' : '자경대원의 칼에 베였다.'); else play('throw', 0.4 * proxVol(g)); }
      } else if (g.seen && sameF && (P.z || 0) === (g.z || 0) && !P.trav && !g.atkCd && dist(g.x, g.y, P.x, P.y) < 46 && sightLine(g, P.x, P.y, P.z, P.mode === 'sneak', flOf(P))) { g.atkT = g.dog ? 0.35 : 0.55; play('knife', 0.4); }
      if (g.lookout && g.seen && P.z > (g.z || 0) && !roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) && dist(g.x, g.y, P.x, P.y) < (g.lookout ? 260 : 130) && (g.shootT = (g.shootT || 0) + dt) > 2.2) { g.shootT = 0; play('kunai', 0.5); hurtPlayer(null, g.lookout ? '옥상 위에서 석궁 화살에 맞았다.' : ('옥상 위로 던진 병에 맞았다.')); if (S.over) return; }
      if (P.hide && P.hide.spotted && dist(g.x, g.y, P.hide.x, P.hide.y) < 60) { P.hide.spotted = false; dragOut(g, P.hide.type === 'well' ? '숨는 모습을 들켜 맨홀에서 끌려 나왔다.' : '숨는 모습을 들켜 수거함에서 끌려 나왔다.'); if (S.over) return; }
      if (g.lostT > 4.5) { g.state = 'SEARCH'; g.poi = {...g.lastSeen,clue:'player'}; g.reached = false; g.path = null; g.waitBase = 3; g.meter = 0.5; g.shootT = 0; setIcon(g, '?'); }
      break;
    }
    case 'BODY': {
      const c = g.body;
      if (!bodyExamValid(g, c) || !claimBodyExam(g, c)) { g.bodyWork = null; g.body = null; g.state = 'RETURN'; g.path = null; break; }
      const close = dist(g.x, g.y, c.x, c.y) < 40 && los(g.x, g.y, c.x, c.y, g.z || 0);
      if (!close) { g.bodyWork = null; if (!g.path?.length) pathTo(g, c.x, c.y); moveAlong(g, SPD.gBody * spdMul(), dt); break; }
      g.path = null; g.moving = false; g.want = Math.atan2(c.y-g.y,c.x-g.x);
      if (!g.bodyWork) { g.bodyWork = { id:c.sceneId, t:c.ko ? 1.2 : .9 }; g.actionSpeechUntil=S.t+2; gsay(g,c.ko?'이봐, 들려? 정신 좀 차려 봐.':'움직이지 않아. 상태 확인할게.',2); }
      if ((g.bodyWork.t -= dt) <= 0) {
        g.bodyWork = null;
        securityBodyFound(c,g);
        if (c.accident) { c.discovered = true; g.state = 'RETURN'; g.path = null; g.icon = null; gsay(g, ['사고 났어. 사람들 접근 막아.', '감전됐나 봐. 손대지 마.', '사람 쓰러졌다. 지원 요청해.'][(g.id + S.corpses.indexOf(c)) % 3]); break; }
        c.discovered = true; S.stats.bodies++; bossRadio('body'); logEv('found', c.x, c.y); setAlert(2, 35, c.ko ? '자경대원이 쓰러진 사람을 깨웠다 — 수색 시작' : '자경대원이 시체를 발견했다 — 수색 시작'); // Exits receive this incident only after a completed radio report.
        if (c.ko && c.g) wakeKO(c, g);  // 기절한 사람은 깨워 일으킨다 — 깬 사람도 함께 수색한다
        g.state = 'SEARCH';g.why='body';g.poi = { x: c.x, y: c.y, fl: flOf(c), z: c.z || 0,clue:'body' }; g.reached = true; g.wait = 5; g.waitBase2 = g.a; g.waitT = 0; g.path = null;
        const reportAt = {...g.poi}, reportedLook = c.ko ? c.assailantLook || null : null;
        const lookouts = S.guards.filter(o => o.bodyCoverId === c.sceneId && guardHearsReport(g,o));
        for (const o of lookouts) { o.bodyCoverId = null; if (reportedLook) rememberSuspect(o,reportedLook); }
        const listeners = shareGuardReport(g, reportAt, reportedLook,'body');
        startBuildingSearch(reportAt, g.fac || 'A', 'body', g);
        queueGuardRadio([g, ...lookouts, ...listeners], reportAt, reportedLook, true);
        g.actionSpeechUntil=S.t+2.8;gsay(g,c.ko?'여기 사람 쓰러졌어. 주변 좀 봐 줘.':'이 사람 죽었어! 출입구 막고 누가 있었는지 찾아봐.',2.8);
      }
      break;
    }
    case 'FUSE': {
      const fs = g.fuseAt ? g.fuseAt.at : STAGE.fuse;
      if (!g.path && !g.atFuse) pathTo(g, tc(fs[2]), tc(fs[3]));
      if (!g.atFuse) { if (moveAlong(g, spd, dt)) { g.atFuse = true; g.fuseWork = 2.8; } }
      else {
        g.want = Math.atan2(tc(fs[1]) - g.y, tc(fs[0]) - g.x); g.fuseWork -= dt;
        if (g.fuseWork <= 0 && g.fuseAt) { bldPower(g.fuseAt, true); g.fuseAt.guard = null; g.fuseAt = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); break; }
        if (g.fuseWork <= 0) { S.lightsOn = true; S.fuseGuard = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); toast('자경대원이 조명을 다시 켰다', 2.4); }
      }
      break;
    }
    case 'FLEE': {
      const fp = STAGE.flee;
      if (!g.path) pathTo(g, tc(fp[0]), tc(fp[1]));
      if (moveAlong(g, SPD.flee, dt) || dist(g.x, g.y, tc(fp[0]), tc(fp[1])) < 30) { endGame(false, '표적이 북문으로 달아났다.'); return; }
      break;
    }
  }
  if (g.sense != null && (g.state === 'PATROL' || g.state === 'RETURN')) { g.want = g.sense; g.x = sx0 + (g.x - sx0) * 0.4; g.y = sy0 + (g.y - sy0) * 0.4; }  // 흰색 단계: 걸음이 느려지고 이쪽으로 고개를 돌린다
  const tr = (g.state === 'ALERT' || g.state === 'NOTICE' ? 5.5 : ['SEARCH', 'SUSPICIOUS', 'CHECK', 'BODY'].includes(g.state) ? 3 : 1.7 + S.alevel * 0.35) * dt;  // 평소엔 천천히 고개를 돌린다
  g.a += clamp(angDiff(g.a, g.want), -tr, tr);
  if (g.moving) {
    g.stepT -= dt;
    if (g.stepT <= 0) {
      g.stepT = g.state === 'ALERT' || g.state === 'FLEE' ? 0.32 : 0.58;
      const d = dist(g.x, g.y, P.x, P.y);
      if (d < 360) play(stepSound(g.x, g.y), (1 - d / 360) * (g.state === 'ALERT' ? 0.5 : 0.28));
    }
  }
}
// 숨을 만한 곳 목록을 만들어 하나씩 확인하러 간다
