"""Shorter default surfaces retain real controls, progression, intel and dangerous-action distinctions."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(320,568),(390,844),(844,390),(1280,800)]:
   for ink in [False,True]:
    pg=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1280);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+('&tone=ink'if ink else''));await pg.wait_for_function('!!window.__game',polling=100)
    await pg.locator('#btnHelp').click()
    assert await pg.locator('#help input:visible,#help button:visible:not(#btnHelpBack)').count()<=3,'default settings still expose advanced controls'
    assert await pg.locator('#advancedSettings').evaluate('e=>!e.open')
    assert await pg.locator('#controlGuide .ctrl').is_hidden()
    await pg.locator('#advancedSettings summary').click();await pg.locator('#btnFps').click();await pg.locator('#btnOpps').click();await pg.locator('#btnRoutes').click()
    assert await pg.evaluate('__game.FPS_CAP===30&&__game.oppMode===0')
    route=await pg.locator('#btnRoutes').evaluate('e=>e.classList.contains("on")')
    await pg.locator('#btnMute').click();assert await pg.locator('#volLabel').inner_text()=='음소거'
    await pg.locator('#volR').focus();await pg.keyboard.press('ArrowLeft');assert await pg.locator('#volLabel').inner_text()=='음량' and await pg.locator('#volValue').inner_text()=='85%'
    await pg.locator('#controlGuide summary').click()
    assert '길게 처치' in await pg.locator('#controlGuide').inner_text() and '붙잡기' in await pg.locator('#controlGuide').inner_text()
    assert await pg.locator('#controlGuide .touch-controls').is_visible()==(w!=1280)
    assert await pg.locator('#controlGuide .kbonly').is_visible()==(w==1280)
    assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'settings overflow'
    await pg.reload();await pg.wait_for_function('!!window.__game',polling=100);await pg.locator('#btnHelp').click();assert await pg.locator('#advancedSettings button').first.is_hidden()
    assert await pg.evaluate('__game.FPS_CAP===30&&__game.oppMode===0') and await pg.locator('#btnRoutes').evaluate('e=>e.classList.contains("on")')==route
    await pg.locator('#btnHelpBack').click();await pg.locator('#btnLedger').click()
    assert await pg.locator('#modBox').is_hidden() and await pg.locator('#perkBox').is_hidden(),'new profile gets replay/equipment extras'
    assert '☆' not in await pg.locator('#stageList').inner_text(),'unearned stars crowd mission cards'
    await pg.evaluate("()=>{const s=__game.STAGES.find(s=>s.id==='m2');localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true,[s.challenges[0]]:true,[s.challenges[1]]:true}}));}")
    await pg.locator('.ledger-tabs [data-filter="training"]').click();await pg.locator('.ledger-tabs [data-filter="missions"]').click()
    assert await pg.locator('#modBox').is_visible() and await pg.locator('#modSel').is_hidden()
    assert await pg.locator('#perkBox').is_visible() and await pg.locator('#perkList').is_hidden()
    await pg.locator('#perkBox summary').click();assert '락픽 +1' in await pg.locator('#perkList').inner_text() and '긴 팔' not in await pg.locator('#perkList').inner_text()
    await pg.locator('#modBox summary').click();await pg.locator('#modSel [data-m="reinf"]').click();await pg.locator('#stageList [data-i]').filter(has=pg.locator('.st-name',has_text='VIP')).click()
    assert await pg.evaluate('__game.S.mod==="reinf"'),'folded replay control no longer changes the actual mission'
    await pg.locator('#btnBrGo').click()
    assert await pg.evaluate('__game.DLG.cur&&!__game.DLG.q.length'),'routine mission still opens a coaching sequence'
    await pg.keyboard.press('Escape')
    result=await pg.evaluate('''()=>{
     const G=__game,S=G.S,P=S.player,check=(x,m)=>{if(!x)throw Error(m)};
     S.toasts=[];G.renderToasts();G.hint('pick','긴 설명');check(!G.showHint('설명',4)&&!document.querySelector('#hintCard'),'automatic instruction panel returns');
     for(const ev of ['first','streak','eye','alert','calm','interro','check','disguise','loot','target','accident'])G.bossRadio(ev,true);
     check(S.toasts.length===0,'routine radio returns');G.bossRadio('body',true);check(S.toasts.some(t=>t.text.includes('시체')),'consequential radio lost');S.toasts=[];
     G.toast('신원이 녹화됐다',3,'warn');check(document.querySelector('#toasts').textContent.includes('녹화'),'urgent warning lost');S.toasts=[];G.renderToasts();
     const base=S.guards.find(g=>!g.civ&&!g.target&&!g.elite&&!g.dog),g={...base,id:777,x:28.5*48+60,y:21.5*48,fl:0,z:0,a:0,state:'PATROL',seen:false,meter:0,eyeT:0,path:null};
     Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0,a:0,captive:null,carrying:null,hide:null,cover:null,strikeT:0});S.guards=[g];S.cams=[];S.facOn=false;S.hides=[];S.bushes=[];G.setLayer(0);S.t+=1;
     const rows=G.encounterRows(P,G.attackAction(),G.grabAction(),G.envAction());check(rows.some(r=>r.text==='붙잡기')&&rows.some(r=>r.detail.includes('길게 처치')),'critical controls removed with coaching');
     const clue=G.STAGE.interrogate[0].learn;G.grab(g);for(let i=0;i<90;i++){S.t+=1/60;G.updatePlayer(1/60);G.runTimers()};G.actGrab();for(let i=0;i<120;i++){S.t+=1/60;G.updatePlayer(1/60);G.runTimers()};check(S.learned.includes(clue),'less explanation removes actual earned intel');
     const after=G.encounterRows(P,G.attackAction(),G.grabAction(),G.envAction());check(!after.some(r=>r.text.includes('심문')||r.text.includes('찾기'))&&after.some(r=>r.text==='기절'&&r.detail.includes('길게 처치')),'captive panel has filler or loses KO/kill distinction');
     G.updateHUD(true);check(!document.querySelector('#objective .done'),'completed task still fills objective panel');
     return{criticalActions:true,earnedIntel:true,urgentWarnings:true};
    }''')
    await pg.evaluate("__game.S.missionApproach='간판 사고';__game.showEnd(true)")
    assert await pg.locator('#endStats > div').count()<=4
    assert await pg.locator('#endRankNote').is_hidden()
    fee=await pg.locator('#endStats > div').filter(has=pg.locator('dt',has_text='수고비')).locator('dd').inner_text();assert fee.endswith('만') and '(' not in fee
    await pg.locator('.endmore summary').click();assert await pg.locator('#endMore').inner_text() and await pg.locator('#endRankNote').is_visible()
    assert not errors,errors;print('PASS',w,h,'ink'if ink else'normal',result,'settings/replay/records remain usable',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
