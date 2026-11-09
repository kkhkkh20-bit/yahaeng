"""Exported wrists, visible pixels, feet and the actual unscaled arm chains agree."""
import json,math
from pathlib import Path
from PIL import Image

R=Path(__file__).resolve().parents[2]
HERO=['heroAgent','heroAgentCrew','heroAgentWorker','heroAgentFormal']
def ease(x):
 x=max(0,min(1,x));return x*x*(3-2*x)
def main():
 m=json.loads((R/'build/pr/pr_meta.json').read_text());count=0;worst=0;pixelWorst=0
 for body in HERO:
  name=body+'CabinetMotion';bm=m['bodies'][name];profile=bm['cabinetProfile'];image=Image.open(R/'build/pr'/('body_'+name+'.webp')).convert('RGBA')
  assert image.size==(68*64,8*64) and profile['standShift']==-18
  assert bm['ik']['fixed']==0 and bm['ik']['length']<1e-3 and bm['ik']['contact']<.05
  for anim,(col,n)in bm['anims'].items():
   assert m['fluidBodies'][body][anim]==name and n==17
   wide=anim.endswith('Wide');width=40 if wide else 16;angle=math.pi/4 if wide else math.pi*.42
   scale=bm['scales'][anim];ground=bm['grounds'][anim]
   for row in range(8):
    for i in range(n):
     tile=image.crop(((col+i)*64,row*64,(col+i+1)*64,(row+1)*64));box=tile.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();count+=1
     assert box and min(box[:2])>0 and max(box[2:])<64,(body,anim,row,i,'clipped')
     feet=bm[anim+'Feet'][row];assert all(math.dist(feet[i][h],feet[0][h])<1e-7 for h in range(2)),(body,anim,row,i,'feet moved')
     p=i/16;weight=ease((p-.14)/.1)*ease((.84-p)/.12)
     if row!=6 or weight!=1:continue
     opening=ease((p-.24)/.42);opening=1-opening if 'Close'in anim else opening;theta=opening*angle
     for side,(hx,hy)in enumerate(bm[anim+'Hands'][row][i]):
      actual=((hx-32)*scale,13+(hy-ground)*scale)
      # Both purchased steel and wood leaves fit the same authored motion.
      for wood in [False,True]:
       w=width+int(wood);off=3.75 if side else 5.25;sign=1 if side else -1
       desired=(sign*(w-(w-off)*math.cos(theta)),profile['baseY']-.44*int(wood)+18+9*math.sin(theta)*(1-off/w))
       e=math.dist(actual,desired);worst=max(worst,e);assert e<2,(body,anim,i,side,wood,e)
      pixels=[]
      for y in range(max(0,int(hy)-3),min(64,int(hy)+4)):
       for x in range(max(0,int(hx)-3),min(64,int(hx)+4)):
        if tile.getpixel((x,y))[3]>128:pixels.append((x+.5,y+.5))
      pe=min((math.dist((hx,hy),v)*scale for v in pixels),default=999);pixelWorst=max(pixelWorst,pe)
      assert pe<2,(body,anim,i,side,'wrist has no visible hand pixels',pe)
 print('PASS cabinet real-arm sprites',json.dumps({'frames':count,'maxPurchasedHandleError':worst,'maxVisiblePixelDistance':pixelWorst,'fixedBodyAndFeet':True,'armLengthsPreserved':True}))

if __name__=='__main__':main()
