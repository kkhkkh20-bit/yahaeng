// The first visit teaches one action at a time, using the campaign's real rules.
const FIRST_STEPS = {
  id:'tB',no:'00',name:'첫 잠입 · 골목의 서류',sub:'첫 스테이지 · 제압과 회수',tutorial:true,firstSteps:true,lessonLoot:true,
  noSupport:true,noAmbientChats:true,noRefine:true,floors:false,pspd:1.25,gspd:.8,residents:0,
  mission:'경비를 조용히 제압하고 몸을 숨긴 뒤 서류를 회수해 골목을 빠져나간다.',
  brief:'한 명의 경비, 한 묶음의 서류. 왼쪽 풀숲으로 접근해 등 뒤에서 제압하고, 몸을 숨긴 뒤 책상의 서류를 챙긴다.',
  endText:'첫 잠입을 마쳤다. 다음 출발 준비에서 4P로 원하는 기술을 배우자. 다음 임무부터 배운 기술과 장비를 사용할 수 있다.',
  W:26,H:18,start:[2,10],exit:[20,10],exitName:'골목 출구',startA:0,well:'manhole',bare:true,ownedLoadout:true,
  kunai:0,coins:0,wires:[],roofs:[],bricks:[],challenges:[],
  build(m){
    m.fill(0,0,25,17,',');m.rect(0,0,25,17);m.fill(1,8,24,12,'.');m.fill(1,7,24,7,'=');m.fill(1,13,24,13,'=');
    m.fill(6,9,8,9,'#');m.many('B',[[7,10]]);m.many('H',[[20,8]]);
    m.many('T',[[3,5],[9,5],[17,5],[23,5],[3,15],[19,15],[24,15]]);
  },
  lamps:[[3,7,130,1],[10,9,300,1],[22,7,160,1],[6,7,400,1]],
  guards:[{kind:'g1',tag:'practice',at:[10,10],post:0,still:true,radio:false}],
  fixedFurn:[{x:15,y:9,t:'desk',w:2,h:1}],items:[[15,10]],itemName:'연락 서류',itemNames:['연락 서류'],
  itemActions:[{kind:'recovery',duration:1.2}],nextTutorial:'t0',
  steps:[
    ['{이동} 오른쪽 표시로 접근',(S,P)=>Math.hypot(P.x-216,P.y-504)<24,()=>({x:216,y:504}),'책상의 서류를 챙겨 오른쪽 골목으로 빠져나간다. 먼저 경비의 등 뒤로 다가가자.','move'],
    [(S,P)=>P.mode==='sneak'?'웅크린 채 풀숲으로 이동':'{살금} 몸을 낮추고 풀숲으로 이동',(S,P)=>P.hidden&&!P.hide&&!P.trav||(!S.guards[0]||S.guards[0].state==='DEAD'),S=>S.bushes[0],'풀숲에서는 몸이 가려진다. 기본 제압은 풀숲 밖에서 한다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['풀숲을 나와 경비의 등 뒤로 접근',(S,P)=>(!S.guards[0]||S.guards[0].state==='DEAD')||!P.hidden&&P.mode==='sneak'&&Math.hypot(P.x-S.guards[0].x,P.y-S.guards[0].y)<=44&&(P.x-S.guards[0].x)*Math.cos(S.guards[0].a)+(P.y-S.guards[0].y)*Math.sin(S.guards[0].a)<0,S=>{const g=S.guards[0];return g?{x:g.x-Math.cos(g.a)*40,y:g.y-Math.sin(g.a)*40}:S.bushes[0];},'경비가 돌아보면 잠시 거리를 두고, 다시 등을 보일 때 다가간다.','move'],
    ['{공격} 짧게 눌러 경비 제압',S=>(!S.guards[0]||S.guards[0].state==='DEAD'),S=>S.guards[0],'짧게 누르면 기절시킨다. 제압 동작이 끝나면 바로 몸을 옮길 수 있다.','attack'],
    [(S,P)=>P.carrying?'풀숲으로 옮긴 뒤 {행동} · 몸 숨기기':'몸 옆에서 {행동} · 운반',S=>!S.guards[0]&&!S.corpses.length||S.corpses.some(c=>c.hidden||c.stashed),S=>S.player.carrying?S.bushes[0]:S.corpses[0],'메고 이동한 뒤 풀숲에서 행동을 한 번 더 누른다. 내려놨다면 다시 운반할 수 있다.',(S,P)=>P.carrying&&Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)>48?'move':'env',0,['carry','quickStash','stash']],
    ['책상의 연락 서류 챙기기',S=>S.items[0].got,S=>S.items[0],'서류철 앞에서 행동을 누르고 작업이 끝날 때까지 기다린다.','env',0,['loot']],
    ['오른쪽 골목 출구로 이동',()=>false,S=>S.exit,'첫 임무를 마치면 출발 준비에서 기술을 배운다. 다음 스테이지에서 바로 활용할 수 있다.','move']
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
    ['풀숲을 나와 등 뒤 표시까지 바짝 접근',(S,P)=>!P.hidden&&P.mode==='sneak'&&Math.hypot(P.x-(10.5*48-40),P.y-10.5*48)<12&&Math.hypot(P.x-S.guards[0].x,P.y-S.guards[0].y)<=44||(!S.guards[0]||S.guards[0].state==='DEAD'),()=>({x:10.5*48-40,y:10.5*48}),'숨은 채 공격하는 기술은 아직 없다. 풀숲 밖에서 한 걸음 거리까지 다가간다.','move'],
    ['{공격} 짧게 눌렀다 떼어 기절시키기',S=>(!S.guards[0]||S.guards[0].state==='DEAD'),S=>S.guards[0],'짧게 누르면 기절, 길게 누르면 처치한다. 이 연습은 짧게 눌러 보자.','attack'],
    ['몸 옆에서 {행동} · 운반',(S,P)=>!!P.carrying||S.corpses.some(c=>c.hidden||c.stashed),S=>S.corpses[0],'먼저 쓰러뜨린 다음 몸을 옮긴다. 운반 중에는 느려지고 뛸 수 없다.','env',0,['carry','quickStash']],
    [(S,P)=>!P.carrying?'몸 옆에서 {행동} · 다시 운반':Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)>48?'몸을 멘 채 왼쪽 풀숲으로 이동':'풀숲에서 {행동} · 몸 숨기기',S=>!S.guards[0]&&!S.corpses.length||S.corpses.some(c=>c.hidden||c.stashed),S=>S.player.carrying?S.bushes[0]:S.corpses[0],'내 몸은 웅크리면 숨는다. 들고 있는 몸은 풀숲에서 행동을 눌러 숨긴다.',(S,P)=>!P.carrying||Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)<=48?'env':'move',0,['carry','quickStash','stash']],
    ['오른쪽 출구로 이동',()=>false,S=>S.exit,'목적을 마치면 노란 출구로 나온다. 다음은 같은 행동을 실제 의뢰에서 사용한다.','move']
  ]
});
