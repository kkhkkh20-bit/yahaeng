// Rehearse the actual campaign detectors, permissions and free cable interaction.
// No temporary ability, immunity or scripted camera bypass is granted.
STAGES.push({
  id:'tC',no:'00',name:'의뢰 01 준비 · 복장과 CCTV',sub:'의뢰 01 준비 · 통행과 작업의 차이',tutorial:true,securityLesson:true,lessonLoot:true,
  noSupport:true,noAmbientChats:true,noRefine:true,floors:false,residents:0,bare:true,kunai:0,coins:0,well:'manhole',pspd:1.25,gspd:.8,
  W:34,H:18,start:[18,12],exit:[30,13],startA:0,wires:[],roofs:[],bricks:[],
  mission:'복장의 출입 권한과 감시 판정을 확인하고, CCTV 전선을 분리한 뒤 서류를 가져온다.',
  brief:'같은 옷으로도 통행과 훔치기의 판정은 다르다. 화면의 통행 권한, 신원 확인, CCTV 게이지를 실제 행동으로 확인한다.',
  build(m){
    m.fill(0,0,33,17,',');m.rect(0,0,33,17);m.fill(1,12,32,14,'.');m.fill(12,3,30,11,'h');
    m.fill(11,2,31,2,'#');m.fill(11,2,11,11,'#');m.fill(31,2,31,11,'#');
    m.many('C',[[28,5],[29,5],[28,8]]);m.many('B',[[4,13],[8,13]]);m.many('T',[[5,5],[8,6],[32,5]]);
  },
  zones:[[16,3,24,11,'res',null,'직원 구역',['crew']],[12,3,15,8,'res',null,'신원 확인 구역',['crew']],[25,3,30,11,'res',null,'기록 구역 · 복장 통행 불가',[]]],
  props:[{id:'lessonUniform',name:'연습용 자경대원 옷',outfit:'crew',at:[24,12]}],
  fixedFurn:[{x:20,y:10,w:1,h:1,t:'desk'}],lootFurniture:['desk'],items:[[20,11]],itemName:'연습 서류',itemNames:['연습 서류'],
  cams:[[20,7,90,0]],lamps:[[20,9,420,0],[15,5,240,0],[27,10,200,0]],
  guards:[{kind:'g1',tag:'identityCoach',at:[15,5],post:90,still:true,enforcer:true,radio:false}],challenges:[],
  endText:'복장은 해당 구역의 통행 권한이다. 가까운 신원 확인과 훔치기는 별도 판정이다. 감시 시야를 피하거나 카메라 뒤에서 전선을 분리한 뒤 작업하자.',
  steps:[
    ['공개 구역의 CCTV 앞을 걸어 지나가기',(S,P,I,h)=>!h.cameraOn(S.cams[0])||P.mode==='walk'&&Math.hypot(P.x-20.5*48,P.y-12.5*48)<23&&h.camera(S.cams[0]).visible>0&&!h.camera(S.cams[0]).detectable,()=>({x:20.5*48,y:12.5*48}),'부채꼴은 감시 범위다. 공개 구역의 평범한 통행은 녹화 게이지를 채우지 않는다.','move',1],
    ['오른쪽에 놓인 옷으로 갈아입기',(S,P)=>P.outfit==='crew',()=>({x:24.5*48,y:12.5*48}),'이 옷은 직원 구역의 통행을 허용한다. 훔치기까지 허용하는 옷은 아니다.','env',0,['pickup']],
    ['직원 구역에 들어가 통행 허용 확인',(S,P,I,h)=>Math.hypot(P.x-20.5*48,P.y-11.5*48)<23&&h.access(P).allowed&&(!h.cameraOn(S.cams[0])||!h.camera(S.cams[0]).detectable),()=>({x:20.5*48,y:11.5*48}),'카메라 앞이어도 허용 복장으로 지나다닐 수 있다. 서류는 아직 꺼내지 않는다.','move',1],
    ['눈 표시 경비 앞에서 멈춰 신원 확인 관찰',S=>['DEAD','CAPTIVE'].includes(npcT(S,'identityCoach').state)||(npcT(S,'identityCoach').eyeT||0)>.4,()=>({x:15.5*48,y:7.5*48}),'표시까지 걸어간 뒤 멈춘다. 눈 표시가 있는 담당자와 멈춰 마주 보면 얼굴을 확인한다.','move'],
    ['아래 공개 구역으로 걸어 나가기',(S,P)=>Math.hypot(P.x-15.5*48,P.y-10.5*48)<23&&(['DEAD','CAPTIVE'].includes(npcT(S,'identityCoach').state)||!npcT(S,'identityCoach').eyeWatching)&&!P.disguiseBlown,()=>({x:15.5*48,y:10.5*48}),'걸어서 지나가거나 얼굴을 돌리면 신원 확인이 멈춘다. 일반 경비는 정상 복장으로 걷는 사람을 검문하지 않는다.','move'],
    ['오른쪽 기록 구역의 통행 불가 표지 확인',(S,P,I,h)=>Math.hypot(P.x-24.5*48,P.y-10.5*48)<23&&!h.access({x:25.5*48,y:10.5*48,fl:0,z:0}).allowed,()=>({x:24.5*48,y:10.5*48}),'이 경계 너머는 어떤 옷도 출입을 허용하지 않는다. 들어가기 전에 문턱의 권한 표시를 확인한다.','move',.8],
    ['서류 앞에서 훔치기 위험 표시 확인',(S,P,I,h)=>S.items[0].got||!h.cameraOn(S.cams[0])||Math.hypot(P.x-S.items[0].x,P.y-S.items[0].y)<24&&h.camera(S.cams[0],true).detectable,S=>S.items[0],'통행은 허용돼도 지금 훔치면 CCTV 게이지가 찬다. 먼저 카메라 뒤로 돌아간다.','move',.8],
    ['카메라 뒤에서 전선 분리',(S,P,I,h)=>S.items[0].got||!h.cameraOn(S.cams[0]),()=>({x:20.5*48,y:6.5*48}),'오른쪽으로 돌아 카메라 뒤에 접근한다. 전선 분리는 배우는 기술이나 다트 없이 쓸 수 있다.','env',0,['camCable']],
    ['감시가 꺼진 뒤 서류 챙기기',S=>S.items[0].got,S=>S.items[0],'경비에게도 작업이 보이지 않는지 확인하고 행동한다. 통행 권한과 목격 여부를 함께 판단한다.','env',0,['loot']],
    ['남동쪽 출구로 이동',()=>false,S=>S.exit,'본편에서도 옷의 권한, 눈 표시, CCTV와 작업 위험을 같은 방식으로 읽는다.','move']
  ]
});
