// ---------------------------------------------------------------- HUD
const $ = id => document.getElementById(id);
const hud = { tool: $('btnTool'), pips: [...document.querySelectorAll('#alertPips i')], obj: $('objective'), objT: $('objTitle'), light: $('lightFill'), lightLbl: $('lightLbl'), mode: $('modeLbl'), alarm: $('alarmChip'), act: $('btnAct'), carry: $('btnCarry'), kills: $('killsLbl'), layer: $('layerLbl'), hp: $('hpPips') };
let hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
// 미니맵: 건물·골목, 나, 목표, 탈출구, 내가 볼 수 있는 사람만
let miniBase = null, miniT = 0;
function buildMiniBase(mw = 200, mh = 140) {
  const s = Math.min(mw / MW, mh / MH), c = document.createElement('canvas'); c.width = Math.ceil(MW * s); c.height = Math.ceil(MH * s);
  const x = c.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = G0[ty][tx], b = bldAt(tx, ty);
    x.fillStyle = b >= 0 && !BLD[b].vacant ? (ch === '#' || ch === 'N' ? '#6a7486' : '#3e4758') : ch === '#' ? '#4a5262' : ch === '=' ? '#2c3343' : ch === ',' ? '#2a2e28' : ch === 'g' ? '#1f3020' : ch === 'd' ? '#3a3024' : ch === 'x' ? '#6a8aa0' : ch === 'p' ? '#28405a' : ch === 'm' ? '#5d636e' : ch === 'r' ? '#4a463e' : ch === 'J' ? '#3a3e48' : ch === '~' ? '#1e3a5a' : ch === 'B' || ch === 'T' ? '#2f4a34' : ch === 'P' ? '#8a8f98' : ch === 'M' ? '#6a3a3a' : ch === 'A' ? '#5a6070' : '#181d28';
    if(INK_STUDY)x.fillStyle=b>=0&&!BLD[b].vacant?(ch==='#'||ch==='N'?'#777365':'#40463a'):ch==='B'||ch==='T'?'#46523d':ch==='='?'#37392f':ch==='~'?'#354a46':'#252b23';
    x.fillRect(tx * s, ty * s, Math.ceil(s), Math.ceil(s));
  }
  S.wires.forEach(w => { x.strokeStyle = 'rgba(160,170,190,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(w.a.x / TILE * s, w.a.y / TILE * s); x.lineTo(w.b.x / TILE * s, w.b.y / TILE * s); x.stroke(); });
  c.s = s; return c;
}
function miniGuardVisible(g) {
  const P=S.player;
  if(g.target)return !targetEliminated(g);
  if(['DEAD','CAPTIVE'].includes(g.state)||P.under||P.vent||flOf(g)!==flOf(P)||(g.z||0)!==(P.z||0)||dist(g.x,g.y,P.x,P.y)>=560)return false;
  const prev=CUR_F;setLayer(flOf(P));try{return !!los(P.x,P.y,g.x,g.y,!!P.z);}finally{setLayer(prev);}
}
function drawMini() {
  const cv = document.getElementById('mini'); if (!cv || !S) return;
  { const tp = document.querySelector('#hud .top'), hc = document.getElementById('hintCard'); if (tp) { const tb = Math.round(tp.getBoundingClientRect().bottom); if (tb !== drawMini.tb) { drawMini.tb = tb; document.documentElement.style.setProperty('--topb', tb + 'px'); } }
    const v = S.entrySel ? 'hidden' : ''; if (cv.style.visibility !== v) { cv.style.visibility = v; if (hc) hc.style.visibility = v; } }
  if (miniBase?.stage===S && S.t - miniT < 0.12 && S.t >= miniT) return; miniT = S.t;
  // 주인공(과 행동 표시)이 미니맵·목표·도움말 밑에 들어가면 그 판을 옅게 한다
  { const cr = canvas.getBoundingClientRect(), ip=STAGE.artSlice&&!tactical&&window.__clubView?.ready?window.__clubView.actorScreen(S.player):null,px = ip?ip.x:cr.left + (S.player.x - cam.x) * SCALE + W / 2, py = ip?ip.y:cr.top + (S.player.y - cam.y) * SCALE + H / 2;
    for (const el of [cv, document.querySelector('#hud .obj'), document.getElementById('hintCard')]) { if (!el) continue; const r = el.getBoundingClientRect(); const over = r.width > 0 && px > r.left - 40 && px < r.right + 40 && py > r.top - 70 && py < r.bottom + 40; el.classList.toggle('hudfade', over); } }
  if (!miniBase || miniBase.stage !== S) { miniBase = buildMiniBase(); miniBase.stage = S; cv.width = miniBase.width; cv.height = miniBase.height; }
  const x = cv.getContext('2d'), s = miniBase.s, P = S.player, T = v => v / TILE * s;
  x.drawImage(miniBase, 0, 0);
  if(STAGE.artSlice&&!tactical&&window.__clubView?.drawPassageMap(cv))return;
  // 화면에 보이는 범위
  x.strokeStyle = 'rgba(232,227,214,.45)'; x.lineWidth = 1;if(STAGE.artSlice&&!tactical&&window.__clubView?.ready){const pts=[[0,0],[W,0],[W,H],[0,H]].map(p=>window.__clubView.screenToWorld(...p));if(pts.every(Boolean)){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(T(p.x),T(p.y)):x.moveTo(T(p.x),T(p.y)));x.closePath();x.stroke();}}else x.strokeRect(T(cam.x - W / SCALE / 2), T(cam.y - H / SCALE / 2), T(W / SCALE), T(H / SCALE));
  if (S.exitOpen) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; for (const e of S.exits || [S.exit]) { x.beginPath(); x.arc(T(e.x), T(e.y), 5, 0, TAU); x.stroke(); } }
  for (const it of S.items) if (!it.got) { x.fillStyle = '#f2c46b'; x.fillRect(T(it.x) - 2.5, T(it.y) - 2.5, 5, 5); if (it.fl) { x.fillStyle = '#0b0d12'; x.font = uiFont(7); x.textAlign = 'center'; x.fillText(String(it.fl + 1), T(it.x), T(it.y) + 2.5); } }
  // 보이는 사람만: 같은 층·시선이 닿는 자경대원(경계 단계 색), 주민은 초록
  for (const g of S.guards) {
    if (g.state === 'DEAD' && !(g.target && !targetEliminated(g))) continue;
    const seen = miniGuardVisible(g);
    if (!seen) continue;
    x.fillStyle = g.target ? '#ff5a4a' : g.civ ? '#9ad69a' : guardAwareness(g).color;
    const at = g.target ? targetKnowledge(g) : g;
    x.beginPath(); x.arc(T(at.x), T(at.y), g.target ? (at.area ? 6 : 3) : 2.2, 0, TAU);
    if (at.area || at.lastSeen) { x.strokeStyle = '#ff8b7f'; x.lineWidth = 1; x.stroke(); } else x.fill();
  }
  for (const c of S.cams || []) if (!c.broken && c.fl === flOf(P)) { x.fillStyle = camOn(c) ? '#ff4a4a' : '#6a6a6a'; x.fillRect(T(c.x) - 2, T(c.y) - 2, 4, 4); }
  // 나
  x.save(); x.translate(T(P.x), T(P.y)); x.rotate(P.a); x.fillStyle = '#7fe3ff'; x.beginPath(); x.moveTo(5, 0); x.lineTo(-3.5, -3.5); x.lineTo(-2, 0); x.lineTo(-3.5, 3.5); x.closePath(); x.fill(); x.restore();
  if (P.fl || P.z) { x.fillStyle = '#7fe3ff'; x.font = uiFont(9); x.textAlign = 'left'; x.fillText(P.fl ? (P.fl + 1) + 'F' : 'R', T(P.x) + 5, T(P.y) - 4); }
}
// 판 지도 그림: 구운 지도를 줄여 그리고 출발(하늘)·탈출(노랑)·훔칠 것(금색 ◆)·표적(빨강 ●)을 찍는다
function stageMap(w, labels) {
  const mw = MW * TILE, mh = MH * TILE, s = w / mw, h = Math.round(mh * s), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; drawBig(x, mapC, 0, 0, mw, mh, 0, 0, w, h); x.fillStyle = 'rgba(7,10,18,.35)'; x.fillRect(0, 0, w, h);
  const R = Math.max(3, w / 90), pt = (px, py, col, sh, lab) => { const X = px * s, Y = py * s; x.fillStyle = col; x.strokeStyle = 'rgba(7,10,18,.9)'; x.lineWidth = Math.max(1.5, R / 3); x.beginPath();
    if (sh === 'd') { x.moveTo(X, Y - R * 1.4); x.lineTo(X + R * 1.1, Y); x.lineTo(X, Y + R * 1.4); x.lineTo(X - R * 1.1, Y); x.closePath(); } else x.arc(X, Y, sh === 'r' ? R * 1.6 : R, 0, TAU);
    if (sh === 'r') { x.lineWidth = R * 0.7; x.strokeStyle = col; x.stroke(); } else { x.stroke(); x.fill(); }
    if (labels && lab) { const brief=labels==='brief'; x.font = uiFont(Math.round(R*(brief?2:3.2))); x.textAlign = 'center'; const hw = x.measureText(lab).width / 2 + 5, LX = clamp(X, hw, w - hw), LY = Math.max(R * 3.4, Y - R * 2.2);
      if(brief) { x.fillStyle='#0d151de8'; x.fillRect(LX-hw,LY-R*1.75,hw*2,R*2.5); x.fillStyle='#e4e5df'; }
      else { x.lineWidth=3; x.strokeStyle='rgba(7,10,18,.95)'; x.strokeText(lab,LX,LY); x.fillStyle=col; }
      x.fillText(lab,LX,LY); } };
  pt(S.player.x, S.player.y, '#7fd6ff', 'c', '출발'); for (const e of S.exits || (S.exit ? [S.exit] : [])) pt(e.x, e.y, '#f2c46b', 'r', '탈출');
  S.items.forEach((it, i) => pt(it.x, it.y, '#ffd27a', 'd', (STAGE.itemNames || [])[i] || STAGE.itemName || '서류'));
  for (const g of S.guards) if (g.target && !targetEliminated(g)) { const at=targetKnowledge(g); pt(at.x,at.y,'#ff5a4a',at.area||at.lastSeen?'r':'c',targetName(g)); }
  return c;
}
// 할 일 목록 (브리핑·일시정지 공용): [표식, 색, 할 일, 자리]
function briefTodo() {
  const out = [], fg = pendingFirstGoal(); if (fg) out.push(['dia', '#7fd6ff', fg.text, fg.where || '']);
  S.items.forEach((it, i) => { if (!it.got) out.push(['dia', '#f2c46b', itemObjectiveText(it), placeName(it.x, it.y, it.fl, it.b)]); });
  for (const g of S.guards) if (g.target && !targetEliminated(g)) out.push(['dot', '#e8473c', targetName(g) + ' 처치', targetKnowledge(g).where]);
  if (STAGE.securityEvidence && S.camRoom) out.push(['ring', '#8ca5ba', '신원 기록', '녹화됐을 때만 보안실에서 삭제']);
  out.push(['ring', '#f2c46b', '이탈', S.exitOpen ? '노란 원으로' : '목표 완료 후 탈출 지점으로 이동']);
  return out;
}
// The briefing, permanent HUD and visible-world labels use the same identities.
// Location comes from disclosed knowledge, never an unobserved actor position.
function missionIdentities(){
  const rows=[];
  if(!S.spare)for(const g of S.guards)if(g.target){
    const complete=targetEliminated(g),at=targetKnowledge(g);
    rows.push({id:'target:'+g.id,kind:'target',name:targetName(g),verb:'처치',where:STAGE.id==='m2'&&g.tag==='vip'?'클럽 1층 · VIP룸과 홀':at.where,complete,
      status:complete?'처치 완료':at.unconscious?'기절 · 처치 미완료':'처치 대상',key:charOf(g)});
  }
  S.items.forEach((it,i)=>{const name=STAGE.itemNames?.[i]||STAGE.itemName||'서류',action=itemObjectiveAction(it),work=action&&action.kind!=='recovery';rows.push({id:'item:'+i,kind:'item',name,art:work?'terminal':name.includes('무전기')?'radio':name.includes('현금')?'cash':'document',verb:action?.verb||'회수',where:STAGE.itemPlaces?.[i]||placeName(it.x,it.y,flOf(it),it.b),complete:!!it.got,status:it.got?(action?.complete||'회수 완료'):(work?'현장 작업':'회수 물품')});});
  return rows;
}
function makeMissionIdentity(row,brief){
  const el=document.createElement('div');el.className='mission-id '+row.kind+(row.complete?' complete':'');el.dataset.missionId=row.id;
  const cv=document.createElement('canvas');cv.width=brief?192:72;cv.height=brief?128:72;cv.dataset.missionArt=row.kind;cv.dataset.key=row.key||row.art||'';cv.setAttribute('aria-hidden','true');el.appendChild(cv);
  const text=document.createElement('div'),type=document.createElement('small'),name=document.createElement('b'),status=document.createElement('span');
  type.textContent=brief?(row.kind==='target'?'제거할 사람':row.art==='terminal'?'현장에서 할 일':'가져올 물건'):row.status;name.textContent=row.name;status.textContent=brief?row.verb+' · '+row.where:row.complete?'✓ 완료':row.status;
  text.append(type,name);if(brief||row.complete||row.status.includes('기절'))text.appendChild(status);el.appendChild(text);return el;
}
function refreshMissionIdentityArt(){
  const hero=$('hudFace');if(hero&&!hero.dataset.ready&&drawFace(hero,speakerOf('hero')))hero.dataset.ready='1';
  if(!$('brief').hidden)for(const cv of document.querySelectorAll('.br-cast canvas:not([data-ready])'))if(drawFace(cv,speakerOf(cv.dataset.speaker)))cv.dataset.ready='1';
  const roots=[$('missionIdentity'),!$('brief').hidden&&$('brIdentity')].filter(el=>el&&!el.hidden);
  for(const cv of roots.flatMap(el=>[...el.querySelectorAll('canvas[data-mission-art]:not([data-ready])')])){
    const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.clearRect(0,0,w,h);
    if(cv.dataset.missionArt==='target'){
      const portrait=w>h?document.createElement('canvas'):cv;if(w>h){portrait.width=portrait.height=h;}
      if(!drawFace(portrait,{key:cv.dataset.key,col:'#d8dce5'}))continue;
      if(w>h)c.drawImage(portrait,0,0);
      // Alongside the face, show the actual clothed actor used in the level.
      if(w>h){
        const key=cv.dataset.key,bn=prSplit(key)[1],meta=PR.bodies?.[bn]||PR,anim=meta.anims.idleC?'idleC':'idle',col=meta.anims[anim][0],sh=prSheet(key),ci=Math.floor(col/PR_CH),part=sh&&prPart(sh,ci);
        if(!part)continue;
        c.fillStyle='#161c24';c.fillRect(w*.59,0,w*.41,h);c.imageSmoothingEnabled=false;
        c.drawImage(part,(col-ci*PR_CH)*PR.fr,prDir(Math.PI/2)*PR.fr,PR.fr,PR.fr,w*.50,h*.12,h,h);
      }
    }else{
      if(!atlas.complete||!atlas.naturalWidth)continue;
      c.fillStyle='#151b23';c.fillRect(0,0,w,h);
      if(cv.dataset.key==='terminal'){const s=Math.min(w,h)*.75;c.save();c.translate((w-s)/2,(h-s)/2);c.scale(s/36,s/36);c.fillStyle='#52606c';c.fillRect(3,5,30,22);c.fillStyle='#101c24';c.fillRect(6,8,24,15);c.fillStyle='#80afb9';c.fillRect(9,11,16,2);c.fillRect(9,16,10,2);c.fillStyle='#b8c3cc';c.fillRect(16,27,4,4);c.fillRect(10,31,16,2);c.restore();}else if(cv.dataset.key==='radio'){
        const s=Math.min(w,h)*.74/36;c.save();c.translate((w-s*36)/2,(h-s*36)/2);c.scale(s,s);c.strokeStyle='#c5d0de';c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';c.stroke(new Path2D(SKILL_SIGILS.radio));c.restore();
      }else if(cv.dataset.key==='cash'){
        const s=Math.min(w,h)/64;c.save();c.translate(w/2,h/2);c.scale(s,s);c.strokeStyle='#c5d0de';c.fillStyle='#303c49';c.lineWidth=2;c.fillRect(-22,-12,44,29);c.strokeRect(-22,-12,44,29);c.strokeRect(-10,-21,20,9);c.fillStyle='#c9b68f';c.fillRect(-5,-3,10,9);c.restore();
      }else{
        // A ledger is the objective; the safe it sits in is not its identity.
        const s=Math.min(w,h)*.72;c.save();c.translate((w-s)/2,(h-s)/2);c.scale(s/48,s/48);
        c.fillStyle='#b7aa8c';c.fillRect(9,3,31,41);c.fillStyle='#33424c';c.fillRect(6,1,30,41);
        c.strokeStyle='#89969e';c.lineWidth=1;c.strokeRect(6.5,1.5,30,41);c.fillStyle='#d8c6a3';c.fillRect(6,1,5,41);
        c.fillStyle='#e0d5bd';c.fillRect(16,12,15,2);c.fillRect(16,18,15,2);c.fillRect(16,24,10,2);c.restore();
      }
    }
    cv.dataset.ready='1';
  }
}
function syncMissionIdentity(){
  const el=$('missionIdentity');if(!el)return;
  const active=(mainContract(STAGE)||introductoryContract(STAGE))&&!STAGE.tutorial;el.hidden=!active;el.parentElement.classList.toggle('with-identities',active);if(!active){refreshMissionIdentityArt();return;}
  const rows=missionIdentities(),goal=nextGoal(),tracked=goal?.g?.target?'target:'+goal.g.id:goal?.id;
  const current=(rows.find(r=>r.id===tracked)||rows.find(r=>!r.complete)||rows[0])?.id;
  const signature=JSON.stringify([current,rows.map(r=>[r.id,r.key,r.art,r.status])]);
  if(hudCache.identity!==signature){el.replaceChildren(...rows.map(r=>{const card=makeMissionIdentity(r,false);card.dataset.current=String(r.id===current);return card;}));hudCache.identity=signature;}
  refreshMissionIdentityArt();
}
// 의뢰 브리핑: 시작 전에 지도·할 일·도전 과제를 한 장으로 보여 주고 [출발]
function showBrief(go) {
  const el = $('brief'); if (!el || STAGE.tutorial) { go(); return; }
  paused = true; el.hidden = false;
  $('brName').textContent = STAGE.name; $('brSub').textContent = STAGE.sub || '';
  el.querySelector('.br-scroll').scrollTop = 0;
  $('brMapDetails').open = !isTouch || innerWidth >= 900;
  const mp = $('brMap'); mp.innerHTML = ''; const cv = stageMap(Math.min(640, Math.round(mp.clientWidth || 340) * 2), 'brief'); cv.style.width = '100%'; mp.appendChild(cv);
  { const lg = document.querySelector('#brief .br-legend'); if (lg) { lg.querySelector('.lg-tg').hidden = !S.guards.some(g => g.target); lg.querySelector('.lg-it').hidden = !S.items.length; } }
  $('brFee').textContent = STAGE.fee || ''; $('brFeeBox').hidden = !STAGE.fee;
  $('brLine').textContent = STAGE.brief || ''; $('brRadio').hidden = !STAGE.brief; $('brDetails').open = false;
  const identities=mainContract(STAGE)||introductoryContract(STAGE)?missionIdentities():[],cards=$('brIdentity');cards.hidden=!identities.length;cards.replaceChildren(...identities.map(r=>makeMissionIdentity(r,true)));
  $('brPurpose').hidden=STAGE.id!=='m2'&&!introductoryContract(STAGE);$('brPurpose').textContent=STAGE.purpose|| (STAGE.openingContract?'증인의 은신처를 넘기기 전에 운반책을 제거한다.':'실장을 제거하고, 장부와 거래 암호표를 회수한다.');
  $('brOutcome').hidden=!identities.length;$('brOutcome').textContent='두 목표 완료 → 출구로 이탈';if(identities.length!==2)$('brOutcome').textContent='필수 목표 완료 → 출구로 이탈';
  $('brTodo').innerHTML = (identities.length?briefTodo().slice(0,pendingFirstGoal()?1:0):briefTodo().filter(r=>r[2]!=='신원 기록'&&r[2]!=='이탈')).map(([mk,c,t,w])=>`<li><i class="mk ${mk}" style="--c:${c}"></i><b>${t}<span>${w}</span></b></li>`).join('');
  $('brTodo').hidden=!$('brTodo').children.length;refreshMissionIdentityArt();
  renderSkillPreparation('brSkills');
  $('brCh').innerHTML = skillRewardRows(STAGE).filter(r=>!r.retired).map(r=>'<li>'+r.name+' · '+r.points+'P'+(r.earned?' (획득 완료)':' · 첫 달성 보상')+'</li>').join('');
  $('brChBox').hidden = !(STAGE.challenges || []).length;
  $('btnBrGo').onclick = () => { el.hidden = true; paused = false; go(); };
  { const sc = storedCP(STAGE.id), b = $('btnBrCP'); b.hidden = !sc; if (sc) { b.textContent = '이어 하기'; const time = document.createElement('small'); time.textContent = new Date(sc.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); b.appendChild(time); }
    b.onclick = () => { el.hidden = true; paused = false; if (resumeStoredCP(STAGE_I)) { play('bell', 0.6); startAmb(); } else go(); }; }
  $('btnBrBack').onclick = () => { el.hidden = true; paused = false; running = false; $('hud').hidden = true; syncQuick(); showMenu('intro'); };
}
// 연습 문구의 조작 이름: 휴대폰은 버튼 이름, PC는 키
const TUT_KEY = { 기술창:['메뉴 > 기술 트리에서','K로 기술 트리를 열어'], 일어서기:['[웅크림]을 눌러','Ctrl을 눌러'], 기술:['[공격]','B'], 기술목록:['메뉴 > 기술 트리의 암살 계열에서','K · 암살 계열에서'], 달리기: [()=>input.walkLock?'[장비]에서 걷기를 달리기로 바꾼 뒤 화면 왼쪽을 끝까지 끌어':'화면 왼쪽을 끝까지 끌어',()=>input.walkLock?'R로 걷기 고정을 끈 뒤 Shift+방향키로':'Shift+방향키로'], 휘파람:['[휘파람] 누르기','G 누르기'], 이동: ['화면 왼쪽을 끌어', '방향키로'], 지도: ['미니맵을 눌러', 'M으로'], 살금: ['[웅크리기]를 눌러', 'Ctrl을 눌러'], 공격: ['[공격]', () => KK('atk')], 붙잡기: ['[붙잡기]', () => KK('grab')], 행동: ['[행동]', () => KK('env')], 보조: ['[행동]', () => KK('env')], 도구: ['도구 버튼을', () => KK('tool') + '를'], 바꾸기: ['[장비]에서 빈 캔을 골라', '2로'], 대상: ['[대상]', 'Tab'] };
const tutText = t => (typeof t==='function'?t(S,S.player):t).replace(/\{(\S+?)\}/g, (m, k) => { if (!TUT_KEY[k]) return m; const v = TUT_KEY[k][isTouch ? 0 : 1]; return typeof v === 'function' ? v() : v; });
// 자리 이름: 건물 이름(간판)·층 — 목표 목록과 '지금 할 일'에 함께 쓴다
function placeName(x, y, fl, b) { const bi = b != null ? b : bldAt(Math.floor(x / TILE), Math.floor(y / TILE)); if (bi < 0) return '바깥'; const B = BLD[bi]; const nm = (B.name === '빌라' && B.plate ? B.plate : B.name) || B.plate || (B.kind === 'shop' ? ((B.signs || [])[fl || 0] || '상가') + ' 건물' : B.kind === 'house' ? '단독주택' : '빌라'); return B.vacant ? nm : nm + ' ' + ((fl || 0) + 1) + '층'; }
function pendingFirstGoal() {
  const fg = STAGE.firstGoal; if (!fg) return null;
  try { if (fg.done(S, SH)) return null; } catch (e) {}
  return fg.guide?{...fg,...fg.guide(S)}:fg;
}
// 의뢰 목표는 목적만 안내한다. 선택한 단서만 잠시 추적하고, 준비 행동으로 공략을 강요하지 않는다.
function nextGoal() {
  const P = S.player;
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) {
    if(STAGE.id==='tB'&&P.captive)return{text:tutText('{공격} 짧게 눌러 붙잡은 경비 기절시키기'),where:'이 동작이 끝나면 원래 안내가 이어진다',x:P.x,y:P.y,fl:flOf(P),tut:true,interrupt:'attack'};
    if(STAGE.id==='tB'&&S.tutI===4&&P.carrying)return{text:tutText('{행동} 몸 내려놓기 · 그다음 옷 훔쳐 입기'),where:'몸을 들고서는 옷을 갈아입을 수 없다',x:P.x,y:P.y,fl:flOf(P),tut:true,interrupt:'env'};
    if(STAGE.id==='tB'&&P.hide)return{text:tutText('{행동} 은신처에서 나오기'),where:'나온 뒤 원래 안내를 계속한다',x:P.x,y:P.y,fl:flOf(P),tut:true,interrupt:'env'};
    const st = STAGE.steps[S.tutI || 0], tg = st[2] && st[2](S);
    return { text: tutText(st[0]), where: '', x: tg && tg.x, y: tg && tg.y,
      fl: (tg && tg.fl) || 0, tut: true, moveCue:['move','run','crouch'].includes(tutorialCue()) };
  }
  if (STAGE.city) return cityGoal();
  syncMissionTracking();
  if (evidencePending() && S.items.every(i => i.got) && !S.guards.some(g => g.target && !targetEliminated(g)) && S.camRoom) return { text: '의뢰: CCTV 신원 기록 지우기', where: STAGE.camRoom?.name || placeName(S.camRoom.x, S.camRoom.y, S.camRoom.fl) + ' 보안실', x: S.camRoom.x, y: S.camRoom.y, fl: S.camRoom.fl || 0 };
  if (S.exitOpen) return { text: S.exits && S.exits.length > 1 ? '탈출 — ' + (S.exit.name || '가까운 노란 원') : '탈출 지점으로 빠져나가기', where: '노란 원', x: S.exit.x, y: S.exit.y, fl: 0, exit: true };
  { const entry=beginnerEntryGoal();if(entry)return entry;const opening=openingGoal();if(opening)return opening;const starter=starterGoal();if(starter)return starter;const apprentice=apprenticeGoal();if(apprentice)return apprentice; }
  { const fg = !S.goalManual&&!S.storyTrackManual&&pendingFirstGoal(); if (fg) return { text: fg.text, where: fg.where || '', x: fg.x??(fg.at ? tc(fg.at[0]) : null), y: fg.y??(fg.at ? tc(fg.at[1]) : null), fl: fg.fl??(fg.at ? fg.at[2] || 0 : 0) }; }
  if(!S.goalManual&&!S.storyTrackManual){const flow=actionFlowGoal();if(flow)return flow;const route=contractRouteGoal();if(route)return route;}
  if (oppMode) { const st = trackedStory(), step = st && storyStep(st); if (step) { const at = step.at,roof=st.d.id==='sign'&&st.step===0&&S.traps.find(t=>t.k==='drop'&&t.text==='CLUB'&&!t.used); return { text: '단서: ' + step.text, where: at ? placeName(tc(at[0]), tc(at[1]), at[2]) : '', x: at ? tc(at[0]) : null, y: at ? tc(at[1]) : null, fl: at ? at[2] || 0 : 0, z:roof?signGeometry(roof).z:0, story: st.d.id, storyName: st.d.name }; } }
  return pinnedMissionGoal();
}
// 목표 목록: 무엇을 어디서 (건물 이름·층) — 한 줄씩, 끝낸 것은 줄 긋기
function objectiveLines() {
  const L = [], P = S.player;
  const place = placeName;
  { const gl = !STAGE.steps && nextGoal(); if (gl) { let distance = ''; if (gl.x != null && gl.y != null) { const nav=goalNavigation(gl), m0 = Math.max(1, Math.round(dist(P.x, P.y, nav.x, nav.y) / 32)), m = m0 > 20 ? Math.round(m0 / 5) * 5 : m0; distance = ` · ${nav.via?'입구 ':''}${m}m`; } L.push(['go goal', `${gl.text}${gl.where && gl.where !== '바깥' ? ' · ' + gl.where : ''}${distance}`]); } }
  if(introductoryContract(STAGE))return L;
  if (S.mod) L.push(['info', '변형: ' + MODS[S.mod][0] + ' — ' + MODS[S.mod][1]]);
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) {const g=nextGoal(),s=STAGE.steps[S.tutI||0];L.push(['go tut', `${(S.tutI||0)+1}/${STAGE.steps.length} · ${g.text}${g.interrupt?'<small class="tut-detail">'+g.where+'</small>':s[3]?'<small class="tut-detail">'+s[3]+'</small>':''}`]);}
  if(STAGE.steps)return L;
  if(evidencePending()&&S.camRoom)L.push(['go','CCTV 기록 남음 — '+placeName(S.camRoom.x,S.camRoom.y,S.camRoom.fl)+' 보안실에서 삭제 · 전선 분리로는 지워지지 않음']);
  if (S.exitOpen && STAGE.steps && (S.tutI || 0) >= STAGE.steps.length) L.push(['go', '탈출 지점(노란 원)으로']);
  if ((STAGE.keyBld || STAGE.keyDoors) && !STAGE.tutorial) { if (S.doors.some(d => d.keyLock)) L.push([P.hasKey || !S.doors.some(d => d.keyLock && d.locked) ? 'done' : '', P.hasKey ? '열쇠 있음' : '열쇠 확보 (또는 창문·옥상으로)']); }
  else { const ks = Object.keys(P.keys || {}); if (ks.length) L.push(['info', '가진 것: ' + ks.map(keyName).join(', ')]); }
  (S.learned || []).forEach(t => L.push(['info', '알아낸 것: ' + t]));
  if (P.disguise) L.push([P.disguiseBlown ? 'go' : 'info', STAGE.zones ? (P.disguiseBlown ? `${outfitName(P.outfit)} 발각 · 다른 옷 필요` : `${outfitName(P.outfit)} · 허용 구역만 통과 · 가까운 신원 확인 주의`) : P.disguiseBlown ? '변장 발각 · 다른 옷 필요' : '변장 중 · 허용된 구역에서는 통과 가능']);
  if (STAGE.shift && S.shiftI < STAGE.shift.add.length) L.push(['', `다음 교대까지 ${Math.max(0, Math.ceil(S.shiftT))}초 — 순찰이 늘어난다`]);
  for (const g of S.guards) if (g.target) { const sc = schedText(g),down=targetEliminated(g); L.push([down||S.spare ? 'done' : '', targetName(g) + (down?' — 처치 완료':S.spare ? ' — 살려 둘 수 있다' : ' — ' + (sc || targetKnowledge(g).where))]); }
  S.items.forEach((it, i) => L.push([it.got ? 'done' : '', ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' — ' + place(it.x, it.y, it.fl, it.b)]));
  if (P.item) L.push(['info', '들고 있는 것: ' + P.item.name + (P.item.permit ? ' (배달하러 온 사람으로 통하는 곳이 있다)' : '')]);
  storyLines().forEach(l => L.push(l));
  if (showOpps) for (const o of S.opps || []) if (o.seen) { const pl = o.x != null ? (o.roof ? place(o.x, o.y, o.fl).replace(/ \d+층$/, ' 옥상') : place(o.x, o.y, o.fl)) : ''; L.push([oppDone(o) ? 'opp done' : 'opp', '기회: ' + oppText(o) + (pl && pl !== '바깥' ? ' — ' + pl : '')]); }
  if (S.timeLeft) L.push([S.timeLeft < 60 ? 'go' : '', `남은 시간 ${Math.floor(S.timeLeft / 60)}:${String(Math.floor(S.timeLeft % 60)).padStart(2, '0')}`]);
  return L;
}
// 층·높이가 바뀌면 화면 가운데 위에 큰 글씨로 잠깐 (지금 몇 층인지 바로 알게)
function floorBanner(P, ptx, pty) {
  const bi = bldAt(ptx, pty), indoor = bi >= 0 && !BLD[bi].vacant;
  const secure=STAGE.zones&&!P.z&&zoneInfo(P.x,P.y,0,flOf(P)).secure;
  const k = P.vent ? '환풍구 안' : P.under ? '지하 수로' : P.wire ? '' : P.fl ? `${P.fl + 1}층${secure?' · 보안구역 · 복장 통행 불가':' 실내'}` : P.z ? `${P.z}층 옥상` : indoor ? '1층 실내' : '거리';
  if (!k || P.trav || P.jump) return; const el = $('floorBan'); if (!el) return;
  if (S._flk == null) { S._flk = k; return; }
  if (k === S._flk) return; S._flk = k; el.textContent = k; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function updateHUD(force) {
  if (force) hudCache = {};
  updateSkillPrompt(force);
  syncAssassinHUD();
  const P = S.player;
  hud.act.hidden=STAGE.starterContract==='camera'&&!S.guards.length;
  syncMissionIdentity();
  syncTutorialCue();
  { const e=$('saveState'); if(e){e.hidden=S.cpSavedAt==null || S.t-S.cpSavedAt>2.5; e.textContent=(S.cpStored?'저장됨':'이번 실행에 저장됨')+(isTouch?' · 메뉴에서 재시도':' · F9 재시도');} }
  drawWanted();
  const targets=S.spare?[]:S.guards.filter(g=>g.target),first=!!STAGE.firstGoal,total=targets.length+S.items.length+(first?1:0),done=targets.filter(g=>targetEliminated(g)).length+S.items.filter(i=>i.got).length+(first&&!pendingFirstGoal()?1:0);
  const missionSuffix=mainContract(STAGE)&&total?' · '+(S.exitOpen?'탈출 가능':`목표 ${done}/${total}`)+(evidencePending()?' · CCTV 기록 남음':''):'';
  setText(hud.objT, 'objT', (mainContract(STAGE)?STAGE.sub+' · ':'')+STAGE.name+missionSuffix);
  { const html = objectiveLines().map(([c, t, story]) => `<span class="ol ${c}">${story?`<button type="button" data-story-route="${story}">${t} · 추적</button>`:c.includes('goal') ? t.replace(/^의뢰: /,'') : t}</span>`).join(''); if (hudCache.objH !== html) { hudCache.objH = html; hud.obj.innerHTML = html; } }
  hud.obj.classList.toggle('urgent', !!S.timeLeft && S.timeLeft < 60);
  const lv = P.hidden ? 0 : P.light;
  hud.light.style.width = Math.round(lv * 100) + '%';
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), bi = bldAt(ptx, pty), indoor = bi >= 0 && !BLD[bi].vacant;
  const bnm = !P.z && !P.wire && bldAt(ptx, pty) >= 0 && BLD[bldAt(ptx, pty)].name ? ' · ' + BLD[bldAt(ptx, pty)].name : '';
  const zi0 = STAGE.zones ? pZoneInfo() : null, zk0 = zi0 ? zi0.k : STAGE.tutorial ? -1 : Z_HOS, ok0 = zi0 && permitted(zi0);
  setText(hud.layer, 'layer', (zk0 >= 0 && !P.vent && !P.under ? (zi0.secure ? '보안구역' : ok0 ? '통과' : ['공개', '금지', '적진'][zk0]) + ' · ' : '') + (P.vent ? '환풍구' : P.under ? '지하 수로' : P.wire ? '전깃줄' : P.fl ? `${P.fl + 1}층` : P.z ? `${P.z}층 옥상` : indoor ? '1층' : '지상') + (STAGE.zones ? '' : bnm));
  floorBanner(P, ptx, pty);
  hud.layer.dataset.l = P.vent ? 'vent' : P.under ? 'under' : P.z ? 'roof' : indoor ? 'in' : 'out';
  hud.layer.dataset.z = !P.vent && !P.under && zk0 >= 0 ? (ok0 ? 'pub' : ['pub', 'res', 'hos'][zk0]) : '';
  hud.light.dataset.level = P.hidden ? 'hid' : lv > 0.55 ? 'hi' : lv > 0.22 ? 'mid' : 'lo';
  setText(hud.mode, 'mode', input.aiming ? TOOL_NAME[input.tool] + ' 조준' : P.interact ? P.interact.label : P.pick ? '작업 중' : P.hide ? '은신 중' : P.captive ? '붙잡음 · ' + Math.max(0, Math.ceil(9 - P.captive.captT)) + '초' : P.carrying ? '운반 중' : P.cover ? (P.cover.kind === 'tree' ? '나무에 붙음' : P.cover.kind === 'car' ? '차 뒤에 붙음' : '벽에 붙음') + ' · 은폐 효과 · 발소리 없음' : P.trav ? '이동 중' : (input.sneakToggle ? '[웅크림] ' : input.walkLock ? '[항상 걷기] ' : '') + { sneak: '웅크림', walk: '걷기', run: '달리기' }[P.mode] + (loudMul(P.x, P.y, flOf(P)) < 1 ? (loudMul(P.x, P.y, flOf(P)) < 0.5 ? ' · 발소리가 음악에 묻힘' : ' · 주변 음악 소리') : ''));
  if(STAGE.artSlice){const constrained=!!(P.under||P.vent);if(hudCache.passageMove!==constrained){hudCache.passageMove=constrained;syncSneakBtn();}}
  syncTools();
  setText(hud.kills, 'k', '처치 ' + S.stats.kills);
  const fleeNow = S.fleeing && S.guards.some(g => g.state === 'FLEE');
  // 경계: 한 칸에 단계 이름 + 남은 시간 (따로 뜨던 경보 칸은 표적 도주 때만)
  hud.alarm.hidden = !fleeNow; hud.alarm.dataset.lv = S.alevel;
  if (fleeNow) setText(hud.alarm, 'al', '표적 도주');
  { const t = S.alevel === 3 ? (S.guards.some(g=>g.state==='ALERT'&&g.seen)?'추격 중 · 시야 끊기':'추적 해제 '+Math.max(0,Math.ceil(ESCAPE_T-S.unseenT))+'초') : S.alevel ? A_NAME[S.alevel] + ' ' + Math.ceil(S.alevelT) + '초' : '평온';
    setText($('alertWord'), 'aw', t); const ab = $('alertBox'); if (ab && ab.dataset.lv !== String(S.alevel)) ab.dataset.lv = S.alevel; }
  hud.pips.forEach((p, i) => p.classList.toggle('on', i < S.alevel));
  { const hb = $('hpBox'), low = P.hp <= 1 && P.hpMax > 1 ? '1' : '0'; if (hb && hb.dataset.low !== low) hb.dataset.low = low; }  // 마지막 체력: 경고색으로 표시한다
  { const v = $('alertVig'); if (v) { const chase = S.guards.some(g => g.state === 'ALERT' && !g.civ && g.seen), a = S.over ? 0 : chase ? 3 : S.alevel >= 2 ? 2 : S.alevel >= 1 ? 1 : 0; if (hudCache.vig !== a) { hudCache.vig = a; v.dataset.a = a; } } }  // 화면 가장자리 경계 빛
  if (!document.body.classList.contains('joyseen') && S.t > 12) { document.body.classList.add('joyseen'); try { localStorage.setItem('yahaeng.joyseen', '1'); } catch (e) {} }
  const hpKey = P.hp + '/' + P.hpMax; if (hudCache.hp !== hpKey) { hudCache.hp = hpKey; hud.hp.setAttribute('role','img'); hud.hp.setAttribute('aria-label', '체력 '+hpKey); hud.hp.innerHTML = Array.from({ length: P.hpMax }, (_, i) => `<i aria-hidden="true" class="${i < P.hp ? 'on' : ''}"></i>`).join(''); }
  updateHelpTip();
  { const pl = $('pickLbl'); if (pl) { pl.hidden = false; setText(pl, 'picks', '락픽 ' + (P.picks || 0)); } }
  // 버튼 넷: [공격] 사람에게만 · [행동] 시설·시체 · [붙잡기] 등 뒤에서 · [다트](도구)
  const ka = attackAction(), ea = envAction(), ga = grabAction();
  padButton(hud.act, 'actH', ka, '공격');
  hud.act.classList.toggle('ready', ka.k !== 'none'&&!ka.busy&&!ka.skillLocked);
  const ki = ka.k === 'cap' ? (ka.hold ? 'ko' : 'kill') : ka.k !== 'none' ? actIcon(ka) : ka.stalk ? (koTap(ka.stalk) ? 'ko' : 'kill') : '';
  hud.act.classList.toggle('kill', ki === 'kill'); hud.act.classList.toggle('ko', ki === 'ko');
  const flow=P.trav?.hideFlow||P.trav?.ventPull||S.amb,held=P.skillHold||S.koHold||P.lethalHold||(flow?.intent&&flow.holding&&!flow.committed?flow.intent:null), source = held && held.source && held.source.id, progress = holdFrac().toFixed(3);
  hud.act.style.setProperty('--hold', COMBAT_INPUTS.atk.includes(source) ? progress : '0');
  hud.carry.style.setProperty('--hold', COMBAT_INPUTS.env.includes(source) ? progress : '0');
  padButton(hud.carry, 'carryH', ea, P.ledge || P.wire ? '올라가기' : '행동');
  hud.carry.classList.toggle('ready', !!ea.bufferable||ea.k !== 'none'&&!ea.skillLocked);
  { const cb = $('btnCycle'); if (cb) { const n = ea.choices || 0; cb.hidden = !(n > 1 || ea.blocked&&n>0); if (!cb.hidden) setText($('cycleN'), 'cycN', ea.blocked?'다시 선택':(ea.choiceI + 1) + '/' + n); } }
  { const gb = $('btnGrab'); if (gb) { const label = P.ledge || P.wire ? '떨어지기' : P.captive ? (canInterrogate() ? '심문' : '붙잡음') : '붙잡기', html = hudArt('grab')+`<b>${label}</b>${ga.reason ? `<small>${ga.reason}</small>` : ''}`; if (hudCache.grabH !== html) { hudCache.grabH = html; gb.innerHTML = html; } gb.classList.toggle('ready', ga.k !== 'none' || canInterrogate()); gb.classList.toggle('hinting', !!ga.near); gb.setAttribute('aria-label', ga.blocked ? '떨어지기 불가 — 착지할 곳 없음' : label + (ga.reason ? ' · ' + ga.reason : '')); } }
  { const db=$('btnDress'),gb=$('btnGrab'),changing=P.interact?.pose==='dress';
    const dress=!STAGE.tutorial&&!P.captive&&!P.ledge&&!P.wire&&(changing?{k:'dress',busy:true,label:'갈아입는 중'}:ga.k==='none'?clothingAction():null);
    db.hidden=!dress;db.disabled=!!changing;gb.hidden=!!dress||!(ga.k!=='none'||P.captive||ga.near);
    if(dress){padButton(db,'dressH',dress,'옷 갈아입기');db.classList.toggle('ready',!changing);}
  }
  document.body.classList.toggle('actionfocus',playerActionFocus(ka,ga));
  keyMap(ka, ea, ga);
  // Measure after the header contents settle, even while the world is paused.
  drawMini();updateStealth(lv);
  document.body.classList.toggle('inspecting',hudInspecting());
  positionEnvPicker();
}
// 은신 상태 표시 (화면 위 가운데): 숨음 · 섞임 · 신원 확인 · 발각 + 이유 한 줄
const STH_ICO = {
  camera:'<svg viewBox="0 0 24 24"><path d="M3 7h13v10H3zM16 10l5-3v10l-5-3M7 17v4M4 21h9"/></svg>',
  hide: '<svg viewBox="0 0 24 24"><path d="M3 11c2.5 3.2 5.5 4.8 9 4.8s6.5-1.6 9-4.8"/><path d="M6.5 14.6l-1.6 2.2M12 15.8v2.6M17.5 14.6l1.6 2.2"/></svg>',
  blend: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="8" r="3"/><path d="M2.5 20c.6-3.6 2.8-5.6 5.5-5.6s4.9 2 5.5 5.6M11.5 15.3c1.2-.6 2.9-.9 5-.9 2.7 0 4.9 2 5.5 5.6"/></svg>',
  risk: '<svg viewBox="0 0 24 24"><path d="M2.5 12c2.6-4 5.8-6 9.5-6s6.9 2 9.5 6c-2.6 4-5.8 6-9.5 6s-6.9-2-9.5-6z"/><path d="M5 12h14" opacity=".55"/><path class="f" d="M8.8 12a3.2 3.2 0 006.4 0z"/></svg>',
  wall: '<svg viewBox="0 0 24 24"><path d="M4 3v18"/><path d="M4 7h3M4 12h3M4 17h3" opacity=".6"/><circle cx="12.5" cy="6.5" r="2.3"/><path d="M10.5 21v-6l-1-4.5 3-1.5 2.5 3.5h3"/></svg>',
  seen: '<svg viewBox="0 0 24 24"><path d="M2.5 12c2.6-4 5.8-6 9.5-6s6.9 2 9.5 6c-2.6 4-5.8 6-9.5 6s-6.9-2-9.5-6z"/><circle class="f" cx="12" cy="12" r="3.6"/></svg>'
};
function updateStealth(lv) {
  const box = $('stealth'); if (!box || !S) return; const P = S.player;
  syncSecurityReadout();
  { const r = box.getBoundingClientRect(), sx = (P.x - cam.x) * SCALE + W / 2, sy = (P.y - cam.y) * SCALE + H / 2, u = sx > r.left - 24 && sx < r.right + 24 && sy > r.top - 30 && sy < r.bottom + 60;  // 주인공과 겹치면 흐리게
    if (hudCache.sthU !== u) { hudCache.sthU = u; box.classList.toggle('under', u); } }
  const e = P.hide || P.under || P.vent ? 0 : S.expo || 0;
  const observer=activeObserver(), eyeG=observer?.phase==='check'&&(observer.g.eyeT||0)>.05?observer.g:null,  // 눈썰미 있는 사람이 변장을 살피는 중
    runNear = STAGE.zones && P.mode === 'run' && P.moving && S.guards.some(g => !['DEAD','CAPTIVE'].includes(g.state) && !g.dog && flOf(g) === flOf(P) && (g.z||0)===(P.z||0) && publicSuspicion(g) > 0 && dist(g.x,g.y,P.x,P.y)<220 && los(g.x,g.y,P.x,P.y,P.z||0)),
    sus = STAGE.zones && suspAct(null) >= 1, pub = STAGE.zones && !P.hide && !P.hidden && !P.under && !P.vent && !P.z && pZoneEff() === Z_PUB && !sus;  // 시체·붙잡은 사람을 끌고 있으면 공개 구역이어도 섞이지 않는다
  const zi = STAGE.zones ? pZoneInfo() : null, banned = zi && zi.k !== Z_PUB && !permitted(zi);
  const inBush = !P.z && tileAt(P.x, P.y) === 'B';
  let s, word, why;
  if (e === 2 || observer?.phase==='seen') { s = 'seen'; word = '발각'; why = banned ? zi.secure?'보안구역 침입':'무단 침입' : '신원 노출'; }
  else if(observer?.camera){s='risk';word=observer.g.search?'서치라이트에 노출':'CCTV 녹화 게이지';why=cameraAssessment(observer.g).reason+' · 가득 차기 전에 시야 밖으로';}
  else if(P.hide?.spotted){s='risk';word='은신처 노출';why='들어가는 것을 봤다 · 다른 곳으로';}
  else if(observer?.g.state==='WARN'){s='risk';word='퇴거 경고 · '+Math.max(0,Math.ceil(observer.g.warnEnd-S.t))+'초';why=(zi?.secure?'보안구역':'출입 권한 없음')+' · 허용 구역으로 나가세요';}
  else if (eyeG && !P.hide && !P.hidden) { s = 'risk'; word = '신원 확인 중'; why = '마주 보는 중 · 걸어서 벗어나기'; }
  else if (observer?.phase==='suspect'&&!P.hide&&!P.hidden) { s='risk';word='의심받는 중';why='신원 미확인'; }
  else if (P.disguiseBlown && !P.hide && !P.hidden && !P.under && !P.vent) { s = 'risk'; word = '변장 노출'; why = S.knownLooks?.[suspectLook()] ? '인상착의 무전됨' : '목격자가 기억함'; }
  else if(S.alevel>=2&&S.knownLooks?.[suspectLook()]&&!P.hide&&!P.hidden){s='risk';word='인상착의 공유됨';why='같은 차림을 알아보면 추격 · 시야 밖에서 변장';}
  else if (runNear && !P.hide && !P.hidden && (pub || STAGE.zones)) { s = 'risk'; word = '수상함'; why = '달리기'; }
  else if (sus && !P.hide && !P.hidden) { s = 'risk'; word = '수상함'; why = P.carrying ? (P.carrying.ko ? '기절자 운반' : '시체 운반') : P.captive ? '사람을 붙잡고 있다' : '수상한 행동 중'; }
  else if (P.cover && e < 2) { s = e === 1 ? 'risk' : 'hide'; word = '벽에 붙음'; why = e === 1 ? '빛에 노출' : `엄폐`; }  // 벽에 붙으면 공개 구역이어도 '섞임' 대신 붙은 상태를 보여 준다
  else if (e === 1 && !pub) { const watched=physicallyObserved();s = watched?'risk':'hide';word = watched?'시야 안':'시야 밖';why = inBush && !P.hidden ? '웅크려야 숨는다' : watched ? '발견 게이지가 차기 전에 시야 밖으로' : banned ? '통행 불가 · 경비가 돌아보면 발각 위험' : '돌아보면 보일 수 있음'; }
  else if(inBush&&!P.hidden&&!P.hide&&!P.under&&!P.vent){s='risk';word='몸을 낮추세요';why='서 있으면 화단에 숨지 못한다';}
  else if(!e&&P.mode==='sneak'&&lv<.22&&!P.hide&&!P.hidden&&!P.under&&!P.vent&&!pub){s='hide';word='그늘 속';why='발소리를 낮춰 접근';}
  else if (pub) { s = 'blend'; word = S.alevel>=2?(physicallyObserved()?'통행 중':'현재 시야 밖'):'의심 없음'; why = S.alevel>=2?'주변 수색 중 · 통행만 허용 · 수상한 행동 주의':disguised() ? '통행만 허용 · 신원 확인과 작업은 별도' : '공개 구역의 평범한 통행'; }
  else { s = 'hide'; word = '숨음'; why = P.vent ? '환풍구 안' : P.under ? '지하 수로' : P.hide ? hideName(P.hide) + ' 안' : P.hidden ? '화단 · 웅크림' : P.cover ? '엄폐 중' : inBush ? '웅크려야 숨는다' : lv < 0.22 ? '어둠 속' : '시야 밖'; }
  { // 위험 막대(어쌔신 크리드 섀도우즈식): 나를 가장 많이 알아챈 사람의 게이지만큼 눈 양옆이 찬다
    const r=observer?.progress||0;

    const w = Math.round(Math.min(1, r) * 100) + '%'; if (hudCache.sthW !== w) { hudCache.sthW = w; $('sthWL').style.width = w; $('sthWR').style.width = w; } }
  if(s==='hide'&&S.alevel>=2&&(P.hide||P.hidden))why='수색 중 · 은신처도 확인한다';
  box.classList.toggle('quiet',(s==='blend'||s==='hide')&&!observer?.progress&&!P.captive&&!P.carrying&&S.alevel<2);
  const passCamera=(S.cams||[]).some(c=>!c.search&&cameraAssessment(c).visible>0&&!cameraAssessment(c).detectable);
  box.dataset.camera=passCamera?'pass':'';if(passCamera&&s==='blend')why='CCTV 통행 허용 · 훔치면 녹화 대상';
  const cause=searchCauseReadout();if(cause)why=cause.text+(observer?.camera?' · CCTV 시야에서 벗어나기':s==='hide'&&(P.hide||P.hidden)?' · 은신 유지':'');
  const k = s + '|' + word + '|' + why; if (hudCache.sth === k) return; hudCache.sth = k;
  if (hudCache.sthS && hudCache.sthS !== s && S.t - (hudCache.sthSfxT || -9) > 0.35) { hudCache.sthSfxT = S.t; sfx({ hide: 'toHide', blend: 'toBlend', risk: 'toRisk', seen: 'toSeen' }[s]); } hudCache.sthS = s;  // 상태가 바뀌면 작은 신호음
  box.dataset.s = s; const el = $('expoLbl'); el.textContent = word; el.dataset.e = s==='seen'?2:e; $('lightLbl').textContent = why;
  const ico = observer?.camera?'camera':P.cover ? 'wall' : s; if (hudCache.sthI !== ico) { hudCache.sthI = ico; $('sthIco').innerHTML = STH_ICO[ico]; }
}
// 도구 선택 표시 (아래 오른쪽 작은 칸 + 도구 버튼 글자)
function syncTools() {
  if (!S) return; const P = S.player;
  const known=availableTools();if(!known.includes(input.tool)){input.tool=known.find(t=>toolCount(t)>0)||'stone';input.aiming=null;}
  document.querySelectorAll('#tools .tool').forEach(b => {
    const t = b.dataset.t;b.hidden=!availableTools().includes(t); b.classList.toggle('on', t === input.tool&&!input.padWhistle);b.setAttribute('aria-pressed',String(t===input.tool&&!input.padWhistle)); b.classList.toggle('empty', toolCount(t) <= 0);
    setText(b.querySelector('span'), 'tc_' + t, t==='radio'&&!P.hasRadio?'미확보':t==='hack'?'':String(toolCount(t)));
  });
  { const art=P.captive?'grab':input.padWhistle?'whistle':input.tool==='kunai'?'dart':input.tool;const html=hudArt(art)+(P.captive ? `<b>${canInterrogate() ? '심문' : '—'}</b>` : input.padWhistle ? `<b>휘파람</b><small>${S.whistleT > 0 ? '잠시 뒤' : '부르기'}</small>` : `<b>${TOOL_NAME[input.tool]} ${['radio','hack'].includes(input.tool)?'':toolCount(input.tool)}</b>${toolCount(input.tool)<=0?'<small>장비에서 선택</small>':toolDetail(input.tool)?'<small>'+toolDetail(input.tool)+'</small>':''}`); if (hudCache.toolH !== html) { hudCache.toolH = html; hud.tool.innerHTML = html; } }
  hud.tool.setAttribute('aria-label',P.captive?'심문':input.padWhistle?'휘파람으로 유인':toolCount(input.tool)<=0?TOOL_NAME[input.tool]+' 없음 · 장비에서 다른 도구 선택':input.tool==='kunai'?'다트: 짧게 눌렀다 떼면 기절, 1초 이상 눌렀다 떼면 처치':TOOL_NAME[input.tool]+' · '+toolDetail(input.tool));
  if(!input.padWhistle&&['kunai','blade'].includes(input.tool))hud.tool.setAttribute('aria-label',hud.tool.getAttribute('aria-label')+' · '+toolDetail(input.tool));
  hud.tool.classList.toggle('aiming', !!input.aiming);hud.tool.dataset.art=input.padWhistle?'whistle':input.tool==='kunai'?'dart':input.tool;$('btnWhistle').setAttribute('aria-pressed',String(!!input.padWhistle));
  hud.tool.hidden=!!(STAGE.starterContract||STAGE.apprenticeContract)&&!P.captive&&!input.padWhistle&&toolCount(input.tool)<=0;
  const ready=deviceReady(input.tool)&&!actionBusy(P)&&(P.captive?canInterrogate():input.padWhistle?!(S.whistleT>0)&&!P.under&&!P.vent&&!P.wire:canAim()&&toolCount(input.tool)>0&&(!['kunai','blade'].includes(input.tool)||!!kunaiTarget())&&(input.tool!=='hack'||!!hackTarget()));
  hud.tool.classList.toggle('ready',ready);hud.tool.setAttribute('aria-disabled',String(!ready));
}

