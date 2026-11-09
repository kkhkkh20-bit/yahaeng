"""Export GIFs/contact sheets of the real 2D renderer (controlled pose review).
Native, active-AI journeys remain separate from these isolated art previews.
"""
import argparse,asyncio,base64,io,json,math,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium');q=await b.new_page(viewport={'width':920,'height':620},device_scale_factor=1);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(f'http://127.0.0.1:{server.server_port}/'+str(Path(args.html).resolve().relative_to(R))+('?study=agent-city&nostats'if args.agent_study else'?nostats'));await q.wait_for_function('!!window.__game',polling=100)
  await q.evaluate('''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===(window.__AGENT_CITY_STUDY__?'agentCity':'m2')));while(G.DLG.modal)G.advanceDialog();const names=['heroAgentCrew','heroAgentCrewMotion',...Object.values(G.PR.fluidBodies?.heroAgentCrew||{}),'heroAgent','heroAgentMotion',...Object.values(G.PR.fluidBodies?.heroAgent||{}),'hero','heroCrew','heroMotion','keyMotion',...Object.values(G.PR.fluidBodies?.hero||{}),...Object.values(G.PR.fluidBodies?.heroCrew||{}),...Object.values(G.PR.fluidBodies?.key||{})];await Promise.all(names.filter(n=>G.PR.bodies[n]).map(n=>G.prLoadBody(n)));G.S.fade=0;}''')
  report={'method':__doc__,'html':str(args.html),'round':args.round,'groups':{}}
  for group in ['locomotion','takedowns','interaction']:
   frames=[]
   for i in range(64):
    encoded=await q.evaluate('''({group,i,study})=>{const G=__game,C=G.ctx,T=i/20,heroKey=study?'agent@heroAgent':'ninja';C.setTransform(1,0,0,1,0,0);C.globalAlpha=1;C.fillStyle='#151d26';C.fillRect(0,0,C.canvas.width,C.canvas.height);C.imageSmoothingEnabled=false;
     const tile=(col,row,label,draw)=>{const x=col*220,y=row*210;C.save();C.translate(x,y);C.fillStyle='#c6d3df';C.font='13px sans-serif';C.fillText(label,16,24);C.strokeStyle='#394856';C.beginPath();C.moveTo(12,178);C.lineTo(210,178);C.stroke();C.translate(96,145);C.scale(2.7,2.7);draw();C.restore();};
     if(group==='locomotion'){
      const a=['walk','run','sneak','idleC'],period={walk:1,run:.64,sneak:1.24,idleC:3.2};for(let row=0;row<2;row++)for(let col=0;col<4;col++)tile(col,row,(row?'GUARD COAT / ':study?'AGENT / ':'HERO / ')+a[col],()=>G.drawPR(row?(study?'sam@heroAgentCrew':'sam@heroCrew'):heroKey,0,0,row?Math.PI/4:0,a[col],T));
     }else if(group==='takedowns'){
      for(let col=0;col<4;col++){const kind=col<2?'choke':'stab',a=col%2?Math.PI/2:0,dur=kind==='choke'?1.15:.95,f=Math.min(1,(T%(dur+.45))/dur),kt=G.killKT(kind,f,0),fr=G.ktFrame(kind,kt);tile(col,0,kind.toUpperCase()+' / '+(a?'SOUTH':'EAST'),()=>{G.drawPR(heroKey,0,0,a,kind,0,1,1,0,fr);G.drawPR('sam',0,0,a,kind==='choke'?'choked':'stabbed',0,1,1,0,fr);});}
     }else{
      const f=(T%3)/3;G.S.t=T;G.S.player.mode='walk';
      tile(0,0,'DRESS / REACH - ADJUST - RELEASE',()=>{const pose=G.actionHandPose({pose:'dress',t:f*3,dur:3});G.drawPR(heroKey,0,0,0,pose.anim,0,1,1,0,pose.frame);});
      tile(1,0,'LIFT / GROUNDED WEIGHT',()=>{const P=G.S.player;P.x=P.y=0;P.a=0;const c={x:24,y:0,a:0,ch:'sam',ko:true};G.drawHandling(P,{k:'lift',t0:T-f*.7,dur:.7,c,cx:24,cy:0,ca:0});});
      tile(2,0,'WALL CLIMB / CONTACTS',()=>G.drawPR(heroKey,0,0,0,'climb',T));
      tile(3,0,'SWITCH / HAND CONTACT',()=>{const pose=G.actionHandPose({pose:'hands',t:f*.65,dur:.65});G.drawPR(heroKey,0,0,0,pose.anim,0,1,1,0,pose.frame);});
     }
     return C.canvas.toDataURL('image/png').split(',')[1];}''',{'group':group,'i':i,'study':args.agent_study})
    im=Image.open(io.BytesIO(base64.b64decode(encoded))).convert('RGB').crop((0,0,880,420 if group=='locomotion'else 210));frames.append(im)
   pal=frames[0].quantize(colors=128);gif=[im.quantize(palette=pal,dither=Image.Dither.NONE)for im in frames]
   gif[0].save(out/(group+'.gif'),save_all=True,append_images=gif[1:],duration=50,loop=0,optimize=True,disposal=2)
   selected=[0,4,8,12,16,20,26,32,40,48,56,63];sheet=Image.new('RGB',(880,frames[0].height*len(selected)),(15,21,27))
   for row,n in enumerate(selected):sheet.paste(frames[n],(0,row*frames[0].height));ImageDraw.Draw(sheet).text((845,row*frames[0].height+4),str(n),fill='white')
   sheet.save(out/(group+'-contact.png'));report['groups'][group]={'frames':64,'seconds':3.2,'unique':len({im.tobytes()for im in frames})};print(group,report['groups'][group],flush=True)
  assert not errors,errors;report['errors']=errors;(out/'review.json').write_text(json.dumps(report,indent=2));await b.close();server.shutdown();server.server_close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--html',default=str(R/'build/preview_city.html'));p.add_argument('--out',default=str(R/'build/hero-motion-v191/round-1'));p.add_argument('--round',type=int,default=1);p.add_argument('--agent-study',action='store_true');asyncio.run(main(p.parse_args()))
