"""
Fusion Creations — Blender Turntable Render Script
====================================================

Usage:
  1. Open Blender
  2. File → Import → OBJ (or STEP via add-on) — import your Fusion model
     (This will bring in 3 objects: the holder body, the logo, and the name)
  3. Open this script in Blender's Text Editor (or Scripting tab)
  4. Press "Run Script"

The script will:
  - Find all 3 mesh objects (holder, logo, name)
  - Centre them as a group at the origin
  - Apply materials: holder body gets the holder colour, logo + name get the detail colour
  - Set up 3-point studio lighting
  - Place a camera at a flattering focal length
  - Animate a 360° rotation over 72 frames
  - Configure Cycles render settings
  - Render all frames to an output folder on your Desktop

After rendering, run convert_to_webp.py to compress for the web.
"""

import bpy
import math
import os
import mathutils

# =============================================
# CONFIGURATION — tweak these as needed
# =============================================

TOTAL_FRAMES = 144            # Number of frames (144 = smoother rotation)
ROTATION_DEGREES = 360        # Total rotation (360 for full turntable)
RENDER_HEIGHT = 1200          # Output image height in px
RENDER_WIDTH = 860            # Output image width in px (portrait card holder)
SAMPLES = 256                 # Cycles render samples (256 = high quality)
OUTPUT_FORMAT = 'PNG'         # PNG for quality, convert to WebP after
OUTPUT_FOLDER = os.path.join(os.path.expanduser('~'), 'Desktop', 'holder-frames')
CAMERA_FOCAL_LENGTH = 50      # mm — good balance of framing and distortion

# Colours — match these to the website defaults or your preferred render look
# Format: (R, G, B, A) in 0.0–1.0 range
HOLDER_COLOUR = (0.15, 0.02, 0.35, 1.0)   # Dark purple — the holder body
DETAIL_COLOUR = (1.0, 1.0, 1.0, 1.0)      # White — logo

# Object name matching
HOLDER_NAME = "DS body"
LOGO_NAME = "DS logo"
TEXT_NAME = None
SKIP_DETAILS = False

# Translucent material — set to True for filaments like translucent PLA/PETG
TRANSLUCENT = True
TRANSMISSION = 0.3
FACETED_TEXTURE = True
FACET_SCALE = 12.0
FACET_STRENGTH = 0.4

# =============================================
# 1. CLEAN UP DEFAULT SCENE
# =============================================

def clean_scene():
    """Remove all lights, cameras, and the default cube."""
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA') or obj.name == 'Cube':
            bpy.data.objects.remove(obj, do_unlink=True)

clean_scene()

# =============================================
# 2. FIND ALL MESH OBJECTS
# =============================================

all_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']

if len(all_meshes) == 0:
    raise RuntimeError("No mesh objects found! Import your model first, then run this script.")

# If SKIP_DETAILS is set, only keep the holder body
if SKIP_DETAILS and HOLDER_NAME:
    meshes = [obj for obj in all_meshes if obj.name == HOLDER_NAME]
    if not meshes:
        raise RuntimeError(f"Could not find '{HOLDER_NAME}'. Available: {[o.name for o in all_meshes]}")
else:
    meshes = all_meshes

print(f"\nFound {len(meshes)} mesh object(s):")
for m in meshes:
    print(f"  - '{m.name}' ({len(m.data.vertices)} verts)")

# =============================================
# 3. CLASSIFY OBJECTS (holder body / logo / name)
# =============================================

def classify_objects(meshes):
    """
    Try to figure out which mesh is the holder body, logo, and name.
    Heuristic: the largest mesh (most vertices/faces) is the holder body.
    The other two are detail objects (logo + name).
    """
    holder = None
    details = []

    # If explicit names are set, use those
    if HOLDER_NAME or LOGO_NAME or TEXT_NAME:
        for m in meshes:
            if HOLDER_NAME and m.name == HOLDER_NAME:
                holder = m
            elif LOGO_NAME and m.name == LOGO_NAME:
                details.append(m)
            elif TEXT_NAME and m.name == TEXT_NAME:
                details.append(m)
            else:
                details.append(m)
        if not holder:
            # Fallback: largest is holder
            sorted_meshes = sorted(meshes, key=lambda m: len(m.data.vertices), reverse=True)
            holder = sorted_meshes[0]
            details = sorted_meshes[1:]
    else:
        # Auto-detect: largest mesh = holder, rest = details
        sorted_meshes = sorted(meshes, key=lambda m: len(m.data.vertices), reverse=True)
        holder = sorted_meshes[0]
        details = sorted_meshes[1:]

    return holder, details

holder_obj, detail_objs = classify_objects(meshes)

