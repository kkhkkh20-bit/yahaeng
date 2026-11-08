// A small Korean freight depot: every lesson action advances the same infiltration.
const FIRST_STEPS = {
 id:'tB',no:'00',name:'닫힌 배차실',sub:'첫 번째 밤 · 대성 물류',layoutRevision:214,storyEpisode:true,episodeLesson:true,tutorial:true,firstSteps:true,lessonLoot:true,physicalWorld:true,
 noSupport:true,noAmbientChats:true,noRefine:true,floors:true,pspd:1.25,gspd:.8,residents:0,
 mission:'야간 배차실 2층에서 연락 서류를 회수하고 동쪽 골목으로 빠져나온다.',
 brief:'제비가 마지막으로 남긴 말은 “야간 배차실”. 경비를 조용히 재우고, 옷을 빌리고, 흔적을 숨긴다. 직원처럼 문을 통과해 2층 책상의 연락 서류를 가져오자. 까마귀가 골목을 봐 준다.',
 endText:'까마귀: 첫 야근 치고 깔끔하군요. 제비가 남긴 이름은 박인호. 금성 운송 2층에서 증인을 넘길 전화를 기다린답니다. 이번에는 그 전화를 끊으러 갑시다. 다음 출발 전에 1P를 배우거나 모아 둘 수 있습니다.',
 W:34,H:23,start:[2,10],exit:[29,15],exitName:'동쪽 골목',startA:0,well:'manhole',bare:true,ownedLoadout:true,
 kunai:0,coins:0,wires:[],roofs:[],bricks:[],challenges:[],
 industrialBuildings:[0,2],
 buildingNames:{0:'대성 물류 · 창고',1:'야간 배차실',2:'수리 작업장'},
 build(m){
  m.fill(0,0,33,22,',');m.rect(0,0,33,22);
  m.fill(1,8,32,12,'=');m.fill(1,13,32,17,'.');m.fill(1,13,32,13,'=');m.fill(1,17,32,17,'=');
  m.bld(1,1,12,6,2,[],'h');m.villa(14,3,24,14,2,{kind:'shop',use:['store','office'],signs:['대성 물류','배차실'],name:'야간 배차실'});m.set(14,10,'d');
  m.bld(2,19,13,21,1,[[8,19]],'h');
  m.fill(6,9,8,9,'C');m.many('B',[[7,10],[2,12],[12,12],[24,17]]);
  m.fill(27,3,30,5,'C');m.car(27,9,1);m.car(17,18,2);m.car(5,15,0);
  m.many('T',[[4,7],[12,3],[30,3],[31,12],[2,18],[28,20]]);m.many('H',[[22,11]]);
 },
 lamps:[[3,7,130,1],[10,9,240,1],[30,13,230,1],[6,7,300,1],[19,9,210,0]],
 guards:[{kind:'g1',tag:'practice',at:[10,10],post:0,still:true,radio:false},
  {kind:'g1',tag:'dispatchClerk',at:[16,12],post:0,still:true,radio:false}],
 zones:[[0,0,33,22,'pub',null,'물류 골목',[]],[14,3,24,14,'res',null,'배차실 · 직원만',['crew']]],zoneAllow:['crew'],
 // A dispatch depot stores parcels, not the grocery fridges of the base shop.
 roomPatches:[{fl:0,bounds:[15,4,20,12],furniture:[{t:'fridge',from:[15,4],remove:true},{t:'fridge',from:[16,4],remove:true}],tiles:[[15,4,'t'],[16,4,'t']]}],
 fixedFurn:[{x:15,y:4,t:'boxes',w:2},{x:19,y:4,t:'locker'},
  ...[6,8,10].map(y=>({x:16,y,t:'shelf',w:3,skin:'freight'}))],
 dressing:[{kind:'board',x:17.2,y:3.15,w:2.8,h:.8,text:'야간 배차',fl:1},{kind:'bay',x:5.7,y:8.7,w:3.6,h:1.6,text:'적재'},{kind:'bay',x:26.5,y:2.7,w:4.5,h:3.6,text:'02'}],
 items:[{b:1,fl:1,at:'R'}],itemName:'연락 서류',itemNames:['연락 서류'],itemPlaces:['배차실 2층 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],nextTutorial:null,
 steps:[
  ['{이동} 오른쪽 표시로 접근',(S,P)=>Math.hypot(P.x-216,P.y-504)<24,()=>({x:216,y:504}),'까마귀가 길을 보고 있다. 서류는 배차실 2층에 있다.','move'],
  [(S,P)=>P.mode==='sneak'?'웅크린 채 상자 옆 풀숲으로 이동':'{살금} 몸을 낮추고 풀숲으로 이동',(S,P)=>P.hidden&&!P.hide&&!P.trav||!S.guards[0]||S.guards[0].state==='DEAD',S=>S.bushes.find(b=>Math.abs(b.x-360)<2&&Math.abs(b.y-504)<2),'상자와 풀숲이 경비의 시야를 가린다. 풀숲 밖에서 제압한다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
  ['풀숲을 나와 경비의 등 뒤로 접근',(S,P)=>!S.guards[0]||S.guards[0].state==='DEAD'||!P.hidden&&P.mode==='sneak'&&Math.hypot(P.x-S.guards[0].x,P.y-S.guards[0].y)<=44&&(P.x-S.guards[0].x)*Math.cos(S.guards[0].a)+(P.y-S.guards[0].y)*Math.sin(S.guards[0].a)<0,S=>{const g=S.guards[0];return g?{x:g.x-Math.cos(g.a)*40,y:g.y-Math.sin(g.a)*40}:S.bushes[0];},'발밑의 뒤쪽 표시까지 접근한다. 표적도 일반 경비도 짧게 누르면 기절한다.','move'],
  ['{공격} 짧게 눌렀다 떼어 기절시키기',S=>!S.guards[0]||S.guards[0].state==='DEAD',S=>S.guards[0],'기절은 살아 있으며 깨어날 수 있다. 1초 길게 누르면 살해한다. 이번에는 짧게 누르고 손을 떼자.','attack'],
  [(S,P)=>P.carrying?'{행동} 몸을 내려놓고 옷 훔쳐 입기':'몸 옆에서 {행동} · 옷 훔쳐 입기',(S,P)=>P.outfit==='crew',S=>S.corpses[0]||S.guards[0],'옷은 사람에게서 얻는다. 갈아입는 3초 동안 움직이지 않는다. 이 복장으로 배차실을 통과할 수 있다.','env',0,['dress','carry','drop','retrieve','leave']],
  [(S,P)=>P.carrying?'상자 옆 풀숲에서 {행동} · 몸 숨기기':'몸 옆에서 {행동} · 운반',S=>!S.guards[0]&&!S.corpses.length||S.corpses.some(c=>c.hidden||c.stashed),S=>S.player.carrying?{x:360,y:504}:S.corpses[0],'옷을 입은 뒤 경비가 발견되지 않게 풀숲에 숨긴다.',(S,P)=>P.carrying&&Math.hypot(P.x-360,P.y-504)>48?'move':'env',0,['carry','quickStash','stash']],
  ['배차실에 들어가 계단으로 2층에 올라가기',(S,P)=>P.fl===1&&!P.trav,S=>S.lessonLayout?.up,'직원 옷은 통행을 돕는다. 계단은 기술 없이 이용한다.','env',0,['up','door']],
  ['2층 책상에서 연락 서류 챙기기',S=>S.items[0].got,S=>S.items[0],'서류 앞에서 행동한다. 작업이 끝나면 들고 나간다.','env',0,['loot']],
  ['계단으로 다시 1층에 내려오기',(S,P)=>!P.fl&&!P.trav,S=>S.lessonLayout?.down,'동쪽 골목은 1층 밖이다. 계단을 내려간다.','env',0,['fdown']],
  ['배차실을 나와 동쪽 골목으로 빠져나오기',()=>false,S=>S.exit,'다음 출발 전에 기술 포인트 1P를 사용할 수 있다.','move']
 ]
};
STAGES.push(FIRST_STEPS);
// Advanced lessons remain available, after the shorter first lesson.
for(const [id,n] of [['t0',2],['tI',3],['t1',4]]){
  const s=STAGES.find(s=>s.id===id);if(s)s.name=s.name.replace(/연습 \d/,`연습 ${n}`);
}

STAGES.find(s=>s.id==='tI').sub='연습 · 신분 (선택, 약 4분)';

// A short freight alley practices the campaign's close contact and physical cleanup.
Object.assign(STAGES.find(s=>s.id==='t0'),{
  name:'연습 2 · 제압과 몸 숨기기',sub:'의뢰 01 준비 · 물류 골목',disguise:false,
  W:23,H:17,start:[2,10],exit:[20,10],startA:0,noSupport:true,noAmbientChats:true,bare:true,
  dropGuards:[],items:[],itemName:'',itemNames:[],wires:[],roofs:[],bricks:[],keyBld:[],
  mission:'골목 경비를 뒤에서 제압하고 풀숲에 숨긴 뒤 반대편 출구로 나간다.',
  brief:'골목을 지키는 경비는 한 명이다. 풀숲에서 나와 등 뒤로 바짝 접근하고, 쓰러진 몸은 풀숲으로 옮긴다.',
  build(m){
    m.fill(0,0,22,16,',');m.rect(0,0,22,16);
    m.fill(1,8,21,12,'.');m.fill(1,7,21,7,'=');m.fill(1,13,21,13,'=');
    m.vacant(3,2,19,5,'lot','물류 적치장');m.fill(3,3,7,4,'U');m.fill(14,3,18,4,'U');
    m.many('B',[[7,10],[7,11]]);m.many('T',[[2,3],[21,3],[3,15],[19,15]]);
  },
  lamps:[[5,7,180,1],[16,7,200,1]],
  guards:[{kind:'g1',tag:'practice',at:[10,10],post:0,still:true,radio:false}],
  steps:[
    [(S,P)=>P.mode==='sneak'?'웅크린 채 왼쪽 풀숲으로 이동':'{살금} 몸을 낮추고 풀숲으로 이동',(S,P)=>P.hidden&&Math.floor(P.x/48)===7||(!S.guards[0]||S.guards[0].state==='DEAD'), S=>S.bushes[0],'풀숲에 들어가는 버튼은 없다. 웅크려 걸어 들어가면 자동으로 숨는다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['풀숲을 나와 등 뒤 표시까지 바짝 접근',(S,P)=>!P.hidden&&P.mode==='sneak'&&Math.hypot(P.x-(10.5*48-40),P.y-10.5*48)<12&&Math.hypot(P.x-S.guards[0].x,P.y-S.guards[0].y)<=44||(!S.guards[0]||S.guards[0].state==='DEAD'),()=>({x:10.5*48-40,y:10.5*48}),'기본 제압은 풀숲 밖에서 한 걸음 거리까지 다가간다. 이미 배운 기습이나 도구도 사용할 수 있다.','move'],
    ['{공격} 짧게 눌렀다 떼어 기절시키기',S=>(!S.guards[0]||S.guards[0].state==='DEAD'),S=>S.guards[0],'짧게 누르면 기절, 길게 누르면 처치한다. 이 연습은 짧게 눌러 보자.','attack'],
    ['몸 옆에서 {행동} · 운반',(S,P)=>!!P.carrying||S.corpses.some(c=>c.hidden||c.stashed),S=>S.corpses[0],'먼저 쓰러뜨린 다음 몸을 옮긴다. 운반 중에는 느려지고 뛸 수 없다.','env',0,['carry','quickStash']],
    [(S,P)=>!P.carrying?'몸 옆에서 {행동} · 다시 운반':Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)>48?'몸을 멘 채 왼쪽 풀숲으로 이동':'풀숲에서 {행동} · 몸 숨기기',S=>!S.guards[0]&&!S.corpses.length||S.corpses.some(c=>c.hidden||c.stashed),S=>S.player.carrying?S.bushes[0]:S.corpses[0],'내 몸은 웅크리면 숨는다. 들고 있는 몸은 풀숲에서 행동을 눌러 숨긴다.',(S,P)=>!P.carrying||Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)<=48?'env':'move',0,['carry','quickStash','stash']],
    ['오른쪽 출구로 이동',()=>false,S=>S.exit,'목적을 마치면 노란 출구로 나온다. 다음은 같은 행동을 실제 의뢰에서 사용한다.','move']
  ]
});
