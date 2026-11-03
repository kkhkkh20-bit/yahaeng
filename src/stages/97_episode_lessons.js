// Short rehearsals introduce the next episode's new problem, without granting skills.
STAGES.push({...FIRST_STEPS,
  id:'tL',name:'의뢰 02 준비 · 빛과 그림자',sub:'상가 후문 · 조명과 시야',start:[6,10],nextTutorial:null,
  build(m){FIRST_STEPS.build(m);m.fill(6,9,8,9,'.');},
  lamps:FIRST_STEPS.lamps.map((l,i)=>i===1?[l[0],l[1],130,l[3]]:[...l]),
  trialSkills:['electric'],mission:'후문 보안등을 끄고 짧아진 시야 밖으로 돌아 골목을 빠져나간다.',
  brief:'이번에는 밝은 길을 건너야 한다. 안전한 곳에서 시야를 확인하고 보안등을 꺼 보자.',
  endText:'조명을 끄면 적의 시야가 짧아진다. 본편에서는 전기 조작을 배운 경우에 사용할 수 있다.',
  steps:[
    ['표시에서 멈춰 밝은 길의 시야 확인',(S,P)=>!P.moving&&Math.hypot(P.x-6.5*48,P.y-10.5*48)<24,()=>({x:6.5*48,y:10.5*48}),'이곳은 시야 밖이다. 오른쪽 밝은 길은 경비의 부채꼴 안에 들어간다.','move',1.1],
    ['스위치 옆에서 {행동} · 조명 끄기',S=>!!S.lamps[3].off,S=>S.lamps[3].control||S.lamps[3],'이 구간에서만 전기 조작을 임시로 쓴다. 본편에서는 기술을 배워야 한다.','env',0,['lamp']],
    ['아래쪽 어두운 길을 따라 표시로 이동',(S,P)=>S.lamps[3].off&&!P.hidden&&Math.hypot(P.x-7.5*48,P.y-12.5*48)<24,S=>S.player.y<12*48?{x:6.5*48,y:12.5*48}:{x:7.5*48,y:12.5*48},'빛이 줄어 부채꼴도 짧아졌다. 손전등과 소리는 사라지지 않는다.','move'],
    [(S,P)=>P.mode==='sneak'?'웅크린 채 왼쪽 안전한 길로 복귀':'{살금} 왼쪽 안전한 길로 복귀',(S,P)=>P.mode==='sneak'&&P.x<6.7*48,()=>({x:6*48,y:12.5*48}),'어두워도 뛰면 들린다. 조용히 이동한 뒤 출구로 나간다.',(S,P)=>P.mode==='sneak'?'move':'crouch'],
    ['남쪽 출구로 이동',()=>false,S=>S.exit,'다음 의뢰에서는 배운 전기 기술이 있을 때 조명을 이용하거나, 다른 잠입로를 고른다.','move']
  ]
});
const lessonStair=S=>S.ladders.find(l=>l.kind==='fstair'&&l.tfl===1);
STAGES.push({
  id:'tR',no:'00',name:'의뢰 03 준비 · 실내와 계단',sub:'연락 거점 · 2층 서류 회수',tutorial:true,episodeLesson:true,lessonLoot:true,
  noSupport:true,noAmbientChats:true,noRefine:true,floors:true,residents:0,bare:true,kunai:0,coins:0,well:'manhole',pspd:1.25,gspd:.8,
  W:25,H:23,start:[12,19],exit:[4,19],startA:-Math.PI/2,
  mission:'연락 거점 2층에서 서류를 회수하고 처음 들어온 골목으로 빠져나간다.',
  brief:'다음 의뢰는 실내에서 시작한다. 먼저 경비 없는 연락 거점에서 문과 계단을 익힌다. 물건을 챙긴 뒤 내려와야 탈출할 수 있다.',
  build(m){
    m.fill(0,0,24,22,',');m.rect(0,0,24,22);m.fill(1,17,23,20,'.');m.fill(1,16,23,16,'=');
    m.villa(6,3,18,14,2,{kind:'shop',use:['store','office'],signs:['연락 거점',''],name:'연락 거점'});
    m.many('T',[[3,5],[21,5],[3,13],[21,13]]);m.many('B',[[4,16],[20,16]]);
  },
  wires:[],roofs:['cRoofG'],bricks:[0],lamps:[[5,17,180,1],[20,17,160,1]],guards:[],
  items:[{b:0,fl:1,at:'R'}],itemName:'연락 서류',itemNames:['연락 서류'],challenges:[],
  endText:'층이 다르면 같은 위치여도 손이 닿지 않는다. 계단으로 같은 층에 도착한 뒤 행동한다.',
  steps:[
    ['건물 앞문으로 들어가기',(S,P)=>P.x>6*48&&P.x<19*48&&P.y>3*48&&P.y<14*48&&!P.z,()=>({x:9.5*48,y:13.5*48}),'건물 안으로 들어간다. 문이 잠겼다면 행동 버튼에 가능한 방법이 표시된다.','move'],
    ['계단 표시 앞에서 {행동} · 2층으로',(S,P)=>P.fl===1&&!P.trav,S=>S.lessonLayout?.up,'실내의 층과 옥상은 다른 공간이다. 계단 앞까지 이동한 뒤 행동한다.','env',0,['up']],
    ['2층의 연락 서류 챙기기',S=>S.items.every(i=>i.got),S=>S.items[0],'작은 금색 표시는 회수할 물건이다. 같은 층에서 가까이 접근해 행동한다.','env',0,['loot']],
    ['계단으로 다시 1층에 내려오기',(S,P)=>!P.fl&&!P.trav,S=>S.lessonLayout?.down,'표시에서 계단 안쪽으로 걸어가거나 행동을 누른다. 출구는 1층 밖에 있다.','env',0,['fdown']],
    ['건물을 나와 왼쪽 골목 출구로 이동',()=>false,S=>S.exit,'본편에서는 실내 경비와 카메라도 살핀다. 먼저 안전한 길과 현재 층부터 확인하자.','move']
  ]
});
