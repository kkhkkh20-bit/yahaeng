// An in-world voice gives one useful next action. It never pauses or gates play.
const OPENING_RADIO=[
 '연락책 제비가 사라졌습니다. 오른쪽 골목부터 살펴보세요.',
 '몸을 낮추면 덜 보인다. 양복은 나중에 털지.',
 '저 친구는 출입문만 보는군요. 등 뒤 자리, 비었습니다.',
 '살려 두자. 공격은 짧게, 길게 누르면 죽는다.',
 '옷 좀 빌리자. 갈아입는 동안엔 가만히.',
 '경비는 왼쪽 풀숲에. 퇴근한 줄 알겠죠.',
 '옷도 빌렸고 흔적도 지웠다. 배차실 문으로 들어가서 2층으로.',
 '제비 필체다. 서류부터 챙기자. 빈손으로 야근할 순 없지.',
 '박인호… 금성 운송 2층. 좋아요. 우선 계단으로 내려오세요.',
 '첫 야근 끝. 동쪽 골목으로 나가자.'
];
function episodeRadioMessage(){
 if(!S||STAGE.story?.solo||!STAGE.storyEpisode&&!introductoryContract(STAGE)&&!(STAGE.id==='m2'&&!stageCleared(STAGE)))return null;
 const P=S.player,goal=nextGoal();if(!goal)return null;
 const chase=S.guards.some(g=>g.state==='ALERT'&&g.seen&&flOf(g)===flOf(P));
 if(chase)return{text:'들켰습니다. 지금은 싸우지 말고 모퉁이를 돌아 시야부터 끊으세요. 숨으면 다시 기회가 옵니다.',action:'모퉁이·풀숲으로 이동 · 시야 밖에서 수습'};
 if((P.hidden||P.hide)&&S.alevel>=2&&S.searchCause?.kind==='player')return{text:'시야를 끊었습니다. 지금은 숨어서 기다리세요. 경비가 지나가면 다시 움직입시다.',action:'숨은 채 대기 · 수색이 잦아들면 의뢰 계속'};
 if(P.captive)return P.captive.target?{text:'표적을 붙잡았군요. 이번 의뢰는 처치입니다. 공격을 1초 길게 누르세요. 짧게 누르면 기절합니다.',action:tutText('{공격} 1초 길게 · 살해')}:{text:'붙잡았군요. 짧게 공격하면 기절시킬 수 있습니다. 그 뒤 옷을 얻으세요.',action:tutText('{공격} 짧게 누르고 떼기 · 기절')};
 if(STAGE.firstSteps&&STAGE.storyEpisode){
  const i=S.tutI||0;
  const passed=i===6&&S.openingPass;
  const text=P.hide?'잘 숨었습니다. 다시 나와 서류를 찾읍시다.':i===4&&P.carrying?'몸을 내려놓아야 옷을 입을 수 있습니다. 먼저 행동으로 내려놓으세요.':passed?'통했군요. 평범하게 지나가면 됩니다. 서류 작업은 위층에서 조용히.':OPENING_RADIO[i]||OPENING_RADIO[9];
  return{text,speaker:passed?'master':[1,3,4,6,7,9].includes(i)?'hero':'master',cue:'opening:'+i+':'+!!P.hide+':'+!!(i===4&&P.carrying)+':'+!!passed,action:tutText(P.hide?'{행동} 밖으로 나오기':goal.text)};
 }
 let text='한 가지씩 처리합시다. 지금은 '+goal.text.replace(/\{[^}]*\}/g,'')+'부터입니다.';
 if(goal.exit||S.exitOpen)text='할 일은 끝났습니다. 더 싸울 필요 없습니다. 표시된 골목으로 빠져나오세요.';
 else if(evidencePending())text='신원이 녹화됐습니다. 관리 단말에서 감시망을 정지하고 기록도 지울 수 있습니다. 아직 수습할 수 있습니다.';
 else if(STAGE.compound&&goal.compoundCue){text=({dress:'경비 옷부터 빌립시다. 이번에도 주머니 주인은 잠깐 재워 두고요.',hide:'옷만 빌렸다고 퇴근 처리가 되진 않습니다. 몸도 안 보이게 옮깁시다.',guard:'1층 경비도 같은 방법입니다. 조용히 뒤에서 제압하고 사물함을 이용하세요.',light:'이번엔 불을 꺼 보죠. 누군가는 다시 켜러 와야 하니까. 어둠도 시간 제한이 있습니다.',stairs:'아래층에서 한 일은 위층에서도 통합니다. 계단 너머부터 살펴보세요.',camera:'경비 옷으로 걸어가는 것과 저 렌즈 앞에서 손을 쓰는 건 다릅니다. 카메라 뒤에서 전선을 끊으세요.',window:'작업대의 철사를 챙기면 창문 잠금을 풀 수 있습니다. 특별한 기술은 필요 없습니다.',jump:'세 층을 올라왔으니 길도 넓어졌군요. 한 칸 골목 건너 지붕으로 갑시다.',sign:'인계책이 간판 밑에 섰을 때 행동을 1초 길게 눌러 고정을 풀면 됩니다. 떨어진 뒤에는 다시 달 수 없고요.',target:'표적은 눈에 띄는 옷을 입었습니다. 다른 경비가 등을 돌렸을 때 길게 공격하세요.',document:'사람만 처리하면 반쪽입니다. 장부를 가져가야 다음 배후를 찾을 수 있죠.'})[goal.compoundCue]||text;}
 else if(STAGE.starterContract==='disguise'&&goal.starter&&P.outfit!=='crew')text='골목에 혼자 있는 경비가 있습니다. 기절시킨 다음 몸 옆에서 행동으로 옷을 얻으세요.';
 else if(STAGE.id==='p0')text=npc('runner')?.unconscious?'운반책은 아직 살아 있습니다. 이번 의뢰는 처치입니다. 몸 가까이서 공격을 1초 길게 누르세요.':'서류에서 찾은 운반책입니다. 적재장 옆으로 돌아 등 뒤를 잡으세요. 이번에는 공격을 길게 눌러 처리합니다.';
 else if(goal.actionReady||actionBusy())text=actionBusy()?'좋습니다. 작업이 끝날 때까지 움직이지 마세요. 주변의 시선도 살피고요.':(P.disguise?'지금입니다. 옷은 통행을 돕지만, 훔치는 모습까지 가려 주지는 않습니다.':'지금입니다. 가까이서 행동하고, 작업이 끝날 때까지 움직이지 마세요.');
 else if(STAGE.id==='p1')text='그 옷이면 물류실 경비 앞을 걸어가도 됩니다. 서류 작업은 경비가 등을 보일 때 하세요.';
 else if(/계단|2층으로/.test(goal.text))text='서두를 필요 없습니다. 표시된 계단으로 올라가세요. 같은 층에 도착한 뒤 다음 일을 봅시다.';
 else if(['p2','e2','e4','e5'].includes(STAGE.id)&&S.cams.some(camOn))text='카메라가 비추지 않는 벽 쪽으로 돌아가세요. 가까이서 전선을 분리하면 됩니다. 기술은 필요 없습니다.';
 else if(['e3','e4'].includes(STAGE.id))text=flOf(P)?'서류는 이 층에 있습니다. 경비가 보고 있지 않을 때 책상을 확인하세요.':'다시 2층 일입니다. 직원 옷으로 들어가 계단을 이용하세요. 다른 경비는 건드릴 필요 없습니다.';
 else if(['e1','e5'].includes(STAGE.id))text='표적이 멈추고 등을 보일 때가 기회입니다. 서두르지 마세요. 공격을 길게 눌러 처리합니다.';
 else if(STAGE.id==='m2')text='클럽은 넓지만 한 가지씩 합시다. 먼저 표시된 곳을 확인하세요. 통행과 작업은 별개입니다.';
 return{text,action:tutText(goal.text)+(goal.where?' · '+tutText(goal.where):'')};
}
// The live HUD carries one short action. Full instructions stay in the existing
// objective inspector, which already stops simulation while the player reads.
function compactObjectiveText(){
 if(!S)return '';
 const goal=nextGoal();if(!goal)return '';
 if(S.guards.some(g=>g.state==='ALERT'&&g.seen&&flOf(g)===flOf(S.player)))return '시야를 끊고 숨기';
 if(STAGE.firstSteps&&STAGE.storyEpisode&&!goal.interrupt){
  if(S.player.hide)return tutText('{행동} · 밖으로 나오기');
  return ['오른쪽 표시로 이동',isTouch?'웅크리기 · 풀숲으로':'Ctrl · 풀숲으로','경비의 등 뒤로 접근',
   isTouch?'공격 짧게 · 기절':'Z 짧게 · 기절','경비 옷 훔쳐 입기','경비를 풀숲에 숨기기',
   '배차실 2층으로','연락 서류 챙기기','계단으로 1층에 내려오기','동쪽 골목으로 탈출'][S.tutI||0]||'동쪽 골목으로 탈출';
 }
 if(!goal.interrupt&&!goal.exit&&!evidencePending()){
  if(!STAGE.compound&&STAGE.id==='p1'&&S.player.outfit==='crew'&&S.starterPass)return '출고 서류 챙기기';
  if(!STAGE.compound&&STAGE.id==='p2')return S.cams.some(camOn)?'CCTV 전선 분리':'배송 명세서 챙기기';
 }
 return tutText(goal.text).split(' · ')[0].replace('탈출 지점으로 빠져나가기','탈출 지점으로 이동');
}
let episodeRadioTick=0,episodeRadioToken='',episodeRadioFaceKey='';
let episodeRadioScene=null,episodeRadioUntil=0,episodeRadioCue='',episodeRadioSeen=new Map();
function syncEpisodeRadio(){
 const el=$('episodeRadio');if(!el)return;
 const now=performance.now(),box=document.querySelector('#hud .obj'),open=!!box?.classList.contains('open');
 const active=running&&!paused&&!S?.over&&!tactical&&!DLG.modal&&!S?.keypad&&!targetDialogueVisible()&&!loadoutOpen&&!envPicker;
 if(!active){el.hidden=true;document.body.classList.remove('episode-coached','radio-peek');return;}
 if(now<episodeRadioTick)return;episodeRadioTick=now+80;
 const message=episodeRadioMessage();
 document.body.classList.toggle('episode-coached',!!message);
 if(episodeRadioScene!==S){episodeRadioScene=S;episodeRadioUntil=0;episodeRadioCue='';episodeRadioSeen=new Map();}
 if(message){
  const cue=message.cue||message.text;
  if(cue!==episodeRadioCue&&(!episodeRadioSeen.has(cue)||now-episodeRadioSeen.get(cue)>18000)){
   episodeRadioUntil=now+4600;episodeRadioSeen.set(cue,now);
  }
  episodeRadioCue=cue;
  const speaker=message.speaker||'master',token=speaker+'|'+message.text+'|'+message.action;
  if(token!==episodeRadioToken){
   $('episodeRadioText').textContent=message.text;$('episodeRadioAction').textContent=message.action;
   $('episodeRadioSpeaker').textContent=speakerOf(speaker).name;
   $('episodeRadioChannel').textContent=speaker==='hero'?'· 혼잣말':'· 무전';
   el.setAttribute('aria-label',speakerOf(speaker).name+(speaker==='hero'?'의 혼잣말':'의 무전'));episodeRadioToken=token;
  }
  if(open&&episodeRadioFaceKey!==speaker&&drawFace($('episodeRadioFace'),speakerOf(speaker)))episodeRadioFaceKey=speaker;
 }
 if(open)episodeRadioUntil=0;
 // Every new beat speaks once, in the header; walking never summons a world panel.
 const peek=!!message&&!open&&H>480&&now<episodeRadioUntil&&!actionBusy(S.player)&&!input.aiming;
 document.body.classList.toggle('radio-peek',peek);el.hidden=!message||(!open&&!peek);
 const top=document.querySelector('#hud .top')?.getBoundingClientRect();
 if(top)document.documentElement.style.setProperty('--topb',Math.round(top.bottom)+'px');
}
