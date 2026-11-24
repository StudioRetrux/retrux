# Lists every image datablock of the open .blend: packed or external, with its absolute path and whether the file exists.
#   blender -b <file.blend> --python list_images.py
import bpy, os
for im in bpy.data.images:
    if im.source not in ('FILE', 'SEQUENCE', 'TILED'):
        continue
    p = bpy.path.abspath(im.filepath)
    print("IMG", "packed" if im.packed_file else "external", "exists" if os.path.exists(p) else "MISSING", repr(im.name), p)
