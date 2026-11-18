"""Р“РµРЅРµСЂР°С†РёСЏ Р°Р±СЃС‚СЂР°РєС‚РЅС‹С… РёР·РѕР±СЂР°Р¶РµРЅРёР№-Р·Р°РіР»СѓС€РµРє РІ РїР°Р»РёС‚СЂРµ СЃР°Р№С‚Р°.

Р­С‚Рѕ РЅРµ С„РѕС‚РѕРіСЂР°С„РёРё Рё РЅРµ С‡СѓР¶РёРµ СЂР°Р±РѕС‚С‹ вЂ” Р·Р°РїРѕР»РЅРёС‚РµР»Рё, С‡С‚РѕР±С‹ РІС‘СЂСЃС‚РєР° РЅРµ РІС‹РіР»СЏРґРµР»Р°
РїСѓСЃС‚РѕР№. РџРµСЂРµРґ Р·Р°РїСѓСЃРєРѕРј Р·Р°РјРµРЅСЏСЋС‚СЃСЏ РЅР° СЂРµР°Р»СЊРЅС‹Рµ РєР°РґСЂС‹.
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "img")
os.makedirs(OUT, exist_ok=True)

SIGNAL = np.array([104, 112, 242], dtype=float)
SIGNAL_HI = np.array([154, 162, 255], dtype=float)


def base_gradient(w, h, top=(26, 29, 46), bottom=(9, 10, 17)):
    t = np.linspace(0, 1, h)[:, None]
    row = np.array(top, dtype=float)[None, :] * (1 - t) + np.array(bottom, dtype=float)[None, :] * t
    return np.repeat(row[:, None, :], w, axis=1)


def glow(arr, cx, cy, radius, color, strength):
    h, w, _ = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    mask = np.clip(1 - d, 0, 1) ** 2.2 * strength
    return arr + color[None, None, :] * mask[:, :, None]


def make(w, h, seed):
    r = np.random.default_rng(seed)
    arr = base_gradient(w, h)

    arr = glow(arr, w * 0.80, h * 0.22, w * 0.60, SIGNAL, 0.55)
    arr = glow(arr, w * 0.22, h * 0.92, w * 0.50, SIGNAL_HI, 0.10)

    img = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGB")

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # РґРёР°РіРѕРЅР°Р»СЊРЅР°СЏ РїРѕР»РѕСЃР°
    d.polygon(
        [(w * 0.42, h * 1.05), (w * 0.62, -h * 0.05), (w * 0.78, -h * 0.05), (w * 0.58, h * 1.05)],
        fill=(104, 112, 242, 46),
    )
    # РІС‚РѕСЂР°СЏ, С‚РѕРЅСЊС€Рµ
    d.polygon(
        [(w * 0.20, h * 1.05), (w * 0.40, -h * 0.05), (w * 0.44, -h * 0.05), (w * 0.24, h * 1.05)],
        fill=(154, 162, 255, 26),
    )
    # СЂРµР¶СѓС‰Р°СЏ Р»РёРЅРёСЏ
    d.line([(0, h * 0.78), (w, h * 0.28)], fill=(154, 162, 255, 120), width=2)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.5))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)

    # СЃРµС‚РєР°
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = 80
    for x in range(0, w, step):
        gd.line([(x, 0), (x, h)], fill=(255, 255, 255, 9), width=1)
    for y in range(0, h, step):
        gd.line([(0, y), (w, y)], fill=(255, 255, 255, 7), width=1)
    img = Image.alpha_composite(img, grid).convert("RGB")

    arr = np.array(img, dtype=float)
    arr = np.clip(arr + r.normal(0, 2.4, (h, w, 1)).repeat(3, axis=2), 0, 255)

    yy = np.linspace(-1, 1, h)[:, None]
    xx = np.linspace(-1, 1, w)[None, :]
    vignette = np.clip(1.10 - 0.22 * (xx**2 + yy**2), 0, 1)[:, :, None]
    arr = np.clip(arr * vignette, 0, 255)

    return Image.fromarray(arr.astype("uint8"), "RGB")


def save(name, img, quality=84):
    path = os.path.join(OUT, name)
    img.save(path, quality=quality, optimize=True, subsampling=1)
    print(name, img.size, f"{os.path.getsize(path) // 1024} KB")


save("hero.jpg", make(1600, 900, 11), 84)
save("about.jpg", make(1200, 900, 23), 84)
save("og.jpg", make(1200, 630, 31), 86)

