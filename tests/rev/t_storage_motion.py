"""All storage footprints, continuous rendered roots, exits and ledge catch/drop policy."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
def check_anchors():
 m=json.loads((ROOT/'build/pr/pr_meta.json').read_text());n=0
 for name,meta in [('key',m),*[(k,m['bodies'][k])for k in ['hero','heroSuit','heroWorker','heroCrew']]]:
  for row,hands in enumerate(meta['ledgePullHands']):
   base=meta['hangHands'][row][0]
   for i,h in enumerate(hands):
    assert max(abs(h[0][j]-base[0][j])for j in [0,1])<.05,(name,row,i,'support hand slides')
    if i in [0,12]:assert max(abs(h[k][j]-base[k][j])for k in [0,1]for j in [0,1])<.05,(name,row,i,'hanging pose endpoint changed')
    n+=1
 print('PASS',n,'baked ledge support-hand anchors and hanging endpoints',flush=True)
async def main():
 check_anchors()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let stores=0,exits=0,drops=0,ledgeKills=0,standingDrops=0,storedBodies=0,paired=0;const types={},faces=new Set(),pairedTypes=new Set();
    const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;window.template=S.guards.find(g=>!g.civ&&!g.dog&&!g.child&&!g.target);S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;return S;};
    const reset=(P,x,y,fl=0,z=0)=>{Object.assign(P,{x,y,fl,z,trav:null,jump:null,wire:null,ledge:null,hide:null,vent:false,under:false,captive:null,carrying:null,cover:null,snap:null,interact:null,pick:null,lunge:null,grabIn:null,bodyAnim:null,strikeT:0,lethalHold:null,moving:false,a:-Math.PI/2});G.S.keys={};G.input.joy=null;G.setLayer(fl);};
    const step=dt=>{G.S.t+=dt;G.setLayer(G.S.player.fl||0);G.updatePlayer(dt);G.updateLedgePull(dt);};
    const finish=()=>{let old=null,n=0;const P=G.S.player;while(P.trav&&n++<1500){const sample=G.hideHeroSample(P,P.trav);if(old)check(Math.hypot(sample.x-old.x,sample.y-old.y)<7,'visible root jumps '+P.trav.hideFlow.h.type+' '+JSON.stringify([old,sample]));old=sample;step(.005);}check(n<1500,'stuck hiding');if(old&&P.hide===null)check(Math.hypot(old.x-P.x,old.y-P.y)<1,'exit render snaps to idle');};
    for(const id of ['m1','m2','m3','m4','m5','m6']){
     const S=fresh(id),P=S.player;
     for(const h of [...S.hides,...S.bushes]){
      if(h.type==='okt')continue;G.setLayer(h.fl||0);const z=h.z||0,solid=G.solidFor(z),sides=G.hidePerimeter(h).filter(c=>!solid(c.tx,c.ty));
      if(!sides.length)continue;
      const side=sides.find(c=>c.ny===1)||sides[0];reset(P,side.tx*48+24,side.ty*48+24,h.fl||0,z);h.bodies=0;
      check(G.objectReachable(h,64),'unreachable storage '+id+' '+h.type);G.doAct({k:'hide',h});check(P.trav?.hideFlow,'entry skipped '+h.type);finish();check(P.hide===h,'not hidden '+h.type);stores++;types[h.type]=(types[h.type]||0)+1;
      const before={x:P.x,y:P.y};G.leaveHide({x:side.nx,y:side.ny});check(P.trav?.hideFlow&&P.hide===h,'exit skipped');finish();check(!P.hide&&!solid(Math.floor(P.x/48),Math.floor(P.y/48)),'exit inside obstacle '+h.type);exits++;
      if(!pairedTypes.has(h.type)){
       pairedTypes.add(h.type);reset(P,side.tx*48+24,side.ty*48+24,h.fl||0,z);h.bodies=0;
       const c={x:P.x,y:P.y,fl:P.fl,z,ch:'sam',ko:true,carried:true,stashed:false};S.corpses=[c];P.carrying=c;
       check(G.beginHideFlow('stash',h,c),'cannot store '+h.type);check(!c.stashed&&P.carrying===c,'premature storage');finish();check(c.stashed&&c.container===h&&c.x===h.x&&c.y===h.y&&h.bodies===1&&!P.carrying,'invalid stored body '+h.type);storedBodies++;
       reset(P,side.tx*48+24,side.ty*48+24,h.fl||0,z);h.bodies=0;S.corpses=[];const g={...template,x:P.x,y:P.y,fl:P.fl,z,state:'CAPTIVE',takedownIntent:{lethal:false},doomed:false};S.guards=[g];P.captive=g;
       check(G.beginHideFlow('drag',h,g),'cannot drag into '+h.type);finish();const body=S.corpses.at(-1);check(body?.ko&&(h.type==='bush'?body.hidden&&Math.hypot(body.x-h.x,body.y-h.y)<10:body.container===h)&&P.hide===h&&!g.containerMoving&&!g.doomed,'paired entry loses body/player '+h.type);paired++;P.hide=null;S.guards=[];
      }
      // Old checkpoints predate furniture footprint metadata.
      if(h.furn){delete h.w;delete h.h;reset(P,before.x,before.y,h.fl||0,z);P.hide=h;check(G.hideExitPoint(h,{x:side.nx,y:side.ny}),'old furniture save has no exit');P.hide=null;}
     }
     G.setLayer(0);
     for(let y=1;y<G.MH-1;y++)for(let x=1;x<G.MW-1;x++){
      const z=G.rLv(x,y);if(!z||G.robAt(x,y))continue;
      for(const [nx,ny]of [[0,1],[1,0],[-1,0],[0,-1]]){
       if(G.rLv(x+nx,y+ny)>=z)continue;const px=x*48+24+nx*18,py=y*48+24+ny*18,to=G.landBelow(px,py,{x:nx,y:ny},z);
       if(!to)continue;reset(P,px,py,0,z);P.ledge={x:nx,y:ny};const root=G.ledgeRoot(P);check(G.dropLedge(P),'valid ledge drop unavailable');check(Math.hypot(P.x-root.x,P.y-root.y)<.01,'release starts at guessed root');check(P.z===z,'drop changes floor before landing');let n=0;while(P.jump&&n++<200)step(.005);check(!P.jump&&P.z===to.z&&P.x===to.x&&P.y===to.y,'bad downward landing');drops++;faces.add(nx+','+ny);
       reset(P,px,py,0,z);P.a=Math.atan2(ny,nx);const ds=G.dropSpot();if(ds){G.doAct({k:'jump',s:ds});check(P.jump?.downward&&P.z===z,'standing drop skips departure floor');let n=0;while(P.jump&&n++<200)step(.005);check(P.z===ds[2]&&!P.moving&&!G.solidFor(P.z)(Math.floor(P.x/48),Math.floor(P.y/48)),'standing jump has unsafe landing or final pose');standingDrops++;}
       // One catch/drop per facing per mission. Others cover all safe landings above.
       if(ledgeKills>=24||G.S._testedFaces?.has(nx+','+ny))continue;(G.S._testedFaces||=(new Set())).add(nx+','+ny);
       reset(P,px,py,0,z);P.ledge={x:nx,y:ny};const g={...template,x:px-nx*20,y:py-ny*20,z,fl:0,state:'PATROL',doomed:false,climb:null,child:false,civ:false,dog:false};S.guards=[g];
       check(G.ledgeTarget()===g,'guard above ledge not selectable');g.fl=1;check(!G.ledgeTarget(),'catch through another floor');g.fl=0;g.x=px+nx*40;g.y=py+ny*40;check(!G.ledgeTarget(),'catch from wrong side of roof');g.x=px-nx*20;g.y=py-ny*20;
       const kills=S.stats.kills,corpses=S.corpses.length;S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();check(P.lethalHold&&!S.ledgePull,'ledge tap kills');step(.25);S.keys.KeyZ=false;G.combatRelease('KeyZ');check(!S.ledgePull&&S.stats.kills===kills,'short input causes lethal fall');
       S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<105;i++)step(.01);check(S.ledgePull&&g.state!=='DEAD'&&S.corpses.length===corpses,'kill before fall');S.keys.KeyZ=false;G.combatRelease('KeyZ');
       let last={x:g.x,y:g.y};for(let i=0;i<400&&S.ledgePull;i++){step(.005);check(Math.hypot(g.x-last.x,g.y-last.y)<12,'victim fall teleports');last={x:g.x,y:g.y};}
       check(!S.ledgePull&&g.state==='DEAD'&&S.stats.kills===kills+1&&S.corpses.length===corpses+1,'fall does not resolve once');check(P.ledge&&P.x===px&&P.y===py&&P.z===z,'player falls with victim');const c=S.corpses.at(-1);check(!c.ko&&c.accident==='fall'&&c.z===g.z&&c.fl===0,'incorrect fall result/floor');ledgeKills++;S.guards=[];
      }
     }
    }
    check(['box','well','bed','wardrobe','locker','bush'].every(t=>types[t]>0),'missing storage type '+JSON.stringify(types));check(faces.size===4&&ledgeKills>=4,'missing ledge facing');return{stores,exits,types,storedBodies,paired,drops,standingDrops,ledgeKills,faces:[...faces]};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',json.dumps(result,ensure_ascii=False),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
