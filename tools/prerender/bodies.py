# 주민 체형 변형 (얼굴 없이 실루엣으로 구분): 비율(뼈 xz 굵기·키·숙임) + 부품. 좌표는 차렷 자세(정면 +z) 세계 좌표, 키 528 기준
# 부품 색 k: hair(머리색) · shirt(윗옷) · pants(아래옷) · shoes(소품: 가방·헬멧·지팡이)
FEM = {'h': 0.9, 'xz': {'Spine2': 0.88, 'Neck': 1 / 0.88, 'Hips': 1.07, 'Spine': 1 / 1.07}}
HAIR_LONG = {'g': 'box', 's': [104, 140, 34], 'at': [-9, 445, 2], 'bone': 'Head', 'k': 'hair'}  # 어깨까지 내려오고 양옆으로 보이게
SKIRT = {'g': 'cyl', 's': [44, 96, 128], 'at': [0, 236, 2], 'bone': 'Hips', 'k': 'pants'}  # 무릎 위까지, 끝이 넓게 퍼진다
BODIES = {
  'big':    {'xz': {'Hips': 1.16, 'Spine1': 1.16, 'Neck': 1 / (1.16 * 1.16)}},
  'fLong':  dict(FEM, parts=[HAIR_LONG, SKIRT]),
  'fBob':   dict(FEM, parts=[{'g': 'sph', 's': [50], 'at': [-9, 480, 30], 'sc': [1.08, 0.82, 1.0], 'bone': 'Head', 'k': 'hair'}]),
  'fTail':  dict(FEM, parts=[{'g': 'cyl', 's': [15, 9, 86], 'at': [-9, 452, -14], 'rx': 0.38, 'bone': 'Head', 'k': 'hair'}, SKIRT]),
  'old':    {'h': 0.95, 'bend': {'Spine1': 0.34, 'Neck': -0.18}, 'parts': [{'g': 'cyl', 's': [4, 4, 236], 'at': [-103, 124, -60], 'bone': 'RightHand', 'k': 'shoes'}]},
  'coat':   {'parts': [{'g': 'cyl', 's': [50, 60, 176], 'at': [0, 250, 0], 'bone': 'Hips', 'k': 'shirt'}]},
  'pack':   {'parts': [{'g': 'box', 's': [76, 94, 36], 'at': [0, 360, -44], 'bone': 'Spine2', 'k': 'shoes'},
                       {'g': 'cyl', 's': [48, 48, 20], 'at': [-9, 516, 44], 'bone': 'Head', 'k': 'shirt'}, {'g': 'box', 's': [62, 6, 46], 'at': [-9, 508, 92], 'bone': 'Head', 'k': 'shirt'}]},
  'kid':    {'h': 0.68, 'xz': {'Spine': 0.92, 'Neck': 1 / 0.92}, 'head': 1.28},  # 아이: 작은 키, 큰 머리 비율 (손댈 수 없는 인물)
  'helmet': {'parts': [{'g': 'sph', 's': [56], 'at': [-9, 488, 42], 'sc': [1, 0.86, 1.06], 'bone': 'Head', 'k': 'shoes'}]},
}
# 주민 시트에 넣는 동작만 (주인공·자경대원 전용 동작은 빼서 용량을 줄인다)
BODY_ANIMS = {'kid': ['idle', 'walk', 'run', 'crouch']}  # 아이는 쓰러지거나 붙잡히는 동작이 없다  # 아이는 쓰러지거나 붙잡히는 동작이 없다
CIV_ANIMS = ['idle', 'walk', 'run', 'crouch', 'death', 'carried', 'carriedI', 'held', 'heldI', 'lifted', 'stabbed', 'choked']
BODY_ANIMS['helmet'] = CIV_ANIMS + ['hold', 'holdI']  # 택배 기사: 상자 들고 걷기
