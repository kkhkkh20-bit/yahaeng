// Pose tracks use the same authored model and palette; no runtime 3D or root shifts.
function motionKey(key,anim){const [pal,body]=prSplit(key),name=(body||'key')+'Motion';if(!PR.bodies?.[name]?.anims[anim])return null;if(!prBodies[name]){prLoadBody(name);return null;}return pal+'@'+name;}
function actionHandPose(I){
  if(I.pose==='dress')return clothingPose(I);
  const f=clamp(I.t/I.dur,0,1),ground=I.pose==='ground'||I.pose==='dress'||I.kind==='clean'||I.kind==='loot'&&['bed','bedD','nstand'].includes(I.it?.furn),anim=ground?'openLow':'openHigh';
  let p=f;
  if(I.dur>1&&I.t>=.18&&I.dur-I.t>=.16){const key=playerKey(S.player),name=ground?'workLow':'workHigh',source=fluidSource(key,name);if(source){warmFluidPose(key,name);if(prBodies[source])return{anim:name,frame:((I.t-.18)/.7%1)*PR.bodies[source].anims[name][1]};}}
  if(I.dur>1){const reach=clamp(I.t/.18,0,1),release=clamp((I.dur-I.t)/.16,0,1);p=I.t<.18?reach*.5:I.dur-I.t<.16?1-release*.5:.5+Math.sin(I.t*16)*.045;}
  const key=playerKey(S.player),m=PR.bodies?.[prSplit(key)[1]]||PR,n=(m.anims[anim]||PR.anims[anim])[1];return{anim,frame:Math.round(p*(n-1))};
}
// Take the garment low, rise, adjust it at the torso, then return to the stance.
function clothingPose(I){
  const f=clamp(I.t/I.dur,0,1),key=playerKey(S.player);
  const name=fluidSource(key,'dress');if(name){warmFluidPose(key,'dress');if(prBodies[name]){if(S.player.mode==='sneak'&&f>.88)return{anim:'duck',frame:(f-.88)/.12*8};return{anim:'dress',frame:f*(PR.bodies[name].anims.dress[1]-1)};}}
  if(f<.42)return{anim:'openLow',frame:Math.round(8*clamp(f/.12,0,1)+Math.sin(I.t*7)*.6)};
  if(f<.62)return{anim:'duck',frame:Math.round(8*(1-hideEase((f-.42)/.2)))};
  if(f>.85&&S.player.mode==='sneak')return{anim:'duck',frame:Math.round(8*hideEase((f-.85)/.15))};
  const p=f<.85?clamp((f-.62)/.1,0,1)*.5:.5+.5*hideEase((f-.85)/.15);
  return{anim:'openHigh',frame:Math.round(p*16)};
}
function drawVaultPR(key,x,y,a,f,alpha=1,scale=1,lift=0){
  const k=motionKey(key,'vaultPass');return k?drawPR(k,x,y,a,'vaultPass',0,alpha,scale,lift,Math.round(clamp(f,0,1)*16)):drawPR(key,x,y,a,'vault',0,alpha,scale,lift,f<.3?0:f<.75?1:2);
}
function handlingSample(P,A){
  const f=clamp((S.t-A.t0)/A.dur,0,1),p=A.k==='lift'?f:1-f,t=hideEase(clamp((p-.08)/.65,0,1)),x0=A.cx??A.c.x,y0=A.cy??A.c.y,a0=A.ca??A.c.a??P.a;
  return{p,frame:Math.round(p*24),x:x0+(P.x-x0)*t,y:y0+(P.y-y0)*t,a:a0+angDiff(a0,P.a)*t};
}
function drawHandling(P,A,alpha=1,scale=1){
  const key=motionKey(playerKey(P),'handleLift'),other=motionKey(carryKey(A.c),'handledLift');if(!key||!other)return false;
  const h=handlingSample(P,A),body=()=>drawPR(other,h.x,h.y,h.a,'handledLift',0,alpha,1,0,h.frame);
  if(h.y<P.y)body();drawPR(key,P.x,P.y,P.a,'handleLift',0,alpha,scale,0,h.frame);if(h.y>=P.y)body();return true;
}
