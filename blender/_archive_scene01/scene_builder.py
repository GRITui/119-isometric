"""
scene_builder.py — Reusable Blender->pixel dimetric scene builder core (formalised).

This is the shared core for the Scene 01 pixel pipeline. It owns:
  * the true-iso ortho camera + NW key light setup,
  * per-face 3-tone toon shading (exact flat colours, lighting-independent),
  * the Workbench FLAT / no-AA render settings that keep the output crisp.

Coordinate convention (locked, see iso-engine/spec/GRID_SPEC.md):
  Blender x = grid i, Blender y = -grid j, Blender z = elevation (units).
  Verified against the engine projection:
    screen-right  ~ (i - j)
    screen-down   ~ (i + j) - 2*z
  so the (1,-1,1) camera corner looks from the S corner toward the N corner,
  and the two back walls (i=0 / x=0 and j=0 / y=0) sit far from the camera.

Math (2:1 dimetric via true-isometric camera + vertical squash):
  A true-iso camera (rot X=54.7356deg, Z=45deg, ortho) projects a unit ground
  square to a diamond of ratio sqrt(3):1 (width:height) in SQUARE pixels.
  We render square-pixel, then post_process.py squashes height by
  SQUASH = sqrt(3)/2 = 0.866025 to land on the exact 2:1 dimetric ratio the
  HIRES v2 spec requires (64x32 diamond per 1x1 cell, ELEV_PX=32).
  P = px-per-world-unit along the camera 'r' (horizontal) axis.
  TILE_W_PX=64 => P = 64/sqrt(2) = 45.254834 px/world-unit (pre-squash).

Headless usage:
  Blender -b --factory-startup --python scene_builder.py -- <mode> <out_png>
Modes:
  calib               -> render bare 1x1x1 cube for camera-math verification
  floor_tile          -> render light-oak floor tile (1x1 cell, flat quad)
  wall_segment <units> -> render warm-white wall segment (1u or 2u)
"""
import bpy, math, sys, os

SQUASH = math.sqrt(3) / 2.0            # 0.8660254
P = 64.0 / math.sqrt(2.0)              # 45.254834 px/world-unit (pre-squash, horizontal)
TILE_W_PX = 64
TILE_H_PX = 32
ELEV_PX = 32
CELL_PX = 128
ANCHOR = (64, 127)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_toon_material(name, base_rgb):
    """Flat base colour; 3-tone shading comes from Workbench STUDIO lighting
    (NW-biased single studio light) at render time, not from shader nodes —
    Workbench's render engine ignores node graphs and reads diffuse_color."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = base_rgb
    mat.roughness = 1.0
    return mat


def assign_toon_materials(obj, base_rgb):
    """Per-face 3-tone shading via face normals (exact flat colours,
    no lighting dependency): top=light, NW-facing=mid, SE-facing=dark.

    The three tones are derived shades of the base colour; the final PNG is
    palette-quantised to iso-engine/spec/scene01_palette_v2.json by
    post_process.py, so the delivered art stays palette-locked even though
    these intermediate tones are off-palette.
    """
    def shade(c, f):
        return (min(1, c[0]*f), min(1, c[1]*f), min(1, c[2]*f), 1)
    mat_light = bpy.data.materials.new(obj.name + "_light")
    mat_light.diffuse_color = shade(base_rgb, 1.08)
    mat_mid = bpy.data.materials.new(obj.name + "_mid")
    mat_mid.diffuse_color = shade(base_rgb, 0.85)
    mat_dark = bpy.data.materials.new(obj.name + "_dark")
    mat_dark.diffuse_color = shade(base_rgb, 0.62)
    obj.data.materials.append(mat_light)
    obj.data.materials.append(mat_mid)
    obj.data.materials.append(mat_dark)
    for poly in obj.data.polygons:
        n = poly.normal
        if n.z > 0.5:
            poly.material_index = 0
        elif (n.x - n.y) > 0:
            poly.material_index = 1
        else:
            poly.material_index = 2


def setup_camera_and_light(target=(0, 0, 0), resolution=(256, 256), ortho_world_units=None):
    cam_data = bpy.data.cameras.new("IsoCam")
    cam_data.type = 'ORTHO'
    cam_data.sensor_fit = 'HORIZONTAL'
    if ortho_world_units is None:
        ortho_world_units = resolution[0] / P
    cam_data.ortho_scale = ortho_world_units
    cam_obj = bpy.data.objects.new("IsoCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    dist = 20.0
    d = (1, -1, 1)
    norm = math.sqrt(3)
    cam_obj.location = (target[0] + dist*d[0]/norm, target[1] + dist*d[1]/norm, target[2] + dist*d[2]/norm)
    target_empty = bpy.data.objects.new("CamTarget", None)
    target_empty.location = target
    bpy.context.collection.objects.link(target_empty)
    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target_empty
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'
    bpy.context.scene.camera = cam_obj

    sun_data = bpy.data.lights.new("KeyNW", type='SUN')
    sun_data.energy = 3.0
    sun_obj = bpy.data.objects.new("KeyNW", sun_data)
    bpy.context.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(55), 0, math.radians(-45))  # from NW

    scene = bpy.context.scene
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'MATERIAL'
    scene.view_settings.view_transform = 'Standard'
    scene.sequencer_colorspace_settings.name = 'Non-Color'
    try:
        scene.render.use_antialiasing = False
    except Exception:
        pass
    try:
        scene.display.render_aa = 'OFF'
        scene.display.viewport_aa = 'OFF'
    except Exception:
        pass
    return cam_obj


def render(out_png):
    bpy.context.scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    mode = argv[0] if argv else "calib"
    out_png = argv[1] if len(argv) > 1 else "/tmp/out.png"

    clear_scene()

    if mode == "calib":
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0.5, 0.5, 0.5))
        cube = bpy.context.object
        assign_toon_materials(cube, (0.76, 0.6, 0.42, 1))
        setup_camera_and_light(target=(0.5, 0.5, 0.5), resolution=(256, 256))
        render(out_png)
        print(f"SUMMARY calib render -> {out_png}")

    elif mode == "floor_tile":
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0.5, 0.5, 0.0))
        plane = bpy.context.object
        assign_toon_materials(plane, (0.757, 0.604, 0.420, 1))
        setup_camera_and_light(target=(0.5, 0.5, 0.0), resolution=(256, 256))
        render(out_png)
        print(f"SUMMARY floor_tile render -> {out_png}")

    elif mode == "wall_segment":
        units = float(argv[2]) if len(argv) > 2 else 1.0
        h = 1.0
        bpy.ops.mesh.primitive_cube_add(size=1)
        wall = bpy.context.object
        wall.scale = (units/2.0, 0.08, h/2.0)
        wall.location = (units/2.0, 0.0, h/2.0)
        bpy.ops.object.transform_apply(scale=True)
        assign_toon_materials(wall, (0.937, 0.906, 0.847, 1))
        setup_camera_and_light(target=(units/2.0, 0.0, h/2.0), resolution=(256, 256))
        render(out_png)
        print(f"SUMMARY wall_segment({units}u) render -> {out_png}")

    else:
        print(f"SUMMARY unknown mode {mode}")
