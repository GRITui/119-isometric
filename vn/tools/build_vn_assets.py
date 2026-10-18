#!/usr/bin/env python3
"""Build vn/assets: portraits.png (6 bust-up portraits) + bg_shop.png + bg_platform.png
+ bg_apartment.png (copy of iso render) + atlas.json.

Deterministic procedural pixel art on a locked palette. Re-runnable.
"""
import json
import os
import shutil
from PIL import Image

ROOT = "/Users/grit/.hermes/kanban/boards/team-room/shared/119-isometric"
OUT = os.path.join(ROOT, "vn", "assets")
os.makedirs(OUT, exist_ok=True)

# ---------------- palette (locked) ----------------
BG      = "#05070d"   # dark base
TEAL    = "#5eead4"   # neon accent
TEAL_D  = "#2a7a6e"   # dim teal
PANEL   = "#1c2b33"   # panel/border line
TEXT    = "#d8e2e8"
GREY    = "#6b7d85"
GREY_D  = "#3a464e"
GREY_XD = "#141a20"
SKIN    = "#e8c39e"
SKIN_D  = "#c49a72"
HAIR_K  = "#1a1f24"   # kenji hair
HAIR_M  = "#3a2a22"   # mina hair (dark brown)
HAIR_D  = "#0e1114"   # daichi hair (near black)
SUIT_K  = "#232a33"   # kenji suit
SUIT_KL = "#39424d"   # kenji suit light
TIE     = "#0f6b5c"   # kenji tie (teal family)
SHIRT_M = "#cfd8dd"   # mina shirt
SHIRT_MD= "#9aa7ad"
BLAZER_D= "#1a2027"   # daichi blazer
BLAZER_DL= "#2c343d"
SHIRT_D = "#d8e2e8"
WARM_L  = "#f3d9a8"   # warm lamp light
WARM_M  = "#e0b98a"
WARM_D  = "#8a6b4e"
WARM_XD = "#4a3826"
WOOD_S  = "#6b5440"
WOOD_B  = "#8a6b4e"
WOOD_L  = "#c19a6b"
INK     = "#0a0e14"   # deepest shadow
PAPER   = "#e8e2d4"   # receipt/paper
GLOW    = "#7ff5e3"   # bright teal glow

def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

PALETTE = [BG, TEAL, TEAL_D, PANEL, TEXT, GREY, GREY_D, GREY_XD,
           SKIN, SKIN_D, HAIR_K, HAIR_M, HAIR_D, SUIT_K, SUIT_KL, TIE,
           SHIRT_M, SHIRT_MD, BLAZER_D, BLAZER_DL, SHIRT_D,
           WARM_L, WARM_M, WARM_D, WARM_XD, WOOD_S, WOOD_B, WOOD_L,
           INK, PAPER, GLOW]
PAL_SET = {hx(c) for c in PALETTE}

def mix(c1, c2, t):
    a = hx(c1) if isinstance(c1, str) else c1
    b = hx(c2) if isinstance(c2, str) else c2
    return (round(a[0] + (b[0]-a[0])*t), round(a[1] + (b[1]-a[1])*t),
            round(a[2] + (b[2]-a[2])*t))

def clamp255(v):
    return max(0, min(255, v))

def quant(c):
    """Quantize an RGB tuple to the nearest palette entry (Euclidean)."""
    best = None
    bd = None
    for p in PAL_SET:
        d = (c[0]-p[0])**2 + (c[1]-p[1])**2 + (c[2]-p[2])**2
        if bd is None or d < bd:
            bd = d
            best = p
    return best

def rgb(c):
    if isinstance(c, str):
        c = hx(c)
    return (clamp255(c[0]), clamp255(c[1]), clamp255(c[2]))

