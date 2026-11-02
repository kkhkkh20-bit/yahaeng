function startCheck(g, at, max, radius) {
  const R = radius || 330;
  const gf = flOf(g);
  const cand = S.hides.filter(h => (h.fl || 0) === gf && (h.z || 0) === (g.z || 0) && dist(h.x, h.y, at.x, at.y) < R);
  const bushes = gf||g.z ? [] : S.bushes.filter(b => dist(b.x, b.y, at.x, at.y) < Math.min(R, 240)).sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
  const picked = []; for (const b of bushes) if (!picked.some(p => dist(p.x, p.y, b.x, b.y) < 80)) picked.push(b);
  const list = cand.concat(picked.slice(0, 2)).filter(s => {const p=searchStandNear(s);return p&&(astar(Math.floor(g.x / TILE),Math.floor(g.y / TILE),Math.floor(p.x/TILE),Math.floor(p.y/TILE)).length||dist(g.x,g.y,p.x,p.y)<28);})
    .sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y)).slice(0, max);
  if (!list.length) { g.state = 'RETURN'; g.path = null; g.icon = null; return false; }
  g.state = 'CHECK'; g.checks = list; g.inspect = null; g.path = null; setIcon(g, '?');
  return true;
}
// 평상시 두 자경대원이 가까이 서 있으면 잠시 잡담 — 서로를 보느라 주변을 덜 본다
function endChat(g) { if (!g.chat) return; const o = g.chat.with; g.chat = null; g.bubble = null; g.say = null; g.chatCd = rnd(20, 40); if (o.chat && o.chat.with === g) endChat(o); }

