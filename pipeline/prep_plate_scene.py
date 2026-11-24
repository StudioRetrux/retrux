# Builds a lighter copy of the project scene for plate rendering (never touches the original):
# decimates the three 524k-triangle mountains ONE AT A TIME (a render-time Decimate on all three
# in parallel spiked RAM past the watchdog limit), then saves a copy to the scratchpad.
#   blender -b --factory-startup "Home - EXPORT.blend" --python prep_plate_scene.py -- <OUT_DIR>
import bpy, os, sys, time, ctypes
from ctypes import wintypes

OUT = sys.argv[sys.argv.index("--") + 1]


class MEMSTAT(ctypes.Structure):
    _fields_ = [("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD),
                ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]


def avail():
    m = MEMSTAT()
    m.dwLength = ctypes.sizeof(m)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys >> 20


t0 = time.time()
print("PREP loaded, avail", avail())
for name in ("Object_2.008", "Object_2.009", "Object_2.010"):
    o = bpy.data.objects[name]
    if len(o.data.polygons) < 200000:
        continue
    d = o.modifiers.new("PLATE_DECIMATE", 'DECIMATE')
    d.decimate_type = 'COLLAPSE'
    d.ratio = 0.12
    d.use_collapse_triangulate = True
    deps = bpy.context.evaluated_depsgraph_get()
    deps.update()
    eo = o.evaluated_get(deps)
    new = bpy.data.meshes.new_from_object(eo, preserve_all_data_layers=True, depsgraph=deps)
    old = o.data
    o.modifiers.remove(d)
    o.data = new
    if old.users == 0:
        bpy.data.meshes.remove(old)
    print("PREP decimated", name, len(new.polygons), "faces, avail", avail(), "t=%.1fs" % (time.time() - t0))

path = os.path.join(OUT, "plate_scene.blend")
bpy.ops.wm.save_as_mainfile(filepath=path, copy=True, compress=False)
print("PREP_DONE", path, "%.1f MB" % (os.path.getsize(path) / 2**20), "avail", avail())
