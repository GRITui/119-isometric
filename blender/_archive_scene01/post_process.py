"""
post_process.py — nearest-only resample, squash to 2:1 dimetric, alpha
binarise, palette quantise, 128-cell crop/anchor. (formalised)

Usage:
  python3 post_process.py measure <raw_png>
  python3 post_process.py build <raw_png> <out_png> [palette_json]

"measure" prints the alpha-diamond bbox (for calibration assertion).
"build" squashes by sqrt(3)/2, binarises alpha, quantises to the given
palette (defaults to iso-engine/spec/scene01_palette_v2.json), crops to a
128x128 cell canvas anchored at (64,127), nearest-neighbour throughout.

The palette path defaults to the repo's v2 palette, resolved relative to
this file (blender/post_process.py -> repo root -> iso-engine/spec/), so the
pipeline is portable without hard-coded absolute paths.
"""
import sys, os, json, math
from PIL import Image

SQUASH = math.sqrt(3) / 2.0
CELL_PX = 128
ANCHOR = (64, 127)

# blender/post_process.py -> repo root -> iso-engine/spec/scene01_palette_v2.json
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PALETTE = os.path.join(_REPO_ROOT, "iso-engine", "spec", "scene01_palette_v2.json")


def load_palette(path):
    with open(path) as f:
        data = json.load(f)
    colours = []
    for ramp in data["ramps"]:
        for c in ramp["colours"]:
            hexv = c["hex"].lstrip("#")
            rgb = tuple(int(hexv[i:i+2], 16) for i in (0, 2, 4))
            colours.append(rgb)
    return colours


def binarise_alpha(img, threshold=128):
    r, g, b, a = img.split()
    a = a.point(lambda v: 255 if v >= threshold else 0)
    return Image.merge("RGBA", (r, g, b, a))


def alpha_bbox(img):
    a = img.split()[3]
    return a.getbbox()


def quantise_to_palette(img, palette_rgb):
    pal_img = Image.new("P", (1, 1))
    flat = []
    for c in palette_rgb:
        flat.extend(c)
    flat.extend([0] * (768 - len(flat)))
    pal_img.putpalette(flat)
    rgb = img.convert("RGB")
    quant = rgb.quantize(palette=pal_img, dither=Image.Dither.NONE)
    out = quant.convert("RGBA")
    out.putalpha(img.split()[3])
    return out


def add_outline(img, rgb=(32, 30, 28, 255)):
    """1px dark outline via alpha-edge detection (nearest-neighbour safe)."""
    import numpy as np
    arr = np.array(img)
    a = arr[:, :, 3]
    opaque = a > 0
    edge = np.zeros_like(opaque)
    edge[1:, :] |= opaque[1:, :] & ~opaque[:-1, :]
    edge[:-1, :] |= opaque[:-1, :] & ~opaque[1:, :]
    edge[:, 1:] |= opaque[:, 1:] & ~opaque[:, :-1]
    edge[:, :-1] |= opaque[:, :-1] & ~opaque[:, 1:]
    out = arr.copy()
    out[edge] = rgb
    return Image.fromarray(out, "RGBA")


def squash(img):
    w, h = img.size
    new_h = max(1, round(h * SQUASH))
    return img.resize((w, new_h), Image.NEAREST)


def crop_to_cell(img, anchor_world_px):
    """anchor_world_px = (x, y) of the anchor point in the (squashed) image.
    Produces a CELL_PX x CELL_PX canvas with that point landing at ANCHOR."""
    canvas = Image.new("RGBA", (CELL_PX, CELL_PX), (0, 0, 0, 0))
    ox = int(round(ANCHOR[0] - anchor_world_px[0]))
    oy = int(round(ANCHOR[1] - anchor_world_px[1]))
    canvas.paste(img, (ox, oy), img)
    return canvas


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "measure":
        img = Image.open(sys.argv[2]).convert("RGBA")
        img = binarise_alpha(img)
        bbox = alpha_bbox(img)
        print(f"SUMMARY raw bbox={bbox} size={img.size}")
        sq = squash(img)
        bbox2 = alpha_bbox(sq)
        print(f"SUMMARY squashed bbox={bbox2} size={sq.size}")
        if bbox2:
            w = bbox2[2] - bbox2[0]
            h = bbox2[3] - bbox2[1]
            print(f"SUMMARY diamond_w={w} diamond_h={h} ratio={w/h:.4f}")
            target_w, target_h, tol = 64, 32, 3
            ok = abs(w - target_w) <= tol and abs(h - target_h) <= tol
            print(f"ASSERT top-face diamond == {target_w}x{target_h} (tol {tol}px): "
                  f"got {w}x{h} -> {'PASS' if ok else 'FAIL'}")

    elif cmd == "build":
        raw_png, out_png = sys.argv[2], sys.argv[3]
        palette_path = sys.argv[4] if len(sys.argv) > 4 else DEFAULT_PALETTE
        img = Image.open(raw_png).convert("RGBA")
        img = binarise_alpha(img)
        img = squash(img)
        palette = load_palette(palette_path)
        img = quantise_to_palette(img, palette)
        img = add_outline(img)
        bbox = alpha_bbox(img)
        if bbox:
            anchor_px = ((bbox[0] + bbox[2]) / 2.0, bbox[3])
        else:
            anchor_px = (img.width / 2.0, img.height)
        canvas = crop_to_cell(img, anchor_px)
        canvas.save(out_png)
        n_colours = len(set(canvas.convert("RGB").getdata()))
        print(f"SUMMARY built {out_png} size={canvas.size} colours_used<={n_colours} palette={len(palette)}")