function endGame(win, reason) { closeKeypad();clearPlayerInput();closeEnvPicker();
  if (S.over) return;
  S.over = true;
  if (!win && (STAGE.tutorial||introductoryContract(STAGE)) && cpReady()) { play('lose', 0.5); toast(((STAGE.firstSteps||STAGE.skillPractice||STAGE.securityLesson||introductoryContract(STAGE))?reason:'들켰다')+' · 이 단계부터 다시',2); const run = S; setTimeout(() => { if (S === run && S.over) loadCheckpoint(); }, 1300); return; }  // 연습: 죽어도 그 자리에서 다시
  play(win ? 'win' : 'lose', 0.7); resetDialog();
  const run = S; setTimeout(() => { if (S === run) showEnd(win, reason); }, win ? 500 : 800);
}
// 임무 경로 지도 (Hitman식): 지나간 길·처치·발각·시체 발견 위치
function drawEndMap() {
  const cv = document.getElementById('endMap'); if (!cv || !S) return;
  const wmax = Math.min(560, (window.innerWidth || 600) - 40), base = buildMiniBase(wmax, 300), s = base.s, T = v => v / TILE * s;
  cv.width = base.width; cv.height = base.height; const x = cv.getContext('2d');
  x.globalAlpha = 0.85; x.drawImage(base, 0, 0); x.globalAlpha = 1;
  const tr = S.trail || [];
  if (tr.length > 1) { x.lineWidth = 2; x.lineJoin = 'round';
    for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i]; if (dist(a.x, a.y, b.x, b.y) > 300) continue; x.strokeStyle = b.z || b.fl ? 'rgba(242,196,107,.9)' : 'rgba(120,210,255,.85)'; x.beginPath(); x.moveTo(T(a.x), T(a.y)); x.lineTo(T(b.x), T(b.y)); x.stroke(); } }
  if (tr[0]) { x.fillStyle = '#78d2ff'; x.beginPath(); x.arc(T(tr[0].x), T(tr[0].y), 4, 0, TAU); x.fill(); }
  const ex = S.exit; if (ex) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; x.beginPath(); x.arc(T(ex.x), T(ex.y), 6, 0, TAU); x.stroke(); }
  for (const e of S.events || []) {
    const px = T(e.x), py = T(e.y);
    if (e.k === 'seen') { x.fillStyle = '#ff9a3c'; x.font = uiFont(13); x.textAlign = 'center'; x.fillText('!', px, py + 4); continue; }
    if (e.k === 'found') { x.strokeStyle = '#ff5a4a'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.stroke(); continue; }
    x.strokeStyle = e.k === 'accident' ? '#f2c46b' : e.k === 'target' ? '#ff3a3a' : '#e8473c'; x.lineWidth = e.k === 'target' ? 3 : 2;
    x.beginPath(); x.moveTo(px - 4, py - 4); x.lineTo(px + 4, py + 4); x.moveTo(px + 4, py - 4); x.lineTo(px - 4, py + 4); x.stroke();
  }
}
const END_MAIN = ['접근 방식','수고비','소요 시간','발각 횟수'];  // 결과 화면에 바로 보이는 줄 (나머지는 '자세히'에)
function showEnd(win, reason) {
  closeKeypad();clearPlayerInput();closeEnvPicker();
  running = false;
  const st = S.stats, t = Math.floor(S.t);
  const hasTargets = S.guards.some(g => g.target);
  let rank = '';
  if (win) {
    // 그림자 조건 (히트맨의 사일런트 어새신식): 다섯 가지를 모두 채우면 그림자
    // 근처만 알아챈 발각은 괜찮다 — 무전으로 퍼지지만 않으면
    const bonus = [['전체 경보 0', !(st.full || 0)], ['주민 살상 0', st.extraKills === 0], ['시체·기절자 발견 0', st.bodies === 0], ['목격자 0', STAGE.zones ? !(st.witness || 0) : !(st.screams || 0)], ['남은 CCTV 기록 0', !evidencePending() && !(st.camRec || 0)]];
    S.bonus = bonus;
    if (STAGE.challenges) {
      loadSkillTree();const all = loadCh(), before=skillRewardRows(STAGE,all), mine = all[STAGE.id] || (all[STAGE.id] = {}); mine._clear = true; if (S.mod) mine['mod_' + S.mod] = true;
      S.chRes = STAGE.challenges.map(id => { const ok = !!(CH[id] && CH[id][1]()), fresh = ok && !mine[id]; if (ok) mine[id] = true; return [id, ok, fresh, !!mine[id]]; });
      S.skillRewards=skillRewardRows(STAGE,all).filter(r=>r.earned&&!before.find(b=>b.id===r.id)?.earned);recordVipApproach(all);saveCh(all);
    }
    const n = bonus.filter(b => b[1]).length;
    rank = n === 5 ? '그림자' : n === 4 ? '암살자' : n === 3 ? '침입자' : '소란꾼';
    saveBest(STAGE.id + '_' + DKEY, rank); saveBest(STAGE.id, rank); clearStoredCP(STAGE.id);  // 깬 의뢰의 체크포인트는 지운다
  }
  $('endTitle').textContent = win ? (STAGE.tutorial ? '연습 끝' : '임무 완료') : '실패';
  $('endSub').textContent = win ? (STAGE.endText ? STAGE.endText : STAGE.firstSteps ? '시야를 피해 숨고 소리로 시선을 돌렸다. 다음은 가까이 접근해 제압하는 연습이다.' : STAGE.skillPractice ? '동시 암살과 연속 암살 연습을 마쳤다. 미션 완료와 업적 보상으로 필요한 기술을 배울 수 있다.' : STAGE.toolPractice ? '도구 연습을 마쳤다. 기술 트리에서 필요한 장비를 골라 배우자.' : STAGE.id === 'tI' ? '의뢰 01을 시작할 수 있다.' : STAGE.id === 't0' ? '은신 → 가까이 제압 → 몸 숨기기. 다음은 복장 통행과 CCTV 판정을 익힌다.' : STAGE.tutorial ? '고급 기술까지 익혔다. 이제 의뢰 01부터 시작하자.' : STAGE.endText || '') : (reason || '') + ' 경로와 타이밍을 바꿔 다시 시도해 보자.';
  { const rb = $('endRank'); if (rb) { rb.hidden = !(win && rank); rb.dataset.r = rank; rb.innerHTML = rank ? `<small>등급</small><b>${rank}</b>` : ''; } }
  if (win && STAGE.spare) { const tg = S.guards.find(g => g.target); $('endSub').textContent += ($('endSub').textContent ? ' · ' : '') + (tg && !targetEliminated(tg) ? STAGE.spare.endSpared : S.realized ? STAGE.spare.endRealized : STAGE.spare.endKilled); }
  const ttl = win ? playTitle(st) : null;
  // 들킨 대가: 경보가 무전으로 전체에 퍼졌을 때만 수고비를 깎는다 (전체 경보 1회 −15%, 민간인 살상 1명 −20%, 최대 −70%). 근처만 알아챈 발각은 깎지 않는다
  let feeRow = null; { const base = parseInt(STAGE.fee || '', 10); if (win && base > 0) { const cut = Math.min(0.7, (st.full || 0) * 0.15 + (st.extraKills || 0) * 0.2), got = Math.round(base * (1 - cut)), why = [st.full ? `전체 경보 ${st.full}회` : '', st.extraKills ? `주민 살상 ${st.extraKills}명` : ''].filter(Boolean).join(' · ');
    const purge = STAGE.purgeBonus && S.guards.filter(g => !g.civ && !g.dog && !g.reinf).every(g => g.state === 'DEAD' || g.state === 'CAPTIVE');  // 몰살 보너스
    // 깔끔한 처리의 보상: 표적을 모두 사고로 처리하면 +20%, 시체 발견·목격자 없이 끝내면 +10%
    const tc0 = S.corpses.filter(c => c.target), acc = tc0.length && tc0.length === S.guards.filter(g => g.target).length && tc0.every(c => c.accident), clean = !st.bodies && !(st.witness || 0);
    const adds = [purge ? ['전원 제압', STAGE.purgeBonus] : null, acc ? ['사고 처리', Math.round(base * 0.2)] : null, clean ? ['흔적 없음', Math.round(base * 0.1)] : null].filter(Boolean), bonus = adds.reduce((s, a) => s + a[1], 0), addTxt = adds.map(a => `${a[0]} +${a[1]}만`).join(' · ');
    feeRow = ['수고비', (cut > 0 ? `${got + bonus}만 (기본 ${base}만 · 감점 ${base - got}만: ${why}` + (bonus ? ` · ${addTxt}` : '') + ')' : bonus ? `${base + bonus}만 (전액 + ${addTxt})` : `${base}만 전액`)]; S.feeGot = got + bonus; } }
  $('endStats').innerHTML = (win && S.missionApproach ? [['접근 방식',S.missionApproach]] : []).concat(ttl ? [['칭호', ttl[0] + ' — ' + ttl[1]]] : []).concat(feeRow ? [[feeRow[0],S.feeGot+'만']] : []).concat(feeRow&&feeRow[1].includes('(')?[['정산 내역',feeRow[1]]]:[]).concat([
    ['소요 시간', Math.floor(t / 60) + '분 ' + String(t % 60).padStart(2, '0') + '초'], ['조직원 처치', (st.crewKills || 0) + '명' + (st.maxStreak >= 2 ? ` (최대 ${st.maxStreak}연속)` : '')], ['주민 살상', st.extraKills + '명'], ['특수 제압·처치', st.special + '회'], ['발각 횟수', st.detected + '회'], ['CCTV 신원 녹화', st.camEver == null ? '이전 저장 · 이력 없음' : st.camEver + '회' + (st.camEver && !evidencePending() ? ' · 기록 삭제됨' : '')],
    ['발견된 시체·기절자', st.bodies + '명'], ['숨긴 시체·기절자', st.stashed + '명'], ['기절시킨 사람', (st.ko || 0) + '명'], [STAGE.zones ? '신고한 주민' : '주민 비명', (STAGE.zones ? st.witness || 0 : st.screams || 0) + (STAGE.zones ? '명' : '회')], ['빈 캔·다트', st.stonesUsed + ' · ' + st.kunaiUsed],
    ...[['쿠나이','bladesUsed'],['연막탄','smokesUsed'],['허위 무전','radioDecoys'],['CCTV 해킹','hacks']].filter(([,k])=>st[k]>0).map(([name,k])=>[name,st[k]+'회'])
  ]).concat(st.interro ? [['심문', st.interro + '명']] : []).concat(st.counters ? [['반격', st.counters + '회']] : []).concat(st.fights ? [['조직 싸움', st.fights + '회' + (st.war ? ' · 전쟁' : '')]] : []).concat(st.npcDown ? [['조직이 쓰러뜨린 사람', st.npcDown + '명' + (st.npcCiv ? ` (주민 ${st.npcCiv})` : '') + ' · 감점 없음']] : []).concat(st.cpUsed ? [['체크포인트 재시작', st.cpUsed + '회']] : []).map(r => `<div class="${END_MAIN.includes(r[0]) ? 'main' : 'more'}"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  { const mo = $('endMore'); if (mo) { mo.innerHTML = ''; $('endStats').querySelectorAll('.more').forEach(d => mo.appendChild(d)); } }
  $('endRankNote').innerHTML = !win ? '' : STAGE.challenges ? (() => { const n = starsOf(STAGE), max = 1 + STAGE.challenges.length;
      return `<div class="ent"><b>등급 조건</b> · 5개 모두 달성 시 그림자 — ${S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ')}</div><div class="stars">${'★'.repeat(n)}${'☆'.repeat(max - n)} <small>별 ${n}/${max}</small></div>` + S.chRes.map(([id, ok, fresh, ever]) => `<span class="bn ${ok ? 'ok' : ''}">${ok ? '●' : ever ? '◐' : '○'} ${chName(id)}${fresh ? ' <b>새로 달성</b>' : ''}</span>`).join(' ')
        + (ENTRY_PICK && (STAGE.entries || []).some(e => e.need && e.need <= n) ? `<div class="ent">열린 진입로: ${(STAGE.entries || []).filter(e => (e.need || 0) <= n).map(e => e.name).join(' · ')}</div>` : ''); })()
      : '보너스 목표 ' + S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ');
  if (S.mod) $('endRankNote').innerHTML += `<div class="ent">변형: ${MODS[S.mod][0]}${win ? ' · 완료' : ''}</div>`;
  if(win&&!STAGE.tutorial){const rewards=S.skillRewards||[],sum=rewards.reduce((n,r)=>n+r.points,0);$('endRankNote').innerHTML+=`<div class="ent skill-receipt"><b>기술 포인트 +${sum}P</b>${sum?rewards.map(r=>'<div>'+r.name+' · +'+r.points+'P</div>').join(''):' · 이미 받은 업적은 다시 지급되지 않는다.'}</div>`;}
  renderSkillPreparation('endSkills',true);$('endSkills').hidden||=!win&&!Object.keys(S.fieldSkillUses||{}).length;
  {const passport=$('vipPassport');passport.innerHTML=win?vipPassportHTML():'';passport.hidden=!passport.innerHTML;}
  if(win&&S.vipReceipt){const next=nextVipApproach();$('endSub').textContent=(S.vipReceipt.id?(S.vipReceipt.fresh?'새 공략 완료 · ':'공략 완료 · '):'임무 완료 · ')+S.vipReceipt.name+(S.vipReceipt.id?' · '+S.vipReceipt.count+'/'+VIP_APPROACHES.length+'가지 방법':'');$('btnRetry').textContent=next?'다른 방법으로':'다시 하기';$('btnRetry').title=next?next.name+' · '+next.hint:'';}else{$('btnRetry').textContent='다시 하기';$('btnRetry').title='';}
  if(win&&introductoryContract(STAGE)){$('endRank').hidden=true;$('endRankNote').innerHTML=(STAGE.starterContract||STAGE.apprenticeContract)?'<div class="ent">기술 포인트 +'+(S.skillRewards||[]).reduce((n,r)=>n+r.points,0)+'P · 다음 의뢰로 이어가세요.</div>':'';}
  drawEndMap();
  $('btnNext').textContent=learningNextLabel();
  $('btnNext').hidden = true;
  $('btnCP').hidden = win || !cpReady();
  $('btnCity').hidden = !(CITY_RET && !STAGE.city); if (win && CITY_RET && !STAGE.city) markCityDone(CITY_RET.id);  // 도시에서 받은 의뢰: 끝나면 도시로
  $('hud').hidden = true; $('joy').hidden = true; $('end').hidden = false; $('end').dataset.win = win ? '1' : '0';
  $('btnRetry').hidden=win;$('btnMenu').textContent='처음 화면';
  renderStageList();
  statsEnd(win ? 'clear' : 'fail', reason);  // 플레이 기록: 판 끝
  if(win)openEpisodeTraining();
}

