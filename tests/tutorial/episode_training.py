"""Native purchases for episode-end tests; this order is test data, not UI advice."""
async def spend_episode_points(page):
    await page.locator('#skillScreen').wait_for(state='visible')
    # Avoid changing movement speed before the subsequent native route checks.
    plan=['kit','dart','kunai','smoke','silentHands','reach','ambush','lookout','quietStep','quietCrouch','swiftCrouch']
    bought=[]
    for _ in range(40):
        state=await page.evaluate('__game.campaignSkillState()')
        if not state['canLearn']:break
        skill=next((id for id in plan if id in state['choices']),state['choices'][0])
        if await page.locator('.skill-detail-close').is_visible():await page.click('.skill-detail-close')
        await page.click(f'[data-select="{skill}"]')
        await page.click(f'[data-learn="{skill}"]')
        assert await page.evaluate('id=>__game.loadSkillTree().learned.includes(id)',skill),skill
        bought.append(skill)
    else:raise AssertionError('Point spending did not terminate')
    if await page.locator('.skill-detail-close').is_visible():await page.click('.skill-detail-close')
    assert not (await page.evaluate('__game.campaignSkillState()'))['canLearn']
    return bought

async def continue_episode(page):
    bought=await spend_episode_points(page)
    await page.click('#btnSkillsBack')
    return bought

async def standalone_stage(page,id,brief=True):
    """Explicit fixture setup, bypassing only linear episode order, never actors/rules."""
    await page.evaluate('({id,brief})=>__game.start(__game.STAGES.findIndex(s=>s.id===id),brief)',{'id':id,'brief':brief})

async def acquire_uniform(page,controls,tag='uniformDonor'):
    g=await page.evaluate('tag=>{const g=__game.S.guards.find(g=>g.tag===tag);if(!g)throw Error("No authored uniform donor "+tag);return{x:g.x,y:g.y,a:g.a}}',tag)
    import math
    safe_y=await page.evaluate('y=>Math.min(y,(__game.STAGE.H-2)*48+24)',g['y']+120)
    await controls.move(y=safe_y)
    await controls.move(x=g['x']-math.cos(g['a'])*80)
    if await page.evaluate('__game.S.player.mode')!='sneak':await controls.press('Control','#btnCrouch')
    await controls.move(g['x']-math.cos(g['a'])*80,g['y']-math.sin(g['a'])*80)
    if await page.evaluate('__game.S.player.mode')!='sneak':await controls.press('Control','#btnCrouch')
    await controls.move(g['x']-math.cos(g['a'])*32,g['y']-math.sin(g['a'])*32)
    ready="tag=>{const a=__game.attackAction();return a.k!=='none'&&(a.list||[a.g]).some(g=>g?.tag===tag)}"
    if not await page.evaluate(ready,tag):await controls.move(g['x']-math.cos(g['a'])*28,g['y']-math.sin(g['a'])*28)
    assert await page.evaluate(ready,tag),'Rear contact is not in reach'
    await controls.press('z','#btnAct')
    await page.wait_for_function('tag=>{const g=__game.S.guards.find(g=>g.tag===tag);return g.unconscious&&!__game.actionBusy()}',arg=tag,timeout=7000)
    if await page.evaluate('__game.envAction().k')!='dress':
        if controls.mobile:await page.tap('#btnCycle')
        else:await page.keyboard.press('Shift+Tab')
        await page.locator('[data-env-token^="dress:"]').first.click()
    await controls.press('x','#btnCarry')
    await page.wait_for_function('__game.S.player.outfit==="crew"&&!__game.actionBusy()',timeout=7000)
    assert await page.evaluate('tag=>__game.S.guards.find(g=>g.tag===tag).stripped',tag)
    if await page.evaluate('__game.S.player.mode')=='sneak':await controls.press('Control','#btnCrouch')
