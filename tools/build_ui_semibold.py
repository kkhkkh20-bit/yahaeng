"""Convert the official OFL 600 face using FontTools and the installed Node Brotli codec.
Usage: python tools/build_ui_semibold.py /path/to/IBMPlexSansKR-SemiBold.ttf
"""
from pathlib import Path
import hashlib,json,subprocess,sys,types
from fontTools.ttLib import TTFont
import fontTools.ttLib.woff2 as woff2
R=Path(__file__).resolve().parents[1]
def main():
 source=Path(sys.argv[1]);f=TTFont(source);assert f['OS/2'].usWeightClass==600
 if not woff2.haveBrotli:
  codec="const z=require('zlib'),a=[];process.stdin.on('data',c=>a.push(c));process.stdin.on('end',()=>process.stdout.write(z.brotliCompressSync(Buffer.concat(a),{params:{[z.constants.BROTLI_PARAM_MODE]:z.constants.BROTLI_MODE_FONT,[z.constants.BROTLI_PARAM_QUALITY]:11}})))"
  woff2.brotli=types.SimpleNamespace(MODE_FONT=2,compress=lambda data,**kw:subprocess.run(['node','-e',codec],input=data,stdout=subprocess.PIPE,check=True).stdout)
  woff2.haveBrotli=True
 out=R/'src/fonts/ui-semibold.woff2';f.flavor='woff2';f.save(out)
 meta={'family':'IBM Plex Sans KR','cssFamily':'Yahaeng UI','weight':600,'format':'woff2','source':'https://github.com/google/fonts/blob/main/ofl/ibmplexsanskr/IBMPlexSansKR-SemiBold.ttf','sourceTtfSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'woff2Sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'license':'OFL-IBMPlexSansKR.txt','coverage':len(f.getBestCmap()),'conversion':'FontTools WOFF2 transform and installed Node Brotli codec; original outlines/naming retained'}
 (R/'src/fonts/ui-semibold.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print('Self-hosted 600 font',out.stat().st_size,'bytes')
if __name__=='__main__':main()
