"""Scarce receipts, bankable points, uniform provenance and one tap/hold rule."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},out=[],fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S},tick=t=>{for(let n=0;n<t;n+=.01)G.update(.01)};
   ok(G.skillBudget()===1&&!G.loadSkillTree().learned.length,'initial bundle persists');
   fresh('tB');G.S.over=true;G.showEnd(true);ok(G.campaignSkillState().points===1,'first clear not 1P');G.closeAssassinMenu();ok(G.STAGE.id==='p0'&&!G.loadSkillTree().learned.length,'saving requires purchase');
   for(const id of ['p0','p1','m2']){const before=G.skillBudget();fresh(id);G.S.over=true;G.showEnd(true);ok(G.skillBudget()===before+1,'first clear must be exactly 1P '+id);G.showEnd(true);ok(G.skillBudget()===before+1,'repeat clear paid '+id);}
   const ch=JSON.parse(localStorage.getItem('yahaeng.ch'));for(const s of G.STAGES)if(ch[s.id])for(const id of s.challenges||[])ch[s.id][id]=true;localStorage.setItem('yahaeng.ch',JSON.stringify(ch));ok(G.skillBudget()===4,'achievement bonuses inflate budget');out.push('one point per first clear; banking works; replay and achievement farming pay nothing');
   localStorage.clear();localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,legacyPoints:10,learned:['kit','dart','smoke']}));let r=G.loadSkillTree();ok(r.learned.length===3&&G.skillBudget()===3&&G.skillSpent(r)===3,'legacy build lost or unspent bonus retained');ok(G.loadSkillTree().legacyPoints===2&&G.skillBudget()===3,'migration pays repeatedly');localStorage.clear();localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,legacyPoints:10,learned:[]}));ok(G.skillBudget()===1&&G.loadSkillTree().legacyPoints===0,'old unspent balance retained');out.push('existing learned skills preserved once, old unspent bonuses discarded');
   localStorage.clear();
   for(const id of ['p0','m2','m4','m7']){
    let S=fresh(id),P=S.player,g=S.guards.find(g=>g.target);S.guards=[g];S.cams=[];Object.assign(P,{x:g.x-32,y:g.y,fl:0,z:0,hidden:false,cover:null,mode:'sneak'});Object.assign(g,{fl:0,z:0,a:0,state:'PATROL',still:true});G.setLayer(0);G.input.sneakToggle=true;
    G.combatPress('KeyZ');S.keys.KeyZ=true;G.actAttack();S.keys.KeyZ=false;G.combatRelease('KeyZ');tick(1.5);ok(g.unconscious&&!G.targetEliminated(g)&&S.stats.kills===0,'tap kills a target '+id);ok(G.attackAction().holdOnly,'finishing action lacks deliberate hold '+id);P.hidden=true;ok(G.attackAction().k==='finish','finishing an already subdued person incorrectly needs ambush '+id);P.hidden=false;
    G.combatPress('KeyZ');S.keys.KeyZ=true;G.actAttack();tick(.6);ok(g.unconscious,'partial finishing hold kills '+id);S.keys.KeyZ=false;G.combatRelease('KeyZ');tick(.6);ok(g.unconscious,'released hold continues killing '+id);
    G.combatPress('KeyZ');S.keys.KeyZ=true;G.actAttack();tick(1.2);S.keys.KeyZ=false;G.combatRelease('KeyZ');ok(G.targetEliminated(g)&&S.stats.kills===1,'explicit hold cannot kill '+id);
   }
   out.push('short tap, cancelled hold and deliberate 1s hold distinguish knockout/death on every main human target');
   ok(G.STAGES.every(s=>!(s.props||[]).some(p=>p.outfit)),'abandoned wardrobe remains in stage data');let S=fresh('p1'),P=S.player,g=S.guards.find(g=>g.tag==='uniformDonor');ok(g&&!S.props.some(p=>p.outfit),'no real donor');G.saveCheckpoint();G.CP.S.guards=G.CP.S.guards.filter(g=>g.tag!=='uniformDonor');G.CP.S.props.push({id:'oldCoat',outfit:'crew',x:P.x,y:P.y});ok(G.loadCheckpoint(),'old save restore');S=G.S;ok(S.guards.filter(g=>g.tag==='uniformDonor').length===1&&!S.props.some(p=>p.outfit),'old save left clothing or lacks donor');G.saveCheckpoint();G.loadCheckpoint();ok(G.S.guards.filter(g=>g.tag==='uniformDonor').length===1,'save duplicates donor');
   S=fresh('tB');ok(G.MW===34&&G.BLD.length>=3&&S.items[0].furn&&!S.props.some(p=>p.outfit)&&G.STAGE.steps.length===10&&S.items[0].fl===1&&S.ladders.some(l=>l.kind==='fstair'),'opening is still an empty drill');out.push('no loose outfits; old saves repair real donor once; depot has physical buildings, desk upstairs and ten connected actions');return out;
  }''')
  assert not errors,errors;out=R/'build/progression-v203';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));print('PASS',checks);await b.close()
asyncio.run(main())
