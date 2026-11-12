const LIGHTQ = 4, lightCache = {};
let lampFieldCache=new WeakMap();
function lightArtSignature(){return[officeReady(),purchasedPropsReady(),purchasedReady(),freeCityReady(),!!propAtlas.naturalWidth].map(Number).join('');}
function cachedLampField(l){
 const art=lightArtSignature(),old=lampFieldCache.get(l);
 if(old&&old.poly===l.poly&&old.art===art&&old.x===l.x&&old.y===l.y&&old.r===l.r)return old;
 // Only this lamp's local field is rebuilt when a nearby door moves. The
 // whole-floor composite then needs cheap image copies, not every ray/prop.
 const x=Math.floor((l.x-l.r-64)/LIGHTQ)*LIGHTQ,y=Math.floor((l.y-l.r-144)/LIGHTQ)*LIGHTQ,w=Math.ceil((l.r*2+128)/LIGHTQ),h=Math.ceil((l.r*2+208)/LIGHTQ),c=document.createElement('canvas');c.width=w;c.height=h;
 const q=c.getContext('2d');q.setTransform(1/LIGHTQ,0,0,1/LIGHTQ,-x/LIGHTQ,-y/LIGHTQ);lampLight(q,l,1);
 const field={c,poly:l.poly,art,x:l.x,y:l.y,r:l.r,bounds:{x,y,w:w*LIGHTQ,h:h*LIGHTQ}};lampFieldCache.set(l,field);return field;
}
function lightMap(key, lamps) {
  const sig = lightArtSignature() + (tactical ? 't' : '') + lamps.map(l => l.flk ? '' : lampOn(l) ? '1' : '0').join('');
  let lc = lightCache[key];
  if (lc && lc.sig === sig) return lc.c;
  if (!lc) { lc = lightCache[key] = { c: document.createElement('canvas') }; lc.c.width = Math.ceil(MW * TILE / LIGHTQ); lc.c.height = Math.ceil(MH * TILE / LIGHTQ); }
  lc.sig = sig;lc.floor=CUR_F; const x = lc.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, lc.c.width, lc.c.height); x.setTransform(1 / LIGHTQ, 0, 0, 1 / LIGHTQ, 0, 0);
  for (const l of lamps) { if (l.flk || !lampOn(l)) continue; const f=cachedLampField(l),b=f.bounds;x.drawImage(f.c,b.x,b.y,b.w,b.h); }
  if (STAGE.cityLife) lampFieldCache = new WeakMap();  // 큰 도시: 가로등 수백 개의 낱장 빛(약 70MB)은 합친 뒤 버린다. 켜고 꺼질 때만 다시 굽는다
  return lc.c;
}
function lampLight(x, l, flick) {  // 벽에 가린 빛(다각형) 안을 둥근 그라데이션으로
  x.save(); x.beginPath(); for (let i = 0; i < l.poly.length; i += 2) i ? x.lineTo(l.poly[i], l.poly[i + 1]) : x.moveTo(l.poly[i], l.poly[i + 1]); x.closePath(); x.clip();
  const gr = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * flick); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(0.55, 'rgba(0,0,0,.76)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); x.restore();
  lightReceivingSurfaces(x,l,flick);
}
function darkPass(sc,lamps,clip,key,floor=0){
 const previous=CUR_F;try{setLayer(floor);darkPassLayer(sc,lamps,clip,key);}finally{setLayer(previous);}
}
function darkPassLayer(sc, lamps, clip, key) {
  // Lighting is a soft mask: half CSS resolution, independent of Retina DPR.
  const ds = 0.5 / DPR;
  const dw = Math.ceil(canvas.width * ds), dh = Math.ceil(canvas.height * ds);
  if (darkC.width !== dw || darkC.height !== dh) { darkC.width = dw; darkC.height = dh; }
  dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, dw, dh);
  dctx.fillStyle = STAGE.nightShade!=null&&!clip&&!tactical?`rgba(6,10,20,${STAGE.nightShade})`:STAGE.agentStudy&&!clip&&!tactical?'rgba(7,12,24,.77)': INK_STUDY&&STAGE.id==='m2'? (tactical?'rgba(18,18,15,0.5)':'rgba(4,7,10,0.89)') : tactical ? 'rgba(4,8,22,0.5)' : NEONY() ? 'rgba(9,4,22,0.9)' : 'rgba(3,6,11,0.89)'; dctx.fillRect(0, 0, dw, dh);
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
  drawDynamicLightFields(dctx,CUR_F);
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
