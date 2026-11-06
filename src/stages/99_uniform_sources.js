// Disguises come from people. Alternate entry loadouts remain explicit preparation choices.
for(const stage of STAGES)if(stage.props)stage.props=stage.props.filter(p=>!p.outfit);
const firstWardrobe=STAGES.find(s=>s.id==='p1');
firstWardrobe.guards.push({kind:'g1',tag:'uniformDonor',at:[13,14],post:0,still:true,radio:false});
firstWardrobe.mission='골목 경비를 기절시키고 옷을 훔쳐 입은 뒤 출고 서류를 회수한다.';
firstWardrobe.brief='골목에서 혼자 쉬는 경비가 있다. 등 뒤에서 짧게 공격해 기절시키고, 몸 옆에서 행동 대상을 옷 훔쳐 입기로 고른다. 변장한 뒤 물류실 경비 앞을 평범하게 걸어 지나가 서류를 회수한다.';
for(const[id,at]of[['e2',[10,18]],['e3',[8,18]]]){
 const stage=STAGES.find(s=>s.id===id);
 stage.guards.push({kind:'g1',tag:'uniformDonor',at,post:0,still:true,radio:false});
 stage.brief=stage.brief.replace('골목의 예비 재킷으로','골목 경비를 기절시키고 옷을 훔쳐 입으면').replace('골목의 예비 재킷을 입고','골목 경비를 기절시키고 옷을 훔쳐 입어');
}

Object.assign(STAGES.find(s=>s.id==='m2').guards[5],{tag:'uniformDonor',at:[9,16],post:0,still:true,smoker:true});

STAGES.find(s=>s.id==='m4').guards.push({kind:'g1',tag:'uniformDonor',at:[2,10],post:0,still:true,radio:false});
