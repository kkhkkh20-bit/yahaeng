// 지도 개편 전 저장도 물건·시체·신분·진행을 버리지 않고 새 통행 구조에 맞춘다.
let CONTRACT_LAYOUT = null;
function captureContractLayout() {
  S.layoutVersion = STAGE.layoutVersion || 0;
  CONTRACT_LAYOUT = !STAGE.layoutVersion ? null : {
    id: STAGE.id, grids: [G0, ...GF.slice(1)].map(g => g && g.map(r => r.slice())),
    data: cloneDeep({ camRoom: S.camRoom, cams: S.cams, keyItems: S.keyItems, notes: S.notes, exits: S.exits, hides: S.hides, ladders: S.ladders, turf: S.turf,
      guards: S.guards.filter(g => ['vipEscort', 'camop', 'contact'].includes(g.tag)) })
  };
}
function restoreContractLayout() {
  const T = CONTRACT_LAYOUT;
  if (!T || T.id !== STAGE.id || (S.layoutVersion || 0) >= STAGE.layoutVersion) return;
  const areas = (STAGE.rebuiltSites || []).map(i => BLD[i]);
  const areaOf = o => o && areas.find(b => o.x >= b.x0 * TILE && o.x < (b.x1 + 1) * TILE && o.y >= b.y0 * TILE && o.y < (b.y1 + 1) * TILE);
  for (const b of areas) for (let f = 0; f < T.grids.length; f++) {
    const dst = f ? GF[f] : G0, src = T.grids[f]; if (!dst || !src) continue;
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) dst[y][x] = src[y][x];
  }
  const fresh = cloneDeep(T.data), discarded = S.hides.filter(areaOf);
  S.hides = S.hides.filter(h => !areaOf(h)).concat(fresh.hides.filter(areaOf));
  for (const h of discarded) {
    const b = areaOf(h), choices = S.hides.filter(n => areaOf(n) === b && n.type === 'box');
    const n = choices.sort((a, b) => dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y))[0];
    if (!n) continue; n.bodies += h.bodies || 0; n.cap = Math.max(n.cap, n.bodies + 1);
    for (const c of S.corpses) if (c.container === h) c.container = n;
    if (S.player.hide === h) { S.player.hide = n; S.player.x = n.x; S.player.y = n.y; S.player.fl = S.player.z = 0; }
  }
  for (const k of ['doors', 'windows', 'fwindows', 'lamps', 'vents']) S[k] = (S[k] || []).filter(o => !areaOf(o));
  const affectedLadder = l => !!areaOf({ x: tc(l.tx), y: tc(l.ty) });
  S.ladders = S.ladders.filter(l => !affectedLadder(l)).concat(fresh.ladders.filter(affectedLadder));
  S.bfuses = (S.bfuses || []).filter(f => !(STAGE.rebuiltSites || []).includes(f.b));
  S.traps = (S.traps || []).filter(t => !areaOf(t.at ? { x: tc(t.at[0]), y: tc(t.at[1]) } : t));
  for (const o of [S.player, ...S.guards, ...S.corpses]) {
    const b = areaOf(o); if (!b) continue;
    o.fl = o.z = 0; o.climb = null; if (o === S.player) o.ledge = o.trav = o.jump = o.cover = null;
    else if (S.guards.includes(o)) { o.homeFl = 0; o.path = null; o.route = [{ x: o.x, y: o.y, pause: 3 }]; o.ri = 0; }
    const x0 = Math.floor(o.x / TILE), y0 = Math.floor(o.y / TILE);
    if (!SOLID.has(G0[y0][x0]) || o.hide || o.stashed) continue;
    let best = null, bd = Infinity;
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (!SOLID.has(G0[y][x])) { const d = dist(o.x, o.y, tc(x), tc(y)); if (d < bd) { best = [tc(x), tc(y)]; bd = d; } }
    if (best) [o.x, o.y] = best;
  }
  for (const g of fresh.guards) if (!S.guards.some(o => o.tag === g.tag)) { g.id = S.guards.length; S.guards.push(g); }
  if (!S.camRoom) S.camRoom = fresh.camRoom;
  for (const c of fresh.cams) if (!S.cams.some(o => o.fl === c.fl && dist(o.x, o.y, c.x, c.y) < 1)) S.cams.push(c);
  for (const n of fresh.notes) if (!S.notes.some(o => o.title === n.title)) S.notes.push(n);
  for (const k of fresh.keyItems) { const old = S.keyItems.find(o => o.key === k.key); if (old && !old.got) Object.assign(old, k); else if (!old) S.keyItems.push(k); }
  S.exits = fresh.exits;
  if (areas.length) {
    S.turf = fresh.turf; S.floorC = {}; S.zEdges = null;
    const wells = S.hides.filter(h => h.type === 'well'); wells.forEach((w, i) => w.next = wells.length > 1 ? wells[(i + 1) % wells.length] : null);
    buildSewers(wells); S_ugC = null;
  }
  S.layoutVersion = STAGE.layoutVersion;
}
