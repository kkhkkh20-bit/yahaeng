"""Pipe climb contacts use the drawn shaft, face the wall, and retain safe landings."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

def check_baked_hands():
 m=json.loads((ROOT/'build/pr/pr_meta.json').read_text());n=0
 for body in ['key','hero','heroSuit','heroWorker','heroCrew']:
  meta=m if body=='key' else m['bodies'][body];fr=m['fr'];c,nf=meta['anims']['climb']
  im=Image.open(ROOT/'build/pr'/('key.webp' if body=='key' else f'body_{body}.webp')).convert('RGBA')
  assert len(meta['climbHands'])==8
  for d,frames in enumerate(meta['climbHands']):
   assert len(frames)==nf
   for i,hands in enumerate(frames):
    for x,y in hands:
     # Hand joints may be occluded in side views; none may project into empty space.
     tile=im.crop(((c+i)*fr,d*fr,(c+i+1)*fr,(d+1)*fr));pixels=[tile.getpixel((xx,yy)) for xx in range(max(0,int(x)-2),min(fr,int(x)+3)) for yy in range(max(0,int(y)-2),min(fr,int(y)+3))]
     assert any(a>100 for r,g,b,a in pixels),(body,d,i,x,y)
     n+=1
 print('PASS',n,'baked hand anchors remain inside the rendered figure',flush=True)

async def main():
 check_baked_hands()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let pipes=0,contacts=0,rendered=0;const faces=new Set();
    for(const sid of ['m1','m2','m3','m4','m5','m6']){
     G.start(G.STAGES.findIndex(s=>s.id===sid));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
     const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;
     for(const l of S.ladders.filter(l=>l.kind==='pipe')){
      Object.assign(P,{x:l.x,y:l.y,fl:l.bfl||0,z:l.bz||0,trav:null,hide:null,captive:null,carrying:null});G.setLayer(P.fl);
      const geometry=G.pipeGeometry(l);check(geometry.top.y<geometry.bottom.y&&geometry.base.y>=geometry.bottom.y,'inverted pipe');faces.add(geometry.face.toFixed(3));
      const oldRoof={x:l.rx??l.ux,y:l.ry??l.uy};check(geometry.landing.x===oldRoof.x&&geometry.landing.y===oldRoof.y,'roof landing moved');
      for(const up of [true,false]){
       G.actPrimary({k:up?'up':'down',l,viaZ:true});check(P.trav?.pipe===l,'actual pipe traversal absent');let steps=0,last=null;
       while(P.trav&&steps++<400){
        const T=P.trav;S.t+=1/60;G.updatePlayer(1/60);G.runTimers();
        if(P.trav&&G.travPose(T).pose==='climb'){
         const at=G.pipeGripAt(T),frame=((Math.floor(T.t*7)*(T.down?-1:1))%4+4)%4;
         check(at.x===geometry.top.x&&at.y>=geometry.top.y-.01&&at.y<=geometry.bottom.y+.01,'hands leave drawn shaft');
         if(last)check(up?at.y<=last.y+.01:at.y>=last.y-.01,'climb reverses direction');last=at;
         for(const [outfit,disguise]of [[null,null],['crew','sam'],['staff','staff'],['waiter','waiter']]){
          const oldOutfit=P.outfit,oldDisguise=P.disguise;P.outfit=outfit;P.disguise=disguise;
          const contact=G.climbContact(G.characterLook(P),geometry.face,frame,at);
          check(contact&&contact.hands.every(h=>Math.abs(h.x-at.x)<3),'hand misses pipe surface');contacts++;
          if(steps%12===0){
           const key=G.characterLook(P),bn=key.includes('@')?key.split('@')[1]:G.PR.looks[key],m=G.PR.bodies[bn]||G.PR,row=((Math.round(geometry.face/(Math.PI/4))%8)+8)%8,h=m.climbHands[row][frame];
           const ctx=G.ctx,oldDraw=ctx.drawImage,calls=[];ctx.drawImage=(...args)=>calls.push(args);
           try{G.drawPlayer(P)}finally{ctx.drawImage=oldDraw}
           const call=calls.at(-1);check(call&&call.length===9,'player climb sprite not drawn');
           const hx=(h[0][0]+h[1][0])/2,hy=(h[0][1]+h[1][1])/2;
           check(Math.hypot(call[5]+hx*call[7]/64-at.x,call[6]+hy*call[8]/64-at.y)<.01,'actual drawn hands miss shaft');rendered++;
          }
          P.outfit=oldOutfit;P.disguise=oldDisguise;
         }
        }
       }
       check(!P.trav,'traversal never ends');check((P.z||0)===(up?l.tz:l.bz||0)&&(P.fl||0)===(up?0:l.bfl||0),'wrong floor');
       const end=up?oldRoof:{x:l.x,y:l.y};check(Math.hypot(P.x-end.x,P.y-end.y)<.01,'wrong landing position');
       if(up)check(G.rLv(Math.floor(P.x/48),Math.floor(P.y/48))===l.tz,'not a walkable roof');
      }pipes++;
     }
    }return{pipes,contacts,rendered,faces:[...faces]};
   }''')
   assert not errors,errors;print('PASS','touch' if touch else 'desktop',result,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
