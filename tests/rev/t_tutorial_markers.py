"""Actual marker drawing at close range, separated from controlled stage completion.
Normal-time native playback lives in tests/tutorial/first_steps_live.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'build/tutorial-v178';OUT.mkdir(exist_ok=True)
async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        for width,height,touch in [(1419,911,False),(390,844,True),(844,390,True),(320,568,True)]:
            page=await browser.new_page(viewport={'width':width,'height':height},has_touch=touch)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            await page.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
            await page.goto((ROOT/'build/preview_city.html').as_uri());await page.wait_for_function('!!window.__game',polling=100)
            checks=await page.evaluate('''()=>{
                const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},out=[];
                G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();
                const S=G.S,P=S.player,c=G.ctx,stroke=c.stroke,fill=c.fill;
                let ink=0;c.stroke=function(){ink++;return stroke.apply(this,arguments)};c.fill=function(){ink++;return fill.apply(this,arguments)};
                try{
                    for(const step of [0,1,2,6]){
                        S.tutI=step;P.mode='sneak';let target=G.STAGE.steps[step][2](S);Object.assign(P,{x:target.x-52,y:target.y,fl:0,z:0});
                        G.updateHUD(true);G.moveCamera(1);const goal=G.nextGoal();
                        ok(goal.moveCue,'movement cue missing '+step);ink=0;G.drawGoal(P);ok(ink>0,'close movement marker disappears '+step);
                    }
                    out.push('all infiltration movement destinations remain drawn below 3m');
                    S.tutI=3;const bush=S.guards[0];Object.assign(P,{x:bush.x-28,y:bush.y,hidden:false});G.updateHUD(true);G.moveCamera(1);
                    ok(!G.nextGoal().moveCue,'contact action incorrectly requests movement');ink=0;G.drawGoal(P);ok(ink===0,'contact target covers the player');
                    out.push('nearby attack action keeps its button cue without duplicate destination');
                    S.tutI=0;Object.assign(P,{x:150,y:504,hidden:false});for(let i=0;i<10;i++)G.update(.01);ok(S.tutI===0,'drawing change prematurely completes the first step');
                    out.push('first movement step still requires actual arrival');
                    G.saveCheckpoint();ok(G.loadCheckpoint(),'near-target checkpoint cannot restore');G.updateHUD(true);G.moveCamera(1);ink=0;G.drawGoal(G.S.player);
                    ok(G.nextGoal().moveCue&&ink>0,'restored near-target lesson hides its marker');
                    out.push('near-target checkpoint restores visible movement guidance');
                    G.start(G.STAGES.findIndex(s=>s.id==='t0'));while(G.DLG.modal)G.advanceDialog();const A=G.S,B=A.player;
                    A.tutI=1;Object.assign(B,{x:440,y:504,mode:'sneak'});G.updateHUD(true);G.moveCamera(1);ink=0;G.drawGoal(B);ok(ink>0,'near-rear approach marker disappears');
                    out.push('second lesson rear approach remains visible before attack range');
                    G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
                    ok(!G.nextGoal().tut&&!G.nextGoal().moveCue,'tutorial marker flag leaks into campaign');
                    out.push('campaign navigation remains separate');
                }finally{c.stroke=stroke;c.fill=fill;}
                return out;
            }''')
            assert not errors,errors
            results.append({'viewport':[width,height],'checks':checks,'errors':errors})
            print('PASS tutorial markers',width,len(checks),'groups',flush=True);await page.close()
        await browser.close()
    (OUT/'markers.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(main())
