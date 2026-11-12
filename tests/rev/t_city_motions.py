"""Free mode on a phone: walk into the phone booth and out again, walk to the car door and climb in, get out through the door,
drive by dragging toward where you want to go (like walking), jump out of a burning car, and die with the car if you stay in."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f)f()}};tick(.3);return G.traffic.isTouch}'''
BOOTH = '''()=>{const G=__game,S=G.S,P=S.player;const p=S.phones.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];
  P.x=p.x-44;P.y=p.y+6;S.ringPhone=p;S.ringT0=S.t;tick(.1);const k=G.envAction().k;G.actEnv();
  const walk=[];let inAt=null;tick(1.4,()=>{if(P.trav)walk.push(Math.round(P.x));if(P.booth&&inAt==null)inAt=S.t});
  const inBooth=!!P.booth;while(G.DLG.modal)G.advanceDialog();const out=[];tick(1,()=>{if(P.trav)out.push(Math.round(P.x))});
  return {k,walkSteps:walk.length,walkMono:walk.every((x,i)=>i==0||x>=walk[i-1]-1),inBooth,outSteps:out.length,outside:!P.booth&&P.x<p.x-20}}'''
CAR = '''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic;P.trav=null;
  const v=S.vehicles.filter(v=>!v.dead&&!v.chase&&(v.z||0)<.01).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];
  v.ai=false;v.v=0;v.driver=false;P.x=v.x+Math.cos(v.a-Math.PI/2)*90;P.y=v.y+Math.sin(v.a-Math.PI/2)*90;
  for(const o of S.vehicles)if(o!==v&&Math.hypot(o.x-v.x,o.y-v.y)<300){o.x+=4000;o.ai=false;}
  T.carEnter(v);const enter=[];let door=0;tick(1.5,()=>{if(P.trav)enter.push([P.x,P.y]);if(v.doorT&&Math.abs(S.t-v.doorT)<.4)door++});
  const inCar=P.car===v;T.carExit();const exit=[];tick(1,()=>{if(P.trav)exit.push(1)});const outCar=!P.car&&Math.hypot(P.x-v.x,P.y-v.y)>30;
  return {enterSteps:enter.length,inCar,doorFrames:door,exitSteps:exit.length,outCar,id:v.id}}'''
DRIVE = '''(dir)=>{const G=__game,S=G.S,P=S.player,T=G.traffic,v=S.vehicles.find(o=>o.id===%s);
  const St=G.STAGE,T0=48,ry=St.roadsY[2],rx=St.roadsX[2];P.trav=null;P.car=v;v.dead=false;v.hp=9;v.fireT=0;
  v.x=(rx+4)*T0+6*T0;v.y=(ry+2)*T0;v.z=0;v.a=0;v.va=0;v.v=0;v.rev=false;const [mx,my]=dir;
  for(let i=0;i<45;i++){if(P.car!==v)break;T.updateDriving(P,mx,my,1,1/60);}return {a:+v.a.toFixed(2),v:Math.round(v.v),inCar:P.car===v}}'''
FIRE = '''(stay)=>{const G=__game,S=G.S,P=S.player,T=G.traffic,v=S.vehicles.find(o=>o.id===%s);
  S.downing=null;P.defeat=null;P.hp=P.hpMax;P.hurtT=0;P.trav=null;P.car=v;v.dead=false;v.burn=0;v.v=0;v.hp=1;v.fireT=0;v.ai=false;v.parked=false;
  tick(.5);const burning=v.fireT>0,label=G.envAction().label,carAt=P.car===v;
  if(!stay){G.actEnv();tick(.8);const out=!P.car;for(let i=0;i<4;i++){if(!P.car)P.x+=60}tick(6);return{burning,label,out,dead:!!S.downing,boom:v.dead,hp:P.hp}}
  let seenDown=false,defeat=false;tick(9,()=>{if(S.downing)seenDown=true;if(P.defeat)defeat=true});return{burning,label,carAt,boom:v.dead,seenDown,defeat,inCar:!!P.car,respawned:!S.downing&&P.hp===P.hpMax,hp:P.hp,down:S.downing,t:S.t,ov:S.over,run:G.STAGE.id}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(**p.devices['iPhone 13']); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        def ok(v, m):
            if not v: bad.append(m)
        touch = await q.evaluate(SETUP); ok(touch, 'not a touch device')
        pad = await q.evaluate('''()=>{__game.updateHUD(true);return [...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().width>0).map(b=>b.id+':'+b.textContent.trim())}''')
        print('pad', pad)
        ok(not any(x.split(':')[0] in ('btnCrouch','btnTool','btnToolNext','btnGrab','quickStone','quickCoin') for x in pad), 'stealth buttons still shown in free mode: %s' % pad)
        ok(any(x.startswith('btnAct:') and '공격' in x for x in pad) and any(x.startswith('btnCarry:') for x in pad), 'free-mode pad lacks attack/action: %s' % pad)
        bo = await q.evaluate(BOOTH); print('booth', bo); ok(bo['k'] == 'hitPhone' and bo['walkSteps'] > 10 and bo['walkMono'] and bo['inBooth'] and bo['outSteps'] > 10 and bo['outside'], 'booth walk in/out missing: %s' % bo)
        car = await q.evaluate(CAR); print('car', car)
        ok(car['enterSteps'] > 15 and car['inCar'] and car['doorFrames'] > 5 and car['exitSteps'] > 15 and car['outCar'], 'car enter/exit motion missing: %s' % car)
        vid = car['id']
        for name, d, want in [('right', [1, 0], 0), ('down', [0, 1], 0.9), ('left', [-1, 0], 3.14)]:
            r = await q.evaluate(DRIVE % vid, d); print('drive', name, r)
            import math
            diff = abs((r['a'] - want + math.pi) % (2 * math.pi) - math.pi)
            if name == 'left': ok(r['v'] < 0, 'drag behind should reverse: %s' % r)
            elif name == 'down': ok(r['v'] > 30 and r['a'] > 0.3, 'drag down does not turn the car toward it: %s' % r)
            else: ok(r['v'] > 60 and diff < 0.3, 'car does not go where you drag (%s): %s' % (name, r))
        esc = await q.evaluate(FIRE % vid, False); print('escape', esc)
        ok(esc['burning'] and esc['label'] == '뛰어내리기!' and esc['out'] and esc['boom'] and not esc['dead'], 'could not jump out of a burning car: %s' % esc)
        stay = await q.evaluate(FIRE % vid, True); print('stay', stay)
        ok(stay['boom'] and stay['seenDown'] and stay['defeat'] and stay['respawned'], 'staying in the burning car did not kill and respawn: %s' % stay)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
