"""Controlled render/recovery cases, separate from the full input walkthrough."""
import asyncio,json,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/preview_city.html?nostats&tone=ink');await pg.wait_for_function('!!window.__game');await pg.click('#btnQuick')
   result=await pg.evaluate('''()=>{
    const G=__game,S=G.S,P=S.player,g=S.guards[0],c=G.ctx,check=(v,m)=>{if(!v)throw Error(m)};
    Object.assign(P,{x:6.5*48,y:10.5*48,hidden:false});S.noises=[];G.update(.01);G.benchDraw(1);
    const old={},names=['beginPath','moveTo','lineTo','fill','stroke','ellipse'];for(const n of names)old[n]=c[n];let pts=[],records=[],ellipses=0;
    const cone=()=>pts.length>10&&pts[0][0]===g.x&&pts[0][1]===g.y;
    c.beginPath=function(...a){pts=[];return old.beginPath.apply(this,a)};c.moveTo=function(x,y){pts.push([x,y]);return old.moveTo.call(this,x,y)};c.lineTo=function(x,y){pts.push([x,y]);return old.lineTo.call(this,x,y)};
    c.fill=function(...a){if(cone())records.push({kind:'fill',points:pts.slice(),style:this.fillStyle});return old.fill.apply(this,a)};
    c.stroke=function(...a){if(cone())records.push({kind:'stroke',points:pts.slice(),style:this.strokeStyle});return old.stroke.apply(this,a)};
    c.ellipse=function(x,y,rx,ry,...a){if(Math.abs(x-P.x)<1&&Math.abs(y-P.y-6)<1&&rx>30)ellipses++;return old.ellipse.call(this,x,y,rx,ry,...a)};
    const samples=[];
    try{for(const blend of [0,.25,.5,.75,1]){S.coneK=blend;records=[];G.benchDraw(1);const fills=records.filter(r=>r.kind==='fill'),strokes=records.filter(r=>r.kind==='stroke');check(fills.length===1&&strokes.length===1,'duplicated vision at '+blend+' '+JSON.stringify(records.map(r=>[r.kind,r.style,r.points.length])));samples.push({blend,fills:fills.length,outlines:strokes.length,maxRange:Math.max(...fills[0].points.map(([x,y])=>Math.hypot(x-g.x,y-g.y)))});}}finally{for(const n of names)c[n]=old[n];}
    check(!ellipses,'persistent extra player sound oval');for(let i=1;i<samples.length;i++)check(samples[i].maxRange<=samples[i-1].maxRange+.01,'crouch boundary grows');
    // A real facing/lighting detection must fail the practice and restore a safe checkpoint.
    G.start(G.STAGES.findIndex(s=>s.id==='tB'));G.update(.02);G.saveCheckpoint();const before=[G.S.player.x,G.S.player.y];Object.assign(G.S.player,{x:10.5*48,y:8.2*48,mode:'walk',hidden:false});
    for(let i=0;i<180&&!G.S.over;i++)G.update(1/60);check(G.S.over,'practice ignores actual visual detection');
    return{samples,persistentSoundOvals:ellipses,recoveryBefore:before,failed:true};
   }''')
   await pg.wait_for_timeout(1600)
   recovered=await pg.evaluate('({at:[__game.S.player.x,__game.S.player.y],over:__game.S.over,used:__game.CP.used,step:__game.S.tutI||0,guard:__game.S.guards[0].state})');assert not recovered['over'] and recovered['used']==1 and recovered['at']==result['recoveryBefore'],recovered
   result['mobile']=mobile;result['recovered']=recovered;assert not errors,errors;results.append(result);print('PASS controlled',result,flush=True);await pg.close()
  await b.close()
 (O/'perception-controlled.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
