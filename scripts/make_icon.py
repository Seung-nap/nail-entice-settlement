# 앱 아이콘 생성 — 네일엔티스 인스타그램 프로필 로고 원본(build/logo-source.png)에서 만든다
# 사용: python scripts/make_icon.py  → build/icon.png(512) · build/icon.ico · public/brand.png · public/icon.png
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(ROOT, 'build', 'logo-source.png')).convert('RGB')

# 원 영역: 크림색 픽셀의 경계 → 중심·반지름
px = src.load()
w, h = src.size
pts = [(x, y) for y in range(h) for x in range(w) if px[x, y][0] > 235 and px[x, y][1] > 225 and px[x, y][2] > 200]
x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, min(x1 - x0, y1 - y0) / 2 - 1.5

S = 1024
logo = src.crop((cx - r, cy - r, cx + r, cy + r)).resize((S, S), Image.LANCZOS)
# 원본 캡처의 압축 얼룩 제거: 크림 배경과 거의 같은 픽셀은 단색 크림으로 정리
from collections import Counter
lp = logo.load()
bg = Counter(lp[x, y] for x in range(S // 2 - 300, S // 2 + 300, 7) for y in (S // 2 - 330, S // 2 + 340)).most_common(1)[0][0]
for y in range(S):
    for x in range(S):
        p = lp[x, y]
        if max(abs(p[i] - bg[i]) for i in range(3)) < 16:
            lp[x, y] = bg
logo = logo.filter(ImageFilter.UnsharpMask(radius=3, percent=80, threshold=2))

# 매끄러운 원형 마스크(4배 슈퍼샘플)
m = Image.new('L', (S * 4, S * 4), 0)
ImageDraw.Draw(m).ellipse((0, 0, S * 4 - 1, S * 4 - 1), fill=255)
mask = m.resize((S, S), Image.LANCZOS)

# 아이콘 캔버스: 살짝 여백 + 부드러운 그림자
C = 1024
pad = 36
inner = C - pad * 2
canvas = Image.new('RGBA', (C, C), (0, 0, 0, 0))
sh = Image.new('RGBA', (C, C), (0, 0, 0, 0))
ImageDraw.Draw(sh).ellipse((pad + 6, pad + 22, C - pad - 6, C - pad + 10), fill=(74, 46, 31, 80))
canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
disc = logo.convert('RGBA').resize((inner, inner), Image.LANCZOS)
disc.putalpha(mask.resize((inner, inner), Image.LANCZOS))
canvas.alpha_composite(disc, (pad, pad))

os.makedirs(os.path.join(ROOT, 'public'), exist_ok=True)
canvas.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icon.png'))
canvas.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icon.ico'), sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)])
flat = logo.convert('RGBA'); flat.putalpha(mask)                      # 앱 안 로고: 그림자 없는 원형
flat.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'brand.png'))
canvas.resize((64, 64), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'icon.png'))
print('ok', (round(cx), round(cy), round(r)))
