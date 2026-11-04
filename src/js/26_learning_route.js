// Recommendation only: the ledger always permits direct contract selection.
const LEARNING_ROUTE=['p0','m2','m4','m6'];
const OPTIONAL_LESSON_NEXT={tB:'t0',t0:'tC',tC:'m2',tL:'tR',tR:'m4'};
const learningComplete=st=>stageCleared(st)||st.openingContract&&mainContracts().some(stageCleared);
function learningStageIndex(id){return STAGES.findIndex(s=>s.id===id&&demoOk(s));}
function recommendedStage(){
  for(const id of LEARNING_ROUTE){const i=learningStageIndex(id);if(i>=0&&!learningComplete(STAGES[i]))return i;}
  const st=mainContracts().find(demoOk);return st?STAGES.indexOf(st):0;
}
function learningNext(){
  if(OPTIONAL_LESSON_NEXT[STAGE.id])return learningStageIndex(OPTIONAL_LESSON_NEXT[STAGE.id]);
  const at=LEARNING_ROUTE.indexOf(STAGE.id);
  if(at>=0){for(const id of LEARNING_ROUTE.slice(at+1)){const i=learningStageIndex(id);if(i<0)continue;if(STAGES[i].tutorial&&stageCleared(STAGES[i]))continue;return i;}return -1;}
  return recommendedStage();
}
function learningNextLabel(){
  const i=learningNext(),st=STAGES[i];if(!st)return '다음 의뢰';
  return st.tutorial?st.name.replace(/^연습 \d · /,'다음 연습 · '):'의뢰 '+contractNumber(st)+' · '+st.name;
}

function initLessonLayout(){
  if(!STAGE.episodeLesson)return;
  const l=S.ladders.find(l=>l.kind==='fstair'&&l.tfl===1);
  if(l)S.lessonLayout={up:{...stairLower(l).up.entry,fl:0},down:{...stairUpper(l).down.entry,fl:1}};
}
