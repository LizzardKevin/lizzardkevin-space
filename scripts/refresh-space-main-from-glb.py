"""Refresh BlenderFile/space_main.blend from the current runtime GLB.

This script is for the Windows/macOS asset handoff where a replacement GLB has
already been exported to apps/web/public/models/space_main.glb. It imports that
GLB, reapplies the project material contract, performs conservative cleanup, and
then overwrites both the production .blend and runtime .glb.

Run from the repository root:

  blender --background --python scripts/refresh-space-main-from-glb.py
"""

from __future__ import annotations

from collections import Counter
import importlib.util
import os
from pathlib import Path
import re

import bpy


REPO_ROOT = Path(__file__).resolve().parent.parent
BLEND_PATH = REPO_ROOT / "BlenderFile" / "space_main.blend"
GLB_PATH = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"
TEMP_GLB_PATH = GLB_PATH.with_name("space_main.__refresh_tmp__.glb")
MATERIAL_SCRIPT = REPO_ROOT / "scripts" / "apply-space-main-materials.py"

NAME_CHARS = re.compile(r"[^A-Za-z0-9_]+")
MERGE_DISTANCE = 0.00001


def load_material_contract():
    spec = importlib.util.spec_from_file_location("space_main_material_contract", MATERIAL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load material contract from {MATERIAL_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.collections,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def sanitize_base_name(name: str, fallback: str) -> str:
    name = name.replace(".", "_").replace("-", "_").replace(" ", "_")
    name = NAME_CHARS.sub("_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name or fallback


def unique_name(base: str, used: set[str]) -> str:
    candidate = base
    index = 1
    while candidate in used:
        candidate = f"{base}_{index:03d}"
        index += 1
    used.add(candidate)
    return candidate


def sanitize_object_names() -> None:
    used: set[str] = set()
    for index, obj in enumerate(bpy.context.scene.objects, start=1):
        base = sanitize_base_name(obj.name, f"object_{index:03d}")
        obj.name = unique_name(base, used)
        if obj.type == "MESH":
            obj.data.name = obj.name


def apply_scale_rotation_to_meshes(meshes: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    if meshes:
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True, properties=True)


def merge_tiny_duplicate_vertices(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=MERGE_DISTANCE)
    bpy.ops.object.mode_set(mode="OBJECT")


def add_weighted_normals(obj: bpy.types.Object) -> None:
    if len(obj.data.polygons) == 0:
        return
    modifier = obj.modifiers.new("runtime_weighted_normals", "WEIGHTED_NORMAL")
    modifier.keep_sharp = True
    modifier.weight = 50
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    except RuntimeError:
        obj.modifiers.remove(modifier)
    finally:
        obj.select_set(False)


def apply_material_contract(meshes: list[bpy.types.Object]) -> tuple[int, Counter[str]]:
    contract = load_material_contract()
    materials = {
        name: contract.configure_material(name, spec)
        for name, spec in contract.MATERIAL_SPECS.items()
    }
    unmatched: Counter[str] = Counter()
    assigned = 0
    for obj in meshes:
        material_name = contract.material_for_object_name(obj.name)
        if material_name is None:
            prefix = obj.name.split("_", 1)[0] + "_" if "_" in obj.name else obj.name
            unmatched[prefix] += 1
            continue
        contract.assign_material(obj, materials[material_name])
        assigned += 1
    if hasattr(contract, "ensure_space_main_scene_contract"):
        contract.ensure_space_main_scene_contract()
    return assigned, unmatched


def export_glb() -> None:
    if TEMP_GLB_PATH.exists():
        TEMP_GLB_PATH.unlink()
    bpy.ops.export_scene.gltf(
        filepath=str(TEMP_GLB_PATH),
        export_format="GLB",
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_vertex_color_name="Color",
        export_all_vertex_colors=False,
        export_lights=False,
        export_cameras=False,
        export_animations=False,
        export_draco_mesh_compression_enable=False,
        export_extras=True,
        export_yup=True,
        use_selection=False,
        use_visible=False,
        use_renderable=False,
        export_apply=False,
    )
    os.replace(TEMP_GLB_PATH, GLB_PATH)


def main() -> None:
    if not GLB_PATH.exists():
        raise RuntimeError(f"Missing source GLB: {GLB_PATH}")

    source_size = GLB_PATH.stat().st_size
    clear_scene()
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

    sanitize_object_names()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    before_vertices = sum(len(obj.data.vertices) for obj in meshes)
    before_polygons = sum(len(obj.data.polygons) for obj in meshes)

    apply_scale_rotation_to_meshes(meshes)
    for obj in meshes:
        merge_tiny_duplicate_vertices(obj)
        add_weighted_normals(obj)
        obj.data.validate(clean_customdata=False)
        obj.data.update()

    assigned, unmatched = apply_material_contract(meshes)
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    after_vertices = sum(len(obj.data.vertices) for obj in meshes)
    after_polygons = sum(len(obj.data.polygons) for obj in meshes)

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb()

    output_size = GLB_PATH.stat().st_size
    print(f"[space_main_refresh] imported {GLB_PATH}")
    print(f"[space_main_refresh] meshes={len(meshes)} materials={len(bpy.data.materials)}")
    print(
        "[space_main_refresh] vertices "
        f"{before_vertices} -> {after_vertices}; polygons {before_polygons} -> {after_polygons}"
    )
    print(f"[space_main_refresh] assigned_materials={assigned}")
    print(f"[space_main_refresh] unmatched_prefixes={unmatched.most_common(20)}")
    print(f"[space_main_refresh] glb_size {source_size} -> {output_size} bytes")
    print(f"[space_main_refresh] saved {BLEND_PATH}")
    print(f"[space_main_refresh] exported {GLB_PATH}")


if __name__ == "__main__":
    main()
