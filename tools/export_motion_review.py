"""Publish compact, real-renderer GIFs and native-input video excerpts."""
import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];B=R/'build/hero-motion-v191';O=R/'docs/hero-motion-v191';O.mkdir(exist_ok=True)
def animated(path):
 im=Image.open(path);frames=[]
 for i in range(im.n_frames):im.seek(i);frames.append(im.convert('RGB').copy())
 return frames
def save(frames,path,duration=50):
 pal=frames[0].quantize(colors=128);out=[f.quantize(palette=pal,dither=Image.Dither.NONE)for f in frames]
 out[0].save(path,save_all=True,append_images=out[1:],duration=duration,loop=0,optimize=True,disposal=2)
def clip(video,start,duration,out,filter):
 graph=f'[0:v]{filter},fps=16,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle[out]'
 subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(max(0,start)),'-t',str(duration),'-i',str(video),'-filter_complex',graph,'-map','[out]','-loop','0',str(O/out)],check=True)
a=animated(B/'before/locomotion.gif');b=animated(B/'round-2/locomotion.gif');comparison=[]
for left,right in zip(a,b):
 out=Image.new('RGB',(660,670),'#101820');d=ImageDraw.Draw(out);d.text((8,5),'BEFORE / v190',fill='#cad6df');d.text((8,340),'AFTER / v191',fill='#cad6df');out.paste(left.resize((660,315),Image.Resampling.NEAREST),(0,20));out.paste(right.resize((660,315),Image.Resampling.NEAREST),(0,355));comparison.append(out)
save(comparison,O/'locomotion-before-after.gif')
for name in ['takedowns','interaction']:
 frames=animated(B/f'round-2/{name}.gif');save(frames,O/(name+'.gif'))
for name,folder in [('pc',B/'live'),('mobile',B/'mobile-final')]:
 report=json.loads((folder/f'{name}.json').read_text());assert report['passed'],name
 times={r['label']:r['videoSeconds'] for r in report['rows']};start=times['body-knockout']-1.25;end=times['body-hidden']+.15
 clip(folder/f'{name}.webm',start,end-start,f'native-{name}-takedown-carry.gif','crop=640:360:(iw-640)/2:(ih-360)/2,scale=640:360:flags=neighbor'if name=='pc'else'crop=360:280:(iw-360)/2:310,scale=540:420:flags=neighbor')
 (O/f'native-{name}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
vip=json.loads((B/'vip/v191-walk.json').read_text());row=vip[0];dressing=next(x['at']for x in row['milestones']if x['kind']=='pickup');work=next(x['at']for x in row['milestones']if x['kind']=='camCable')
clip(B/'vip/v191-pc.webm',dressing-.3,4.2,'native-disguise.gif','crop=360:250:(iw-360)/2:(ih-250)/2,scale=540:375:flags=neighbor')
clip(B/'vip/v191-pc.webm',work-.2,3.3,'native-cctv-work.gif','crop=360:250:(iw-360)/2:(ih-250)/2,scale=540:375:flags=neighbor')
(O/'native-vip.json').write_text(json.dumps(vip,ensure_ascii=False,indent=2));(O/'motion-checks.json').write_bytes((B/'motion-checks.json').read_bytes())
print({p.name:p.stat().st_size for p in O.iterdir()},flush=True)
