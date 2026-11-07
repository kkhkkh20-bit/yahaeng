// An in-world voice gives one useful next action. It never pauses or gates play.
const OPENING_RADIO=[
 '제비가 사라졌습니다, 올빼미. 마지막 단서는 배차실 2층의 서류입니다.',
 '상자 옆 풀숲이 보이죠? 몸을 낮추면 경비 눈을 피할 수 있습니다.',
 '좋습니다. 풀숲에서 나와 저 경비의 등 뒤까지 조용히 접근하세요.',
 '살려 두고 옷만 빌립시다. 공격을 짧게 누르고 떼세요. 길게 누르면 죽습니다.',
 '이제 경비의 옷을 입으세요. 갈아입는 동안에는 움직이지 마십시오.',
 '제법 어울리는군요. 경비는 왼쪽 풀숲에 숨겨 두고 갑시다.',
 '배차실 문으로 들어가세요. 서류는 계단을 올라간 2층 책상에 있습니다.',
 '저 책상입니다. 가까이서 서류를 챙기세요. 작업이 끝날 때까지 기다립니다.',
 '서류 확보했군요. 들어왔던 계단으로 내려와 동쪽 골목으로 빠집시다.',
 '동쪽 골목에 차를 대 놨습니다. 잘했습니다, 올빼미. 이제 나옵시다.'
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
  const text=P.hide?'잘 숨었습니다. 다시 나와 서류를 찾읍시다.':i===4&&P.carrying?'몸을 내려놓아야 옷을 입을 수 있습니다. 먼저 행동으로 내려놓으세요.':OPENING_RADIO[i]||OPENING_RADIO[9];
  return{text,action:tutText(P.hide?'{행동} 밖으로 나오기':goal.text)};
 }
 let text='한 가지씩 처리합시다. 지금은 '+goal.text.replace(/\{[^}]*\}/g,'')+'부터입니다.';
 if(goal.exit||S.exitOpen)text='할 일은 끝났습니다. 더 싸울 필요 없습니다. 표시된 골목으로 빠져나오세요.';
 else if(evidencePending())text='신원이 녹화됐습니다. 관리 단말에서 감시망을 정지하고 기록도 지울 수 있습니다. 아직 수습할 수 있습니다.';
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
 if(STAGE.firstSteps&&STAGE.storyEpisode&&!goal.interrupt){
  if(S.player.hide)return tutText('{행동} · 밖으로 나오기');
  return ['오른쪽 표시로 이동','웅크려 풀숲으로','경비의 등 뒤로 접근',
   isTouch?'공격 짧게 · 기절':'Z 짧게 · 기절','경비 옷 훔쳐 입기','경비를 풀숲에 숨기기',
   '배차실 2층으로','연락 서류 챙기기','계단으로 1층에 내려오기','동쪽 골목으로 탈출'][S.tutI||0]||'동쪽 골목으로 탈출';
 }
 return tutText(goal.text).split(' · ')[0].replace('탈출 지점으로 빠져나가기','탈출 지점으로 이동');
}
let episodeRadioTick=0,episodeRadioToken='',episodeRadioFaceReady=false;
let episodeRadioScene=null,episodeRadioUntil=0;
function syncEpisodeRadio(){
 const el=$('episodeRadio');if(!el)return;
 const now=performance.now(),box=document.querySelector('#hud .obj'),open=!!box?.classList.contains('open');
 const active=running&&!paused&&!S?.over&&!tactical&&!DLG.modal&&!S?.keypad&&!targetDialogueVisible()&&!loadoutOpen&&!envPicker;
 if(!active){el.hidden=true;document.body.classList.remove('episode-coached','radio-peek');return;}
 if(now<episodeRadioTick)return;episodeRadioTick=now+80;
 const message=episodeRadioMessage();
 document.body.classList.toggle('episode-coached',!!message);
 if(episodeRadioScene!==S){episodeRadioScene=S;episodeRadioUntil=now+4500;}
 const moving=S.player.moving||(input.joy?.mag||0)>.05||Object.values(S.keys||{}).some(Boolean)||actionBusy(S.player)||input.aiming;
 if(moving||open)episodeRadioUntil=0;
 const peek=!!message&&!open&&now<episodeRadioUntil;
 document.body.classList.toggle('radio-peek',peek);el.hidden=!message||(!open&&!peek);
 if(message){
  const token=message.text+'|'+message.action;
  if(token!==episodeRadioToken){$('episodeRadioText').textContent=message.text;$('episodeRadioAction').textContent=message.action;episodeRadioToken=token;}
  if(open&&!episodeRadioFaceReady)episodeRadioFaceReady=drawFace($('episodeRadioFace'),speakerOf('master'));
 }
 const top=document.querySelector('#hud .top')?.getBoundingClientRect();
 if(top)document.documentElement.style.setProperty('--topb',Math.round(top.bottom)+'px');
}