print(f"\nClassification:")
print(f"  Holder body:  '{holder_obj.name}' ({len(holder_obj.data.vertices)} verts)")
for d in detail_objs:
    print(f"  Detail (logo/text): '{d.name}' ({len(d.data.vertices)} verts)")

# =============================================
# 4. CENTRE ALL OBJECTS AS A GROUP
# =============================================

# Calculate combined bounding box across all mesh objects
all_bbox_points = []
for obj in meshes:
    for corner in obj.bound_box:
        all_bbox_points.append(obj.matrix_world @ mathutils.Vector(corner))

min_corner = mathutils.Vector((
    min(p.x for p in all_bbox_points),
    min(p.y for p in all_bbox_points),
    min(p.z for p in all_bbox_points)
))
max_corner = mathutils.Vector((
    max(p.x for p in all_bbox_points),
    max(p.y for p in all_bbox_points),
    max(p.z for p in all_bbox_points)
))

group_centre = (min_corner + max_corner) / 2
model_size = max_corner - min_corner
model_height = model_size.z
model_max_dim = max(model_size.x, model_size.y, model_size.z)

print(f"\nCombined model size: {model_size.x:.3f} x {model_size.y:.3f} x {model_size.z:.3f}")

# Apply smooth shading to all
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)

# =============================================
# 5. CREATE TURNTABLE EMPTY AND PARENT ALL OBJECTS
# =============================================

# Parent all objects to a turntable empty, then offset the empty
# so the group centre lands at the origin. This preserves the
# relative positions between holder, logo, and name.

# Place the turntable empty at the group centre
turntable_empty = bpy.data.objects.new("Turntable", None)
bpy.context.collection.objects.link(turntable_empty)
turntable_empty.location = group_centre

# Parent using Blender's operator to preserve world positions
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
turntable_empty.select_set(True)
bpy.context.view_layer.objects.active = turntable_empty
bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

# Now move the turntable to origin — children follow along
turntable_empty.location = (0, 0, 0)

# =============================================
# 6. MATERIALS
# =============================================

