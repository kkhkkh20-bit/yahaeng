// ---------------------------------------------------------------- 빛
const TORCH_R = 210;
const flickOff = l => !!l.flk && ((Math.sin(S.t * l.flk.f + l.flk.p) > 0.62) || ((S.t * 6.3 + l.flk.p) % 7 < 0.35));  // 깜빡이는 보안등·간판: 잠깐씩 꺼진다
const lampOn = l => !l.broken && !l.off && !(l.outdoor && !S.lightsOn) && !flickOff(l);
// 빛의 중심과 손으로 누르는 스위치는 별개다. 구버전 저장도 기둥 밑 상자에 연결한다.
function lampControl(l) {
  if (l.control) return l.control;
  if (!l.pole) return l;
  const o = (S.poles || []).find(o => Math.abs(o.x - l.x) < 1 && Math.abs(o.y - l.y) < TILE);
  return o ? { x: o.x + 12, y: o.y + 6, fl: 0, z: 0 } : l;
}
const lampName = l => l.mount?.kind==='wall'?'벽부등':l.mount?.kind==='street'?'가로등':l.pole?'전신주 보안등':'조명';
// 등 격자: 밝기를 물을 때마다 판의 등 전부(도시는 수백 개)를 훑지 않게, 160px 칸마다 빛이 닿을 수 있는 등만 모아 둔다
const LG_C = 160, LG_NONE = [];
let LG = null;
function lampsNear(x, y, f) {
  if (!LG || LG.S !== S || LG.n !== S.lamps.length) {
    LG = { S, n: S.lamps.length, m: new Map() };
    for (const lp of S.lamps) { const lf = flOf(lp);
      for (let cy = Math.floor((lp.y - lp.r) / LG_C); cy <= Math.floor((lp.y + lp.r) / LG_C); cy++) for (let cx = Math.floor((lp.x - lp.r) / LG_C); cx <= Math.floor((lp.x + lp.r) / LG_C); cx++) {
        const k = lf * 1e8 + (cy + 500) * 1e4 + cx + 500; let a = LG.m.get(k); if (!a) LG.m.set(k, a = []); a.push(lp); } }
  }
  return LG.m.get(f * 1e8 + (Math.floor(y / LG_C) + 500) * 1e4 + Math.floor(x / LG_C) + 500) || LG_NONE;
}
function ambientLightAt(x, y, elev) {
  let l = elev ? 0.1 : 0.04;
  for (const lp of lampsNear(x, y, CUR_F)) {
    if (!lampOn(lp) || flOf(lp) !== CUR_F) continue;
    const d = dist(lp.x, lp.y, x, y);
    if (d < lp.r && los(lp.x, lp.y, x, y, elev)) l = Math.max(l, clamp((1 - d / lp.r) * 1.8, 0, 1));
  }
  return l;
}
// 손전등 후보는 매 프레임 한 번만 공간 격자로 묶는다. 광선 표본마다 모든 인물을 훑지 않는다.
let torchGrid=null;
function torchesNear(x,y,f){
  if(!torchGrid||torchGrid.S!==S||torchGrid.t!==S.t||torchGrid.guards!==S.guards||torchGrid.n!==S.guards.length){
    const m=new Map();torchGrid={S,t:S.t,m,guards:S.guards,n:S.guards.length};
    for(const g of S.guards||[]){if(!g.torch||g.state==='DEAD'||g.state==='CAPTIVE')continue;const r=TORCH_R+16;
      for(let cy=Math.floor((g.y-r)/LG_C);cy<=Math.floor((g.y+r)/LG_C);cy++)for(let cx=Math.floor((g.x-r)/LG_C);cx<=Math.floor((g.x+r)/LG_C);cx++){const key=flOf(g)+':'+cx+':'+cy;let a=m.get(key);if(!a)m.set(key,a=[]);a.push(g);}
    }
  }return torchGrid.m.get(f+':'+Math.floor(x/LG_C)+':'+Math.floor(y/LG_C))||LG_NONE;
}
function dynamicLightAt(x,y,elev,l){
  // 서치라이트: 빛줄기 안은 대낮처럼 밝다 (누구 눈에든 띈다)
  if (S.cams) for (const c of S.cams) { if (!c.search || c.fl !== CUR_F || !camOn(c)) continue; const d = dist(c.x, c.y, x, y); if (d > SL_R || d < 4) continue; if (Math.abs(angDiff(c.a, Math.atan2(y - c.y, x - c.x))) > SL_FOV) continue; if (!los(c.x, c.y, x, y, elev)) continue; l = Math.max(l, 0.95 - 0.35 * d / SL_R); }
  // 손전등: 비추는 자경대원 앞 원뿔 안은 밝다 (어둠 속이어도 들킨다)
  if (S.guards) for (const g of torchesNear(x,y,CUR_F)) { if (!g.torch || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== CUR_F) continue; const d = dist(g.x, g.y, x, y); if (d > TORCH_R || d < 4) continue; if (Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > 0.32) continue; if (!los(g.x, g.y, x, y, elev)) continue; l = Math.max(l, 0.85 * (1 - d / TORCH_R) + 0.2); }
  return l;
}

