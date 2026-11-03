STAGES.push({
 id:'tS',no:'00',name:'연습 5 · 암살 기술',sub:'선택 연습 · 쌍암살과 연속 암살',tutorial:true,skillPractice:true,noSupport:true,noAmbientChats:true,
 mission:'쌍암살과 연속 암살의 거리·방향·이동 조건을 익힌다.',brief:'살상 기술 연습. 빈손으로 등 뒤에서 접근해 기술 버튼을 1초 동안 누른다.',
 W:32,H:18,start:[3,9],exit:[28,13],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.9,residents:0,bare:true,kunai:0,coins:0,items:[],itemName:'',itemNames:[],well:'manhole',
 build(m){m.fill(0,0,31,17,',');m.rect(0,0,31,17);m.fill(1,7,30,11,'.');m.fill(1,6,30,6,'=');m.fill(1,12,30,12,'=');m.many('Z',[[14,7],[14,8],[14,10],[14,11]]);m.many('T',[[4,3],[11,3],[20,3],[28,3],[4,15],[25,15]]);},
 lamps:[[8,6,350,1],[21,6,400,1]],wires:[],roofs:[],bricks:[],
 guards:[{kind:'g1',at:[9,8],post:0,still:true,radio:false},{kind:'g1',at:[9,9],post:0,still:true,radio:false},{kind:'g1',at:[19,9],post:0,still:true,radio:false},{kind:'g1',at:[21,9],post:0,still:true,radio:false}],
 steps:[
 [(S,P)=>P.mode==='sneak'?'두 경비의 등 뒤 표시로 이동':'{살금} 두 경비의 등 뒤로 접근',(S,P)=>P.mode==='sneak'&&Math.hypot(P.x-(9*48+8),P.y-9*48)<12,()=>({x:(9*48+8),y:9*48}),'발소리를 줄여 접근하자. 쌍암살은 붙어 있는 두 적을 함께 처리한다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
 ['{기술} 길게 · 두 경비 쌍암살',S=>(S.stats.dualAssassinations||0)>0,S=>S.guards[0],'두 적 모두 등 뒤에서 가까이 접근해야 한다. 1초 동안 눌러 발동한다.','skill'],
 ['{기술목록} 연속 암살 선택',S=>S.selectedSkill==='chain',()=>null,'연속 암살은 첫 적을 처리한 뒤 다음 적까지 직접 이동한다.','skills'],
 [(S,P)=>P.mode==='sneak'?'다음 경비의 등 뒤 표시로 이동':'{살금} 다음 경비의 등 뒤로 접근',(S,P)=>P.mode==='sneak'&&Math.hypot(P.x-(19*48-6),P.y-9.5*48)<12,()=>({x:(19*48-6),y:9.5*48}),'웅크려 접근하고 통로로 지나가자. 두 번째 적까지 길이 트여 있어야 한다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
 ['{기술} 길게 · 연속 암살',S=>(S.stats.chainAssassinations||0)>0,S=>S.guards[2],'이동 중 들키거나 길이 막히면 다음 공격은 중단된다.','skill'],
 ['아래쪽 출구로 이동',()=>false,S=>S.exit,'의뢰에서는 포인트로 선행 기술을 배우고 쌍암살·연속 암살을 선택한다.','move']
 ]
});
