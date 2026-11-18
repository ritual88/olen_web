"""Готовит логотип для сайта.

Источник: assets/logo-source.png — чёрный рисунок на белом фоне.

На выходе в public/img:
  logo-wordmark-*.png — только надпись «Ольга Кисурина»
  logo-mark-*.png     — только персонаж
  logo-lockup-*.png   — персонаж + надпись
  *-light — белый вариант (для тёмного фона), *-dark — чёрный (для светлого)

Белый вариант: альфа = 255 − яркость, цвет = белый.
Чёрный: то же, но цвет = чёрный. Исходник и так чёрный, но так мы убираем
белый фон и сохраняем сглаживание краёв.
"""

import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "logo-source.png")
OUT = os.path.join(ROOT, "public", "img")
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert("RGBA")
gray = np.array(src.convert("L"), dtype=np.uint8)

# Убираем сердечко на кружке: закрашиваем его чёрным, как саму кружку.
HEART_BOX = (157, 431, 191, 471)
gray[HEART_BOX[1] : HEART_BOX[3], HEART_BOX[0] : HEART_BOX[2]] = 0

# Граница между рисунком и надписью в исходнике 768×768.
# Резать выше нельзя — срезается завиток буквы «О».
split = 487


def to_rgba(crop_gray, color):
    alpha = 255 - crop_gray
    h, w = crop_gray.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = color[0]
    rgba[:, :, 1] = color[1]
    rgba[:, :, 2] = color[2]
    rgba[:, :, 3] = alpha
    return rgba


def trim(rgba):
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(ys) == 0:
        return rgba
    return rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def save(name, rgba, target_h):
    img = Image.fromarray(rgba, "RGBA")
    scale = target_h / img.height
    img = img.resize((max(1, int(img.width * scale)), target_h), Image.LANCZOS)
    path = os.path.join(OUT, name)
    img.save(path, optimize=True)
    print(f"{name}: {img.size}, {os.path.getsize(path) // 1024} KB")


for suffix, color in (("light", (255, 255, 255)), ("dark", (17, 17, 17))):
    mark = trim(to_rgba(gray[:split, :], color))
    word = trim(to_rgba(gray[split:, :], color))
    lockup = trim(to_rgba(gray, color))

    save(f"logo-wordmark-{suffix}.png", word, 140)
    save(f"logo-mark-{suffix}.png", mark, 360)
    save(f"logo-lockup-{suffix}.png", lockup, 600)

# Иконка: голова персонажа
top = to_rgba(gray[:split, :], (255, 255, 255))
icon = trim(top)
save("favicon-source.png", icon, 128)
