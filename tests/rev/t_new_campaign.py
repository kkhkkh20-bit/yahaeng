"""Saved campaign restart: real confirmation/cancel, isolated reset and storage rollback."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/newgame-v200';O.mkdir(parents=True,exist_ok=True)
SEED="""()=>{
 const values={
 'yahaeng.ch':JSON.stringify({tB:{_clear:true},p0:{_clear:true}}),
 'yahaeng.best':JSON.stringify({p0_normal:'그림자'}),
 'yahaeng.cityDone':JSON.stringify({old:true}),
 'yahaeng.skillTree.v1':JSON.stringify({schema:1,rewardVersion:152,legacyPoints:0,learned:['quietStep']}),
 'yahaeng.fieldLearning.v1':JSON.stringify({active:'quietStep',used:{quietStep:{stage:'p0'}}}),
 'yahaeng.assassinSkill':'ambush','yahaeng.cp':JSON.stringify({id:'p0',diff:'normal'}),'yahaeng.mod':'bright',
 'yahaeng.vol':'42','yahaeng.bri':'115','yh_walkLock2':'1','unrelated.save':'keep'
 };for(const[k,v]of Object.entries(values))localStorage.setItem(k,v);
}"""
SNAPSHOT='Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();results=[]
  for name,w,h in [('pc',1440,900),('mobile',390,844),('landscape',844,390),('small',320,568)]:
   mobile=name!='pc';q=await b.new_page(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   async def press(selector):
    el=q.locator(selector)
    if mobile:await el.tap()
    else:await el.click()
   await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game')
   assert await q.locator('#btnNewCampaign').is_hidden()
   await q.evaluate(SEED);await q.reload();await q.wait_for_function('!!window.__game');await q.evaluate('document.fonts.ready')
   assert await q.evaluate('__game.STAGES[__game.recommendedStage()].id')=='p1'
   before=await q.evaluate(SNAPSHOT)
   await q.screenshot(path=str(O/(name+'-title.png')))
   await press('#btnNewCampaign');assert await q.locator('#newCampaignDialog').is_visible()
   assert await q.locator('#btnNewCampaignCancel').evaluate('e=>e===document.activeElement')
   await q.screenshot(path=str(O/(name+'-confirm.png')))
   for selector in ['#newCampaignDialog','#btnNewCampaignCancel','#btnNewCampaignConfirm']:
    r=await q.locator(selector).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(name,selector,r)
   for _ in range(4):
    await q.keyboard.press('Tab');assert await q.evaluate('!!document.activeElement.closest("#newCampaignDialog")')
   await q.keyboard.press('Shift+Tab');assert await q.evaluate('!!document.activeElement.closest("#newCampaignDialog")')
   await press('#btnNewCampaignCancel');assert await q.evaluate(SNAPSHOT)==before
   assert await q.locator('#btnNewCampaign').evaluate('e=>e===document.activeElement')
   await press('#btnNewCampaign');await q.keyboard.press('Escape');assert await q.evaluate(SNAPSHOT)==before
   assert await q.locator('#newCampaignDialog').is_hidden()
   await press('#btnNewCampaign')
   await q.evaluate("""()=>{window.savedRemove=Storage.prototype.removeItem;let n=0;Storage.prototype.removeItem=function(k){if(++n===3)throw Error('storage unavailable');return window.savedRemove.call(this,k);}}""")
   await press('#btnNewCampaignConfirm');assert await q.locator('#newCampaignError').is_visible();assert await q.evaluate(SNAPSHOT)==before
   assert await q.locator('#intro').is_visible();assert await q.evaluate('__game.STAGES[__game.recommendedStage()].id')=='p1'
   await q.evaluate('()=>{Storage.prototype.removeItem=window.savedRemove;}');await press('#btnNewCampaignConfirm')
   await q.wait_for_function('__game.STAGE.id==="tB" && !document.querySelector("#hud").hidden')
   assert await q.locator('#newCampaignDialog').is_hidden()
   state=await q.evaluate("""()=>({stage:__game.STAGE.id,skills:__game.loadSkillTree(),budget:__game.skillBudget(),record:JSON.parse(localStorage.getItem('yahaeng.ch')||'{}'),field:__game.loadFieldLearning(),cp:localStorage.getItem('yahaeng.cp'),best:localStorage.getItem('yahaeng.best'),city:localStorage.getItem('yahaeng.cityDone'),mod:localStorage.getItem('yahaeng.mod'),prefs:['yahaeng.vol','yahaeng.bri','yh_walkLock2','unrelated.save'].map(k=>localStorage.getItem(k))})""")
   assert state['skills']['learned']==[] and state['budget']==1 and state['record']=={},state
   assert state['field']=={'active':None,'used':{}} and all(state[k] is None for k in ['cp','best','city','mod']),state
   assert state['prefs']==['42','115','1','keep'],state
   # Native input after the confirmed restart (no state teleport or clock replacement).
   if await q.locator('#btnBrGo').is_visible():await press('#btnBrGo')
   for _ in range(12):
    if not await q.evaluate('__game.DLG.modal'):break
    if mobile:await press('#dlg')
    else:await q.keyboard.press('Enter')
    await q.wait_for_timeout(50)
   await q.wait_for_function('!__game.DLG.modal')
   if not mobile:
    x=await q.evaluate('__game.S.player.x');await q.keyboard.down('ArrowRight');await q.wait_for_timeout(450);await q.keyboard.up('ArrowRight');assert await q.evaluate('__game.S.player.x')>x+5
   else:
    cdp=await q.context.new_cdp_session(q)
    x=await q.evaluate('__game.S.player.x')
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':60,'y':h*.65}]})
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':h*.65}]})
    await q.wait_for_timeout(450);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert await q.evaluate('__game.S.player.x')>x+5
   await q.reload();await q.wait_for_function('!!window.__game');assert await q.evaluate('__game.STAGES[__game.recommendedStage()].id')=='tB';assert await q.locator('#btnNewCampaign').is_hidden()
   await q.evaluate("localStorage.setItem('yahaeng.cp',JSON.stringify({id:'p0',diff:'normal'}))")
   await q.reload();await q.wait_for_function('!!window.__game');assert await q.locator('#btnNewCampaign').is_visible()
   await q.evaluate("()=>{localStorage.removeItem('yahaeng.cp');localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,legacyPoints:0,learned:['quietStep']}));}")
   await q.reload();await q.wait_for_function('!!window.__game');assert await q.locator('#btnNewCampaign').is_visible()
   # Completed stories also offer the reset even though the continue button is disabled.
   await q.evaluate("localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(__game.LEARNING_ROUTE.map(id=>[id,{_clear:true}]))))")
   await q.reload();await q.wait_for_function('!!window.__game');assert await q.locator('#btnQuick').is_disabled();assert await q.locator('#btnNewCampaign').is_visible()
   assert not errors,errors;results.append({'device':name,'version':await q.evaluate('__BUILD_VERSION__'),'reset':state,'errors':errors});print('PASS new campaign',name,'cancel / Escape / focus / storage rollback / isolated reset / native move / reload / story completion',flush=True);await q.close()
  await b.close();(O/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(main())
