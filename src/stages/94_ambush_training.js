STAGES.push({
 id:'tA',no:'00',name:'연습 7 · 은신 기습',sub:'선택 연습 · 배워야 쓸 수 있는 기습',tutorial:true,trialSkills:['ambush'],noSupport:true,noAmbientChats:true,
 mission:'풀숲에서 기절과 처치 기습을 구분해 사용한다.',brief:'은신 기습만 임시 지급되는 연습이다. 본편에서는 제압 숙련 다음에 1P로 배운다.',
 W:25,H:17,start:[3,8],exit:[21,12],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.9,residents:0,bare:true,kunai:0,coins:0,items:[],itemName:'',itemNames:[],well:'manhole',
 build(m){m.fill(0,0,24,16,',');m.rect(0,0,24,16);m.fill(1,6,23,11,'.');m.fill(1,5,23,5,'=');m.fill(1,12,23,12,'=');m.set(6,8,'B');m.set(16,8,'B');m.many('T',[[4,3],[12,3],[21,3],[7,14]]);},
 lamps:[],wires:[],roofs:[],bricks:[],
 guards:[{kind:'g1',at:[7,8],post:0,still:true,radio:false},{kind:'g1',at:[17,8],post:0,still:true,radio:false}],
 steps:[
 ['{살금} 풀숲 안으로 이동',(S,P)=>P.hidden&&!P.hide&&Math.hypot(P.x-6.5*48,P.y-8.5*48)<16,()=>({x:6.5*48,y:8.5*48}),'적이 등을 돌린 동안 접근하자. 숨는 동작은 기본이다. 숨은 채 공격하거나 붙잡는 것은 은신 기습을 배워야 한다.','crouch'],
 ['연습용 은신 기습 · {공격} 짧게 눌러 끌어들이기',S=>S.corpses.some(c=>c.guardId===0&&c.ko&&c.hidden),S=>S.guards[0],'이 연습에서만 기술을 임시 지급한다. 일반 뒤잡기와 달리 시야 밖에서 적을 풀숲으로 당긴다.','attack'],
 ['{살금} 오른쪽 풀숲 안으로 이동',(S,P)=>P.hidden&&!P.hide&&Math.hypot(P.x-16.5*48,P.y-8.5*48)<16,()=>({x:16.5*48,y:8.5*48}),'은신처 진입과 쓰러진 사람 운반은 기본 행동이다. 여기서는 같은 풀숲에서 처치 기습을 연습한다.','crouch'],
 ['{공격} 길게 · 풀숲 안으로 끌어들여 처치',S=>S.corpses.some(c=>c.guardId===1&&!c.ko&&c.hidden),S=>S.guards[1],'같은 공격 버튼을 1초 이상 유지한다. 본편에서 기술을 배우기 전에는 이 기습을 할 수 없다.','attack'],
 ['풀숲에서 나와 아래쪽 출구로 이동',()=>false,S=>S.exit,'연습을 마쳐도 기술을 자동으로 배우지 않는다. 기술 트리에서 직접 선택하자.','move']
 ]
});
