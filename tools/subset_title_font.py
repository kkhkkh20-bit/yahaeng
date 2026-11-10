"""Keep the title and bounded campaign action labels in the existing OFL display face."""
from pathlib import Path
import hashlib,json
from fontTools import subset
from fontTools.ttLib import TTFont
R=Path(__file__).resolve().parents[1]
SOURCE=R/'src/fonts/display-blackhansans.woff'
LABELS=['야행','처음 시작','이어서 하기','다시 플레이','이야기 완료','도시 테스트','기술 트리','설정','끊어진 보고선']
def main():
 old=TTFont(R/'src/fonts/title-blackhansans.ttf');font=TTFont(SOURCE)
 # The two existing wordmark glyphs must keep their exact original outlines.
 for char in '야행':
  a=old['glyf'][old.getBestCmap()[ord(char)]].getCoordinates(old['glyf'])
  b=font['glyf'][font.getBestCmap()[ord(char)]].getCoordinates(font['glyf'])
  assert a==b,'wordmark outline differs: '+char
 options=subset.Options();options.recalc_timestamp=False
 worker=subset.Subsetter(options=options);worker.populate(text=''.join(LABELS));worker.subset(font);font.flavor=None;font.save(R/'src/fonts/title-blackhansans.ttf')
 metadata={'source':'display-blackhansans.woff','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'license':'OFL-BlackHanSans.txt','labels':LABELS,'wordmarkOutlinesUnchanged':True,'role':'Wordmark, primary title-menu action and three main screen headings; other UI uses IBM Plex Sans KR.'}
 (R/'src/fonts/title-blackhansans.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 print('Title/action subset:',len(font.getBestCmap()),'glyphs')
if __name__=='__main__':main()
