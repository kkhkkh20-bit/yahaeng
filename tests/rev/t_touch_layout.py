"""Reference layout: right thumb arc, dominant attack, and immediately usable bottom items."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(320,480),(320,568),(390,640),(390,844),(568,320),(844,390)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=True,is_mobile=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},box=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return !e.hidden&&r.width?{id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null};G.start(G.STAGES.findIndex(s=>s.id==='tE'),false);while(G.DLG.modal)G.advanceDialog();const S=G.S;Object.assign(S.player,{stones:2,coins:2,smokes:2,hasRadio:true,radioCharges:2});G.updateHUD(true);
    const atk=box('btnAct'),env=box('btnCarry'),crouch=box('btnCrouch'),gear=box('btnToolNext'),items=['quickStone','quickCoin','quickSmoke','quickRadio'].map(box).filter(Boolean);
    ok(atk&&env&&crouch&&gear&&items.length===4,'reference controls missing');
    ok(atk.x+atk.w/2>innerWidth*.7&&atk.bottom>innerHeight*.65,'attack is not above the utility strip');
    ok(atk.w*atk.h>env.w*env.h*1.5&&atk.w*atk.h>crouch.w*crouch.h*1.5,'attack does not dominate its auxiliaries');
    ok(crouch.bottom<atk.bottom-crouch.h&&crouch.x<atk.x,'crouch does not form the upper-left arc');
    for(const id of ['btnAct','btnCarry','btnCrouch','btnTool','btnGrab','btnDress']){const r=box(id);if(r)ok(r.x+r.w/2>innerWidth*.5,'action occupies the left movement side '+id);}
    ok(gear.x+gear.w/2<innerWidth*.25&&(innerWidth>innerHeight||gear.y>=atk.bottom+6),'equipment is not part of the bottom strip');
    ok(items.every(r=>r.x>=gear.right+6&&r.y>innerHeight*.7&&(innerWidth>innerHeight||r.y>=atk.bottom+6)),'consumables are not below the play area beside equipment');
    const radius=getComputedStyle(document.getElementById('btnCrouch')).borderRadius;ok(radius.includes('%')||parseFloat(radius)>=crouch.h/2,'crouch is not circular');
    const cases=[];const spacing=label=>{const ids=['btnAct','btnCarry','btnCrouch','btnTool','btnToolNext','btnGrab','btnDress','btnCycle','quickStone','quickCoin','quickSmoke','quickRadio'],rs=ids.map(box).filter(Boolean);
     for(const r of rs)ok(r.w>=44&&r.h>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,label+' clipped or undersized '+r.id);
     for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,label+' controls overlap: '+a.id+' / '+b.id);}
     const main=box('btnAct'),center=r=>[r.x+r.w/2,r.y+r.h/2],m=center(main),adaptive=['btnTool','btnGrab','btnDress'].map(box).filter(Boolean);
     ok(adaptive.length===1,label+' must have exactly one adaptive satellite');
     const satellites=[box('btnCarry'),box('btnCrouch'),adaptive[0]],radii=satellites.map(r=>Math.hypot(center(r)[0]-m[0],center(r)[1]-m[1])),angles=satellites.map(r=>Math.atan2(m[1]-center(r)[1],m[0]-center(r)[0])*180/Math.PI);
     ok(Math.max(...radii)-Math.min(...radii)<.8,label+' satellites have unequal radii');
     ok(Math.abs(angles[0])<.5&&Math.abs(angles[1]-45)<.5&&Math.abs(angles[2]-90)<.5,label+' satellites have unequal angle intervals');
     ok(satellites.every(r=>Math.abs(r.w-satellites[0].w)<.5&&Math.abs(r.h-r.w)<.5),label+' satellite sizes differ');
     cases.push({label,controls:rs,radii,angles});};
    spacing('all consumables');G.input.tool='kunai';S.player.kunai=0;G.updateHUD(true);ok(document.querySelectorAll('#btnTool:not([hidden]),#btnGrab:not([hidden]),#btnDress:not([hidden])').length===1,'empty equipment loses its adaptive control');spacing('empty tool');
    S.player.kunai=2;G.updateHUD(true);ok(!document.getElementById('btnTool').hidden,'loaded weapon is unreachable');spacing('loaded weapon');
    const P=S.player,g=S.guards.find(g=>!g.civ&&!g.child&&!g.dog);S.guards.forEach(o=>{if(o!==g){o.x+=1500;o.y+=1500;}});g.x=P.x+32;g.y=P.y;G.npcDown(g,null,false);G.updateHUD(true);
    const carry=G.envChoices().find(a=>a.k==='carry');if(carry)G.selectEnvTarget(G.envToken(carry));G.updateHUD(true);spacing('body and clothing');
    G.input.padWhistle=true;G.updateHUD(true);ok(!document.getElementById('btnTool').hidden,'whistle lost its direct control');spacing('whistle and context');
    return{viewport:[innerWidth,innerHeight],attack:atk,action:env,crouch,gear,items,cases};}''')
   await q.evaluate("()=>{const G=__game;G.S.guards.forEach(g=>{g.x+=2000;g.y+=2000});G.S.corpses=[];G.S.whistleT=0;G.S.player.kunai=0;G.input.tool='kunai';G.input.padWhistle=false;G.updateHUD(true)}")
   before=await q.evaluate('__game.S.stats.whistles||0');await q.tap('#btnTool');assert await q.evaluate('__game.S.stats.whistles||0')==before+1,'empty-tool fallback did not whistle'
   assert await q.evaluate("__game.input.tool==='kunai'&&!__game.input.padWhistle&&__game.S.player.kunai===0"),'fallback changed the loadout'
   assert not errors,errors;rows.append(result);print('PASS reference thumb layout',w,h,flush=True);await q.close()
  q=await b.new_page(viewport={'width':1280,'height':800});await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.click('#btnQuick')
  for sel in ['#hud .pad','#hud .sysbtns','#quickItems']:assert await q.locator(sel).is_hidden(),('desktop touch controls visible',sel)
  print('PASS keyboard HUD has no touch controls',flush=True);await b.close()
 out=R/'build/controls-v239';out.mkdir(exist_ok=True);(out/'layout.json').write_text(json.dumps(rows,indent=2))
asyncio.run(main())
