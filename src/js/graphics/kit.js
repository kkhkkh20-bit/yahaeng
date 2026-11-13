// ---------------------------------------------------------------- 그래픽
const atlas = new Image();
const F = A.frames;
const spr = {};
// 픽셀 아트 그리기 도우미 (16px 원본을 3배로)
function blit(c, name, dx, dy, dw, dh, sx = 0, sy = 0, sw, sh) { const f = F[name]; if (!f) return; c.drawImage(atlas, f[0] + sx, f[1] + sy, sw || f[2], sh || f[3], dx, dy, dw, dh); }
const dirOf = a => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) ? (c > 0 ? 3 : 2) : (s > 0 ? 0 : 1); };
const charOf = g => {
  if(g.stripped)return g.strippedLook||'strip';
  const profile = g.target && STAGE.targetCast?.[g.tag];
  if(profile)return profile.key;
  const base = charBase(g);
  // An explicit civilian shape wins; role-specific outfits keep their own
  // workwear silhouette (for example the courier's helmet).
  const female = g.body && ['fBob', 'fLong', 'fTail','jacket','femaleCoat','femaleBlazer'].includes(g.body);
  const job = PR && PR.style === 'modular' && g.outfit && PR.looks[g.outfit];
  const body = job ? female ? (g.outfit === 'waiter' ? 'femaleSuit' : 'femaleWorker') : job : g.body;
  return base + (body && PR && PR.bodies && PR.bodies[body] ? '@' + body : '');
};
const charBase = g => g.outfit && OUTFIT_PAL[g.outfit] ? g.outfit : g.doc ? 'doc' : g.dog ? 'dog' : g.civ ? 'civ' + (window.__PR ? ((g.look || 0) + g.id * 3) % (STAGE.cityLife ? 20 : 10) : (g.look || 0)) : g.dog ? 'dog' : g.lookout ? 'hunter' : g.target ? (g.id % 2 ? 'old' : 'noble') : g.kind === 'g3' ? 'samR' : g.kind === 'g2' ? 'samB' : 'sam';
// ---- 프리렌더 배경 (Kenney Retro Urban Kit, CC0): 건물 외관 · 바닥 · 나무를 같은 3/4 투영으로 미리 찍은 그림
const KIT_PROP = {};  // 키트 거리 소품 (쓰레기통 등)
if (window.__KIT && window.__KIT.props) for (const k in window.__KIT.props) { const e = window.__KIT.props[k]; KIT_PROP[k] = { img: Object.assign(new Image(), { src: e.src }), ox: e.ox, oy: e.oy }; }
const KIT = window.__KIT || null, kitG = {}, kitT = [], kitB = {};
// 화단(숨는 곳)은 짙은 초록 생울타리 + 작은 흰 꽃 — 주황 단풍 나무(못 숨는 곳)와 한눈에 갈리게 다시 칠한다
let kitBush = null;
if (KIT && KIT.bush) { const im = new Image(); im.onload = () => { try {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'hue'; x.fillStyle = '#2f8a46'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'saturation'; x.fillStyle = '#3a9a50'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 9; i++) { const h = (i * 2654435761) >>> 0; x.fillStyle = i % 3 ? 'rgba(240,236,220,.85)' : 'rgba(255,214,120,.8)'; x.fillRect(4 + h % (c.width - 8), c.height * 0.25 + (h >> 8) % Math.max(1, Math.floor(c.height * 0.5)), 2, 2); }
  c.complete = true; c.naturalWidth = c.width; kitBush = c; } catch (e) { kitBush = im; } }; im.src = KIT.bush; }
