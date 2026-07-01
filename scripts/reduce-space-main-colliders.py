"""Reduce authored COL_* collider meshes in space_main without changing visible meshes.

Run from repo root:
  blender --background BlenderFile/space_main.blend --python scripts/reduce-space-main-colliders.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy


REPO_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = REPO_ROOT / "BlenderFile" / "space_main.blend"
SPACE_MAIN_GLB = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"
ANGLE_LIMIT_DEGREES = 2.0
DIMENSION_TOLERANCE = 0.0001


def is_col_object(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and obj.name.upper().startswith("COL_")


def triangle_count(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def object_dimensions(obj: bpy.types.Object) -> tuple[float, float, float]:
    return tuple(round(value, 6) for value in obj.dimensions)


def dimensions_match(before: tuple[float, float, float], after: tuple[float, float, float]) -> bool:
    return all(abs(left - right) <= DIMENSION_TOLERANCE for left, right in zip(before, after))


def apply_limited_dissolve(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name="col_limited_dissolve", type="DECIMATE")
    modifier.decimate_type = "DISSOLVE"
    modifier.angle_limit = math.radians(ANGLE_LIMIT_DEGREES)
    modifier.use_dissolve_boundaries = False
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    finally:
        obj.select_set(False)


def export_space_main() -> None:
    bpy.ops.export_scene.gltf(
        filepath=str(SPACE_MAIN_GLB),
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
    colliders = [obj for obj in bpy.context.scene.objects if is_col_object(obj)]
    before_total = sum(triangle_count(obj) for obj in colliders)
    changed = []

    for obj in colliders:
        before_dimensions = object_dimensions(obj)
        before_triangles = triangle_count(obj)
        apply_limited_dissolve(obj)
        after_triangles = triangle_count(obj)
        after_dimensions = object_dimensions(obj)
        if not dimensions_match(before_dimensions, after_dimensions):
            raise RuntimeError(
                f"{obj.name} dimensions changed from {before_dimensions} to {after_dimensions}"
            )
        if before_triangles != after_triangles:
            changed.append(
                {
                    "name": obj.name,
                    "before": before_triangles,
                    "after": after_triangles,
                }
            )

    after_total = sum(triangle_count(obj) for obj in colliders)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_space_main()

    report = {
        "colliderCount": len(colliders),
        "angleLimitDegrees": ANGLE_LIMIT_DEGREES,
        "dimensionTolerance": DIMENSION_TOLERANCE,
        "beforeTriangles": before_total,
        "afterTriangles": after_total,
        "changedCount": len(changed),
        "largestChanges": sorted(changed, key=lambda item: item["before"] - item["after"], reverse=True)[:25],
    }
    print("COLLIDER_REDUCTION_JSON=" + json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
