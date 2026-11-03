STAGES.push({
 id:'tA',no:'00',name:'연습 7 · 은신 기습',sub:'선택 연습 · 배워야 쓸 수 있는 기습',tutorial:true,trialSkills:['ambush'],flowPractice:true,noSupport:true,noAmbientChats:true,
 mission:'풀숲에서 기절과 처치 기습을 구분해 사용한다.',brief:'은신 기습만 임시 지급되는 연습이다. 본편에서는 제압 숙련 다음에 1P로 배운다.',
 W:25,H:17,start:[3,8],exit:[21,12],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.9,residents:0,bare:true,kunai:0,coins:0,items:[],itemName:'',itemNames:[],well:'manhole',
 build(m){m.fill(0,0,24,16,',');m.rect(0,0,24,16);m.fill(1,6,23,11,'.');m.fill(1,5,23,5,'=');m.fill(1,12,23,12,'=');m.set(6,8,'B');m.set(16,8,'B');m.set(19,11,'B');m.many('T',[[4,3],[12,3],[21,3],[7,14]]);},
 lamps:[],wires:[],roofs:[],bricks:[],
 guards:[{kind:'g1',at:[7,8],post:0,still:true,radio:false},{kind:'g1',at:[17,8],post:0,still:true,radio:false},{kind:'g1',at:[19,10],post:0,still:true,radio:false}],
 steps:[
 ['{살금} 풀숲 안으로 이동',(S,P)=>P.hidden&&!P.hide&&Math.hypot(P.x-6.5*48,P.y-8.5*48)<16,()=>({x:6.5*48,y:8.5*48}),'웅크린 채 풀숲으로 걸어 들어가면 숨는다. 숨기 버튼은 누르지 않는다. 적이 등을 돌린 동안 이동하자.','crouch'],
 ['연습용 은신 기습 · {공격} 짧게 눌러 끌어들이기',S=>S.corpses.some(c=>c.guardId===0&&c.ko&&c.hidden),S=>S.guards[0],'이 연습에서만 기술을 임시 지급한다. 일반 뒤잡기와 달리 시야 밖에서 적을 풀숲으로 당긴다.','attack'],
 ['{살금} 오른쪽 풀숲 안으로 이동',(S,P)=>P.hidden&&!P.hide&&Math.hypot(P.x-16.5*48,P.y-8.5*48)<16,()=>({x:16.5*48,y:8.5*48}),'풀숲에서 나와도 웅크린 자세를 유지하자. 어둠은 적의 시야를 줄이고, 달리면 발소리로 들킬 수 있다.','crouch'],
 ['{공격} 길게 · 풀숲 안으로 끌어들여 처치',S=>S.corpses.some(c=>c.guardId===1&&!c.ko&&c.hidden),S=>S.guards[1],'같은 공격 버튼을 1초 이상 유지한다. 본편에서 기술을 배우기 전에는 이 기습을 할 수 없다.','attack'],
 ['세 번째 경비의 등 뒤에 바짝 접근',(S,P)=>Math.hypot(P.x-(19.5*48-30),P.y-10.5*48)<10,()=>({x:19.5*48-30,y:10.5*48}),'표시까지 몸을 낮춰 이동하자. 기본 공격은 한 걸음 거리에서만 닿는다.','move'],
 ['{공격} 짧게 · 경비 기절시키기',S=>S.corpses.some(c=>c.guardId===2&&c.ko),S=>S.guards[2],'공격을 짧게 누른다. 아직 살아 있는 적부터 은닉처에 넣을 수는 없다.','attack'],
 ['{행동} 한 번 · 쓰러진 경비 숨기기',S=>S.corpses.some(c=>c.guardId===2&&c.hidden),S=>S.corpses.find(c=>c.guardId===2)||S.guards[2],'몸 옆에서 행동을 한 번 누르면 들어 올려 가까운 풀숲에 넣는다. 다른 행동은 대상 바꾸기로 고른다.','env'],
 ['풀숲에서 나와 아래쪽 출구로 이동',()=>false,S=>S.exit,'연습을 마쳐도 기술을 자동으로 배우지 않는다. 기술 트리에서 직접 선택하자.','move']
 ]
});
