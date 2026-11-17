"""17/11: ảnh xem trước khi chia sẻ đường dẫn (Zalo / Facebook / Messenger) — 1200×630, Open Graph.

  python -I -X utf8 scripts/make-share-image.py <ảnh nền (rộng ≥ 1600 px)>
Ra: public/og/chia-se.jpg.
Bản 2 (người dùng: bỏ dòng mô tả, “thiết kế lại cho đẹp”): ảnh sân trường phủ kín khung, lớp xanh đậm tan dần từ trái
(không còn đường ranh), khung viền vàng mảnh có góc hình thoi như tranh khảm, khối chữ căn giữa theo chiều dọc.
Chữ chỉ dùng lại các dòng đã có trên website (tên trường, tên phòng, “Nhà trường ảo 3D”, nút “Bắt đầu tham quan”).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); WEB = os.path.dirname(HERE)
SRC = sys.argv[1]
OUT = os.path.join(WEB, 'public', 'og'); os.makedirs(OUT, exist_ok=True)
UF = os.path.expanduser('~/AppData/Local/Microsoft/Windows/Fonts'); WF = 'C:/Windows/Fonts'
def font(path, size): return ImageFont.truetype(path, size)
TRAJAN = os.path.join(UF, 'UTM Trajan Pro Bold.ttf'); SEMI = os.path.join(WF, 'seguisb.ttf')
W, H = 1200, 630
TEAL, GOLD, GOLD_L, GOLD_D, CREAM = (10, 34, 38), (201, 165, 96), (251, 230, 176), (176, 139, 69), (240, 232, 214)

# ---------------------------------------------------------------- photo: full bleed, school building on the right two thirds
photo = Image.open(SRC).convert('RGB')
s = max(W * 1.04 / photo.width, H / photo.height); photo = photo.resize((round(photo.width * s), round(photo.height * s)), Image.LANCZOS)
x0 = round(W * .67 - photo.width / 2); x0 = min(round(W * .28), max(W - photo.width, x0))   # left edge may sit under the solid veil
card = Image.new("RGB", (W, H), TEAL); card.paste(photo, (x0, 0))

# ---------------------------------------------------------------- deep teal veil from the left, eased (no visible seam)
veil = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(veil)
for x in range(W):
    t = x / W
    a = 248 if t < .30 else (0 if t > .70 else int(248 * (1 - ((t - .30) / .40)) ** 2.2))
    vd.line([(x, 0), (x, H)], fill=a)
card = Image.composite(Image.new('RGB', (W, H), TEAL), card, veil)
# gentle darkening at the top/bottom edges so the gold frame reads on the photo
edge = Image.new('L', (W, H), 0); ed = ImageDraw.Draw(edge)
for y in range(H):
    e = min(y, H - 1 - y) / 110; ed.line([(0, y), (W, y)], fill=int(120 * max(0, 1 - e) ** 1.5))
card = Image.composite(Image.new('RGB', (W, H), (4, 15, 17)), card, edge)

d = ImageDraw.Draw(card)
# ---------------------------------------------------------------- thin double gold frame with diamond corners
for inset, wd in ((18, 2), (25, 1)):
    d.rectangle([inset, inset, W - 1 - inset, H - 1 - inset], outline=GOLD, width=wd)
for (cx, cy) in ((18, 18), (W - 19, 18), (18, H - 19), (W - 19, H - 19)):
    r = 8; d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=GOLD)

def gold(xy, text, f, shadow=3):
    box = d.textbbox((0, 0), text, font=f, anchor='lt'); tw, th = box[2] - box[0] + 10, box[3] - box[1] + 10
    m = Image.new('L', (tw, th), 0); ImageDraw.Draw(m).text((5 - box[0], 5 - box[1]), text, font=f, fill=255, anchor='lt')
    g = Image.new('RGB', (1, th))
    for yy in range(th):
        t = yy / max(1, th - 1); a, b = (GOLD_L, GOLD) if t < .55 else (GOLD, GOLD_D); k = t / .55 if t < .55 else (t - .55) / .45
        g.putpixel((0, yy), tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    g = g.resize((tw, th)); card.paste(Image.new('RGB', (tw, th), (2, 12, 14)), (xy[0] + shadow, xy[1] + shadow), m.point(lambda v: int(v * .65))); card.paste(g, xy, m)
    return xy[1] + th - 10

def spaced(xy, text, f, fill, track):
    x, y = xy
    for ch in text: d.text((x, y), ch, font=f, fill=fill, anchor='ls'); x += d.textlength(ch, font=f) + track
    return x

# ---------------------------------------------------------------- text block, vertically centred in the frame
L = 78; top = 132
d.text((L, top), 'TRƯỜNG THCS CHU VĂN AN', font=font(TRAJAN, 25), fill=GOLD_L, anchor='ls')
spaced((L, top + 30), 'XÃ ĐĂK HÀ  ·  TỈNH QUẢNG NGÃI', font(SEMI, 15), (214, 196, 150), 1.6)
y = top + 58; d.line([(L, y), (L + 52, y)], fill=GOLD, width=2); d.polygon([(L + 62, y - 5), (L + 67, y), (L + 62, y + 5), (L + 57, y)], fill=GOLD)
d.line([(L + 72, y), (L + 124, y)], fill=GOLD, width=2)
y = gold((L - 4, top + 84), 'PHÒNG', font(TRAJAN, 84))
y = gold((L - 3, y + 4), 'TRUYỀN THỐNG', font(TRAJAN, 52))
d = ImageDraw.Draw(card)
spaced((L, y + 40), 'NHÀ TRƯỜNG ẢO 3D', font(SEMI, 21), CREAM, 4.2)
# CTA pill like the site's gold button (soft shadow, gradient)
py = y + 74; pf = font(SEMI, 21); label = 'Bắt đầu tham quan'; tw = d.textlength(label, font=pf); pw, ph = int(tw + 92), 50
sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([L + 2, py + 6, L + pw + 2, py + ph + 6], radius=25, fill=150)
card = Image.composite(Image.new('RGB', (W, H), (2, 10, 12)), card, sh.filter(ImageFilter.GaussianBlur(8)))
pill = Image.new('RGB', (pw, ph)); pd = ImageDraw.Draw(pill)
for xx in range(pw):
    t = xx / pw; pd.line([(xx, 0), (xx, ph)], fill=tuple(int((240, 209, 141)[i] + ((214, 176, 106)[i] - (240, 209, 141)[i]) * t) for i in range(3)))
pm = Image.new('L', (pw, ph), 0); ImageDraw.Draw(pm).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=25, fill=255)
card.paste(pill, (L, py), pm); d = ImageDraw.Draw(card)
d.text((L + 28, py + ph / 2 + 1), label, font=pf, fill=(18, 45, 56), anchor='lm')
ax = L + 28 + tw + 18; ay = py + ph / 2
d.line([(ax, ay), (ax + 22, ay)], fill=(18, 45, 56), width=2); d.line([(ax + 15, ay - 7), (ax + 22, ay), (ax + 15, ay + 7)], fill=(18, 45, 56), width=2)
card.save(os.path.join(OUT, 'chia-se.jpg'), quality=88, optimize=True, progressive=True)
print('saved', os.path.join(OUT, 'chia-se.jpg'), os.path.getsize(os.path.join(OUT, 'chia-se.jpg')) // 1024, 'KB')
