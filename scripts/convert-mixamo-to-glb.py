import os
import sys

import bpy


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def convert_fbx_to_glb(source_path, output_path):
    clear_scene()
    bpy.ops.import_scene.fbx(filepath=source_path)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_animations=True,
    )


def main():
    if len(sys.argv) < 3:
        raise SystemExit("usage: blender --background --python scripts/convert-mixamo-to-glb.py -- <input-dir> <output-dir>")

    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    input_dir, output_dir = args[0], args[1]

    files = sorted(
        filename
        for filename in os.listdir(input_dir)
        if filename.lower().endswith(".fbx")
    )

    for filename in files:
        source_path = os.path.join(input_dir, filename)
        output_name = os.path.splitext(filename)[0] + ".glb"
        output_path = os.path.join(output_dir, output_name)
        print(f"Converting {source_path} -> {output_path}")
        convert_fbx_to_glb(source_path, output_path)


if __name__ == "__main__":
    main()
