"""Cast identification, native guard selection and single-field danger priority.
Controlled perception fixtures verify display policy without changing AI rules.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/interface-v193';O.mkdir(exist_ok=True)
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1440,900,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]')
   await q.wait_for_function('!__game.warmStatus.pending',polling=100);await q.evaluate('__game.updateHUD(true)')
   assert '올빼미' in await q.locator('.br-cast').inner_text() and '당신 · 잠입 암살자' in await q.locator('.br-cast').inner_text()
   assert '의뢰인' in await q.locator('.br-cast').inner_text() and '현장 지원' in await q.locator('.br-cast').inner_text()
   assert await q.locator('.br-cast canvas[data-ready]').count()==3
   geometry=await q.evaluate('''()=>{const r=document.querySelector('#btnBrGo').getBoundingClientRect(),s=document.querySelector('.br-scroll').getBoundingClientRect();return{cta:[r.x,r.y,r.width,r.height],scrollBottom:s.bottom,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   x,y,bw,bh=geometry['cta'];assert 0<=x and x+bw<=w+.5 and 0<=y and y+bh<=h+.5 and bh>=44 and geometry['scrollBottom']<=y and not geometry['overflow'],geometry
   await q.screenshot(path=str(O/f'brief-{w}.png'))
   # The actual departure opens the canonical radio exchange. Its first speaker
   # must be distinguishable from the mission target and from the player's name.
   await q.click('#btnBrGo')
   assert await q.locator('#dlgName').inner_text()=='까마귀'
   assert await q.locator('#dlgRole').inner_text()=='의뢰인'
   assert '올빼미(나)' in await q.locator('#dlgContext').inner_text()
   await q.evaluate('''()=>{const G=__game;G.S.fade=0;G.update(.01);G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);G.advanceDialog()}''')
   await q.wait_for_timeout(240);await q.screenshot(path=str(O/f'dialog-{w}.png'))
   await q.evaluate('__game.advanceDialog()');assert await q.locator('#dlgName').inner_text()=='올빼미';assert '당신' in await q.locator('#dlgRole').inner_text()
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)};
    while(G.DLG.modal)G.advanceDialog();G.start(G.STAGES.findIndex(s=>s.id==='tC'));while(G.DLG.modal)G.advanceDialog();
    const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target),baseCamera=S.cams[0];
    Object.assign(P,{x:984,y:600,fl:0,z:0,mode:'walk',disguise:null,outfit:null});G.setLayer(0);S.cams=[];
    S.guards=[0,1,2].map((n)=>({...base,id:n,x:1064+n*70,y:600,fl:0,z:0,a:Math.PI,state:'PATROL',meter:0,seen:false,rawSeen:false,eyeWatching:false,eyeT:0,climb:null,doomed:false}));
    S.marked=S.guards[2];const ai=()=>JSON.stringify([P,S.stats,S.guards.map(g=>[g.state,g.meter,g.seen,g.eyeT])]);
    ok(G.workRiskReadout({k:'camCable'}).text.includes('2초'),'camera work duration is hidden before starting');
    const before=ai();G.S.fade=0;G.updateHUD(true);G.moveCamera(1);
    const ctx=G.ctx,stroke=ctx.stroke,begin=ctx.beginPath,close=ctx.closePath;let painted=0,closed=false;
    ctx.beginPath=function(){closed=false;return begin.apply(this,arguments)};ctx.closePath=function(){closed=true;return close.apply(this,arguments)};
    ctx.stroke=function(){if(closed&&/^rgba\\(170,\\s*200,\\s*235,/.test(this.strokeStyle))painted++;return stroke.apply(this,arguments)};
    try{G.benchDraw(1)}finally{ctx.stroke=stroke;ctx.beginPath=begin;ctx.closePath=close}
    ok(painted===1,'actual renderer painted '+painted+' guard boundaries');
    ok(G.selectVisionFocus().actor===S.guards[2],'manual selection ignored');ok(S.guards.filter(G.showVisionField).length===1,'more than one live guard field');ok(before===ai(),'render mutated detection or player state');out.push('selected field is exclusive; render preserves AI');
    Object.assign(S.guards[0],{seen:true,meter:.55});G.benchDraw(1);ok(G.selectVisionFocus().actor===S.guards[0],'real suspicion did not override selected guard');
    Object.assign(S.guards[1],{seen:true,meter:.8});G.benchDraw(1);ok(G.selectVisionFocus().actor===S.guards[1],'higher threat not focused');ok(S.guards.filter(G.showVisionField).length===1,'multiple observers paint overlapping fields');out.push('multiple observers retain detection while the greatest danger owns the field');
    Object.assign(S.guards[0],{state:'ALERT',meter:1});G.benchDraw(1);ok(G.selectVisionFocus().actor===S.guards[0],'identified attacker loses focus to a partial check');
    S.guards.forEach(g=>Object.assign(g,{seen:false,meter:0}));
    P.y=552;const camera={...baseCamera,x:P.x+80,y:P.y,fl:0,z:0,a:Math.PI,meter:.9,seen:true,search:false,broken:false,unplugged:false};S.cams=[camera];
    ok(G.cameraAssessment(camera).detectable,'camera fixture is not an actual exposure');G.benchDraw(1);
    ok(G.selectVisionFocus().actor===camera&&!S.guards.some(G.showVisionField),'camera exposure failed to take exclusive focus');
    S.cams=[];P.y=600;G.benchDraw(1);ok(G.selectVisionFocus().actor===S.guards[2],'selection lost after danger ends');
    S.marked.state='DEAD';G.benchDraw(1);ok(G.selectVisionFocus().actor!==S.guards[2],'dead selection retains cone');out.push('selection resumes after danger; dead observers lose focus');
    S.marked=null;S.guards.forEach(g=>g.state='PATROL');G.toggleTactical();ok(S.guards.every(G.showVisionField),'planning mode hides other fields');G.toggleTactical();out.push('planning mode still shows all fields');
    const cloth=g=>G.characterPalette(g).slice(2).join(',');
    const variants=['g1','g2','g3'].map(kind=>({...base,kind,outfit:null,target:false,lookout:false,civ:false,dog:false,stripped:false}));variants.push({...variants[0],lookout:true});
    ok(new Set(variants.map(cloth)).size===1,'vigilante ranks use different uniforms');
    for(const g of variants){P.disguise=G.characterLook(g).split('@')[0];P.outfit='crew';ok(cloth(P)===cloth(g),'stolen clothes mismatch uniform');}
    ok(cloth({...variants[0],outfit:'rival'})!==cloth(variants[0])&&cloth({...variants[0],outfit:'police'})!==cloth(variants[0]),'factions share uniforms');
    ok(cloth({...variants[0],stripped:true})!==cloth(variants[0]),'undressed guard still wears faction clothes');
    ok(G.speakerOf('hero').name==='올빼미'&&G.speakerOf('hero').role.includes('당신')&&G.speakerOf('hero').key==='ninja','disguise changes speaker identity');out.push('ranks share clothes; stolen, rival, police and stripped looks stay consistent');
    S.marked=null;S.guards.forEach(g=>Object.assign(g,{state:'PATROL',meter:0,seen:false}));P.disguise=null;P.outfit=null;
    G.moveCamera(1);G.benchDraw(1);return out;
   }''')
   # Native world selection uses the existing tap/click; no extra action button.
   pos=await q.evaluate('''()=>{const G=__game,g=G.S.guards[0],r=document.querySelector('canvas').getBoundingClientRect();return{x:r.left+innerWidth/2+(g.x-G.cam.x)*G.SCALE,y:r.top+innerHeight/2+(g.y-14-G.cam.y)*G.SCALE}}''')
   if 8<pos['x']<w-8 and 8<pos['y']<h-8:
    if touch:await q.touchscreen.tap(pos['x'],pos['y'])
    else:await q.mouse.click(pos['x'],pos['y'])
    assert await q.evaluate('__game.S.marked===__game.S.guards[0]'),'native guard selection failed'
   # A camera must remain inspectable even when a guard is closer. It is not
   # stored in S.marked, which is also the explicit dart target.
   cam=await q.evaluate("""()=>{const G=__game,r=document.querySelector('#game').getBoundingClientRect(),points=[[.5,.58],[.4,.7],[.6,.6]].map(([x,y])=>({x:innerWidth*x,y:innerHeight*y})),p=points.find(p=>document.elementFromPoint(p.x,p.y)?.id==='game');if(!p)throw Error('no uncovered camera selection fixture');const c={x:G.cam.x+(p.x-r.left-innerWidth/2)/G.SCALE,y:G.cam.y+(p.y-r.top-innerHeight/2)/G.SCALE,fl:0,z:0,a:1.57,meter:0,seen:false,search:false,broken:false};G.S.cams=[c];G.benchDraw(1);return p}""")
   if touch:await q.touchscreen.tap(cam['x'],cam['y'])
   else:await q.mouse.click(cam['x'],cam['y'])
   assert await q.evaluate('__game.S.visionCamera===__game.S.cams[0]&&!__game.S.marked&&__game.selectVisionFocus().camera&&__game.selectVisionFocus().reason==="selected"'),('native camera inspection failed',w,cam,await q.evaluate('(p)=>({hit:document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,180),selected:!!__game.S.visionCamera,marked:__game.S.marked?.id,focus:__game.selectVisionFocus()?.reason,actor:__game.selectVisionFocus()?.actor?.id,paused:!!document.querySelector("#pause:not([hidden])")})',cam))
   if touch:await q.touchscreen.tap(cam['x'],cam['y'])
   else:await q.mouse.click(cam['x'],cam['y'])
   assert await q.evaluate('!__game.S.visionCamera'),'camera inspection toggle failed'
   assert not errors,errors
   reports.append({'viewport':[w,h],'geometry':geometry,'checks':checks,'errors':errors});print('PASS cast and vision',w,len(checks),'groups',flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
asyncio.run(main())
