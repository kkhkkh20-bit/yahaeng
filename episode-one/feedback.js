import * as THREE from 'three';
// Restore small campaign cues skipped by the alternate renderer, using its camera.
export function drawFeedback(G,V,c,world,people,project,width,height){
 const S=G.S,P=S.player;
 const watching=S.guards.filter(g=>world.visibility.visible(g)&&people.actors.get(g)?.driver.root.visible).map(g=>({g,...G.guardAwareness(g)})).filter(o=>o.direct&&o.progress>.02).sort((a,b)=>b.progress-a.progress).slice(0,2);
 for(const o of watching){const q=project(new THREE.Vector3(o.g.x/48,people.height(o.g)+1.86,o.g.y/48));if(q.x<16||q.x>width-16||q.y<160||q.y>height-150)continue;c.fillStyle='#131d1d';c.fillRect(q.x-15,q.y-5,30,5);c.fillStyle=o.color;c.fillRect(q.x-14,q.y-4,28*Math.min(1,o.progress),3);}
 // Follow the same discovered goal/entrance selection as the campaign HUD.
 // One compact arrow; no explanatory panel over the actor's actions.
 if(P.hide||P.captive||P.under||P.vent||G.actionBusy())return;
 const goal=G.goalNavigation(G.nextGoal());if(!goal||goal.x==null)return;
 const meters=Math.max(1,Math.round(Math.hypot(goal.x-P.x,goal.y-P.y)/32));if(meters<3)return;
 const q=project(new THREE.Vector3(goal.x/48,people.height(P)+.08,goal.y/48)),touch=matchMedia('(pointer:coarse)').matches,top=Math.max(180,(document.getElementById('stealth')?.getBoundingClientRect().bottom||150)+22),bottom=height-(touch?295:70),left=24,right=width-24;
 if(bottom<=top)return;
 const px=Math.max(left,Math.min(right,q.x)),py=Math.max(top,Math.min(bottom,q.y)),off=px!==q.x||py!==q.y;
 const mini=document.getElementById('mini')?.getBoundingClientRect();if(mini&&px>mini.left-18&&px<mini.right+18&&py>mini.top-18&&py<mini.bottom+18)return;
 c.save();c.translate(px,py);c.rotate(off?Math.atan2(q.y-py,q.x-px):Math.PI/2);c.fillStyle='#ddc58f';c.strokeStyle='#192624';c.lineWidth=2;c.beginPath();c.moveTo(8,0);c.lineTo(-5,-5);c.lineTo(-5,5);c.closePath();c.stroke();c.fill();c.restore();
 c.font='600 11px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.fillStyle='#ddc58f';c.strokeStyle='#152323';c.lineWidth=3;const text=(goal.fl!==(P.fl||0)&&goal.fl?String(goal.fl+1)+'층 · ':'')+meters+'m';c.strokeText(text,px,py+19);c.fillText(text,px,py+19);c.textAlign='left';
}
