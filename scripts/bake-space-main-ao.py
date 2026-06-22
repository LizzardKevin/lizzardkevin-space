"""Bake a lightweight vertex-color AO pass for space_main and export the GLB.

This is intended as a fast preview-quality AO pass for WebGPU. It bakes AO into
the active `Color` attribute on opaque visual structure meshes, then exports the
attribute as glTF `COLOR_0`, which Three.js multiplies into the material color.

Run from the repository root:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    BlenderFile/space_main.blend --python scripts/bake-space-main-ao.py
"""

from __future__ import annotations

from pathlib import Path
import importlib.util

import bpy


BLEND_PATH = Path(bpy.data.filepath).resolve()
REPO_ROOT = BLEND_PATH.parent.parent
MATERIAL_SCRIPT = REPO_ROOT / "scripts" / "apply-space-main-materials.py"
GLB_PATH = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"

AO_ATTR_NAME = "Color"
AO_TARGET_PREFIXES = ("ARCH_", "STRUCT_STAIR_", "METAL_ALUMINUM_")
AO_RECEIVER_PREFIXES = ("ARCH_", "STRUCT_STAIR_", "METAL_ALUMINUM_")
AO_EXCLUDED_OCCLUDER_PREFIXES = ("COL_", "GLASS_", "LIGHT_GENERIC_LIGHT_")
AO_SAMPLES = 64
AO_MIN = 0.62
AO_STRENGTH = 0.38
AO_TEXTURE_PREFIX = "space_main_ao_"
AO_UV_PREFIX = "space_main_ao_uv"


def load_material_contract():
    spec = importlib.util.spec_from_file_location("space_main_material_contract", MATERIAL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load material contract from {MATERIAL_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def is_target(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and obj.name.startswith(AO_TARGET_PREFIXES)


def is_receiver(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and obj.name.startswith(AO_RECEIVER_PREFIXES)


def should_exclude_occluder(obj: bpy.types.Object) -> bool:
    return obj.name.startswith(AO_EXCLUDED_OCCLUDER_PREFIXES)


def remove_texture_ao_artifacts() -> None:
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        for node in list(material.node_tree.nodes):
            if node.name.startswith(AO_TEXTURE_PREFIX):
                material.node_tree.nodes.remove(node)

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for uv_layer in list(obj.data.uv_layers):
            if uv_layer.name.startswith(AO_UV_PREFIX):
                obj.data.uv_layers.remove(uv_layer)

    for image in list(bpy.data.images):
        if image.name.startswith(AO_TEXTURE_PREFIX):
            bpy.data.images.remove(image)


def ensure_color_attribute(obj: bpy.types.Object) -> bpy.types.Attribute:
    mesh = obj.data
    attr = mesh.color_attributes.get(AO_ATTR_NAME)
    if attr is None:
        attr = mesh.color_attributes.new(name=AO_ATTR_NAME, type="BYTE_COLOR", domain="CORNER")
    mesh.color_attributes.active_color = attr
    for datum in attr.data:
        datum.color = (1.0, 1.0, 1.0, 1.0)
    return attr


def remap_baked_ao(obj: bpy.types.Object) -> tuple[float, float, float]:
    attr = obj.data.color_attributes.get(AO_ATTR_NAME)
    if attr is None or len(attr.data) == 0:
        return (1.0, 1.0, 1.0)

    values = []
    for datum in attr.data:
        raw = max(0.0, min(1.0, sum(datum.color[:3]) / 3.0))
        ao = max(AO_MIN, 1.0 - AO_STRENGTH * (1.0 - raw))
        datum.color = (ao, ao, ao, 1.0)
        values.append(ao)
    return (min(values), max(values), sum(values) / len(values))


def apply_material_contract() -> None:
    contract = load_material_contract()
    materials = {
        name: contract.configure_material(name, spec)
        for name, spec in contract.MATERIAL_SPECS.items()
    }
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        material_name = contract.material_for_object_name(obj.name)
        if material_name is not None:
            contract.assign_material(obj, materials[material_name])


def export_glb() -> None:
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_vertex_color_name=AO_ATTR_NAME,
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


def main() -> None:
    remove_texture_ao_artifacts()
    apply_material_contract()

    targets = [obj for obj in bpy.context.scene.objects if is_target(obj)]
    if not targets:
        raise RuntimeError("No AO targets found")

    for obj in targets:
        ensure_color_attribute(obj)

    hidden_render_state = {obj.name: obj.hide_render for obj in bpy.context.scene.objects}
    for obj in bpy.context.scene.objects:
        if should_exclude_occluder(obj):
            obj.hide_render = True

    previous_engine = bpy.context.scene.render.engine
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = AO_SAMPLES
    bpy.context.scene.cycles.use_denoising = False

    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    for obj in targets:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = targets[0]

    bpy.ops.object.bake(
        type="AO",
        target="VERTEX_COLORS",
        use_clear=True,
        margin=2,
    )

    stats = []
    for obj in targets:
        if is_receiver(obj):
            mn, mx, avg = remap_baked_ao(obj)
            stats.append((obj.name, mn, mx, avg))

    for obj in bpy.context.scene.objects:
        obj.hide_render = hidden_render_state[obj.name]
    bpy.context.scene.render.engine = previous_engine

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb()

    avg_ao = sum(item[3] for item in stats) / len(stats)
    darkest = min(stats, key=lambda item: item[1])
    print(f"[space_main_ao] baked {len(targets)} meshes")
    print(f"[space_main_ao] average remapped AO {avg_ao:.3f}")
    print(f"[space_main_ao] darkest mesh {darkest[0]} min={darkest[1]:.3f} avg={darkest[3]:.3f}")
    print(f"[space_main_ao] saved {BLEND_PATH}")
    print(f"[space_main_ao] exported {GLB_PATH}")


if __name__ == "__main__":
    main()
