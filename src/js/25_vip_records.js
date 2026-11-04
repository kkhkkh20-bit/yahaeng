// Successful approaches are a collection, independent of skill currency and rank.
const VIP_APPROACHES=[
  {id:'smoke',name:'흡연 동선 매복',hint:'클럽 앞에서 경호원이 물러나는 순간을 살핀다.'},
  {id:'emetic',name:'화장실 유인',hint:'약국의 구토제와 공중화장실의 직원 옷으로 술병에 접근한다.'},
  {id:'sign',name:'간판 사고',hint:'클럽 옥상에서 실장이 담배 피우는 자리 위의 간판을 살핀다.'},
  {id:'meeting',name:'장부로 불러낸 매복',hint:'장부를 먼저 챙긴 뒤 사무동 내선으로 실장을 혼자 불러낸다.'}
];
function vipApproachRecords(record=loadCh()){
  const raw=record.m2?._approaches||{},out={};
  for(const d of VIP_APPROACHES){const v=raw[d.id];if(v&&Number.isFinite(v.best)&&v.best>=0&&v.clears>0)out[d.id]={best:v.best,clears:Math.min(999,Math.floor(v.clears)),clean:!!v.clean};}
  return out;
}
function nextVipApproach(record=loadCh()){
  const owned=vipApproachRecords(record);return VIP_APPROACHES.find(d=>!owned[d.id])||null;
}
function recordVipApproach(record){
  if(STAGE.id!=='m2'||S.vipReceiptSaved||!S.exitOpen||!S.items.every(i=>i.got)||!S.guards.some(g=>g.tag==='vip'&&targetEliminated(g))||evidencePending())return null;
  const d=VIP_APPROACHES.find(d=>d.name===S.missionApproach);
  if(!d){S.vipReceiptSaved=true;return S.vipReceipt={id:null,name:S.missionApproach||'자유 접근',fresh:false,count:Object.keys(vipApproachRecords(record)).length};}
  const rows=vipApproachRecords(record),old=rows[d.id],time=Math.max(0,Math.floor(S.t));
  rows[d.id]={clears:Math.min(999,(old?.clears||0)+1),best:old?Math.min(old.best,time):time,clean:!!old?.clean||!S.stats.detected&&!S.stats.alarms&&!S.stats.extraKills&&!S.stats.bodies&&!(S.stats.witness||0)&&!(S.stats.camEver||0)};
  (record.m2||(record.m2={}))._approaches=rows;S.vipReceiptSaved=true;
  return S.vipReceipt={id:d.id,name:d.name,fresh:!old,count:Object.keys(rows).length};
}
function vipPassportHTML(){
  if(STAGE.id!=='m2'||!S.vipReceipt)return '';
  const owned=vipApproachRecords(),next=nextVipApproach();
  return '<div class="vip-passport"><b>특별 공략 기록 · '+Object.keys(owned).length+'/'+VIP_APPROACHES.length+'</b><div class="vip-methods">'+VIP_APPROACHES.map(d=>'<span class="'+(owned[d.id]?'earned':'')+'">'+(owned[d.id]?'✓ ':'○ ')+d.name+(owned[d.id]?'<small>'+mmss(owned[d.id].best)+' · '+(owned[d.id].clean?'은밀 완료':'흔적 줄이기')+'</small>':'')+'</span>').join('')+'</div>'+(next?'<p>다음 도전 · '+next.name+'<small>'+next.hint+'</small></p>':'<p>네 가지 공략 완료 · 같은 방법에서 발각과 흔적을 줄여 보자.</p>')+'</div>';
}
function retryContract(){
  const intent=STAGE.id==='m2'?(S.vipReceipt?nextVipApproach()?.id:S.vipIntent):null;
  start(STAGE_I,true);if(intent)S.vipIntent=intent;skipDialog();
}
