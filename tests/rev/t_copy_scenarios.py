"""Contextual copy: real takedown states, inventory grammar, old clues and floor labels."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b = await p.chromium.launch()
  for mobile in [False, True]:
   pg = await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0')
   await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.setLayer(0);return G.S};
    for(const [word,pair,expected] of [['열쇠','으로/로','열쇠로'],['맨홀','으로/로','맨홀로'],['침대 밑','으로/로','침대 밑으로'],['다트','이/가','다트가'],['옷','을/를','옷을'],['직원 조끼','을/를','직원 조끼를'],['초록 카드키','은/는','초록 카드키는'],['7316','을/를','7316을']])check(G.withJosa(word,pair)===expected,'wrong inventory/place grammar '+word);
    let S=start('m1'),P=S.player;const base=S.guards.find(g=>!g.civ&&!g.dog&&!g.child);
    for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
    S.vehicles=null;S.camRoom=null;S.facOn=false;S.keys={};S.t=10;S.koHold=null;G.input.pressIds={};
    Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0,captive:null,carrying:null,hide:null,cover:null,snap:null,strikeT:0});
    const g={...base,id:111,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,target:true,civ:false,dog:false,child:false,elite:false,hasKey:'red',state:'PATROL',route:[{x:P.x+30,y:P.y,pause:999}]};S.guards=[g];
    G.updateHUD(true);check(document.querySelector('#btnAct').textContent.includes('기절')&&document.querySelector('#btnAct').textContent.includes('길게 처치'),'live target tap/hold help is misleading');
    S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let n=0;n<8;n++){S.t+=.01;G.updatePlayer(.01)}S.keys.KeyZ=false;G.combatRelease('KeyZ');
    for(let n=0;n<160;n++){S.t+=.01;G.updatePlayer(.01);G.updateKoHold()}
    check(S.corpses[0]?.ko,'tap must create a real unconscious target');G.updateHUD(true);
    const a=G.attackAction();check(a.k==='finish'&&a.holdOnly,'wrong unconscious-target action');
    const caption=G.actionCaption(a);check((caption.match(/처치/g)||[]).length===1&&caption.includes('길게 누르기'),'finishing caption repeats lethal verb');
    check(document.querySelector('#btnAct').textContent==='처치길게 누르기','button disagrees with required hold');
    check(document.querySelector('#btnAct').getAttribute('aria-label')===caption,'accessible label disagrees with target caption');
    check(S.toasts.some(t=>t.text.includes('빨간 카드키를')),'real key pickup has wrong name or particle');
    G.input.tool='coin';G.syncTools();check(!document.querySelector('#btnTool small'),'orphan unit below tool count');
    S=start('m5');S.learned=['본부 금고 비번 2580'];check(G.knows('비밀번호'),'old checkpoint clue no longer matches renamed story');G.updateStories(0);check(S.stories.some(s=>s.d.id==='code'&&s.found),'old clue fails to reveal password route');
    S=start('m4');P=S.player;Object.assign(P,{x:17.5*48,y:20.5*48,z:0,fl:0});G.updateHUD(true);check(document.querySelector('#layerLbl').textContent.includes('지상')&&!document.querySelector('#layerLbl').textContent.includes('1층'),'open lot labelled as indoors');
    Object.assign(P,{x:25.5*48,y:6.5*48,z:0,fl:1});G.setLayer(1);G.updateHUD(true);check(document.querySelector('#layerLbl').textContent.includes('2층'),'real upper floor missing');
    S=start('m4');G.takeItem(S.items[1]);check(S.toasts.at(-1).text.startsWith('계약서 회수'),'pickup uses the other objective name');G.takeItem(S.items[0]);check(!S.toasts.at(-1).text.includes('탈출')&&S.guards.some(g=>g.target&&!G.targetEliminated(g)),'item pickup tells player to leave before other objectives');
    S=start('m2');const prop=S.props.find(p=>p.id==='emetic');G.takeProp(prop);S.player.hp=2;G.saveCheckpoint();G.CP.S.player.item.name='배탈약';G.CP.S.props.find(p=>p.id==='emetic').name='배탈약';check(G.loadCheckpoint()&&G.S.player.item.name==='구토제'&&G.S.player.hp===2,'renamed held item resets saved progress or keeps old name');
    S=start('t0');S.tutI=2;G.updateHUD(true);const objective=G.objectiveLines().map(l=>l[1]).join(' ');check(!objective.includes('[이동] 버튼으로')&&!objective.includes('{살금}'),'tutorial refers to wrong/unexpanded crouch control');
    return {grammar:8,tapTarget:true,holdOnlyCaption:true,legacyClue:true,lotAndUpperFloor:true};
   }''')
   assert not errors,errors;print('PASS', 'mobile' if mobile else 'desktop',result)
   await pg.close()
  await b.close()
asyncio.run(main())
