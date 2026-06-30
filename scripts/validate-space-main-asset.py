"""Validate the space_main Blender source against the asset runbook."""

from __future__ import annotations

from pathlib import Path
import re
import sys

import bpy


REPO_ROOT = Path(__file__).resolve().parent.parent
BLEND_PATH = REPO_ROOT / "BlenderFile" / "space_main.blend"
GLB_PATH = REPO_ROOT / "apps" / "web" / "public" / "models" / "space_main.glb"

SPAWN_MARKER_NAME = "spawn_player_main"
SPAWN_MARKER_LOCATION = (-0.51, 48.318, 36.838)
SPAWN_LOCATION_EPSILON = 0.01
AO_ATTR_NAME = "Color"
AO_TARGET_PREFIXES = ("ARCH_", "ARCH_STAIR_", "STRUCT_STAIR_", "METAL_ALUMINUM_")

REQUIRED_COLLECTIONS = (
    "COLLISION_HELPERS",
    "VIS_ARCHITECTURE",
    "VIS_FLOORS",
    "VIS_GLASS",
    "VIS_LIGHTING",
    "VIS_METAL_PROPS",
    "VIS_STAIRS",
    "VIS_TEMP_BLOCKERS",
    "MARKERS",
)


def is_temp_blocker_name(name: str) -> bool:
    normalized = re.sub(r"\.\d{3}$", "", name.strip()).upper()
    normalized = re.sub(r"[^A-Z0-9]+", "_", normalized).strip("_")
    return normalized == "TEMP_BLOCKER" or normalized.startswith("TEMP_BLOCKER_")


def collection_for_object(name: str) -> str | None:
    if name.startswith("COL_"):
        return "COLLISION_HELPERS"
    if name == "spawn_player_main" or name.startswith("spawn_") or name.startswith("ANCHOR_"):
        return "MARKERS"
    if name.startswith(("ARCH_FLOOR_", "STRUCT_FLOOR_")):
        return "VIS_FLOORS"
    if is_temp_blocker_name(name):
        return "VIS_TEMP_BLOCKERS"
    if name.startswith("GLASS_"):
        return "VIS_GLASS"
    if name.startswith("LIGHT_GENERIC_LIGHT_"):
        return "VIS_LIGHTING"
    if name.startswith("METAL_ALUMINUM_"):
        return "VIS_METAL_PROPS"
    if name.startswith(("ARCH_STAIR_", "STRUCT_STAIR_")):
        return "VIS_STAIRS"
    if name.startswith("EXHIBITS_"):
        return "VIS_METAL_PROPS"
    if name.startswith(("ARCH_", "PLASTER_", "STRUCT_WALL_", "STRUCT_CEILING_")):
        return "VIS_ARCHITECTURE"
    return None


def material_for_object(name: str) -> str | None:
    if name.startswith("COL_"):
        return "mat_collision_helper_transparent_red"
    if is_temp_blocker_name(name):
        return "mat_temp_blocker_frosted_milky"
    if name.startswith("LIGHT_GENERIC_LIGHT_"):
        return "mat_led_generic_warm_emissive"
    if name.startswith(("ARCH_STAIR_", "STRUCT_STAIR_")):
        return "mat_stair_warm_concrete"
    if name.startswith(("ARCH_FLOOR_", "STRUCT_FLOOR_")):
        return "mat_floor_concrete_warm_gray"
    if name.startswith("METAL_ALUMINUM_"):
        return "mat_metal_aluminum_soft"
    if name.startswith("GLASS_CLEAR_"):
        return "mat_glass_clear_soft"
    if name.startswith("GLASS_"):
        return "mat_glass_frosted_soft"
    if name.startswith("EXHIBITS_"):
        return "mat_metal_aluminum_soft"
    if name.startswith(("ARCH_", "PLASTER_", "STRUCT_WALL_", "STRUCT_CEILING_")):
        return "mat_arch_plaster_warm_white"
    return None


def linked_collection_names(obj: bpy.types.Object) -> set[str]:
    return {collection.name for collection in obj.users_collection}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for data_collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.collections,
    ):
        for item in list(data_collection):
            if item.users == 0:
                data_collection.remove(item)


def is_generic_name(name: str) -> bool:
    return name in {"Cube", "Mesh"} or name.startswith(("Cube.", "Mesh."))


def is_anchor_name(name: str) -> bool:
    return name.startswith("ANCHOR_")


def is_runbook_safe_anchor_name(name: str) -> bool:
    return is_anchor_name(name) and re.fullmatch(r"ANCHOR_[A-Z0-9_]+", name) is not None


