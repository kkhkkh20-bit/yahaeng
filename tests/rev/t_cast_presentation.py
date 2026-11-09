"""Visible identity in every portrait surface, directional dog art and gentle cutaways."""
import asyncio, hashlib, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
O = R / 'build/cast-v244'

async def main():
 O.mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser = await p.chromium.launch()
  for mobile in [False, True]:
   page = await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800}, has_touch=mobile, is_mobile=mobile)
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script('localStorage.clear();requestAnimationFrame=()=>0')
   await page.goto((R/'build/preview_city.html').as_uri())
   release_url=page.url.replace('/build/preview_city.html','/public/index.html')+'?nostats'
   await page.wait_for_function('!!window.__game&&__game.castArtReady')
   await page.evaluate('document.fonts.ready')
   result=await page.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},cv=document.createElement('canvas');cv.width=cv.height=128;
    const signature=sp=>{ok(G.drawFace(cv,sp),'missing portrait '+JSON.stringify(sp));return cv.toDataURL();};
    const hero=signature(G.speakerOf('hero')),seen=new Set(),faces=new Set();
    for(const st of G.STAGES){
     G.start(G.STAGES.indexOf(st));while(G.DLG.modal)G.advanceDialog();
     ok(signature(G.speakerOf('hero'))===hero,'mission changes heroine portrait '+st.id);
     for(const g of G.S.guards.filter(g=>g.target)){
      const sp=G.speakerOf(g),id=G.portraitFor(sp);if(!['runner','contact','broker','club','collector','district','freight','crow','chair'].includes(id))continue;
      if(!seen.has(id)){seen.add(id);faces.add(signature(sp));}
      ok(signature(sp)===signature({key:G.characterLook(g)}),'briefing and conversation disagree '+sp.name);
     }
    }
    ok(seen.size===9&&faces.size===seen.size,'named targets share faces '+[...seen]);
    G.start(G.STAGES.findIndex(s=>s.id==='e2'));while(G.DLG.modal)G.advanceDialog();
    const S=G.S,P=S.player;S.fade=0;
    for(const[outfit,disguise]of[['crew','sam'],['staff','staff'],[null,null]]){
     P.outfit=outfit;P.disguise=disguise;ok(signature(G.speakerOf('hero'))===hero,'disguise replaces heroine face');
    }
    ok(!G.drawFace(cv,G.speakerOf({kind:'g1',dog:true})),'dog receives a portrait');
    ok(!G.drawFace(cv,G.speakerOf({note:'서류'})),'document receives a face');
    G.say([['hero','입구 확인했어. 안으로 들어갈게.']],true);G.updateDialog(3);
    ok(document.getElementById('dlgFace').toDataURL()===(()=>{const t=document.createElement('canvas');t.width=document.getElementById('dlgFace').width;t.height=document.getElementById('dlgFace').height;G.drawFace(t,G.speakerOf('hero'));return t.toDataURL();})(),'dialogue keeps old face');
    const label=G.speakerOf('hero').name;ok(label==='올빼미','hero identity changed');
    return{namedTargets:seen.size,distinctFaces:faces.size,stableHero:true,sharedPortraits:true,noDogPortrait:true,maps:G.STAGES.length};
   }''')
   await page.screenshot(path=str(O/('mobile-dialogue.png' if mobile else 'pc-dialogue.png')))
   temporal=await page.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};while(G.DLG.modal)G.advanceDialog();
    const S=G.S,P=S.player,w=S.windows.find(w=>w.tx===18&&w.ty===5);S.fade=0;
    Object.assign(P,{x:w.x-150,y:w.y,z:0,fl:0,a:0});G.setLayer(0);G.moveCamera(2);G.benchDraw(40);
    Object.assign(P,{x:w.x-48,y:w.y,a:Math.PI/2});G.benchDraw(40);ok(!G.aperturePeekFrame,'walking along wall reveals a room');
    P.a=0;G.benchDraw(5);ok(!G.aperturePeekFrame,'room appears before a short look');
    G.benchDraw(6);const early=G.aperturePeekFrame?.alpha||0;ok(early>0&&early<.5,'room pops into view');
    G.benchDraw(40);const full=G.aperturePeekFrame;ok(full?.alpha>.95&&full.cells.size>4,'holding at sill never reveals room');
    const oldCreate=document.createElement;let created=0;document.createElement=function(...a){if(a[0]==='canvas')created++;return oldCreate.apply(this,a);};
    try{G.benchDraw(12);}finally{document.createElement=oldCreate;}ok(created===0,'peek creates canvases each frame');
    Object.assign(P,{x:w.x-150,y:w.y});G.benchDraw(1);ok(G.aperturePeekFrame?.alpha>.7,'room snaps shut');
    G.benchDraw(45);ok(!G.aperturePeekFrame,'room remains visible away from sill');
    Object.assign(P,{x:w.x-48,y:w.y,a:0});G.benchDraw(40);P.fl=1;G.benchDraw(1);ok(!G.aperturePeekFrame,'old floor fades over new floor');
    P.fl=0;G.setLayer(0);return{facingRequired:true,dwell:true,earlyAlpha:early,fullRoom:true,fadeOut:true,noNewCanvases:true,floorClear:true};
   }''')
   # Exercise the actual renderer, not an unrelated imported-art thumbnail.
   dog=await page.evaluate('''()=>{
    const G=__game,c=G.ctx,S=G.S,seen=new Set(),ok=(v,m)=>{if(!v)throw Error(m)};c.save();c.setTransform(1,0,0,1,0,0);
    for(let d=0;d<8;d++){c.clearRect(0,0,96,96);G.drawDog(48,65,d*Math.PI/4,false);seen.add(c.canvas.toDataURL());}
    ok(seen.size===8,'dog still flips two side views');
    c.clearRect(0,0,96,96);G.drawBody({ch:'dog',dog:true,x:48,y:65,a:0});const corpse=c.getImageData(0,0,96,96).data;
    ok(corpse.some((v,i)=>i%4===3&&v>0),'dog body is invisible');c.restore();return{directions:seen.size,bodyVisible:true};
   }''')
   assert not errors,errors
   print('PASS cast / peek', 'mobile' if mobile else 'PC',json.dumps({**result,**temporal,**dog}),flush=True)
   await page.close()
  # A slow portrait request must not flash the old face or leave an open modal
  # blank after the new image arrives. No game tick is needed to repair it.
  page=await browser.new_page(viewport={'width':1280,'height':800})
  gate=asyncio.Event()
  name=hashlib.sha256((R/'src/art/cast/portraits.webp').read_bytes()).hexdigest()[:20]+'.webp'
  async def delayed(route):
   await gate.wait()
   await route.continue_()
  await page.route('**/assets/'+name,delayed)
  await page.add_init_script('localStorage.clear();requestAnimationFrame=()=>0')
  await page.goto(release_url,wait_until='domcontentloaded')
  await page.wait_for_function('!!window.__game',polling=100)
  await page.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='e2'));while(__game.DLG.modal)__game.advanceDialog();__game.say([['hero','입구 확인했어.']],true)")
  assert await page.locator('#dlgFaceBox').is_hidden(),'old face flashes before portrait decode'
  gate.set()
  await page.wait_for_function('__game.castArtReady',polling=100)
  assert await page.locator('#dlgFaceBox').is_visible(),'loaded portrait never refreshes the open dialogue'
  print('PASS delayed portrait decode / packaged release',flush=True)
  await page.close()
  await browser.close()

if __name__=='__main__':asyncio.run(main())
