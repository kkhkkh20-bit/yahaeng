const PR = window.__PR || null;
// 신분 옷 색 (피부 · 머리 · 윗옷 · 바지 · 신발): 옷마다 확실히 다른 색 (히트맨 GO식 — 2D에서 한눈에 구분)
const OUTFIT_PAL = { staff: ['#e6b690', '#2a2a2a', '#3f9a5e', '#2f3440', '#1c1c1c'], courier: ['#d9a47e', '#1e1e1e', '#d2862a', '#3a3a3a', '#222222'], waiter: ['#efc49e', '#151515', '#f2f0ea', '#141414', '#0e0e0e'], cater: ['#e8b892', '#1e1e1e', '#c8463c', '#18181c', '#101010'] };
const PR_PAL = {
  ninja: INK_STUDY?['#e6b38a','#141414','#363731','#31352e','#161a1e']:['#e6b38a', '#141414', '#313b46', '#34404e', '#161a1e'], sam: ['#ddaa80', '#3a2a1c', '#56603c', '#3e3a2c', '#2a241c'], samB: ['#c79470', '#1d1d1d', '#2a3654', '#1d1f26', '#141416'],
  samR: ['#e4b28a', '#0f0f0f', '#121317', '#121317', '#0c0c0c'], hunter: ['#d4a078', '#2b1d12', '#3d4a2e', '#5a4630', '#3a2a1a'], noble: ['#efc49e', '#2b2b2b', '#343b46', '#252b33', '#17191d'],
  old: ['#e6bd9a', '#c4c4c4', '#6a2a2a', '#2e2e36', '#3a2e24'], doc: ['#edc6a2', '#4a3a2a', '#f0f0ea', '#8a7f6a', '#4a3a2a'], civ0: ['#efbf98', '#6a4020', '#b84a3a', '#3a4a6a', '#d8d8d4'],
  civ1: ['#c48961', '#1a1a1a', '#d6ae48', '#5a5040', '#3a2a1a'], civ2: ['#e6b68e', '#2a2a2a', '#3a8a8a', '#6a6a72', '#c8c8c0'], civ3: ['#f2caa6', '#7a2a2a', '#d27a9e', '#20222a', '#202020'],
  civ4: ['#e8b890', '#3a2a20', '#2f5a8a', '#2a2a2e', '#e0e0dc'], civ5: ['#d9a47e', '#121212', '#ececec', '#3c4c6c', '#2a2a2a'], civ6: ['#f0c8a4', '#8a5a2a', '#7a3a8a', '#2a2a30', '#1a1a1a'],
  civ7: ['#c99068', '#1a1a1a', '#2a2a2a', '#2a2a2a', '#d0d0c8'], strip: ['#ddaa80', '#2a2a2a', '#d8d4c8', '#4a4a52', '#2a2a2a'], civ8: ['#eabd96', '#5a3a1a', '#c8b48a', '#5a4a3a', '#3a2a1a'], civ9: ['#e2b088', '#202020', '#4a7a4a', '#c8c0b0', '#2a2a2a'],
  ...OUTFIT_PAL,
  ...Object.fromEntries(Object.values(TARGET_CAST).map(p=>[p.key.split('@')[0],p.palette])),
};
// Rank changes the model and behaviour, not the faction's uniform. Keep the
// legacy keys: corpses, old saves and the player's stolen clothes use them too.
for (const key of ['samB','samR','hunter']) PR_PAL[key] = [...PR_PAL[key].slice(0,2), ...PR_PAL.sam.slice(2)];
const prImg = PR ? new Image() : null, prVar = {};
// 시트는 한 장이 가로 9536px(149칸)이라 옷마다 통째로 칠해 두면 한 장에 20MB, 판 하나에 수백 MB가 된다 (휴대폰이 버벅이고 해상도가 떨어지던 원인).
// 16칸(1024px)짜리 조각으로 나눠, 실제로 그리는 동작이 든 조각만 칠한다. 조각은 휴대폰 그래픽 칩이 다루기 쉬운 크기이기도 하다
const PR_CH = 16;
let prBase = null;  // { img, w, h, parts: [조각별 분류 캐시] }
if (PR) { prImg.onload = () => { prBase = { img: prImg, w: prImg.width, h: prImg.height, parts: [] }; }; prImg.src = PR.src; }
// 주민 체형 변형 시트 (치마·긴 머리·코트·가방·헬멧·덩치·노인): 'civ3@fLong' = 팔레트 civ3 + 체형 fLong
const spriteSources = createSpriteSources(PR?.bodies);
const prBodies = spriteSources.loaded, prBodyLoads = spriteSources.pending;
const prLoadBody = bn => spriteSources.load(bn);
// The heroine is needed for the first lesson. NPC sources belong to the active
// mission; rare disguise and paired-motion sources load when actually requested.
if (PR) { prLoadBody('hero'); prLoadBody('heroMotion'); }
// 조각 하나의 색 분류 (피부·머리·윗옷·바지·신발): 처음 쓸 때 한 번만. 원본 색은 붙잡아 두지 않고 칠할 때마다 그림에서 다시 읽는다 (메모리)
let prScr = null;
function prRead(base, ci) {
  const fr = PR.fr, x0 = ci * PR_CH * fr, w = Math.min(PR_CH * fr, base.w - x0), h = base.h; if (w <= 0) return null;
  if (!prScr) { prScr = document.createElement('canvas'); prScr.width = PR_CH * fr; prScr.height = h; }
  if (prScr.height < h) prScr.height = h;
  const x = prScr.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, prScr.width, prScr.height); x.drawImage(base.img, x0, 0, w, h, 0, 0, w, h);
  return { w, h, d: x.getImageData(0, 0, w, h).data };
}
function prPrepPart(base, ci) {
  if (base.parts[ci]) return base.parts[ci];
  const rd = prRead(base, ci); if (!rd) return null; const { w, h, d } = rd;
  const n = w * h, cls = new Uint8Array(n), wgt = new Uint8Array(n), shd = new Uint8Array(n);
  const K = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];  // 피부·머리·윗옷·바지·신발
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; if (!d[i * 4 + 3]) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn; if (ch < 20 || !mx) continue;
    const nr = r / mx, ng = g / mx, nb = b / mx; let best = 0, bd = 9;
    for (let k = 0; k < 5; k++) { const q = (nr - K[k][0]) ** 2 + (ng - K[k][1]) ** 2 + (nb - K[k][2]) ** 2; if (q < bd) { bd = q; best = k; } }
    cls[i] = best; wgt[i] = Math.max(1, Math.round(Math.min(1, (ch - 20) / 60) * 255)); shd[i] = Math.round(Math.min(1.35, mx / 255 * 1.25) * 180);
  }
  return (base.parts[ci] = { w, h, cls, wgt, shd });
}
// 한 장 통째 분류 (대화창 얼굴 시트처럼 작은 그림용)
function prPrep(img) {
  const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, w, h).data;
  // Sprite atlases are mostly transparent. Keep palette work only for occupied
  // pixels instead of three full-size lookup arrays per outfit/body sheet.
  const occupied = []; for (let i = 0; i < w * h; i++) if (d[i * 4 + 3]) occupied.push(i);
  const pixels = Uint32Array.from(occupied), n = pixels.length, src = new Uint8ClampedArray(n * 4);
  const cls = new Uint8Array(n), wgt = new Float32Array(n), shd = new Float32Array(n);
  const K = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];
  for (let i = 0; i < n; i++) {
    const j = pixels[i] * 4, k = i * 4; src.set(d.subarray(j, j + 4), k);
    const r = d[j], g = d[j + 1], b = d[j + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
    if (ch < 20 || !mx) continue;
    const nr = r / mx, ng = g / mx, nb = b / mx; let best = 0, bd = 9;
    for (let k = 0; k < 5; k++) { const q = (nr - K[k][0]) ** 2 + (ng - K[k][1]) ** 2 + (nb - K[k][2]) ** 2; if (q < bd) { bd = q; best = k; } }
    cls[i] = best; wgt[i] = Math.min(1, (ch - 20) / 60); shd[i] = Math.min(1.35, mx / 255 * 1.25);
  }
  return { w, h, src, pixels, cls, wgt, shd };
}
function prPaint(base, pal) {
  const { w, h, src, pixels, cls, wgt, shd } = base, P4 = pal.map(h => hexRgb(h).split(',').map(Number));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const id = x.createImageData(w, h), out = id.data;
  for (let i = 0; i < pixels.length; i++) {
    const j = pixels[i] * 4, k = i * 4, wt = wgt[i], p = P4[cls[i]], s = shd[i];
    for (let ch = 0; ch < 3; ch++) out[j + ch] = wt ? p[ch] * s * wt + src[k + ch] * (1 - wt) : src[k + ch];
    out[j + 3] = src[k + 3];
  }
  x.putImageData(id, 0, 0); return c;
}
const prSplit = key => { const i = key.indexOf('@'); return i < 0 ? [key, (PR && PR.looks && PR.looks[key]) || null] : [key.slice(0, i), key.slice(i + 1)]; };
// Keep the heroine's head and body when wearing a guard's or worker's clothes.
// NPC palette keys remain unchanged, so old saves and disguise permissions work.
function playerKey(P) {
  const pal = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja';
  if (!(PR && PR.style === 'modular')) return pal;
  const body = pal !== 'ninja' && PR.playerLooks[P.outfit] || 'hero';
  if(!prBodies[body])prLoadBody(body);
  if(!prBodies[body+'Motion']&&PR.bodies?.[body+'Motion'])prLoadBody(body+'Motion');
  const gait=PR.fluidBodies?.[body]?.gait;if(gait&&!prBodies[gait])prLoadBody(gait);
  return pal === 'ninja' ? pal : pal + '@' + (prBodies[body]?body:'hero');
}
function prPalette(pk, body) {
  const pal = PR_PAL[pk];
  return pal && PR && PR.style === 'modular' && body && body.startsWith('hero') ?
    [PR_PAL.ninja[0], PR_PAL.ninja[1], ...pal.slice(2)] : pal;
}

