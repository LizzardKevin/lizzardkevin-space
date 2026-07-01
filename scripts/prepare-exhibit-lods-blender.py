"""Generate exhibit LOD GLBs with Blender Decimate.

Called by scripts/prepare-exhibit-lods.mjs:

  blender --background --python scripts/prepare-exhibit-lods-blender.py -- source.glb exhibit_id out_dir
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

import bpy


LOD_RATIOS = {
    "lod0": 1.0,
    "lod1": 0.45,
    "lod2": 0.12,
}

TREEHABITAT_SHARED_MATERIAL_EXHIBIT_IDS = {"arch_treehabitat", "arch_uabb_exhibit"}
TREEHABITAT_GLASS_NAMES = (
    "model glass",
    "model_glass",
    "model-glass",
    "glass",
    "window",
    "glazing",
    "pane",
    "transparent",
    "translucent",
)

TREEHABITAT_MATERIAL_SPECS = {
    "mat_treehabitat_white_matte": {
        "base_color": (0.96, 0.96, 0.94, 1.0),
        "metallic": 0.0,
        "roughness": 0.82,
        "alpha": 1.0,
        "blend_method": "OPAQUE",
    },
    "mat_treehabitat_glass_frosted": {
        "base_color": (0.68, 0.70, 0.70, 0.40),
        "metallic": 0.0,
        "roughness": 0.68,
        "alpha": 0.40,
        "blend_method": "BLEND",
    },
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def import_source(source: Path) -> None:
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(source))


def mesh_objects() -> list[bpy.types.Object]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def set_input(bsdf: bpy.types.Node, name: str, value) -> None:
    input_socket = bsdf.inputs.get(name)
    if input_socket is None:
        return
    for link in list(input_socket.links):
        bsdf.id_data.links.remove(link)
    input_socket.default_value = value


def ensure_principled_material(name: str, spec: dict) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = material.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")
        output = material.node_tree.nodes.get("Material Output")
        if output is not None:
            material.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    set_input(bsdf, "Base Color", spec["base_color"])
    set_input(bsdf, "Metallic", spec["metallic"])
    set_input(bsdf, "Roughness", spec["roughness"])
    set_input(bsdf, "Alpha", spec["alpha"])

    material.diffuse_color = spec["base_color"]
    material.metallic = spec["metallic"]
    material.roughness = spec["roughness"]
    material.blend_method = spec["blend_method"]
    material.show_transparent_back = False
    if hasattr(material, "use_screen_refraction"):
        material.use_screen_refraction = False
    return material


def replace_object_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def normalized_name_text(obj: bpy.types.Object) -> str:
    material_names = " ".join(material.name for material in obj.data.materials if material)
    text = f"{obj.name} {obj.data.name} {material_names}".lower()
    return text.replace(".", " ").replace("-", " ").replace("_", " ")


def contains_any(text: str, needles: tuple[str, ...]) -> bool:
    normalized = " ".join(text.split())
    return any(" ".join(needle.replace("-", " ").replace("_", " ").split()) in normalized for needle in needles)


def assign_treehabitat_materials(exhibit_id: str) -> dict[str, int | bool]:
    if exhibit_id not in TREEHABITAT_SHARED_MATERIAL_EXHIBIT_IDS:
        return {
            "whiteAssigned": 0,
            "glassAssigned": 0,
            "fallbackWhiteAssigned": 0,
            "matchedNamedMeshes": False,
        }

    white = ensure_principled_material(
        "mat_treehabitat_white_matte",
        TREEHABITAT_MATERIAL_SPECS["mat_treehabitat_white_matte"],
    )
    glass = ensure_principled_material(
        "mat_treehabitat_glass_frosted",
        TREEHABITAT_MATERIAL_SPECS["mat_treehabitat_glass_frosted"],
    )

    white_assigned = 0
    glass_assigned = 0
    for obj in mesh_objects():
        name_text = normalized_name_text(obj)
        if contains_any(name_text, TREEHABITAT_GLASS_NAMES):
            replace_object_material(obj, glass)
            glass_assigned += 1
        else:
            replace_object_material(obj, white)
            white_assigned += 1

    matched_named_meshes = white_assigned > 0 or glass_assigned > 0
    fallback_white_assigned = 0
    if not matched_named_meshes:
        for obj in mesh_objects():
            replace_object_material(obj, white)
            fallback_white_assigned += 1

    return {
        "whiteAssigned": white_assigned,
        "glassAssigned": glass_assigned,
        "fallbackWhiteAssigned": fallback_white_assigned,
        "matchedNamedMeshes": matched_named_meshes,
    }


def count_mesh_stats() -> dict[str, int]:
    meshes = mesh_objects()
    return {
        "meshCount": len(meshes),
        "materialCount": len(bpy.data.materials),
        "vertexCount": sum(len(obj.data.vertices) for obj in meshes),
        "faceCount": sum(len(obj.data.polygons) for obj in meshes),
    }


def apply_decimate(ratio: float) -> None:
    if ratio >= 0.999:
        return
    for obj in mesh_objects():
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name=f"lod_decimate_{ratio:.2f}", type="DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        finally:
            obj.select_set(False)


def export_glb(output: Path) -> None:
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_materials="EXPORT",
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
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 3:
        raise SystemExit("Usage: -- source.glb exhibit_id output_dir")

    source = Path(args[0]).resolve()
    exhibit_id = args[1]
    output_dir = Path(args[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = []
    for lod, ratio in LOD_RATIOS.items():
        import_source(source)
        material_assignment = assign_treehabitat_materials(exhibit_id)
        before = count_mesh_stats()
        apply_decimate(ratio)
        after = count_mesh_stats()
        output = output_dir / f"{exhibit_id}.{lod}.glb"
        export_glb(output)
        outputs.append(
            {
                "lod": lod,
                "path": str(output),
                "ratio": ratio,
                "materialAssignment": material_assignment,
                "before": before,
                "after": after,
                "fileSizeBytes": output.stat().st_size,
                "manualReviewRequired": lod != "lod0",
            }
        )

    report = {
        "source": str(source),
        "method": "blender-decimate",
        "outputs": outputs,
        "nextStep": "Inspect lod1/lod2 for hard edges, text, thin rods, stair-stepped details, and silhouette loss.",
    }
    report_path = output_dir / f"{exhibit_id}.report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf8")
    print("LOD_REPORT_JSON=" + json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
