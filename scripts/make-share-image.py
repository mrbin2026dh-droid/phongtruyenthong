"""17/11: ảnh xem trước khi chia sẻ đường dẫn (Zalo / Facebook / Messenger) — 1200×630, Open Graph.

  python -I -X utf8 scripts/make-share-image.py <ảnh chụp phòng 3D (rộng ≥ 1600 px)>
Ra: public/og/chia-se.jpg. Chữ chỉ dùng lại các dòng đã có trên website (tên phòng, tên trường, mô tả, nút).
Ảnh nền: chụp phòng 3D thật bằng card đồ họa (toàn cảnh tường Ban Giám hiệu).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); WEB = os.path.dirname(HERE)
SRC = sys.argv[1]
OUT = os.path.join(WEB, 'public', 'og'); os.makedirs(OUT, exist_ok=True)
UF = os.path.expanduser('~/AppData/Local/Microsoft/Windows/Fonts'); WF = 'C:/Windows/Fonts'
def font(path, size): return ImageFont.truetype(path, size)
TRAJAN, CENTUR = os.path.join(UF, 'UTM Trajan Pro Bold.ttf'), os.path.join(UF, 'UTM Centur.ttf')
SEMI, REG = os.path.join(WF, 'seguisb.ttf'), os.path.join(WF, 'segoeui.ttf')
W, H = 1200, 630
TEAL, GOLD, GOLD_L, CREAM = (11, 36, 40), (201, 165, 96), (251, 230, 176), (240, 232, 214)

# hall photo on the right 70 %, scaled to cover, aisle (centre of the shot) at ~66 % of the card
hall = Image.open(SRC).convert('RGB')
s = max(W * .80 / hall.width, H * 1.22 / hall.height); hall = hall.resize((round(hall.width * s), round(hall.height * s)), Image.LANCZOS)   # less ceiling, portraits larger
card = Image.new('RGB', (W, H), TEAL)
x0 = round(W * .70 - hall.width / 2); y0 = round(-H * .14)
card.paste(hall, (x0, y0))
# left fade: solid teal under the text, dissolving into the photo
fade = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(fade)
for x in range(W):
    t = (x - W * .40) / (W * .24); a = 255 if t <= 0 else (0 if t >= 1 else int(255 * (1 - t) ** 1.6))
    fd.line([(x, 0), (x, H)], fill=a)
card = Image.composite(Image.new('RGB', (W, H), TEAL), card, fade)
# soft vignette top/bottom so the card edges read in Zalo's white chat bubble
vig = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(vig)
for y in range(H):
    e = min(y, H - 1 - y) / 60; vd.line([(0, y), (W, y)], fill=int(90 * max(0, 1 - e)))
card = Image.composite(Image.new('RGB', (W, H), (4, 16, 18)), card, vig)
d = ImageDraw.Draw(card)

def gold(xy, text, f):
    box = d.textbbox((0, 0), text, font=f, anchor='lt'); tw, th = box[2] - box[0] + 10, box[3] - box[1] + 10
    m = Image.new('L', (tw, th), 0); ImageDraw.Draw(m).text((5 - box[0], 5 - box[1]), text, font=f, fill=255, anchor='lt')
    g = Image.new('RGB', (1, th))
    for yy in range(th):
        t = yy / max(1, th - 1); a, b = (GOLD_L, GOLD) if t < .55 else (GOLD, (176, 139, 69)); k = t / .55 if t < .55 else (t - .55) / .45
        g.putpixel((0, yy), tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    g = g.resize((tw, th)); card.paste(Image.new('RGB', (tw, th), (2, 12, 14)), (xy[0] + 3, xy[1] + 3), m.point(lambda v: int(v * .6))); card.paste(g, xy, m)
    return xy[1] + th

L = 64
d.text((L, 92), 'TRƯỜNG THCS CHU VĂN AN', font=font(TRAJAN, 26), fill=GOLD_L, anchor='ls')
d.text((L, 124), 'XÃ ĐĂK HÀ · TỈNH QUẢNG NGÃI', font=font(SEMI, 18), fill=(214, 196, 150), anchor='ls')
d.rectangle([L, 146, L + 64, 149], fill=GOLD)
y = gold((L - 4, 172), 'PHÒNG', font(TRAJAN, 80))
y = gold((L - 4, y - 4), 'TRUYỀN THỐNG', font(TRAJAN, 48))
d = ImageDraw.Draw(card)
d.text((L, y + 30), 'NHÀ TRƯỜNG ẢO 3D', font=font(SEMI, 24), fill=CREAM, anchor='ls')
desc = ['Tham quan phòng truyền thống 3D: chân dung', 'cán bộ, giáo viên, nhân viên qua các thế hệ.']
for k, line in enumerate(desc): d.text((L, y + 76 + k * 30), line, font=font(REG, 21), fill=(222, 214, 196), anchor='ls')
# CTA pill like the site's gold button
py = y + 128; pf = font(SEMI, 22); label = 'Bắt đầu tham quan  →'
tw = d.textlength(label, font=pf); d.rounded_rectangle([L, py, L + tw + 48, py + 50], radius=25, fill=(226, 190, 118))
d.text((L + 24, py + 25), label, font=pf, fill=(18, 45, 56), anchor='lm')
card.save(os.path.join(OUT, 'chia-se.jpg'), quality=88, optimize=True, progressive=True)
print('saved', os.path.join(OUT, 'chia-se.jpg'), os.path.getsize(os.path.join(OUT, 'chia-se.jpg')) // 1024, 'KB')
