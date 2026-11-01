// One self-contained contract. The 2D campaign and the smaller art study stay separate.
if(window.__EPISODE_ONE__)STAGES.push({
  id:'lastSettlement',artSlice:true,episode:true,no:'01',name:'마지막 정산',sub:'에피소드 01',fee:'',
  mission:'송대건 처치 · 원본 장부 회수 후 탈출',
  brief:'폐점한 클럽. 회계책 송대건은 위층에서 마지막 정산을 하고 있다. 원본 장부도 그곳에 있다.',
  targetNames:{accountant:'송대건'},itemName:'원본 장부',itemNames:['원본 장부'],itemVerb:'회수하기',lootFurniture:['desk'],
  W:24,H:22,start:[5,18],exit:[3,19],exitName:'서쪽 골목',exits:[{at:[22,18],name:'동쪽 골목',r:40}],startA:-Math.PI/2,
  hideTypes:['box','well','locker','wardrobe','cab'],rivals:0,noRefine:true,interiorOnly:true,floors:true,pspd:1.3,gspd:1,residents:0,kunai:2,coins:2,radioCheck:80,
  build(m){
    m.fill(0,0,23,21,'.');m.rect(0,0,23,21);m.fill(1,17,22,20,'=');
    m.bld(8,4,20,15,2,[[13,15],[10,4]],'w');m.set(13,15,'d');m.set(10,4,'d');
    // Lounge below, staff room and staircase above. The duct bypasses the keypad.
    m.fill(9,8,19,8,'#');m.set(14,8,'d');m.set(17,7,'Y');
    m.set(11,15,'N');m.set(16,15,'N');m.set(20,11,'N');
    m.bld(1,2,4,12,1,[],'w');m.bld(21,2,23,11,1,[],'w');
    // Closed neighbouring shops are context, not empty rooms with usable windows.
    m.fill(1,2,4,12,'#');m.fill(21,2,23,11,'#');
    m.many('H',[[6,7],[6,14]]);m.many('W',[[6,18],[6,3]]);m.many('B',[[6,12],[21,16]]);
  },
  closedDoors:[[10,4],[13,15],[14,8]],locks:[{at:[10,4],key:'code'},{at:[14,8],key:'code'}],code:'4816',codeOpp:false,
  vents:[[[7,5,'s',[-1,0]],[9,5],[18,10]]],buildingNames:{0:'백야 클럽',1:'골목식당',2:'음반점'},
  windowStates:[[13,4,1,'open']],
  floorTiles:Array.from({length:12},(_,j)=>Array.from({length:13},(_,i)=>{const x=8+i,y=4+j;return[1,x,y,x<11||y>12?'V':x===11||x===20||y===4||y===12?(((y===12&&[13,17].includes(x))||(y===4&&x===13))?'N':'#'):x===17&&y===7?'Y':'v'];})).flat(),
  fixedFurn:[{x:10,y:6,t:'locker',fl:0},{x:11,y:10,t:'desk',fl:0},{x:14,y:12,w:2,t:'table',fl:0},{x:18,y:12,t:'shelf',fl:0},{x:14,y:10,w:3,t:'bar',fl:0},{x:10,y:13,w:2,t:'sofa',fl:0},
    {x:12,y:7,t:'desk',fl:1},{x:12,y:8,t:'chairD',fl:1},{x:12,y:10,w:2,t:'wardrobe',fl:1},{x:18,y:10,t:'locker',fl:1},{x:18,y:5,t:'shelf',fl:1}],
  zones:[[8,4,20,15,'res',null,'백야 클럽 · 직원 외 출입 금지',['crew','waiter']]],zoneAllow:['crew','waiter'],
  guards:[
    {kind:'g1',at:[7,11],post:270,still:true,tag:'doorGuard',radio:false},
    {kind:'g1',route:[[14,14,3],[18,14,3],[18,11,2]],tag:'loungeGuard',radio:true},
    {kind:'g1',route:[[11,5,4],[15,5,3]],tag:'staffGuard',radio:false},
    {kind:'g1',route:[[18,9,3],[18,5,3],[14,5,2],[14,9,3]],fl:1,tag:'officeGuard',radio:true},
    {kind:'g2',at:[19,7],fl:1,post:90,still:true,tag:'stairGuard',radio:false},
    {kind:'t',target:true,tag:'accountant',fl:1,model:'suit',post:180,schedKey:'routine',sched:[
      {at:[13,7],stay:8,name:'장부 책상',act:'정산'},
      {at:[13,5],stay:6,name:'뒤쪽 창가',act:'통화'},
      {at:[14,10],stay:5,name:'서류장 옆',act:'서류 확인'}]},
    {kind:'civ',body:'male',at:[6,16],post:90,still:true,tag:'smoker'},
    {kind:'civ',body:'male',model:'worker',outfit:'waiter',route:[[12,12,5],[16,13,4]],tag:'closingStaff'}
  ],
  interrogate:[{gives:'code',learn:'직원 출입문 비밀번호 4816',say:'직원 문은 4816. 뒷문도 같아.'},
    {gives:'routine',learn:'송대건은 2층 책상과 뒤쪽 창가를 오간다',say:'송대건은 위층이야. 통화할 땐 뒤쪽 창가로 가.'}],
  notes:[{pos:[12,10],fl:0,title:'직원 인수인계 메모',surface:{b:0,t:'desk'},lines:['직원 출입문 · 4816','송 실장님 정산 중. 위층 장부는 건드리지 말 것.'],gives:'code',learn:'직원 출입문 비밀번호 4816'}],
  items:[[13,8,1]],lamps:[[7,13,170,1],[13,14,160,1],[13,6,135,0],[16,9,180,1,1]],
  lampControls:[[2,12.25,5.125],[3,19.875,9.5]],
  roomSigns:[{text:'직원 전용',at:[14,8],fl:0},{text:'정산실',at:[17,7],fl:1}],
  roofs:['cRoofA','cRoofB','cRoofA'],wires:[],challenges:['ghost','clean'],fastT:360
});
