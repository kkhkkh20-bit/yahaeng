"""Import a generated, two-cell transparent item sheet into native-size pixel props."""
import argparse,json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[2]
def main():
 a=argparse.ArgumentParser();a.add_argument('source',type=Path);args=a.parse_args()
 src=Image.open(args.source).convert('RGBA');out=R/'src/art/field-items'
 meta=json.loads((out/'meta.json').read_text())
 for i,key in enumerate(['cigarettes','radio']):
  im=src.crop((i*src.width//2,0,(i+1)*src.width//2,src.height))
  im.putalpha(im.getchannel('A').point(lambda a:255 if a>=230 else 0))
  box=im.getbbox()
  if box is None:raise ValueError('Empty item: '+key)
  im=im.crop(box);h=32;w=round(im.width*h/im.height)
  im=im.resize((w,h),Image.Resampling.NEAREST);im.save(out/(key+'.webp'),lossless=True)
  meta[key]={'ox':-w/2,'oy':-h+4,'w':w,'h':h}
 (out/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
if __name__=='__main__':main()
