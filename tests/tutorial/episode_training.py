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
