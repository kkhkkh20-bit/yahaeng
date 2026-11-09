// A chosen skill follows the player into a real contract. Practice loans never count.
const FIELD_LEARNING_STORE=progressKey('yahaeng.fieldLearning.v1');
let volatileFieldLearning=null;
function loadFieldLearning(){
 let r=volatileFieldLearning;try{r=JSON.parse(localStorage.getItem(FIELD_LEARNING_STORE))||r;}catch(e){}
 return{active:SKILL_BY_ID[r?.active]?r.active:null,used:r?.used&&typeof r.used==='object'?r.used:{}};
}
function storeFieldLearning(r){try{localStorage.setItem(FIELD_LEARNING_STORE,JSON.stringify(r));volatileFieldLearning=null;}catch(e){volatileFieldLearning=r;}}
function choseFieldSkill(id){const r=loadFieldLearning();r.active=id;delete r.used[id];storeFieldLearning(r);}
const realSkillField=()=>!!S&&!S.over&&!STAGE.tutorial&&!STAGE.artSlice&&!STAGE.skillPractice&&!STAGE.toolPractice&&!STAGE.trialSkills?.length&&(introductoryContract(STAGE)||mainContract(STAGE));
function recordFieldSkill(id,detail){
 if(!realSkillField()||!S.skills?.[id]||!skillOn(id))return false;
 S.fieldSkillUses=S.fieldSkillUses||{};if(S.fieldSkillUses[id])return false;
 const use={stage:STAGE.id,detail};S.fieldSkillUses[id]=use;
 const r=loadFieldLearning();r.used[id]=use;storeFieldLearning(r);
 if(r.active===id)S.fieldSkillToast={id,detail,at:S.t+1.8};return true;
}
function fieldTakedownSkills(intent,ko){
 if(intent?.fieldSkill)recordFieldSkill(intent.fieldSkill,intent.fieldSkill==='reach'?'거리를 좁혀 제압했다':intent.fieldSkill==='drop'?'위에서 내려와 적을 제압했다':'은신한 자리에서 적을 끌어들였다');
 if(ko&&intent?.source)recordFieldSkill('silentHands','맨손 제압의 접촉 소음 30% 감소');
}
function fieldSkillPlan(id){
 const plans={
  reach:'표적이 등을 보일 때 약 세 걸음 거리에서 공격. 몸을 직접 움직여 접근한다.',
  ambush:STAGE.id==='e1'?'아래쪽 순찰로 옆 화단에 웅크려 숨고, 경비가 가까워지면 공격.':'화단이나 은신처에서 숨은 채 가까이 온 적을 공격.',
  dual:STAGE.id==='e2'?'순찰병이 문지기 뒤에 합류할 때 두 적의 등 뒤에서 공격을 길게. 한 명씩 처리하거나 복장으로 지나가도 된다.':'붙어 있는 두 적의 등 뒤에서 공격을 길게. 흩어져 있으면 한 명씩 처리해도 된다.',
  chain:'떨어진 두 적의 등 뒤에서 연속 암살을 시작. 이동 중 들키면 중단된다.',
  dart:'도구에서 다트를 선택하고 경비를 겨냥. 짧게 발사하면 기절한다. CCTV에는 전선 차단을 사용.',
  kunai:'도구에서 쿠나이를 선택하고 적을 겨냥. 1초 이상 눌렀다 떼면 처치한다.',
  smoke:'도구에서 연막탄을 선택해 사용. 연기 속에서는 시선을 가리지만 소리와 접촉은 남는다.',
  hack:'가까운 CCTV를 겨냥해 해킹기를 사용. 1.5초 작업 뒤 일시 정지하며 기존 녹화는 남는다.',
  quietStep:'평범하게 걸을 때 발소리 범위가 줄어든다. 걷기 자체는 침입의 증거가 아니다.',
  quietCrouch:'웅크려 이동해 줄어든 발소리 범위를 확인하자.',
  swiftCrouch:'웅크려 이동하면 이전보다 20% 빠르게 접근할 수 있다.',
  bodyCarry:'쓰러진 사람을 행동 버튼으로 들어 옮겨 보자. 운반 속도가 빨라졌다.',
  silentHands:'일반 경비 뒤에서 공격을 짧게 눌러 기절시키면 접촉 소음이 줄어든다.',
 };
 return plans[id]||SKILL_BY_ID[id]?.description||'';
}
function pendingFieldSkill(){const r=loadFieldLearning();return r.active&&!r.used[r.active]&&loadSkillTree().learned.includes(r.active)?r.active:null;}
function fieldSkillPreparation(after){
 const used=after&&S?.fieldSkillUses,ids=used?Object.keys(used).filter(id=>SKILL_BY_ID[id]&&loadSkillTree().learned.includes(id)):[];
 if(ids.length)return{head:'이번 의뢰에서 활용한 기술',note:ids.map(id=>SKILL_BY_ID[id].name+' · '+used[id].detail).join(' / ')};
 const id=pendingFieldSkill();return id?{head:'익힌 기술 · '+SKILL_BY_ID[id].name,note:fieldSkillPlan(id)}:null;
}
function updateFieldLearning(dt){
 if(!realSkillField())return;
 const P=S.player,prior=S.fieldStride;S.fieldStride={x:P.x,y:P.y,fl:flOf(P),z:P.z||0};
 const chosen=loadFieldLearning(),id=chosen.active&&!chosen.used[chosen.active]&&S.skills?.[chosen.active]?chosen.active:null,moved=prior&&prior.fl===flOf(P)&&prior.z===(P.z||0)&&dist(prior.x,prior.y,P.x,P.y)>.2&&dist(prior.x,prior.y,P.x,P.y)<20;
 if(id&&moved&&P.moving&&!actionBusy(P)){
  const detail=id==='swiftCrouch'&&P.mode==='sneak'?'웅크린 이동 속도 20% 증가':id==='sprint'&&P.mode==='run'?'달리기 속도 12% 증가':id==='bodyCarry'&&P.carrying?'운반 속도 60% → 75%':id==='lookout'?'일반 카메라 시야 10% 확장':null;
  if(detail){S.fieldMoveTime=(S.fieldMoveTime||0)+dt;if(S.fieldMoveTime>=2)recordFieldSkill(id,detail);}
 }else S.fieldMoveTime=0;
 if(S.fieldSkillToast&&S.t>=S.fieldSkillToast.at&&!actionBusy(P)){const u=S.fieldSkillToast;S.fieldSkillToast=null;toast(SKILL_BY_ID[u.id].name+' 활용 · '+u.detail,3,'good');}
 if(!id||actionBusy(P)||S.alevel>=2)return;
 if(id==='reach'){
  const a=attackAction(),g=a?.g||a?.list?.[0];if(a?.k==='kill'&&g&&dist(P.x,P.y,g.x,g.y)>MELEE_CONTACT)fieldSkillNotice('learned-reach','익힌 접근 암살 · 지금 공격하면 직접 다가가 제압한다');
 }else if((id==='dual'||id==='chain')&&assassinOpportunity(id))fieldSkillNotice('learned-'+id,'익힌 '+SKILL_BY_ID[id].name+' · 두 적의 등 뒤다. 공격을 길게 누르면 시작한다');
 else if(id==='ambush'&&ambushTarget())fieldSkillNotice('learned-ambush','익힌 은신 기습 · 숨은 채 공격해 가까운 적을 끌어들인다');
 else if(id==='dart'&&input.tool==='kunai'&&kunaiTarget())fieldSkillNotice('learned-dart','익힌 다트 · 짧게 발사하면 겨눈 경비를 기절시킨다');
}
