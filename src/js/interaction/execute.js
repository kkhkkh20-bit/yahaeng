function actPrimary(force) {
  if (!S || S.over || paused || !running || tactical) return;  // 전술 지도(시간 멈춤) 중에는 행동하지 않는다
  if (DLG.modal) { advanceDialog(); return; }
  if (actionBusy() && !(S.player.interact && S.player.interact.committing)) return;
  const a = force && force.viaZ ? force : primaryAction(), P = S.player;
  if (!prepareCombat(a)) return;
  // 입력 버퍼: 지금 할 수 있는 게 없으면 잠깐 안에 생기는 행동을 대신 실행 (암살하러 다가가는 중이면 암살만 기다린다)
  if (a.k === 'none') { S.qBuf = a.stalk ? 0.5 : 0.25; S.qKill = !!a.stalk; if (a.stalk) hint('stalk', '사람에게는 [공격], 문·조명·쪽지는 [행동]'); return; }
  if (!(P.interact && P.interact.committing) && beginObjectAction(a)) return;
  S.qBuf = 0; S.qKill = false; P.vx = 0; P.vy = 0;
  switch (a.k) {
    case 'leave': leaveHide(); break;
    case 'carIn': carEnter(a.v); break;
    case 'carOut': carExit(); break;
    case 'contract': cityContract(a.c); break;
    case 'rumor': spreadRumor(a.c); break;
    case 'surface': {beginAccessFlow('surface',a.w);break;}
    case 'ambush': startAmbush(a.g); break;
    case 'clean': startClean(a.d); break;
    case 'loot': startLoot(a.it); break;
    case 'counter': doCounter(a.g); break;
    case 'winDrop': {  // 창틀을 넘고 → 벽에 매달려 → 내려선다
      const w = a.w, o = w.out, up = { x: o.x - o.d[0] * 22, y: o.y - o.d[1] * 22 }; P.a = Math.atan2(o.d[1], o.d[0]); play('cloth', 0.4);
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: w.inn.x, y: w.inn.y, f: 0.15 }, { x: up.x, y: up.y - 44, f: 0.4 }, { x: up.x, y: up.y, f: 0.85 }, { x: o.x, y: o.y, f: 1 }], dur: 1.2,
        phases: [{ to: 0.4, pose: 'vault' }, { to: 0.85, pose: 'climb' }, { to: 1, pose: 'vault' }], face: Math.atan2(-o.d[1], -o.d[0]), down: true, step: 'cloth', base: { x: o.x, y: o.y },
        room:{b:bldAt(w.tx,w.ty),fl:w.fl,until:.4},crossing:{at:.4,fl:0,z:0,fade:false} });
      P.trav.end = () => { P.fl = 0; setLayer(0); P.z = 0; P.x = o.x; P.y = o.y; play('land', 0.25); noise(o.x, o.y, 70, 'land', 0); };
      break;
    }
    case 'winClimb': {  // 웅크렸다 뛰어올라 벽을 타고 2층 창틀을 넘는다
      const w = a.w, o = w.out, up = { x: o.x - o.d[0] * 22, y: o.y - o.d[1] * 22 }, lk = w.st !== 'open'; P.a = Math.atan2(-o.d[1], -o.d[0]); play('cloth', 0.4); noise(P.x, P.y, 60, 'climb'); S.stats.winClimb = (S.stats.winClimb || 0) + 1;
      // 잠긴 창문: 창틀에 매달린 채 락픽으로 딴다 (락픽 하나를 쓰고 1.3초 더 걸린다)
      if (lk) { P.picks--; w.st = 'open'; after(0.6, () => play('metal', 0.25, 1.8)); after(1.2, () => play('metal', 0.25, 1.9)); after(1.7, () => play('click', 0.4)); }
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: o.x, y: o.y, f: 0.1 * (lk ? 0.55 : 1) }, { x: up.x, y: up.y, f: 0.25 * (lk ? 0.55 : 1) }, { x: up.x, y: up.y - 44, f: lk ? 0.85 : 0.72 }, { x: w.inn.x, y: w.inn.y, f: 1 }], dur: lk ? 2.8 : 1.25,
        phases: [{ to: 0.1 * (lk ? 0.55 : 1), pose: 'wjCrouch' }, { to: 0.25 * (lk ? 0.55 : 1), pose: 'wjLeap' }, { to: lk ? 0.85 : 0.72, pose: 'climb' }, { to: 1, pose: 'vault' }], face: P.a, base: { x: o.x, y: o.y }, step: 'cloth',
        room:{b:bldAt(w.tx,w.ty),fl:w.fl,from:lk?.86:.74},crossing:{at:lk?.86:.74,fl:w.fl,z:0,fade:false} });
      if (lk) toast(`2층 창문을 땄다 — 락픽 ${P.picks}개 남음`, 2);
      after(0.12, () => play('throw', 0.3));
      // 창틀을 넘는 순간부터는 2층 안에 있는 사람 눈에 보인다 (그 전엔 바깥 1층에서만)
      P.trav.end = () => { P.fl = w.fl; setLayer(P.fl); P.z = 0; P.x = w.inn.x; P.y = w.inn.y; play('land', 0.2); hint('winClimb', '열린 2층 창문은 밑에서 벽을 타고 들어갈 수 있다. 잠긴 창문은 안 된다'); };
      break;
    }
    case 'window': {
      const v=windowPassage(a.wv.w);if(!v||winSt(v.w)!=='open')break;
      const w=v.w,end={x:tc(v.tx),y:tc(v.ty)};play('cloth',.4);
      startTrav({pts:[{x:P.x,y:P.y,f:0},{x:w.x+v.nx*24,y:w.y+v.ny*24,f:.22},{x:w.x-v.nx*24,y:w.y-v.ny*24,f:.78},{...end,f:1}],dur:.78,
        phases:[{to:.22,pose:'walk'},{to:.78,pose:'vault'},{to:1,pose:'walk'}],local:true,room:{b:bldAt(w.tx,w.ty),fl:0},
        end:()=>{play('land',.2);noise(end.x,end.y,45,'land',0);}});
      hint('window', '창문은 자경대원이 지나다니지 않는다. 안팎을 몰래 드나드는 길로 써라');
      break;
    }
    case 'drop': {
      if(!STAGE.tutorial&&!skillOn('drop'))break;
      // 위에서 덮치기: 그 자리로 순간이동하지 않고 뛰어내려 덮친다 (내려앉는 순간 처치)
      const g = a.g, z0 = P.z || 0; P.wire = null; P.a = Math.atan2(g.y - P.y, g.x - P.x); g.doomed = true; g.path = null; g.moving = false;
      P.jump = { x0: P.x, y0: P.y, x1: g.x, y1: g.y, t: 0, dur: 0.26 + z0 * 0.05, z1: 0, arc: 10, noise: 40, killG: g, dropKill: true }; P.z = 0; play('throw', 0.3);
      break;
    }
    case 'wireOn': {
      if (!wireUsable()) break;
      const grab = () => { if (P.fl) { P.fl = 0; setLayer(0); S.fade = 0.15; }
        P.wire = { w: a.w, s: a.s }; P.z = Math.max(1, Math.round(a.w.a.z + (a.w.b.z - a.w.a.z) * a.s)); const h = wirePt(a.w, a.s); P.x = h.x; P.y = h.y + 40; };
      play(a.pole ? 'metal' : 'cloth', 0.3); noise(P.x, P.y, a.pole ? 45 : 25, 'climb');
      if (a.pole) {  // 전봇대를 붙잡고 꼭대기까지 기어오른다
        const o = { x: a.at.x, y: a.at.y + 30 }, h = wirePt(a.w, a.s);
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: o.x, y: o.y + 4, f: 0.15 }, { x: h.x, y: h.y + 36, f: 1 }], dur: 0.75, phases: [{ to: 1, pose: 'climb' }], face: -Math.PI / 2, base: { x: o.x, y: o.y }, step: 'metal', loud: 40, end: grab });
        hint('pole', '전봇대: 땅에서 올라 바로 전깃줄로 옮겨 탄다. 전봇대 끝에서 방향키를 밀면 다른 줄로 갈아탄다');
      } else grab();
      break;
    }
    case 'wireOff': wireDismount(a.n); break;
    case 'wireRoof': { const h = P.wire ? wirePt(P.wire.w, P.wire.s) : { x: P.x, y: P.y }; P.wire = null; const to = a.to || { x: P.x, y: P.y };  // 줄에서 옥상으로 살짝 뛰어 내려선다
      P.jump = { x0: h.x, y0: h.y, x1: to.x, y1: to.y, t: 0, dur: 0.24, z1: a.lv, arc: 8, noise: 50 }; P.z = a.lv; break; }
    case 'wireFall': {
      const h = wirePt(P.wire.w, P.wire.s); P.wire = null;
      P.jump = { x0: P.x, y0: P.y, x1: P.x, y1: P.y, t: 0, dur: 0.32, z1: 0, arc: 8, noise: 130 };
      play('throw', 0.3); break;
    }
    case 'down': {
      if (a.l && a.l.kind === 'stair') { S.stats.roofStair = (S.stats.roofStair || 0) + 1; beginStairTravel(a.l, false); break; }
      const l = a.l, fin = () => { P.z = l.bz; P.fl = l.bfl || 0; setLayer(P.fl); P.x = l.x; P.y = l.y;
        if (l.kind === 'chimney') { noise(l.ux, l.uy, 70, 'soot'); S.fx.push({ k: 'smoke', x: l.ux, y: l.uy, t: 0 }); toast('굴뚝을 타고 아궁이로 내려왔다 (이동 소음 발생)', 2.2); } };
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.3);
      if(l.kind==='pipe'){startTrav({...pipeTravel(l,P,false),end:fin});break;}
      if (l.kind === 'ladder') {  // 사다리를 붙잡고 한 칸씩 내려간다
        const top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy }, lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y + 18, f: 0.14 }, { x: l.x, y: l.y, f: 1 }], dur: 0.4 + lv * 0.36, phases: [{ to: 0.14, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'metal', loud: 45, end: fin });
      } else startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 1 }], dur: 0.45, phases: [{ to: 1, pose: 'walk' }], end: () => { fin(); S.fade = 0.12; } });
      break;
    }
    case 'read': readNote(a.n); break;
    case 'winJump': {
      const w = a.w, L = w.link, tx = tc(L.tx + L.dir), ty = tc(L.ty);
      P.jump = { x0: P.x, y0: P.y, x1: a.kill ? a.kill.x - L.dir * 26 : tx, y1: a.kill ? a.kill.y : ty, t: 0, dur: 0.62, z1: 0, arc: 22, noise: a.kill ? 20 : 45, killG: a.kill || null, vault: true };
      P.a = L.dir > 0 ? 0 : Math.PI; play('throw', 0.3); play('cloth', 0.3);
      hint('winJump', '창문 건너기: 붙어 있는 빌라는 같은 층 옆 창문끼리 건너뛴다. 착지 소리가 조금 난다');
      break;
    }
    case 'fdown': { const l = a.l;
      if (l.kind === 'balc') {  // 난간을 넘어 밖으로 나가 기둥을 타고 내려간다
        P.fl = 0; setLayer(0); S.fade = 0.12; play('cloth', 0.35);
        startTrav({ pts: [{ x: l.ux, y: l.uy - 10, f: 0 }, { x: l.ux, y: l.uy + 24, f: 0.28 }, { x: l.x, y: l.y, f: 1 }], dur: 1.0, phases: [{ to: 0.28, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'cloth', loud: 40,
          end: () => { P.z = 0; P.x = l.x; P.y = l.y; P.a = Math.PI / 2; noise(l.x, l.y, 45, 'climb'); } });
        break;
      }
      beginStairTravel(l, false);
      break; }
    case 'up': {
      if (!physicalAccess(a.l)) break;
      const l = a.l, top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
      if (l.kind === 'balc') {  // 베란다: 난간까지 기어올라 넘어 들어간다
        const v = a.kill && a.kill.state !== 'DEAD' ? a.kill : null;
        play('cloth', 0.35); noise(l.x, l.y, v ? 30 : 55, 'climb');
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.12 }, { x: l.ux, y: l.uy + 26, f: 0.72 }, { x: l.ux, y: l.uy, f: 1 }], dur: 1.05, phases: [{ to: 0.72, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: 'cloth',
          end: () => { P.fl = 1; setLayer(1); P.x = l.ux; P.y = l.uy; P.a = -Math.PI / 2; S.fade = 0.12;
            if (v && v.state !== 'DEAD') { const g = v; P.x = g.x; P.y = g.y + 22; collide(P, 13, groundSolidP); P.strikeT = 0.35; P.a = Math.atan2(g.y - P.y, g.x - P.x); killGuard(g); if (!g.civ) { S.stats.special++; toast(lastKO() ? '베란다 넘어 기절' : '베란다 넘어 암살', 1.8, 'good'); } }
            else toast('베란다 난간을 타고 2층으로 들어왔다', 1.8); } });
        break;
      }
      if (l.kind === 'fstair' || l.kind === 'stair') { beginStairTravel(l, true); break; }
      if(l.kind==='pipe'){play('metal',.35);startTrav({...pipeTravel(l,P,true),end:()=>{P.fl=0;setLayer(0);P.z=l.tz;P.x=top.x;P.y=top.y;}});break;}
      const climb = l.kind === 'chimney' || l.kind === 'ladder', lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.35); if (l.kind === 'chimney') noise(l.ux, l.uy, 60, 'soot');
      startTrav(climb ? { pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.1 }, { x: top.x, y: top.y + 18, f: 0.86 }, { x: top.x, y: top.y, f: 1 }], dur: 0.45 + lv * 0.42, phases: [{ to: 0.86, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: l.kind === 'pipe' ? 'metal' : 'cloth', loud: l.kind === 'pipe' ? 45 : 30 }
        : { pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y, f: 1 }], dur: 0.5, phases: [{ to: 1, pose: 'walk' }] },
        { end: null });
      P.trav.end = () => { P.fl = 0; setLayer(0); P.z = l.tz; P.x = top.x; P.y = top.y; };
      break;
    }
    case 'smother': {
      const l = a.l.lamp; l.off = true; play('cloth', 0.45); noise(l.x, l.y, 130, 'smoke');
      S.fx.push({ k: 'smoke', x: a.l.ux, y: a.l.uy, t: 0 });
      refreshBodyLighting();
      toast('굴뚝을 막았다 — 연기가 방에 차며 불이 꺼졌다. 안의 자경대원이 다시 불을 피우러 온다', 3, 'good');
      break;
    }
    case 'ventIn': {beginAccessFlow('ventIn',a.v);break;}
    case 'ventOut': {beginAccessFlow('ventOut',a.v);break;}
    case 'ventKill': {
      if(STAGE.artSlice){beginVentPull(a.g,a.v);break;}
      const g = a.g; killGuard(g, 'stash', { bodies: 0 }); a.v.open = true; P.strikeT = 0.3; S.stats.special++;
      toast('자경대원을 환풍구 안으로 끌어들였다', 2.2, 'good'); break;
    }
    case 'leap': case 'jump': {
      const t = a.k === 'leap' ? [a.j.tx, a.j.ty, a.j.z] : a.s;
      if(!inMap(t[0],t[1])||solidFor(t[2]||0)(t[0],t[1]))break;
      P.jump = { x0: P.x, y0: P.y, x1: tc(t[0]), y1: tc(t[1]), t: 0, dur: a.k === 'leap' ? 0.42 : 0.3, z1: t[2], arc: a.k === 'leap' ? 26 : 10 };
      P.jump.downward=(t[2]||0)<P.z;P.jump.face=Math.atan2(P.jump.y1-P.y,P.jump.x1-P.x);
      P.a = P.jump.face; play('throw', 0.35);
      break;
    }
    case 'ledgeKill': { beginLedgePull(a.g);break; }
    case 'wallUp': {  // 1층 높이 벽: 손을 뻗어 가장자리를 잡고 끌어올린다
      const s = wallUpSpot();
      if (!s || !a.s || s.z !== a.s.z || dist(s.top.x, s.top.y, a.s.top.x, a.s.top.y) > 2) break;
      P.a = Math.atan2(s.n[1], s.n[0]); play('cloth', 0.4); noise(P.x, P.y, 55, 'climb'); S.stats.wallUp = (S.stats.wallUp || 0) + 1;
      // 웅크림(0.12) → 뛰어올라 가장자리를 잡음(0.3) → 매달려 한 번 버팀(0.55) → 끌어올림(0.88) → 올라섬
      const hang = { x: s.edge.x + (s.top.x - s.edge.x) * 0.55, y: s.edge.y + (s.top.y - s.edge.y) * 0.55 };
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: P.x, y: P.y, f: 0.12 }, { x: hang.x, y: hang.y, f: 0.3 }, { x: hang.x, y: hang.y, f: 0.55 }, { x: s.top.x, y: s.top.y + 14, f: 0.88 }, { x: s.top.x, y: s.top.y, f: 1 }], dur: 1.15,
        phases: [{ to: 0.12, pose: 'wjCrouch' }, { to: 0.3, pose: 'wjLeap' }, { to: 0.55, pose: 'wjHang' }, { to: 0.88, pose: 'climb' }, { to: 1, pose: 'vault' }], face: P.a, hangOk: s.n[1] === -1, base: { x: s.edge.x, y: s.edge.y }, elev: P.z || 0 });
      after(0.15, () => play('throw', 0.3)); after(0.34, () => play('land', 0.2));  // 뛰는 소리 · 손이 턱에 닿는 소리
      P.trav.end = () => { P.fl = 0; setLayer(0); P.z = s.z; P.x = s.top.x; P.y = s.top.y; hint('wallUp', '1층 높이 벽은 가장자리를 잡고 오를 수 있다. 내려갈 때는 가장자리에 매달려 밖으로 민다'); };
      break;
    }
    case 'ledgeUp': { const n0 = P.ledge, d = ledgeDraw(P); P.ledge = null; play('cloth', 0.3); startTrav({ pts: [{ x: d.x, y: d.y, f: 0 }, { x: P.x - n0.x * 6, y: P.y - n0.y * 6, f: 1 }], dur: 0.38, phases: [{ to: 1, pose: 'vault' }], face: Math.atan2(-n0.y, -n0.x) }); break; }
    case 'ledgeDrop': dropLedge(P); break;
    case 'pushOff': {
      const g = a.g, c = g.climb; P.strikeT = 0.3; P.a = Math.atan2(g.y - P.y, g.x - P.x); play('metal', 0.5);
      fallKill(g, { x: g.x, y: g.y }, { x: c.from.x, y: c.from.y + 6 }); toast('배관에서 밀어 떨어뜨렸다 — 추락사로 보인다', 2, 'good');
      break;
    }
    case 'pull': {
      const g = a.g, n = P.cover || { x: 0, y: 0 };
      g.doomed = true; g.moving = false; g.path = null;
      const pd = dist(P.x, P.y, g.x, g.y), k = Math.min(0.35, 30 / Math.max(1, pd)); S.pull = { g, x0: g.x, y0: g.y, x1: P.x + (g.x - P.x) * k + n.x * 4, y1: P.y + (g.y - P.y) * k + n.y * 4, t: 0, dur: 0.16 + pd / 900 };
      P.a = Math.atan2(g.y - P.y, g.x - P.x); P.strikeT = 0.34; play('cloth', 0.55);
      break;
    }
    case 'kill': case 'kill2': {
      const g0 = a.list[0], d0 = dist(P.x, P.y, g0.x, g0.y);
      P.a = Math.atan2(g0.y - P.y, g0.x - P.x);
      if (d0 > 40) {  // 달려들기: 짧게 돌진해 등 뒤에 붙은 뒤 처치
        const ux = (g0.x - P.x) / d0, uy = (g0.y - P.y) / d0;
        a.list.forEach(g => { g.doomed = true; g.moving = false; });
        P.lunge = { x0: P.x, y0: P.y, x1: g0.x - ux * 26, y1: g0.y - uy * 26, t: 0, dur: 0.12 + d0 / 480, list: a.list, two: a.k === 'kill2' };
        play('cloth', 0.35); break;
      }
      strikeKill(a.list, a.k === 'kill2');
      break;
    }
    case 'callMeet': {callRendezvous();break;}
    case 'camroom': { S.camsOff = true; S.cameraEvidence = false; const n = S.stats.camRec || 0; if(n || S.stats.camEver!=null) S.stats.camEver = Math.max(S.stats.camEver || 0, n); S.stats.camRec = 0; play('switch', 0.5); noise(P.x, P.y, 50, 'switch'); toast('관리실: CCTV를 모두 끄고 ' + (n ? `녹화 ${n}건을 지웠다` : '녹화를 지웠다') + ' · 서치라이트는 별도 전원', 2.8, 'good'); S.stats.camKill = 1; checkObjective(); break; }
    case 'fuse': cutLights(); break;
    case 'trap': fireTrap(a.tp); break;
    case 'bfuse': { bldPower(a.fb, false); play('fuse', 0.5); noise(a.fb.x, a.fb.y, 60, 'switch'); const B = BLD[a.fb.b]; toast(`${B.plate || B.name || '건물'} 전등이 모두 꺼졌다 — 곧 누가 두꺼비집을 올리러 온다`, 3); hint('bfuse', '두꺼비집: 건물 전등을 모두 끈다. 누군가 직접 와서 올려야 켜진다'); break; }
    case 'lamp': {
      const l = a.l,watchers=!l.off?lampSwitchWitnesses(l):[];l.off = !l.off; play('switch', 0.45); noise(lampControl(l).x, lampControl(l).y, 25, 'switch',flOf(l),l.z||0);
      if(l.off)respondToLampOff(l,watchers);
      refreshBodyLighting();
      if (l.off) hint('lampHand', '손으로 끈 조명은 지나가던 자경대원이 다시 켠다. 전원을 차단하면 복구하러 오는 경비를 유인할 수 있다');
      break;
    }
    case 'keypad': openKeypad(a.d); break;
    case 'pick': startPick(a.o); break;
    case 'keymsg': if (!a.d) { toast(a.label, 1.8); break; } if (a.d.gate) { toast('반대편에서 빗장을 걸어 둔 쪽문이다. 안쪽으로 돌아 들어가 풀면 지름길이 된다', 2.6); break; } toast((a.d.keyLock === 'gold' && STAGE.keyHint) || '잠긴 문이다. ' + withJosa(keyName(a.d.keyLock), '이/가') + ' 필요하다. 창문·옥상·환풍구로 우회할 수도 있다', 2.4); break;
    case 'door': {
      const d = a.d; if (d.gate && d.locked) { d.gate = null; toast('빗장을 풀었다 — 지름길이 열렸다', 2, 'good'); S.stats.gates = (S.stats.gates || 0) + 1; }
      if (d.keyLock && d.locked) { const kn = keyName(d.keyLock); noteChange('door', d, d.keyLock); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; d.group.forEach(t => t.keyLock = false); toast(withJosa(kn, '으로/로') + ' 문을 열었다', 1.8, 'good'); }
      if (!d.locked && doorBlocked(d)) { toast('문 앞에 무언가 있어 닫을 수 없다', 1.6); break; }
      setDoor(d, !d.locked); play(d.locked ? 'metal' : 'cloth', 0.45); noise(d.x, d.y, 35, 'door');
      for (const g of S.guards) if (g.path) g.path = null;
      if (d.locked) hint('lock', '잠긴 문은 자경대원이 돌아서 간다. 쫓기거나 수색 중인 자경대원은 문을 부순다');
      break;
    }
    case 'finish': finishKo(a.c, a.c.g); P.strikeT = .35; checkObjective(); break;
    case 'execute': execCaptive(); break;
    case 'drag': { if(P.captive)execCaptive(true);break; } // Legacy input also incapacitates outside; storage is a separate action.
    case 'retrieve': beginHideFlow('retrieve',a.h,a.c); break;
    case 'hide': enterHide(a.h); break;
    case 'stash': actCarry({ k: 'carry', c: P.carrying, h: a.h }); break;
  }
}
// 붙잡기: 바로 붙지 않는다. 등 뒤로 몇 걸음 달려 붙고(run) → 팔로 목을 감아 끌어당긴다(clinch) → 그 뒤에 끌고 다닌다
