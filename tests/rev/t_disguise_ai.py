"""Disguise permission, pursuit memory and real AI routine regressions."""
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
        # Tick the real AI deterministically, without rendering or wall-clock races.
        await pg.add_init_script('window.requestAnimationFrame = () => 0')
        await pg.goto((ROOT / 'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        await pg.evaluate('''() => {
          window.fixture = (outfit='crew') => {
            const G=window.__game; G.start(G.STAGES.findIndex(s=>s.id==='m1'));
            for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
            const S=G.S,P=S.player,q=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);
            S.guards=[q]; S.facOn=false; S.corpses=[]; S.decals=[]; S.alevel=0; S.chaseSeen=false; S.knownLooks={}; S.radioCall=null; S.t=10;
            Object.assign(q,{x:30*48+24,y:3*48+24,fl:0,z:0,a:0,want:0,state:'PATROL',meter:0,wait:0,path:null,route:[{x:30*48+24,y:3*48+24,pause:.1},{x:30*48+24,y:5*48+24,pause:.1}],ri:1,homeFl:0,post:null,still:false,radio:false,elite:false,enforcer:false,target:false,follow:null,sched:null,act:null,chat:null,glance:0,glanceT:999,hearT:0,repath:0,lostT:0});
            Object.assign(P,{x:q.x+96,y:q.y,fl:0,z:0,outfit,disguise:outfit,disguiseBlown:false,blown:{},light:1,hidden:false,mode:'walk',moving:false,hide:null,under:null,vent:null,wire:null,ledge:null,trav:null,jump:null,cover:null,captive:null,carrying:null,strikeT:0,useT:0,pick:null});
            G.setLayer(0); window.q=q; window.P=P;
            if(!G.canSee(q,P.x,P.y,1,false,false,0))throw Error('Fixture must have physical sight');
            return G.zoneInfo(P.x,P.y,P.z);
          };
          window.tick = (seconds) => {const G=window.__game; for(let t=0;t<seconds;t+=.05){G.S.t+=.05;G.updateGuard(window.q,.05)}};
          window.finishHands = () => {const G=window.__game;for(let t=0;t<1;t+=.02){G.S.t+=.02;G.updatePlayer(.02)}};
          window.check = (ok,msg) => {if(!ok)throw Error(msg)};
        }''')
        result = await pg.evaluate('''() => {
          const G=window.__game,results=[];
          const zi=fixture(); check(zi.k===1&&zi.allow.includes('crew'),'Use actual restricted zone with crew permission');
          const y=q.y; tick(3); check(q.state==='PATROL'&&q.meter===0&&q.y>y+20,'Authorized guard must continue patrol'); results.push('authorized patrol');
          fixture(); P.mode='run';P.moving=true;
          for(let i=0;i<50;i++){G.noise(P.x,P.y,180,'step');tick(.1)}
          check(q.state==='PATROL'&&!q.hearT&&q.meter===0,'Authorized footsteps/running must not repeatedly pull guards off duty'); results.push('authorized footsteps');
          fixture(); q.state='NOTICE';q.why='saw';q.meter=.8;q.poi={x:P.x,y:P.y};q.noticeT=0;
          tick(3);check(q.state==='PATROL'&&q.meter===0,'Innocent visual notice must return to routine');results.push('notice resolves');
          fixture(null);tick(2);check(q.state==='WARN','Unpermitted entry still warns');results.push('trespass warning');
          fixture('waiter');tick(2);check(q.state==='WARN','Wrong uniform cannot grant crew access');results.push('wrong uniform');
          fixture();P.disguiseBlown=true;tick(2);check(q.state==='WARN','Compromised uniform cannot grant access');results.push('compromised uniform');
          fixture();P.captive={};tick(.1);check(q.state==='ALERT'&&P.disguiseBlown,'Witnessed crime overrides permit');results.push('crime detection');
          fixture(null);q.seen=true;G.goAlert(q); const last={...q.lastSeen};
          P.x=q.x+100; P.y=q.y+30; q.a=q.want=Math.PI;
          G.takeProp({outfit:'crew'});
          check(!G.knownFace(q)&&!P.disguiseBlown,'Unseen fresh clothing must not be recognized');
          q.a=q.want=0;tick(1);check(!q.seen&&q.lastSeen.x===last.x&&q.lastSeen.y===last.y,'Pursuer must retain old sighting');
          tick(5);check(q.state!=='ALERT','Pursuit must become last-position search');results.push('unseen change');
          fixture(null);q.seen=true;G.goAlert(q);G.takeProp({outfit:'crew'});
          check(P.disguiseBlown&&G.knownFace(q),'Visible clothing change must be recognized '+JSON.stringify({blown:P.disguiseBlown,known:G.knownFace(q),outfit:P.outfit,disguise:P.disguise,look:q.suspectLook,seen:q.seen,vis:G.canSee(q,P.x,P.y,1,false,false,0)}));results.push('watched change');
          fixture(null);q.seen=true;G.goAlert(q);q.a=q.want=Math.PI;
          const body={outfit:'crew',ch:'sam',stripped:false,x:P.x,y:P.y,fl:0};G.actCarry({k:'dress',c:body});finishHands();
          check(body.stripped&&P.outfit==='crew'&&!P.disguiseBlown&&!G.knownFace(q),'Body clothing must use unseen-change rules');
          fixture(null);q.seen=true;G.goAlert(q);G.actCarry({k:'dress',c:{outfit:'crew',ch:'sam',x:P.x,y:P.y,fl:0}});finishHands();
          check(P.disguiseBlown&&G.knownFace(q),'Body clothing must also be recognized when watched');results.push('body clothing');
          fixture(null);q.radio=true;q.seen=true;G.goAlert(q);const at={...q.lastSeen};
          P.x=q.x+150;P.y=q.y+40;q.a=q.want=Math.PI;G.takeProp({outfit:'crew'});tick(1);
          check(!q.seen&&q.lastSeen.x===at.x&&q.lastSeen.y===at.y,'Radio must not track unseen coordinates');
          G.updateRadioCall(5);check(G.S.alevel===3&&!G.knownFace(q),'Delayed radio must describe old appearance');results.push('radio memory');
          fixture();q.enforcer=true;q.wait=999;q.post=0;q.still=true;q.idleT=999;P.a=Math.PI;tick(3.3);check(P.disguiseBlown&&q.state==='ALERT','Enforcer must still detect close disguise '+JSON.stringify({eye:q.eyeT,state:q.state,blown:P.disguiseBlown,pa:P.a,qa:q.a,d:Math.hypot(q.x-P.x,q.y-P.y)}));results.push('enforcer');
          fixture();P.fl=1;P.captive={};tick(2);check(q.state==='PATROL'&&!q.seen,'Different floor must not witness crime');results.push('floor separation');
          fixture();let wall=false;
          for(let y=1;y<G.MH-1&&!wall;y++)for(let x=2;x<G.MW-2;x++)if(G.tileCh(x,y)==='#'&&!G.solidAt(x-1,y)&&!G.solidAt(x+1,y)){
            q.x=(x-1)*48+24;q.y=y*48+24;q.a=q.want=0;P.x=(x+1)*48+24;P.y=q.y;
            if(G.canSee(q,P.x,P.y,1,false,false,0)===0){wall=true;break}
          }
          check(wall,'Need physical wall fixture');P.captive={};tick(.1);check(!q.seen&&q.state!=='ALERT','Walls must block crime witnesses');results.push('wall separation');
          fixture();const c={x:q.x,y:q.y,fl:0,z:0,base:0,a:0,sweep:0,ph:0,period:10,meter:0,cool:0};G.S.cams=[c];
          G.S.alevel=3;G.S.chaseSeen=true;G.S.knownLooks={face:true};G.updateCams(1);
          check(!c.seen&&c.meter===0,'CCTV must accept unreported permitted appearance');
          P.captive={};G.updateCams(.1);check(c.seen&&c.meter>0,'CCTV must still see crime');results.push('camera identity');
          fixture();G.S.camRoom=null;const reporter={id:999,x:q.x+10,y:q.y,rep:{to:q,x:P.x,y:P.y,saw:'face',kind:'crime'}};
          G.deliverReport(reporter);check(G.S.knownLooks.face&&!G.knownFace(q),'Late face report must not expose new uniform');results.push('resident report identity');
          fixture();G.goSuspicious(q,q.x,q.y,4);q.why='heard';tick(.1);check(q.state==='SUSPICIOUS','Noise investigation must survive valid disguise');results.push('real investigation');
          fixture();q.seen=true;G.goAlert(q);G.takeProp({outfit:'staff'}); // watched: both looks remain known
          check(G.S.knownLooks.crew&&G.S.knownLooks.staff,'Do not forget earlier reported uniforms');results.push('multiple identities');
          G.saveCheckpoint();G.S.knownLooks={};q.suspectLook='face';G.loadCheckpoint();
          check(G.S.knownLooks.crew&&G.S.knownLooks.staff&&G.S.guards[0].suspectLook==='staff','Checkpoint must preserve suspect descriptions');results.push('checkpoint identity');
          return results;
        }''')
        assert not errors, errors
        print('PASS', ', '.join(result))
        await b.close()

asyncio.run(main())
