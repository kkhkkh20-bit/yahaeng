// Workplaces have ceiling fixtures throughout their usable rooms, rather than
// one randomly generated pool of light. Exterior night and sleeping homes stay dark.
function syncWorkLights() {
  if (!groundedWorld()) return;
  const L0 = CUR_F;
  PLANS.forEach((floors, bi) => {
    const b = BLD[bi];
    if (b.vacant || (b.kind !== 'shop' && !(STAGE.workBuildings || []).includes(bi))) return;
    (floors || []).forEach((p, fl) => {
      if (!p) return;
      setLayer(fl);
      const local = S.lamps.filter(l => !l.outdoor && !l.hearth && flOf(l) === fl && bldAt(Math.floor(l.x / TILE), Math.floor(l.y / TILE)) === bi);
      const candidates = [];
      for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) {
        if (SOLID.has(G[y][x])) continue;
        // The dance floor keeps its coloured lighting; VIP rooms and offices do not.
        const r = p.store;
        if (r && ['club', 'vip'].includes(r.use) && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) continue;
        candidates.push({x:tc(x), y:tc(y)});
      }
      // Grid centres first, then fill any remaining occluded corners/partitions.
      candidates.sort((a,c) => ((Math.floor(c.x/TILE)%3===1&&Math.floor(c.y/TILE)%3===1)?1:0)-((Math.floor(a.x/TILE)%3===1&&Math.floor(a.y/TILE)%3===1)?1:0));
      for (const at of candidates) {
        if (local.some(l => dist(l.x,l.y,at.x,at.y) <= l.r * .66 && los(l.x,l.y,at.x,at.y))) continue;
        let control = at, nearest = Infinity;
        for (const c of candidates) {
          const x = Math.floor(c.x/TILE), y = Math.floor(c.y/TILE), d = dist(c.x,c.y,at.x,at.y);
          if (d >= nearest || d > 190 || !los(at.x,at.y,c.x,c.y)) continue;
          const wall = [[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy]) => G[y+dy]?.[x+dx] === '#');
          if (wall) { nearest=d; control={x:c.x+wall[0]*15,y:c.y+wall[1]*15}; }
        }
        const lamp = {x:at.x,y:at.y,r:240,fl,outdoor:false,broken:false,off:false,workLight:true,col:'236,221,189',control:{...control,fl,z:0},poly:[]};
        const fuse = (S.bfuses || []).find(f => f.b === bi && f.cut);
        if (fuse) { lamp.cut=bi; lamp.cutWas=false; lamp.off=true; }
        for (let i=0;i<180;i++) { const a=i/180*TAU,d=Math.min(lamp.r,castRay(lamp.x,lamp.y,a,lamp.r)+20);lamp.poly.push(lamp.x+Math.cos(a)*d,lamp.y+Math.sin(a)*d); }
        local.push(lamp); S.lamps.push(lamp);
      }
    });
  });
  setLayer(L0); LG=null; refreshBodyLighting();
  for (const k in lightCache) delete lightCache[k];
  S.floorC={};
}
