// 공유 수색: 실제 목격·신고 지점만 기억한다. 수색 지점 선정에 플레이어의 현재 위치를 쓰지 않는다.
// 현장, 출입구, 각 층의 방, 옥상, 은신처를 서로 다른 경비에게 예약한다.
function searchBuildingAt(at) {
  const bi = bldAt(Math.floor(at.x / TILE), Math.floor(at.y / TILE));
  if (bi >= 0 && !BLD[bi].vacant) return bi;
  let best = -1, bd = 125;
  for (const d of S.doors) {
    const b = bldAt(d.tx, d.ty), v = dist(at.x, at.y, d.x, d.y);
    if (b >= 0 && !BLD[b].vacant && v < bd) { best = b; bd = v; }
  }
  return best;
}
function searchFloorPoints(bi, f) {
  const B = BLD[bi], grid = f ? GF[f] : G0, visited = new Set(), points = [];
  if (!grid) return points;
  const free = (x, y) => x > B.x0 && x < B.x1 && y > B.y0 && y < B.y1 && !SOLID.has(grid[y][x]);
  const door = (x, y) => S.doors.some(d => (d.fl || 0) === f && d.tx === x && d.ty === y);
  for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) {
    const key = x + ',' + y; if (!free(x, y) || visited.has(key) || door(x, y)) continue;
    const room = [[x, y]]; visited.add(key);
    for (let i = 0; i < room.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = room[i][0] + dx, ny = room[i][1] + dy, k = nx + ',' + ny;
      if (free(nx, ny) && !visited.has(k) && !door(nx, ny)) { visited.add(k); room.push([nx, ny]); }
    }
    // 긴 방도 입구 한 곳에서 끝내지 않고 안쪽까지 걸어 확인한다.
    const chosen = [room[Math.floor(room.length / 2)]];
    while (chosen.length < Math.min(3, Math.ceil(room.length / 14))) {
      const p = room.reduce((a, b) => Math.min(...chosen.map(q => Math.hypot(b[0] - q[0], b[1] - q[1]))) > Math.min(...chosen.map(q => Math.hypot(a[0] - q[0], a[1] - q[1]))) ? b : a);
      if (chosen.includes(p)) break; chosen.push(p);
    }
    for (const p of chosen) points.push({ x: tc(p[0]), y: tc(p[1]), fl: f, z: 0 });
  }
  return points;
}
function searchStandNear(spot) {
  const f = flOf(spot), z = spot.z || 0, L0 = CUR_F; setLayer(f);
  const sol = z ? solidFor(z) : solidAt, x = Math.floor(spot.x / TILE), y = Math.floor(spot.y / TILE);
  const choices = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !sol(x + dx, y + dy));
  setLayer(L0); if (!choices.length) return null;
  const p = choices[0]; return { x: tc(x + p[0]), y: tc(y + p[1]), fl: f, z };
}
function buildingSearchJobs(at, bi) {
  const jobs = [], add = (p, kind, priority, extra) => {
    if (p && !jobs.some(j => (j.kind === kind || (kind !== 'hide' && j.kind !== 'hide')) && flOf(j.at) === flOf(p) && (j.at.z || 0) === (p.z || 0) && dist(j.at.x, j.at.y, p.x, p.y) < 55)) jobs.push(Object.assign({ id: jobs.length, at: p, kind, priority, claim: null, done: false }, extra));
  };
  add(searchStandNear(at), 'scene', 0);
  if (bi >= 0) {
    const B = BLD[bi];
    const doors = S.doors.filter(d => bldAt(d.tx, d.ty) === bi).sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
    if (doors.length) add(searchStandNear(doors[0]), 'entrance', 1);
    for (let f = 0; f < B.h; f++) {
      const pts = searchFloorPoints(bi, f).sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
      pts.forEach((p, i) => add(p, 'room', i === 0 ? 2 + f * .05 : 4 + i * .1));
    }
    for (const e of S.lvl.ends) for (const p of [e.A, e.B]) if (p.z && bldAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === bi) add(searchStandNear(p), 'roof', 3);
  } else {
    for (const [dx, dy] of [[120, 0], [-120, 0], [0, 120], [0, -120]]) add(searchStandNear({ ...at, x: at.x + dx, y: at.y + dy }), 'perimeter', 2);
  }
  (S.hides || []).forEach((h, i) => { if ((bi >= 0 ? bldAt(h.tx, h.ty) === bi : dist(h.x, h.y, at.x, at.y) < 240) && h.type !== 'well') add(searchStandNear(h), 'hide', 3.4, { hideIndex: i }); });
  (S.bushes || []).forEach((h, i) => { if (!at.z && !at.fl && dist(h.x, h.y, at.x, at.y) < 180) add(searchStandNear(h), 'hide', 4.5, { bushIndex: i }); });
  return jobs;
}
function releaseSearchJob(g) {
  const ref = g.searchJob, inc = ref && (S.searchIncidents || []).find(i => i.id === ref.incident);
  const job = inc && inc.jobs[ref.job]; if (job && job.claim === g.id) job.claim = null;
  g.searchJob = null;
}
// 첫 계단 입구까지 실제로 갈 수 있는 사람만 배정한다. 잠긴 문은 접근한 뒤 연다.
function searchLeg(g, at) {
  const fk = lvlKey(gSpot(g)), tk = lvlKey(at), hop = fk === tk ? null : nextHop(g, fk, tk);
  if (fk !== tk && !hop) return null;
  const target = hop ? hop.from : at, f = flOf(g), L0 = CUR_F; setLayer(f);
  const doors = new Set(!f && !g.z ? S.doors.filter(d => d.locked).map(d => d.ty * MW + d.tx) : []);
  const sol = g.z ? solidFor(g.z) : (x, y) => solidAt(x, y) && !doors.has(y * MW + x);
  const path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(target.x / TILE), Math.floor(target.y / TILE), sol);
  setLayer(L0);
  if (!path.length && dist(g.x, g.y, target.x, target.y) > 28) return null;
  if (path.length) Object.assign(path[path.length - 1], { x: target.x, y: target.y });
  return { path, hop };
}
function takeSearchJob(g, inc) {
  if (!inc || inc.until < S.t) return false;
  const from = gSpot(g), fk = lvlKey(from);
  const jobs = inc.jobs.filter(j => !j.done && !j.failed?.includes(g.id) && (j.claim == null || j.claim === g.id) && (lvlKey(j.at) === fk || nextHop(g, fk, lvlKey(j.at))));
  // Sweep nearby rooms and hiding places before sending the same guard down the stairs again.
  // Only incident jobs and the guard's own floor contribute; the hidden player is never queried.
  const cost=j=>j.priority+(lvlKey(j.at)===fk?0:2.5)+dist(g.x,g.y,j.at.x,j.at.y)/650;
  jobs.sort((a,b)=>cost(a)-cost(b));
  let job, leg;
  for (const j of jobs) { const p = searchLeg(g, j.at); if (p) { job = j; leg = p; break; } }
  if (!job) return false;
  releaseSearchJob(g); job.claim = g.id;
  g.searchJob = { incident: inc.id, job: job.id, elapsed: 0, repath: 0, inspect: null };
  endChat(g); g.act = null; g.bubble = null; g.state = 'SEARCH'; g.poi = { ...job.at }; g.searchOrigin = { ...inc.at }; g.why = 'building';
  g.path = leg.path; g.hop = leg.hop; g.reached = false; g.meter = Math.min(g.meter || 0, .5); g.atkT = 0; g.shootT = 0; g.aim = 0; setIcon(g, '?');
  if (!g.searchSaid || S.t - g.searchSaid > 12) { g.searchSaid = S.t; gsay(g, job.kind === 'entrance' ? '출입구는 내가 맡는다.' : job.at.z ? '옥상 확인한다.' : job.at.fl ? `${job.at.fl + 1}층 확인한다.` : '안쪽을 확인한다.', 2.2); }
  return true;
}
function startBuildingSearch(at, fac = 'A', source = 'sighting', seed) {
  if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.y) || STAGE.tutorial || STAGE.city) return false;
  if (!S.lvl) lvlInit();
  const pos = { x: at.x, y: at.y, fl: flOf(at), z: at.z || 0 }, bi = searchBuildingAt(pos);
  S.searchIncidents = (S.searchIncidents || []).filter(i => i.until > S.t);
  let inc = S.searchIncidents.find(i => i.fac === fac && i.b === bi && flOf(i.at) === pos.fl && i.at.z === pos.z && dist(i.at.x, i.at.y, pos.x, pos.y) < 100);
  if (!inc) {
    inc = { id: (S.searchSerial = (S.searchSerial || 0) + 1), at: pos, b: bi, fac, source, until: S.t + 80, jobs: buildingSearchJobs(pos, bi) };
    S.searchIncidents.push(inc); if (S.searchIncidents.length > 4) S.searchIncidents.shift();
  }
  // 같은 현장에서 범인을 실제로 새로 본 경우에만 현장 표식을 목격 정보로 갱신한다.
  if (source !== 'body' && inc.source === 'body') { inc.source = source; inc.at = pos; }
  for (const job of inc.jobs) if (job.claim != null && !S.guards.some(g => g.id === job.claim && g.state === 'SEARCH' && g.searchJob?.incident === inc.id && g.searchJob.job === job.id)) job.claim = null;
  const eligible = g => !g.civ && !g.dog && !g.target && g.tag !== 'camop' && !g.off && !g.yank && !g.doomed && !g.brawl && !g.hunt && !g.incident && !g.climb && !radioBusy(g) && (g.fac || 'A') === fac && g.why !== 'exit' && g.why !== 'blood' && (['PATROL', 'RETURN', 'SUSPICIOUS', 'SEARCH', 'CHECK', 'NOTICE'].includes(g.state) || (g.state === 'ALERT' && !g.seen && g.lostT > 1));
  const cand = S.guards.filter(g => eligible(g) && (g === seed || dist(g.x, g.y, pos.x, pos.y) < 900)).sort((a, b) => (a === seed ? -1 : b === seed ? 1 : dist(a.x, a.y, pos.x, pos.y) - dist(b.x, b.y, pos.x, pos.y)));
  let count = S.guards.filter(g => g.state === 'SEARCH' && g.searchJob?.incident === inc.id).length;
  for (const g of cand) {
    if (count >= 6) break;
    if (g.searchJob?.incident === inc.id) continue;
    if (takeSearchJob(g, inc)) count++;
  }
  return seed ? seed.state === 'SEARCH' && seed.searchJob?.incident === inc.id : count > 0;
}
function updateBuildingSearch(g, dt) {
  const ref = g.searchJob, inc = (S.searchIncidents || []).find(i => i.id === ref.incident), job = inc && inc.jobs[ref.job];
  if (!job || inc.until < S.t) { releaseSearchJob(g); g.state = 'RETURN'; g.path = null; g.icon = null; return; }
  ref.elapsed += dt;
  const finish = status => {
    if (status === 'unreachable') { (job.failed || (job.failed = [])).push(g.id); job.done = job.failed.length >= 3; } else job.done = true;
    job.claim = null;
    const log = S.searchLog || (S.searchLog = []); log.push({ t: S.t, guard: g.id, kind: job.kind, fl: flOf(g), z: g.z || 0, x: g.x, y: g.y, status }); if (log.length > 80) log.shift();
    if (!takeSearchJob(g, inc)) { releaseSearchJob(g); g.state = 'RETURN'; g.path = null; g.icon = null; g.why = null; }
  };
  if (ref.inspect == null) {
    if (ref.door) {
      const d = S.doors[ref.door.index]; g.want = Math.atan2(d.y - g.y, d.x - g.x);
      if ((ref.door.t -= dt) <= 0) { setDoor(d, false); play('thud', .5 * proxVol(g)); noise(d.x, d.y, 140, 'guardDoor', flOf(g)); ref.door = null; }
      return;
    }
    if ((ref.repath -= dt) <= 0 || !g.path) { const leg = searchLeg(g, job.at); g.path = leg ? leg.path : []; g.hop = leg && leg.hop; ref.repath = .8; }
    const next = g.path && g.path[0], doorIndex = !flOf(g) && !g.z && next ? S.doors.findIndex(d => d.locked && d.tx === Math.floor(next.x / TILE) && d.ty === Math.floor(next.y / TILE)) : -1;
    if (doorIndex >= 0 && dist(g.x, g.y, next.x, next.y) < 65) { ref.door = { index: doorIndex, t: 1.1 }; return; }
    const arrived = moveAlong(g, SPD.gSusp * spdMul(), dt);
    if (hopClimb(g, arrived)) return;
    if (lvlKey(gSpot(g)) === lvlKey(job.at) && dist(g.x, g.y, job.at.x, job.at.y) < 28) { ref.inspect = job.kind === 'entrance' ? 5 : 2.4; g.path = null; g.lookT = null; g.waitBase2 = g.a; }
    else if (ref.elapsed > 40 || (ref.elapsed > 3 && !g.path?.length && !g.hop)) finish('unreachable');
    return;
  }
  g.moving = false; lookAround(g, dt, g.waitBase2, 2.2, [.35, .65]);
  if ((ref.inspect -= dt) > 0) return;
  const h = job.hideIndex != null ? S.hides[job.hideIndex] : job.bushIndex != null ? S.bushes[job.bushIndex] : null;
  if (h && flOf(h) === flOf(g) && (h.z || 0) === (g.z || 0) && dist(g.x, g.y, h.x, h.y) < 80) {
    const P = S.player;
    if (flOf(P) === flOf(g) && (P.z || 0) === (g.z || 0) && (P.hide === h || (job.bushIndex != null && P.hidden && dist(P.x, P.y, h.x, h.y) < 44))) { releaseSearchJob(g); dragOut(g, '은신처를 확인하던 경비에게 발각됐다.'); return; }
    if (h.bodies > 0 && !h.found) { h.found = true; S.stats.bodies++; bossRadio('body'); setAlert(2, 35, '숨겨둔 시체가 발견됐다'); }
    if (job.bushIndex != null) for (const c of S.corpses) if (c.hidden && !c.discovered && !c.stashed && flOf(c) === flOf(g) && (c.z || 0) === (g.z || 0) && dist(c.x, c.y, h.x, h.y) < 50) { c.discovered = true; c.hidden = false; S.stats.bodies++; bossRadio('body'); setAlert(2, 35, '화단 속 시체가 발견됐다'); }
  }
  finish('checked');
}
