"""Pack the approved/generated eight-direction head art for offline animation baking."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);a=p.parse_args();im=Image.open(a.source).convert('RGBA');out=Image.new('RGBA',(192,24));frames=[]
 for i in range(8):
  part=im.crop((i*im.width//8,0,(i+1)*im.width//8,im.height))
  # Generated transparent padding can contain alpha=1 specks. They are not art
  # bounds and must not shrink the actual head to a few pixels when packing.
  box=part.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox()
  if not box:raise ValueError(('empty head',i))
  part=part.crop(box);part.thumbnail((20,20),Image.Resampling.NEAREST)
  x=i*24+(24-part.width)//2;y=(24-part.height)//2;out.alpha_composite(part,(x,y));frames.append({'rect':[i*24,0,24,24],'visible':[x-i*24,y,part.width,part.height]})
 dest=ROOT/'tools/prerender/agent_art';dest.mkdir(exist_ok=True);out.save(dest/'heads.png',optimize=True)
 (dest/'heads.json').write_text(json.dumps({'origin':'Original generated female ninja head sheet, redesigned for the existing animation rig','design':'Adult female, swept fringe, compact tied-back ponytail, copper clasp','sourceSha256':hashlib.sha256(a.source.read_bytes()).hexdigest(),'directions':['E','SE','S','SW','W','NW','N','NE'],'frames':frames},indent=2)+'\n')
 print('Packed 8 directions, 24px cells, 20px visible head bounds')
if __name__=='__main__':main()
