// Original solid emblems share the same pixels in the graph, detail and loadout.
function uiSigil(id,cls=''){
 const art=window.__HUD_ART__?.['ui:'+id];return art?art.replace('<svg ',`<svg class="${cls}" `):'';
}
function skillSigil(id,cls=''){
 const art=window.__HUD_ART__?.['skill:'+id]||window.__HUD_ART__?.['skill:kit'];return art?art.replace('<svg ',`<svg class="${cls}" `):'';
}
const skillLock=uiSigil('lock');
const skillEmblemImages=new Map();
function drawSkillEmblem(c,id,x,y,w,h,color='#c5d0de'){
 const key=id+':'+color;let im=skillEmblemImages.get(key);
 if(!im){const svg=window.__HUD_ART__?.['skill:'+id];if(!svg)return false;im=new Image();skillEmblemImages.set(key,im);im.onload=()=>{if(S)refreshMissionIdentityArt();};im.src='data:image/svg+xml;base64,'+btoa(svg.replace(/currentColor/g,color));}
 if(!im.complete||!im.naturalWidth)return false;c.drawImage(im,x,y,w,h);return true;
}

function skillUseText(d){
 if(['dual','chain'].includes(d.id))return '장착 후 공격 길게 · 짧게 떼면 한 명 기절 / B도 가능';
 if(d.id==='reach')return '등 뒤에서 공격 · 짧게 기절 / 길게 처치';
 if(d.id==='ambush')return '은폐 상태에서 공격 · 짧게 기절 / 길게 처치';
 if(d.id==='drop')return '옥상 가장자리에서 아래의 적에게 공격';
 if(d.id==='electric')return '건물·구역 분전반 앞에서 행동 버튼';
 if(['dart','kunai','smoke','radio','hack'].includes(d.id))return '장비에서 선택한 뒤 도구 버튼';
 return '배우면 해당 상황에서 자동 적용';
}
function drawSkillPreview(id){
 const canvas=$('skillPreview');if(!canvas)return;
 const c=canvas.getContext('2d'),d=SKILL_BY_ID[id],w=480,h=220;canvas.width=w;canvas.height=h;c.imageSmoothingEnabled=false;
 c.fillStyle='#202c2d';c.fillRect(0,0,w,h);
 // The game palette and cached sprites form a static explanation, never a live simulation.
 c.strokeStyle='#2c3a3a';c.lineWidth=1;for(let x=0;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=20;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 c.fillStyle='#131e23';c.fillRect(0,0,w,34);c.fillStyle='#566063';c.fillRect(0,33,w,3);
 const sprite=(key,x,y,anim='idle',a=0)=>{
  const sh=prSheet(key);if(!sh||!PR)return;const[col]=PR.anims[anim]||PR.anims.idle,ci=Math.floor(col/PR_CH),part=prPart(sh,ci);if(!part)return;
  const scale=2.15,fr=PR.fr,dw=fr*scale,gy=(PR.grounds?.[anim]??PR.groundY)*scale;
  c.fillStyle='#07131588';c.beginPath();c.ellipse(x,y+7,24,8,0,0,TAU);c.fill();c.drawImage(part,(col-ci*PR_CH)*fr,prDir(a)*fr,fr,fr,x-dw/2,y-gy,dw,dw);
 };
 c.strokeStyle='#b5a16e';c.lineWidth=1.5;c.setLineDash([4,5]);
 if(d.branch==='body'){
  if(id==='foliage'){c.fillStyle='#314b3a';for(const[x,y,r]of[[125,130,25],[150,122,28],[172,139,24],[141,149,27]]){c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}}
  if(id==='shadow'){c.fillStyle='#0b151cbb';c.fillRect(0,36,220,184);}
  const pose=id==='sprint'?'run':id==='quietStep'?'walk':'crouch';sprite('ninja',145,156,pose);sprite('sam',345,157,'idle',0);
  if(id==='lookout'){c.strokeRect(75,63,325,125);}
  else if(id==='landing'){c.beginPath();c.moveTo(146,48);c.lineTo(146,86);c.moveTo(137,76);c.lineTo(146,86);c.lineTo(155,76);c.stroke();}
  else {c.beginPath();c.ellipse(145,160,id==='sprint'?72:46,18,0,0,TAU);c.stroke();}
  c.beginPath();c.moveTo(192,164);c.lineTo(288,164);c.stroke();
 }else if(d.branch==='assassin'){
  if(id==='drop'){c.fillStyle='#4d5753';c.fillRect(85,69,125,14);c.fillStyle='#111d22';c.fillRect(85,83,125,92);sprite('ninja',153,79,'crouch');}
  else if(id==='bodyCarry'){sprite('ninja',206,159,'carryI');sprite('sam',206,159,'carriedI');}
  else{sprite('ninja',id==='silentHands'?184:170,159,'sneak');}
  if(id==='ambush'){c.fillStyle='#3e5d4499';for(const x of [145,170,190]){c.beginPath();c.arc(x,145,22,0,TAU);c.fill();}}
  if(id!=='bodyCarry')sprite('sam',245,153,'idle');if(['dual','chain','flow'].includes(id))sprite('sam',306,166,'idle');
  c.beginPath();c.moveTo(160,181);c.lineTo(305,181);c.stroke();c.setLineDash([]);c.fillStyle='#cbb77b';c.beginPath();c.moveTo(309,181);c.lineTo(299,176);c.lineTo(299,186);c.fill();
 }else{
  sprite('ninja',145,160,'idle');c.fillStyle='#404d4e';c.fillRect(321,57,43,81);c.strokeStyle='#9eac9e';c.strokeRect(321,57,43,81);
  if(id==='electric'){c.fillStyle='#c5aa65';c.fillRect(333,80,18,25);c.fillStyle='#1a282a';c.fillRect(340,84,4,15);}
  else if(['hack','signal'].includes(id)){c.fillStyle='#192b2b';c.fillRect(326,63,33,39);c.strokeStyle='#8caa91';c.beginPath();c.moveTo(331,87);c.lineTo(338,77);c.lineTo(346,87);c.lineTo(354,70);c.stroke();}
  else if(['smoke','smokeMix'].includes(id)){c.fillStyle='#73807888';for(const[x,y,r]of[[325,137,31],[354,123,39],[374,148,33]]){c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}}
  else sprite('sam',342,158,'idle',Math.PI);
  c.beginPath();c.moveTo(186,136);c.lineTo(299,115);c.stroke();
 }
 c.setLineDash([]);
}
