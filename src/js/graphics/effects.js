// Pre-rendered PixelFX. No live particle simulation, per-frame image decoding,
// canvas allocation, gameplay light or sound is added by a visual effect.
const FX_META=A.pixelfx||null,FX_LIMIT=24;
const fxAtlas=FX_META?Object.assign(new Image(),{src:FX_META.src}):null;
const pixelFxEnabled=()=>!!FX_META&&!STAGE?.artSlice;
const reducedFxMotion=matchMedia('(prefers-reduced-motion: reduce)');
function spawnEffect(kind,at,opts={}) {
  if(!S||!at||!pixelFxEnabled()||!FX_META.effects[kind]||!Number.isFinite(at.x)||!Number.isFinite(at.y))return false;
  if(reducedFxMotion.matches&&kind==='leaf')return false;
  const fl=at.fl??flOf(S.player),z=at.z??S.player.z??0;
  if(fl!==flOf(S.player)||Math.abs(at.x-S.player.x)>900||Math.abs(at.y-S.player.y)>900)return false;
  const list=S.vfx||(S.vfx=[]),m=FX_META.effects[kind],offset=clamp(opts.startAt??0,0,Math.max(0,m.duration-1/m.fps)),duration=m.duration-offset;
  list.push({kind,x:at.x,y:at.y,fl,z,t0:S.t,duration,offset,scale:opts.scale??1,angle:opts.angle||0,alpha:opts.alpha??1});
  if(list.length>FX_LIMIT)list.splice(0,list.length-FX_LIMIT);
  return true;
}
function updateEffects(){if(S.vfx)S.vfx=S.vfx.filter(f=>S.t-f.t0<f.duration&&S.t>=f.t0);}
function drawEffects(P,openB) {
  if(!pixelFxEnabled()||!fxAtlas?.complete||!fxAtlas.naturalWidth)return;
  const L0=CUR_F;setLayer(flOf(P));
  for(const f of S.vfx||[]) {
    if(flOf(f)!==flOf(P)||(f.z||0)!==(P.z||0)||!inView(f.x,f.y,100))continue;
    const b=bldAt(Math.floor(f.x/TILE),Math.floor(f.y/TILE));
    if(!tactical&&!f.z&&b>=0&&b!==openB)continue;
    const m=FX_META.effects[f.kind],t=S.t-f.t0;if(t<0||t>=f.duration)continue;
    const rect=m.frames[Math.min(m.frames.length-1,reducedFxMotion.matches?2:Math.floor((t+(f.offset||0))*m.fps))];
    const fade=clamp((f.duration-t)/.12,0,1),physical=['leaf','dust','strike','impact'].includes(f.kind);
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.scale(f.scale,f.scale);ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=f.alpha*fade*(physical?(.3+.7*ambientLightAt(f.x,f.y,!!f.z)):1);
    ctx.drawImage(fxAtlas,...rect,-m.origin[0],-m.origin[1],rect[2],rect[3]);ctx.restore();
  }
  setLayer(L0);
}
