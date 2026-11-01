"""Controlled storage fixtures: retrieve living/dead bodies without losing missions or uniforms.
Scene placement isolates storage mechanics; full live mission runs are reported separately.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},found=new Set(),cases=[];
    const step=()=>{const S=G.S;S.t+=1/120;G.setLayer(S.player.fl||0);G.updatePlayer(1/120);G.runTimers()};
    const finish=()=>{for(let n=0;n<1800&&G.actionBusy();n++)step();check(!G.actionBusy(),'storage action never ends')};
    for(const sid of ['m2','m1','m3','m4','m5','m6']){
     G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();
     const defs=G.S.hides.filter(h=>!h.fl&&!h.z).map(h=>({type:h.type,tx:h.tx,ty:h.ty}));
     for(const def of defs){if(found.has(def.type))continue;
      for(const ko of [true,false]){
       G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();let S=G.S,P=S.player,h=S.hides.find(h=>h.type===def.type&&h.tx===def.tx&&h.ty===def.ty&&!h.fl);const template=S.guards.find(g=>!g.dog&&!g.civ);S.guards=[];S.cams=[];S.facOn=false;G.setLayer(0);const at=G.hidePerimeter(h).find(q=>!G.solidAt(q.tx,q.ty));check(at,'no exterior storage approach '+h.type);
       Object.assign(P,{x:(at.tx+.5)*48,y:(at.ty+.5)*48,fl:0,z:0,trav:null,jump:null,hide:null,captive:null,carrying:null,bodyAnim:null,strikeT:0,interact:null,pick:null,cover:null});
       const g={...template,id:0,x:P.x,y:P.y,fl:0,z:0,target:ko,state:'DEAD',unconscious:ko,hasKey:null};S.guards=[g];let c={x:P.x,y:P.y,fl:0,z:0,ch:'sam',ko,target:ko,g:ko?g:null,carried:true,stashed:false,hidden:false,outfit:'crew',kind:'g1',a:0};S.corpses=[c];P.carrying=c;S.stats.ko=ko?1:0;const stats=[S.stats.kills,S.stats.ko];
       check(G.beginHideFlow('stash',h,c),'stash refused');finish();check(c.stashed&&!P.carrying&&h.bodies===1&&c.playerHandled,'stash not committed');h.cap=1;
       if(ko){S.t+=30;G.updateTargetIntel();const goal=G.targetKnowledge(g);check(goal.stored&&goal.x===h.x&&goal.y===h.y,'known hidden target points at former patrol');}
       G.saveCheckpoint();delete G.CP.S.corpses[0].playerHandled;check(G.loadCheckpoint(),'stored-body checkpoint');S=G.S;P=S.player;h=S.hides.find(h=>h.type===def.type&&h.tx===def.tx&&h.ty===def.ty&&!h.fl);c=S.corpses[0];if(ko)check(G.targetKnowledge(c.g).stored,'legacy hidden target lost');
       const a=G.envChoices().find(a=>a.k==='retrieve'&&a.c===c);check(a&&a.h===h,'full container hides retrieval '+h.type);check(!G.envChoices().some(a=>a.k==='keymsg'&&a.h===h),'full message competes with available retrieval');check(G.selectEnvTarget(G.envToken(a)),'cannot select retrieval');G.actEnv();check(P.trav?.hideFlow?.kind==='retrieve','retrieval skips animation');
       let roots=0,last=null,commits=0,committed=false;
       for(let n=0;n<1800&&P.trav;n++){
        const T=P.trav,s=G.hideHeroSample(P,T);if(last)check(Math.hypot(s.x-last.x,s.y-last.y)<8,'retrieval hero jumps '+h.type);last=s;roots++;if(T.hideFlow.committed&&!committed){commits++;committed=true;}G.benchDraw(1);step();
       }
       finish();check(roots>15&&!P.trav&&!P.carrying&&!c.carried&&!c.stashed&&!c.container&&h.bodies===0,'retrieval loses actor or capacity '+h.type);check(c.ko===ko&&S.stats.kills===stats[0]&&S.stats.ko===stats[1],'retrieval changes life or kills');check(!G.beginHideFlow('retrieve',h,c),'retrieving same body twice');check(commits===1,'retrieval commits twice');
       // Retrieval places the person outside; a further drop action must not be required.
       check(G.objectReachable(c,46),'recovered person is out of reach');
       if(ko){const victim=c.g;check(G.attackAction().k==='finish','recovered target not finishable');S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<30;i++)step();S.keys.KeyZ=false;G.combatRelease('KeyZ');check(c.ko&&!G.targetEliminated(victim),'tap kills recovered target');S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<150;i++)step();S.keys.KeyZ=false;G.combatRelease('KeyZ');check(G.targetEliminated(victim)&&S.stats.kills===stats[0]+1,'recovered target still blocks mission');}
       else{const dress=G.envChoices().find(a=>a.k==='dress'&&a.c===c);check(dress,'stored uniform is lost');G.selectEnvTarget(G.envToken(dress));G.actEnv();finish();check(P.outfit==='crew','cannot wear recovered uniform');}
       cases.push({type:h.type,ko,roots,recoveredObjective:true});
      }found.add(def.type);
     }
    }
    check(['box','well','bed','wardrobe','locker'].every(t=>found.has(t)),'missing storage variants '+[...found]);return cases;
   }''')
   assert not errors,errors;print('PASS retrieval','touch'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
