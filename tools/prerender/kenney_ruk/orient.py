import asyncio, sys
sys.path.insert(0,'/root/game/tools/prerender/kenney_ruk')
from scene import render
names=['wall-a-window','wall-a-door','wall-a-corner','wall-b-window','wall-a-roof','wall-a-flat-window','balcony-type-a','detail-awning-small','road-asphalt-side']
items=[]
for i,n in enumerate(names):
    for r in range(4): items.append({'n':n,'x':i*1.6,'z':r*1.6,'r':r})
imgs=asyncio.run(render([{'W':1400,'H':560,'ppu':96,'night':False,'items':items,'cx':6.4,'cz':2.4}]))
open('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/bgshots/orient.png','wb').write(imgs[0])
