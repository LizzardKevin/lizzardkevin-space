"""Generate SPACE and Focus exhibit GLBs with Blender Decimate.

Called by scripts/prepare-exhibit-models.mjs:

  blender --background --python scripts/prepare-exhibit-models-blender.py -- source.glb exhibit_id out_dir
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import sys

import bpy


MODEL_TARGET_TRIANGLES = {
    "space": 50_000,
    "focus": 150_000,
}

TREEHABITAT_SHARED_MATERIAL_EXHIBIT_IDS = {
    "arch_treehabitat",
    "arch_uabb_exhibit",
    "arch_3d_printing_architecture",
}
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
DEFAULT_MATTE_MATERIAL_SPEC = {
    "base_color": (0.88, 0.88, 0.86, 1.0),
    "metallic": 0.0,
    "roughness": 0.78,
    "alpha": 1.0,
    "blend_method": "OPAQUE",
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


def assign_default_material_if_missing(exhibit_id: str) -> dict[str, int | bool]:
    meshes = mesh_objects()
    needs_default = [obj for obj in meshes if len(obj.data.materials) == 0]
    if not needs_default:
        return {"defaultAssigned": 0, "hadMissingMaterials": False}

    material = ensure_principled_material(
        f"mat_{exhibit_id}_default_matte",
        DEFAULT_MATTE_MATERIAL_SPEC,
    )
    for obj in needs_default:
        replace_object_material(obj, material)

    return {"defaultAssigned": len(needs_default), "hadMissingMaterials": True}


def triangle_count(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def count_mesh_stats() -> dict[str, int]:
    meshes = mesh_objects()
    return {
        "meshCount": len(meshes),
        "materialCount": len(bpy.data.materials),
        "vertexCount": sum(len(obj.data.vertices) for obj in meshes),
        "faceCount": sum(len(obj.data.polygons) for obj in meshes),
        "triangleCount": sum(triangle_count(obj) for obj in meshes),
    }


def join_mesh_objects_for_variant(exhibit_id: str, variant: str) -> None:
    meshes = mesh_objects()
    if len(meshes) <= 1:
        return

    bpy.ops.object.select_all(action="DESELECT")
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    for obj in meshes:
        obj.select_set(True)
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = f"{exhibit_id}_{variant}_visual"
    joined.data.name = f"{exhibit_id}_{variant}_visual_mesh"
    bpy.ops.object.select_all(action="DESELECT")


def apply_limited_dissolve(angle_degrees: float) -> None:
    for obj in mesh_objects():
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name=f"model_planar_dissolve_{angle_degrees:.1f}", type="DECIMATE")
        modifier.decimate_type = "DISSOLVE"
        modifier.angle_limit = math.radians(angle_degrees)
        modifier.use_dissolve_boundaries = False
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        finally:
            obj.select_set(False)


def apply_collapse_decimate(ratio: float) -> None:
    safe_ratio = max(0.01, min(1.0, ratio))
    if safe_ratio >= 0.999:
        return
    for obj in mesh_objects():
        if triangle_count(obj) <= 12:
            continue
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name=f"model_collapse_{safe_ratio:.3f}", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = safe_ratio
        modifier.use_collapse_triangulate = True
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        finally:
            obj.select_set(False)


def reduce_to_triangle_budget(target_triangles: int) -> list[dict[str, int | float | str]]:
    steps: list[dict[str, int | float | str]] = []
    before = count_mesh_stats()["triangleCount"]
    apply_limited_dissolve(1.5)
    after_dissolve = count_mesh_stats()["triangleCount"]
    steps.append({"type": "limited-dissolve", "angleDegrees": 1.5, "before": before, "after": after_dissolve})

    current = after_dissolve
    attempt = 0
    while current > target_triangles and attempt < 5:
        ratio = (target_triangles / current) * 0.965
        apply_collapse_decimate(ratio)
        next_count = count_mesh_stats()["triangleCount"]
        steps.append({"type": "collapse", "ratio": ratio, "before": current, "after": next_count})
        if next_count >= current:
            break
        current = next_count
        attempt += 1

    final_count = count_mesh_stats()["triangleCount"]
    if final_count > target_triangles:
        ratio = (target_triangles / final_count) * 0.92
        apply_collapse_decimate(ratio)
        steps.append({"type": "final-collapse", "ratio": ratio, "before": final_count, "after": count_mesh_stats()["triangleCount"]})

    return steps


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


def output_name(exhibit_id: str, variant: str) -> str:
    return f"{variant}_{exhibit_id}.glb"


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 3:
        raise SystemExit("Usage: -- source.glb exhibit_id output_dir")

    source = Path(args[0]).resolve()
    exhibit_id = args[1]
    output_dir = Path(args[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = []
    for variant, target_triangles in MODEL_TARGET_TRIANGLES.items():
        import_source(source)
        material_assignment = assign_treehabitat_materials(exhibit_id)
        default_material_assignment = assign_default_material_if_missing(exhibit_id)
        before = count_mesh_stats()
        join_mesh_objects_for_variant(exhibit_id, variant)
        joined = count_mesh_stats()
        reduction_steps = reduce_to_triangle_budget(target_triangles)
        after = count_mesh_stats()
        output = output_dir / output_name(exhibit_id, variant)
        export_glb(output)
        outputs.append(
            {
                "variant": variant,
                "path": str(output),
                "targetTriangles": target_triangles,
                "reductionSteps": reduction_steps,
                "materialAssignment": material_assignment,
                "defaultMaterialAssignment": default_material_assignment,
                "before": before,
                "joined": joined,
                "after": after,
                "fileSizeBytes": output.stat().st_size,
                "manualReviewRequired": variant == "space",
            }
        )

    report = {
        "source": str(source),
        "method": "blender-decimate",
        "outputs": outputs,
        "nextStep": "Inspect SPACE silhouettes and Focus detail loss around thin rods, windows, model edges, and stair-stepped details.",
    }
    report_path = output_dir / f"{exhibit_id}.report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf8")
    print("MODEL_REPORT_JSON=" + json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
