// ---------------------------------------------------------------- 자경대원 AI
// 멈춰 서서 둘러보기: 정면 → 한쪽 → 정면 → 반대쪽, 매번 잠깐씩 멈춰서 본다 (계속 고개를 흔들지 않는다)
function lookAround(g, dt, base, amp, hold) {
  if (g.lookT == null) { g.lookT = rnd(hold[0], hold[1]); g.lookI = 0; g.lookOff = 0; }
  g.lookT -= dt;
  if (g.lookT <= 0) { g.lookI = (g.lookI + 1) % 4; g.lookOff = [0, 1, 0, -1][g.lookI] * amp * rnd(0.8, 1.15) * (g.lookSide || (g.lookSide = Math.random() < 0.5 ? 1 : -1)); g.lookT = rnd(hold[0], hold[1]); }
  g.want = base + g.lookOff;
}
const npcCanOpenDoor=(g,d)=>!d.keyLock||g.hasKey===d.keyLock||!g.civ&&g.fac==='A'&&d.keyLock==='code';
function moveAlong(g, speed, dt) {
  if(g.doorWork){g.moving=false;return false;}
  if(g.path?.length&&!g.z){const next=g.path[0],d=S.doors.find(d=>d.locked&&flOf(d)===flOf(g)&&d.tx===Math.floor(next.x/TILE)&&d.ty===Math.floor(next.y/TILE));if(d&&npcCanOpenDoor(g,d)&&dist(g.x,g.y,d.x,d.y)<44){g.doorWork={d,t:0,dur:.36};d.npcWork=g.doorWork;g.a=g.want=Math.atan2(d.y-g.y,d.x-g.x);g.moving=false;play('cloth',.15*proxVol(g));return false;}}
  // A necessary bend can lead away from the destination. Measure the next leg,
  // so an actor making progress is not repeatedly sent back around the building.
  // A stationary person can invalidate a local sidestep. Replan around occupied
  // cells instead of stacking detours forever in a narrow doorway or aisle.
  if(g.path?.length){
    const goal=g.path[g.path.length-1],next=g.path[0],d=dist(g.x,g.y,next.x,next.y);
    let p=g.walkProgress;if(!p||p.x!==goal.x||p.y!==goal.y||p.nx!==next.x||p.ny!==next.y||p.fl!==flOf(g)||p.z!==(g.z||0))p=g.walkProgress={x:goal.x,y:goal.y,nx:next.x,ny:next.y,fl:flOf(g),z:g.z||0,best:d,t:0};
    if(d<p.best-8){p.best=d;p.t=0;}else p.t+=dt;
    if(p.t>3){
      p.t=0;const occupied=new Set(),sol=g.z?solidFor(g.z):solidAt,tx=Math.floor(goal.x/TILE),ty=Math.floor(goal.y/TILE);
      for(const o of S.guards){if(o===g||o.moving||o.state==='DEAD'||o.state==='CAPTIVE'||o.climb||flOf(o)!==flOf(g)||(o.z||0)!==(g.z||0)||dist(g.x,g.y,o.x,o.y)>TILE*6)continue;const x=Math.floor(o.x/TILE),y=Math.floor(o.y/TILE);if(x!==tx||y!==ty)occupied.add(y*MW+x);}
      if(occupied.size){const path=astar(Math.floor(g.x/TILE),Math.floor(g.y/TILE),tx,ty,(x,y)=>sol(x,y)||occupied.has(y*MW+x));if(path.length){path[path.length-1]={x:goal.x,y:goal.y};g.path=path;g.detourT=1.2;}}
    }
  }else g.walkProgress=null;
  const startX = g.x, startY = g.y; g.moving = false;
  if (!g.path || !g.path.length) {if(g.pathGoal&&dist(g.x,g.y,g.pathGoal.x,g.pathGoal.y)>32){if(S.t-(g.pathFailedAt||0)>.5)pathTo(g,g.pathGoal.x,g.pathGoal.y);return false;}return true;}
  if(STAGE.artSlice&&window.__clubView?.ready)speed*=window.__clubView.pace(g.path[0].x-g.x,g.path[0].y-g.y);
  // 군중 우회가 같은 자리에서 반복되면 원래 목적지로 다시 길을 잡는다.
  // 짧게 양보 우회만 멈추고 벽 판정과 몸 간격 보정은 그대로 적용한다.
  if ((g.target || g.route.some(w=>w.mealTrip)) && ['PATROL','RETURN'].includes(g.state)) {
    const end=g.path[g.path.length-1],next=g.path[0],d=dist(g.x,g.y,next.x,next.y);let r=g.motionRecovery;
    if(!r || r.x!==end.x || r.y!==end.y || r.nx!==next.x || r.ny!==next.y) r=g.motionRecovery={x:end.x,y:end.y,nx:next.x,ny:next.y,best:d,t:S.t,until:r?.until||0};
    if(d<r.best-8){r.best=d;r.t=S.t;}
    if(S.t-r.t>3 && d>20){
      const path=astar(Math.floor(g.x/TILE),Math.floor(g.y/TILE),Math.floor(end.x/TILE),Math.floor(end.y/TILE),g.z?solidFor(g.z):solidAt);
      if(path.length){path[path.length-1]={...end};g.path=path;r.until=S.t+1.2;}
      r.best=d;r.t=S.t;
    }
  }
  // 비켜 걷기: 앞에 서 있는 사람은 옆으로 돌아가고, 마주 오면 서로 오른쪽으로, 같은 방향이면 속도를 맞춰 뒤따른다
  if (g.detourT > 0) g.detourT -= dt;
  if (S.guards.length > 1 && !(g.motionRecovery && g.motionRecovery.until>S.t)) {
    const p0 = g.path[0], dd = dist(g.x, g.y, p0.x, p0.y);
    if (dd > 1) {
      const ux = (p0.x - g.x) / dd, uy = (p0.y - g.y) / dd, rxv = -uy, ryv = ux; let sx = 0, sy = 0, slow = 1;
      const P = S.player, others = [P].concat(S.guards);
      for (const o of others) {
        if (o === g || o.state === 'DEAD' || o.state === 'CAPTIVE' || o.climb || o.trav || o.hide || o.vent || o.under || flOf(o) !== flOf(g) || (o.z || 0) !== (g.z || 0)) continue;
        // 호위는 선두의 뒤를 따른다. 선두가 자기 호위를 피해 거꾸로 우회하지 않는다.
        if (o.follow === g.id || o.securityBuddy === g.id) continue;
        if (o === P && (P.wire || P.jump || P.ledge)) continue;
        const ox = o.x - g.x, oy = o.y - g.y, d = Math.hypot(ox, oy); if (d > 48 || d < 0.01) continue;
        const ahead = (ox * ux + oy * uy) / d; if (ahead < 0.25) continue;
        const w = (48 - d) / 48 * ahead, oa = o === P ? Math.atan2(P.vy || 0, P.vx || 0) : o.a, om = o === P ? P.moving : o.moving;
        const rel = om ? Math.cos(angDiff(oa, Math.atan2(uy, ux))) : 0;
        if (rel > 0.55 && o !== P) { slow = Math.min(slow, Math.max(0.1, (d - 28) / 20)); continue; }  // 같은 방향: 뒤따르기
        const side = ox * rxv + oy * ryv, sg = rel < -0.55 ? 1 : side > 0 ? -1 : 1;  // 마주 오면 오른쪽, 서 있으면 반대쪽
        sx += rxv * sg * w; sy += ryv * sg * w; if (d < 30) slow = Math.min(slow, 0.55);
        // 우회 지점: 상대 옆 36px로 돌아갈 점을 경로 앞에 끼운다 (막힌 칸이면 반대쪽)
        if (!(g.detourT > 0) && !g.path.some(p=>p.detour) && d < 58) {
          const sol = g.z ? solidFor(g.z) : solidAt;
          for (const s2 of [sg, -sg]) {
            const dx = o.x + rxv * s2 * 38 + ux * 8, dy = o.y + ryv * s2 * 38 + uy * 8;
            const ex = o.x + rxv * s2 * 34 + ux * 40, ey = o.y + ryv * s2 * 34 + uy * 40;
            if (!sol(Math.floor(dx / TILE), Math.floor(dy / TILE)) && !sol(Math.floor(ex / TILE), Math.floor(ey / TILE)) && !sol(Math.floor((g.x + dx) / 2 / TILE), Math.floor((g.y + dy) / 2 / TILE))) {
              const last = g.path[g.path.length - 1];
              g.path = g.path.filter(q => q === last || dist(q.x, q.y, o.x, o.y) > 44);  // 상대가 선 칸은 건너뛴다
              g.path.unshift({ x: dx, y: dy, detour: true }, { x: ex, y: ey, detour: true }); g.detourT = 1.2; break;
            }
          }
        }
      }
      if (sx || sy) {
        const k = speed * dt * 1.1, nx = g.x + sx * k, ny = g.y + sy * k, sol = g.z ? solidFor(g.z) : solidAt;
        if (!sol(Math.floor(nx / TILE), Math.floor(ny / TILE))) { g.x = nx; g.y = ny; }
      }
      speed *= slow;
    }
  }
  let step = speed * dt;
  while (step > 0 && g.path.length) {
    const p = g.path[0]; const d = dist(g.x, g.y, p.x, p.y);
    if (d <= step) { g.x = p.x; g.y = p.y; step -= d; g.path.shift(); }
    else { const q = g.path[1] || p; g.want = Math.atan2((p.y + q.y) / 2 - g.y, (p.x + q.x) / 2 - g.x); g.x += (p.x - g.x) / d * step; g.y += (p.y - g.y) / d * step; step = 0; }
  }
  collideLightPosts(g,11,g.z?solidFor(g.z):solidAt);
  g.moving = dist(startX, startY, g.x, g.y) > .01;
  return !g.path.length;
}
function updateNpcDoors(dt){
  for(const d of S.doors){const W=d.npcWork;if(!W)continue;const g=S.guards.find(g=>g.doorWork===W);if(!g||['DEAD','CAPTIVE'].includes(g.state)){if(g)g.doorWork=null;d.npcWork=null;continue;}W.t+=dt;if(d.locked&&W.t>=W.dur*.76){setDoor(d,false);play('metal',.2*proxVol(g));}if(W.t>=W.dur){g.doorWork=null;d.npcWork=null;}}
}
const solidAtG = (tx, ty) => solidAt(tx, ty);
function pathTo(g, x, y) {
  if (g.z) { g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE), solidFor(g.z)); if (g.path.length) { const last = g.path[g.path.length - 1]; if (rLv(Math.floor(x / TILE), Math.floor(y / TILE)) === g.z) { last.x = x; last.y = y; } } return; }
  g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
  if(!g.path.length&&!['ALERT','SEARCH','CHECK','BODY','SUSPICIOUS'].includes(g.state)){
    const doors=new Set(S.doors.filter(d=>flOf(d)===flOf(g)&&npcCanOpenDoor(g,d)).map(d=>d.ty*MW+d.tx));
    g.path=astar(Math.floor(g.x/TILE),Math.floor(g.y/TILE),Math.floor(x/TILE),Math.floor(y/TILE),(tx,ty)=>solidAt(tx,ty)&&!doors.has(ty*MW+tx));
  }
  // 쫓거나 뒤지는 중인데 길이 막혔으면 가까운 잠긴 문을 부수고 연다
  if (!g.path.length && dist(g.x, g.y, x, y) > 60 && ['ALERT', 'SEARCH', 'CHECK', 'BODY', 'SUSPICIOUS'].includes(g.state)) {
    const d = S.doors.filter(d => d.locked && flOf(d)===flOf(g)).sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
    if (d && dist(d.x, d.y, g.x, g.y) < 360) {
      setDoor(d, false); play('thud', 0.6 * proxVol(g)); noise(d.x, d.y, 160, 'door', flOf(g));
      if (dist(d.x, d.y, S.player.x, S.player.y) < 700) toast('자경대원이 잠긴 문을 부수고 열었다', 2.2, 'warn');
      g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
    }
  }
  if(!g.path.length&&Math.floor(g.x/TILE)===Math.floor(x/TILE)&&Math.floor(g.y/TILE)===Math.floor(y/TILE)&&dist(g.x,g.y,x,y)>6&&!solidAt(Math.floor(x/TILE),Math.floor(y/TILE)))g.path=[{x,y}];
  g.pathGoal={x,y};g.pathFailedAt=S.t;
  if (g.path.length && !solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { const last = g.path[g.path.length - 1]; last.x = x; last.y = y; }
}
// ---- 높이 단계: 땅(g) · 건물 위층(f층_건물) · 옥상(r구역). 자경대원은 계단·배관·베란다로 단계를 옮겨 쫓는다
function lvlInit() {
  const RC = new Int32Array(MW * MH).fill(-1); let n = 0;
  for (let i = 0; i < MW * MH; i++) {
    const tx = i % MW, ty = (i / MW) | 0, z = rLv(tx, ty); if (z <= 0 || RC[i] >= 0) continue;
    const st = [i]; RC[i] = n;
    while (st.length) { const c = st.pop(), cx = c % MW, cy = (c / MW) | 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ox, ny = cy + oy; if (!inMap(nx, ny)) continue; const j = ny * MW + nx; if (RC[j] < 0 && rLv(nx, ny) === z) { RC[j] = n; st.push(j); } } }
    n++;
  }
  S.lvl = { RC, ends: [] };
  for (const l of S.ladders) {
    if (l.kind === 'chimney') continue;
    const lower = l.kind === 'fstair' || l.kind === 'stair' ? stairLower(l).up.entry : l;
    const A = { fl: l.bfl || 0, z: l.bz || 0, x: lower.x, y: lower.y };
    const B = l.kind === 'fstair' || l.kind === 'balc' ? { fl: l.tfl, z: 0, x: l.kind === 'fstair' ? downPt(l).x : l.ux, y: l.kind === 'fstair' ? downPt(l).y : l.uy } : { fl: 0, z: l.tz, x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
    A.k = lvlKey(A); B.k = lvlKey(B); if (A.k !== B.k) S.lvl.ends.push({ l, A, B });
  }
}
function lvlKey(o) {
  const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
  if (o.z) return 'r' + (inMap(tx, ty) ? S.lvl.RC[ty * MW + tx] : -1);
  if (o.fl) return 'f' + o.fl + '_' + bldAt(tx, ty);
  return 'g';
}
const gSpot = g => ({ fl: flOf(g), z: g.z || 0, x: g.x, y: g.y });
const pSpot = () => { const P = S.player; return { x: P.x, y: P.y, fl: flOf(P), z: P.wire || P.under || P.vent ? 0 : P.jump ? P.jump.z1 || 0 : P.z || 0 }; };
// 다음에 탈 사다리 (가장 적게 갈아타는 길의 첫 칸, 같은 연결이면 가까운 것)
function nextHop(g, fromK, toK) {
  const E = S.lvl.ends, prev = { [fromK]: null }, q = [fromK];
  while (q.length) {
    const k = q.shift(); if (k === toK) break;
    for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === k && !(b.k in prev)) { prev[b.k] = { k, e, from: a, to: b }; q.push(b.k); }
  }
  if (!(toK in prev) || !prev[toK]) return null;
  let h = prev[toK]; while (h.k !== fromK) h = prev[h.k];
  let best = h, bd = dist(g.x, g.y, h.from.x, h.from.y);
  for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === fromK && b.k === h.to.k) { const d = dist(g.x, g.y, a.x, a.y); if (d < bd) { bd = d; best = { e, from: a, to: b }; } }
  return best;
}
// 목표 지점(높이 포함)으로 길 찾기: 다른 단계면 사다리 입구로 먼저 간다
function routeTo(g, t) {
  if (!S.lvl) lvlInit();
  g.hop = null;
  if (g.civ || g.dog || t.fl == null) { pathTo(g, t.x, t.y); return; }
  const gk = lvlKey(gSpot(g)), tk = lvlKey(t);
  if (gk === tk) { pathTo(g, t.x, t.y); return; }
  const h = nextHop(g, gk, tk);
  if (!h) { pathTo(g, t.x, t.y); return; }
  g.hop = h; pathTo(g, h.from.x, h.from.y);
}
// 사다리 입구에 닿았으면 실제로 올라타(내려가) 움직인다. 올라타면 true
function hopClimb(g, arrived) {
  const h = g.hop; if (!h || g.climb) return !!g.climb;
  const d = dist(g.x, g.y, h.from.x, h.from.y);
  if (d > (['fstair', 'stair'].includes(h.e.l.kind) ? 22 : arrived ? 90 : 22)) { if (arrived) g.hop = null; return false; }
  if (['fstair', 'stair'].includes(h.e.l.kind)) {
    const up = (h.to.z || 0) + (h.to.fl || 0) > (h.from.z || 0) + (h.from.fl || 0);
    g.climb = Object.assign(stairTravel(h.e.l, g, up), { from: h.from, to: h.to, t: 0, kind: 'stair', up });
    g.hop = null; g.path = null; return true;
  }
  g.x = h.from.x; g.y = h.from.y;
  const lv = Math.max(Math.abs((h.to.z || 0) - (h.from.z || 0)), Math.abs((h.to.fl || 0) - (h.from.fl || 0)), 1);
  const k = h.e.l.kind, kind = k === 'fstair' || k === 'stair' ? 'stair' : 'climb';
  g.climb = { from: h.from, to: h.to, t: 0, dur: kind === 'stair' ? 0.7 : 0.25 + lv * 0.5, kind, up: (h.to.z || 0) + (h.to.fl || 0) > (h.from.z || 0) + (h.from.fl || 0) };
  g.hop = null; g.path = null;
  if (kind === 'climb') play('metal', 0.3 * proxVol(g));
  return true;
}
function updateClimbG(g, dt) {
  const c = g.climb; c.t += dt; const f = Math.min(1, c.t / c.dur);
  if (c.stairs) {
    crossStairLevel(g, c, f);
    let i = 0; while (i < c.pts.length - 2 && f > c.pts[i + 1].f) i++;
    const a = c.pts[i], b = c.pts[i + 1], u = clamp((f - a.f) / Math.max(.00001, b.f - a.f), 0, 1);
    g.x = a.x + (b.x - a.x) * u; g.y = a.y + (b.y - a.y) * u;
    if (dist(a.x, a.y, b.x, b.y) > 1) g.a = Math.atan2(b.y - a.y, b.x - a.x);
  }
  else { g.x = c.from.x + (c.to.x - c.from.x) * f; g.y = c.from.y + (c.to.y - c.from.y) * f; } g.moving = true;
  if (c.kind === 'climb') g.a = c.up ? -Math.PI / 2 : Math.PI / 2;
  if (f >= 1) { g.climb = null; g.fl = c.to.fl || 0; g.z = c.to.z || 0; g.x = c.to.x; g.y = c.to.y; g.path = null; g.repath = 0; setLayer(flOf(g)); }
}
