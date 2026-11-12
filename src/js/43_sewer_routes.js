// A drain escape is a physical passage, not a victory circle on a closed lid.
function sewerEscapeEntry(o){
 const e=STAGE.sewerEscape;return !!(e&&o&&dist(o.x,o.y,tc(e.entry[0]),tc(e.entry[1]))<2);
}
function sewerEscapeOutlet(o){
 const e=STAGE.sewerEscape;return !!(e&&o&&dist(o.x,o.y,tc(e.outlet[0]),tc(e.outlet[1]))<2);
}
function sewerEscapeGoal(){
 const e=STAGE.sewerEscape;
 return e&&S.exitOpen&&S.player.under?{x:tc(e.outlet[0]),y:tc(e.outlet[1]),fl:0,exit:true,text:'남쪽 도로 맨홀로 올라가 탈출',where:'지하 점검 통로'}:null;
}
// An older underground checkpoint keeps its connected old tunnel for this run.
// Never displace a saved player into a newly moved corridor or a solid wall.
function syncSewerCheckpoint(){
 const P=S.player;if(!STAGE.sewerRoutes||!P.under)return;
 if(!ugAt(Math.floor(P.x/TILE),Math.floor(P.y/TILE)))S.sewerLegacyRoute=true;
 if(S.sewerLegacyRoute){buildSewers(S.hides.filter(h=>h.type==='well'),true);ugC=bigSewers();}
}
