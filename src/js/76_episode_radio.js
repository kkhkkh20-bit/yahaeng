// One clear instruction at a time, spoken by a familiar partner on the radio.
const OPENING_RADIO=[
 '올빼미, 제비가 연락을 안 받아. 오른쪽 배차실 2층에 서류를 남겼대. 확인해 보자.',
 '몸을 좀 낮춰. 상자 옆 풀숲으로 가면 경비한테 안 보일 거야.',
 '저 사람은 문 쪽을 보고 있어. 풀숲에서 나와서 뒤로 가 봐.',
 '짧게 눌렀다 떼면 기절해. 길게 누르면 죽으니까, 이번에는 짧게.',
 '이제 경비 옷으로 갈아입자. 갈아입는 동안은 움직이지 말고.',
 '그대로 두면 다른 경비가 보겠네. 왼쪽 풀숲으로 옮겨서 숨겨.',
 '배차실 안으로 들어가면 돼. 계단으로 올라가서 2층 책상을 확인해 봐.',
 '됐어. 서류는 왼쪽 책상에 있어. 챙겨서 내려가자.',
 '서류에 박인호라고 적혀 있지? 금성 운송 2층에 있대. 일단 갖고 내려와.',
 '동쪽 골목으로 나오면 돼. 서류는 꼭 갖고 오고.'
];
function episodeRadioMessage(){
 if(!S||STAGE.story?.solo||!STAGE.storyEpisode&&!introductoryContract(STAGE)&&!(STAGE.id==='m2'&&!stageCleared(STAGE)))return null;
 const P=S.player,goal=nextGoal();if(!goal)return null;
 const chase=S.guards.some(g=>g.state==='ALERT'&&g.seen&&flOf(g)===flOf(P));
 if(chase)return{text:'들켰다. 모퉁이를 돌아서 시야에서 벗어나! 숨을 만한 곳부터 찾아.',action:'모퉁이·풀숲으로 이동',cue:'danger:chase',priority:2};
 if((P.hidden||P.hide)&&S.alevel>=2&&S.searchCause?.kind==='player')return{text:'지금은 안 보이는 모양이야. 움직이지 말고 잠깐 기다려. 경비가 돌아가면 나오자.',action:'숨은 채 대기',cue:'danger:hidden',priority:1};
 if(P.captive)return P.captive.target?{text:'잡았네. 이번 목표는 기절시키는 걸로는 안 돼. 공격을 1초 동안 눌러.',action:tutText('{공격} 1초 길게 · 살해')}:{text:'짧게 누르고 떼면 기절해. 길게 누르면 죽으니까 누르고 있지는 마.',action:tutText('{공격} 짧게 누르고 떼기 · 기절')};
 if(STAGE.firstSteps&&STAGE.storyEpisode){
  const i=S.tutI||0,passed=i===6&&S.openingPass;
  const archive=i===7&&openingArchiveGuard(),archiveReady=!!archive&&openingArchiveReady(),quietDesk=i===7&&!archive&&npc('archiveKeeper')?.state!=='DEAD';
  const archiveVia=!!archive&&!!openingArchiveApproach().via;
  let text=OPENING_RADIO[i]||OPENING_RADIO[9];
  if(P.hide)text='지금은 괜찮아. 이제 나와도 돼. 서류부터 찾자.';
  else if(i===7&&P.carrying)text='서류 챙기려면 손부터 비워야 해. 몸은 사물함에 숨기거나 내려놔.';
  else if(archiveVia)text='복도 끝 왼쪽에 문이 있어. 그 문으로 들어가면 경비 뒤쪽으로 갈 수 있어.';
  else if(archive)text=archiveReady?'지금 가까워. 아래에서 했던 것처럼 짧게 누르고 떼.':'서류 앞에도 한 명 있네. 그 옷으로 지나가도 괜찮지만, 훔치는 건 안 보이게 해야 해.';
  else if(quietDesk)text='지금은 안 보고 있어. 서류를 챙기려면 지금이 좋겠어.';
  else if(i===4&&P.carrying)text='몸을 먼저 내려놔야 옷을 갈아입을 수 있어.';
  else if(passed)text='저 사람은 눈치 못 챘네. 천천히 걸어서 2층으로 올라가.';
  return{text,speaker:'master',cue:'opening:'+i+':'+!!P.hide+':'+!!(i===4&&P.carrying)+':'+!!passed+':'+!!archive+':'+archiveReady+':'+!!(i===7&&P.carrying)+':'+quietDesk+':'+archiveVia,action:tutText(P.hide?'{행동} 밖으로 나오기':goal.text)};
 }
 let text='화면에 나온 목표부터 확인해 봐. 가까이 가면 어떻게 할 수 있는지 보일 거야.';
 if(evidencePending())text='카메라에 찍혔어. 전선을 끊어도 이미 찍힌 건 남아. 관리 단말에서 기록을 지워야 해.';
 else if(goal.exit||S.exitOpen)text='할 일은 끝났어. 들어왔던 길로 내려가서 노란 원으로 표시된 출구로 나와. 경비는 아직 있으니까 조심하고.';
 else if(STAGE.compound&&goal.compoundCue){
  const who=goal.g?targetName(goal.g).split(' · ')[0]:'표적';
  text=({dress:'혼자 있는 경비가 보이지? 기절시킨 다음 그 옷으로 갈아입으면 들어가기 편할 거야.',
   hide:P.carrying?'가까운 풀숲이나 사물함에 숨기면 돼. 사람들이 보는지는 확인하고.':'쓰러진 사람을 그대로 두면 발견할 거야. 먼저 들어서 숨길 곳으로 옮기자.',
   guard:'1층에도 경비가 한 명 있어. 뒤에서 기절시키고, 근처 사물함에 숨기면 돼.',
   light:'벽 스위치를 꺼 봐. 경비가 켜러 오면 다른 사람들한테서 떨어질 거야.',
   stairs:/내려/.test(goal.text)?'계단으로 내려가면 돼. 들어왔던 문으로 나올 수 있어.':'계단으로 올라가 봐. 위층에 누가 있는지는 올라가서 확인하자.',
   camera:STAGE.cameraApproach?'오른쪽 벽을 따라 위로 돌아가 봐. 카메라 위쪽에서는 전선을 끊을 수 있어.':'카메라 앞을 걷는 건 괜찮아. 하지만 누굴 때리거나 서류를 훔치면 찍혀. 뒤쪽 전선부터 끊자.',
   window:'작업대에 철사가 있어. 그걸 챙겨서 서쪽 창문 잠금을 풀어 봐.',
   jump:'옆 건물 지붕까지는 뛸 수 있겠네. 오른쪽을 보고 건너뛰면 돼.',
   sign:'저 사람이 간판 아래에 올 때까지 기다려. 행동을 1초 누르면 간판 고정이 풀려.',
   target:goal.g?.unconscious?'아직 기절한 상태야. 이번 목표는 살해야. 몸 가까이에서 공격을 1초 동안 눌러.':goal.g?.moving?withJosa(who,'이/가')+' 움직이고 있어. 멈추면 뒤로 가서 가까이 붙어.':'찾던 사람은 '+withJosa(who,'이야/야')+'. 다른 경비가 안 볼 때 뒤에서 공격을 1초 동안 눌러.',
   document:'장부도 챙겨야 해. 누가 돈을 냈는지 거기 적혀 있을 거야. 가져가는 동안 누가 보는지 확인하고.'})[goal.compoundCue]||text;
 }
 else if(STAGE.starterContract==='disguise'&&goal.starter&&P.outfit!=='crew')text='골목에 경비가 혼자 있어. 기절시킨 다음 옷을 가져오면 되겠어.';
 else if(STAGE.id==='p0')text=npc('runner')?.unconscious?'박인호는 아직 살아 있어. 이번 의뢰는 살해야. 가까이에서 공격을 1초 동안 눌러.':'박인호는 적재장 쪽으로 돌아가면 뒤로 접근할 수 있어. 이번에는 공격을 길게 눌러야 해.';
 else if(goal.actionReady||actionBusy())text=actionBusy()?'움직이면 작업이 끊겨. 잠깐만 그대로 있어. 누가 오는지도 보고.':P.disguise?'그 옷이면 지나가도 괜찮아. 물건을 가져갈 때는 안 보이게 해야 하고.':'가까이에서 행동하면 돼. 작업이 끝날 때까지는 움직이지 마.';
 else if(STAGE.id==='p1')text='그 옷이면 경비 앞을 걸어가도 괜찮아. 서류는 경비가 다른 데 볼 때 챙기고.';
 else if(/계단|2층으로/.test(goal.text))text='계단으로 올라가 봐. 누가 있는지 먼저 확인하고 움직이자.';
 else if(['p2','e2','e4','e5'].includes(STAGE.id)&&S.cams.some(camOn))text='카메라 뒤쪽 벽으로 돌아가면 전선이 있어. 가까이에서 분리하면 돼. 기술은 필요 없어.';
 else if(['e3','e4'].includes(STAGE.id))text=flOf(P)?'서류는 지금 있는 층에 있어. 경비가 다른 데 볼 때 책상을 확인해 봐.':'직원 옷으로 들어가서 계단으로 올라가면 돼. 다른 경비까지 건드릴 필요는 없어.';
 else if(['e1','e5'].includes(STAGE.id))text='저 사람이 멈추면 뒤로 가 봐. 가까이에서 공격을 1초 동안 누르면 돼.';
 else if(STAGE.id==='m2')text='한 번에 다 하려면 복잡해. 일단 지금 표시된 곳부터 가 보자.';
 return{text,action:tutText(goal.text),cue:evidencePending()?'camera:recorded':goal.exit||S.exitOpen?'mission:escape':goal.compoundCue?'compound:'+goal.compoundCue+':'+(goal.g?.tag||'')+':'+(goal.compoundCue==='hide'?!!P.carrying:goal.compoundCue==='target'?!!goal.g?.moving:''):goal.text,priority:evidencePending()?1:0};
}
// The mission stays stable. Immediate instructions belong to the radio.
function compactObjectiveText(){
 if(!S)return '';
 if(S.exitOpen)return evidencePending()?'CCTV 기록 삭제 후 탈출':(STAGE.exitName||'출구')+'로 탈출';
 if(STAGE.firstSteps&&STAGE.storyEpisode)return '연락 서류 회수 · 동쪽 골목 탈출';
 const targets=S.spare?[]:S.guards.filter(g=>g.target),parts=[];
 if(targets.length===1)parts.push(targetName(targets[0]).split(' · ')[0]+' 처치 '+targets.filter(targetEliminated).length+'/1');
 else if(targets.length)parts.push('표적 '+targets.filter(targetEliminated).length+'/'+targets.length+' 처치');
 if(STAGE.firstGoal)return STAGE.mission||STAGE.purpose||pendingFirstGoal()?.text||'출구로 탈출';
 if(S.items.length){
  const names=S.items.map((it,i)=>STAGE.itemNames?.[i]||STAGE.itemName||'서류'),work=S.items.some(it=>{const a=itemObjectiveAction(it);return a&&a.kind!=='recovery';});
  const label=work?'업무':S.items.length===1?names[0]:names.every(n=>/서류|장부|암호표|계약서|인계서|명세서|원장/.test(n))?'서류':'물품';
  parts.push(label+' '+S.items.filter(i=>i.got).length+'/'+S.items.length+' '+(work?'완료':'회수'));
 }
 if(parts.length)return parts.concat(evidencePending()?'CCTV 기록 삭제 후 탈출':'탈출').join(' · ');
 return STAGE.mission||STAGE.purpose||nextGoal()?.text||'의뢰 목표 확인';
}
let episodeRadioTick=0,episodeRadioToken='',episodeRadioFaceKey='';
let episodeRadioScene=null,episodeRadioUntil=0,episodeRadioCue='',episodeRadioSeen=new Map(),episodeRadioLastAt=-999,episodeRadioLayoutAt=0,episodeRadioPriority=0;
function replayEpisodeRadio(){
 if(!S||S.over||paused||tactical||DLG.modal)return;
 const m=episodeRadioMessage();if(!m)return;
 episodeRadioCue='';episodeRadioSeen.delete(m.cue||m.text);episodeRadioLastAt=-999;episodeRadioTick=0;syncEpisodeRadio();
}
function radioBlockers(includeReplay){
 const list=[...document.querySelectorAll('#hud .top,#stealth,#mini,#btnPause,#quickItems>button,.pad>button,.sysbtns>button,#btnWhistle'+(includeReplay?',#btnRadio':''))]
  .filter(e=>!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden').map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
 const px=(S.player.x-cam.x)*SCALE+W/2,py=(S.player.y-cam.y)*SCALE+H/2;
 list.push({left:px-34,right:px+34,top:py-(W<360?48:72),bottom:py+28,hero:true});return list;
}
function positionRadioReplay(now){
 if(now<episodeRadioLayoutAt)return;episodeRadioLayoutAt=now+200;
 const el=$('btnRadio'),edge=W>700?16:12,w=44,blockers=radioBlockers(false);
 const preferred=STAGE.firstSteps&&STAGE.storyEpisode?76:Math.max(76,($('mini')?.getBoundingClientRect().bottom||140)+8);
 const ys=[preferred,76];for(let y=12;y<H-w-12;y+=12)ys.push(y);
 let best=null;
 for(const y0 of ys)for(const x of [W-w-edge,edge]){
  const y=clamp(y0,12,H-w-12),score=blockers.reduce((n,r)=>n+Math.max(0,Math.min(x+w+4,r.right)-Math.max(x-4,r.left))*Math.max(0,Math.min(y+w+4,r.bottom)-Math.max(y-4,r.top))*(r.hero?100:1),0);
  if(!best||score<best.score)best={x,y,score};if(!score)break;
 }
 el.style.left=Math.round(best.x)+'px';el.style.right='auto';el.style.top=Math.round(best.y)+'px';hudBlockFrame=null;
}
function positionEpisodeRadio(now){
 const el=$('episodeRadio');if(el.hidden||now<episodeRadioLayoutAt)return;episodeRadioLayoutAt=now+200;
 const short=H<440&&W>H,edge=short?8:12;
 const width=Math.min(W-edge*2,short?Math.min(300,W*.42):W>700?450:390);
 const blockers=radioBlockers(true);
 const top=Math.max(document.querySelector('#hud .top')?.getBoundingClientRect().bottom||0,$('stealth')?.getBoundingClientRect().bottom||0)+10;
 let best=null;
 for(const candidate of [width,Math.min(width,W*.45)]){
  el.style.width=candidate+'px';
  const size=el.getBoundingClientRect(),w=size.width,h=size.height;
  const xs=[edge,(W-w)/2,W-w-edge],ys=W>700&&!isTouch?[H-h-76,top]:[top,H*.27,H*.39,H-h-100];
  for(let y=edge;y<=H-h-edge;y+=12)ys.push(y);
  const area=(x,y,r)=>Math.max(0,Math.min(x+w+5,r.right)-Math.max(x-5,r.left))*Math.max(0,Math.min(y+h+5,r.bottom)-Math.max(y-5,r.top));
  for(const y0 of ys)for(const x0 of xs){const x=clamp(x0,edge,W-w-edge),y=clamp(y0,edge,Math.max(edge,H-h-edge));const score=blockers.reduce((n,r)=>n+area(x,y,r)*(r.hero?100:10),0);
   if(!best||score<best.score)best={x,y,score,width:candidate};
   if(!score){el.style.left=Math.round(x)+'px';el.style.top=Math.round(y)+'px';hudBlockFrame=null;return;}
  }
 }
 el.style.width=best.width+'px';
 el.style.left=Math.round(best.x)+'px';el.style.top=Math.round(best.y)+'px';hudBlockFrame=null;
}
function syncEpisodeRadio(){
 const el=$('episodeRadio'),button=$('btnRadio');if(!el||!button)return;
 const now=performance.now(),open=hudInspecting();
 const active=running&&!paused&&!S?.over&&!tactical&&!DLG.modal&&!S?.keypad&&!targetDialogueVisible()&&!loadoutOpen&&!envPicker;
 if(!active){el.hidden=true;button.hidden=true;button.setAttribute('aria-expanded','false');document.body.classList.remove('episode-coached','radio-peek');return;}
 if(now<episodeRadioTick)return;episodeRadioTick=now+80;
 if(episodeRadioScene!==S){episodeRadioScene=S;episodeRadioUntil=0;episodeRadioCue='';episodeRadioSeen=new Map();episodeRadioToken='';episodeRadioFaceKey='';episodeRadioLastAt=-999;episodeRadioLayoutAt=0;}
 const message=episodeRadioMessage();button.hidden=!message;document.body.classList.toggle('episode-coached',!!message);
 if(message){
  const cue=message.cue||message.text,priority=message.priority||0;
  const fresh=cue!==episodeRadioCue&&(!episodeRadioSeen.has(cue)||priority>0&&now-episodeRadioSeen.get(cue)>4500)&&(priority>=episodeRadioPriority||now>=episodeRadioUntil||cue==='danger:hidden'&&episodeRadioCue==='danger:chase')&&(priority>=2||now-episodeRadioLastAt>750);
  if(fresh){
   episodeRadioUntil=now+clamp(3000+message.text.length*55,4700,7000);episodeRadioSeen.set(cue,now);episodeRadioCue=cue;episodeRadioLastAt=now;episodeRadioPriority=priority;episodeRadioLayoutAt=0;
   if(!open)sfx('radio');
  }
  // A lower priority line cannot replace an urgent instruction mid-transmission.
  if(fresh||open||now>=episodeRadioUntil){
   const speaker=message.speaker||'master',token=speaker+'|'+message.text+'|'+message.action;
   if(token!==episodeRadioToken){$('episodeRadioText').textContent=message.text;$('episodeRadioAction').textContent=message.action||'';$('episodeRadioSpeaker').textContent=speakerOf(speaker).name;$('episodeRadioChannel').textContent=speaker==='hero'?'· 응답':'· 무전';el.setAttribute('aria-label',speakerOf(speaker).name+'의 무전');episodeRadioToken=token;}
   if(episodeRadioFaceKey!==speaker&&drawFace($('episodeRadioFace'),speakerOf(speaker)))episodeRadioFaceKey=speaker;
  }
 }
 if(open)episodeRadioUntil=0;
 const show=!!message&&(open||now<episodeRadioUntil);
 el.hidden=!show;el.dataset.priority=String(episodeRadioPriority);button.setAttribute('aria-expanded',String(show));document.body.classList.toggle('radio-peek',show);
 const top=document.querySelector('#hud .top')?.getBoundingClientRect();if(top)document.documentElement.style.setProperty('--topb',Math.round(top.bottom)+'px');
 if(show)positionEpisodeRadio(now);else if(message)positionRadioReplay(now);
}
