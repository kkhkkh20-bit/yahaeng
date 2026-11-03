// Small authored symbols and a static demonstration using the existing sprite cache.
const SKILL_SIGILS={
 quietStep:'M14 6c3 0 4 4 3 7l-3 4-4-2 1-5c0-2 1-4 3-4ZM10 19l4 2-1 4-5-1Z M23 12c3 0 4 4 3 7l-3 4-4-2 1-5c0-2 1-4 3-4ZM19 25l4 2-1 4-5-1Z',
 quietCrouch:'M12 17l4-5 6 2 3 6M16 12l2-5M15 19l-5 6 8 2M21 20l-2 7h8 M5 13l3 2M5 20h3',
 lookout:'M3 18c8-11 22-11 30 0-8 11-22 11-30 0ZM18 13a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z M18 3v4M5 6l3 3M31 6l-3 3',
 swiftCrouch:'M14 16l5-5 6 4M19 11l1-5M17 18l-5 7h7M24 17l-3 9h8 M3 14h8M2 20h7M4 26h4',
 shadow:'M23 4a13 13 0 1 0 9 20A14 14 0 0 1 23 4Z M17 18l3-3 5 3M20 15v-3M20 20l-4 5h10',
 landing:'M18 5v12M13 12l5 5 5-5M10 21l4 4h8l4-4M5 28c8 5 18 5 26 0',
 foliage:'M18 31V13M18 22C4 23 3 14 4 8c10 0 14 5 14 14ZM18 17C31 18 34 9 32 4c-9 0-14 5-14 13Z M7 30l-4-5M29 30l4-5',
 sprint:'M21 10l-5 8 7 4-3 10M16 18l-5 9H5M21 10l6 7h6M21 5h1 M3 11h10M2 17h8',
 silentHands:'M12 27V16c0-3 3-3 3 0V9c0-3 3-3 3 0v7-10c0-3 3-3 3 0v10-7c0-3 3-3 3 0v12l3-4c2-3 5 0 3 3l-5 10H14Z',
 ambush:'M3 28h30M7 28V10h9v18M21 20l4-4 5 3M25 16v-5M22 22l-2 6M28 22l4 6M9 6h5',
 drop:'M7 7h22M18 4v13M13 12l5 5 5-5M18 23l-5 8M18 23l5 8M13 22l5-3 5 3',
 dual:'M8 4l7 13-3 5-4-6ZM28 4l-7 13 3 5 4-6ZM7 23l7 4M10 25l-3 6M29 23l-7 4M26 25l3 6M17 25h2',
 bodyCarry:'M11 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM11 12v12l-4 8M11 23l6 9M11 14l10 1 6 7M21 15l3-7h6M24 8l6 4',
 chain:'M7 6l8 8-4 5-4-7ZM23 17l7 8-4 6-5-7ZM18 8h10M25 5l3 3-3 3M8 26h10M15 23l3 3-3 3',
 reach:'M11 10l6 7 8-3M17 17l-5 8-8 3M17 17l6 8h8M26 6h7M30 3l3 3-3 3M10 4h1',
 flow:'M8 13a12 12 0 0 1 21-4l3 4M25 13h7V6M28 23A12 12 0 0 1 7 27l-3-4M11 23H4v7 M17 11l5 7-5 7',
 blindside:'M4 13c8-8 20-8 28 0M18 8v10M13 13l5 5 5-5M3 25h10M8 21l5 4-5 4M24 24l6 6M30 24l-6 6',
 kit:'M6 11h24v19H6ZM13 11V6h10v5M6 18h24M15 16v5h6v-5',
 dart:'M8 28L26 10M23 5l8 8M6 30l3-8 5 5ZM17 14l5 5M28 8l4-4',
 kunai:'M6 30l8-8M13 23l-4-4L30 3l-5 22-5-4ZM11 25l-4-4M4 32l-1-1',
 smoke:'M13 21h10l2 11H11ZM16 21v-4h5M9 13C0 9 9 2 14 6c0-7 12-5 11 1 9-2 11 9 2 9H14',
 precision:'M18 3v5M18 28v5M3 18h5M28 18h5M18 9a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
 smokeMix:'M13 4h10M15 4v10L7 29c-1 2 1 3 3 3h16c2 0 4-1 3-3l-8-15V4M12 24h13M13 12H6M9 8v8',
 electric:'M21 2L7 21h10l-2 13 14-20H19ZM5 7l3 2M31 27l-3-2',
 radio:'M10 12h16v20H10ZM13 12V3M17 17h5M15 23h6M15 27h6M26 5c5 1 7 4 7 8M26 9c2 0 3 2 3 4',
 hack:'M5 9h22v17H5ZM9 30h14M16 26v4M10 15l-3 3 3 3M20 15l3 3-3 3M16 14l-3 8M27 4l5 5M30 2l4 4',
 signal:'M5 12h8v12H5ZM23 12h8v12h-8ZM13 18h10M18 4v9M15 7l3-3 3 3M18 23v9M15 29l3 3 3-3'
};
const skillSigil=(id,cls='')=>`<svg class="${cls}" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SKILL_SIGILS[id]||SKILL_SIGILS.kit}"/></svg>`;
const skillLock='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v8H3Z"/></svg>';
function skillUseText(d){
 if(['dual','chain'].includes(d.id))return '장착한 뒤 B 또는 기술 버튼을 길게 누르기';
 if(d.id==='reach')return '등 뒤에서 공격 · 짧게 기절 / 길게 처치';
 if(d.id==='ambush')return '은폐 상태에서 공격 · 짧게 기절 / 길게 처치';
 if(d.id==='drop')return '옥상 가장자리에서 아래의 적에게 공격';
 if(d.id==='electric')return '스위치·분전반 앞에서 행동 버튼';
 if(['dart','kunai','smoke','radio','hack'].includes(d.id))return '도구 바꾸기로 선택한 뒤 도구 버튼';
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
