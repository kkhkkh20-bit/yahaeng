"""Original, scalable graphite UI surfaces. No external textures or fonts.
Panels use a 12px nine-slice; the primary action uses the complete octagonal asset.
"""
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'src/art/hud/frames'
STATES={
 'idle':('#969eaa','#292f39','#252a33','#15191f','#68717e'),
 'ready':('#c5ccd7','#4c5666','#303741','#191f27','#aeb6c3'),
 'pressed':('#343c48','#596373','#10151d','#161b23','#333b48'),
 'danger':('#a27b7f','#493138','#302027','#1a161d','#ad777d'),
}
def shape(x,y,w,h,cut):
 return f'M{x+cut} {y}H{x+w-cut}L{x+w} {y+cut}V{y+h-cut}L{x+w-cut} {y+h}H{x+cut}L{x} {y+h-cut}V{y+cut}Z'
def art(state='idle',primary=False,panel=False):
 hi,lo,face1,face2,lip=STATES[state]
 w,h=(160,96)if panel else(96,96)
 cut=20 if primary else 12
 outer=shape(1,1,w-2,h-2,cut)
 bevel=shape(2,2,w-4,h-4,cut-1)
 inset=shape(6,6,w-12,h-12,cut-4)
 face=shape(8,8,w-16,h-16,cut-6)
 # Fine directional grain, barely visible at native thumb-control sizes.
 defs=f'''<defs>
 <linearGradient id="rim" x1="0" y1="0" x2=".65" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="{hi}"/><stop offset=".4" stop-color="#414955"/><stop offset="1" stop-color="{lo}"/></linearGradient>
 <linearGradient id="face" x2="0" y2="1"><stop stop-color="{face1}"/><stop offset="1" stop-color="{face2}"/></linearGradient>
 <pattern id="grain" width="19" height="13" patternUnits="userSpaceOnUse"><path d="M1 2h5m7 6h5M3 12h7" stroke="#dbe2ed" stroke-opacity=".025" stroke-width=".45"/><path d="M7 4h8m-14 6h3" stroke="#000" stroke-opacity=".12" stroke-width=".5"/></pattern>
 <clipPath id="surface"><path d="{face}"/></clipPath></defs>'''
 # A dark outer keyline, light bevel, recessed dark channel, and restrained inner lip.
 body=f'''<path d="{outer}" fill="#05080d"/>
 <path d="{bevel}" fill="url(#rim)"/>
 <path d="{inset}" fill="#090d13" stroke="#a4adbc" stroke-opacity=".12" stroke-width=".6"/>
 <path d="{face}" fill="url(#face)" stroke="{lip}" stroke-opacity=".32" stroke-width=".65"/>
 <g clip-path="url(#surface)"><path d="{face}" fill="url(#grain)"/>
 <path d="M{cut+5} 9H{w-cut-5}" stroke="{hi}" stroke-opacity=".22" stroke-width=".7"/>
 <path d="M{cut+6} {h-9}H{w-cut-6}" stroke="#000" stroke-opacity=".6" stroke-width="1"/></g>'''
 if state=='pressed':body+=f'<path d="{inset}" fill="none" stroke="#02050a" stroke-width="2" opacity=".8"/>'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{defs}{body}</svg>\n'
def circle_art(state):
 hi,lo,face1,face2,lip=STATES[state]
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="rim" x2=".65" y2="1"><stop stop-color="{hi}"/><stop offset="1" stop-color="{lo}"/></linearGradient><linearGradient id="face" x2="0" y2="1"><stop stop-color="{face1}"/><stop offset="1" stop-color="{face2}"/></linearGradient></defs><circle cx="32" cy="32" r="31" fill="#05080d"/><circle cx="32" cy="32" r="30" fill="url(#rim)"/><circle cx="32" cy="32" r="27" fill="#090d13"/><circle cx="32" cy="32" r="25.5" fill="url(#face)" stroke="{lip}" stroke-opacity=".3" stroke-width=".7"/></svg>\n'''
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 for state in STATES:
  (OUT/f'frame-control-{state}.svg').write_text(art(state))
  (OUT/f'frame-primary-{state}.svg').write_text(art(state,primary=True))
 (OUT/'frame-panel.svg').write_text(art(panel=True))
 for state in ['idle','ready','pressed']:(OUT/f'frame-crouch-{state}.svg').write_text(circle_art(state))
 print('Authored 12 graphite frame assets')
if __name__=='__main__':main()
