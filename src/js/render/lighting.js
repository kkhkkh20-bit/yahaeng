const LIGHTQ = 4, lightCache = {};
function lightMap(key, lamps) {
  const sig = (officeReady()?'o':'') + (tactical ? 't' : '') + lamps.map(l => l.flk ? '' : lampOn(l) ? '1' : '0').join('');
  let lc = lightCache[key];
  if (lc && lc.sig === sig) return lc.c;
  if (!lc) { lc = lightCache[key] = { c: document.createElement('canvas') }; lc.c.width = Math.ceil(MW * TILE / LIGHTQ); lc.c.height = Math.ceil(MH * TILE / LIGHTQ); }
  lc.sig = sig; const x = lc.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, lc.c.width, lc.c.height); x.setTransform(1 / LIGHTQ, 0, 0, 1 / LIGHTQ, 0, 0);
  for (const l of lamps) { if (l.flk || !lampOn(l)) continue; lampLight(x, l, 1); }
  return lc.c;
}
function lampLight(x, l, flick) {  // 벽에 가린 빛(다각형) 안을 둥근 그라데이션으로
  x.save(); x.beginPath(); for (let i = 0; i < l.poly.length; i += 2) i ? x.lineTo(l.poly[i], l.poly[i + 1]) : x.moveTo(l.poly[i], l.poly[i + 1]); x.closePath(); x.clip();
  const gr = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * flick); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(0.55, 'rgba(0,0,0,.76)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); x.restore();
  lightReceivingSurfaces(x,l,flick);
}
// Ground rays stop at the wall. Its near face, and an opaque cabinet's own
// pixels, still receive light. These masks never reveal the floor behind them.
function lightReceivingSurfaces(c,l,flick){
 if(l.outdoor||!officeReady())return;
 const reach=l.r*flick,bi=bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE)),b=BLD[bi];if(!b)return;
 const visible=(x,y)=>dist(l.x,l.y,x,y)<reach&&los(l.x,l.y,x,y);
 const strength=(x,y)=>{const d=dist(l.x,l.y,x,y)/reach;return d<.55?.9-d/.55*.14:Math.max(0,.76*(1-d)/.45);};
 c.save();
 for(let ty=b.y0;ty<=b.y1;ty++)for(let tx=b.x0;tx<=b.x1;tx++){
  if(G[ty]?.[tx]!=='#')continue;
  const x=tx*TILE,y=ty*TILE;
  for(const [nx,ny]of [[-1,0],[1,0],[0,-1],[0,1]]){
   const px=x+TILE/2+nx*(TILE/2+2),py=y+TILE/2+ny*(TILE/2+2);
   if(opaqueAt(tx+nx,ty+ny)||!visible(px,py))continue;
   c.fillStyle=`rgba(0,0,0,${strength(px,py)})`;
   if(ny===1)c.fillRect(x,y+12,TILE,TILE-12);
   else if(ny===-1)c.fillRect(x,y,TILE,12);
   else c.fillRect(nx<0?x:x+TILE-18,y,18,TILE);
  }
 }
 for(const f of FURN){
  if(flOf(f)!==flOf(l)||!FURN_TALL.has(f.t)||bldAt(f.x,f.y)!==bi)continue;
  let amount=0;
  for(const [px,py]of [[f.x*TILE-2,(f.y+f.h/2)*TILE],[(f.x+f.w)*TILE+2,(f.y+f.h/2)*TILE],[(f.x+f.w/2)*TILE,f.y*TILE-2],[(f.x+f.w/2)*TILE,(f.y+f.h)*TILE+2]])if(visible(px,py))amount=Math.max(amount,strength(px,py));
  if(!amount)continue;
  c.globalAlpha=amount;drawFurnArt(c,f);c.globalAlpha=1;
 }
 c.restore();
}
function darkPass(sc, lamps, clip, key) {
  // Lighting is a soft mask: half CSS resolution, independent of Retina DPR.
  const ds = 0.5 / DPR;
  const dw = Math.ceil(canvas.width * ds), dh = Math.ceil(canvas.height * ds);
  if (darkC.width !== dw || darkC.height !== dh) { darkC.width = dw; darkC.height = dh; }
  dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, dw, dh);
  dctx.fillStyle = STAGE.agentStudy&&!clip&&!tactical?'rgba(7,12,24,.77)': INK_STUDY&&STAGE.id==='m2'? (tactical?'rgba(18,18,15,0.5)':'rgba(4,7,10,0.89)') : tactical ? 'rgba(4,8,22,0.5)' : NEONY() ? 'rgba(9,4,22,0.9)' : 'rgba(3,6,11,0.89)'; dctx.fillRect(0, 0, dw, dh);
  dctx.setTransform(sc * ds, 0, 0, sc * ds, (W / 2 * DPR - cam.x * sc) * ds, (H / 2 * DPR - cam.y * sc) * ds);
  // The street has a readable night floor. Interior darkness keeps the normal
  // opacity, including ground-floor rooms rendered without a separate clip.
  if(STAGE.agentStudy&&!clip&&!tactical){
    dctx.fillStyle='rgba(3,6,11,.52)';
    for(const b of BLD)if(!b.vacant)dctx.fillRect(b.x0*TILE,b.y0*TILE,(b.x1-b.x0+1)*TILE,(b.y1-b.y0+1)*TILE);
  }
  dctx.globalCompositeOperation = 'destination-out';
  if (!DBG.dk2) { dctx.imageSmoothingEnabled = true; const lm = lightMap(key || 'g', lamps), [rx, ry, rw, rh] = viewRect(40);  // 화면에 걸친 부분만 옮긴다
    const x0 = Math.max(0, Math.floor(rx / LIGHTQ)), y0 = Math.max(0, Math.floor(ry / LIGHTQ)), x1 = Math.min(lm.width, Math.ceil((rx + rw) / LIGHTQ)), y1 = Math.min(lm.height, Math.ceil((ry + rh) / LIGHTQ));
    if (x1 > x0 && y1 > y0) dctx.drawImage(lm, x0, y0, x1 - x0, y1 - y0, x0 * LIGHTQ, y0 * LIGHTQ, (x1 - x0) * LIGHTQ, (y1 - y0) * LIGHTQ); }
  const flick = 1 + Math.sin(S.t * 13) * 0.012 + Math.sin(S.t * 7.3) * 0.01;
  for (const l of lamps) {  // 깜빡이는 등만 매 프레임
    if (!l.flk || !lampOn(l)) continue;
    if (Math.abs(l.x - cam.x) > W / SCALE / 2 + l.r || Math.abs(l.y - cam.y) > H / SCALE / 2 + l.r) continue;
    lampLight(dctx, l, flick);
  }
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2], clip[3]); ctx.clip(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!DBG.dk1) { ctx.imageSmoothingEnabled = true; ctx.drawImage(darkC, 0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false; }
  worldTransform(ctx, sc);
  if (clip) ctx.restore();
}

// Light reach comes from the shared occluded mask. Tint is subtle room colour,
// never a second circular reflection across dry pavement or a wall.
function drawLampTint(l,target=ctx){
 if(l.outdoor||!lampOn(l)||DBG.glow||!l.poly?.length||!inView(l.x,l.y,l.r))return;
 const color=inkLampColor(l)||l.col||(l.hearth?'255,186,105':'235,218,183');
 target.save();target.globalCompositeOperation='lighter';target.beginPath();
 for(let i=0;i<l.poly.length;i+=2)i?target.lineTo(l.poly[i],l.poly[i+1]):target.moveTo(l.poly[i],l.poly[i+1]);target.closePath();target.clip();
 const g=target.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*.7);
 g.addColorStop(0,`rgba(${color},${l.hearth ? .055 : .035})`);g.addColorStop(1,`rgba(${color},0)`);
 target.fillStyle=g;target.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);target.restore();
}
