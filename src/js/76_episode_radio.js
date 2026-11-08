// An in-world voice gives one useful next action. It never pauses or gates play.
const OPENING_RADIO=[
 '오른쪽 골목으로 가. 연락책 제비가 남긴 서류부터 찾자.',
 '몸 낮춰. 상자 옆 풀숲으로 들어가면 안 보일 거야.',
 '문만 보고 있네. 풀숲에서 나와 조용히 등 뒤로 붙어.',
 '살려 둬. 공격을 짧게 누르고 떼. 1초 누르면 죽는다.',
 '그 친구 옷을 빌려 입어. 갈아입을 동안은 가만히.',
 '흔적도 지워야지. 몸을 들고 왼쪽 풀숲에 숨겨.',
 '좋아. 배차실로 들어가. 서류는 계단 위, 2층 책상에 있어.',
 '제비가 남긴 서류야. 책상에서 챙겨. 손 쓰는 동안 조심하고.',
 '박인호… 금성 운송 2층. 우선 같은 계단으로 내려와.',
 '첫 야근 끝이야. 동쪽 골목으로 빠져. 나머지는 밖에서 얘기하지.'
];
function episodeRadioMessage(){
 if(!S||STAGE.story?.solo||!STAGE.storyEpisode&&!introductoryContract(STAGE)&&!(STAGE.id==='m2'&&!stageCleared(STAGE)))return null;
 const P=S.player,goal=nextGoal();if(!goal)return null;
 const chase=S.guards.some(g=>g.state==='ALERT'&&g.seen&&flOf(g)===flOf(P));
 if(chase)return{text:'들켰어. 모퉁이 돌아! 시야 끊고 숨어. 아직 빠져나갈 수 있어.',action:'모퉁이·풀숲으로 이동',cue:'danger:chase',priority:2};
 if((P.hidden||P.hide)&&S.alevel>=2&&S.searchCause?.kind==='player')return{text:'시야는 끊었어. 지금은 움직이지 마. 수색이 잦아들면 다시 가자.',action:'숨은 채 대기',cue:'danger:hidden',priority:1};
 if(P.captive)return P.captive.target?{text:'잡았군. 이번엔 처치야. 공격을 1초 눌러. 짧게 치면 기절만 해.',action:tutText('{공격} 1초 길게 · 살해')}:{text:'잡았군. 공격을 짧게 치고 옷을 챙겨. 길게 누르면 죽으니 조심하고.',action:tutText('{공격} 짧게 누르고 떼기 · 기절')};
 if(STAGE.firstSteps&&STAGE.storyEpisode){
  const i=S.tutI||0;
  const passed=i===6&&S.openingPass;
  const text=P.hide?'잘 숨었어. 이제 나와. 서류는 아직 배차실에 있어.':i===4&&P.carrying?'몸부터 내려놔. 그래야 그 옷을 입을 수 있어.':passed?'통했어. 그냥 걸어가. 계단으로 2층에 올라가면 돼.':OPENING_RADIO[i]||OPENING_RADIO[9];
  return{text,speaker:'master',cue:'opening:'+i+':'+!!P.hide+':'+!!(i===4&&P.carrying)+':'+!!passed,action:tutText(P.hide?'{행동} 밖으로 나오기':goal.text)};
 }
 let text='한 가지씩 가자. 지금은 '+goal.text.replace(/\{[^}]*\}/g,'')+'부터.';
 if(evidencePending())text='녹화됐어. 전선만 끊어선 기록이 남아. 관리 단말에서 지워.';
 else if(goal.exit||S.exitOpen)text='일은 끝났어. 더 건드리지 말고 표시된 출구로 빠져.';
 else if(STAGE.compound&&goal.compoundCue){
  const who=goal.g?targetName(goal.g).split(' · ')[0]:'표적';
  text=({dress:'혼자 있는 경비부터 재워. 쓰러뜨린 뒤 그 옷을 챙겨 입어.',
   hide:P.carrying?'좋아. 표시된 은닉처로 가. 화단이나 사물함에 몸을 넣어.':'옷만 챙기면 꼬리가 남아. 쓰러진 몸부터 들어.',
   guard:'1층에도 한 명 있네. 뒤에서 재우고 사물함에 넣어.',
   light:'스위치를 내려. 불 켜러 오는 놈을 따로 잡자.',
   stairs:/내려/.test(goal.text)?'계단으로 내려가. 입구로 나오면 돼.':'계단으로 올라가. 위층에서도 등 뒤를 잡는 건 같아.',
   camera:'걸어갈 땐 괜찮아. 손쓰는 건 찍힌다. 카메라 뒤에서 전선을 끊어.',
   window:'작업대 철사를 챙겨. 그걸로 서쪽 창문 잠금을 풀 수 있어.',
   jump:'동쪽 지붕이 가까워. 오른쪽을 보고, 한 칸 골목을 건너뛰어.',
   sign:'인계책이 간판 밑에 설 때를 기다려. 그때 행동을 1초 눌러 고정을 풀어.',
   target:goal.g?.unconscious?'아직 살아 있어. 몸 옆에서 공격을 1초 눌러.':goal.g?.moving?who+' 움직인다. 멈추면 등 뒤로 붙어.':'표적은 '+who+'. 다른 시선 피해. 뒤에서 공격을 1초 눌러.',
   document:'장부도 챙겨. 저 안에 다음 배후가 있어. 손쓰는 동안 시선 조심하고.'})[goal.compoundCue]||text;
 }
 else if(STAGE.starterContract==='disguise'&&goal.starter&&P.outfit!=='crew')text='골목에 혼자 있는 경비가 있습니다. 기절시킨 다음 몸 옆에서 행동으로 옷을 얻으세요.';
 else if(STAGE.id==='p0')text=npc('runner')?.unconscious?'운반책은 아직 살아 있습니다. 이번 의뢰는 처치입니다. 몸 가까이서 공격을 1초 길게 누르세요.':'서류에서 찾은 운반책입니다. 적재장 옆으로 돌아 등 뒤를 잡으세요. 이번에는 공격을 길게 눌러 처리합니다.';
 else if(goal.actionReady||actionBusy())text=actionBusy()?'좋아. 끝날 때까지 가만히. 누가 보는지도 살피고.':(P.disguise?'지금이야. 그 옷이면 걸어가도 돼. 훔치는 모습은 들키니 조심하고.':'지금이야. 가까이 붙어서 행동해. 끝날 때까진 가만히.');
 else if(STAGE.id==='p1')text='그 옷이면 물류실 경비 앞을 걸어가도 됩니다. 서류 작업은 경비가 등을 보일 때 하세요.';
 else if(/계단|2층으로/.test(goal.text))text='계단으로 올라가. 먼저 위층을 살피자. 서두를 필요 없어.';
 else if(['p2','e2','e4','e5'].includes(STAGE.id)&&S.cams.some(camOn))text='카메라가 비추지 않는 벽 쪽으로 돌아가세요. 가까이서 전선을 분리하면 됩니다. 기술은 필요 없습니다.';
 else if(['e3','e4'].includes(STAGE.id))text=flOf(P)?'서류는 이 층에 있습니다. 경비가 보고 있지 않을 때 책상을 확인하세요.':'다시 2층 일입니다. 직원 옷으로 들어가 계단을 이용하세요. 다른 경비는 건드릴 필요 없습니다.';
 else if(['e1','e5'].includes(STAGE.id))text='멈춰서 등을 보일 때가 기회야. 뒤로 붙어서 공격을 1초 눌러.';
 else if(STAGE.id==='m2')text='클럽은 넓지만 한 가지씩 합시다. 먼저 표시된 곳을 확인하세요. 통행과 작업은 별개입니다.';
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