function lightAt(x,y,elev){return dynamicLightAt(x,y,elev,ambientLightAt(x,y,elev));}

// ---------------------------------------------------------------- 메시지
const toastEl = document.getElementById('toasts');
function toast(text, sec = 2.6, kind = '') { if (kind === 'hint') return showHint(text, sec); S.toasts.push({ text, t: sec, kind }); if (S.toasts.length > 4) S.toasts.shift(); renderToasts(); }
// 조작 설명은 연습과 조작 화면에 둔다. 구형 행동 코드의 호출은 자동 패널을 만들지 않는다.
function hint() {}
function showHint() { return false; }
function resetHelpTip() {}
function updateHelpTip() {}

function renderToasts() {
  toastEl.innerHTML='';if(!S)return;
  // 기록은 유지하고, 화면에는 긴급도와 발생 순서에 따라 한 건만 보여 준다.
  const score=m=>/bad/.test(m.kind||'')?4:/warn/.test(m.kind||'')?3:/good/.test(m.kind||'')?2:/radio/.test(m.kind||'')?0:1;
  const m=S.toasts.reduce((best,m)=>!best||score(m)>=score(best)?m:best,null);
  if(m){const d=document.createElement('div');d.className='toast '+m.kind;d.textContent=m.text;toastEl.appendChild(d);}
  updateHelpTip();
}

