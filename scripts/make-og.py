"""Картинка для превью ссылки (Open Graph). 1200×630.

Светлый вариант: тёплая бумага, чёрный логотип, тёмный текст.
Запускать после scripts/make-logo.py.
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "public", "img")

W, H = 1200, 630
ACCENT = np.array([44, 70, 58], dtype=float)
ACCENT_SOFT = np.array([62, 97, 82], dtype=float)

FONT_REG = r"C:\Windows\Fonts\consola.ttf"
FONT_BOLD = r"C:\Windows\Fonts\consolab.ttf"


def base():
    t = np.linspace(0, 1, H)[:, None]
    top = np.array([247, 244, 236], dtype=float)[None, :]
    bot = np.array([228, 221, 205], dtype=float)[None, :]
    row = top * (1 - t) + bot * t
    return np.repeat(row[:, None, :], W, axis=1)


def shade(arr, cx, cy, radius, color, strength):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    mask = np.clip(1 - d, 0, 1) ** 2.2 * strength
    return arr * (1 - mask[:, :, None]) + color[None, None, :] * mask[:, :, None]


arr = base()
arr = shade(arr, W * 0.86, H * 0.12, W * 0.6, ACCENT, 0.10)
arr = shade(arr, W * 0.1, H * 1.0, W * 0.5, ACCENT_SOFT, 0.06)
img = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGB")

overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)
d.polygon([(W * 0.62, H), (W * 0.82, 0), (W * 0.93, 0), (W * 0.73, H)], fill=(44, 70, 58, 26))
d.line([(W * 0.30, H), (W, H * 0.28)], fill=(44, 70, 58, 110), width=2)
img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

logo = Image.open(os.path.join(ROOT, "assets", "logo-lockup-dark.png")).convert("RGBA")
target_h = 330
scale = target_h / logo.height
logo = logo.resize((int(logo.width * scale), target_h), Image.LANCZOS)
img.paste(logo, (80, 110), logo)

draw = ImageDraw.Draw(img)
tagline = ImageFont.truetype(FONT_REG, 30)
small = ImageFont.truetype(FONT_BOLD, 20)

draw.text((80, 486), "Сайты: дизайн и разработка", font=tagline, fill=(27, 26, 23))
draw.text((80, 542), "СТРУКТУРА · МАКЕТ · ВЁРСТКА · ЗАПУСК", font=small, fill=(44, 70, 58))

path = os.path.join(IMG, "og.jpg")
img.convert("RGB").save(path, quality=88, optimize=True, subsampling=1)
print("og.jpg", img.size, f"{os.path.getsize(path) // 1024} KB")
