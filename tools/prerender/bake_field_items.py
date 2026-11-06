"""Offline original field-item art; Blender never runs in the browser."""
from pathlib import Path
import json,subprocess
from PIL import Image
R=Path(__file__).resolve().parents[2];TMP=R/'build/field-items-bake';OUT=R/'src/art/field-items'
subprocess.run(['blender','--background','--factory-startup','--python',str(R/'tools/prerender/field_items_scene.py'),'--',str(TMP)],check=True)
OUT.mkdir(parents=True,exist_ok=True);meta=json.loads((TMP/'meta.json').read_text())
for key,a in meta.items():
 im=Image.open(TMP/(key+'.png')).convert('RGBA');im=im.resize((round(im.width/2),round(im.height/2)),Image.Resampling.LANCZOS);box=im.getbbox();assert box,key;im=im.crop(box);im.save(OUT/(key+'.webp'),lossless=True);a.update(ox=round(a['ox']+box[0],3),oy=round(a['oy']+box[1],3),w=im.width,h=im.height)
(OUT/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
