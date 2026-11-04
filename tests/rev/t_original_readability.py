"""Controlled original-map rendering and selected-action regressions.
This prepares scenarios; the separate native walkthrough verifies normal play.
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'build/review-v177'
OUT.mkdir(exist_ok=True)

async def main():
    rows = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for width, height, touch in [(1280,800,False),(390,844,True),(844,390,True)]:
            page = await browser.new_page(viewport={'width':width,'height':height},has_touch=touch)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
            await page.goto((ROOT/'build/preview_city.html').as_uri())
            await page.wait_for_function('!!window.__game',polling=100)
            checks = await page.evaluate('''() => {
                const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{
                    G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;
                };
                let S=fresh('tC'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target);
                Object.assign(P,{x:984,y:600,fl:0,z:0});G.setLayer(0);
                Object.assign(g,{x:P.x+80,y:P.y,fl:0,z:0,a:Math.PI,state:'PATROL',meter:0,seen:false,eyeWatching:false,eyeT:0});S.guards=[g];
                const quiet={phase:'quiet',progress:0},before=JSON.stringify([P,S.stats,S.cams.map(c=>[c.meter,c.seen,c.cool]),g.state,g.meter]);
                const near=G.guardConeInk(g,P,quiet,{scale:G.SCALE}),far=G.guardConeInk({...g,x:P.x+600},P,quiet,{scale:G.SCALE});
                ok(near.stroke>=.4&&far.stroke>=.12&&near.stroke>far.stroke,'nearby neutral sight outline is unreadable or distant fields dominate');
                ok(near.fill<=.13&&far.fill<=.04,'quiet fields wash out the original night scene');
                const alert=G.guardConeInk(g,P,{phase:'seen',progress:1},{scale:G.SCALE});
                ok(alert.stroke>near.stroke&&alert.fill>near.fill,'alert field loses hierarchy');
                ok(before===JSON.stringify([P,S.stats,S.cams.map(c=>[c.meter,c.seen,c.cool]),g.state,g.meter]),'presentation changes gameplay state');
                out.push('neutral, distant and alerted fields have readable hierarchy without changing player, AI or cameras');
                const ctx=G.ctx,stroke=ctx.stroke,lines=[];
                ctx.stroke=function(){const m=this.strokeStyle.match(/rgba\\(170,\\s*200,\\s*235,\\s*([\\d.]+)\\)/);if(m)lines.push(+m[1]);return stroke.apply(this,arguments)};
                try{G.moveCamera(1);G.benchDraw(1);}finally{ctx.stroke=stroke;}
                ok(lines.some(alpha=>alpha>=.4),'real renderer still uses the faded old outline');
                out.push('actual original-map canvas draws a visible nearby guard boundary');

                S=fresh('m2');P=S.player;const coat=S.props.find(p=>p.outfit==='crew');ok(coat,'original spare uniform missing');
                Object.assign(P,{x:coat.x,y:coat.y,fl:coat.fl||0,z:0,mode:'sneak'});G.input.sneakToggle=true;G.setLayer(P.fl);S.cams=[];
                const base=S.guards.find(v=>!v.civ&&!v.dog&&!v.target),enemy={...base,x:P.x+28,y:P.y,fl:P.fl,z:0,a:0,state:'PATROL',meter:0,seen:false,eyeWatching:false,eyeT:0,climb:null,doomed:false};S.guards=[enemy];
                const clothing=G.envChoices().find(a=>a.k==='pickup'&&a.p===coat);ok(clothing,'original outfit interaction unreachable');
                G.selectEnvTarget(G.envToken(clothing));ok(G.attackAction().k!=='none','fixture needs a competing rear attack');G.updateHUD(true);
                ok(document.querySelector('#actionRiskLbl').textContent.startsWith('갈아입기'),'possible attack replaces selected clothing risk');
                out.push('selected clothing action keeps its own risk explanation beside an attack target');

                S=fresh('m2');P=S.player;const stair=S.ladders.find(l=>l.kind==='fstair'&&l.tfl===1&&l.x<13*48);
                Object.assign(P,G.stairLower(stair).up.entry,{outfit:'crew',disguise:'sam',fl:0,z:0,mode:'sneak'});G.setLayer(0);S.cams=[];
                const other={...base,x:P.x+16,y:P.y,fl:0,z:0,a:0,state:'PATROL',meter:0,seen:false,climb:null,doomed:false};S.guards=[other];
                const up=G.envChoices().find(a=>a.k==='up'&&a.l===stair);ok(up,'original stairs unavailable');G.selectEnvTarget(G.envToken(up));G.updateHUD(true);
                const text=document.querySelector('#actionRiskLbl').textContent;ok(text.includes('2층 진입')&&text.includes('복장 통행 불가'),'nearby actor hides selected stair permission preview');
                out.push('selected original stair previews secure-floor access');

                S=fresh('tC');P=S.player;S.guards=[];Object.assign(P,{x:984,y:600,light:1});G.updateCams(.4);
                const cable=G.workRiskReadout({k:'camCable'});ok(cable?.kind==='camera'&&cable.text.includes('카메라가 돌아간 뒤'),'camera cable has no actionable timing hint');
                out.push('actual camera exposure explains when to attempt cable work');
                return out;
            }''')
            assert not errors, errors
            rows.append({'viewport':[width,height],'checks':checks,'errors':errors})
            print('PASS original readability',width,len(checks),'groups',flush=True)
            await page.screenshot(path=str(OUT/f'rules-{width}.png'))
            await page.close()
        await browser.close()
    (OUT/'rules.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))

asyncio.run(main())
