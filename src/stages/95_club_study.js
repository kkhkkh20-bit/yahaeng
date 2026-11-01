// The authored art slice is loaded only by its dedicated build, not the contract list.
if(window.__CLUB_STUDY__)STAGES.push({
  id:'clubStudy',artSlice:true,no:'01',name:'뒷문',sub:'클럽 뒷골목',fee:'',
  mission:'2층 사무실의 장부를 회수하고 골목으로 빠져나간다',
  brief:'클럽이 문을 닫았다. 장부는 위층 사무실에 있다.',
  lootFurniture:['desk'],itemName:'장부',itemNames:['장부'],W:24,H:22,start:[5,18],exit:[3,19],exitName:'서쪽 골목',startA:-Math.PI/2,
  hideTypes:['box','well','locker','wardrobe','cab'],rivals:0,noRefine:true,interiorOnly:true,floors:true,pspd:1.3,gspd:1,residents:0,kunai:2,coins:2,
  build(m){
    m.fill(0,0,23,21,'.');m.rect(0,0,23,21);m.fill(1,17,22,20,'=');
    m.bld(8,4,20,15,2,[[13,15],[10,4]],'w');m.set(13,15,'d');m.set(10,4,'d');
    m.set(17,7,'Y');m.set(11,15,'N');m.set(16,15,'N');m.set(20,11,'N');
    m.bld(1,2,4,12,1,[],'w');m.bld(21,2,23,11,1,[],'w');
    m.many('H',[[6,7],[6,14]]);m.many('W',[[6,18],[6,3]]);m.many('B',[[6,12],[21,16]]);
  },
  vents:[[[7,5,'s',[-1,0]],[9,5],[18,10]]],
  closedDoors:[[10,4],[13,15]],buildingNames:{0:'클럽',1:'식당',2:'음반점'},
  floorTiles:Array.from({length:12},(_,j)=>Array.from({length:13},(_,i)=>{const x=8+i,y=4+j;return[1,x,y,x<11||y>12?'V':x===11||x===20||y===4||y===12?(((y===12&&[13,17].includes(x))||(y===4&&x===16))?'N':'#'):x===17&&y===7?'Y':'v'];})).flat(),
  fixedFurn:[{x:10,y:7,t:'locker',fl:0},{x:11,y:9,t:'desk',fl:0},{x:14,y:11,w:2,t:'table',fl:0},{x:18,y:12,t:'shelf',fl:0},{x:14,y:10,w:3,t:'bar',fl:0},{x:10,y:12,w:2,t:'sofa',fl:0},
    {x:12,y:7,t:'desk',fl:1},{x:12,y:8,t:'chairD',fl:1},{x:13,y:5,w:2,t:'wardrobe',fl:1},{x:18,y:10,t:'locker',fl:1}],
  zones:[[8,4,20,15,'res',null,'클럽 · 직원 전용',['crew','waiter']]],zoneAllow:['crew','waiter'],
  guards:[{kind:'g1',at:[7,11],post:270,still:true,tag:'doorGuard'},
    {kind:'g1',route:[[14,13,3],[18,13,3],[18,10,2]],tag:'patrol'},
    {kind:'g2',at:[14,8],fl:1,post:0,tag:'officeGuard'},
    {kind:'civ',body:'male',at:[6,16],post:90,still:true}],
  interrogate:[{gives:'ledger',learn:'장부는 2층 사무실 책상에 있다',say:'장부는 위층 책상에 있어.'}],
  items:[[13,8,1]],lamps:[[7,13,170,1],[13,14,160,1],[10,5,135,0],[16,9,180,1,1]],
  lampControls:[[2,12.25,5.125],[3,19.875,9.5]],
  roofs:['cRoofA','cRoofB','cRoofA'],wires:[],challenges:['ghost','clean','unrecorded'],fastT:240
});
