"""Recorded score lifecycle and narrative delivery, with native settings inputs.
Controlled objective fixtures exercise story ordering; these are not campaign clears.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=Path(os.environ.get('YH_SCORE_OUT',R/'build/music-v267'));O.mkdir(parents=True,exist_ok=True)
URL=sys.argv[1]if len(sys.argv)>1 else(R/'public/index.html').as_uri()
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'],proxy={'server':os.environ['HTTPS_PROXY']}if URL.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1240,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto(URL);await q.wait_for_function('__game?.officeReady()',polling=100)
   await q.click('#btnHelp');await q.wait_for_function('__game.audioInfo().recorded',polling=100)
   a=await q.evaluate('__game.audioInfo()');assert a['key']=='n_calm'and 56<a['duration']<57 and a['loaded']==['n_calm']and a['effects']>=10,a
   await q.locator('#musicR').focus();await q.keyboard.press('ArrowLeft');assert await q.locator('#musicValue').inner_text()=='65%';assert await q.evaluate('__game.audioInfo().volume===.65')
   await q.click('#btnMute');await q.wait_for_timeout(450);a=await q.evaluate('__game.audioInfo()');assert a['muted']and a['master']<.001,a
   await q.click('#btnMute');await q.wait_for_timeout(450);a=await q.evaluate('__game.audioInfo()');assert not a['muted']and .89<a['master']<.91,a
   await q.evaluate("__game.setMusic('n_tense');__game.setMusic('n_fight');__game.setMusic('n_calm');__game.setMusic('n_fight')")
   await q.wait_for_function('__game.audioInfo().loaded.length===3&&__game.audioInfo().key==="n_fight"',polling=100);a=await q.evaluate('__game.audioInfo()');assert a['recorded']and 29<a['duration']<30 and not a['failed'],a
   await q.evaluate("__game.say([['master','무전 중에는 음악을 낮춘다.']],false);__game.updateMusicMix()")
   assert await q.evaluate('__game.audioInfo().duck===.38')
   await q.evaluate('for(let i=0;i<4;i++)__game.advanceDialog();__game.updateMusicMix()');assert await q.evaluate('__game.audioInfo().duck===1')
   await q.locator('#musicR').fill('0');await q.wait_for_timeout(550);a=await q.evaluate('__game.audioInfo()');assert a['bus']<.02 and a['master']>.89,a
   await q.locator('#musicR').fill('65');await q.evaluate('document.fonts.ready');await q.screenshot(path=str(O/f'settings-{mobile}.png'))
   story=await q.evaluate('''()=>{const G=__game,ids=['tB','p0','e2','m2','m4','m6','m7','m5','n1'],out=[];
    for(const id of ids){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const T=G.STAGE,S=G.S;
     if(!T.story.before||!T.story.after||!T.storyCoda.lines.length)throw Error('missing story '+id);
     const prior=JSON.stringify([S.items.map(i=>i.got),S.player,S.stats]);
     for(const beat of T.storyBeats){const old=beat.when;beat.when=()=>true;S.t+=10;const m=G.episodeStoryMessage();if(!m||m.storyBeat!==beat.id)throw Error('beat ordering '+id);G.acknowledgeEpisodeStory(m);const until=S.episodeStory.active.until;S.t+=.5;G.acknowledgeEpisodeStory(m);if(S.episodeStory.active.until!==until)throw Error('repeated HUD renews story forever');if(Object.keys(S.episodeStory.seen).filter(k=>k===beat.id).length!==1)throw Error('duplicate beat');S.t+=10;G.episodeStoryMessage();beat.when=old;}
     if(prior!==JSON.stringify([S.items.map(i=>i.got),S.player,S.stats]))throw Error('dialogue grants progress '+id);
     out.push({id,beats:T.storyBeats.length,lines:T.storyCoda.lines.length});
    }
    const cell=G.STAGES.find(s=>s.id==='m6'),van=G.STAGES.find(s=>s.id==='m4');
    if(/기억이 끊|깨어난|철수 장소에서 붙잡/.test(JSON.stringify([cell.story,cell.brief,van.storyCoda])))throw Error('old forced capture remains');
    if(!cell.bare||!cell.keyItems.some(k=>k.key==='gear')||!cell.keyItems.some(k=>k.key==='pin'))throw Error('prison entry no longer matches physical state');
    if(!G.CASE_SOURCES.find(s=>s.id==='trade').text.includes('호송비'))throw Error('account foreshadow missing');
    return out;}''')
   assert not errors,errors;rows.append({'mobile':mobile,'audio':a,'story':story});print('PASS score/story',mobile,a,flush=True);await q.close()
  # A failed score request must retain actual game audio and select a fallback.
  q=await b.new_page();await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.route('**/*.mp3',lambda r:r.abort());await q.goto(URL);await q.wait_for_function('!!window.__game',polling=100);await q.click('#btnHelp');await q.wait_for_function('__game.audioInfo().failed.includes("n_calm")&&__game.audioInfo().key==="n_calm"',polling=100);fallback=await q.evaluate('__game.audioInfo()');assert not fallback['recorded']and fallback['master']>0;print('PASS offline score fallback',fallback,flush=True);await b.close()
 (O/'checks.json').write_text(json.dumps({'devices':rows,'fallback':fallback},ensure_ascii=False,indent=2))
asyncio.run(main())
