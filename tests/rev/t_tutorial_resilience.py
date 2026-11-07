"""Out-of-order actions retain instruction state; loot and CCTV copy describe real work."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 for key in ['coat','apron','folder','paper']:
  with Image.open(R/'src/art/field-items'/(key+'.webp'))as im:assert im.getbbox() and im.width>=24
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!__game&&__game.fieldArtReady',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S},out=[];
   let S=fresh('tB'),P=S.player;G.update(.02);ok(!G.STAGE.steps.some(s=>s[4]==='skills')&&!S.exitOpen,'opening requires spending or opens early');
   const lamp=S.lamps.find(l=>l.outdoor&&!l.pole),at=G.lampControl(lamp);Object.assign(P,{x:at.x,y:at.y});G.actPrimary({k:'lamp',l:lamp,at,viaZ:true});G.updateObjectAction(P,.6);for(let n=0;n<50;n++)G.update(.02);
   ok(lamp.off&&(S.tutI||0)===0&&G.nextGoal().tut&&G.nextGoal().x===216,'early light switch replaces/advances movement goal');G.saveCheckpoint();ok(G.loadCheckpoint()&&G.nextGoal().tut&&!G.S.exitOpen,'save loses interrupted guidance');out.push('native light action before first marker retains lesson and checkpoint');
   S=fresh('tB');P=S.player;Object.assign(P,{x:476,y:504,mode:'sneak',hidden:false});G.input.sneakToggle=true;G.combatPress('KeyZ');S.keys.KeyZ=true;G.actAttack();ok(S.koHold||P.killAnim,'first stage silently disables attack');S.keys.KeyZ=false;G.combatRelease('KeyZ');out.push('first stage allows real basic takedown');
   for(const id of ['p2','e1','tR']){
    S=fresh(id);P=S.player;const it=S.items[0];Object.assign(P,{x:it.x,y:it.y,fl:it.fl||0,z:0});G.setLayer(P.fl);const a=G.envChoices().find(a=>a.k==='loot');ok(a&&typeof a.label==='string'&&!/undefined|null|NaN/.test(a.label),'unnamed document '+id+' '+a?.label);ok(a.label.includes('서류')||a.label.includes('명세서')||a.label.includes('인계서'),'missing physical item name '+id);out.push(id+': '+a.label);
   }
   S=fresh('tC');P=S.player;S.cams[0].unplugged=true;S.tutI=6;for(let n=0;n<100;n++)G.update(.02);ok(S.tutI>=8,'early camera stop leaves an impossible observation task');out.push('already-stopped camera skips impossible observation and cable steps');
   S=fresh('tL');S.lamps[3].broken=true;S.tutI=1;for(let n=0;n<50;n++)G.update(.02);ok(S.tutI>=2,'broken light never satisfies darkness lesson');out.push('a broken bulb and a switched-off light both satisfy darkness');
   S=fresh('tB');S.tutI=4;S.corpses=[];for(let n=0;n<5;n++)G.update(.02);ok(S.tutI===2&&G.nextGoal().x!=null,'woken guard leaves a nonexistent body objective');out.push('woken guard restores a real rear-approach instruction');
   for(const [off,recorded]of [[false,0],[false,2],[true,2]]){
    S=fresh('m2');P=S.player;const cr=S.camRoom;ok(cr,'missing real camera control room');S.guards=[];S.camsOff=off;S.cameraEvidence=recorded>0;S.stats.camRec=recorded;Object.assign(P,{x:cr.x,y:cr.y,fl:cr.fl||0,z:0});G.setLayer(P.fl);
    const a=G.envChoices().find(a=>a.k==='camroom');ok(a&&a.label.includes('감시망 정지')===!off,'control room mislabels stopped network');ok(a.label.includes('기록 지우기')===(recorded>0),'record deletion offered for empty recorder');G.actPrimary({...a,viaZ:true});G.updateObjectAction(P,3);
    ok(S.camsOff&&!S.cameraEvidence&&!S.stats.camRec,'control room failed to stop surveillance and clear evidence');ok(S.toasts.some(t=>t.text.includes(recorded?'2건 삭제':'삭제할 녹화 기록 없음')),'misleading recorder receipt');if(recorded)ok(S.stats.camEver>=recorded,'history of recording was erased');
   }
   out.push('control room stops surveillance; only existing recordings are deleted; historical detection retained');return out;
  }''')
  assert not errors,errors;out=R/'build/tutorial-v202';out.mkdir(exist_ok=True);(out/'resilience.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));print('PASS',checks);await b.close()
asyncio.run(main())
