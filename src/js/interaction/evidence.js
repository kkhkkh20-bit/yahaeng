function noteChange(kind, ref, key) { S.changes = S.changes || []; if (S.changes.some(c => c.ref === ref && !c.done)) return; S.changes.push({ kind, ref, key: key || null, x: ref.x, y: ref.y, fl: ref.fl || 0, by: null, done: false }); }
function changeOpen(c) { return c.kind === 'win' ? winSt(c.ref) === 'open' : !c.ref.locked; }
// 이 문을 닫으면 플레이어가 바깥으로 나갈 길이 없는가 (같은 층에서 걸어서)
function lockedIn(c) {
  const P = S.player, f = flOf(P); if (f !== c.fl || P.z) return false;
  const L0 = CUR_F; setLayer(f); const dts = new Set(c.ref.group.map(t => t.tx + ',' + t.ty)), seen = new Set(), st = [[Math.floor(P.x / TILE), Math.floor(P.y / TILE)]]; let out = false;
  while (st.length && seen.size < 1500) { const [x, y] = st.pop(), k = x + ',' + y; if (seen.has(k) || dts.has(k) || !inMap(x, y) || solidAt(x, y)) continue; seen.add(k); if (bldAt(x, y) < 0 || S.ladders.some(l => (l.kind === 'fstair' || l.kind === 'stair') && l.tx === x && l.ty === y)) { out = true; break; } st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  setLayer(L0); return !out;
}
function updateChanges(dt) {
  if (!S.changes || !S.changes.length || (S.chgT = (S.chgT || 0) - dt) > 0) return; S.chgT = 0.25;
  const P = S.player;
  for (const c of S.changes) {
    if (c.done) continue; if (!changeOpen(c)) { c.done = true; continue; }
    if (c.by && (c.by.state === 'DEAD' || c.by.state === 'CAPTIVE' || c.by.state === 'ALERT' || c.by.state === 'FLEE' || c.by.state === 'TERROR')) c.by = null;
    if (!c.by) {
      for (const g of S.guards) {
        if (g.civ || g.dog || g.target || g.climb || g.z || !['PATROL', 'RETURN', 'CHECK'].includes(g.state) || flOf(g) !== c.fl) continue;
        const d = dist(g.x, g.y, c.x, c.y); if (d > 230 || Math.abs(angDiff(g.a, Math.atan2(c.y - g.y, c.x - g.x))) > guardFov(g) * 1.2) continue;
        setLayer(c.fl); const ok = los(g.x, g.y, c.x, c.y, true); setLayer(flOf(P)); if (!ok) continue;
        // 자경대원 쪽 칸으로 가서 본다
        let tx = Math.floor(c.x / TILE), ty = Math.floor(c.y / TILE), best = null, bd = 1e9;
        setLayer(c.fl); const sol = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sol.push(solidAt(tx + dx, ty + dy)); setLayer(flOf(P));
        for (const [i, [dx, dy]] of [[1, 0], [-1, 0], [0, 1], [0, -1]].entries()) { const x = tx + dx, y = ty + dy; if (sol[i]) continue; const dd = dist(g.x, g.y, tc(x), tc(y)); if (dd < bd) { bd = dd; best = { x: tc(x), y: tc(y) }; } }
        c.by = g; c.at = best || { x: c.x, y: c.y }; goSuspicious(g, c.at.x, c.at.y, 2.2); gsay(g, c.kind === 'win' ? '창문이 왜 열려 있지?' : '이 문이 왜 열려 있어?', 2.4);
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '자경대원이 열린 창문을 알아챘다 — 다시 잠그러 간다' : '자경대원이 열린 문을 알아챘다 — 다시 잠그러 간다', 2.4, 'warn');
        break;
      }
    } else {
      const g = c.by;
      if (g.state !== 'SUSPICIOUS' && g.state !== 'NOTICE') { if (dist(g.x, g.y, c.at.x, c.at.y) > 70) goSuspicious(g, c.at.x, c.at.y, 2.2); }
      if (dist(g.x, g.y, c.at.x, c.at.y) < 46 && dist(P.x, P.y, c.x, c.y) > 40) {
        if (c.kind !== 'win' && !(P.picks > 0) && lockedIn(c)) { c.done = true; continue; }  // 다시 잠그면 내가 갇혀 나갈 길이 없으면(락픽도 없으면) 잠그지 않는다
        if (c.kind === 'win') c.ref.st = 'lock'; else { if (doorBlocked(c.ref)) continue; if (c.key) c.ref.group.forEach(t => t.keyLock = c.key); setDoor(c.ref, true); for (const o of S.guards) if (o.path) o.path = null; }
        c.done = true; play('metal', 0.35 * proxVol(g)); noise(c.x, c.y, 40, 'door');
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '창문이 다시 잠겼다' : '문이 다시 잠겼다', 1.8);
      }
    }
  }
}
// 연습(훈련장): 단계를 차례로 확인하고 다음 할 일을 알려 준다
function updateTutorial(dt = 1/60) {
  const st = STAGE.steps; if (!st || S.over) return; S.tutI = S.tutI || 0;
  if(STAGE.id==='tB'&&[4,5].includes(S.tutI)&&S.guards[0]&&S.guards[0].state!=='DEAD'&&S.guards[0].state!=='CAPTIVE'&&!S.corpses.some(c=>c.guardId===S.guards[0].id)){S.tutI=2;S.tutHold=0;S.tutStepAt=S.t;hudCache.objH=null;toast('경비가 깨어났다 · 다시 등 뒤로 접근하자',2.4);}
  if(STAGE.firstSteps&&STAGE.storyEpisode){if(S.items[0]?.got&&S.tutI<8){S.tutI=flOf(S.player)?8:9;S.tutStepAt=S.t;hudCache.objH=null;}else if(flOf(S.player)===1&&S.tutI<7){S.tutI=7;S.tutStepAt=S.t;hudCache.objH=null;}}
  if(S.tutI<st.length&&!st[S.tutI][1](S,S.player,input,SH)){S.tutHold=0;return;}
  // Let the new instruction render before accepting an already-satisfied condition.
  if(S.t-(S.tutStepAt??-1)<.35)return;
  if(S.tutI<st.length&&st[S.tutI][1](S,S.player,input,SH)){
    const hold=st[S.tutI][5]||0;if(hold){S.tutHold=(S.tutHold||0)+dt;if(S.tutHold<hold)return;}
    S.tutHold=0;S.tutI++;S.tutStepAt=S.t;S.cpWant=true;hudCache.objH=null;if(!STAGE.storyEpisode)play('switch',.45,1.5);
  }
}