# ---------------- low-res canvas helpers ----------------
class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.px = {}
        if bg is not None:
            self.fill_rect(0, 0, w, h, bg)

    def fill_rect(self, x, y, w, h, color):
        c = quant(rgb(color))
        for j in range(y, y + h):
            for i in range(x, x + w):
                if 0 <= i < self.w and 0 <= j < self.h:
                    self.px[(i, j)] = c

    def vline(self, x, y0, y1, color):
        c = quant(rgb(color))
        for j in range(y0, y1):
            if 0 <= x < self.w and 0 <= j < self.h:
                self.px[(x, j)] = c

    def hline(self, y, x0, x1, color):
        c = quant(rgb(color))
        for i in range(x0, x1):
            if 0 <= i < self.w and 0 <= y < self.h:
                self.px[(i, y)] = c

    def dot(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[(x, y)] = quant(rgb(color))

    def outline_rect(self, x, y, w, h, color):
        self.hline(y, x, x + w, color)
        self.hline(y + h - 1, x, x + w, color)
        self.vline(x, y, y + h, color)
        self.vline(x + w - 1, y, y + h, color)

    def to_image(self, scale=1):
        im = Image.new("RGB", (self.w, self.h))
        data = im.load()
        for i in range(self.w):
            for j in range(self.h):
                data[i, j] = self.px.get((i, j), (0, 0, 0))
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        return im

# ---------------- portrait drawing (low-res 64x64, scale 4 -> 256) ----------------
def draw_face(cv, cx, cy, skin, hair, expr, char):
    """Bust-up face centered at (cx, cy) in low-res coords.
    expr: neutral / tired / warm / anxious
    """
    # neck
    cv.fill_rect(cx - 3, cy + 9, 6, 4, skin)
    cv.fill_rect(cx - 3, cy + 9, 6, 1, mix(skin, INK, 0.35))
    # head block
    cv.fill_rect(cx - 7, cy - 8, 14, 17, skin)
    # jaw shading
    cv.fill_rect(cx - 7, cy + 6, 14, 2, mix(skin, INK, 0.25))
    # ears
    cv.fill_rect(cx - 8, cy - 1, 1, 3, skin)
    cv.fill_rect(cx + 7, cy - 1, 1, 3, skin)
    # hair cap (per character)
    if char == "kenji":
        cv.fill_rect(cx - 8, cy - 9, 16, 4, hair)
        cv.fill_rect(cx - 8, cy - 5, 2, 4, hair)
        cv.fill_rect(cx + 6, cy - 5, 2, 4, hair)
        cv.fill_rect(cx - 8, cy - 9, 16, 1, mix(hair, TEAL, 0.15))
    elif char == "mina":
        cv.fill_rect(cx - 8, cy - 9, 16, 5, hair)
        cv.fill_rect(cx - 9, cy - 4, 3, 12, hair)
        cv.fill_rect(cx + 6, cy - 4, 3, 12, hair)
        cv.fill_rect(cx - 9, cy + 8, 3, 4, hair)
        cv.fill_rect(cx + 6, cy + 8, 3, 4, hair)
        cv.fill_rect(cx - 8, cy - 9, 16, 1, mix(hair, WARM_L, 0.2))
    else:  # daichi
        cv.fill_rect(cx - 8, cy - 9, 16, 4, hair)
        cv.fill_rect(cx - 8, cy - 5, 1, 3, hair)
        cv.fill_rect(cx + 7, cy - 5, 1, 3, hair)
        cv.fill_rect(cx - 8, cy - 9, 16, 1, mix(hair, TEAL, 0.1))

    # eyes (row cy-2)
    ey = cy - 2
    if expr == "neutral":
        cv.fill_rect(cx - 5, ey, 3, 2, INK)
        cv.fill_rect(cx + 2, ey, 3, 2, INK)
        cv.dot(cx - 5, ey, TEAL)
        cv.dot(cx + 2, ey, TEAL)
    elif expr == "tired":
        cv.fill_rect(cx - 5, ey + 1, 3, 1, INK)
        cv.fill_rect(cx + 2, ey + 1, 3, 1, INK)
        cv.fill_rect(cx - 5, ey + 2, 3, 1, mix(skin, "#8a4a3a", 0.4))
        cv.fill_rect(cx + 2, ey + 2, 3, 1, mix(skin, "#8a4a3a", 0.4))
    elif expr == "warm":
        cv.fill_rect(cx - 5, ey, 3, 1, INK)
        cv.fill_rect(cx + 2, ey, 3, 1, INK)
        cv.dot(cx - 5, ey, GLOW)
        cv.dot(cx + 2, ey, GLOW)
    elif expr == "anxious":
        cv.fill_rect(cx - 5, ey, 3, 2, INK)
        cv.fill_rect(cx + 2, ey, 3, 2, INK)
        cv.dot(cx - 4, ey, TEAL)
        cv.dot(cx + 3, ey, TEAL)
        # raised brow
        cv.fill_rect(cx - 5, ey - 2, 3, 1, mix(skin, INK, 0.4))
        cv.fill_rect(cx + 2, ey - 2, 3, 1, mix(skin, INK, 0.4))

    # mouth (row cy+4)
    my = cy + 4
    if expr == "neutral":
        cv.fill_rect(cx - 2, my, 4, 1, mix(skin, INK, 0.45))
    elif expr == "tired":
        cv.fill_rect(cx - 1, my + 1, 3, 1, mix(skin, INK, 0.45))
    elif expr == "warm":
        cv.fill_rect(cx - 2, my, 4, 1, mix(skin, INK, 0.5))
        cv.dot(cx - 2, my - 1, mix(skin, INK, 0.3))
        cv.dot(cx + 1, my - 1, mix(skin, INK, 0.3))
    elif expr == "anxious":
        cv.fill_rect(cx - 2, my, 4, 1, mix(skin, INK, 0.5))
        cv.dot(cx - 2, my + 1, mix(skin, INK, 0.3))
        cv.dot(cx + 1, my + 1, mix(skin, INK, 0.3))

    # blush for warm
    if expr == "warm":
        cv.dot(cx - 6, cy + 1, mix(skin, "#c47a5a", 0.5))
        cv.dot(cx + 6, cy + 1, mix(skin, "#c47a5a", 0.5))

def draw_bust(cv, char, expr):
    """Draw a full bust-up portrait into a 64x64 canvas, bottom-anchored."""
    cv.fill_rect(0, 0, 64, 64, BG)
    # faint grid
    for i in range(0, 64, 16):
        cv.vline(i, 0, 64, mix(BG, TEAL, 0.05))
        cv.hline(i, 0, 64, mix(BG, TEAL, 0.05))

    cx, cy = 32, 30
    if char == "kenji":
        skin, hair = SKIN, HAIR_K
        # shoulders / suit
        cv.fill_rect(14, 44, 36, 20, SUIT_K)
        cv.fill_rect(14, 44, 36, 2, SUIT_KL)
        cv.fill_rect(14, 44, 4, 20, mix(SUIT_K, INK, 0.3))
        cv.fill_rect(46, 44, 4, 20, mix(SUIT_K, INK, 0.3))
        # collar V
        cv.fill_rect(28, 44, 8, 6, SHIRT_D)
        cv.fill_rect(30, 44, 4, 6, TIE)
        cv.fill_rect(31, 44, 2, 8, TIE)
        # lapels
        cv.fill_rect(24, 44, 4, 10, SUIT_KL)
        cv.fill_rect(36, 44, 4, 10, SUIT_KL)
    elif char == "mina":
        skin, hair = SKIN, HAIR_M
        # shoulders / shirt
        cv.fill_rect(16, 46, 32, 18, SHIRT_M)
        cv.fill_rect(16, 46, 32, 2, mix(SHIRT_M, TEAL, 0.15))
        cv.fill_rect(16, 46, 3, 18, mix(SHIRT_M, INK, 0.25))
        cv.fill_rect(45, 46, 3, 18, mix(SHIRT_M, INK, 0.25))
        # collar
        cv.fill_rect(27, 46, 10, 4, SHIRT_MD)
        # teal accent pin
        cv.dot(22, 50, TEAL)
        cv.dot(41, 50, TEAL)
    else:  # daichi
        skin, hair = SKIN, HAIR_D
        # shoulders / blazer
        cv.fill_rect(15, 45, 34, 19, BLAZER_D)
        cv.fill_rect(15, 45, 34, 2, BLAZER_DL)
        cv.fill_rect(15, 45, 4, 19, mix(BLAZER_D, INK, 0.3))
        cv.fill_rect(45, 45, 4, 19, mix(BLAZER_D, INK, 0.3))
        # collar
        cv.fill_rect(28, 45, 8, 5, SHIRT_D)
        cv.fill_rect(25, 45, 3, 9, BLAZER_DL)
        cv.fill_rect(36, 45, 3, 9, BLAZER_DL)
        # sweat drop (anxious)
        if expr == "anxious":
            cv.dot(44, 22, TEAL)
            cv.dot(44, 23, mix(TEAL, BG, 0.3))

    draw_face(cv, cx, cy, skin, hair, expr, char)

    # bottom fade
    for j in range(60, 64):
        t = (j - 60) / 4
        for i in range(64):
            if (i, j) in cv.px:
                c = cv.px[(i, j)]
                cv.px[(i, j)] = quant(mix_rgb(c, hx(BG), t))

def mix_rgb(c1, c2, t):
    return (round(c1[0] + (c2[0]-c1[0])*t),
            round(c1[1] + (c2[1]-c1[1])*t),
            round(c1[2] + (c2[2]-c1[2])*t))

# ---------------- portraits sheet ----------------
def build_portraits():
    order = ["kenji_neutral", "kenji_worn", "mina_neutral", "mina_warm",
             "daichi_neutral", "daichi_anxious"]
    expr_map = {"kenji_neutral": ("kenji", "neutral"),
                "kenji_worn": ("kenji", "tired"),
                "mina_neutral": ("mina", "neutral"),
                "mina_warm": ("mina", "warm"),
                "daichi_neutral": ("daichi", "neutral"),
                "daichi_anxious": ("daichi", "anxious")}
    cell = 256
    cols = 3
    rows = 2
    sheet = Image.new("RGB", (cell * cols, cell * rows), hx(BG))
    for idx, name in enumerate(order):
        char, expr = expr_map[name]
        cv = Canvas(64, 64, BG)
        draw_bust(cv, char, expr)
        im = cv.to_image(4)
        x = (idx % cols) * cell
        y = (idx // cols) * cell
        sheet.paste(im, (x, y))
    sheet.save(os.path.join(OUT, "portraits.png"))
    return order

# ---------------- backgrounds (low-res 480x270, scale 2 -> 960x540) ----------------
def build_bg_shop():
    cv = Canvas(480, 270, BG)
    # back wall
    cv.fill_rect(0, 0, 480, 180, mix(BG, WARM_XD, 0.25))
    # warm light pool from lamp (center)
    for j in range(0, 180):
        for i in range(0, 480):
            d = ((i - 240) ** 2 + (j - 90) ** 2) ** 0.5
            t = max(0.0, 1.0 - d / 200)
            if t > 0:
                cv.dot(i, j, mix(hx(BG), hx(WARM_XD), 0.25 * t))
    # floor
    cv.fill_rect(0, 180, 480, 90, mix(BG, WARM_XD, 0.15))
    # floor line
    cv.hline(180, 0, 480, mix(WARM_D, BG, 0.5))
    # shelves (left and right)
    for sx in [40, 360]:
        cv.fill_rect(sx, 40, 80, 120, mix(WOOD_S, BG, 0.4))
        cv.fill_rect(sx, 40, 80, 2, WOOD_B)
        for sy in [70, 100, 130]:
            cv.fill_rect(sx, sy, 80, 2, WOOD_B)
            # items on shelf
            for k in range(4):
                ix = sx + 6 + k * 18
                cv.fill_rect(ix, sy - 8, 10, 8, mix(WARM_M, BG, 0.3 + 0.15 * (k % 2)))
                cv.fill_rect(ix, sy - 8, 10, 1, mix(WARM_L, BG, 0.3))
    # counter (center)
    cv.fill_rect(180, 140, 120, 40, WOOD_B)
    cv.fill_rect(180, 140, 120, 3, WOOD_L)
    cv.fill_rect(180, 180, 120, 10, mix(WOOD_S, BG, 0.3))
    # counter top items
    cv.fill_rect(200, 132, 16, 8, PAPER)
    cv.fill_rect(200, 132, 16, 1, mix(PAPER, INK, 0.3))
    cv.fill_rect(270, 130, 12, 10, mix(WARM_M, BG, 0.2))
    # single lamp (above counter)
    cv.vline(240, 30, 60, GREY_D)
    cv.fill_rect(232, 24, 16, 8, GREY)
    cv.fill_rect(234, 32, 12, 4, WARM_L)
    # lamp glow
    for j in range(30, 90):
        for i in range(210, 270):
            d = ((i - 240) ** 2 + (j - 40) ** 2) ** 0.5
            t = max(0.0, 1.0 - d / 60)
            if t > 0.15:
                c = cv.px.get((i, j), hx(BG))
                cv.dot(i, j, mix(c, hx(WARM_L), 0.25 * t))
    # door (right)
    cv.fill_rect(420, 60, 40, 120, mix(BG, WARM_XD, 0.35))
    cv.fill_rect(420, 60, 40, 2, WOOD_B)
    cv.fill_rect(420, 60, 2, 120, WOOD_B)
    cv.fill_rect(454, 110, 4, 6, WARM_L)
    # sign
    cv.fill_rect(200, 10, 80, 14, mix(BG, WARM_XD, 0.4))
    cv.outline_rect(200, 10, 80, 14, WARM_D)
    # sign glow
    for i in range(200, 280):
        cv.dot(i, 24, mix(WARM_L, BG, 0.5))
    # faint teal grid overlay
    for i in range(0, 480, 40):
        cv.vline(i, 0, 270, mix(BG, TEAL, 0.04))
        cv.hline(i, 0, 270, mix(BG, TEAL, 0.04))
    # vignette
    apply_vignette(cv, 480, 270)
    im = cv.to_image(2)
    im.save(os.path.join(OUT, "bg_shop.png"))

def build_bg_platform():
    cv = Canvas(480, 270, BG)
    # sky (dawn gray)
    sky_top = mix(BG, GREY_XD, 0.6)
    sky_bot = mix(BG, GREY_D, 0.35)
    for j in range(0, 150):
        t = j / 150
        for i in range(0, 480):
            cv.dot(i, j, mix(sky_top, sky_bot, t))
    # faint dawn band
    for j in range(120, 150):
        t = (j - 120) / 30
        for i in range(0, 480):
            cv.dot(i, j, mix(mix(sky_top, sky_bot, t), hx(GREY), 0.25 * (1 - t)))
    # platform floor
    cv.fill_rect(0, 150, 480, 60, GREY_D)
    cv.fill_rect(0, 150, 480, 2, GREY)
    # platform edge
    cv.fill_rect(0, 210, 480, 10, GREY_XD)
    cv.hline(210, 0, 480, mix(TEAL, BG, 0.3))
    # track
    cv.fill_rect(0, 220, 480, 50, INK)
    cv.hline(230, 0, 480, GREY_D)
    cv.hline(234, 0, 480, GREY_D)
    for i in range(0, 480, 24):
        cv.fill_rect(i, 226, 8, 12, mix(GREY_XD, INK, 0.5))
    # single bench
    cv.fill_rect(200, 180, 60, 4, GREY)
    cv.fill_rect(204, 184, 4, 14, GREY_D)
    cv.fill_rect(252, 184, 4, 14, GREY_D)
    cv.fill_rect(200, 176, 60, 2, mix(GREY, TEAL, 0.1))
    # pillar + sign
    cv.fill_rect(60, 60, 6, 150, GREY_XD)
    cv.fill_rect(50, 50, 26, 14, mix(BG, GREY_XD, 0.5))
    cv.outline_rect(50, 50, 26, 14, GREY_D)
    # clock on pillar
    cv.fill_rect(58, 70, 10, 10, mix(BG, GREY_XD, 0.6))
    cv.outline_rect(58, 70, 10, 10, GREY)
    cv.vline(63, 72, 75, TEAL)
    cv.hline(74, 63, 66, TEAL)
    # faint teal grid
    for i in range(0, 480, 40):
        cv.vline(i, 0, 270, mix(BG, TEAL, 0.03))
        cv.hline(i, 0, 270, mix(BG, TEAL, 0.03))
    apply_vignette(cv, 480, 270)
    im = cv.to_image(2)
    im.save(os.path.join(OUT, "bg_platform.png"))

def apply_vignette(cv, w, h):
    cx, cy = w / 2, h / 2
    maxd = (cx ** 2 + cy ** 2) ** 0.5
    for j in range(h):
        for i in range(w):
            d = ((i - cx) ** 2 + (j - cy) ** 2) ** 0.5
            t = max(0.0, (d / maxd - 0.55) / 0.45)
            if t > 0:
                c = cv.px.get((i, j), hx(BG))
                cv.dot(i, j, mix(c, hx(INK), 0.4 * t))

# ---------------- atlas ----------------
def build_atlas(order):
    atlas = {
        "version": 1,
        "project": "9:47-vn",
        "sheets": [
            {
                "file": "portraits.png",
                "cellW": 256,
                "cellH": 256,
                "cols": 3,
                "rows": 2
            }
        ],
        "portraits": {
            "kenji_neutral": {"sheet": 0, "x": 0, "y": 0, "w": 256, "h": 256},
            "kenji_worn":    {"sheet": 0, "x": 256, "y": 0, "w": 256, "h": 256},
            "mina_neutral":  {"sheet": 0, "x": 512, "y": 0, "w": 256, "h": 256},
            "mina_warm":     {"sheet": 0, "x": 0, "y": 256, "w": 256, "h": 256},
            "daichi_neutral":{"sheet": 0, "x": 256, "y": 256, "w": 256, "h": 256},
            "daichi_anxious":{"sheet": 0, "x": 512, "y": 256, "w": 256, "h": 256}
        },
        "backgrounds": {
            "bg_apartment": {"file": "bg_apartment.png", "w": 960, "h": 540},
            "bg_shop":      {"file": "bg_shop.png", "w": 960, "h": 540},
            "bg_platform":  {"file": "bg_platform.png", "w": 960, "h": 540}
        },
        "characters": {
            "kenji":  ["kenji_neutral", "kenji_worn"],
            "mina":   ["mina_neutral", "mina_warm"],
            "daichi": ["daichi_neutral", "daichi_anxious"]
        },
        "palette": PALETTE
    }
    with open(os.path.join(OUT, "atlas.json"), "w") as f:
        json.dump(atlas, f, indent=2)

def main():
    order = build_portraits()
    build_bg_shop()
    build_bg_platform()
    # copy apartment render
    src = os.path.join(ROOT, "blender", "bedroom", "renders", "bedroom_refpov_2x.png")
    dst = os.path.join(OUT, "bg_apartment.png")
    shutil.copyfile(src, dst)
    # resize apartment to 16:9 (960x540) via center crop + nearest
    im = Image.open(dst)
    w, h = im.size
    target_ratio = 16 / 9
    if w / h > target_ratio:
        new_w = int(h * target_ratio)
        x0 = (w - new_w) // 2
        im = im.crop((x0, 0, x0 + new_w, h))
    else:
        new_h = int(w / target_ratio)
        y0 = (h - new_h) // 2
        im = im.crop((0, y0, w, y0 + new_h))
    im = im.resize((960, 540), Image.NEAREST)
    im.save(dst)
    build_atlas(order)
    print("OK: portraits order =", order)
    print("OK: files in", OUT)
    for f in sorted(os.listdir(OUT)):
        p = os.path.join(OUT, f)
        print(" ", f, os.path.getsize(p))

if __name__ == "__main__":
    main()
