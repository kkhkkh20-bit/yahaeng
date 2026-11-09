// Escape routes use existing streets; service gaps open the depot and HQ detours.
const CAMPAIGN_FLOW={
 tB:{search:40,guards:2},p0:{search:45,guards:2,name:'남쪽 철문',extra:[{at:[1.3,12],name:'서쪽 작업 골목',r:46}],gaps:[[3,12],[3,13]],hint:' 서쪽 담의 작업 통로로 돌아 들어갈 수도 있다. 남쪽 철문과 서쪽 골목 중 상황에 맞는 길로 빠져나온다.'},
 e2:{search:55,guards:3,name:'서쪽 정비 골목',extra:[{at:[36.4,18],name:'동쪽 하역 골목',r:46}]},
 m2:{search:65,guards:5,name:'동쪽 큰길'},m4:{search:70,guards:6,name:'서쪽 큰길'},m6:{search:70,guards:5,name:'동쪽 정문 밖'},m7:{search:65,guards:5,name:'서쪽 시장 골목'},
 m5:{search:75,guards:6,name:'동쪽 본부 출구',gaps:[[11,14,'.']],hint:' 남쪽 교차로의 담 틈으로 서쪽 뒷골목에 빠질 수 있다.',extra:[{at:[.3,14],name:'서쪽 뒷골목',r:46}]},
 n1:{search:80,guards:6,name:'남서쪽 골목',extra:[{at:[43,5],name:'북동쪽 관리 골목',r:46}]}
};
for(const[id,flow]of Object.entries(CAMPAIGN_FLOW)){
 const s=campaignStage(id);s.flowDesign=flow;
 if(flow.name)s.exitName=flow.name;
 if(flow.extra)s.exits=(s.exits||[]).concat(flow.extra);
 if(flow.gaps){const build=s.build;s.build=m=>{build(m);for(const[x,y,c]of flow.gaps)m.set(x,y,c||'=');};s.brief+=flow.hint||'';}
}
