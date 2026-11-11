// 고정 조명 표본은 켜짐·문 상태가 바뀔 때만 폐기하고, 움직이는 광원만 짧게 갱신한다.
const GLC = { t:-1, m:new Map(), base:new Map(), S:null, sig:null, checked:-1 };
const lightC=(x,y)=>{
  if(GLC.S!==S){GLC.S=S;GLC.base.clear();GLC.m.clear();GLC.sig=null;GLC.checked=-1;GLC.t=-1;}
  if(GLC.checked!==S.t){GLC.checked=S.t;const sig=(S.lamps||[]).map(l=>lampOn(l)?1:0).join('')+'|'+(S.doors||[]).map(d=>d.locked?1:0).join('');
    if(sig!==GLC.sig){GLC.sig=sig;GLC.base.clear();GLC.m.clear();GLC.t=S.t;}
  }
  if(S.t-GLC.t>.12||S.t<GLC.t){GLC.m.clear();GLC.t=S.t;}
  const cx=Math.floor(x/12),cy=Math.floor(y/12),key=CUR_F*1e8+cy*1e4+cx;let value=GLC.m.get(key);
  if(value===undefined){let base=GLC.base.get(key);if(base===undefined){base=ambientLightAt(cx*12+6,cy*12+6,false);GLC.base.set(key,base);}value=dynamicLightAt(cx*12+6,cy*12+6,false,base);GLC.m.set(key,value);}return value;
};
function guardCone(g, fov, rg) {
  const detail=!g.civ||g.eyeWatching||g.wary||g.state==='PANIC';
  const ck = (detail?'hi':'lo')+(S.player.cover ? 1 : 0) + g.state + (g.z || 0) + fov.toFixed(2) + Math.round(rg.lit)+'|'+(S.smokeSerial||0);
  if (g._cone && S.t - g._cone.t < 0.1 && S.t >= g._cone.t && g._cone.k === ck && Math.hypot(g.x - g._cone.x, g.y - g._cone.y) < 4 && Math.abs(angDiff(g._cone.a, g.a)) < 0.05) return g._cone.cn;
  const N = detail?24:12, STP = detail?12:18, rays = [], crouchK = (S.player.cover && flOf(g) === flOf(S.player) ? COVER_HIDE : 1), el = g.elite ? 1.1 : 1, L0 = CUR_F;
  setLayer(flOf(g));
  for (let i = 0; i <= N; i++) {
    const a = g.a - fov + (2 * fov) * i / N, ca = Math.cos(a), sa = Math.sin(a), w = g.z ? roofSightRange(g, g.x + ca * rg.lit * el, g.y + sa * rg.lit * el, g.z, false) : castRay(g.x, g.y, a, rg.lit * el), lv = [];
    const visible=Math.min(w,Math.max(24,smokeRayRange(g,g.x+ca*w,g.y+sa*w,w)));
    for (let d = STP / 2; d < visible; d += STP) { const L = lightC(g.x + ca * d, g.y + sa * d), eff = (rg.dark + (rg.lit - rg.dark) * L) * el; lv.push(d < 24 || d <= eff * crouchK * (g.state === 'ALERT' ? 1 : L < 0.5 ? 0.55 : 0.8) ? 2 : d <= eff ? 1 : 0); }  // 웅크려도 보이는 안쪽: 어두운 곳 55%, 밝은 곳 80% (canSee와 같게)
    rays.push({ a, ra: a - g.a, w:visible, lv });
  }
  setLayer(L0); const cn = { rays, STP }; g._cone = { t: S.t, k: ck, x: g.x, y: g.y, a: g.a, cn }; return cn;
}
function conePaths(g, cn, lo, blend = 0) {
  // 한 겹 원뿔: 광선마다 '이 단계 이상'인 마지막 거리까지 한 길이로 잡고(중간 구멍은 메운다), 이웃 광선과 고르게 해 매끈한 부채꼴로 그린다.
  // 길이는 그 자리 밝기를 따른다 — 불빛 쪽 광선은 길고 어두운 쪽은 짧아, 원뿔이 좌우로 다를 수 있다
  const R = cn.rays, STP = cn.STP, h = R.length > 1 ? (R[1].ra - R[0].ra) / 2 : 0.02;
  const reach=(r,level)=>{let k=-1;for(let i=0;i<r.lv.length;i++)if(r.lv[i]>=level)k=i;return k<0?0:Math.min(r.w,(k+1)*STP);};
  const L = R.map(r => {const outer=reach(r,lo);return blend ? outer+(reach(r,2)-outer)*clamp(blend,0,1) : outer;});
  const M = L.map((v, i) => { const a = L[i - 1] != null ? L[i - 1] : v, b = L[i + 1] != null ? L[i + 1] : v; return Math.min(R[i].w, a * 0.25 + v * 0.5 + b * 0.25); });
  ctx.beginPath(); ctx.moveTo(g.x, g.y);
  const pt = (a, d) => ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d);
  pt(g.a + R[0].ra - h, M[0]); for (let i = 0; i < R.length; i++) pt(g.a + R[i].ra, M[i]); pt(g.a + R[R.length - 1].ra + h, M[R.length - 1]);
  ctx.closePath();
}
// Presentation only: retain the existing sampled shape, lighting and AI rules.
// A nearby neutral outline must remain readable even during permitted passage.
function guardConeInk(g, P, awareness, view = {}) {
  const d = Math.hypot(g.x - P.x, g.y - P.y), proximity = 1 - clamp((d - 100) / 360, 0, 1);
  const inspecting = !!(view.tactical || view.scan || view.selected);
  const quiet = !inspecting && ['quiet', 'check'].includes(awareness.phase) && !awareness.progress;
  const routine = quiet && STAGE.zones && !g.dog && !knownFace(g) && pZoneEff(g) === Z_PUB && !publicSuspicion(g);
  const distantChase = view.chase && d > 380 ? .55 : 1;
  const fill = inspecting ? .20 : routine ? .035 * proximity : quiet ? .035 + .085 * proximity : .15 + .05 * proximity;
  const stroke = inspecting ? .64 : quiet ? .14 + .34 * proximity : .48 + .16 * proximity;
  return {fill:fill*distantChase, stroke:stroke*distantChase,
    width:(quiet ? 1.15 : 1.4) / clamp(view.scale || 1, .65, 1.4)};
}
// One complete field in live play. Selection is only a presentation preference:
// detection, witness tests and permission checks still run for every observer.
let visionFrame = null;
function selectVisionFocus() {
  const P=S.player, same=o=>flOf(o)===flOf(P)&&(o.z||0)===(P.z||0);
  const openB=bldAt(Math.floor(P.x/TILE),Math.floor(P.y/TILE)), exposed=o=>o.z||!coveredG(o,openB);
  const eligible=g=>(same(g)||heightSightEligible(g,P))&&exposed(g)&&!g.climb&&!g.doomed&&!g.ledgeFalling&&!g.containerMoving&&!['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state);
  let danger=null;
  const consider=(actor,camera,progress,identified=false)=>{
    if(progress<=.02)return;
    const score=progress+(identified?2:0)+(visionFrame?.actor===actor ? .06 : 0);
    if(!danger||score>danger.score)danger={actor,camera,score,reason:'danger'};
  };
  for(const g of S.guards)if(eligible(g)){
    const a=guardAwareness(g);if(a.direct)consider(g,false,a.progress,a.phase==='seen');
  }
  for(const c of S.cams||[])if(same(c)&&camOn(c)&&c.meter>.02&&cameraAssessment(c).detectable)consider(c,true,c.meter,c.meter>=1);
  if(danger)return danger;
  if(S.visionCamera&&(S.cams||[]).includes(S.visionCamera)&&same(S.visionCamera)&&exposed(S.visionCamera)&&camOn(S.visionCamera))return {actor:S.visionCamera,camera:true,reason:'selected'};
  if(S.marked&&S.guards.includes(S.marked)&&eligible(S.marked))return {actor:S.marked,camera:false,reason:'selected'};
  let nearest=null;
  const considerNear=(actor,camera)=>{
    const d=dist(actor.x,actor.y,P.x,P.y)-(visionFrame?.actor===actor ? 65 : 0);
    if(d<460&&(!nearest||d<nearest.distance))nearest={actor,camera,distance:d,reason:'nearby'};
  };
  for(const g of S.guards)if(eligible(g)&&(!g.civ||g.wary||g.eyeWatching))considerNear(g,false);
  for(const c of S.cams||[])if(same(c)&&camOn(c)&&exposed(c))considerNear(c,true);
  return nearest;
}
function showVisionField(actor) { return !!(tactical||input.scan||visionFrame?.actor===actor); }
function drawFacingCue(g) {
  if(g.civ||g.dog)return;
  const r=19,k=1/clamp(SCALE,.65,1.4),a=g.a;
  ctx.save();ctx.strokeStyle='#b6c0c9';ctx.lineWidth=1.3*k;
  ctx.beginPath();ctx.arc(g.x,g.y,r,a-.24,a+.24);ctx.stroke();ctx.restore();
}
// ---------------------------------------------------------------- 그리기

// Project lower observers onto the surface the player is standing on. Samples
// use the actual detector, including roof slabs, parapets, stance and light.
const heightSightCache=new WeakMap();
function heightSightEligible(g,P=S.player){
  return !P.jump&&!P.trav&&!P.wire&&!P.ledge&&!flOf(P)&&P.z>0&&flOf(g)===0&&(g.z||0)<P.z&&!g.civ&&!g.dog&&((g.z||0)>0||!roofAt(Math.floor(g.x/TILE),Math.floor(g.y/TILE)));
}
function heightSightField(g,P=S.player){
  if(!heightSightEligible(g,P))return {cells:[],edges:[],step:12};
  lightC(g.x,g.y);
  const key=[g.z||0,P.z,P.mode,!!P.cover,!!P.hidden,g.state,S.alevel,S.smokeSerial||0,GLC.sig].join('|'),old=heightSightCache.get(g);
  if(old&&old.S===S&&old.key===key&&S.t>=old.t&&S.t-old.t<.14&&dist(g.x,g.y,old.x,old.y)<2&&Math.abs(angDiff(g.a,old.a))<.025)return old.field;
  const L0=CUR_F;setLayer(0);const sneak=P.cover?2:P.mode==='sneak',radius=Math.ceil(guardSightRange(g,1,P.hidden,sneak,P.z-(g.z||0))),step=12,cells=[],keys=new Set(),stride=MW*TILE/step,solid=solidFor(P.z);
  const x0=Math.max(0,Math.floor((g.x-radius)/step)),x1=Math.min(stride-1,Math.ceil((g.x+radius)/step)),y0=Math.max(0,Math.floor((g.y-radius)/step)),y1=Math.min(MH*TILE/step-1,Math.ceil((g.y+radius)/step));
  for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){
    const x=(ix+.5)*step,y=(iy+.5)*step,tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
    if(rLv(tx,ty)!==P.z||solid(tx,ty)||!sightLine(g,x,y,P.z,sneak,0))continue;
    const light=lightAt(x,y,true);
    if(canSee(g,x,y,light,P.hidden,sneak,P.z,0)<=0)continue;
    cells.push({x:ix*step,y:iy*step,ix,iy});keys.add(iy*stride+ix);
  }
  const edges=[];
  for(const c of cells){const {x,y,ix,iy}=c;
    if(!keys.has((iy-1)*stride+ix))edges.push([x,y,x+step,y]);
    if(!keys.has((iy+1)*stride+ix))edges.push([x,y+step,x+step,y+step]);
    if(!keys.has(iy*stride+ix-1))edges.push([x,y,x,y+step]);
    if(!keys.has(iy*stride+ix+1))edges.push([x+step,y,x+step,y+step]);
  }
  setLayer(L0);const field={cells,edges,step};heightSightCache.set(g,{S,key,t:S.t,x:g.x,y:g.y,a:g.a,field});return field;
}
function drawHeightVision(P){
  if(flOf(P)||!P.z||window.__skip?.ui)return;
  const candidates=S.guards.filter(g=>heightSightEligible(g,P)&&!g.doomed&&!g.climb&&!['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state)&&dist(P.x,P.y,g.x,g.y)<700);
  let count=0;
  for(const g of candidates){
    if(visionFrame?.actor!==g&&(!input.scan||count>=3))continue;
    const field=heightSightField(g,P);if(!field.cells.length)continue;count++;
    const a=guardAwareness(g),color=a.phase==='seen'?'238,79,62':a.phase==='suspect'?'242,196,107':'176,201,216';
    ctx.save();ctx.fillStyle=`rgba(${color},${a.direct ? .18 : .10})`;ctx.beginPath();for(const c of field.cells)ctx.rect(c.x,c.y,field.step,field.step);ctx.fill();
    ctx.strokeStyle=`rgba(${color},.72)`;ctx.lineWidth=1.25/clamp(SCALE,.65,1.4);ctx.beginPath();for(const e of field.edges){ctx.moveTo(e[0],e[1]);ctx.lineTo(e[2],e[3]);}ctx.stroke();ctx.restore();
    const at=field.cells.reduce((best,c)=>dist(c.x,c.y,P.x,P.y)<dist(best.x,best.y,P.x,P.y)?c:best,field.cells[0]);
    infoTag(at.x+field.step/2,at.y-12,`${g.z?g.z+'층 옥상':'지상'} 경비 → ${P.z}층 옥상`,a.phase==='seen'?'#ff8f78':'#b8cdd9',.9,null,2.1);
  }
}
