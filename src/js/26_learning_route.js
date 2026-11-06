// One story route. The player continues the next unfinished episode.
const LEARNING_ROUTE=['tB','p0','p1','p2','e1','e2','e3','m2','m4','m6','m7'];
const OPTIONAL_LESSON_NEXT={t0:'p0',tC:'e1',tL:'tR',tR:'m4'};
const learningComplete=st=>stageCleared(st)||st.id==='tB'&&STAGES.some(s=>s.id!=='tB'&&(introductoryContract(s)||mainContract(s)||s.tutorial)&&stageCleared(s))||introductoryContract(st)&&mainContracts().some(stageCleared);
function learningStageIndex(id){return STAGES.findIndex(s=>s.id===id&&demoOk(s));}
function recommendedStage(){
  for(const id of LEARNING_ROUTE){const i=learningStageIndex(id);if(i>=0&&!learningComplete(STAGES[i]))return i;}
  return -1;
}
function learningNext(){
  if(OPTIONAL_LESSON_NEXT[STAGE.id]){const i=learningStageIndex(OPTIONAL_LESSON_NEXT[STAGE.id]);return STAGE.id==='tC'&&i>=0&&learningComplete(STAGES[i])?recommendedStage():i;}
  const at=LEARNING_ROUTE.indexOf(STAGE.id);
  if(at>=0){for(const id of LEARNING_ROUTE.slice(at+1)){const i=learningStageIndex(id);if(i<0)continue;if(learningComplete(STAGES[i]))continue;return i;}return -1;}
  return recommendedStage();
}
function learningNextLabel(){
  const i=learningNext(),st=STAGES[i];if(!st)return '다음 의뢰';
  return (st.starterContract||st.apprenticeContract)?'다음 의뢰 · '+st.name:st.tutorial?st.name.replace(/^연습 \d · /,'다음 연습 · '):'의뢰 '+contractNumber(st)+' · '+st.name;
}

function initLessonLayout(){
  if(!STAGE.episodeLesson)return;
  const l=S.ladders.find(l=>l.kind==='fstair'&&l.tfl===1);
  if(l)S.lessonLayout={up:{...stairLower(l).up.entry,fl:0},down:{...stairUpper(l).down.entry,fl:1}};
}

function campaignHasProgress(){return STAGES.some(s=>(LEARNING_ROUTE.includes(s.id)||s.tutorial)&&stageCleared(s));}
function campaignSkillState(){
  const r=loadSkillTree(),points=skillBudget()-skillSpent(r),owned=new Set(r.learned);
  const choices=SKILL_TREE.filter(d=>!owned.has(d.id)&&d.cost<=points&&d.req.every(id=>owned.has(id)));
  return{points,canLearn:choices.length>0,choices:choices.map(d=>d.id)};
}
function openEpisodeTraining(next=learningNext()){
  if(!S||!S.over||$('end').dataset.win!=='1'||!LEARNING_ROUTE.includes(STAGE.id))return false;
  openAssassinMenu();if(!assassinMenu)return false;
  assassinMenu.training=true;assassinMenu.practice=false;assassinMenu.advanceTo=next;
  renderAssassinMenu();return true;
}
function beginCampaign(){
  const next=recommendedStage();if(next<0)return;
  if(campaignHasProgress()&&campaignSkillState().canLearn){
    openAssassinMenu();assassinMenu.training=true;assassinMenu.practice=false;assassinMenu.advanceTo=next;renderAssassinMenu();return;
  }
  start(next);
}