document.querySelectorAll('.nocity').forEach(e => e.remove());
// 데모(itch) 빌드: 'all' 이면 도시 시제품만 빼고 전부, 목록이면 그 판만 (나머지는 잠긴 카드 하나로 알린다)
const demoOk = s => !window.__DEMO || (window.__DEMO === 'all' ? !s.city : window.__DEMO.includes(s.id));
// 첫 화면·의뢰 장부·도움말: 셋 중 하나만 보인다
function showMenu(which) { { const h = $('help'); if (h) h.classList.remove('over'); } ['intro', 'ledger', 'help'].forEach(id => { const el = $(id); if (el) el.hidden = id !== which; }); const el = $(which); if (el) el.scrollTop = 0; }
const RANK_TXT = r => r ? '최고 ' + r : '';
function renderStageList() {
  syncQuick();
  const best = loadBest(), next = quickTarget();
  const locked = STAGES.filter(s => !demoOk(s) && !s.city);
  const row = ([s, i]) => {
    const st = starsOf(s), all = s.challenges ? 1 + s.challenges.length : 0, rk = best[s.id + '_' + DKEY] || best[s.id];
    const stars = !introductoryContract(s) && s.challenges && st ? `<span class="st-stars ${st ? 'has' : ''}" aria-label="별 ${st}개 / ${all}개">★ ${st}</span>` : '';
    const modCount=Object.keys(MODS).filter(k=>(loadCh()[s.id]||{})['mod_'+k]).length;
    const mods=!s.tutorial&&modCount?`<span class="st-rank">추가 조건 ${modCount}/4</span>`:'';
    const map = !s.tutorial && window.__THUMBS && __THUMBS[s.id] ? `<img class="st-map" src="${INK_STUDY&&s.id==='m2'?window.__INK_VIP_MAP__:__THUMBS[s.id]}" alt="${s.name} 지도">` : '';
    const fee = s.fee ? `<span class="st-fee"><small>수고비</small>${s.fee}</span>` : '';
    const passport=s.id==='m2'?'<span class="st-rank">공략 '+Object.keys(vipApproachRecords()).length+'/'+VIP_APPROACHES.length+'</span>':'';
    const cardLine={m2:'클럽 실장 · 장부와 암호표',m4:'표적 둘 · 현금과 계약서',m6:'감방 탈출 · 무전기와 인계서',m7:'운송책 · 명세서 · 새벽배송 중단'};
    const sub = s.tutorial ? (((s.sub || '').match(/\(([^)]*)\)/) || ['', ''])[1]||s.sub||s.mission).replace(/, /g, ' · ') : (cardLine[s.id]||s.mission), tno = (s.name.match(/^연습 (\d)/) || ['', ''])[1];
    return `<button class="stage ${s.tutorial ? 'tut' : ''} ${i === next ? 'next' : ''}" type="button" data-i="${i}">
      <span class="st-no">${s.tutorial ? tno : s.apprenticeContract ? s.id.slice(1).padStart(2,"0") : introductoryContract(s) ? String(["p0","p1","p2"].indexOf(s.id)+1).padStart(2,"0") : contractNumber(s)}</span><span class="st-name">${s.name.replace(/^연습 \d · /, '')}</span>
      <span class="st-mis">${sub}</span>${map}
      <span class="st-foot">${i === next ? '<span class="st-next">다음 차례</span>' : ''}${stars}${!s.tutorial&&!s.city?'<span class="st-rank">기술 '+skillRewardRows(s).filter(r=>r.earned).reduce((n,r)=>n+r.points,0)+' / '+skillRewardRows(s).filter(r=>!r.retired||r.earned).reduce((n,r)=>n+r.points,0)+'P</span>':''}${rk&&!introductoryContract(s) ? `<span class="st-rank">${RANK_TXT(rk)}</span>` : ''}${mods}${passport}${fee}</span>
    </button>`;
  };
  const list = STAGES.map((s, i) => [s, i]).filter(([s]) => demoOk(s));
  const tuts = list.filter(([s]) => s.tutorial).sort((a,b)=>['tB','t0','tC','tL','tR','t1','tI','tS','tE','tA'].indexOf(a[0].id)-['tB','t0','tC','tL','tR','t1','tI','tS','tE','tA'].indexOf(b[0].id)), miss = ['p0','p1','p2','e1','e2','e3',...MAIN_CONTRACTS].map(id=>list.find(([s])=>s.id===id)).filter(Boolean), archive = list.filter(([s]) => !s.tutorial && !s.city && !introductoryContract(s) && !mainContract(s)), city = list.filter(([s]) => s.city);
  $('stageList').innerHTML = `<div class="lg-sec">연습</div>` + tuts.map(row).join('') + `<div class="lg-sec chapter">첫 밤 · 기본 행동 익히기</div>` + miss.map((entry,n)=>{const s=entry[0],prev=miss[n-1]?.[0];return(s.apprenticeContract&&!prev?.apprenticeContract?'<div class="lg-sec chapter">입문 의뢰 · 배운 방법을 조합하기</div>':mainContract(s)&&!mainContract(prev||{})?'<div class="lg-sec chapter">본 의뢰 · 여러 경로로 공략하기</div>':'')+row(entry)}).join('') + (archive.length ? `<details class="lg-archive"><summary>이전 의뢰 · ${archive.length}개</summary><div class="archive-stages">${archive.map(row).join('')}</div></details>` : '') + (city.length ? `<details class="lg-archive"><summary>도시 시제품</summary><div class="archive-stages">${city.map(row).join('')}</div></details>` : '')
    + (locked.length ? `<div class="stage locked"><span class="st-no">${locked[0].no}</span><span class="st-name">의뢰 ${locked.length}개 더</span><span class="st-stamp">정식판</span><span class="st-mis">${locked.map(s => s.name).join(', ')}</span></div>` : '');
  $('stageList').querySelectorAll('.stage[data-i]').forEach(b => b.addEventListener('click', () => { CITY_RET = null; start(+b.dataset.i); }));
  { const record=loadSkillTree();$('perkBox').hidden=true;$('btnSkillsLedger').textContent='기술 트리 · '+(skillBudget()-skillSpent(record))+'P'; }
  { const mb=$('modBox');mb.hidden=$('stageList').dataset.filter!=='missions'||!mainContracts().some(stageCleared);
    document.querySelectorAll('#modSel button').forEach(b=>b.classList.toggle('on',b.dataset.m===MOD));
    $('modNote').hidden=!MOD;$('modNote').textContent=MOD?MODS[MOD][1]:''; }

}


