"""Approved appearance: all poses, shared identity, bounded sprites and renderer previews.
Clock/placement are explicit fixtures; native mission evidence is recorded separately.
"""
import asyncio,base64,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/agent-concept-v241'
def sheets():
 m=json.loads((R/'build/pr/pr_meta.json').read_text());assert m['looks']['ninja']=='heroAgent';count=0
 for name,b in m['bodies'].items():
  if not name.startswith('heroAgent'):continue
  im=Image.open(R/'build/pr'/f'body_{name}.webp').convert('RGBA');assert im.size==(b['cols']*64,512)
  for pose,(col,n)in b['anims'].items():
   for d in range(8):
    for i in range(n):
     box=im.crop(((col+i)*64,d*64,(col+i+1)*64,(d+1)*64)).getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
     assert box and min(box[:2])>0 and max(box[2:])<64,(name,pose,d,i,box);count+=1
 assert count==16632,count
 return count
async def main():
 O.mkdir(exist_ok=True);count=sheets();server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);q=await b.new_page(viewport={'width':1280,'height':720});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0');await q.goto(f'http://127.0.0.1:{server.server_port}/build/preview_city.html');await q.wait_for_function('!!window.__game')
  await q.evaluate('''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;await Promise.all(Object.keys(G.PR.bodies).filter(n=>n.startsWith('heroAgent')).map(n=>G.prLoadBody(n)));}''')
  checks=await q.evaluate('''()=>{const G=__game,P=G.S.player,ok=(v,m)=>{if(!v)throw Error(m)};
   ok(G.PR.looks.ninja==='heroAgent','campaign still uses previous heroine');const looks=[];let identity;
   for(const[outfit,disguise]of[[null,null],['crew','sam'],['staff','staff'],['courier','courier'],['waiter','waiter'],['cater','cater']]){
    P.outfit=outfit;P.disguise=disguise;const key=G.characterLook(P),body=key.includes('@')?key.split('@')[1]:G.PR.looks[key],pal=G.characterPalette(P);ok(body.startsWith('heroAgent'),'outfit swaps heroine identity');
    const sh=JSON.stringify(pal.slice(0,2));if(identity)ok(sh===identity,'disguise changes face/hair');identity=sh;
    for(const pose of ['walk','run','sneak','carry','grab','climb','dress','stab','choke'])ok(G.fluidSprite(key,pose,.3,0)?.key.includes('heroAgent'),'old action body '+pose);
    ok(G.PR.bodies[body+'Lid']?.anims.openBin,'old/missing container-opening pose');looks.push({outfit,key,body,skinHair:pal.slice(0,2)});
   }
   P.outfit=P.disguise=null;ok(G.characterPalette(P)[2]==='#2e425f','default jacket is not navy');
   const npc=G.characterLook({outfit:'staff',civ:true,body:'fBob',look:0,id:1});ok(!npc.includes('heroAgent'),'NPC identity was replaced');
   return{looks,npc,navy:true,identity:true,allActions:true,containerOpening:true};}''')
  data=await q.evaluate('''()=>{const G=__game,c=G.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#202630';c.fillRect(0,0,1280,720);c.textAlign='center';c.font='15px "IBM Plex Sans KR"';c.fillStyle='#e4e3dc';c.fillText('여성 요원 · 실제 게임 렌더러 / 8방향',640,30);
   const dirs=['E','SE','S','SW','W','NW','N','NE'];for(let d=0;d<8;d++){const x=90+d*155;G.drawPR('ninja',x,150,d*Math.PI/4,'idle',0,1,2);c.fillStyle='#c9c8c1';c.fillText(dirs[d],x,185);}
   const pixels=c.getImageData(0,55,1280,110).data;let green=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]>45&&pixels[i+1]>pixels[i]*1.5&&pixels[i+1]>pixels[i+2]*1.5)green++;if(green)throw Error('unpainted head palette pixels: '+green);
   const poses=['walk','run','sneak','stab','choke','carry','climb','dress'],labels=['걷기','달리기','웅크림','암살','기절','운반','등반','변장'];
   for(let i=0;i<8;i++){const pose=poses[i],loop=['walk','run','sneak','carry','climb'].includes(pose),n=G.PR.bodies.heroAgent.anims[pose]?.[1]||1;G.drawPR('ninja',90+i*155,350,0,pose,.35,1,2,0,loop?-1:Math.floor((n-1)*.55));c.fillStyle='#c9c8c1';c.fillText(labels[i],90+i*155,390);}
   const keys=['ninja','sam@heroAgentCrew','staff@heroAgentWorker','courier@heroAgentWorker','waiter@heroAgent','cater@heroAgentWorker','ninja','ninja@heroAgentLid'],names=['기본','경비 복장','직원 복장','운반책 복장','정장 복장','작업복','쓰러짐','뚜껑 열기'];
   for(let i=0;i<8;i++){const anim=i===6?'death':i===7?'openBin':'idle',n=G.PR.bodies[i===7?'heroAgentLid':'heroAgent'].anims[anim][1];G.drawPR(keys[i],90+i*155,560,i===6?Math.PI/4:Math.PI/2,anim,0,1,2,0,i>=6?Math.floor((n-1)*.8):0);c.fillStyle='#c9c8c1';c.fillText(names[i],90+i*155,610);}
   c.restore();return c.canvas.toDataURL();}''')
  (O/'appearance-gallery.png').write_bytes(base64.b64decode(data.split(',')[1]));assert not errors,errors;await q.close();await b.close()
 server.shutdown();server.server_close();row={'uncroppedFrames':count,**checks,'errors':errors};(O/'appearance-checks.json').write_text(json.dumps(row,ensure_ascii=False,indent=2));print('PASS approved agent',json.dumps(row,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
