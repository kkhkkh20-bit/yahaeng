"""Art-study delivery checks: authored routes, sprite contacts and campaign-save isolation.
Native full play is recorded separately; actors/clock are fixtures in this file.
"""
import asyncio,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
KEYS=['yahaeng.ch','yahaeng.best','yahaeng.cp','yahaeng.skillTree.v1','yahaeng.case.v1','yahaeng.fieldLearning.v1','yahaeng.assassinSkill','yahaeng.feedbackSeen']
async def main():
 meta=json.loads((ROOT/'build/pr/pr_meta.json').read_text());frames=0
 for name in ['heroAgent','heroAgentMotion',*meta['fluidBodies']['heroAgent'].values()]:
  m=meta['bodies'][name];im=Image.open(ROOT/f'build/pr/body_{name}.webp').convert('RGBA');fr=meta['fr']
  for pose,(start,n) in m['anims'].items():
   for d in range(8):
    for i in range(start,start+n):
     assert im.crop((i*fr,d*fr,(i+1)*fr,(d+1)*fr)).getbbox(),(name,pose,d,i)
     frames+=1
 art=json.loads((ROOT/'src/art/city-study/details.json').read_text());assert art['sourceSha256']=='a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235'
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0')
  url=f'http://127.0.0.1:{server.server_port}/build/preview_city.html'
  await q.goto(url);await q.wait_for_function('!!window.__game')
  normal=await q.evaluate('({route:__game.LEARNING_ROUTE,stages:__game.STAGES.map(s=>s.id)})');assert 'agentCity'not in normal['stages']
  await q.evaluate('keys=>{for(const k of keys)localStorage.setItem(k,JSON.stringify({preserved:k}));}',KEYS)
  before=await q.evaluate('keys=>keys.map(k=>localStorage.getItem(k))',KEYS)
  await q.goto(url+'?study=agent-city&nostats');await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}')
  data=await q.evaluate('''async()=>{const G=__game,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)};
   check(G.STAGE.agentStudy,'wrong title entry');check(G.STAGE.id==='agentCity','wrong stage');
   await Promise.all(['heroAgent','heroAgentMotion',...Object.values(G.PR.fluidBodies.heroAgent)].map(n=>G.prLoadBody(n)));
   const key=G.characterLook(P);check(key==='agent@heroAgent','female agent not used');
   for(const pose of ['walk','run','sneak','carry','grab','hold','climb','dress','stab','choke']){const s=G.fluidSprite(key,pose,.2,0);check(s?.key.includes('heroAgent'),'missing agent action '+pose)}
   let contacts=0;for(let d=0;d<8;d++)for(let i=0;i<=16;i++){
    const at={x:320,y:250},s=G.climbContact(key,d*Math.PI/4,i/4,at);
    check(s&&Math.abs((s.hands[0].x+s.hands[1].x)/2-at.x)<.001&&Math.abs((s.hands[0].y+s.hands[1].y)/2-at.y)<.001,'lost climbing contact');contacts++;
   }
   check(G.BLD.length===8&&G.BLD.some(b=>b.h>=8),'district is flat');
   const bridge=G.PLANKS[0];check(bridge?.a&&bridge.b&&bridge.z===5,'bridge not physically joined');
   const route=G.astar(bridge.a.x,bridge.a.y,bridge.b.x,bridge.b.y,G.solidFor(5));check(route.length>6,'roof crossing blocked');
   for(const a of [bridge.a,bridge.b])check(G.bldAt(a.x,a.y)>=0,'unattached bridge end');
   // Every upper floor and target must have a real, reachable stair connection.
   let flights=0;for(let bi=0;bi<G.BLD.length;bi++)for(let fl=0;fl<G.BLD[bi].h-1;fl++){
    check(S.ladders.some(l=>l.kind==='fstair'&&G.bldAt(l.tx,l.ty)===bi&&l.bfl===fl),'missing floor stair');flights++;
   }
   for(const g of S.guards){G.setLayer(g.fl||0);check(!G.solidFor(g.z||0)(Math.floor(g.x/48),Math.floor(g.y/48)),'actor inside furniture '+g.tag)}
   const t=S.guards.find(g=>g.target);G.setLayer(t.fl);check(G.astar(14,15,Math.floor(t.x/48),Math.floor(t.y/48),G.solidFor(0)).length>0,'target room unreachable');G.setLayer(0);
   const cars=S.vehicles.map(v=>[v.x,v.y]);for(let i=0;i<120;i++)G.update(1/60);check(S.vehicles.some((v,i)=>Math.hypot(v.x-cars[i][0],v.y-cars[i][1])>50),'traffic frozen');
   G.saveCheckpoint();G.showEnd(true);return{stage:G.STAGE.id,route:G.LEARNING_ROUTE,buildings:G.BLD.length,flights,bridge:route.length,contacts,cars:S.vehicles.length,key};}''')
  after=await q.evaluate('keys=>keys.map(k=>localStorage.getItem(k))',KEYS);assert before==after,'study changed campaign progress';assert normal['route']==data['route'];assert not errors,errors
  await q.goto(url);await q.wait_for_function('!!window.__game');await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='tB'))");assert await q.evaluate('__game.characterLook(__game.S.player)')=='ninja','normal heroine changed'
  await b.close()
 server.shutdown();server.server_close()
 out=ROOT/'build/agent-city-v235';out.mkdir(exist_ok=True);(out/'checks.json').write_text(json.dumps({'frames':frames,'artFrames':len(art['frames']),'isolation':True,**data},indent=2));print('PASS agent study',frames,'nonempty frames;',json.dumps(data))
if __name__=='__main__':asyncio.run(main())
