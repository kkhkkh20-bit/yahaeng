"""Keep the title and bounded campaign action labels in the existing OFL display face."""
from pathlib import Path
import hashlib,json
from fontTools import subset
from fontTools.ttLib import TTFont
R=Path(__file__).resolve().parents[1]
SOURCE=R/'src/fonts/display-blackhansans.woff'
LABELS=['야행','처음 시작','이어서 하기','다시 플레이','이야기 완료','도시 테스트','기술 트리','설정','끊어진 보고선','장부 털기','VIP','잔칫날','돈줄','검은 연락선','배신','새벽배송','밤의 도시','연습 2 · 제압과 몸 숨기기','연습 4 · 고급','연습 3 · 신분','닫힌 배차실','연습 5 · 암살 기술','연습 6 · 현장 도구','연습 7 · 은신 기습','의뢰 02 준비 · 빛과 그림자','의뢰 02 준비 · 실내와 계단','의뢰 01 준비 · 복장과 CCTV','닫힌 철문','녹화된 얼굴','지붕 위의 장부','윗층의 장부','불 꺼진 출고동','야간 기록실','끊어진 회선','창가의 중개인','마지막 이름','현장 정보','스토리 모드','자유 모드','자유 모드 · 을지로','종로 유흥가','을지로 인쇄골목','동대문 시장','청계천 상가','신당동 주택가','중구 관청가','성수 공장지대','청계천']
def main():
 old=TTFont(R/'src/fonts/title-blackhansans.ttf');font=TTFont(SOURCE)
 # The two existing wordmark glyphs must keep their exact original outlines.
 for char in '야행':
  a=old['glyf'][old.getBestCmap()[ord(char)]].getCoordinates(old['glyf'])
  b=font['glyf'][font.getBestCmap()[ord(char)]].getCoordinates(font['glyf'])
  assert a==b,'wordmark outline differs: '+char
 options=subset.Options();options.recalc_timestamp=False
 worker=subset.Subsetter(options=options);worker.populate(text=''.join(LABELS));worker.subset(font);font.flavor=None;font.save(R/'src/fonts/title-blackhansans.ttf')
 metadata={'source':'display-blackhansans.woff','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'license':'OFL-BlackHanSans.txt','labels':LABELS,'wordmarkOutlinesUnchanged':True,'role':'Wordmark, primary title-menu action main screen and mission briefing headings; other UI uses IBM Plex Sans KR.'}
 (R/'src/fonts/title-blackhansans.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 print('Title/action subset:',len(font.getBestCmap()),'glyphs')
if __name__=='__main__':main()
