"""Apply the production space_main material contract and export the runtime GLB.

Run from the repository root:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    BlenderFile/space_main.blend --python scripts/apply-space-main-materials.py

The script intentionally keys material assignment from object names so a refreshed
model can recover the same web-facing look after re-importing/replacing geometry.
"""

from __future__ import annotations

from pathlib import Path

import bpy


BLEND_PATH = Path(bpy.data.filepath).resolve()
REPO_ROOT = BLEND_PATH.parent.parent
GLB_PATH = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"


MATERIAL_SPECS = {
    "mat_arch_plaster_warm_white": {
        "base_color": (0.92, 0.92, 0.92, 1.0),
        "metallic": 0.08,
        "roughness": 0.72,
        "blend_method": "OPAQUE",
    },
    "mat_floor_concrete_warm_gray": {
        "base_color": (0.37, 0.37, 0.37, 1.0),
        "metallic": 0.06,
        "roughness": 0.76,
        "blend_method": "OPAQUE",
    },
    "mat_stair_warm_concrete": {
        "base_color": (0.37, 0.37, 0.37, 1.0),
        "metallic": 0.06,
        "roughness": 0.76,
        "blend_method": "OPAQUE",
    },
    "mat_metal_aluminum_soft": {
        "base_color": (0.90, 0.90, 0.90, 1.0),
        "metallic": 0.74,
        "roughness": 0.18,
        "blend_method": "OPAQUE",
    },
    "mat_glass_frosted_soft": {
        "base_color": (0.74, 0.76, 0.76, 0.42),
        "metallic": 0.0,
        "roughness": 0.42,
        "blend_method": "BLEND",
    },
    "mat_glass_clear_soft": {
        "base_color": (0.84, 0.86, 0.86, 0.32),
        "metallic": 0.0,
        "roughness": 0.14,
        "blend_method": "BLEND",
    },
    "mat_led_generic_warm_emissive": {
        "base_color": (1.0, 0.94, 0.78, 1.0),
        "metallic": 0.0,
        "roughness": 0.30,
        "emission_color": (1.0, 0.90, 0.66, 1.0),
        "emission_strength": 2.8,
        "blend_method": "OPAQUE",
    },
    "mat_collision_helper_transparent_red": {
        "base_color": (1.0, 0.08, 0.02, 0.22),
        "metallic": 0.0,
        "roughness": 0.35,
        "blend_method": "BLEND",
    },
}


def set_input(bsdf: bpy.types.Node, name: str, value) -> None:
    input_socket = bsdf.inputs.get(name)
    if input_socket is not None:
        for link in list(input_socket.links):
            bsdf.id_data.links.remove(link)
        input_socket.default_value = value


def ensure_material(name: str) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = material.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")
        output = material.node_tree.nodes.get("Material Output")
        if output is not None:
            material.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


def configure_material(name: str, spec: dict) -> bpy.types.Material:
    material = ensure_material(name)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"Material {name} has no Principled BSDF")

    set_input(bsdf, "Base Color", spec["base_color"])
    set_input(bsdf, "Metallic", spec["metallic"])
    set_input(bsdf, "Roughness", spec["roughness"])
    set_input(bsdf, "Alpha", spec["base_color"][3])
    set_input(bsdf, "Emission Color", spec.get("emission_color", (0.0, 0.0, 0.0, 1.0)))
    set_input(bsdf, "Emission Strength", spec.get("emission_strength", 0.0))

    material.diffuse_color = spec["base_color"]
    material.metallic = spec["metallic"]
    material.roughness = spec["roughness"]
    material.blend_method = spec["blend_method"]
    if hasattr(material, "use_screen_refraction"):
        material.use_screen_refraction = False
    material.show_transparent_back = spec["blend_method"] == "BLEND"
    return material


def material_for_object_name(name: str) -> str | None:
    if name.startswith("COL_"):
        return "mat_collision_helper_transparent_red"
    if name.startswith("LIGHT_GENERIC_LIGHT_"):
        return "mat_led_generic_warm_emissive"
    if name.startswith("STRUCT_STAIR_"):
        return "mat_stair_warm_concrete"
    if name.startswith("ARCH_FLOOR_") or name.startswith("STRUCT_FLOOR_"):
        return "mat_floor_concrete_warm_gray"
    if name.startswith("METAL_ALUMINUM_"):
        return "mat_metal_aluminum_soft"
    if name.startswith("GLASS_CLEAR_"):
        return "mat_glass_clear_soft"
    if name.startswith("GLASS_FROSTED_") or name.startswith("GLASS_"):
        return "mat_glass_frosted_soft"
    if name.startswith("ARCH_") or name.startswith("STRUCT_WALL_") or name.startswith("STRUCT_CEILING_"):
        return "mat_arch_plaster_warm_white"
    return None


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def main() -> None:
    materials = {name: configure_material(name, spec) for name, spec in MATERIAL_SPECS.items()}
    assigned = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        material_name = material_for_object_name(obj.name)
        if material_name is None:
            continue
        assign_material(obj, materials[material_name])
        assigned += 1

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
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
    print(f"[space_main_materials] assigned {assigned} meshes")
    print(f"[space_main_materials] saved {BLEND_PATH}")
    print(f"[space_main_materials] exported {GLB_PATH}")


if __name__ == "__main__":
    main()
