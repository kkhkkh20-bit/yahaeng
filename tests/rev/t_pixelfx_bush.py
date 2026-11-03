"""Walk-in bush concealment, body storage and bounded, floor-aware sprite effects."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/effects-v146';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!__game&&__game.effectAtlas.ready')
  await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();G.S.guards=[];G.S.tutI=4;const P=G.S.player,h=G.S.bushes[0];Object.assign(P,{x:h.x,y:h.y,fl:0,z:0,mode:'walk',hide:null,hidden:false,trav:null});G.input.sneakToggle=false;G.setLayer(0);G.update(.05)}''')
  r=await q.evaluate('''()=>{
   const G=__game,S=G.S,P=S.player,h=S.bushes[0],check=(v,m)=>{if(!v)throw Error(m)};
   check(!P.hidden&&!P.hide&&S.tutI===4,'Standing in a bush should not conceal the player');
   check(!G.envChoices().some(a=>a.k==='hide'&&a.h?.type==='bush'),'Bush still advertises a hide button');
   check(!G.beginHideFlow('enter',h)&&!P.trav,'Forced bush entry starts container animation');
   G.actPrimary({k:'hide',h});check(!P.hide&&!P.trav,'Old hide action teleports into a bush');return{standing:true,noHideAction:true};
  }''')
  await q.keyboard.press('Control');await q.evaluate('__game.update(.05)')
  await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;if(!P.hidden||P.hide||P.trav||S.tutI!==5)throw Error('Crouch must automatically conceal and advance lesson');P.x-=70;G.update(.05);if(P.hidden||P.hide)throw Error('Walk-out does not release concealment')}''')
  await q.keyboard.press('Control')
  extra=await q.evaluate('''()=>{
   const G=__game,S=G.S,P=S.player,h=S.bushes[0],check=(v,m)=>{if(!v)throw Error(m)};
   Object.assign(P,{x:h.x,y:h.y,mode:'walk',trav:null,hide:null});G.update(.05);check(!P.hidden,'Standing leaves player concealed');
   const body={x:P.x,y:P.y,fl:0,z:0,ch:'sam',kind:'g1',ko:true,hidden:false,stashed:false,carried:true,light:1};S.corpses=[body];P.carrying=body;
   check(G.envChoices().some(a=>['stash','carry'].includes(a.k)&&a.h===h),'Body concealment was removed along with self hide');
   check(G.beginHideFlow('stash',h,body),'Cannot put unconscious body in bush');for(let t=0;t<2;t+=.025){S.t+=.025;G.updatePlayer(.025)}
   check(body.hidden&&!body.stashed&&!P.carrying&&!P.hide,'Body must remain concealed in foliage without hiding the player');
   P.hp=2;P.hide=h;G.saveCheckpoint();check(G.loadCheckpoint(),'Old bush save rejected');
   const P2=G.S.player;check(!P2.hide&&P2.hidden&&P2.mode==='sneak'&&P2.hp===2&&G.input.sneakToggle,'Old container-style bush save was not migrated');
   const T=G.S;T.vfx=[];T.noises=[];const hp=P2.hp,at={x:P2.x,y:P2.y,fl:0,z:0};G.cam.x=P2.x;G.cam.y=P2.y;
   for(let i=0;i<50;i++)G.spawnEffect('dust',at);check(T.vfx.length===24,'Effect pool grows without a bound');T.t+=3;G.updateEffects();check(!T.vfx.length,'Expired effects leak');
   const names=Object.keys(G.effectAtlas.meta.effects);check(names.length===9,'Missing baked effects');for(const name of names)G.spawnEffect(name,at);
   G.spawnEffect('leaf',{...at,z:1});G.spawnEffect('leaf',{...at,fl:1});
   let draws=0,canvases=0;const draw=G.ctx.drawImage,create=document.createElement;
   G.ctx.drawImage=function(...a){draws++;return draw.apply(this,a)};document.createElement=function(tag,...a){if(tag==='canvas')canvases++;return create.call(this,tag,...a)};
   try{G.drawEffects(P2,-1);check(draws===names.length,'Effects leak across floor or height '+draws);for(let i=0;i<100;i++)G.drawEffects(P2,-1)}finally{G.ctx.drawImage=draw;document.createElement=create}
   check(canvases===0&&P2.hp===hp&&!T.noises.length,'Visual effects allocate canvases or alter gameplay');
   return{autoConceal:true,walkOut:true,bodyStorage:true,legacySave:true,effects:names,cap:24,frameCanvases:canvases,floorAndHeight:true};
  }''')
  assert not errors,errors;result={**r,**extra};(O/'mechanics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS',json.dumps(result,ensure_ascii=False),flush=True);await b.close()
asyncio.run(main())
