"""Replace only the heroine's atlas cell after a matching costume/head redesign."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);a=p.parse_args()
 dest=R/'src/art/cast';meta=json.loads((dest/'portraits.json').read_text())
 atlas=Image.open(dest/'portraits.webp').convert('RGBA');x,y,w,h=meta['rects']['hero']
 im=Image.open(a.source).convert('RGBA');im.putalpha(im.getchannel('A').point(lambda a:255 if a>=192 else 0));im=im.crop(im.getbbox());im.thumbnail((w-4,h-2),Image.Resampling.LANCZOS)
 atlas.paste(Image.new('RGBA',(w,h)),(x,y));atlas.alpha_composite(im,(x+(w-im.width)//2,y+h-im.height));atlas.save(dest/'portraits.webp',lossless=True,method=6)
 meta['sourceSha256']['hero']=hashlib.sha256(a.source.read_bytes()).hexdigest();meta['heroDesign']='v245 female ninja: tied-back black hair, navy wrap top, burgundy sash'
 (dest/'portraits.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print('Updated only heroine bust; other human portraits and dog assets unchanged')
if __name__=='__main__':main()
