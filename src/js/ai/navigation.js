// ---------------------------------------------------------------- 자경대원 AI
// 멈춰 서서 둘러보기: 정면 → 한쪽 → 정면 → 반대쪽, 매번 잠깐씩 멈춰서 본다 (계속 고개를 흔들지 않는다)
function lookAround(g, dt, base, amp, hold) {
  if (g.lookT == null) { g.lookT = rnd(hold[0], hold[1]); g.lookI = 0; g.lookOff = 0; }
  g.lookT -= dt;
  if (g.lookT <= 0) { g.lookI = (g.lookI + 1) % 4; g.lookOff = [0, 1, 0, -1][g.lookI] * amp * rnd(0.8, 1.15) * (g.lookSide || (g.lookSide = Math.random() < 0.5 ? 1 : -1)); g.lookT = rnd(hold[0], hold[1]); }
  g.want = base + g.lookOff;
}
const npcCanForceDoor = g => !g.civ && !g.dog && ['ALERT','SEARCH','CHECK','BODY','SUSPICIOUS'].includes(g.state);
const npcCanOpenDoor=(g,d)=>!d.keyLock||g.hasKey===d.keyLock||STAGE.cityLife&&g.resident&&d.keyLock==='gold'||!g.civ&&g.fac==='A'&&d.keyLock==='code';
function npcPostLegClear(a,b,sol=solidAt){
  const steps=Math.max(1,Math.ceil(dist(a.x,a.y,b.x,b.y)/6));
  for(let i=0;i<=steps;i++)for(const [dx,dy]of [[0,0],[9,0],[-9,0],[0,9],[0,-9]]){
    if(sol(Math.floor((a.x+(b.x-a.x)*i/steps+dx)/TILE),Math.floor((a.y+(b.y-a.y)*i/steps+dy)/TILE)))return false;
  }
  return true;
}
function avoidStreetPost(g){
  if(flOf(g)||g.z||!g.path?.length)return;
  const next=g.path[0],dx=next.x-g.x,dy=next.y-g.y,d=Math.hypot(dx,dy);if(d<1)return;
  for(const l of d<240?streetPostsNear(g.x+dx/2,g.y+dy/2):S.lamps){
    const m=l.mount;if(m?.kind!=='street')continue;
    const u=clamp(((m.ax-g.x)*dx+(m.ay-g.y)*dy)/(d*d),0,1);
    if(u<=0||dist(g.x+dx*u,g.y+dy*u,m.ax,m.ay)>=19)continue;
    const ux=dx/d,uy=dy/d,options=[];
    for(const side of [1,-1]){
      const a={x:m.ax-uy*side*24-ux*24,y:m.ay+ux*side*24-uy*24,detour:true,postDetour:true};
      const b={x:m.ax-uy*side*24+ux*24,y:m.ay+ux*side*24+uy*24,detour:true,postDetour:true};
      if(npcPostLegClear(g,a)&&npcPostLegClear(a,b)&&npcPostLegClear(b,next))options.push({a,b,cost:dist(g.x,g.y,a.x,a.y)+dist(a.x,a.y,b.x,b.y)+dist(b.x,b.y,next.x,next.y)});
    }
    options.sort((a,b)=>a.cost-b.cost);if(options.length){g.path.unshift(options[0].a,options[0].b);g.detourT=1.2;}
    return;
  }
}
const stairPassKey=l=>[l.kind,l.tx,l.ty,l.bfl||0,l.tfl??l.tz].join(':');
function stairPassBusy(key,except){
  return S.guards.some(o=>o!==except&&o.climb?.stairs?.key===key)||S.player!==except&&S.player.trav?.stairs?.key===key;
}
// A fixed post at the mouth cannot be avoided like a person in an open street.
// Ask a calm NPC to walk to a clear side position, wait, then return to the post.
function requestStairSpace(g){
  const h=g.hop;if(!h||!['fstair','stair'].includes(h.e.l.kind)||dist(g.x,g.y,h.from.x,h.from.y)>100)return;
  const key=stairPassKey(h.e.l),entry=h.from;
  for(const o of S.guards){
    if(o===g||o.climb||o.hop||o.stairYield||o.doomed||o.yank||o.brawl||o.hunt||o.incident||o.raid||o.target||o.dog||o.child||o.follow!=null||o.searchJob||o.relight||o.bodyWork||o.path?.length||o.moving||!['PATROL','RETURN'].includes(o.state)||flOf(o)!==flOf(g)||(o.z||0)!==(g.z||0)||dist(o.x,o.y,entry.x,entry.y)>32)continue;
    const solid=npcRouteSolid(o),grid=flOf(o)?GF[flOf(o)]:G0,sol=(x,y)=>solid(x,y)||!o.z&&grid?.[y]?.[x]==='Y',spots=[];
    for(const [dx,dy]of N8){
      const at={x:o.x+dx*40,y:o.y+dy*40};
      if(dist(at.x,at.y,entry.x,entry.y)<36||!npcPostLegClear(o,at,sol))continue;
      if(S.guards.some(a=>a!==o&&a.state!=='DEAD'&&a.state!=='CAPTIVE'&&flOf(a)===flOf(o)&&(a.z||0)===(o.z||0)&&(dist(a.x,a.y,at.x,at.y)<30||a.stairYield&&dist(a.stairYield.aside.x,a.stairYield.aside.y,at.x,at.y)<30)))continue;
      const P=S.player;if(!P.hide&&!P.under&&!P.vent&&flOf(P)===flOf(o)&&(P.z||0)===(o.z||0)&&dist(P.x,P.y,at.x,at.y)<30)continue;
      spots.push(at);
    }
    spots.sort((a,b)=>dist(o.x,o.y,a.x,a.y)-dist(o.x,o.y,b.x,b.y)||dist(b.x,b.y,g.x,g.y)-dist(a.x,a.y,g.x,g.y));
    if(!spots.length)continue;
    endChat(o);o.act=null;o.bubble=null;
    o.stairYield={key,entry:{...entry},home:gSpot(o),aside:spots[0],phase:'out',t0:S.t};
    o.path=[{...spots[0]}];o.pathGoal={...spots[0]};o.walkProgress=null;
  }
}
function updateStairYield(g,dt){
  const w=g.stairYield;if(!w)return false;
  if(!['PATROL','RETURN'].includes(g.state)||g.brawl||g.hunt||g.climb||flOf(g)!==w.home.fl||(g.z||0)!==w.home.z){g.stairYield=null;g.path=null;g.pathGoal=null;g.repath=0;return false;}
  if(w.phase==='wait'){
    g.moving=false;
    const approaching=S.guards.some(o=>o!==g&&o.hop&&stairPassKey(o.hop.e.l)===w.key&&dist(o.x,o.y,o.hop.from.x,o.hop.from.y)<100);
    if(S.t-w.t0<8&&(S.t<w.until||approaching||stairPassBusy(w.key,g)))return true;
    w.phase='home';pathTo(g,w.home.x,w.home.y);
  }
  if(moveAlong(g,SPD.gPatrol*.85,dt)){
    g.path=null;g.pathGoal=null;
    if(w.phase==='out'){w.phase='wait';w.until=S.t+.8;}
    else{g.stairYield=null;g.repath=0;}
  }
  return true;
}
// 잠긴 문 찾기: 프레임마다 한 번 '층:x,y' 표를 만든다 (문이 수백 개인 큰 도시에서 걸음마다 전부 훑지 않게)
let lockedDoorIdx=null;
function lockedDoorAt(fl,tx,ty){
  if(!lockedDoorIdx||lockedDoorIdx.t!==S.t||lockedDoorIdx.S!==S){const m=new Map();for(const d of S.doors)if(d.locked)m.set(flOf(d)+':'+d.tx+','+d.ty,d);lockedDoorIdx={t:S.t,S,m};}
  return lockedDoorIdx.m.get(fl+':'+tx+','+ty)||null;
}
function moveAlong(g, speed, dt) {
  if(g.doorWork){g.moving=false;return false;}
  if(STAGE.signals&&g.civ&&pedWaits(g)){g.moving=false;return false;}  // 빨간불: 횡단보도 앞에서 기다린다
  requestStairSpace(g);
  if(g.path?.length&&!g.z){const next=g.path[0],d=lockedDoorAt(flOf(g),Math.floor(next.x/TILE),Math.floor(next.y/TILE));if(d&&(npcCanOpenDoor(g,d)||npcCanForceDoor(g))&&dist(g.x,g.y,d.x,d.y)<44){g.doorWork={d,t:0,dur:npcCanOpenDoor(g,d)?.36:1.1,forced:!npcCanOpenDoor(g,d)};d.npcWork=g.doorWork;g.a=g.want=Math.atan2(d.y-g.y,d.x-g.x);g.moving=false;play('cloth',.15*proxVol(g));return false;}}
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
  avoidStreetPost(g);
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
  g.projectileMotion={vx:(g.x-startX)/Math.max(dt,.001),vy:(g.y-startY)/Math.max(dt,.001),t:S.t,fl:flOf(g),z:g.z||0};
  return !g.path.length;
}
function updateNpcDoors(dt){
  for(const d of S.doors){const W=d.npcWork;if(!W)continue;const g=S.guards.find(g=>g.doorWork===W);if(!g||['DEAD','CAPTIVE'].includes(g.state)){if(g)g.doorWork=null;d.npcWork=null;continue;}W.t+=dt;if(d.locked&&W.t>=W.dur*.76){setDoor(d,false);play(W.forced?'thud':'metal',.3*proxVol(g));if(W.forced)noise(d.x,d.y,140,'guardDoor',flOf(g),g.z||0);}if(W.t>=W.dur){g.doorWork=null;d.npcWork=null;}}
}
const solidAtG = (tx, ty) => solidAt(tx, ty);
// Planning may include a locked door; opening it belongs to moveAlong at the
// actual threshold, on every floor. A failed path never opens a remote door.
function npcRouteSolid(g) {
  if (g.z) return solidFor(g.z);
  const grid = flOf(g) ? GF[flOf(g)] : G0;
  const doors = new Set(S.doors.filter(d => d.locked && flOf(d) === flOf(g) && (npcCanOpenDoor(g, d) || npcCanForceDoor(g))).map(d => d.ty * MW + d.tx));
  return (x, y) => !inMap(x, y) || !grid || SOLID.has(grid[y][x]) && !doors.has(y * MW + x);
}
function pathTo(g, x, y) {
  const sol = npcRouteSolid(g), sx = Math.floor(g.x / TILE), sy = Math.floor(g.y / TILE), tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  // A remembered sound/contact can fall inside a bin or wall. Keep that
  // observation, but walk to a reachable neighboring cell and actually arrive.
  // astar's automatic fallback otherwise leaves pathGoal inside the obstacle,
  // so a guard already beside it keeps retrying the same empty route forever.
  if(sol(tx,ty)){
    const candidates=[];
    for(let r=1;r<=2;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r||sol(tx+dx,ty+dy))continue;
      candidates.push({tx:tx+dx,ty:ty+dy,x:tc(tx+dx),y:tc(ty+dy),distance:Math.hypot(dx,dy)});
    }
    candidates.sort((a,b)=>a.distance-b.distance||dist(g.x,g.y,a.x,a.y)-dist(g.x,g.y,b.x,b.y));
    for(const at of candidates){
      const path=astar(sx,sy,at.tx,at.ty,sol);
      if(!path.length&&(sx!==at.tx||sy!==at.ty))continue;
      g.path=path;g.pathGoal={x:at.x,y:at.y};g.pathFailedAt=S.t;
      if(!path.length&&dist(g.x,g.y,at.x,at.y)>6)g.path=[{...g.pathGoal}];
      return;
    }
  }
  g.path = astar(sx, sy, tx, ty, sol); g.pathGoal = { x, y }; g.pathFailedAt = S.t;
  if (!g.path.length && sx === tx && sy === ty && dist(g.x, g.y, x, y) > 6 && !sol(tx, ty)) g.path = [{ x, y }];
  if (g.path.length && !sol(tx, ty)) Object.assign(g.path[g.path.length - 1], { x, y });
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
// A witnessed stair entry predicts its known landing, never the unseen player's
// later position. Without this, losing sight on the flight leaves pursuit below.
function observedPlayerSpot(g){
  const P=S.player,T=P.trav;
  const spot=g.seen&&T?.stairs?{x:T.pts.at(-1).x,y:T.pts.at(-1).y,fl:T.stairs.dest.fl,z:T.stairs.dest.z,viaStair:T.stairs.key}:pSpot();
  if(g.seen){const old=g.observedSample;
    if(old&&flOf(old)===flOf(spot)&&(old.z||0)===(spot.z||0)&&S.t-old.t<1.5&&dist(old.x,old.y,spot.x,spot.y)>8){spot.heading=Math.atan2(spot.y-old.y,spot.x-old.x);g.observedHeadingAt=S.t;}
    else if(old&&S.t-(g.observedHeadingAt??-9)<1.5&&Number.isFinite(g.lastSeen?.heading))spot.heading=g.lastSeen.heading;
    if(!old||S.t-old.t>=.15)g.observedSample={...spot,t:S.t};spot.observedAt=S.t;
  }return spot;
}
// Cached connected walking regions distinguish a room from the street below
// the same XY. The old level-only BFS chose a nearby pipe behind an indoor wall
// and never tried the longer, reachable stair chain.
const NPC_NAV = { state: null, modes: new Map() };
function npcRegions(g) {
  if (NPC_NAV.state !== S) { NPC_NAV.state = S; NPC_NAV.modes.clear(); }
  const mode = [npcCanForceDoor(g), g.hasKey || '', g.fac || ''].join(':');
  const doors = S.doors.map(d => d.locked ? 1 : 0).join('');
  let nav = NPC_NAV.modes.get(mode);
  if (nav && nav.levels === S.lvl && nav.doors === doors && S.t >= nav.t && S.t - nav.t < 1) return nav;
  nav = { levels: S.lvl, doors, t: S.t, grids: new Map() }; NPC_NAV.modes.set(mode, nav);
  // Bound capability variants; never retain maps from an earlier mission/save.
  if (NPC_NAV.modes.size > 8) NPC_NAV.modes.delete(NPC_NAV.modes.keys().next().value);
  nav.region = spot => {
    const fl = flOf(spot), z = spot.z || 0, key = z ? 'r' + z : 'f' + fl;
    let labels = nav.grids.get(key);
    if (!labels) {
      labels = new Int32Array(MW * MH).fill(-1); let count = 0;
      const sol = npcRouteSolid({ ...g, fl, z }), queue = new Int32Array(MW * MH);
      for (let cell = 0; cell < labels.length; cell++) {
        const x = cell % MW, y = (cell / MW) | 0; if (labels[cell] >= 0 || sol(x, y)) continue;
        let head = 0, tail = 1; queue[0] = cell; labels[cell] = count;
        while (head < tail) {
          const at = queue[head++], ax = at % MW, ay = (at / MW) | 0;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = ax + dx, ny = ay + dy, ni = ny * MW + nx;
            if (inMap(nx, ny) && labels[ni] < 0 && !sol(nx, ny)) { labels[ni] = count; queue[tail++] = ni; }
          }
        }
        count++;
      }
      nav.grids.set(key, labels);
    }
    const tx = Math.floor(spot.x / TILE), ty = Math.floor(spot.y / TILE);
    return inMap(tx, ty) && labels[ty * MW + tx] >= 0 ? key + ':' + labels[ty * MW + tx] : null;
  };
  return nav;
}
function nextGuardHop(g, target) {
  const nav = npcRegions(g), from = nav.region(g), to = nav.region(target);
  if (!from || !to || from === to) return null;
  const queue = [{ key: from, cost: 0, at: g, first: null }], best = new Map([[from, 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost); const node = queue.shift();
    if (node.cost !== best.get(node.key)) continue;
    if (node.key === to) return node.first;
    for (const e of S.lvl.ends) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) {
      if (nav.region(a) !== node.key) continue;
      const key = nav.region(b); if (!key) continue;
      const cost = node.cost + dist(node.at.x, node.at.y, a.x, a.y) / 140 + (['stair','fstair'].includes(e.l.kind) ? 1 : 6);
      if (cost >= (best.get(key) ?? Infinity)) continue;
      best.set(key, cost); queue.push({ key, cost, at: b, first: node.first || { e, from: a, to: b } });
    }
  }
  return null;
}
// 다음에 탈 사다리 (가장 적게 갈아타는 길의 첫 칸, 같은 연결이면 가까운 것)
function nextHop(g, fromK, toK, target) {
  if (target && g !== S.player) return nextGuardHop(g, target);
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
  const h = nextHop(g, gk, tk, t);
  if (!h) { g.path = []; g.pathGoal = null; return; }
  g.hop = h; pathTo(g, h.from.x, h.from.y);
}
// 사다리 입구에 닿았으면 실제로 올라타(내려가) 움직인다. 올라타면 true
function hopClimb(g, arrived) {
  const h = g.hop; if (!h || g.climb) return !!g.climb;
  const d = dist(g.x, g.y, h.from.x, h.from.y);
  if (d > (['fstair', 'stair'].includes(h.e.l.kind) ? 22 : arrived ? 90 : 22)) { if (arrived) g.hop = null; return false; }
  if (['fstair', 'stair'].includes(h.e.l.kind)) {
    if(stairPassBusy(stairPassKey(h.e.l),g)){g.moving=false;return true;}
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