if (KIT) {
  for (const [k, src] of Object.entries(KIT.ground || {})) { const im = new Image(); im.src = src; kitG[k] = im; }
  (KIT.trees || []).forEach(src => { const im = new Image(); im.src = src; kitT.push(im); });
}
const kitOk = im => im && im.complete && im.naturalWidth > 0;
const kitTex = {}, kitFurn = {};
if (KIT) {
  for (const [k, src] of Object.entries(KIT.tex || {})) kitTex[k] = Object.assign(new Image(), { src });
  const sharedKinds=new Set(Object.values(window.__PROP_ART__?.frames||{}).map(a=>a.kind));
  for (const [k, v] of Object.entries(KIT.furn || {})) if(!sharedKinds.has(k.split('_')[0]))kitFurn[k] = { img: Object.assign(new Image(), { src: v.src }), ox: v.ox, oy: v.oy };
}
// 실내 바닥 재질 (64px 텍스처를 한 칸으로): 나무 마루 · 짙은 마루(가로결) · 타일 · 콘크리트
const kitFloorC = {};
function kitFloor(k) {
  if (kitFloorC[k]) return kitFloorC[k];
  const src = kitTex[k === 'planks2' ? 'planks' : k]; if (!kitOk(src)) return null;
  const c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (k === 'planks2') { x.translate(TILE, 0); x.rotate(Math.PI / 2); }
  x.drawImage(src, 0, 0, TILE, TILE); x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = k === 'planks2' ? 'rgba(30,18,10,.35)' : k === 'tiles' ? 'rgba(220,230,240,.08)' : 'rgba(0,0,0,.08)'; x.fillRect(0, 0, TILE, TILE);
  return (kitFloorC[k] = c);
}
// 판이 시작될 때: 구운 건물 그림을 이 판 건물에 붙인다 (지도 모양이 바뀌었으면 붙이지 않고 기존 그림을 쓴다)
function kitAttach() {
  ROB = null; BLD.forEach(b => { b.kitProps = null; });
  const kid = STAGE.kitId || STAGE.id;  // 같은 지도를 쓰는 판은 구운 그림을 나눠 쓴다
  const entries=KIT?.bld?.[kid]||[];
  const cache = kitB[STAGE.id] || (kitB[STAGE.id] = {});
  for (const e of entries) {
    const b = BLD[e.i]; if (!b || [b.x0, b.y0, b.x1, b.y1, b.h].join() !== e.key.join()) continue;
    let k = cache[e.i];
    if (!k) { k = cache[e.i] = { img: new Image(), ox: e.ox, oy: e.oy, w: e.w, h: e.h, c: null, gl: e.gl || [], g: null }; k.img.src = e.src; }
    b.kit = k; b.kitProps = e.props || null;
  }
  // New/revised layouts can have no legacy baked kit. Roof stair gameplay
  // still needs a visible, solid stair house and a door on the same landing.
  BLD.forEach((b,i)=>{if(freeCityBuilding(b)&&!b.kitProps)b.kitProps=roofProps(b,i).filter(p=>studyStage()?['sh','tank','ac','vent','plant'].includes(p.t):p.t==='sh').map(p=>studyStage()&&p.t==='sh'?{...p,cells:[[p.sx,p.sy]]}:p);b.cityPropsC=null;});
  robBuild();
}
// 옥상 부분만 밤빛으로 한 번 어둡게 칠한 사본 (정면 벽은 매 프레임 조명에 따라 칠한다)
function kitCanvas(b) {
  const k = b.kit; if (k.c) return k.c; if (!kitOk(k.img)) return null;
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d'); x.drawImage(k.img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = NEONY() ? 'rgba(26,8,56,.42)' : 'rgba(4,8,22,.46)';
  x.fillRect(0, 0, k.w, (b.y1 - b.fh + 1) * TILE - k.oy);
  // 옥상 발광체(간판·옥탑방 창·채광창)는 어둡게 칠한 뒤 다시 밝힌다. 간판에는 글자를 쓴다
  x.globalCompositeOperation = 'source-over';
  k.gl.forEach(([gx, gy, gw, gh, col, t], i) => {
    if (t === 's') {
      x.fillStyle = col; x.fillRect(gx, gy, gw, gh);
      const words = ['노래방', 'PC방', '호프', '당구장', '24시', '모텔', '사우나', '찜질방', '치킨', '소주방'], wd = words[(b.x0 * 7 + b.y0 * 13 + i) % words.length];
      x.font = uiFont(Math.round(gh * 0.72)); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 3; x.strokeStyle = 'rgba(20,6,30,.85)'; x.strokeText(wd, gx + gw / 2, gy + gh / 2 + 1); x.fillStyle = '#fff6fb'; x.fillText(wd, gx + gw / 2, gy + gh / 2 + 1);
    } else { x.fillStyle = t === 'w' ? '#ffd8a0' : 'rgba(255,214,150,.3)'; x.fillRect(gx, gy, gw, gh); }  // 채광창은 바닥에 깔린 유리라 은은하게
  });
  return (k.c = c);
}
// 옥상 발광체 둘레의 번짐(한 번만 그려 두고 매 프레임 더하기 합성)
function kitGlow(k) {
  if (k.g !== null) return k.g; if (!k.gl.length) return (k.g = false);
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d');
  k.gl.forEach(([gx, gy, gw, gh, col, t]) => {
    const cx = gx + gw / 2, cy = gy + gh / 2, r = t === 's' ? Math.max(gw, gh) * 0.75 : 26, g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    const rgb = t === 's' ? col : t === 'w' ? '#ffb060' : '#ffc070', al = t === 's' ? 0.55 : t === 'w' ? 0.4 : 0.12;
    g.addColorStop(0, rgb + Math.round(al * 255).toString(16).padStart(2, '0')); g.addColorStop(1, rgb + '00');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
  return (k.g = c);
}
function drawKitBuilding(b) {
  const c = kitCanvas(b); if (!c) return false;
  const k = b.kit; ctx.drawImage(c, k.ox, k.oy);
  const gw = kitGlow(k);
  if (gw) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 + 0.2 * Math.sin(S.t * 2.3 + b.x0); ctx.drawImage(gw, k.ox, k.oy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  for (let r = 0; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE, g = r ? GF[r] : G0;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE, l = b.fl[tx - b.x0];
      ctx.fillStyle = `rgba(4,8,22,${(r ? 0.66 : 0.6) * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      const win = g && g[b.y1] ? g[b.y1][tx] === 'N' : (tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1);
      if(S._windowT!==S.t){S._windowT=S.t;S._windowFrames=new Map([...(S.windows||[]),...(S.fwindows||[])].map(w=>[(w.fl||0)+','+w.tx+','+w.ty,w]));}
      const pane=S._windowFrames?.get(r+','+tx+','+b.y1);
      if(pane){ctx.save();ctx.translate(x+24,yy+24);paintWindow(pane,l>.45,28,26);ctx.restore();}
      if (win && !pane && b.kind !== 'shop') { const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0; if (h % 5 === 0) { const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.4 * fl})`; ctx.fillRect(x + 12, yy + 13, 24, 21); ctx.globalCompositeOperation = 'source-over'; } }
    }
  }
  if (b.kind === 'shop') drawShopSigns(b);
  for(const d of S.doors)if(d.ty===b.y1&&d.tx>=b.x0&&d.tx<=b.x1&&(S.player.interact?.a.d===d||!d.locked))drawFacadeDoorWork(d);
  return true;
}
// 내 둘레 가구의 막힌 칸: 어두운 방에서도 어디로 지나갈 수 있는지 보이게 (가까울수록 진하게)
// 가까운 자경대원을 덮칠 수 없을 때 그 이유 (행동 버튼이 아무것도 안 할 때 자경대원 위에 작게 보인다)