// 대화: 가까이 선 둘이 멈춰 서서 말풍선으로 주고받는다 (엿들으면 정보가 나오기도 한다)
const TALK_GUARD = [
  [[0, '교대 몇 시야?'], [1, '네 시. 다음 조 오면 인계하고 가.']],
  [[0, '뒷문 잠갔어?'], [1, '응. 순찰 돌 때 한 번 더 볼게.']],
  [[0, '옥상 점검은 끝났어?'], [1, '다음 순찰 때 확인할게.']],
  [[0, '밖에 손님 왔어?'], [1, '아직. 오면 입구에서 연락한대.']],
  [[0, '무전 잘 들려?'], [1, '응. 안쪽 들어가면 조금 끊겨.']],
  [[0, '조명 점검은 누가 해?'], [1, '시설 담당. 꺼진 곳 있으면 알려 줘.']]
];
const TALK_CIV = [
  [[0, '가게 아직 해요?'], [1, '조금 있으면 닫는대요.']],
  [[0, '늦었네요. 어디 가세요?'], [1, '집에 가는 길이에요.']],
  [[0, '약은 받아 왔어요?'], [1, '네. 내일 다시 오라고 하네요.']],
  [[0, '버스 끊겼나?'], [1, '큰길 쪽은 아직 다녀요.']],
  [[0, '내일도 일찍 나가요?'], [1, '네. 먼저 들어갈게요.']]
];
const TALK_CLUB = [
  [[0, '밖에 사람 많아?'], [1, '입구에 몇 명 기다리더라.']],
  [[0, '실장님 오셨어?'], [1, '안쪽에 계셔. 직원한테 물어봐.']],
  [[0, '뭐라고? 잘 안 들려.'], [1, '나 잠깐 밖에 다녀온다고.']],
  [[0, '자리 바꿔도 돼?'], [1, '직원한테 한번 물어봐.']]
];
function startTalk(a, b) {
  const pool = a.civ ? (a.club && STAGE.neon ? TALK_CLUB : TALK_CIV).concat((STAGE.talks || {})[a.club ? 'club' : 'civ'] || []) : TALK_GUARD.concat((STAGE.talks || {}).guard || []);
  const lines = pool[(Math.random() * pool.length) | 0];
  const C = { a, b, lines, i: -1, lt: 0.4 }; a.chat = { with: b, C, t: 99 }; b.chat = { with: a, C, t: 99 }; a.path = null; b.path = null;
}
function updateTalks(dt) {
  const seen = new Set();
  for (const g of S.guards) { const C = g.chat && g.chat.C; if (!C || seen.has(C)) continue; seen.add(C);
    C.lt -= dt; if (C.lt > 0) continue;
    C.i++; C.a.say = C.b.say = null;
    if (C.i >= C.lines.length) { endChat(C.a); continue; }
    const [who, text] = C.lines[C.i], sp = who ? C.b : C.a; sp.say = text; C.lt = 1.6 + text.length * 0.07;
  }
}
// 말풍선 (어둠 위에 그린다): 같은 층, 가까이 있을 때만 (들리는 거리)
// 머리 위 말풍선: 둥근 몸체와 화자를 향한 꼬리. 행동·인물·조작 영역을 피해 배치한다.
// 추격 중(누가 나를 보며 쫓는 중): 화면을 정리한다 — 주변 잡담·지난 알림·구역 이름·마지막 위치 표시를 줄이고 나를 쫓는 적만 남긴다
function chaseNow() { if (S._chaseAt === S.t) return S._chase; S._chaseAt = S.t; return (S._chase = S.guards.some(g => !g.civ && !g.dog && g.state === 'ALERT' && g.seen && flOf(g) === flOf(S.player))); }
function drawSpeech() {
  if(DLG.modal||S.keypad)return;
  const P=S.player,ch=chaseNow(),focus=playerActionFocus();
  const who=visibleSpeechCandidates(P,ch,focus);
  if(P.say&&!P.hide)who.unshift(P);
  if(!who.length)return;
  who.sort((a,b)=>speechPriority(b,P)-speechPriority(a,P)||dist(a.x,a.y,P.x,P.y)-dist(b.x,b.y,P.x,P.y));
  const placed=ACTION_R.concat(MARK_R,actorTextBlocks(),hudTextBlocks()),k=Math.max(1,.95/SCALE),gap=6*k;
  const vx0=cam.x-W/SCALE/2+8/SCALE,vx1=cam.x+W/SCALE/2-8/SCALE,vy0=cam.y-H/SCALE/2+8/SCALE,vy1=cam.y+H/SCALE/2-8/SCALE;
  const hit=(a,b)=>a[0]<b[2]+gap&&a[2]+gap>b[0]&&a[1]<b[3]+gap&&a[3]+gap>b[1];
  ctx.save();ctx.font=`500 ${12*k}px "IBM Plex Sans KR",sans-serif`;
  for(const g of who) {
    if(SPEECH_R.length>=1)break;
    // 단서나 비밀번호는 자르지 않고 줄을 바꾼다.
    const lines=[''],maxText=Math.min(210*k,(W-32)/SCALE-20*k);
    for(const word of g.say.split(' ')) {
      let i=lines.length-1,t=lines[i]?(lines[i]+' '+word):word;
      if(ctx.measureText(t).width>maxText&&lines[i]){lines.push('');i++;}
      for(const c of word){if(ctx.measureText(lines[i]+c).width>maxText&&lines[i]){lines.push('');i++;}lines[i]+=c;}
      lines[i]+=' ';
    }
    const w=Math.max(...lines.map(l=>ctx.measureText(l.trim()).width))+20*k,h=(12+lines.length*17)*k;
    if(w>vx1-vx0||h>vy1-vy0)continue;
    const cx=clamp(g.x-w/2,vx0,vx1-w),above=g.y-58-h;
    let at=null;
    const xs=[cx,clamp(g.x-w-26*k,vx0,vx1-w),clamp(g.x+26*k,vx0,vx1-w)];
    const ys=[above,above-h-12*k,g.y+26*k,clamp(above,vy0,vy1-h),g.y+50*k,...Array.from({length:12},(_,i)=>g.y+(72+i*18)*k)];
    for(const y of ys){if(y<vy0||y+h>vy1)continue;for(const x of xs){const r=[x,y,x+w,y+h];if(!placed.some(p=>hit(r,p))){at=r;break;}}if(at)break;}
    // A short landscape viewport can leave no room immediately above/below an
    // actor. Preserve useful reports and alert barks in a nearby free column.
    if(!at&&speechPriority(g,P)>=60){
      const sides=[clamp(g.x-w-54*k,vx0,vx1-w),clamp(g.x+54*k,vx0,vx1-w)];
      for(let y=vy0;y+h<=vy1;y+=12*k){for(const x of sides){const r=[x,y,x+w,y+h];if(!placed.some(p=>hit(r,p))){at=r;break;}}if(at)break;}
    }
    if(!at)continue;
    const [x,y]=at;
    placed.push(at);SPEECH_R.push({x,y,w,h,speaker:g,text:g.say});
    const bg='#f7f6f1',edge='#373c38',r=6*k;
    ctx.fillStyle=bg;ctx.strokeStyle=edge;ctx.lineWidth=k;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();
    // A triangular tail points toward the speaking actor, on the nearest edge.
    const head={x:g.x,y:g.y-40},tail=11*k;let a,b,tip;
    if(head.y>=y+h){const tx=clamp(head.x,x+12*k,x+w-12*k);a=[tx-5*k,y+h-k];b=[tx+5*k,y+h-k];tip=[clamp(head.x,tx-tail,tx+tail),Math.min(head.y,y+h+tail)];}
    else if(head.y<=y){const tx=clamp(head.x,x+12*k,x+w-12*k);a=[tx-5*k,y+k];b=[tx+5*k,y+k];tip=[clamp(head.x,tx-tail,tx+tail),Math.max(head.y,y-tail)];}
    else {const right=head.x>x+w/2,ty=clamp(head.y,y+10*k,y+h-10*k),tx=right?x+w-k:x+k;a=[tx,ty-4*k];b=[tx,ty+4*k];tip=[right?Math.min(head.x,x+w+tail):Math.max(head.x,x-tail),ty];}
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...tip);ctx.lineTo(...b);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...tip);ctx.lineTo(...b);ctx.stroke();
    ctx.fillStyle='#202521';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((l,i)=>ctx.fillText(l.trim(),x+w/2,y+(14+17*i)*k));
  }
  ctx.restore();
}
function updateChats(dt) {
  updateTalks(dt);
  if(STAGE.noAmbientChats)return;
  const gs = S.guards.filter(g => g.state === 'PATROL' && !g.doomed && !g.target && !g.dog && g.follow == null && !g.relight && !(g.civ && (g.sleep || g.seen)) && !(g.elite && !g.civ) && !(securityLevel()>=2&&securityCrew(g)));
  for (const g of gs) g.chatCd = (g.chatCd == null ? rnd(4, 14) : g.chatCd) - dt;
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = gs[i], b = gs[j];
    if (a.civ !== b.civ || (S.alevel && !a.civ)) continue;
    if (a.chat || b.chat || a.chatCd > 0 || b.chatCd > 0 || flOf(a) !== flOf(b)) continue;
    if (dist(a.x, a.y, b.x, b.y) > (a.civ ? 170 : 200)) continue;
    setLayer(flOf(a)); const ok = los(a.x, a.y, b.x, b.y); setLayer(flOf(S.player)); if (!ok) continue;
    startTalk(a, b);
  }
}
function followLeader(g, dt, spd) {
  const L = S.guards[g.follow];
  if (!L || L.state === 'DEAD') {  // 앞서 가던 짝이 사라졌다: 마지막 자리로 찾으러 간다
    g.follow = null; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.post = g.a;
    if (L && !g.civ && !g.dog) { goSuspicious(g, L.x, L.y, 6); g.why = 'saw'; gsay(g, ['어디 갔어? 대답해!', '방금 앞에 있던 사람 어디 갔지?', '시야 놓쳤어. 주변 확인할게.'][g.id % 3]); setIcon(g, '?'); }
    return;
  }
  const posts=Array.isArray(g.escortWait)?g.escortWait:[g.escortWait].filter(Boolean);
  const area=w=>{const r=w.rect;return[r[0]-(w.at[0]<r[0]?1:0),r[1]-(w.at[1]<r[1]?1:0),r[2]+(w.at[0]>r[2]?1:0),r[3]+(w.at[1]>r[3]?1:0),r[4]];};
  const wait=rendezvousPrivacy(g)||posts.find(w=>!(securityLevel()>=2&&w.kind==='smoke')&&inRect(L,area(w)))||posts[0],r=wait&&wait.rect;
  // 입구에 도착하기 전에 밖에서 대기한다. 뒤따르던 옛 경로를 계속 밟아 안으로 들어가지 않는다.
  const approach=r&&area(wait);
  const privacy=!!(wait&&inRect(L,approach));
  if(privacy!==!!g.waitingPrivacy){g.path=null;g.repath=0;}
  if (privacy && !g.waitingPrivacy) gsay(g, wait.say||'밖에서 기다리겠습니다.', 2);
  g.waitingPrivacy = !!privacy;
  let bx = privacy ? tc(wait.at[0]) : L.x - Math.cos(L.a) * 52, by = privacy ? tc(wait.at[1]) : L.y - Math.sin(L.a) * 52;
  if(!privacy&&securityLevel()>=2&&L.target&&flOf(g)===flOf(L)&&(g.z||0)===(L.z||0)){const p=securityEscortPoint(L,bx,by);bx=p.x;by=p.y;}
  if (flOf(g) !== flOf(L) || (g.z || 0) !== (L.z || 0)) {
    if (!g.path || (g.repath -= dt) <= 0) { routeTo(g, gSpot(L)); g.repath = .6; }
    hopClimb(g, moveAlong(g, spd, dt)); return;
  }
  const d = dist(g.x, g.y, bx, by);
  g.repath -= dt;
  if (d > 30) {
    if (g.repath <= 0 || !g.path) { pathTo(g, bx, by); g.repath = 0.6; }
    moveAlong(g, Math.max(spd, SPD.target * 1.5), dt);
  } else {
    g.path = null;
    const facing=privacy&&wait.face!=null?wait.face:L.a;
    g.glanceT -= dt;
    if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = rnd(5, 9); }
    else if (g.glanceT <= 0) { g.glance = rnd(1.2, 1.8); g.glanceA = facing + (privacy&&wait.face!=null?0:Math.PI) + rnd(-0.6, 0.6); }
    else g.want = facing;
  }
}
// 순라꾼에게 맞음: 체력 1 감소, 뒤로 밀림, 잠깐 무적. 체력이 다하면 실패
// 권총: 전체 경보(3단계)가 울린 뒤 정예·증원만 꺼낸다. 붉은 조준선으로 1초 겨눈 뒤 쏜다 — 그 사이 시야를 끊으면 빗나간다
