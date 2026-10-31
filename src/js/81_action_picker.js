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
  if (!S || !running || paused || tactical || S.keypad || S.over || DLG.modal || actionBusy()) return;
  if (envPicker) { closeEnvPicker(); return; }
  const choices = envChoices(); if (!choices.length || (choices.length < 2 && !S.envExplicit)) return;
  const P = S.player; envPicker = {x:P.x,y:P.y,fl:flOf(P),z:P.z||0};
  resetHelpTip();const e = $('envPicker'); e.replaceChildren(); e.hidden = false; $('btnCycle').setAttribute('aria-expanded','true');
  const title = document.createElement('b'); title.textContent = '행동 대상 선택'; e.append(title);
  const current = envAction();
  for (const a of choices) {
    const b = document.createElement('button'), token = envToken(a); b.type = 'button'; b.textContent = a.label;
    if(choices.filter(c=>c.label===a.label).length>1){const at=objectActionPoint(a);if(at&&Number.isFinite(at.x)){const dx=at.x-P.x,dy=at.y-P.y,side=Math.abs(dx)>Math.abs(dy)?(dx<0?'왼쪽':'오른쪽'):(dy<0?'위쪽':'아래쪽'),note=document.createElement('small');note.textContent=side+' · '+Math.max(1,Math.round(Math.hypot(dx,dy)/32))+'m';b.append(note);}}
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
  if (paused || tactical || S.keypad || DLG.modal || S.over || actionBusy() || flOf(P)!==envPicker.fl || (P.z||0)!==envPicker.z || dist(P.x,P.y,envPicker.x,envPicker.y)>8) { closeEnvPicker(); return; }
  const live = new Set(envChoices().map(envToken));
  for (const b of e.querySelectorAll('[data-env-token]')) b.disabled = !live.has(b.dataset.envToken);
  const px=(P.x-cam.x)*SCALE+W/2,py=(P.y-cam.y)*SCALE+H/2;
  // 중앙 표시·조작 버튼·인물의 자리를 예약한다. 좁은 화면에서만 폭을 줄인다.
  const blocks=[...document.querySelectorAll('#hud .top,#stealth,#mini,#btnPause,.pad > button:not([hidden]),.sysbtns button,#toasts .toast')]
    .filter(n=>!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect()).filter(b=>b.width&&b.height)
    .map(b=>[b.left,b.top,b.right,b.bottom]);
  blocks.push([px-24,py-58,px+24,py+14]);
  let at=null,r;
  for(const width of ['',Math.min(150,Math.max(112,W/2-44))+'px']){
    e.style.width=width;r=e.getBoundingClientRect();
    const x0=clamp(px-r.width-35,8,Math.max(8,W-r.width-8));
    const xs=[x0,8,clamp(px+35,8,Math.max(8,W-r.width-8)),W-r.width-8],ys=[py-r.height-65,py+65,H-r.height-16,8,...blocks.flatMap(b=>[b[3]+8,b[1]-r.height-8])];
    for(const y of ys){if(y<8||y+r.height>H-8)continue;for(const x of xs){if(x<8||x+r.width>W-8)continue;
      if(!blocks.some(b=>x<b[2]+4&&x+r.width+4>b[0]&&y<b[3]+4&&y+r.height+4>b[1])){at={x,y};break;}
    }if(at)break;}if(at)break;
  }
  e.style.left=(at?.x??8)+'px';e.style.top=(at?.y??clamp(py+65,8,Math.max(8,H-r.height-16)))+'px';
}
function drawEnvSelection() {
  if (tactical || paused || S.over || actionBusy()) return;
  const a=envAction(); if(a.k==='none' || !(a.choices>1 || S.envExplicit)) return;
  if(a.c){if(attackAction().c===a.c)return;ctx.save();ctx.setLineDash([4,3]);drawTargetRing(a.c,'#e6d9ae',a.c);ctx.restore();return;}
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
