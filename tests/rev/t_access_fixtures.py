"""Measured cover contacts, connected passages, safe exits and delayed sign impacts."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let vents=0,sewers=0,signs=0,contacts=0,maxStep=0;const kinds=new Set();
    const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;window.base=S.guards.find(g=>!g.civ&&!g.child&&!g.dog&&!g.target);S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;G.setLayer(0);return S;};
    const reset=(P,x,y,z=0)=>{Object.assign(P,{x,y,z,fl:0,trav:null,hide:null,under:false,vent:false,wire:null,ledge:null,jump:null,cover:null,snap:null,captive:null,carrying:null,pick:null,interact:null,bodyAnim:null,strikeT:0,lethalHold:null,grabIn:null,lunge:null,moving:false,a:-Math.PI/2});G.S.keys={};G.setLayer(0);};
    const step=dt=>{G.S.t+=dt;G.updatePlayer(dt);G.updateFallingSigns(dt);G.runTimers();};
    const finish=()=>{const P=G.S.player;let n=0,previous=null;while(P.trav&&n++<1200){const F=P.trav.accessFlow,s=F?G.accessActorSample(F):null;if(s&&previous){const d=Math.hypot(s.x-previous.x,s.y-previous.y);maxStep=Math.max(maxStep,d);check(d<8,'access root jumps '+F.kind+' '+d);}previous=s;step(.005);}check(n<1200,'access never finishes');};
    for(const id of ['m1','m2','m3','m4','m5','m6']){
     const S=fresh(id),P=S.player;
     for(const v of S.vents){reset(P,v.x,v.y,v.z||0);const before=S.stats.vents||0;kinds.add(G.ventKind(v));
      check(G.beginAccessFlow('ventIn',v),id+' missing entry');const T=P.trav,F=T.accessFlow;check(!P.vent&&!v.open,'vent enters or opens before reaching cover');
      step(.05);G.actEnv();G.actAttack();G.actGrab();check(P.trav===T,'repeat input replaces access');check(!P.vent,'early vent mode flip');
      finish();check(P.vent&&!P.trav&&P.x===v.x&&P.y===v.y&&!v.open&&(S.stats.vents||0)===before+1,id+' invalid vent arrival');
      check(G.beginAccessFlow('ventOut',v)&&P.vent,'exit skips emergence');finish();check(!P.vent&&!P.trav&&P.z===(v.z||0)&&!v.open,'exit loses level or cover');check(!G.solidFor(P.z)(Math.floor(P.x/48),Math.floor(P.y/48)),'vent exit blocked');vents++;
      reset(P,v.x+200,v.y,0);P.vent=true;check(!G.beginAccessFlow('ventOut',v)&&P.vent&&!P.trav,'remote vent exit');
      reset(P,v.x,v.y,0);P.fl=1;check(!G.beginAccessFlow('ventIn',v),'entry through another floor');
     }
     for(const h of S.hides.filter(h=>h.type==='well'&&G.ugAt(h.tx,h.ty))){reset(P,h.x,h.y);P.hide=h;check(G.beginAccessFlow('sewerDown',h),'missing sewer ladder');check(P.hide===h&&!P.under,'sewer down skips departure');finish();check(P.under&&!P.hide&&!P.trav,'sewer down incomplete');
      check(G.beginAccessFlow('surface',h)&&P.under,'surface skips climb');finish();check(!P.under&&!P.hide&&!P.trav&&!G.solidFor(0)(Math.floor(P.x/48),Math.floor(P.y/48)),'surface stops inside cover or wall');sewers++;
     }
     for(const t of S.traps.filter(t=>t.k==='drop')){const g=G.signGeometry(t);reset(P,g.x,g.y-12,g.z);check(G.canReleaseSign(t),id+' unreachable real fixing '+JSON.stringify(t.at));
      P.z=0;check(!G.canReleaseSign(t),'fixing reachable from ground');P.z=g.z;P.fl=1;check(!G.canReleaseSign(t),'fixing reachable from floor below');P.fl=0;
      const target={...base,x:(t.hit[0]+t.hit[2]+1)*24,y:(t.hit[1]+t.hit[3]+1)*24,fl:0,z:0,state:'PATROL',target:false,child:false,civ:false,doomed:false,seen:false};
      const away={...target,x:target.x+1000},upper={...target,z:1},child={...target,child:true};S.guards=[target,away,upper,child];const kills=S.stats.kills;
      check(G.beginSignRelease(t)&&!t.used&&!t.fall,'sign falls before hand release');const T=P.trav;step(.1);G.actEnv();G.actAttack();check(P.trav===T,'repeat input replaces release');
      while(!t.fall)step(.005);check(t.used&&!t.wreck&&target.state!=='DEAD'&&S.stats.kills===kills,'sign kills before impact');check(!G.beginSignRelease(t),'sign can release twice');
      const before=G.signPosition(t);step(.05);const after=G.signPosition(t);check(after.y>before.y,'sign does not visibly fall');
      // Damage samples current occupants, not those present when the latch was touched.
      target.x+=1000;away.x=(t.hit[0]+t.hit[2]+1)*24;while(t.fall)step(.005);finish();
      check(t.wreck&&away.state==='DEAD'&&target.state!=='DEAD'&&upper.state!=='DEAD'&&child.state!=='DEAD'&&S.stats.kills===kills+1,'impact ignores current floor or occupant');
      const pos=G.signPosition(t);check(pos.x===t.wreck.x&&pos.y===t.wreck.y,'wreck teleports');G.updateFallingSigns(2);check(S.stats.kills===kills+1,'impact repeats');signs++;S.guards=[];
     }
    }
    const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type==='well'&&G.ugAt(h.tx,h.ty));reset(P,h.x,h.y);P.under=true;const cells=[];
    for(let y=h.ty-1;y<=h.ty+1;y++)for(let x=h.tx-1;x<=h.tx+1;x++)if(x!==h.tx||y!==h.ty){cells.push([x,y,G.G0[y][x]]);G.G0[y][x]='#';}
    try{check(!G.beginAccessFlow('surface',h)&&P.under&&!P.trav,'blocked surface erases tunnel state');}finally{for(const[x,y,c]of cells)G.G0[y][x]=c;}
    // Every player outfit uses its own measured hands, including diagonals and closing turns.
    for(const outfit of [null,'crew','staff','waiter'])for(let d=0;d<8;d++)for(const high of [false,true])for(const closing of [false,true]){
     P.outfit=P.disguise=outfit;const h={type:'well',x:0,y:0},stand={x:Math.cos(d*Math.PI/4)*30,y:Math.sin(d*Math.PI/4)*30},s=G.accessHandSample(h,stand,.5,closing,high),key=G.characterLook(P),body=key.split('@')[1]||G.PR.looks[key],m=G.PR.bodies[body]||G.PR,row=((Math.round(s.a/(Math.PI/4))%8)+8)%8,hh=m[s.anim+'Hands'][row][s.frame],sc=m.scales[s.anim],gy=m.grounds[s.anim],x=s.x+((hh[0][0]+hh[1][0])/2-32)*sc,y=s.y+13+((hh[0][1]+hh[1][1])/2-gy)*sc;
     check(Math.hypot(x-s.contact.x,y-s.contact.y)<.01,'hand misses physical cover');contacts++;
    }
    check(vents>=15&&sewers>=15&&signs>=20&&kinds.size===2,'incomplete map fixture coverage');return{vents,sewers,signs,contacts,maxStep:+maxStep.toFixed(2),kinds:[...kinds]};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
