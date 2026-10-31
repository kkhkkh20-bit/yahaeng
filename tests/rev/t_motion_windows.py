"""Uncropped actors, measured hanging contacts and complete window traversal."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

def check_frames():
 meta=json.loads((ROOT/'build/pr/pr_meta.json').read_text());total=0
 for name,m in [('key',meta),*meta['bodies'].items()]:
  im=Image.open(ROOT/'build/pr'/('key.webp'if name=='key'else f'body_{name}.webp')).convert('RGBA')
  for anim,(col,n)in m['anims'].items():
   for d in range(8):
    for f in range(n):
     b=im.crop(((col+f)*64,d*64,(col+f+1)*64,(d+1)*64)).getchannel('A').point(lambda x:255 if x>128 else 0).getbbox()
     assert b and min(b[:2])>0 and max(b[2:])<64,(name,anim,d,f,b)
     total+=1
 print('PASS',total,'nonempty frames with transparent margins',flush=True)

async def main():
 check_frames()
 async with async_playwright()as p:
  browser=await p.chromium.launch()
  for touch in [False,True]:
   pg=await browser.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(ok,m)=>{if(!ok)throw Error(m)};let windows=0,floors=0,contacts=0;const sides=new Set();
    const start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.guards=[];G.S.cams=[];G.S.facOn=false;G.update(.001);G.S.fade=0;return G.S;};
    const reset=(P,x,y,fl=0)=>{Object.assign(P,{x,y,fl,z:0,trav:null,jump:null,wire:null,ledge:null,hide:null,vent:false,under:false,captive:null,carrying:null,cover:null,snap:null,interact:null,pick:null,lunge:null,grabIn:null,bodyAnim:null,strikeT:0,lethalHold:null,moving:false,a:0});G.setLayer(fl);};
    const visiblePassage=P=>{
     const ctx=G.ctx,draw=ctx.drawImage;let signature;ctx.drawImage=(...a)=>{signature=a;};try{G.drawPlayer(P);}finally{ctx.drawImage=draw;}
     const calls=[];ctx.drawImage=(...a)=>{calls.push(a);return draw.apply(ctx,a);};try{G.benchDraw(1);}finally{ctx.drawImage=draw;}
     const matches=calls.map((a,i)=>signature&&a.length===signature.length&&a.every((v,n)=>v===signature[n])?i:-1).filter(i=>i>=0);
     const roofs=new Set(G.BLD.flatMap(b=>[b.kit?.c,b.kit?.img,b.roofC]).filter(Boolean));let lastRoof=-1;calls.forEach((a,i)=>{if(roofs.has(a[0]))lastRoof=i;});
     check(matches.length===1&&matches[0]>lastRoof,'window actor is hidden by a fading roof or drawn twice');
    };
    const step=dt=>{G.S.t+=dt;G.setLayer(G.S.player.fl||0);G.updatePlayer(dt);G.runTimers();};
    for(const id of ['m1','m2','m3','m4','m5','m6']){
     const S=start(id),P=S.player;
     for(const w of S.windows){w.st='open';const vert=G.winVert(w),nx=vert?1:0,ny=vert?0:1;
      if(G.solidAt(w.tx+nx,w.ty+ny)||G.solidAt(w.tx-nx,w.ty-ny))continue;
      for(const side of [-1,1]){
       const x=w.x+nx*48*side-ny*12,y=w.y+ny*48*side+nx*12;reset(P,x,y);const v=G.windowPassage(w);check(v,id+' valid window missing');
       G.doAct({k:'window',wv:v});const T=P.trav;check(T&&P.x===x&&P.y===y,id+' entry skips approach');
       step(.04);for(let i=0;i<3;i++){G.actEnv();G.actAttack();G.actGrab();}check(P.trav===T,id+' input skips window motion');
       let seenRoom=false,maxStep=0,previous={x:P.x,y:P.y};
       for(let n=0;P.trav&&n<120;n++){
        step(.01);maxStep=Math.max(maxStep,Math.hypot(P.x-previous.x,P.y-previous.y));previous={x:P.x,y:P.y};
        if(P.trav&&G.travPose(T).pose==='vault'&&!seenRoom){G.moveCamera(1);G.benchDraw(1);check(S.openB===G.bldAt(w.tx,w.ty),id+' roof covers ground window passage');if(windows<3)visiblePassage(P);check(Math.abs((P.x-w.x)*-ny+(P.y-w.y)*nx)<.01,id+' crossing misses actual window');seenRoom=true;}
       }
       check(!P.trav&&seenRoom&&maxStep<7,id+' window motion skips or never finishes');
       check(Math.hypot(P.x-(v.tx*48+24),P.y-(v.ty*48+24))<.01,id+' incorrect landing');G.setLayer(0);check(!G.solidAt(v.tx,v.ty),id+' window lands in a wall');windows++;sides.add(vert?'side':'front');
      }
      reset(P,w.x+nx*48,w.y+ny*48);w.st='lock';const v=G.windowPassage(w);if(v){G.doAct({k:'window',wv:v});check(!P.trav&&!P.jump,id+' closed window can be vaulted');}w.st='open';
     }
     for(const w of S.fwindows.filter(w=>w.fl===1&&w.out&&w.inn).slice(0,6)){
      w.st='open';
      for(const up of [true,false]){
       const from=up?w.out:w.inn,to=up?w.inn:w.out;reset(P,from.x,from.y,up?0:1);G.doAct({k:up?'winClimb':'winDrop',w});const T=P.trav;check(T,id+' upper window absent');let before=false,after=false,maxStep=0,prev={x:P.x,y:P.y};
       for(let n=0;P.trav&&n<200;n++){
        step(.01);maxStep=Math.max(maxStep,Math.hypot(P.x-prev.x,P.y-prev.y));prev={x:P.x,y:P.y};if(!P.trav)break;
        const f=T.t/T.dur;
        if(!before&&f<.08){check(P.fl===(up?0:1),id+' floor changes before crossing');before=true;}
        if(!after&&f>(up?.8:.45)){
         check(P.fl===(up?1:0),id+' floor change waits for unrelated timer');check(!S.fade,id+' window crossing hides motion behind a black fade');
         if(up){G.moveCamera(1);G.benchDraw(1);check(S.openB===G.bldAt(w.tx,w.ty),id+' interior hidden while entering upper window');if(floors<3)visiblePassage(P);}
         after=true;
        }
       }
       check(!P.trav&&before&&after&&maxStep<15,id+' upper window skips a motion phase');check(Math.hypot(P.x-to.x,P.y-to.y)<.01&&P.fl===(up?1:0),id+' wrong upper landing');floors++;
      }
     }
    }
    check(windows>30&&floors>20&&sides.size===2,'insufficient actual mission window coverage '+JSON.stringify({windows,floors,sides:[...sides]}));
    const S=start('m2'),P=S.player,ctx=G.ctx;
    for(const [outfit,disguise]of [[null,null],['crew','sam'],['staff','staff'],['waiter','waiter']]){
     P.outfit=outfit;P.disguise=disguise;const key=G.characterLook(P),bn=key.includes('@')?key.split('@')[1]:G.PR.looks[key],m=G.PR.bodies[bn]||G.PR;
     for(let d=0;d<8;d++)for(let f=0;f<4;f++){
      const calls=[],draw=ctx.drawImage;ctx.drawImage=(...a)=>calls.push(a);try{G.drawHangPR(key,400,300,d*Math.PI/4,f,1);}finally{ctx.drawImage=draw;}
      const a=calls.at(-1),hands=m.hangHands[d][f],hx=(hands[0][0]+hands[1][0])/2,hy=(hands[0][1]+hands[1][1])/2;
      check(a&&Math.hypot(a[5]+hx*a[7]/64-400,a[6]+hy*a[8]/64-300)<.01,'drawn hands miss actual hanging surface');check(a[2]===d*64,'hanging pose faces wrong wall');contacts++;
     }
    }
    return{windows,floors,contacts,sides:[...sides]};
   }''')
   assert not errors,errors;print('PASS', 'touch'if touch else'PC',result,flush=True);await pg.close()
  await browser.close()
asyncio.run(main())
