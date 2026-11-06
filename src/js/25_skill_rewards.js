// Only a mission's first clear pays; stars and replay styles are separate rewards.
function skillRewardRows(stage,record=loadCh()){
 if(stage.tutorial||stage.city||!stage.challenges)return[];
 return[{id:'_clear',name:'미션 첫 완료',points:1,earned:!!record[stage.id]?._clear}];
}
const missionSkillPoints=(record=loadCh())=>STAGES.reduce((n,stage)=>n+skillRewardRows(stage,record).filter(r=>r.earned).reduce((a,r)=>a+r.points,0),0);
function skillLegacyPoints(record){return record?.rewardVersion===203?Math.min(SKILL_TREE.reduce((n,d)=>n+d.cost,0),Math.max(0,Math.floor(Number(record.legacyPoints)||0))):0;}
