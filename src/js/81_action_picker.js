// 기존 대상 버튼에서 이름을 보고 고른다. 선택은 실행하지 않으며 실행 시 대상을 다시 확인한다.
let envPicker = null;
const envToken = a => a.k + ':' + oid(actObj(a));
function closeEnvPicker() { envPicker = null; const e = $('envPicker'); if (e) { e.hidden = true; e.replaceChildren(); } const b = $('btnCycle'); if (b) b.setAttribute('aria-expanded','false'); }
function selectEnvTarget(token) {
  RC = null; const a = envChoices(), i = a.findIndex(v => envToken(v) === token);
  if (i < 0) { closeEnvPicker(); return false; }
  const P = S.player; S.envKey = a.map(v=>v.k+oid(actObj(v))).join('|'); S.envSel = i;
  S.envPick = oid(actObj(a[i])); S.envPickK = a[i].k; S.envPickP = {x:P.x,y:P.y,fl:flOf(P),z:P.z||0}; S.envExplicit = token;
  closeEnvPicker(); hudCache.carryH = null; return true;
}
function toggleEnvPicker() {
  if (!S || !running || paused || S.over || DLG.modal || actionBusy()) return;
  if (envPicker) { closeEnvPicker(); return; }
  const choices = envChoices(); if (!choices.length || (choices.length < 2 && !S.envExplicit)) return;
  const P = S.player; envPicker = {x:P.x,y:P.y,fl:flOf(P),z:P.z||0};
  const e = $('envPicker'); e.replaceChildren(); e.hidden = false; $('btnCycle').setAttribute('aria-expanded','true');
  const title = document.createElement('b'); title.textContent = '행동 대상 선택'; e.append(title);
  const current = envAction();
  for (const a of choices) {
    const b = document.createElement('button'), token = envToken(a); b.type = 'button'; b.textContent = a.label;
    b.dataset.envToken = token; b.setAttribute('aria-pressed',String(token === envToken(current)));
    b.addEventListener('pointerdown',ev=>ev.stopPropagation());
    b.addEventListener('click',ev=>{ev.preventDefault();selectEnvTarget(token);updateHUD(true);}); e.append(b);
  }
  const b = document.createElement('button'); b.type = 'button'; b.textContent = '닫기'; b.onclick=()=>{closeEnvPicker();$('btnCycle').focus({preventScroll:true});}; e.append(b);
  positionEnvPicker();
  e.querySelector('button[aria-pressed="true"]')?.focus({preventScroll:true});
}
function positionEnvPicker() {
  const e = $('envPicker'); if (!envPicker || !e) return;
  const P = S.player;
  if (paused || S.over || actionBusy() || flOf(P)!==envPicker.fl || (P.z||0)!==envPicker.z || dist(P.x,P.y,envPicker.x,envPicker.y)>8) { closeEnvPicker(); return; }
  const live = new Set(envChoices().map(envToken));
  for (const b of e.querySelectorAll('[data-env-token]')) b.disabled = !live.has(b.dataset.envToken);
  const r = e.getBoundingClientRect(), px = (P.x-cam.x)*SCALE+W/2, py=(P.y-cam.y)*SCALE+H/2;
  // 주인공과 오른쪽 조작부를 피해 왼쪽 위/아래의 넓은 쪽에 둔다.
  const top = Math.max(8,(drawMini.tb||70)+8), left=Math.max(8,Math.min(W-r.width-8,px-r.width-35));
  const y = py-r.height-65>=top ? py-r.height-65 : py+65;
  e.style.left=left+'px'; e.style.top=clamp(y,top,Math.max(top,H-r.height-16))+'px';
}
function drawEnvSelection() {
  if (tactical || paused || S.over || actionBusy()) return;
  const a=envAction(); if(a.k==='none' || !(a.choices>1 || S.envExplicit)) return;
  const p=objectActionPoint(a); if(!p || !Number.isFinite(p.x)) return;
  ctx.save(); ctx.strokeStyle='#e6d9ae';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.ellipse(p.x,p.y+4,19,10,0,0,TAU);ctx.stroke();ctx.restore();
}
function unavailableEnvReason() {
  const P=S.player;
  if(P.ledge || P.wire) return '안전하게 올라설 곳이 없다';
  const a=[...(S.props||[]).filter(p=>!p.taken),...(S.doors||[]),...(S.hides||[]),...(S.lamps||[]).filter(l=>!l.broken).map(l=>lampControl(l))]
    .filter(o=>Number.isFinite(o.x)&&dist(P.x,P.y,o.x,o.y)<100).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y));
  const o=a[0]; if(!o)return '조작할 물체 가까이 이동하기';
  if(flOf(o)!==flOf(P)||(o.z||0)!==(P.z||0))return '다른 층에 있는 대상이다 — 연결 입구로 이동하기';
  if(!objectReachable(o,100))return '벽이나 가구에 가려 손이 닿지 않는다';
  return '대상에 더 가까이 이동하기';
}
