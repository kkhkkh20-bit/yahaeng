// Achievement flags are the receipt: replaying a cleared goal cannot mint points.
const SKILL_SIGNATURES={m2:'accident',m4:'nobody',m6:'untouched'};
function skillRewardRows(stage,record=loadCh()){
 if(stage.tutorial||stage.city||stage.openingContract||!stage.challenges)return[];
 const main=Object.hasOwn(SKILL_SIGNATURES,stage.id),saved=record[stage.id]||{},ids=[...new Set([...stage.challenges,...(stage.legacyChallenges||[])])];
 return[{id:'_clear',name:'미션 첫 완료',points:main?2:1,earned:!!saved._clear},...ids.map(id=>({id,name:id==='fast'?mmss(stage.fastT||330)+' 안에 완료하기':CH[id]?.[0]||id,points:main&&SKILL_SIGNATURES[stage.id]===id?2:1,earned:!!saved[id],signature:main&&SKILL_SIGNATURES[stage.id]===id,retired:!stage.challenges.includes(id)}))];
}
const missionSkillPoints=(record=loadCh())=>STAGES.reduce((n,stage)=>n+skillRewardRows(stage,record).filter(r=>r.earned).reduce((a,r)=>a+r.points,0),0);
const oldPracticePoints=()=>{const record=loadCh();return STAGES.filter(s=>s.tutorial||s.city).reduce((n,s)=>n+(s.challenges?earnedChallengeStars(s,record):0),0);};
function skillLegacyPoints(record){
 // Only v151 practice credit is carried forward; new practice has no permanent reward.
 const max=STAGES.filter(s=>s.tutorial||s.city).reduce((n,s)=>n+(s.challenges?1+new Set([...(s.challenges||[]),...(s.legacyChallenges||[])]).size:0),0);
 return record?.rewardVersion===152?Math.min(max,Math.max(0,Math.floor(Number(record.legacyPoints)||0))):oldPracticePoints();
}
