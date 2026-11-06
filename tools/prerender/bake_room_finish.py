"""Bake verified CC0 models and authored fixtures to 2D WebP. Blender is build-time only."""
import json,subprocess,sys
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[2];TMP=R/'build/room-finish-bake';OUT=R/'src/art/room-finish'
subprocess.run(['blender','--background','--factory-startup','--python',str(R/'tools/prerender/room_finish_scene.py'),'--',str(TMP),*sys.argv[1:]],check=True)
OUT.mkdir(parents=True,exist_ok=True);rendered=json.loads((TMP/'meta.json').read_text());meta=json.loads((OUT/'meta.json').read_text()) if (OUT/'meta.json').exists() else {}
for key,a in rendered.items():
 im=Image.open(TMP/(key+'.png')).convert('RGBA');im=im.resize((round(im.width/2),round(im.height/2)),Image.Resampling.LANCZOS);box=im.getbbox()
 if not box:raise ValueError('Empty rendered asset '+key)
 im=im.crop(box);im.save(OUT/(key+'.webp'),lossless=True);a.update(ox=round(a['ox']+box[0],3),oy=round(a['oy']+box[1],3),w=im.width,h=im.height);meta[key]=a
(OUT/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Finished',len(meta),'sprites',sum(p.stat().st_size for p in OUT.glob('*.webp')),'bytes')
