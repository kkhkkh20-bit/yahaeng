# 야행 화면 크기(48px = 1칸)로 Kenney Retro Urban Kit 골목 시안을 찍는다: 낮/밤, 3/4 정면 투영
import asyncio, sys, io
sys.path.insert(0,'/root/game/tools/prerender/kenney_ruk')
from scene import render
from PIL import Image
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/bgshots/'
it=[]
def A(n,x,z,r=0,y=0,s=None):
    d={'n':n,'x':x+0.5,'z':z+0.5,'r':r,'y':y}
    if s: d['s']=s
    it.append(d)
def light(x,z,y,c,i=6,d=5): it.append({'light':1,'x':x,'z':z,'y':y,'color':c,'i':i,'d':d})
W,Hh=22,15
# 바닥: 뒤 보도(z=7), 도로(z=8..10), 앞 보도(z=11), 앞 건물 줄(z=12..)
for x in range(-1,W+1):
    for z in range(-6,7): A('road-asphalt-pavement',x,z)
    A('road-asphalt-side',x,7,2); A('road-asphalt-center',x,8); A('road-asphalt-center',x,9); A('road-asphalt-side',x,10,0)
    for z in range(11,17): A('road-asphalt-pavement',x,z)
def bld(x0,x1,z0,z1,h,wall='a',door=None,paint=False):
    for f in range(h):
        for x in range(x0,x1+1):
            for z in range(z0,z1+1):
                front=(z==z1)
                n=f'wall-{wall}'
                if front:
                    if f==0 and door is not None and x==door: n=f'wall-{wall}-door'
                    elif f==0 and door is not None and x==door+2 and wall=='a': n='wall-a-garage'
                    elif (x-x0)%2==1 or f>0: n=f'wall-{wall}-window'
                A(n,x,z,2,f)
    it.append({'slab':[x0,z0,x1+1,z1+1],'y':h,'color':{'a':0x50525a,'b':0x5a4e48}[wall]})
# 뒤 건물 셋 (앞면 z=6)
bld(0,6,1,6,3,'a',door=2); bld(8,12,3,6,2,'b',door=10); bld(14,20,0,6,4,'a',door=17)
# 2층 발코니·사다리, 차양, 케이블
for x in (1,3,5): A('balcony-type-a',x,6.45,2,1)
A('detail-awning-wide',10,6.35,2,0.75); A('detail-awning-small',2,6.3,2,0.8)
# 앞 건물 (앞면 z=15, 지붕만 보이게)
bld(3,9,12,15,2,'b',door=None); bld(15,21,12,15,1,'a')
# 소품: 가로등, 쓰레기통, 트럭, 나무, 벤치, 바리케이드
for x in (4,12,19): A('detail-light-single',x,7.1,2)
A('detail-dumpster-closed',7,6.2,2); A('detail-dumpster-open',13,6.3,2)
A('truck-grey',16,9,1); A('tree-small',11,11.6); A('detail-bench',6,11.2,0); A('detail-barrier-type-a',1,10.6,0); A('pallet',13,5,0)
A('detail-cables-type-a',7,6,2,2)
day=list(it)
night=list(it)
for x in (4,12,19): night.append({'light':1,'x':x+0.5,'z':8.0,'y':1.1,'color':0xffc070,'i':7,'d':4.5})
for (x,z,y,c) in [(10.5,7.3,0.9,0xff3fa0),(2.5,7.2,0.6,0x40e0ff),(17.5,7.2,1.5,0x7f6bff),(6.5,12.0,0.8,0xff3050)]: night.append({'light':1,'x':x,'z':z,'y':y,'color':c,'i':5,'d':3.5})
for (x,f) in [(1,1),(5,2),(15,3),(19,1),(9,1)]: night.append({'light':1,'x':x+0.5,'z':7.2,'y':f+0.5,'color':0xffd890,'i':2.2,'d':1.6})
spec=lambda items,n: {'W':22*48*2,'H':13*48*2,'ppu':96,'night':n,'items':items,'cx':11,'cz':6.5+0.5,'oblique':True}
imgs=asyncio.run(render([spec(day,False),spec(night,True)]))
for name,b in zip(['ruk_day','ruk_night'],imgs):
    im=Image.open(io.BytesIO(b)).convert('RGB'); im=im.resize((im.width//2,im.height//2),Image.LANCZOS); im.save(OUT+name+'.png'); print(name, im.size)
