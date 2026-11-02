"""Real-map controlled evidence tests; these are not full mission playthroughs."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ai-v140';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto((R/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!window.__game')
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},results=[];
    G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};
    const strip={x:1800,y:504},guard=(id,dx=0)=>({...base,id,x:strip.x+dx,y:strip.y,fl:0,z:0,a:Math.PI,want:Math.PI,state:'PATROL',seen:false,meter:0,route:[{x:strip.x+dx,y:strip.y,pause:999}],ri:0,wait:999,post:Math.PI,glance:0,glanceT:999,radio:false,torch:false,path:null,poi:null,chat:null,act:null,follow:null,homeFl:0,securityBuddy:null,suspectMemory:null,suspectLook:null});
    const reset=()=>{S.t=10;S.guards=[];S.facOn=false;S.corpses=[];S.decals=[];S.lamps=[];S.cams=[];S.alevel=0;S.chaseSeen=false;S.knownLooks={};S.radioCall=null;S.searchIncidents=[];Object.assign(P,{x:strip.x+48,y:strip.y,fl:0,z:0,a:0,mode:'walk',outfit:'crew',disguise:'crew',disguiseBlown:false,blown:{},under:true,hide:null,vent:null,hidden:false,light:1,carrying:null,captive:null,trav:null,strikeT:0});};
    reset();const witness=guard(800),near=guard(801,120),far=guard(802,400),up=guard(803,100),roof=guard(804,100),unrelated=guard(805,500);up.fl=1;roof.z=1;unrelated.radio=true;unrelated.state='ALERT';S.guards=[witness,near,far,up,roof,unrelated];witness.seen=true;G.goAlert(witness);
    check(witness.suspectMemory.crew&&!S.knownLooks.crew,'witness leaks global description');check(near.state==='SEARCH'&&near.meter<1&&near.poi.x===P.x,'listener attacks instead of investigating reported position');check([far,up,roof].every(g=>g.state==='PATROL'),'shout crosses distance, floor or height');check(!S.radioCall,'unrelated ALERT radio selected remotely');results.push('local report, height/floor/distance isolation and no remote relay');
    G.saveCheckpoint();witness.suspectMemory={};G.loadCheckpoint();check(G.S.guards.find(g=>g.id===800).suspectMemory.crew,'checkpoint loses witness memory');
    // Restart after checkpoint, since load replaces S.
    G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
    return results;
   }''')
   # More independent fixtures avoid references to the replaced checkpoint state.
   more=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},results=[],S=G.S,P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};
    const guard=(id,dx=0)=>({...base,id,x:1800+dx,y:504,fl:0,z:0,a:Math.PI,want:Math.PI,state:'PATROL',seen:false,meter:0,route:[{x:1800+dx,y:504,pause:999}],ri:0,wait:999,post:Math.PI,glance:0,glanceT:999,radio:false,torch:false,path:null,poi:null,chat:null,act:null,follow:null,homeFl:0,securityBuddy:null,suspectMemory:null,suspectLook:null});
    const reset=()=>{S.t=10;S.guards=[];S.facOn=false;S.corpses=[];S.decals=[];S.lamps=[];S.cams=[];S.alevel=0;S.chaseSeen=false;S.knownLooks={};S.radioCall=null;S.searchIncidents=[];Object.assign(P,{x:1848,y:504,fl:0,z:0,a:0,mode:'walk',outfit:'crew',disguise:'crew',disguiseBlown:false,blown:{},under:true,hide:null,vent:null,hidden:false,light:1,carrying:null,captive:null,trav:null,strikeT:0});G.setLayer(0);};
    reset();let a=guard(810),r=guard(811,120);r.radio=true;S.guards=[a,r];a.seen=true;G.goAlert(a);check(S.radioCall?.g===r&&r.state==='SEARCH','real listener does not relay');r.state='DEAD';G.updateRadioCall(.1);check(!S.radioCall&&!S.knownLooks.crew&&S.stats.radioCut>0,'cut relay leaks description');results.push('interruptible heard relay');
    reset();a=guard(812);r=guard(813,120);r.radio=true;S.guards=[a,r];a.seen=true;G.goAlert(a);const at={...S.radioCall.at};P.x+=300;P.outfit='staff';G.updateRadioCall(4);check(S.knownLooks.crew&&!S.knownLooks.staff&&at.x!==P.x&&!G.knownFace(r),'radio invents unseen appearance or tracks hidden player');results.push('completed report retains old appearance and coordinates');
    reset();a=guard(820);r=guard(821);let wall=false;for(let y=1;y<G.MH-1&&!wall;y++)for(let x=2;x<G.MW-2;x++)if(G.tileCh(x,y)==='#'&&!G.solidAt(x-1,y)&&!G.solidAt(x+1,y)){a.x=(x-.5)*48;a.y=(y+.5)*48;r.x=(x+1.5)*48;r.y=a.y;if(!G.guardHearsReport(a,r)){wall=true;break}}check(wall,'need real wall hearing fixture');S.guards=[a,r];a.seen=true;G.goAlert(a);check(r.state==='PATROL','wall lets spoken alert through');results.push('physical wall blocks report');
    reset();a=guard(830);r=guard(831,20);const victim=guard(832,36);victim.state='DEAD';const c={guardId:victim.id,g:victim,x:victim.x,y:victim.y,fl:0,z:0,ko:true,light:1,hidden:false,discovered:false};S.corpses=[c];S.guards=[a,r,victim];a.state='BODY';a.body=c;G.updateGuard(a,.01);check(a.bodyWork&&!c.discovered&&G.guardAnim(a)==='crouch','assessment missing or instant');
    r.a=r.want=0;r.state='RETURN';r.radio=true;G.updateGuard(r,.01);check(r.bodyCoverId===c.sceneId&&r.state==='PATROL','second witness crowds examiner');const count=S.stats.bodies;for(let i=0;i<30;i++){S.t+=.05;G.updateGuard(a,.05)}check(!S.corpses.includes(c)&&victim.state==='SEARCH'&&S.stats.bodies===count+1,'physical assessment did not revive once');check(S.radioCall?.g===r,'actual lookout with radio fails to report casualty');G.updateGuard(r,.05);check(!r.bodyCoverId&&S.stats.bodies===count+1,'backup duplicates discovery');check(!Object.keys(S.knownLooks).length&&!victim.suspectMemory,'rear victim invents assailant');results.push('timed assessment, one examiner and one lookout, one revival');
    reset();a=guard(840);r=guard(841,20);const abandoned={guardId:999,x:1840,y:504,fl:0,z:0,ko:false,light:1,hidden:false,discovered:false};S.corpses=[abandoned];S.guards=[a,r];a.state='BODY';a.body=abandoned;G.updateGuard(a,.01);a.state='DEAD';G.updateGuard(r,.01);check(r.state==='BODY'&&abandoned.checkBy===r.id,'dead examiner retains claim');abandoned.carried=true;G.updateGuard(r,.1);check(r.state==='RETURN'&&!abandoned.discovered&&!r.bodyWork,'carried body assessed remotely');results.push('examiner death and removed body cancel work');
    for(const front of [false,true]){reset();a=guard(front?851:850);a.a=a.want=0;S.guards=[a];P.under=false;P.x=a.x+(front?32:-32);a.takedownIntent={lethal:false};G.killGuard(a,null,null,true);const body=S.corpses.at(-1);check(body.ko&&body.assailantLook===(front?'crew':null),'KO witness identity ignores facing');P.outfit='staff';G.wakeKO(body,null);check(!!a.suspectMemory?.crew===front&&!a.suspectMemory?.staff&&!Object.keys(S.knownLooks).length,'revived victim invents current uniform or broadcasts instantly');}results.push('frontal victim remembers observed uniform, rear victim cannot identify');
    reset();a=guard(860);a.radio=true;S.guards=[a];a.state='SEARCH';a.poi={x:1840,y:504,fl:0,z:0};G.queueGuardRadio([a],a.poi,null,true);G.updateRadioCall(4);check(S.alevel===2&&!Object.keys(S.knownLooks).length,'body-only radio invents killer face');results.push('body report broadens search without identifying killer');
    return results;
   }''')
   assert not errors,errors
   result+=more;(O/f'evidence-{"touch"if touch else"pc"}.json').write_text(json.dumps({'controlled':True,'passed':result},ensure_ascii=False,indent=2));print('PASS',touch,', '.join(result),flush=True);await pg.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
