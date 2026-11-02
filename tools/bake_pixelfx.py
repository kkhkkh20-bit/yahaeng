"""Reproduce the selected PixelFX atlas without adding game runtime packages."""
import shutil,subprocess
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/bake_pixelfx.mjs','3'],cwd=R,check=True)
png=R/'src/art/fx/pixelfx.png'
with Image.open(png) as image:
    image.save(R/'src/art/fx/pixelfx.webp',lossless=True,method=6)
shutil.move(png,R/'build/pixelfx-preview/integrated/atlas.png')
print('WebP bytes:',(R/'src/art/fx/pixelfx.webp').stat().st_size)
