import asyncio, sys, io
sys.path.insert(0,'/root/game/tools/prerender/kenney_ruk')
from scene import render
from PIL import Image, ImageDraw
names=sys.argv[1].split(',')
rots=[int(r) for r in sys.argv[2].split(',')] if len(sys.argv)>2 else [2]
it=[]
for i,n in enumerate(names):
    for j,r in enumerate(rots):
        it.append({'n':n,'x':i*2+0.5,'z':j*2.5+1.5,'r':r})
cols=len(names)
imgs=asyncio.run(render([{'W':cols*2*64,'H':len(rots)*int(2.5*64),'ppu':64,'night':False,'items':it,'cx':cols,'cz':len(rots)*1.25,'oblique':True}]))
im=Image.open(io.BytesIO(imgs[0])).convert('RGB'); d=ImageDraw.Draw(im)
for i,n in enumerate(names): d.text((i*128+2,2),n[:20],fill=(255,255,0))
im.save('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/bgshots/pieces.png'); print(im.size)
