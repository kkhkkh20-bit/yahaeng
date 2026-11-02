// The first visit teaches one action at a time, using the campaign's real rules.
const FIRST_STEPS = {
  id:'tB', no:'00', name:'연습 1 · 시야와 소리', sub:'기초 연습 (약 2분)', tutorial:true, firstSteps:true,
  mission:'보이는 곳과 들리는 소리를 구분하고, 풀숲에서 시선을 피해 빠져나온다.',
  brief:'한 번에 한 가지씩 직접 익힌다. 실수하면 방금 배운 단계부터 다시 시작한다.',
  W:26,H:18,start:[2,10],exit:[3,14],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.9,residents:0,
  well:'manhole',kunai:0,coins:0,bare:true,wires:[],roofs:[],bricks:[],challenges:[],
  build(m){
    m.fill(0,0,25,17,',');m.rect(0,0,25,17);
    m.fill(1,8,24,12,'.');m.fill(1,7,24,7,'=');m.fill(1,13,24,13,'=');
    m.many('B',[[8,10]]);m.many('H',[[20,8]]);
    m.many('T',[[3,5],[9,5],[17,5],[23,5],[3,15],[19,15],[24,15]]);
  },
  lamps:[[3,7,130,1],[10,9,300,1],[22,7,160,1]],
  guards:[{kind:'g1',tag:'practice',at:[10,6],post:90,still:true,radio:false}],
  items:[],itemName:'',itemNames:[],nextTutorial:'t0',
  steps:[
    ['{이동} 오른쪽 표시까지 이동', (S,P)=>P.x>4*48, ()=>({x:4.5*48,y:10.5*48}), '작은 파란 발밑 고리가 내 위치다.', 'move'],
    ['{달리기} 잠깐 뛰어 보기', (S,P)=>P.moving&&P.mode==='run'&&S.noises.some(n=>n.src==='step'&&n.mode==='run'), ()=>({x:5.5*48,y:10.5*48}), '퍼졌다 사라지는 점선 원은 발소리다. 뛰면 멀리 들린다.', 'run'],
    ['{살금} 몸을 낮추고 조금 이동', (S,P)=>P.moving&&P.mode==='sneak'&&S.noises.some(n=>n.src==='step'&&n.mode==='sneak'), ()=>({x:6.5*48,y:10.5*48}), '웅크린 걸음은 조용하다. 적은 뒤에서도 발소리를 듣는다.', 'crouch'],
    ['부채꼴 바깥 표시에서 잠깐 멈추기', (S,P)=>!P.moving&&Math.hypot(P.x-6.5*48,P.y-10.5*48)<24, ()=>({x:6.5*48,y:10.5*48}), '부채꼴은 적이 보는 곳이다. 밝은 곳에서는 멀리 본다.', 'move', 1.1],
    ['몸을 낮춘 채 풀숲 안으로 이동', (S,P)=>P.hidden&&Math.floor(P.x/48)===8&&Math.floor(P.y/48)===10, S=>S.bushes[0], '시야 안이라도 풀숲에 몸을 숨기면 보이지 않는다. 적이 바짝 오면 위험하다.', 'move'],
    ['풀숲에 숨은 채 {휘파람}', S=>!!S.lessonWhistle?.heard, S=>S.bushes[0], '보이지 않아도 소리를 들으면 그곳을 확인하러 온다.', 'whistle'],
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

// Interaction practice follows the perception lesson; cover and map tricks stay optional.
Object.assign(STAGES.find(s=>s.id==='t0'),{
  disguise:true, name:'연습 2 · 뒤에서 제압', sub:'기초 연습 (약 2분)', dropGuards:[1,2,3],
  mission:'등 뒤에서 붙잡고 기절시킨 뒤 옷을 바꾸고 흔적을 숨긴다.',
  brief:'시야와 소리를 피해 등 뒤로 접근한다. 한 번에 한 행동씩 익힌다.',
  steps:[
    ['{살금} 등 뒤의 표시로 접근', (S,P,I)=>I.sneakToggle&&Math.hypot(P.x-(8.5*48-30),P.y-9.5*48)<24, ()=>({x:8.5*48-30,y:9.5*48}), '조용히 다가가면 뒤에서는 나를 보지 못한다.', 'crouch'],
    ['등 뒤에서 {붙잡기}', (S,P)=>!!P.captive||S.guards[0].state==='DEAD', S=>S.guards[0], '붙잡은 뒤 가만히 있으면 심문한다.', 'grab'],
    ['{공격} 짧게 눌렀다 떼기', S=>S.guards[0].state==='DEAD', S=>S.guards[0], '짧게 누르면 기절. 길게 누르면 처치.', 'attack'],
    [(S,P)=>P.carrying?'{행동} · 먼저 내려놓기':S.envPickK==='dress'?'{행동} · 옷 갈아입기':'{대상}에서 옷 갈아입기 선택', (S,P)=>P.outfit==='crew', S=>S.corpses[0], '행동이 여러 개면 대상을 골라 실행한다. 옷이 맞으면 직원 구역을 통과한다.', (S,P)=>P.carrying||S.envPickK==='dress'?'env':'cycle'],
    ['{행동} · 쓰러진 경비 운반', (S,P)=>!!P.carrying||S.corpses.some(c=>c.stashed), S=>S.corpses[0], '같은 버튼이 지금 가능한 행동으로 바뀐다.', 'env'],
    ['수거함 앞에서 {행동} · 넣기', S=>S.corpses.some(c=>c.stashed), S=>S.hides.find(h=>h.type==='box'&&h.tx===9), '다른 경비가 발견하기 전에 흔적을 숨긴다.', 'env'],
    ['오른쪽 노란 원으로 이동', ()=>false, S=>S.exit, '의뢰에서는 목표를 마친 뒤 탈출한다.', 'move']
  ]
});
