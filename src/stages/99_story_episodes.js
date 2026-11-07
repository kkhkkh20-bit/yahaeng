// Small complete jobs connect the freight alley to the larger club contract.
{
 const base=STAGES.find(s=>s.id==='e3');
 const common={...base,storyEpisode:true,physicalWorld:true,episodeLesson:true,props:[],guards:[],items:[],cams:[],roofs:[],bricks:[],buildingNames:{0:'동네 교환실'},
  build(m,office=false){m.fill(0,0,24,22,',');m.rect(0,0,24,22);m.fill(1,17,23,20,'.');m.fill(1,16,23,16,'=');m.villa(6,3,18,14,2,{kind:'shop',use:['store','office'],signs:office?['새벽 부동산','협의실']:['통신 관리','교환실'],name:office?'새벽 부동산':'교환실'});m.many('T',[[3,5],[21,5],[3,13],[21,13]]);m.many('B',[[4,16],[20,16],[6,18]]);},
  zones:[[0,0,24,22,'pub',null,'골목',[]],[6,3,18,14,'res',null,'직원 구역',['crew']]],
  cams:[[12,5,0,12]],securityEvidence:true,securityTerminalVersion:1,camRoom:{b:0,fl:0,at:'L',name:'1층 보안 데스크'},
  guards:[{kind:'g1',tag:'uniformDonor',at:[8,18],post:0,still:true,radio:false},{kind:'g1',tag:'hallKeeper',b:0,fl:0,at:'S',post:180,still:true,radio:false},{kind:'g1',tag:'upperKeeper',b:0,fl:1,at:'S',post:180,still:true,radio:false}],
 };
 STAGES.push({...common,id:'e4',no:'08',name:'끊어진 회선',sub:'여덟 번째 밤 · 동네 교환실',fee:'50만',
  purpose:'클럽으로 넘어갈 인계서를 먼저 빼내 연락망을 끊는다.',mission:'교환실 2층 인계서 회수 후 서쪽 골목으로 탈출',
  brief:'장부의 마지막 통화는 이 교환실에서 나갔다. 인계서는 2층 책상에 있다. 각 층 경비는 한 명씩이다. 골목 경비의 옷으로 통행하고, 1층 카메라는 시야 밖 벽 쪽에서 전선을 분리할 수 있다. 옷을 입어도 서류를 훔치는 모습까지 허용되지는 않는다.',
  endText:'인계서를 확보했다. 클럽으로 향하던 중개인이 거래가 끊긴 이유를 확인하러 나왔다. 그가 실장에게 알리기 전에 만나자.',
  items:[{b:0,fl:1,at:'R'}],itemName:'인계서',itemNames:['인계서'],itemPlaces:['교환실 2층 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],
 });
 STAGES.push({...common,buildingNames:{0:'새벽 부동산'},build(m){common.build(m,true);m.many('C',[[2,9],[3,9],[22,11]]);m.car(18,18,1);m.many('B',[[21,15],[21,16]]);},id:'e5',no:'09',name:'창가의 중개인',sub:'아홉 번째 밤 · 닫힌 사무실',fee:'60만',priorityTarget:true,targetNames:{broker:'중개인'},
  purpose:'클럽 실장에게 잠입자의 존재를 알리려는 중개인을 막는다.',mission:'2층의 중개인 처치 후 서쪽 골목으로 탈출',
  brief:'중개인은 2층 창가와 책상 사이를 오간다. 한 곳에 오래 멈추니 등을 보일 때 접근하자. 계단을 오르기 전에 골목 경비의 옷을 얻을 수 있다. 2층 카메라의 시야 밖에서 전선을 분리하면 접근할 틈이 생긴다. 다른 경비까지 처리할 필요는 없다.',
  endText:'중개인은 연락하지 못했다. 이제 실장이 남았다. 클럽과 사무동은 넓지만, 지금까지 해 온 일과 같다. 먼저 골목에서 길을 보고 한 가지씩 해결하자.',
  cams:[[12,5,0,12,1]],
  guards:[common.guards[0],common.guards[1],{kind:'t',tag:'broker',target:true,still:true,b:0,fl:1,patrol:true,patrolPause:14,radio:false}],
  items:[],itemName:'',itemNames:[],itemPlaces:[],itemActions:[],
 });
}
// Internal IDs retain saves; all primary entries are presented as story episodes.
for(const [id,sub]of[['p0','두 번째 밤 · 운반책'],['p1','세 번째 밤 · 출고 서류'],['p2','네 번째 밤 · 감시망'],['e1','다섯 번째 밤 · 골목'],['e2','여섯 번째 밤 · 거래 창고'],['e3','일곱 번째 밤 · 연락 거점']]){
 const s=STAGES.find(s=>s.id===id);s.storyEpisode=true;s.sub=sub;
}