def material_names(obj: bpy.types.Object) -> set[str]:
    if obj.type != "MESH":
        return set()
    return {material.name for material in obj.data.materials if material is not None}


def is_ao_target(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and obj.name.startswith(AO_TARGET_PREFIXES)


def validate_scene(
    label: str,
    validate_collection_links: bool,
    require_ao: bool,
    forbid_vertex_colors: bool = False,
) -> list[str]:
    errors: list[str] = []
    if validate_collection_links:
        existing_collections = {collection.name for collection in bpy.data.collections}
        for collection_name in REQUIRED_COLLECTIONS:
            if collection_name not in existing_collections:
                errors.append(f"{label}: missing collection: {collection_name}")

    spawn = bpy.data.objects.get(SPAWN_MARKER_NAME)
    if spawn is None:
        errors.append(f"{label}: missing {SPAWN_MARKER_NAME}")
    else:
        if spawn.type != "EMPTY":
            errors.append(f"{label}: {SPAWN_MARKER_NAME} must be EMPTY, got {spawn.type}")
        if any(abs(value) > 0.0001 for value in spawn.rotation_euler):
            errors.append(f"{label}: {SPAWN_MARKER_NAME} rotation must be zero, got {tuple(spawn.rotation_euler)}")
        if any(abs(spawn.location[index] - expected) > SPAWN_LOCATION_EPSILON for index, expected in enumerate(SPAWN_MARKER_LOCATION)):
            errors.append(f"{label}: {SPAWN_MARKER_NAME} location must be {SPAWN_MARKER_LOCATION}, got {tuple(spawn.location)}")
        if validate_collection_links and "MARKERS" not in linked_collection_names(spawn):
            errors.append(f"{label}: {SPAWN_MARKER_NAME} must be linked to MARKERS")

    for obj in bpy.context.scene.objects:
        if is_generic_name(obj.name) or "." in obj.name or "-" in obj.name or " " in obj.name:
            errors.append(f"{label}: object name is not runbook-safe: {obj.name}")
        if obj.name.lower().startswith("anchor") and not is_runbook_safe_anchor_name(obj.name):
            errors.append(f"{label}: anchor must use ANCHOR_* uppercase underscore naming: {obj.name}")
        if is_anchor_name(obj.name) and obj.type != "EMPTY":
            errors.append(f"{label}: {obj.name} should be an EMPTY anchor, got {obj.type}")
        expected_material = material_for_object(obj.name)
        if expected_material is not None and expected_material not in material_names(obj):
            errors.append(f"{label}: {obj.name} must use {expected_material}, got {sorted(material_names(obj))}")
        expected = collection_for_object(obj.name)
        if expected is None or not validate_collection_links:
            continue
        if expected not in linked_collection_names(obj):
            errors.append(f"{label}: {obj.name} must be linked to {expected}")

    if require_ao:
        ao_values: list[float] = []
        for obj in bpy.context.scene.objects:
            if not is_ao_target(obj):
                continue
            attr = obj.data.color_attributes.get(AO_ATTR_NAME)
            if attr is None:
                errors.append(f"{label}: {obj.name} is missing vertex AO color attribute {AO_ATTR_NAME}")
                continue
            for datum in attr.data:
                ao_values.append(sum(datum.color[:3]) / 3.0)
        if not ao_values:
            errors.append(f"{label}: no vertex AO values found")
        elif min(ao_values) > 0.995:
            errors.append(f"{label}: vertex AO appears unbaked; darkest value is {min(ao_values):.3f}")

    if forbid_vertex_colors:
        for obj in bpy.context.scene.objects:
            if obj.type != "MESH":
                continue
            color_attributes = getattr(obj.data, "color_attributes", None)
            if color_attributes and len(color_attributes) > 0:
                errors.append(f"{label}: {obj.name} should not keep vertex color attributes")

    return errors


def main() -> None:
    if not bpy.data.filepath:
        bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))

    errors = validate_scene(
        "blend",
        validate_collection_links=True,
        require_ao=False,
        forbid_vertex_colors=True,
    )

    if not GLB_PATH.exists():
        errors.append(f"glb: missing exported file: {GLB_PATH}")
    else:
        clear_scene()
        bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
        errors.extend(
            validate_scene(
                "glb",
                validate_collection_links=False,
                require_ao=False,
                forbid_vertex_colors=True,
            ),
        )

    if errors:
        for error in errors[:80]:
            print(f"[space_main_validate] ERROR {error}")
        if len(errors) > 80:
            print(f"[space_main_validate] ERROR ... {len(errors) - 80} more")
        raise SystemExit(1)

    print("[space_main_validate] ok")


if __name__ == "__main__":
    main()
