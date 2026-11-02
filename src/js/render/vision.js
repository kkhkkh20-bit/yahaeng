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
  const ck = (detail?'hi':'lo')+(S.player.cover ? 1 : 0) + g.state + (g.z || 0) + fov.toFixed(2) + Math.round(rg.lit);
  if (g._cone && S.t - g._cone.t < 0.1 && S.t >= g._cone.t && g._cone.k === ck && Math.hypot(g.x - g._cone.x, g.y - g._cone.y) < 4 && Math.abs(angDiff(g._cone.a, g.a)) < 0.05) return g._cone.cn;
  const N = detail?24:12, STP = detail?12:18, rays = [], crouchK = (S.player.cover && flOf(g) === flOf(S.player) ? COVER_HIDE : 1), el = g.elite ? 1.1 : 1, L0 = CUR_F;
  setLayer(flOf(g));
  for (let i = 0; i <= N; i++) {
    const a = g.a - fov + (2 * fov) * i / N, w = castRay(g.x, g.y, a, rg.lit * el, g.z || 0), ca = Math.cos(a), sa = Math.sin(a), lv = [];
    for (let d = STP / 2; d < w; d += STP) { const L = lightC(g.x + ca * d, g.y + sa * d), eff = (rg.dark + (rg.lit - rg.dark) * L) * el; lv.push(d < 24 || d <= eff * crouchK * (g.state === 'ALERT' ? 1 : L < 0.5 ? 0.55 : 0.8) ? 2 : d <= eff ? 1 : 0); }  // 웅크려도 보이는 안쪽: 어두운 곳 55%, 밝은 곳 80% (canSee와 같게)
    rays.push({ a, ra: a - g.a, w, lv });
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
// ---------------------------------------------------------------- 그리기