def create_material(name, base_colour, roughness=0.45, specular=0.3,
                     translucent=False, transmission=0.0,
                     faceted=False, facet_scale=12.0, facet_strength=0.4):
    """Create a Principled BSDF material with a 3D-print plastic look."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear defaults
    for node in nodes:
        nodes.remove(node)

    # Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value = base_colour
    bsdf.inputs['Roughness'].default_value = roughness
    # 'Specular' was renamed to 'Specular IOR Level' in Blender 4.x
    spec_name = 'Specular IOR Level' if 'Specular IOR Level' in bsdf.inputs else 'Specular'
    bsdf.inputs[spec_name].default_value = specular
    bsdf.inputs['Metallic'].default_value = 0.0

    # Clearcoat — glossy top layer (3D printed plastic sheen)
    coat_name = 'Coat Weight' if 'Coat Weight' in bsdf.inputs else 'Clearcoat'
    if coat_name in bsdf.inputs:
        bsdf.inputs[coat_name].default_value = 0.3
    coat_rough = 'Coat Roughness' if 'Coat Roughness' in bsdf.inputs else 'Clearcoat Roughness'
    if coat_rough in bsdf.inputs:
        bsdf.inputs[coat_rough].default_value = 0.15

    # Subsurface scattering — plastic lets some light through
    sss_name = 'Subsurface Weight' if 'Subsurface Weight' in bsdf.inputs else 'Subsurface'
    if sss_name in bsdf.inputs:
        bsdf.inputs[sss_name].default_value = 0.05
    if 'Subsurface Color' in bsdf.inputs:
        bsdf.inputs['Subsurface Color'].default_value = base_colour

    # Translucent material (for translucent filaments)
    if translucent and transmission > 0:
        trans_name = 'Transmission Weight' if 'Transmission Weight' in bsdf.inputs else 'Transmission'
        bsdf.inputs[trans_name].default_value = transmission
        bsdf.inputs['Roughness'].default_value = max(roughness - 0.1, 0.15)
        if hasattr(mat, 'blend_method'):
            mat.blend_method = 'HASHED'

    # Geometric faceted surface (like textured build plate pattern)
    if faceted and facet_strength > 0:
        tex_coord = nodes.new('ShaderNodeTexCoord')
        tex_coord.location = (-600, 0)

        # Voronoi texture — each cell gets a random flat value,
        # creating sharp-edged geometric facets
        voronoi = nodes.new('ShaderNodeTexVoronoi')
        voronoi.location = (-400, 0)
        voronoi.inputs['Scale'].default_value = facet_scale
        voronoi.voronoi_dimensions = '3D'
        voronoi.feature = 'F1'
        # Randomness controls how regular the pattern is (1 = random, 0 = grid)
        voronoi.inputs['Randomness'].default_value = 1.0

        links.new(tex_coord.outputs['Object'], voronoi.inputs['Vector'])

        # Use the Color output — gives each cell a unique flat colour,
        # which when fed to bump creates flat angled facets
        bump = nodes.new('ShaderNodeBump')
        bump.location = (-100, 200)
        bump.inputs['Strength'].default_value = facet_strength
        bump.inputs['Distance'].default_value = 0.005

        links.new(voronoi.outputs['Color'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

        # Also vary roughness slightly per facet for that reflective shimmer
        mix_rough = nodes.new('ShaderNodeMixRGB')
        mix_rough.location = (-200, -200)
        mix_rough.blend_type = 'MIX'
        mix_rough.inputs['Fac'].default_value = 0.3
        mix_rough.inputs['Color1'].default_value = (roughness, roughness, roughness, 1)
        mix_rough.inputs['Color2'].default_value = (0.1, 0.1, 0.1, 1)
        links.new(voronoi.outputs['Color'], mix_rough.inputs['Fac'])
        links.new(mix_rough.outputs['Color'], bsdf.inputs['Roughness'])

    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat

# Holder body material
holder_mat = create_material("HolderBody", HOLDER_COLOUR, roughness=0.35, specular=0.5,
                             translucent=TRANSLUCENT, transmission=TRANSMISSION,
                             faceted=FACETED_TEXTURE, facet_scale=FACET_SCALE,
                             facet_strength=FACET_STRENGTH)

# Detail (logo + name) — contrasting colour, always opaque
detail_mat = create_material("Detail", DETAIL_COLOUR, roughness=0.5, specular=0.25)

# Assign materials
def assign_material(obj, mat):
    """Replace all materials on an object with the given material."""
    obj.data.materials.clear()
    obj.data.materials.append(mat)

assign_material(holder_obj, holder_mat)
for d in detail_objs:
    assign_material(d, detail_mat)

print(f"\nMaterials assigned:")
print(f"  '{holder_obj.name}' → HolderBody {HOLDER_COLOUR[:3]}")
for d in detail_objs:
    print(f"  '{d.name}' → Detail {DETAIL_COLOUR[:3]}")

# =============================================
# 7. STUDIO LIGHTING — Sun lights (no distance falloff) + environment
# =============================================

import math

def create_sun(name, energy, rotation_euler):
    """Create a sun light (no distance falloff)."""
    light_data = bpy.data.lights.new(name=name, type='SUN')
    light_data.energy = energy
    light_data.angle = math.radians(10)  # soft shadows
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.rotation_euler = rotation_euler
    return light_obj

# Key light — front-left, above (shining down-right towards model)
key = create_sun("Key_Light", energy=3.5,
    rotation_euler=(math.radians(45), math.radians(-20), math.radians(-30)))

# Fill light — front-right, softer
fill = create_sun("Fill_Light", energy=2.0,
    rotation_euler=(math.radians(50), math.radians(20), math.radians(30)))

# Rim light — from behind, edge definition
rim = create_sun("Rim_Light", energy=1.5,
    rotation_euler=(math.radians(120), 0, math.radians(180)))

# Environment light — studio-style gradient for realistic reflections
world = bpy.data.worlds.get('World') or bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.use_nodes = True
wnodes = world.node_tree.nodes
wlinks = world.node_tree.links
for n in wnodes:
    wnodes.remove(n)

# Gradient: bright from top, darker at bottom (studio backdrop feel)
tex_coord = wnodes.new('ShaderNodeTexCoord')
tex_coord.location = (-600, 0)
mapping = wnodes.new('ShaderNodeMapping')
mapping.location = (-400, 0)
gradient = wnodes.new('ShaderNodeTexGradient')
gradient.location = (-200, 0)
gradient.gradient_type = 'LINEAR'
colorramp = wnodes.new('ShaderNodeValToRGB')
colorramp.location = (0, 0)
colorramp.color_ramp.elements[0].position = 0.3
colorramp.color_ramp.elements[0].color = (0.15, 0.15, 0.18, 1)
colorramp.color_ramp.elements[1].position = 0.7
colorramp.color_ramp.elements[1].color = (0.9, 0.9, 0.95, 1)
bg = wnodes.new('ShaderNodeBackground')
bg.location = (200, 0)
bg.inputs['Strength'].default_value = 0.8
output = wnodes.new('ShaderNodeOutputWorld')
output.location = (400, 0)

wlinks.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
wlinks.new(mapping.outputs['Vector'], gradient.inputs['Vector'])
wlinks.new(gradient.outputs['Color'], colorramp.inputs['Fac'])
wlinks.new(colorramp.outputs['Color'], bg.inputs['Color'])
wlinks.new(bg.outputs['Background'], output.inputs['Surface'])

print(f"\nLighting: 3x Sun lights (5/3/2) + environment (0.5)")
print(f"  model_max_dim = {model_max_dim:.4f}")

# =============================================
# 8. CAMERA
# =============================================

cam_data = bpy.data.cameras.new(name="Camera")
cam_data.lens = CAMERA_FOCAL_LENGTH
cam_data.clip_end = 1000

cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)

cam_distance = model_max_dim * 2.2
cam_obj.location = (0, -cam_distance, model_height * 0.3)

print(f"\nCamera distance: {cam_distance:.3f}, model_max_dim: {model_max_dim:.3f}, model_height: {model_height:.3f}")

cam_constraint = cam_obj.constraints.new(type='TRACK_TO')
cam_constraint.target = turntable_empty
cam_constraint.track_axis = 'TRACK_NEGATIVE_Z'
cam_constraint.up_axis = 'UP_Y'

bpy.context.scene.camera = cam_obj

# =============================================
# 9. ROTATION ANIMATION
# =============================================

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = TOTAL_FRAMES

# Frame 1: start
scene.frame_set(1)
turntable_empty.rotation_euler = (0, 0, 0)
turntable_empty.keyframe_insert(data_path='rotation_euler', frame=1)

# Final frame: end rotation
end_rad = math.radians(ROTATION_DEGREES)
scene.frame_set(TOTAL_FRAMES)
turntable_empty.rotation_euler = (0, 0, end_rad)
turntable_empty.keyframe_insert(data_path='rotation_euler', frame=TOTAL_FRAMES)

# Linear interpolation (constant speed, no ease)
try:
    # Blender 3.x
    fcurves = turntable_empty.animation_data.action.fcurves
    for fcurve in fcurves:
        for kf in fcurve.keyframe_points:
            kf.interpolation = 'LINEAR'
except AttributeError:
    # Blender 4.x — access via action layers/strips
    action = turntable_empty.animation_data.action
    if hasattr(action, 'layers'):
        for layer in action.layers:
            for strip in layer.strips:
                for channel_bag in strip.channelbags:
                    for fcurve in channel_bag.fcurves:
                        for kf in fcurve.keyframe_points:
                            kf.interpolation = 'LINEAR'

# =============================================
# 10. RENDER SETTINGS
# =============================================

scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True

# Light bounces — more bounces = more realistic light interaction
scene.cycles.max_bounces = 12
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 8
scene.cycles.transparent_max_bounces = 8

# Filmic color management — better highlight/shadow rolloff
scene.view_settings.view_transform = 'Filmic'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0.5

# GPU rendering if available
prefs = bpy.context.preferences.addons.get('cycles')
if prefs:
    try:
        prefs.preferences.compute_device_type = 'CUDA'
        bpy.context.scene.cycles.device = 'GPU'
        for device in prefs.preferences.devices:
            device.use = True
    except Exception:
        print("  GPU not available, falling back to CPU")

scene.render.resolution_x = RENDER_WIDTH
scene.render.resolution_y = RENDER_HEIGHT
scene.render.resolution_percentage = 100

# Transparent background
scene.render.film_transparent = True

# Output
scene.render.image_settings.file_format = OUTPUT_FORMAT
scene.render.image_settings.color_mode = 'RGBA'
if OUTPUT_FORMAT == 'PNG':
    scene.render.image_settings.compression = 15

os.makedirs(OUTPUT_FOLDER, exist_ok=True)
scene.render.filepath = os.path.join(OUTPUT_FOLDER, 'frame_')

# =============================================
# 11. DONE
# =============================================

print(f"\n{'='*50}")
print(f"  TURNTABLE RENDER SETUP COMPLETE")
print(f"{'='*50}")
print(f"  Objects:    {len(meshes)} (1 holder + {len(detail_objs)} detail)")
print(f"  Frames:     {TOTAL_FRAMES}")
print(f"  Rotation:   {ROTATION_DEGREES}°")
print(f"  Resolution: {RENDER_WIDTH} x {RENDER_HEIGHT}")
print(f"  Samples:    {SAMPLES}")
print(f"  Output:     {OUTPUT_FOLDER}")
print(f"{'='*50}")
print(f"\n  To render: Render → Render Animation (Ctrl+F12)")
print(f"  Or uncomment the last line and re-run this script.\n")

# Uncomment to render immediately:
# bpy.ops.render.render(animation=True)
