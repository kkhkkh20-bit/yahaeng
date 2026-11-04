// Episode 04: a depot circuit. A legitimate uniform, a physical archive key,
// or the rear duct offer different approaches without granting combat skills.
{
  id:'m7',no:'07',name:'새벽배송',sub:'의뢰 04',fee:'180만',
  mission:'오태식 처치 · 운송명세서 회수 · 2층 배차실에서 새벽배송 중단 후 탈출',
  targetNames:{broker:'오태식'},itemName:'운송명세서',itemNames:['운송명세서','새벽배송'],priorityTarget:true,
  brief:'운송책 오태식은 분류창고 동쪽 검수대에서 화물을 확인한 뒤 작업장을 돈다. 그를 처리하고 서쪽 기록보관실의 운송명세서를 확보한다. 배송망까지 끊어야 한다. 명세서의 출고 번호로 남동쪽 배송 사무실 2층 배차 단말에서 새벽배송을 중단하라. 택배 조끼는 작업장·사무실 통행을 허용하지만, 기록보관실은 별도 제한 구역이다. 오태식의 파란 카드나 북쪽 환풍구로 잠입할 수 있다. 배차를 중단하면 관리자가 단말을 확인하러 온다.',
  endText:'운송명세서를 확보하고 새벽배송을 멈췄다. 화물은 인계 지점에 도착하지 못한다. 이제 명세서에 남은 수취인을 찾을 차례다.',
  W:40,H:28,start:[5,23],exit:[1.5,24],exitName:'서쪽 시장 골목',exits:[{at:[38,24],name:'동쪽 큰길',r:42}],startA:-Math.PI/2,
  noRefine:true,floors:true,pspd:1.3,gspd:1,residents:0,well:'manhole',workBuildings:[0,1],securityEvidence:true,
  build(m){
    m.fill(0,0,39,27,',');m.rect(0,0,39,27);m.fill(1,21,38,25,'.');m.fill(1,21,38,21,'=');m.fill(1,25,38,25,'=');
    // Depot fence, a broad staffed entrance and a rear public service lane.
    m.rect(10,3,37,20);m.fill(12,20,15,20,'=');m.fill(11,4,36,19,'h');
    m.bld(16,4,35,12,1,[[25,12],[16,7]],'h');m.set(25,12,'d');m.set(16,7,'d');
    // Physically separate the records cage from normal sorting/work aisles.
    m.fill(23,5,23,11,'#');m.set(23,9,'d');
    m.villa(25,14,35,20,2,{kind:'shop',use:['office','office'],signs:['배송 사무실','배차실'],name:'배송 사무실',back:true});
    m.villa(1,13,8,20,1,{kind:'shop',use:['food'],signs:['기사 식당'],name:'기사 식당'});
    m.fill(16,19,17,19,'C'); // Loading pallets screen the first cleanup from the yard patrol.
    m.many('H',[[13,22],[7,11],[24,13]]);m.many('W',[[8,24],[38,4]]);
    m.many('B',[[9,5],[9,18],[11,22],[22,13],[36,8],[36,19]]);
    m.many('T',[[2,4],[6,9],[3,12]]);m.many('O',[[11,9]]);
    m.car(18,23,2);m.car(31,23,0);[5,22,36].forEach(x=>m.pole(x,25,2));
    mat(m,'r',[[12,5],[13,5],[14,5]]);mat(m,'p',[[30,13],[31,13]]);
  },
  wires:[...chain(25,[5,22,36])],
  buildingNames:{0:'분류창고',1:'배송 사무실',2:'기사 식당'},
  fixedFurn:[{x:19,y:6,w:2,t:'desk'},{x:17,y:5,t:'locker'},{x:21,y:5,t:'shelf'},
    {x:26,y:5,w:2,t:'shelf'},{x:30,y:5,w:2,t:'shelf'},{x:26,y:8,w:2,t:'shelf'},{x:30,y:8,w:2,t:'shelf'},{x:19,y:8,w:1,h:3,r:1,t:'shelf'},{x:6,y:16,t:'locker'},{x:33,y:5,t:'locker'},{x:33,y:8,w:2,t:'shelf'},{x:32,y:16,fl:1,t:'pc'}],
  zones:[[11,4,36,19,'res',null,'집하장 작업 구역',['courier','crew']],
    [16,4,35,12,'res',null,'분류창고',['courier','crew']],
    [17,5,22,11,'res',null,'기록보관실 · 복장 통행 불가',[]],
    [1,13,8,20,'pub']],zoneAllow:['courier','crew'],
  locks:[{at:[23,9],key:'blue'},{at:[16,7],key:'blue'}],closedDoors:[[23,9],[16,7]],keyPurposes:{blue:'분류창고 서쪽 기록보관실'},
  vents:[[[15,2,'s',[0,-1]],[18,10],[28,10]]],
  props:[{id:'depotVest',name:'예비 택배 조끼',outfit:'courier',at:[6,17],surface:{b:2,t:'locker',u:.5}}],
  guards:[
    {kind:'t',target:true,tag:'broker',at:[32,7],startPause:55,still:true,briefWhere:'분류창고 동쪽 · 검수대',post:0,key:'blue',schedKey:'dispatch',sched:[
      {at:[32,7],stay:28,name:'동쪽 검수대',act:'운송 번호 대조'},
      {at:[24,16],stay:12,name:'상차 대기장',act:'통화'},
      {at:[28,10],stay:10,name:'분류창고',act:'화물 확인'}]},
    {kind:'g1',at:[16,18],post:0,still:true,radio:false},
    {kind:'g2',route:[[12,14,4],[22,14,3],[22,18,3],[12,18,4]],radio:true},
    {kind:'g1',route:[[21,10,5],[21,6,4]],still:true,tag:'archiveGuard',radio:false},
    {kind:'g1',b:1,fl:0,patrol:true,from:'L',to:'R',radio:false},
    {kind:'g1',fl:1,route:[[27,16,9],[31,16,8]],still:true,tag:'camop',radio:true},
    {kind:'civ',outfit:'courier',at:[4,21],post:90,still:true,tag:'driver'},
    {kind:'civ',outfit:'courier',route:[[24,16,5],[19,16,4]],tag:'loader'},
    {kind:'civ',b:2,at:'L',post:90,tag:'cook'}],
  items:[[19,7],{b:1,fl:1,at:'R'}],lootFurniture:['desk'],itemFurniture:[['desk'],['pc']],
  itemLayoutVersion:1,itemActions:[null,{label:'새벽배송 중단',verb:'중단',progress:'배차 취소',complete:'새벽배송 중단 완료',requires:0,requiresText:'운송명세서를 먼저 확보해야 한다',duration:3.5,short:'배차 취소',loud:18,inspectTag:'camop'}],
  lamps:[[6,22,180,1],[13,19,150,1],[20,16,190,1],[36,13,150,1]],
  cams:[[28,6,90,55]],camRoom:{b:1,fl:1,at:'S'},
  intel:[{g:[6,8],key:0,gives:'depot',learn:'기사 식당에 예비 택배 조끼가 있다. 입고 걸으면 작업장을 통과한다.',every:18,first:3,
    lines:[[0,'오늘 조끼 안 가져왔는데.'],[1,'식당에 예비 조끼 있어. 그거 입고 들어가.']] }],
  notes:[{pos:[5,18],title:'출고 안내',lines:['기록보관실은 분류창고 서쪽. 파란 카드는 운송책 오태식이 관리한다.','북쪽 거리 환풍구는 창고 바닥 덕트와 이어진다.'],gives:'dispatch',learn:'북쪽 환풍구로 기록보관실에 우회할 수 있다.'}],
  stories:[{id:'rear-duct',name:'북쪽 점검 덕트',reveal:(S,h)=>h.knows('환풍구'),steps:[
    {text:'북쪽 거리의 환풍구로 이동',at:[15,2,0],done:S=>!!S.player.vent||S.items[0].got},
    {text:'덕트 서쪽 갈림길로 기록보관실 잠입',at:[18,10,0],done:S=>S.items[0].got}]}],
  challenges:['ghost','nobody','noalarm','nolure'],fastT:420,kunai:0,coins:0,
  hints:['오태식은 분류창고 동쪽 검수대에서 시작해 상차 대기장과 창고를 돈다. 경비는 의뢰 대상이 아니다.',
    '택배 조끼로 작업장과 사무실을 걸어 다닐 수 있다. 기록보관실의 문턱은 별도 통행 제한이다.',
    '파란 카드는 오태식이 지닌다. 북쪽 점검 덕트는 카드를 사용하지 않는 다른 길이다.',
    '명세서만 가져와서는 배송이 멈추지 않는다. 남동쪽 사무실 2층 단말에서 출고를 중단하고, 확인하러 오는 관리자를 피해 이탈하라.']
},
