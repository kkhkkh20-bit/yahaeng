// The first visit teaches one action at a time, using the campaign's real rules.
const FIRST_STEPS = {
  id:'tB', no:'00', name:'연습 1 · 시야와 소리', sub:'기초 연습 (약 3분)', tutorial:true, firstSteps:true, noSupport:true,noAmbientChats:true,
  mission:'경비에게 들키지 않고 골목 남쪽 출구로 빠져나간다.',
  brief:'한 번에 한 가지씩 직접 익힌다. 실수하면 방금 배운 단계부터 다시 시작한다.',
  W:26,H:18,start:[2,10],exit:[3,14],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.9,residents:0,
  well:'manhole',kunai:0,coins:0,bare:true,wires:[],roofs:[],bricks:[],challenges:[],
  build(m){
    m.fill(0,0,25,17,',');m.rect(0,0,25,17);
    m.fill(1,8,24,12,'.');m.fill(1,7,24,7,'=');m.fill(1,13,24,13,'=');
    m.fill(6,9,8,9,'#'); // 낮은 골목 담 뒤로 시야를 끊고 빠져나온다.
    m.many('B',[[9,10]]);m.many('H',[[20,8]]);
    m.many('T',[[3,5],[9,5],[17,5],[23,5],[3,15],[19,15],[24,15]]);
  },
  lamps:[[3,7,130,1],[10,9,300,1],[22,7,160,1],[6,7,400,1]],
  guards:[{kind:'g1',tag:'practice',at:[10,6],post:90,still:true,radio:false}],
  items:[],itemName:'',itemNames:[],nextTutorial:'t0',
  steps:[
    ['{이동} 오른쪽 표시까지 이동', (S,P)=>P.x>4*48, ()=>({x:4.5*48,y:10.5*48}), '내 캐릭터를 움직여 골목 남쪽 출구로 나가는 연습이다. 먼저 오른쪽 표시를 따라가자.', 'move'],
    ['{달리기} 잠깐 뛰어 보기', (S,P)=>P.moving&&P.mode==='run'&&S.noises.some(n=>n.src==='step'&&n.mode==='run'), ()=>({x:5.5*48,y:10.5*48}), '퍼졌다 사라지는 점선 원은 발소리다. 뛰면 멀리 들린다.', 'run'],
    [(S,P)=>P.mode==='sneak'?'몸을 낮춘 채 조금 이동':'{살금} 몸을 낮추고 조금 이동', (S,P)=>P.moving&&P.mode==='sneak'&&S.noises.some(n=>n.src==='step'&&n.mode==='sneak'), ()=>({x:6.5*48,y:10.5*48}), '웅크린 걸음은 조용하다. 적은 뒤에서도 발소리를 듣는다.', (S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['부채꼴 바깥 표시에서 잠깐 멈추기', (S,P)=>!P.moving&&Math.hypot(P.x-6.5*48,P.y-10.5*48)<24, ()=>({x:6.5*48,y:10.5*48}), '부채꼴은 적이 보는 곳이다. 그 바깥에서는 몸이 드러나도 보지 못한다.', 'move', 1.1],
    [(S,P)=>P.mode==='sneak'?'웅크린 채 풀숲 안으로 이동':'{살금} 웅크린 다음 풀숲 안으로 이동', (S,P)=>P.hidden&&!P.hide&&!P.trav&&Math.floor(P.x/48)===9&&Math.floor(P.y/48)===10, S=>S.player.y>10.8*48||S.player.y<10.2*48?{x:6.5*48,y:10.5*48}:S.bushes[0], '웅크려 들어가면 몸이 가려진다. 일어서거나 풀숲 밖으로 나오면 은폐가 풀린다.', (S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['풀숲에 숨은 채 {휘파람}', (S,P)=>P.hidden&&!!S.lessonWhistle?.heard&&!!S.lessonWhistle?.hidden, S=>S.bushes[0], '숨어 있어도 소리는 들린다. 적은 소리가 난 곳으로 확인하러 온다.', 'whistle'],
    ['{이동} 왼쪽 표시로 빠져나오기', (S,P)=>!P.hidden&&!P.hide&&P.x<6.7*48, ()=>({x:6*48,y:10.5*48}), '적이 소리 난 곳을 보는 동안 조용히 다른 쪽으로 빠진다.', 'move'],
    ['아래쪽 노란 원으로 이동', ()=>false, S=>S.exit, '시야를 피하고 소리를 줄인다. 다음 연습에서는 뒤에서 제압한다.', 'move']
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
    [(S,P)=>P.mode==='sneak'?'웅크린 채 왼쪽 풀숲으로 이동':'{살금} 몸을 낮추고 풀숲으로 이동',(S,P)=>P.hidden&&Math.floor(P.x/48)===7||S.guards[0].state==='DEAD', S=>S.bushes[0],'풀숲에 들어가는 버튼은 없다. 웅크려 걸어 들어가면 자동으로 숨는다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['풀숲을 나와 등 뒤 표시까지 바짝 접근',(S,P)=>!P.hidden&&P.mode==='sneak'&&Math.hypot(P.x-(10.5*48-28),P.y-10.5*48)<12&&Math.hypot(P.x-S.guards[0].x,P.y-S.guards[0].y)<=32||S.guards[0].state==='DEAD',()=>({x:10.5*48-28,y:10.5*48}),'숨은 채 공격하는 기술은 아직 없다. 풀숲 밖에서 한 걸음 거리까지 다가간다.','move'],
    ['{공격} 짧게 눌렀다 떼어 기절시키기',S=>S.guards[0].state==='DEAD',S=>S.guards[0],'짧게 누르면 기절, 길게 누르면 처치한다. 이 연습은 짧게 눌러 보자.','attack'],
    ['몸 옆에서 {행동} · 운반',(S,P)=>!!P.carrying||S.corpses.some(c=>c.hidden||c.stashed),S=>S.corpses[0],'먼저 쓰러뜨린 다음 몸을 옮긴다. 운반 중에는 느려지고 뛸 수 없다.','env'],
    [(S,P)=>!P.carrying?'몸 옆에서 {행동} · 다시 운반':Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)>48?'몸을 멘 채 왼쪽 풀숲으로 이동':'풀숲에서 {행동} · 몸 숨기기',S=>S.corpses.some(c=>c.hidden||c.stashed),S=>S.player.carrying?S.bushes[0]:S.corpses[0],'내 몸은 웅크리면 숨는다. 들고 있는 몸은 풀숲에서 행동을 눌러 숨긴다.',(S,P)=>!P.carrying||Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)<=48?'env':'move'],
    ['오른쪽 출구로 이동',()=>false,S=>S.exit,'목적을 마치면 노란 출구로 나온다. 다음은 같은 행동을 실제 의뢰에서 사용한다.','move']
  ]
});
