"""Place the Tree Habitat anchor on the white plaster platform and export.

Run from the repository root:

  blender --background BlenderFile/space_main.blend --python \
    scripts/place-treehabitat-anchor-on-platform.py
"""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parent.parent
BLEND_PATH = REPO_ROOT / "BlenderFile" / "space_main.blend"
GLB_PATH = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"
TEMP_GLB_PATH = GLB_PATH.with_name("space_main.__treehabitat_anchor_tmp__.glb")
MATERIAL_SCRIPT = REPO_ROOT / "scripts" / "apply-space-main-materials.py"

VISUAL_PLATFORM_NAME = "ARCH_WALL_PLASTER_WHITE_023"
TREEHABITAT_ANCHOR_NAME = "ANCHOR_ARCH_TREEHABITAT"
BLOCKER_COLLIDER_NAME = "COL_WALL_023"
SNAP_COLLIDER_NAME = "COL_PLATFORM_TREEHABITAT_SNAP"
BLOCKER_HEIGHT_M = 1.0
SNAP_COLLIDER_THICKNESS_M = 0.02


def load_material_contract():
    spec = importlib.util.spec_from_file_location("space_main_material_contract", MATERIAL_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load material contract from {MATERIAL_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def require_object(name: str, expected_type: str | None = None) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing required object: {name}")
    if expected_type is not None and obj.type != expected_type:
        raise RuntimeError(f"{name} must be {expected_type}, got {obj.type}")
    return obj


def ensure_mesh_object(name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is not None and obj.type != "MESH":
        bpy.data.objects.remove(obj, do_unlink=True)
        obj = None
    if obj is None:
        mesh = bpy.data.meshes.new(name)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
    obj.name = name
    obj.data.name = name
    obj.location = (0.0, 0.0, 0.0)
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.scale = (1.0, 1.0, 1.0)
    return obj


def evaluated_world_vertices(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def world_bounds(obj: bpy.types.Object) -> dict[str, float]:
    vertices = evaluated_world_vertices(obj)
    if not vertices:
        raise RuntimeError(f"{obj.name} has no vertices")

    xs = [vertex.x for vertex in vertices]
    ys = [vertex.y for vertex in vertices]
    zs = [vertex.z for vertex in vertices]
    return {
        "min_x": min(xs),
        "max_x": max(xs),
        "min_y": min(ys),
        "max_y": max(ys),
        "min_z": min(zs),
        "max_z": max(zs),
    }


def triangle_area(a: Vector, b: Vector, c: Vector) -> float:
    return 0.5 * (b - a).cross(c - a).length


def polygon_area_center(points: list[Vector]) -> tuple[float, Vector]:
    if len(points) < 3:
        return 0.0, sum(points, Vector()) / max(len(points), 1)

    total_area = 0.0
    weighted_center = Vector((0.0, 0.0, 0.0))
    origin = points[0]
    for index in range(1, len(points) - 1):
        area = triangle_area(origin, points[index], points[index + 1])
        if area <= 0.0:
            continue
        center = (origin + points[index] + points[index + 1]) / 3.0
        total_area += area
        weighted_center += center * area

    if total_area <= 0.0:
        return 0.0, sum(points, Vector()) / len(points)
    return total_area, weighted_center / total_area


def top_face_center(obj: bpy.types.Object, bounds: dict[str, float]) -> Vector:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    top_z = bounds["max_z"]
    height = max(bounds["max_z"] - bounds["min_z"], 0.001)
    epsilon = max(height * 0.002, 0.001)

    total_area = 0.0
    weighted_center = Vector((0.0, 0.0, 0.0))
    try:
        for polygon in mesh.polygons:
            points = [evaluated.matrix_world @ mesh.vertices[index].co for index in polygon.vertices]
            if not points:
                continue
            if min(point.z for point in points) < top_z - epsilon:
                continue
            area, center = polygon_area_center(points)
            if area <= 0.0:
                continue
            total_area += area
            weighted_center += center * area
    finally:
        evaluated.to_mesh_clear()

    if total_area > 0.0:
        center = weighted_center / total_area
        center.z = top_z
        return center

    return Vector(
        (
            (bounds["min_x"] + bounds["max_x"]) / 2.0,
            (bounds["min_y"] + bounds["max_y"]) / 2.0,
            top_z,
        ),
    )


def set_mesh_to_world_box(
    obj: bpy.types.Object,
    *,
    min_x: float,
    max_x: float,
    min_y: float,
    max_y: float,
    min_z: float,
    max_z: float,
) -> None:
    world_corners = [
        Vector((min_x, min_y, min_z)),
        Vector((max_x, min_y, min_z)),
        Vector((max_x, max_y, min_z)),
        Vector((min_x, max_y, min_z)),
        Vector((min_x, min_y, max_z)),
        Vector((max_x, min_y, max_z)),
        Vector((max_x, max_y, max_z)),
        Vector((min_x, max_y, max_z)),
    ]
    inverse = obj.matrix_world.inverted()
    local_corners = [inverse @ corner for corner in world_corners]
    faces = [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]

    obj.data.clear_geometry()
    obj.data.from_pydata([tuple(corner) for corner in local_corners], [], faces)
    obj.data.update()
    obj.data.name = obj.name


def apply_material_and_collection_contract() -> None:
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

    if hasattr(contract, "remove_vertex_color_attributes"):
        contract.remove_vertex_color_attributes()
    if hasattr(contract, "ensure_space_main_scene_contract"):
        contract.ensure_space_main_scene_contract()


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


def runtime_position_from_blender(point: Vector) -> tuple[float, float, float]:
    return (point.x, point.z, -point.y)


def main() -> None:
    if not bpy.data.filepath:
        bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    platform = require_object(VISUAL_PLATFORM_NAME, "MESH")
    anchor = require_object(TREEHABITAT_ANCHOR_NAME, "EMPTY")
    collider = require_object(BLOCKER_COLLIDER_NAME, "MESH")
    snap_collider = ensure_mesh_object(SNAP_COLLIDER_NAME)

    platform_bounds = world_bounds(platform)
    collider_before = world_bounds(collider)
    snap_before = world_bounds(snap_collider) if len(snap_collider.data.vertices) > 0 else None
    anchor_before = Vector(anchor.location)
    anchor_target = top_face_center(platform, platform_bounds)

    anchor.location = anchor_target
    anchor.rotation_euler = (0.0, 0.0, 0.0)
    anchor.scale = (1.0, 1.0, 1.0)

    set_mesh_to_world_box(
        collider,
        min_x=platform_bounds["min_x"],
        max_x=platform_bounds["max_x"],
        min_y=platform_bounds["min_y"],
        max_y=platform_bounds["max_y"],
        min_z=platform_bounds["min_z"],
        max_z=platform_bounds["min_z"] + BLOCKER_HEIGHT_M,
    )
    set_mesh_to_world_box(
        snap_collider,
        min_x=platform_bounds["min_x"],
        max_x=platform_bounds["max_x"],
        min_y=platform_bounds["min_y"],
        max_y=platform_bounds["max_y"],
        min_z=platform_bounds["max_z"] - SNAP_COLLIDER_THICKNESS_M,
        max_z=platform_bounds["max_z"],
    )
    collider_after = world_bounds(collider)
    snap_after = world_bounds(snap_collider)

    apply_material_and_collection_contract()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb()

    summary = {
        "platform": VISUAL_PLATFORM_NAME,
        "platformBounds": platform_bounds,
        "anchor": TREEHABITAT_ANCHOR_NAME,
        "anchorBeforeBlender": tuple(anchor_before),
        "anchorAfterBlender": tuple(anchor_target),
        "anchorAfterRuntime": runtime_position_from_blender(anchor_target),
        "collider": BLOCKER_COLLIDER_NAME,
        "colliderBeforeBounds": collider_before,
        "colliderAfterBounds": collider_after,
        "colliderAfterHeightM": collider_after["max_z"] - collider_after["min_z"],
        "snapCollider": SNAP_COLLIDER_NAME,
        "snapColliderBeforeBounds": snap_before,
        "snapColliderAfterBounds": snap_after,
        "snapColliderAfterHeightM": snap_after["max_z"] - snap_after["min_z"],
        "blend": str(BLEND_PATH),
        "glb": str(GLB_PATH),
    }
    print("[treehabitat_anchor_place] " + json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
