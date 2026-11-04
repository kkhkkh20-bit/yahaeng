// Shared physical rules for the current 2D streets. Training rigs and archived
// episodes keep their authored traversal; utility fixtures are not access routes.
const groundedWorld = (st = STAGE) => !!st && !st.artSlice && (/^m[1-9]\d*$/.test(st.id) || st.city);
function physicalAccess(l) {
  if (!groundedWorld()) return true;
  if ((STAGE.retiredClimbs || []).some(([x,y])=>l.tx===x&&l.ty===y)) return false;
  if (l.kind === 'pipe' || l.gas || l.kind === 'balc' || l.kind === 'chimney') return false;
  return l.kind !== 'ladder' || tileAt0(l.ux, l.uy) !== 'U';
}
function applyWorldPolicy() {
  for (const h of S.hides) if (!h.furn) h.cap = 1;
  if (!groundedWorld()) return;
  const retired = (S.utilityClimbs || []).concat(S.ladders.filter(l => !physicalAccess(l)));
  S.utilityClimbs = retired.filter((l, i) => retired.findIndex(o => o.kind === l.kind && o.tx === l.tx && o.ty === l.ty && o.bz === l.bz) === i);
  S.ladders = S.ladders.filter(physicalAccess); S.lvl = null;
  for (const row of G0) for (let x = 0; x < row.length; x++) if (row[x] === 'L') row[x] = ',';
  // Existing stored bodies remain; no additional body can be added.
  S.traps = (S.traps || []).filter(t => !t.auto); S.traps.forEach((t, i) => t.i = i);
  S.player.candy = 0;
  for(const g of S.guards){const d=STAGE._g?.[g.id];if(d){g.smoker=!!d.smoker;g.enforcer=g.enforcer||!!d.enforcer;}}
}
function mainPowerOff(o) {
  if (S.lightsOn) return false;
  if (!groundedWorld() || !STAGE.powerArea) return true;
  const [x0,y0,x1,y1] = STAGE.powerArea, x = o.x / TILE, y = o.y / TILE;
  return x >= x0 && y >= y0 && x < x1 + 1 && y < y1 + 1;
}
const wireUsable = () => !groundedWorld();
// Exterior edits use a fresh layout snapshot when an older checkpoint is loaded.
// Health, inventory, bodies, locks and mission progress are kept.
let PHYSICAL_LAYOUT = null;
function capturePhysicalLayout() {
  PHYSICAL_LAYOUT = { id: STAGE.id, areas: (STAGE.physicalAreas || []).map(([x0,y0,x1,y1]) => ({x0,y0,x1,y1,rows:G0.slice(y0,y1+1).map(r=>r.slice(x0,x1+1))})), alarms: cloneDeep(S.carAlarms || []) };
}
function restorePhysicalLayout() {
  const layout=PHYSICAL_LAYOUT;if(!layout||layout.id!==STAGE.id)return;
  const within=o=>layout.areas.some(a=>o.x>=a.x0*TILE&&o.x<(a.x1+1)*TILE&&o.y>=a.y0*TILE&&o.y<(a.y1+1)*TILE);
  for(const a of layout.areas)for(let y=a.y0;y<=a.y1;y++)for(let x=a.x0;x<=a.x1;x++)G0[y][x]=a.rows[y-a.y0][x-a.x0];
  S.zEdges=null; S.floorC={};
  S.carAlarms=(S.carAlarms||[]).filter(o=>!within(o)).concat(cloneDeep(layout.alarms.filter(within)));
  for(const o of [S.player,...S.guards,...S.corpses]){
    if(!within(o)||flOf(o)||o.stashed||o.carried||o.hide)continue;
    const tx=Math.floor(o.x/TILE),ty=Math.floor(o.y/TILE);
    if(o.z&&rLv(tx,ty)===o.z)continue;
    if(!o.z&&!SOLID.has(G0[ty][tx]))continue;
    let at=null,score=Infinity;
    for(let y=Math.max(0,ty-4);y<Math.min(MH,ty+5);y++)for(let x=Math.max(0,tx-4);x<Math.min(MW,tx+5);x++)if(!SOLID.has(G0[y][x])){const d=dist(o.x,o.y,tc(x),tc(y));if(d<score){at={x:tc(x),y:tc(y)};score=d;}}
    if(at){Object.assign(o,at,{z:0});if(o===S.player)o.trav=o.jump=o.cover=null;else{o.path=null;o.climb=null;}}
  }
}