// 시트 = 조각 묶음(칠하지 않은 채 만들어 둔다). 실제 칠하기는 prPart 가 조각 단위로
function prSheet(key) {
  if (prVar[key]) return prVar[key]; const [pk, bn] = prSplit(key), base = bn ? prBodies[bn] : prBase;
  if (!base) { if (bn) prLoadBody(bn); return null; } const pal = prPalette(pk, bn); if (!pal) return null;
  const sh = prVar[key] = { key, base, P4: pal.map(h => hexRgb(h).split(',').map(Number)), parts: [] };
  if (key === 'ninja' || (PR.style === 'modular' && bn && bn.startsWith('hero'))) prVar[key + '_ol'] = { key: key + '_ol', of: sh, parts: [] };  // 숨었을 때 쓰는 밝은 외곽선 실루엣 (주인공만)
  return sh;
}
function prPart(sh, ci) {
  if (sh.parts[ci]) return sh.parts[ci];
  if (sh.of) {  // 외곽선: 칠한 주인공 조각을 사방으로 겹쳐 찍고 안쪽을 지운다
    const src = prPart(sh.of, ci); if (!src) return null;
    const s = document.createElement('canvas'); s.width = src.width; s.height = src.height; const sx = s.getContext('2d');
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) sx.drawImage(src, dx, dy);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#f2fbff'; sx.fillRect(0, 0, s.width, s.height);
    sx.globalCompositeOperation = 'destination-out'; sx.drawImage(src, 0, 0);
    return (sh.parts[ci] = s);
  }
  const bp = prPrepPart(sh.base, ci); if (!bp) return null;
  const { w, h, cls, wgt, shd } = bp, P4 = sh.P4, src = prRead(sh.base, ci).d;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const id = x.createImageData(w, h), o = id.data; o.set(src);
  for (let i = 0, n = w * h; i < n; i++) {
    const w8 = wgt[i]; if (!w8) continue; const wt = w8 / 255, p = P4[cls[i]], s = shd[i] / 180 * wt, j = i * 4, r = 1 - wt;
    o[j] = p[0] * s + src[j] * r; o[j + 1] = p[1] * s + src[j + 1] * r; o[j + 2] = p[2] * s + src[j + 2] * r;
  }
  x.putImageData(id, 0, 0);
  return (sh.parts[ci] = c);
}
// 시트의 한 칸(col, row)을 그린다
function prBlit(sh, col, row, dx, dy, dw, dh) {
  const ci = Math.floor(col / PR_CH), c = prPart(sh, ci); if (!c) return false;
  const fr = PR.fr; ctx.drawImage(c, (col - ci * PR_CH) * fr, row * fr, fr, fr, dx, dy, dw, dh); return true;
}
// 미리 칠하기: 칠하기는 조각 하나에 수 ms라 판 시작 직후 첫 프레임들이 끊겼다.
// 쉬는 틈에 서기·걷기·대화부터 준비한다. 달리기·쓰러짐·처치·운반은 가까운 인물부터 준비한다.
const PR_WARM1 = ['idle', 'walk', 'idleC', 'talk'], PR_WARM2 = ['run', 'death', 'crouch', 'carried', 'carriedI', 'held', 'heldI', 'stabbed', 'choked', 'lifted'];
function prWarmParts(key, names) {
  const bn = prSplit(key)[1], bm = bn && PR.bodies && PR.bodies[bn], out = new Set();
  if(bn?.endsWith('Motion')&&!bm.fluid){for(let ci=0;ci*PR_CH<bm.cols;ci++)out.add(ci);return [...out];}
  if (key === 'ninja'&&!PR.fluidBodies) { for (let ci = 0; ci * PR_CH < PR.cols; ci++) out.add(ci); return [...out]; }  // 주인공은 모든 동작을 쓴다
  for (const a of names) { const r = (bm && bm.anims[a]) || (!bm && PR.anims[a]); if (!r) continue; for (let c = r[0]; c < r[0] + r[1]; c++) out.add(Math.floor(c / PR_CH)); }
  return [...out];
}
const prWarmQ = [];
function prWarm(keys, first) {
  const add = (k, ci, front) => { const id = k + '#' + ci; const i = prWarmQ.indexOf(id); if (i >= 0) prWarmQ.splice(i, 1); if (front) prWarmQ.unshift(id); else prWarmQ.push(id); };
  const ks = keys.filter(k => k && PR_PAL[prSplit(k)[0]]);
  const l1 = [], l2 = [];
  for (const k of ks) { for (const ci of prWarmParts(k, PR_WARM1)) l1.push([k, ci]); if (k !== 'ninja' && (first === 2)) for (const ci of prWarmParts(k, PR_WARM2)) l2.push([k, ci]); }
  if (first) { for (const [k, ci] of l2.reverse()) add(k, ci, true); for (const [k, ci] of l1.reverse()) add(k, ci, true); }
  else { for (const [k, ci] of l1) add(k, ci); for (const [k, ci] of l2) add(k, ci); }
  if (prWarm.on || !prWarmQ.length) return; prWarm.on = true;
  const ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
  const step = deadline => {
    if(!prWarmQ.length){prWarm.on=false;return;}
    const active=running&&!paused&&!DLG.modal,cost=prWarm.cost||3;
    // timeout은 한가하다는 뜻이 아니다. 플레이 프레임이 밀리면 준비 작업을 양보한다.
    if(active&&(deadline?.didTimeout||(deadline?.timeRemaining?.()??8)<cost+1||(prWarm.frameGap||0)>1/FPS_CAP*1.25)){
      prWarm.deferred=(prWarm.deferred||0)+1;setTimeout(()=>ric(step,{timeout:1500}),120);return;
    }
    const started=performance.now(),id = prWarmQ.shift(); if (id) { const [k, cs] = id.split('#'), ci = +cs, [pk, bn] = prSplit(k);
      if (!PR || !PR_PAL[pk] || (bn && !(PR.bodies && PR.bodies[bn]))) {} else if (bn ? prBodies[bn] : prBase) { const sh = prSheet(k); if (sh) prPart(sh, ci); } else prWarmQ.push(id); }  // 아직 그림이 안 읽혔으면 뒤로
    prWarm.cost=Math.max(3,(prWarm.cost||3)*.3+(performance.now()-started)*.7);
    if (prWarmQ.length) ric(step, { timeout:1500 }); else prWarm.on = false; };
  ric(step, { timeout:1500 });
}
// 처치·운반 동작 조각은 그 사람에게 다가갔을 때 미리 칠한다 (판 시작에 모두 칠하면 옷마다 14MB)
const prNear = new Set();
function prWarmNear(g) { if (!PR || !g || g.dog) return; const k = charOf(g); if (prNear.has(k)) return; prNear.add(k); prWarm([k], 2);const [pal,bn]=prSplit(k),name=(bn||'key')+'Motion';if(PR.bodies?.[name])prLoadBody(name).then(b=>{if(b)prWarm([pal+'@'+name],2);}); }
// 판이 바뀌면 이 판에 없는 옷의 칠한 조각은 버린다 (메모리)
function prKeep(keys){
  prNear.clear();const fluidKeys=[...keys,'ninja'].flatMap(k=>{const[p,b]=prSplit(k);return Object.values(PR.fluidBodies?.[b||'key']||{}).map(n=>p+'@'+n);});
  const motion=keys.map(k=>{const[p,b]=prSplit(k);return p+'@'+(b||'key')+'Motion';}),keep=new Set(['ninja','ninja_ol','ninja@heroMotion',...keys,...motion,...fluidKeys,...fluidKeys.map(k=>k+'_ol'),...keys.map(k=>k+'_ol'),...motion.map(k=>k+'_ol')]);
  for(const k of Object.keys(prVar))if(!keep.has(k))delete prVar[k];for(let i=prWarmQ.length-1;i>=0;i--)if(!keep.has(prWarmQ[i].split('#')[0]))prWarmQ.splice(i,1);
  const bodies=new Set([...keep].map(k=>prSplit(k.replace(/_ol$/,''))[1]).filter(b=>PR.bodies?.[b]));
  spriteSources.retain(bodies);
  // Preload only the normal silhouettes used by people in this mission.
  for(const bn of bodies)if(!bn.endsWith('Motion')||bn==='heroMotion')prLoadBody(bn);
}
const prDir = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
// anim: idle walk run sneak crouch death punch / t: 경과 시간(초)
let playerInkKey=null;
function drawPR(key, x, y, a, anim, t, alpha = 1, scale = 1, lift = 0, frame = -1) {
  const original=key,plain=key.replace(/_ol$/,''),resolved=fluidSprite(key,anim,t,frame);
  let bm=PR.bodies?.[prSplit(plain)[1]];
  if(resolved){key=resolved.key;bm=resolved.meta;frame=resolved.frame;}
  else if(bm&&!bm.anims[anim]){key=prSplit(key)[0];bm=null;}
  const sh=prSheet(key);if(!sh)return false;
  const [c0,nf]=(bm&&bm.anims[anim])||PR.anims[anim]||PR.anims.idle;
  const fps=anim==='run'?12.7:anim==='sneak'?7:anim==='walk'?9:anim==='punch'?12:anim==='carry'||anim==='carried'?7:anim==='grab'||anim==='held'?6*DRAG_SPD/.55:anim==='climb'?7:anim==='hold'?9:anim==='talk'?2.6:anim==='idleC'?.7:1.6;
  const fi=frame>=0?clamp(Math.round(frame),0,nf-1):Math.floor(t*fps)%nf;
  scale*=((bm&&bm.anims[anim]?bm.scales?.[anim]:PR.scales?.[anim])||1);
  const dw=PR.fr*scale,anchor=bm?.anims[anim]&&bm.grounds?.[anim],gy=(anchor!=null?anchor:PR.grounds?.[anim]??PR.groundY)*scale;
  if(original===playerInkKey&&prVar[key+'_ol']){const paired=S.player.grabIn||S.player.captive||(S.player.killAnim&&S.player.strikeT>0);ctx.globalAlpha=(paired?.16:.28)*alpha;prBlit(prVar[key+'_ol'],c0+fi,prDir(a),x-dw/2,y+13-gy-lift,dw,dw);}
  ctx.globalAlpha=alpha;prBlit(sh,c0+fi,prDir(a),x-dw/2,y+13-gy-lift,dw,dw);ctx.globalAlpha=1;return true;
}
// 매달림도 복장·방향·프레임별 두 손의 중점을 실제 창틀/줄에 맞춘다.
function drawHangPR(key, x, y, a, frame, alpha = 1, anim = 'hang') {
  const resolved=fluidSprite(key,anim,0,frame);if(resolved)key=resolved.key;
  const m=resolved?.meta||PR.bodies?.[prSplit(key)[1]]||PR,[c,n]=m.anims[anim]||PR.anims[anim],fi=resolved?.frame??clamp(Math.round(frame),0,n-1),row=prDir(a);
  const hands=m[anim+'Hands']?.[row]?.[fi]||PR[anim+'Hands']?.[row]?.[fi],s=m.scales?.[anim]||m.scales?.hang||PR.scales?.hang||1;
  let hx=hands?(hands[0][0]+hands[1][0])/2:PR.hangHand[0],hy=hands?(hands[0][1]+hands[1][1])/2:PR.hangHand[1];
  if(anim==='ledgePull'&&hands){const base=m.hangHands?.[row]?.[0]||PR.hangHands[row][0];const ratio=(m.scales?.hang||s)/s;hx=hands[0][0]-(base[0][0]-base[1][0])*ratio/2;hy=hands[0][1]-(base[0][1]-base[1][1])*ratio/2;}
  const dx=x-hx*s,dy=y-hy*s,dw=PR.fr*s,sh=prSheet(key),ol=prVar[key+'_ol'];
  if(ol&&(isTouch||alpha<1)){ctx.globalAlpha=.65*alpha;prBlit(ol,c+fi,row,dx,dy,dw,dw);}
  ctx.globalAlpha=alpha;prBlit(sh,c+fi,row,dx,dy,dw,dw);ctx.globalAlpha=1;
}
// 배관은 발 기준 오프셋 대신 실제로 구운 두 손의 접점을 관 축에 맞춘다.
function climbContact(key, a, frame, at, size = 1) {
  const resolved=fluidSprite(key,'climb',0,frame),bm=resolved?.meta||PR?.bodies?.[prSplit(key)[1]],m=bm?.climbHands?bm:PR,row=prDir(a),fi=resolved?.frame??clamp(Math.round(frame),0,(m.anims.climb||PR.anims.climb)[1]-1),hands=m?.climbHands?.[row]?.[fi],feet=m?.climbFeet?.[row]?.[fi];
  if(!hands||!feet)return null;
  const scale=size*(m.scales?.climb||1),hx=(hands[0][0]+hands[1][0])/2,hy=(hands[0][1]+hands[1][1])/2;
  const fy=(feet[0][1]+feet[1][1])/2,fx=(feet[0][0]+feet[1][0])/2,gy=m.grounds?.climb??PR.groundY;
  return {x:at.x-(hx-PR.fr/2)*scale,y:at.y-13+(gy-hy)*scale+14,foot:{x:at.x+(fx-hx)*scale,y:at.y+(fy-hy)*scale-13},hands:hands.map(h=>({x:at.x+(h[0]-hx)*scale,y:at.y+(h[1]-hy)*scale}))};
}
const usePR = key => {
  if (!PR || !prBase) return false;
  if (key.endsWith('_ol')) return !!prVar[key];
  const [pk,bn] = prSplit(key);
  if (bn && !prBodies[bn]) { prLoadBody(bn); return false; }
  return bn ? !!PR_PAL[pk] : !!PR_PAL[key];
};
const PAIR = () => !!(PR && PR.anims.carry && PR.anims.held);
const strippedKey = c => {
  const body = prSplit(c.ch || 'strip')[1];
  return PR && PR.style === 'modular' ? 'strip@' + (PR.bodyGender[body] === 'female' ? 'fBob' : 'male') : 'strip';
};
const carryKey = c => c && !c.dog && (c.stripped ? strippedKey(c) : c.ch);
const pairCarry = P => P.carrying && PAIR() && usePR(carryKey(P.carrying)) && usePR('ninja');
// 처치 진행(0~1) → 핵심 자세 시간(0~3). 다가섬(0→1) → 버둥거림(1 근처를 오가며 힘이 빠짐) → 무릎 꺾임(1→2) → 주저앉음(2→3)
// from = 1: 이미 목을 감은 상태(붙잡은 사람)에서 시작
const easeIO = u => u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
function killKT(kind, f, from) {
  const A = from ? [0, 0.4, 0.72] : kind === 'choke' ? [0.13, 0.52, 0.8] : [0.15, 0.4, 0.72], n = kind === 'choke' ? 3 : 2;
  if (f < A[0]) return easeIO(f / A[0]);
  if (f < A[1]) { const u = (f - A[0]) / (A[1] - A[0]); return 1 + 0.34 * Math.abs(Math.sin(u * Math.PI * n)) * (1 - u * 0.4); }
  if (f < A[2]) return 1 + easeIO((f - A[1]) / (A[2] - A[1]));
  return 2 + easeIO(Math.min(1, (f - A[2]) / (1 - A[2])));
}
const ktFrame = (anim, kt) => { const nf = (PR.anims[anim] || [0, 4])[1]; return Math.max(0, Math.min(nf - 1, kt / 3 * (nf - 1))); };
const pairGrab = P => P.captive && PAIR() && usePR(charOf(P.captive)) && usePR('ninja');
const corpseFrame=c=>c.stripped?9:c.t0!=null&&S.t-c.t0<1?(c.f0||0)+Math.floor((S.t-c.t0)*10):9;