// ---------------------------------------------------------------- 소음
// 벽이 소리를 막는다: 소리와 듣는 사람 사이의 벽 한 겹마다 크게 줄어든다 (창문·잠긴 문은 조금 덜)
function soundThrough(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 10); let f = 1, lt = -1;
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), k = ty * MW + tx; if (k === lt) continue; lt = k;
    const c = inMap(tx, ty) ? G[ty][tx] : '#';
    if (c === '#' || c === 'V' || c === 'U') f *= 0.28; else if (c === 'N' || c === 'X') f *= 0.55; else if (c === 'T' || c === 'M') f *= 0.85;
    if (f < 0.05) break; }
  return f;
}
// 소리는 바로 잇는 선이 벽에 막혀도 가까운 열린 출입구를 돌아 전달된다.
function soundField(x,y,r){
  const sx=Math.floor(x/TILE),sy=Math.floor(y/TILE),key=(tx,ty)=>ty*MW+tx,distances=new Map([[key(sx,sy),0]]),queue=[{x:sx,y:sy,d:0}];
  const cost=(tx,ty)=>{if(!inMap(tx,ty))return Infinity;const c=G[ty][tx];return '#VUS'.includes(c)?Infinity:c==='X'?TILE*.8:c==='N'?TILE*.5:0;};
  while(queue.length){queue.sort((a,b)=>b.d-a.d);const at=queue.pop();if(at.d!==distances.get(key(at.x,at.y)))continue;
    for(const [dx,dy]of N8){const tx=at.x+dx,ty=at.y+dy,penalty=cost(tx,ty);if(!Number.isFinite(penalty)||dx&&dy&&!Number.isFinite(cost(at.x+dx,at.y))&&!Number.isFinite(cost(at.x,at.y+dy)))continue;
      const d=at.d+TILE*Math.hypot(dx,dy)+penalty,k=key(tx,ty);if(d>r||d>=(distances.get(k)??Infinity))continue;distances.set(k,d);queue.push({x:tx,y:ty,d});
    }
  }return distances;
}
function noise(x, y, r, src, fl, z) {
  if (fl == null) fl = flOf(S.player);
  const zs = z || 0, srcIn = !zs && !fl && !!roofAt(Math.floor(x / TILE), Math.floor(y / TILE));  // 소리 난 높이: 옥상 위 / 지붕 아래(실내) / 바깥  // 층을 안 적으면 내 층 (예전엔 '지금 계산 중인 층'이라, 그리기가 1층으로 돌려놓은 사이 위층 발소리가 1층에 들렸다)
  if (src !== 'scream') r = Math.max(src==='whistle'?180:0,r*loudMul(x,y,fl));  // 클럽 음악에 묻힌다
  const nz = { x, y, r, t: 0, src, fl, z:zs }; S.noises.push(nz);
  const L0 = CUR_F; setLayer(fl);let field=null;
  for (const g of S.guards) {
    if (flOf(g) !== fl) continue;
    if (src === 'guardDoor' && g.searchJob) continue;  // 동료가 수색 중 여는 문에 다시 몰리지 않는다
    { const gz = g.z || 0, gIn = !gz && !flOf(g) && !!roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); if ((zs > 0 && gIn) || (srcIn && gz > 0)) continue; }  // 옥상 발소리는 아래 실내에서 안 들리고, 실내 소리는 옥상에서 안 들린다
    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || g.state === 'TERROR') continue;
    const d = dist(g.x, g.y, x, y);
    const rr = d > r ? 0 : r * soundThrough(x, y, g.x, g.y);
    let audible=d<rr;
    if(src==='whistle'&&!audible&&d<r){field=field||soundField(x,y,r);audible=(field.get(Math.floor(g.y/TILE)*MW+Math.floor(g.x/TILE))??Infinity)<r;}
    const runStep = src === 'step' && S.player.mode === 'run' && S.player.moving;
    if (src === 'step' && STAGE.zones && !g.dog && !knownFace(g) && permitted(zoneInfo(x, y, zs)) && publicSuspicion(g) === 0) continue;  // 허가된 직원의 발소리 때문에 일을 멈추고 따라오지 않는다
    if (src === 'step' && STAGE.zones && zoneAt(x, y, S.player.z) === Z_PUB && !(runStep && d < rr * 0.7)) continue;  // 거리·가게의 걷는 발소리는 아무도 신경 쓰지 않는다 (가까이서 뛰어오는 소리는 돌아본다)
    if (g.civ) { if (audible && src !== 'scream') { if (g.state === 'SLEEP') { if (d < rr * 0.6) civWake(g, x, y); } else if (g.state === 'PATROL') { g.meter = Math.min(0.9, g.meter + 0.25); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '?'); } } continue; }
    if (audible) {
      if (g.state === 'FUSE' && src !== 'stone') continue;
      if (g.state === 'BODY' || g.state === 'LURE') continue;
      if (g.elite && src === 'stone') { g.glance = 1.6; g.glanceA = Math.atan2(y - g.y, x - g.x); setIcon(g, '흥'); continue; }
      // 발소리: 바로 돌아보지 않고 잠깐 멈칫한다 (그 사이 등 뒤에서 덮칠 수 있다)
      if (src === 'step' || src === 'whistle') nz.heard = true;
      if (src === 'whistle' && !g.dog) { g.startle={a:Math.atan2(y-g.y,x-g.x)};gsay(g, ['누구야?', '휘파람…? 거기 누구 있어?', '뭐야, 이쪽인가?'][(g.id + (S.stats.whistles || 0)) % 3]); }
      if (runStep && !g.dog && d < 200 && !g.startle) g.startle = { a: Math.atan2(y - g.y, x - g.x) };  // 등 뒤로 뛰어오는 발소리: 화들짝 돌아본다
      const fz = ['whistle', 'stone', 'coin', 'beep', 'door', 'switch', 'car'].includes(src) ? 20 : 20 + d * 0.3;  // 멀리서 들은 소리일수록 위치를 대충만 안다 (일부러 낸 소리는 정확히)
      if (src === 'step' && !g.dog && (g.state === 'PATROL' || g.state === 'RETURN')) { if (!(g.hearT > 0)) { g.hearT = runStep ? 0.12 : 0.6; setIcon(g, '?'); play('question', 0.3 * proxVol(g)); } g.hearP = { x: x + rnd(-fz, fz), y: y + rnd(-fz, fz) }; continue; }
      goSuspicious(g, src==='whistle'?x:x+rnd(-fz,fz), src==='whistle'?y:y+rnd(-fz,fz), src === 'stone' ? 3 : 3.5); g.why = 'heard';
    }
  }
  setLayer(L0);
}
function goSuspicious(g, x, y, look) {
  if (g.state === 'WARN') return;  // 나가라고 경고하는 중엔 다른 데 정신 팔지 않는다
  releaseSearchJob(g);
  endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35 * proxVol(g)); }
  g.state = 'SUSPICIOUS'; g.poi = { x, y, fl: flOf(g), z: g.z || 0 }; g.path = null; g.wait = 0; g.waitBase = look || 3.5; g.reached = false; g.glance = 0;
}
function setIcon(g, ic) { g.icon = ic; g.iconT = 2.2; }
function proxVol(g) { return clamp(1 - dist(g.x, g.y, S.player.x, S.player.y) / 700, 0.25, 1); }

