"""Mission guidance and progress distinguish unconscious targets from completed kills."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script('window.requestAnimationFrame=()=>0')
        await pg.goto((ROOT/'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        result = await pg.evaluate('''()=>{
          const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let n=0;n<60&&G.DLG.modal;n++)G.advanceDialog();return G.S};
          let stories=0,targets=0;
          for(const [id,tag,ids] of [['m2','vip',['sign','emetic','vault']],['m3','boss',['pond','toast','gen']],['m4','collector',['sign']],['m4','vip',['red']],['m5','boss',['boss']]]){
            const S=fresh(id),P=S.player,g=S.guards.find(g=>g.tag===tag);
            S.guards.forEach(q=>{q.x=q.y=-9999});G.setLayer(0);let spot;for(let y=1;y<G.MH-2&&!spot;y++)for(let x=1;x<G.MW-3&&!spot;x++)if([-1,0,1].every(dy=>[0,1,2].every(dx=>!G.solidAt(x+dx,y+dy))))spot={x:x*48+24,y:y*48+24};check(spot,'no clear fixture');Object.assign(P,{...spot,z:0,fl:0,a:0,carrying:null,captive:null});
            // A clear fixture square isolates the kill/KO event; mission objectives and story definitions stay intact.
            G.setLayer(0);Object.assign(g,{x:P.x+28,y:P.y,z:0,fl:0,a:0,state:'PATROL',meter:0,hasKey:null});
            const watched=ids.map(k=>S.stories.find(s=>s.d.id===k));for(const st of watched){check(st,'missing story');st.found=true;st.step=st.d.steps.length-1}
            const tick=()=>{S.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers()};
            const old=G.cpProgress();S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<8;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');for(let i=0;i<160;i++)tick();
            check(g.unconscious&&!G.targetEliminated(g),id+' fixture must be unconscious');G.updateStories(1);
            for(const st of watched)check(!st.done&&!st.moot,id+' unconscious target completes or hides '+st.d.id);
            check(G.cpProgress()===old&&!S.exitOpen,id+' unconscious target counts as completed progress');
            check(G.attackAction().k==='finish',id+' unconscious target cannot be finished');
            S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<120;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');G.updateStories(1);
            check(G.targetEliminated(g)&&G.cpProgress()===old+1,id+' deliberate finish does not advance progress');
            for(const st of watched){check(st.done,id+' actual death does not complete '+st.d.id);stories++}targets++;
          }
          let keypads=0;
          for(const id of ['m2','m5']){
            const S=fresh(id),P=S.player,d=S.doors.find(d=>d.keyLock==='code');S.guards.forEach(g=>{g.x=g.y=-9999});
            Object.assign(P,{x:d.x,y:d.y+48,fl:d.fl||0,z:0});G.setLayer(P.fl);G.doAct({k:'keypad',d});
            const press=v=>document.querySelector('#keypad [data-k="'+v+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
            const count=S.stats.keyDoors||0;for(const v of G.STAGE.code)press(v);for(let i=0;i<8;i++)press('ok');
            for(let i=0;i<40;i++){S.t+=.01;G.runTimers()}
            check(!d.locked&&!S.keypad&&S.stats.keyDoors===count+1,id+' rapid confirmation unlocks/counts more than once');keypads++;
          }
          {
            const S=fresh('m4'),g=S.guards.find(g=>g.tag==='collector'),st=S.stories.find(s=>s.d.id==='sign');
            G.npcDown(g);st.done=true;st.step=st.d.steps.length;S.stats.stories=1;S.exitOpen=true;S.cpProg=99;delete S.missionProgressVersion;
            S.player.keys.green=true;const pos=[S.player.x,S.player.y];G.saveCheckpoint();check(G.loadCheckpoint(),'legacy progress load failed');
            const R=G.S,repaired=R.stories.find(s=>s.d.id==='sign');
            check(!repaired.done&&!repaired.moot&&repaired.step===repaired.d.steps.length-1,'legacy KO story not reopened');
            check(!R.exitOpen&&R.stats.stories===0&&G.cpProgress()===0,'legacy KO still completes mission progress');
            check(R.player.keys.green&&R.player.x===pos[0]&&R.player.y===pos[1],'migration changed player progress or position');
            const other=R.guards.find(g=>g.tag==='vip');Object.assign(R.player,{x:other.x,y:other.y,fl:other.fl||0,z:0});G.setLayer(other.fl||0);
            R.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<180;i++){R.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers()}R.keys.KeyZ=false;G.combatRelease('KeyZ');
            check(R.toasts.some(t=>t.text.includes('남은 표적 1')),'remaining-target notice omits unconscious target');
          }
          return {targets,stories,keypads,legacyProgress:true,remainingTargets:true};
        }''')
        assert not errors,errors
        print('PASS',result)
        await b.close()

asyncio.run(main())
