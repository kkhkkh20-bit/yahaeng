STAGES.push({
 id:'tE',no:'00',name:'연습 6 · 현장 도구',sub:'선택 연습 · 쿠나이·연막·무전·해킹',tutorial:true,toolPractice:true,noSupport:true,noAmbientChats:true,
 mission:'무전기를 확보해 유인하고 연막·CCTV 해킹·쿠나이를 사용한다.',brief:'이 연습에서는 도구 계열을 무료로 사용한다. 장비는 도구 바꾸기로 선택한다.',
 W:34,H:21,start:[3,9],exit:[28,17],startA:0,noRefine:true,floors:false,pspd:1.25,gspd:.8,residents:0,bare:true,kunai:0,coins:0,items:[],itemNames:[],itemName:'',well:'manhole',
 build(m){m.fill(0,0,33,20,',');m.rect(0,0,33,20);m.fill(1,7,32,15,'.');m.fill(1,6,32,6,'=');m.fill(1,16,32,16,'=');m.many('T',[[4,3],[12,3],[22,3],[30,3],[5,18],[18,18]]);},
 lamps:[[6,7,260,1],[21,11,360,1]],wires:[],roofs:[],bricks:[],cams:[[23,13,0,0]],
 guards:[{kind:'g1',at:[6,9],post:0,still:true,radio:true},{kind:'g1',at:[12,9],post:0,still:true,radio:true},{kind:'g1',at:[27,13],post:0,still:true,radio:false}],
 steps:[
 ['웅크려 등 뒤로 접근 · {공격} 짧게 눌러 기절',S=>S.corpses.some(c=>c.guardId===0&&c.ko),S=>S.guards[0],'무전기 표시가 있는 경비다. 살아 있는 사람에게서 장비를 빼앗을 수는 없다.','attack'],
 ['도구 바꾸기로 무전기 선택 → {도구} 사용',S=>!!S.player.hasRadio,S=>S.corpses.find(c=>c.guardId===0),'쓰러진 경비 옆에서 사용하면 1초 동안 무전기를 확보한다.','tool'],
 ['무전기로 점검 위치 지시',S=>(S.stats.radioDecoys||0)>0,()=>null,'도구를 다시 사용하면 겨눈 곳으로 무전 담당 한 명이 이동한다. 벽으로 막힌 곳이나 다른 층은 제외된다.','tool'],
 ['연막탄 선택 → {도구} 사용',S=>(S.smokes||[]).length>0,()=>null,'연막은 시선을 가리지만 발소리와 개의 후각은 남는다. 도구를 누른 동안 겨누고 떼면 던진다.','tool'],
 ['아래 통로를 지나 CCTV 뒤의 표시로 이동',(S,P)=>Math.hypot(P.x-21.5*48,P.y-13.5*48)<18,()=>({x:21.5*48,y:13.5*48}),'카메라는 오른쪽을 향한다. 시야 밖에서 장비를 사용하자.','move'],
 ['해킹기 선택 → 오른쪽 CCTV를 겨눠 사용',S=>(S.stats.hacks||0)>0,S=>S.cams[0],'1.5초 동안 멈춰 작업한다. 카메라는 잠시 꺼지고 녹화 기록은 지워지지 않는다.','tool'],
 ['쿠나이 선택 → 오른쪽 경비에게 길게 눌렀다 떼기',S=>(S.stats.bladesUsed||0)>0&&S.guards[2].state==='DEAD',S=>S.guards[2],'쿠나이는 살상 전용이다. 짧게 누르면 사용하지 않는다. 다트의 기절 기능과 구분하자.','tool'],
 ['아래쪽 출구로 이동',()=>false,S=>S.exit,'본편에서는 기술 트리의 도구 계열에서 필요한 장비를 골라 배운다.','move']
 ]
});