// One short instruction in the existing objective area, with one matching control accent.
function tutorialCue(){
  if(STAGE.id==='tB'&&S.player.captive)return 'attack';
  if(STAGE.id==='tB'&&S.player.hide)return 'env';
  if(beginnerEntryGoal())return S.beginnerEntry.step===0?'move':'crouch';
  const step=STAGE.steps?.[S.tutI||0],cue=step?.[4];
  let key=(typeof cue==='function'?cue(S,S.player):cue)||'';
  // A nearby stair is a valid action, but it is not the document we are teaching.
  // Keep the movement goal until the lesson's actual target is in reach.
  if(key==='env'&&['tB','t0','tL','tR'].includes(STAGE.id)){
    const at=step?.[2]?.(S),P=S.player,a=envAction(),allowed=step?.[6];
    if(!at||flOf(at)!==flOf(P)||dist(P.x,P.y,at.x,at.y)>64||a.k==='none'||allowed&&!allowed.includes(a.k))key='move';
  }
  return key;
}
function syncTutorialCue(){
  const key=tutorialCue();
  document.body.classList.toggle('entry-learning',!!beginnerEntryGoal());
  const joyHint=document.querySelector('#hud .joyhint');if(joyHint){const text=input.walkLock?'왼쪽을 끌어 걷기\n웅크림: 조용히 · 달리기: 장비에서 설정':'왼쪽 조금 끌기: 걷기\n끝까지: 달리기 · 웅크림: 조용히';if(joyHint.textContent!==text)joyHint.textContent=text;}
  const token=STAGE.id+'|'+(S.tutI||0)+'|'+key;
  if(hudCache.lesson===token)return;hudCache.lesson=token;
  const lesson={tB:'body',t0:'body',tL:'lighting',tR:'indoor'}[STAGE.id];if(lesson)document.body.dataset.lesson=lesson;else delete document.body.dataset.lesson;
  document.body.classList.toggle('perception-lesson',!!STAGE.firstSteps);document.body.classList.toggle('tutorial-lesson',!!STAGE.steps);
  const active={crouch:'btnCrouch',run:isTouch?'btnToolNext':'btnSneak',grab:'btnGrab',attack:'btnAct',env:'btnCarry',whistle:isTouch?'btnTool':'btnWhistle',cycle:'btnCycle',skill:'btnAct',skills:'btnPause',tool:'btnTool',toolcycle:'btnToolNext'}[key];
  $('btnSkillsPause').classList.toggle('lesson-cue',key==='skills');
  for(const id of ['btnCrouch','btnSneak','btnGrab','btnAct','btnCarry','btnWhistle','btnTool','btnToolNext','btnCycle','btnSkill','btnPause'])$(id)?.classList.toggle('lesson-cue',id===active);
}
