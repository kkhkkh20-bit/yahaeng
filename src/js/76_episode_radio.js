// One clear instruction at a time, spoken by a familiar partner on the radio.
const OPENING_RADIO=[
 '올빼미, 제비가 연락을 안 받아. 오른쪽 배차실 2층에 남긴 서류부터 찾아보자.',
 '웅크리고 상자 옆 풀숲으로 가. 경비 눈을 피할 수 있어.',
 '경비가 문 쪽을 보고 있네. 풀숲에서 나와 등 뒤로 붙어.',
 '공격을 짧게 눌렀다 떼. 기절만 시킬 거야. 1초 동안 누르면 죽으니 조심하고.',
 '경비 옷으로 갈아입어. 끝날 때까지 움직이지 말고.',
 '쓰러진 경비를 왼쪽 풀숲에 숨겨. 다른 경비가 보기 전에.',
 '배차실로 들어가. 계단을 올라가면 2층에 서류가 있어.',
 '왼쪽 책상에 서류가 있어. 챙겨서 내려가자.',
 '박인호, 금성 운송 2층. 서류에 적힌 주소야. 일단 계단으로 내려와.',
 '동쪽 골목으로 나와. 서류 잃어버리면 다시 가야 한다.'
];
function episodeRadioMessage(){
 if(!S||(!STAGE.storyBeat&&(STAGE.story?.solo||(!STAGE.storyEpisode&&!introductoryContract(STAGE)&&!(STAGE.id==='m2'&&!stageCleared(STAGE))))))return null;
 const P=S.player;if(P.jump||P.trav)return null;
 const goal=nextGoal();if(!goal)return null;
 const chase=S.guards.some(g=>g.state==='ALERT'&&g.seen&&flOf(g)===flOf(P));
 const speaker=STAGE.story?.solo?'hero':'master';
 if(chase)return{speaker,text:speaker==='hero'?'들켰어. 모퉁이를 돌아서 숨을 곳부터 찾아야겠네.':'들켰어! 모퉁이를 돌아 시야부터 피해. 근처에 숨을 곳이 있는지 봐.',action:'모퉁이·풀숲으로 이동',cue:'danger:chase',priority:2};
 if((P.hidden||P.hide)&&S.alevel>=2&&S.searchCause?.kind==='player')return{speaker,text:speaker==='hero'?'여기는 안 보이나 봐. 경비가 돌아갈 때까지 기다리자.':'지금은 널 못 보는 것 같아. 경비가 돌아갈 때까지 기다려.',action:'숨은 채 대기',cue:'danger:hidden',priority:1};
 if(P.captive)return P.captive.target?{speaker,text:'이번 표적은 죽여야 해. 공격을 1초 동안 눌러.',action:tutText('{공격} 1초 길게 · 살해')}:{speaker,text:'기절시키려면 공격을 짧게 눌렀다 떼. 1초 동안 누르면 죽어.',action:tutText('{공격} 짧게 누르고 떼기 · 기절')};
 const story=episodeStoryMessage();if(story)return story;
 if(STAGE.story?.solo)return null;
 if(STAGE.firstSteps&&STAGE.storyEpisode){
  const i=S.tutI||0,passed=i===6&&S.openingPass;
  const archive=i===7&&openingArchiveGuard(),archiveReady=!!archive&&openingArchiveReady(),quietDesk=i===7&&!archive&&npc('archiveKeeper')?.state!=='DEAD';
  const archiveVia=!!archive&&!!openingArchiveApproach().via;
  let text=isTouch&&i===0?'올빼미, 제비 서류부터 찾자. 화면 왼쪽을 끌어 오른쪽 표시로 가 봐.':isTouch&&i===1?'웅크림을 누르고 상자 옆 풀숲으로 가 봐. 거기선 안 보일 거야.':OPENING_RADIO[i]||OPENING_RADIO[9];
  if(P.hide)text='이제 나와서 서류를 찾자. 나오기 전에 경비 위치부터 보고.';
  else if(i===7&&P.carrying)text='몸을 사물함에 숨기거나 내려놔. 들고 있으면 서류를 못 챙겨.';
  else if(archiveVia)text='복도 끝 왼쪽에 문이 있어. 그 문으로 들어가면 경비 뒤쪽으로 갈 수 있어.';
  else if(archive)text=archiveReady?'등 뒤에 붙었네. 아까처럼 공격을 짧게 눌렀다 떼.':'서류 앞에도 경비가 있네. 그 옷으로 지나갈 수는 있어. 서류 챙기는 건 들키면 안 돼.';
  else if(quietDesk)text='경비가 다른 데 보네. 지금 서류를 챙겨.';
  else if(i===4&&P.carrying)text='몸을 먼저 내려놔야 옷을 갈아입을 수 있어.';
  else if(passed)text='직원인 줄 아네. 걸어서 2층으로 올라가.';
  return{text,speaker:'master',cue:'opening:'+i+':'+!!P.hide+':'+!!(i===4&&P.carrying)+':'+!!passed+':'+!!archive+':'+archiveReady+':'+!!(i===7&&P.carrying)+':'+quietDesk+':'+archiveVia,action:tutText(P.hide?'{행동} 밖으로 나오기':goal.text)};
 }
 let text='표시된 목표로 가 봐. 가까이 가면 할 수 있는 행동이 보여.';
 if(evidencePending())text='카메라에 찍혔어. 전선을 끊어도 녹화된 건 남아. 보안 단말에서 기록을 지워.';
 else if(goal.exit||S.exitOpen)text='할 일은 끝났어. '+(flOf(P)?'계단으로 내려가서 ':'')+'노란 원으로 표시된 출구로 나와. 경비는 아직 있으니까 조심하고.';
 else if(STAGE.compound&&goal.compoundCue){
  const who=goal.g?targetName(goal.g).split(' · ')[0]:'표적';
  const item=S.items.find(it=>!it.got),itemName=item?.name||STAGE.itemNames?.[S.items.indexOf(item)]||STAGE.itemName||'서류';
  text=({dress:'혼자 있는 경비를 기절시키고 옷을 가져와. 그 옷이면 안으로 들어갈 수 있어.',
   hide:P.carrying?'가까운 풀숲이나 사물함에 숨기면 돼. 사람들이 보는지는 확인하고.':'쓰러진 사람이 발견되면 경비가 몰려와. 들어서 숨길 곳으로 옮겨.',
   guard:'1층에도 경비가 한 명 있어. 뒤에서 기절시키고, 근처 사물함에 숨기면 돼.',
   light:'벽 스위치를 꺼. 불을 켜러 오는 경비를 혼자 있을 때 노려.',
   stairs:goal.routeStep==='roofDown'?'건넜어. 오른쪽 계단실 문으로 들어가면 거래소 3층이야.':/내려/.test(goal.text)?'이 계단으로 한 층 내려가면 돼.':'계단으로 한 층 올라가. 도착하면 다음 길을 보자.',
   camera:STAGE.cameraApproach?(/전선 분리/.test(goal.text)?'지금은 카메라 뒤야. 벽에 붙은 전선을 분리해.':'오른쪽 벽을 따라 위로 돌아가. 카메라 앞은 지나가지 말고.'): '카메라는 공격하거나 물건을 가져가는 걸 찍어. 뒤쪽 전선부터 끊자.',
   window:({wire:'정비동 옆 작업대에 철사가 있어. 먼저 챙겨.',pick:'철사 챙겼지? 정비동 왼쪽 창문으로 가서 잠금을 풀어.',enter:'열렸네. 이제 그 창문으로 넘어가면 돼.'})[goal.routeStep]||'작업대의 철사를 챙겨서 서쪽 창문 잠금을 풀어 봐.',
   jump:goal.routeStep==='roofUp'?'옥상으로 올라가는 문이 있어. 그쪽으로 나가.':'오른쪽 지붕까지 뛸 수 있겠네. 가장자리에서 건너뛰어.',
   sign:'저 사람이 간판 아래에 올 때까지 기다려. 행동을 1초 누르면 간판 고정이 풀려.',
   target:goal.g?.unconscious?'아직 기절한 상태야. 이번 목표는 살해야. 몸 가까이에서 공격을 1초 동안 눌러.':goal.g?.moving?withJosa(who,'이/가')+' 움직이고 있어. 멈추면 뒤로 가서 가까이 붙어.':'찾던 사람은 '+withJosa(who,'이야/야')+'. 다른 경비가 안 볼 때 뒤에서 공격을 1초 동안 눌러.',
   document:itemName+'도 챙겨. 작업하는 동안 경비가 보는지 확인하고.'})[goal.compoundCue]||text;
 }
 else if(STAGE.starterContract==='disguise'&&goal.starter&&P.outfit!=='crew')text='골목에 경비가 혼자 있어. 기절시킨 다음 옷을 가져오면 되겠어.';
 else if(STAGE.id==='p0')text=npc('runner')?.unconscious?'박인호는 아직 살아 있어. 이번 의뢰는 살해야. 가까이에서 공격을 1초 동안 눌러.':'박인호는 적재장 쪽으로 돌아가면 뒤로 접근할 수 있어. 이번에는 공격을 길게 눌러야 해.';
 else if(goal.actionReady||actionBusy())text=actionBusy()?'움직이면 작업이 끊겨. 끝날 때까지 기다려. 경비가 오는지도 보고.':P.disguise?'그 옷이면 지나가도 괜찮아. 물건을 가져갈 때는 안 보이게 해야 하고.':'가까이에서 행동하면 돼. 작업이 끝날 때까지는 움직이지 마.';
 else if(STAGE.id==='p1')text='그 옷이면 경비 앞을 걸어가도 괜찮아. 서류는 경비가 다른 데 볼 때 챙기고.';
 else if(/계단|2층으로/.test(goal.text))text='계단으로 올라가 봐. 누가 있는지 먼저 확인하고 움직이자.';
 else if(['p2','e2','e4','e5'].includes(STAGE.id)&&S.cams.some(camOn))text='카메라 뒤쪽 벽으로 돌아가면 전선이 있어. 가까이에서 분리하면 돼. 기술은 필요 없어.';
 else if(['e3','e4'].includes(STAGE.id))text=flOf(P)?'서류는 지금 있는 층에 있어. 경비가 다른 데 볼 때 책상을 확인해 봐.':'직원 옷으로 들어가서 계단으로 올라가면 돼. 다른 경비까지 건드릴 필요는 없어.';
 else if(['e1','e5'].includes(STAGE.id))text='저 사람이 멈추면 뒤로 가 봐. 가까이에서 공격을 1초 동안 누르면 돼.';
 else if(STAGE.id==='m2')text='일단 표시된 곳부터 살펴보자.';
 return{text,action:tutText(goal.text),cue:evidencePending()?'camera:recorded':goal.exit||S.exitOpen?'mission:escape':goal.compoundCue?'compound:'+goal.compoundCue+':'+(goal.routeStep||goal.text)+':'+(goal.g?.tag||'')+':'+(goal.compoundCue==='hide'?!!P.carrying:goal.compoundCue==='target'?!!goal.g?.moving:''):goal.text,priority:evidencePending()?1:0};
}
// The mission stays stable. Immediate instructions belong to the radio.
function compactObjectiveText(){
 if(!S)return '';
 if(S.exitOpen)return evidencePending()?'CCTV 기록 삭제 후 탈출':(STAGE.exitName||'출구')+'로 탈출';
 if(STAGE.firstSteps&&STAGE.storyEpisode)return '연락 서류 회수 · 동쪽 골목 탈출';
 const targets=S.spare?[]:S.guards.filter(g=>g.target),parts=[];
 if(targets.length===1)parts.push(targetName(targets[0]).split(' · ')[0]+' 처치 '+targets.filter(targetEliminated).length+'/1');
 else if(targets.length)parts.push('표적 '+targets.filter(targetEliminated).length+'/'+targets.length+' 처치');
 if(STAGE.firstGoal&&pendingFirstGoal())return pendingFirstGoal().text;
 if(S.items.length){
  const names=S.items.map((it,i)=>STAGE.itemNames?.[i]||STAGE.itemName||'서류'),work=S.items.some(it=>{const a=itemObjectiveAction(it);return a&&a.kind!=='recovery';});
  const label=work?'업무':S.items.length===1?names[0]:names.every(n=>/서류|장부|암호표|계약서|인계서|명세서|원장/.test(n))?'서류':'물품';
  parts.push(label+' '+S.items.filter(i=>i.got).length+'/'+S.items.length+' '+(work?'완료':'회수'));
 }
 if(parts.length)return parts.concat(evidencePending()?'CCTV 기록 삭제 후 탈출':'탈출').join(' · ');
 return STAGE.mission||STAGE.purpose||nextGoal()?.text||'의뢰 목표 확인';
}
let episodeRadioTick=0,episodeRadioToken='',episodeRadioFaceKey='';
let episodeRadioScene=null,episodeRadioUntil=0,episodeRadioCue='',episodeRadioSeen=new Map(),episodeRadioLastAt=-999,episodeRadioLayoutAt=0,episodeRadioPriority=0,episodeRadioReadAt=0;
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
 const active=running&&!paused&&!S?.over&&!tactical&&!DLG.modal&&!S?.keypad&&!targetDialogueVisible()&&!loadoutOpen&&!envPicker&&!actionBusy()&&!S.player.killAnim&&!S.player.approachAttack&&!S.koHold;
 if(!active){el.hidden=true;button.hidden=true;button.setAttribute('aria-expanded','false');document.body.classList.remove('episode-coached','radio-peek');return;}
 if(now<episodeRadioTick)return;episodeRadioTick=now+80;
 if(episodeRadioScene!==S){episodeRadioScene=S;episodeRadioUntil=0;episodeRadioCue='';episodeRadioSeen=new Map();episodeRadioToken='';episodeRadioFaceKey='';episodeRadioLastAt=-999;episodeRadioLayoutAt=0;episodeRadioReadAt=0;}
 const message=episodeRadioMessage();button.hidden=!message;document.body.classList.toggle('episode-coached',!!message);
 if(message){
  const cue=message.cue||message.text,priority=message.priority||0;
  const fresh=cue!==episodeRadioCue&&(!episodeRadioSeen.has(cue)||priority>0&&now-episodeRadioSeen.get(cue)>4500)&&(priority>=episodeRadioPriority||now>=episodeRadioUntil||episodeRadioCue.startsWith('danger:'))&&(priority>=2||now-episodeRadioLastAt>750);
  if(fresh){
   episodeRadioUntil=now+clamp(3000+message.text.length*55,4700,7000);episodeRadioSeen.set(cue,now);episodeRadioCue=cue;episodeRadioLastAt=now;episodeRadioPriority=priority;episodeRadioLayoutAt=0;
   episodeRadioReadAt=now+clamp(1300+message.text.length*32,2800,4200);
   acknowledgeEpisodeStory(message);if(!open)sfx('radio');
  }
  // A lower priority line cannot replace an urgent instruction mid-transmission.
  if(fresh||open||now>=episodeRadioUntil){
   const speaker=message.speaker||'master',token=speaker+'|'+message.text+'|'+message.action;
   if(token!==episodeRadioToken){$('episodeRadioText').textContent=message.text;$('episodeRadioAction').textContent=message.action||'';$('episodeRadioSpeaker').textContent=speakerOf(speaker).name;$('episodeRadioChannel').textContent=speaker==='hero'?'· 응답':'· 무전';el.setAttribute('aria-label',speakerOf(speaker).name+'의 무전');episodeRadioToken=token;}
   if(episodeRadioFaceKey!==speaker&&drawFace($('episodeRadioFace'),speakerOf(speaker)))episodeRadioFaceKey=speaker;
  }
 }
 if(open)episodeRadioUntil=0;
 if(isTouch&&!open&&S.player.moving&&episodeRadioPriority<2&&now>=episodeRadioReadAt)episodeRadioUntil=0;
 const show=!!message&&(open||now<episodeRadioUntil&&(message.cue||message.text)===episodeRadioCue);
 el.dataset.compact=String(isTouch&&!open);
 el.hidden=!show;el.dataset.priority=String(episodeRadioPriority);button.setAttribute('aria-expanded',String(show));document.body.classList.toggle('radio-peek',show);
 const top=document.querySelector('#hud .top')?.getBoundingClientRect();if(top)document.documentElement.style.setProperty('--topb',Math.round(top.bottom)+'px');
 if(show)positionEpisodeRadio(now);else if(message)positionRadioReplay(now);
}
