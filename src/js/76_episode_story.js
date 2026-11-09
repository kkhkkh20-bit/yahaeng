// Optional in-field story lines yield to danger and never change mission logic.
function episodeStoryMessage(){
 const beat=STAGE.storyBeat;if(!beat||!S)return null;
 const state=S.episodeStory||(S.episodeStory={seen:{},active:null});
 if(state.active){if(state.active.until>S.t)return state.active.message;state.active=null;}
 if(state.seen[beat.id]||!beat.when(S))return null;
 return{text:beat.text,speaker:beat.speaker,action:tutText(nextGoal()?.text||''),cue:'story:'+beat.id,storyBeat:beat.id,priority:1};
}
function acknowledgeEpisodeStory(message){
 if(!message?.storyBeat||!S)return;
 const state=S.episodeStory||(S.episodeStory={seen:{},active:null});
 state.seen[message.storyBeat]=true;state.active={message,until:S.t+7};
}
// Completion has already saved rewards before the short coda. Replays keep the
// existing fast result flow; skipping a scene still proceeds to earned skills.
function playEpisodeCoda(){
 const scene=STAGE.storyCoda;if(!scene||!S?.over||!S.overWin||!S.resultFresh)return false;
 const run=S;clearResultTransition();$('end').hidden=true;running=true;document.body.classList.add('episode-coda');
 say(scene.lines,true,()=>{
  document.body.classList.remove('episode-coda');if(S!==run||!run.over)return;
  running=false;$('end').hidden=false;queueResultTraining();
 });
 $('dlgContext').textContent=scene.context;$('dlg').dataset.sequence='episode-coda';return true;
}
