"""
furniture_builder.py — Furniture sprite builder (formalised).

Reuses this directory's scene_builder.py core (camera calibration, NW light,
3-tone toon shading, Workbench flat/no-AA render) exactly; does not
reimplement any of it. Adds bpy-primitive-only furniture meshes (no
downloaded/copyrighted models).

Coordinate convention (locked): Blender x = grid i, y = -grid j, z = elevation.

Headless usage:
  Blender -b --factory-startup --python furniture_builder.py -- <mode> <out_png>
Modes: bed_wall | sofa | kitchen_corner
"""
import bpy, sys, os

# scene_builder.py lives in the same directory as this file.
PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PIPELINE_DIR)
import scene_builder as sb  # reuse clear_scene, assign_toon_materials, setup_camera_and_light, render

# palette hex (from iso-engine/spec/scene01_palette_v2.json, same env palette as siblings)
def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)

OAK_BASE = hx("C19A6B")       # wardrobe/wood frame
TEXTILE_BASE = hx("B3B8BC")   # bed/sofa upholstery grey
GREY_TRIM = hx("C6CACC")      # kitchen cabinets
ACCENT_BLACK = hx("201E1C")   # cooktop / hardware
GLASS = hx("C7D7DE")          # sink basin


def add_box(name, size, loc, base_rgb):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0] / 2.0, size[1] / 2.0, size[2] / 2.0)
    bpy.ops.object.transform_apply(scale=True)
    sb.assign_toon_materials(obj, base_rgb)
    return obj


def join_all(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = name
    return merged


def build_bed_wall():
    parts = []
    # bed frame
    parts.append(add_box("bed_frame", (1.4, 2.0, 0.3), (0.7, 1.0, 0.15), OAK_BASE))
    # mattress
    parts.append(add_box("mattress", (1.3, 1.9, 0.22), (0.7, 1.0, 0.41), TEXTILE_BASE))
    # pillow
    parts.append(add_box("pillow", (1.2, 0.4, 0.14), (0.7, 1.75, 0.59), hx("F9F2E4")))
    # built-in wardrobe to the side, against same wall
    parts.append(add_box("wardrobe_carcass", (0.9, 0.55, 1.8), (1.85, 0.275, 0.9), OAK_BASE))
    parts.append(add_box("wardrobe_door_split", (0.04, 0.56, 1.8), (1.85, 0.275, 0.9), hx("8A6B4E")))
    # shelf flush on top of wardrobe (slight overhang, no gap)
    parts.append(add_box("shelf_1", (1.0, 0.65, 0.06), (1.85, 0.275, 1.83), OAK_BASE))
    target = (1.1, 0.8, 0.5)
    return parts, target


def build_sofa():
    parts = []
    parts.append(add_box("sofa_base", (1.6, 0.75, 0.35), (0.8, 0.375, 0.175), TEXTILE_BASE))
    parts.append(add_box("sofa_back", (1.6, 0.15, 0.6), (0.8, 0.075, 0.45), hx("8D9398")))
    parts.append(add_box("sofa_arm_l", (0.15, 0.75, 0.55), (0.075, 0.375, 0.325), hx("8D9398")))
    parts.append(add_box("sofa_arm_r", (0.15, 0.75, 0.55), (1.525, 0.375, 0.325), hx("8D9398")))
    parts.append(add_box("seat_cushion_1", (0.7, 0.68, 0.14), (0.42, 0.34, 0.42), hx("D4D8DA")))
    parts.append(add_box("seat_cushion_2", (0.7, 0.68, 0.14), (1.18, 0.34, 0.42), hx("D4D8DA")))
    target = (0.8, 0.375, 0.2)
    return parts, target


def build_kitchen_corner():
    parts = []
    # L-shaped base cabinets: leg A along X, leg B along Y
    parts.append(add_box("base_leg_a", (1.6, 0.6, 0.9), (0.8, 0.3, 0.45), GREY_TRIM))
    parts.append(add_box("base_leg_b", (0.6, 1.6, 0.9), (0.3, 0.8, 0.45), GREY_TRIM))
    # countertop slab over both legs
    parts.append(add_box("counter_a", (1.66, 0.64, 0.06), (0.8, 0.3, 0.93), hx("A9ADB0")))
    parts.append(add_box("counter_b", (0.64, 1.66, 0.06), (0.3, 0.8, 0.93), hx("A9ADB0")))
    # cooktop (dark inset square on leg A counter, placed toward the room
    # side / front so the camera (NW, low-y-near) does not occlude it)
    parts.append(add_box("cooktop", (0.9, 0.3, 0.04), (0.8, 0.2, 0.98), ACCENT_BLACK))
    # sink basin (inset on leg B counter, front/room side, recessed look)
    parts.append(add_box("sink_rim", (0.46, 0.46, 0.04), (0.3, 1.0, 0.98), hx("A9ADB0")))
    parts.append(add_box("sink_basin", (0.36, 0.36, 0.06), (0.3, 1.0, 0.96), GLASS))
    # backsplash panel against the BACK (wall) edge of leg A (high-y, far
    # from camera) so it doesn't block the front counter items
    parts.append(add_box("backsplash", (1.6, 0.06, 0.85), (0.8, 0.57, 1.38), hx("E2E5E6")))
    # upper cabinets mounted on the back wall above the backsplash
    parts.append(add_box("upper_cab", (1.6, 0.38, 0.75), (0.8, 0.59, 1.775), GREY_TRIM))
    target = (0.55, 0.55, 0.45)
    return parts, target


MODES = {
    "bed_wall": build_bed_wall,
    "sofa": build_sofa,
    "kitchen_corner": build_kitchen_corner,
}

if __name__ == "__main__":
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    mode = argv[0] if argv else "sofa"
    out_png = argv[1] if len(argv) > 1 else "/tmp/out.png"

    sb.clear_scene()
    parts, target = MODES[mode]()
    merged = join_all(parts, mode)
    sb.setup_camera_and_light(target=target, resolution=(512, 512))
    sb.render(out_png)
    print(f"SUMMARY {mode} render -> {out_png}")
