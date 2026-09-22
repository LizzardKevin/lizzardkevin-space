#!/usr/bin/env python3
"""Bake a single Profile scene from a private, fully expanded Rhino mesh study.

Requires Python 3.10+ and numpy. First extract the saved render meshes with:
  python scripts/extract-profile-rhino-study.py --source PRIVATE.3dm --output-dir PRIVATE_STUDY
Then bake with:
  python scripts/bake-profile-rhino-cache.py --source PRIVATE.3dm --study-dir PRIVATE_STUDY \
    --output-dir apps/web/public/particles/profile --verify-determinism

The source is read only for SHA256 verification; no source paths or materials
are published. PVR1 little-endian: magic[4], count:u32, version:u32, reserved:u32,
positions:f32[3N], normals:snorm16[3N], motionGroupIndices:u16[N].
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import numpy as np

POINT_COUNT = 270000
COLUMN_COUNT = 72
COLUMN_POINT_COUNT = 135000
CROWD_COUNT = 117
SCALE = 0.1
SEED = 0x50565231
SHOT_NAMES = ("Student", "Career", "Photo", "Band")
DETAIL_REGIONS = [
    {"name": "stage-truss", "sourceGroupNames": ["Group06"],
     "weight": 6, "expectedObjectCount": 194},
    {"name": "line-array-loudspeakers", "sourceGroupNames": ["Group29", "Group30", "Group31", "Group32"],
     "weight": 10, "expectedObjectCount": 16},
]


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def map_xyz(values, scale):
    values = np.asarray(values, dtype=np.float64)
    return values[..., [0, 2, 1]] * np.array([scale, scale, -scale])


def unit_mapped(values):
    values = map_xyz(values, 1)
    return (values / np.linalg.norm(values)).tolist()


def allocate_counts(weights, count):
    """Largest remainder after one coverage sample per nonzero-area object."""
    active = weights > 0
    if not active.any() or active.sum() > count:
        raise ValueError("Point budget cannot cover all nonzero-area objects")
    counts = active.astype(np.int64)
    quotas = weights / weights.sum() * (count - int(active.sum()))
    counts += np.floor(quotas).astype(np.int64)
    remaining = count - int(counts.sum())
    order = np.argsort(-(quotas - np.floor(quotas)), kind="stable")
    counts[order[:remaining]] += 1
    return counts


def reconstruct_source_object_indices(object_counts, seed):
    """Map each cache point index to its ordered manifest objectAllocations row.

    Root objects first occupy consecutive point blocks in allocation-table order.
    The fresh PCG64 permutation used by sample_surface maps output point i
    to its original block slot permutation[i], including every static object.
    """
    counts = np.asarray(object_counts, dtype=np.int64)
    original_slots = np.repeat(np.arange(len(counts)), counts)
    permutation = np.random.Generator(np.random.PCG64(seed)).permutation(len(original_slots))
    return original_slots[permutation]


def apply_region_weights(object_ids, source_groups, base_weights, region_specs):
    """Use explicit source group membership; overlapping weights combine by max.

    No bounding-box heuristic, name substring, or object-order guess selects a
    region. Output indices follow the original rendered object table order.
    """
    weights = np.asarray(base_weights, dtype=float).copy()
    group_members = {group["name"]: set(group["objectIds"]) for group in source_groups}
    if len(group_members) != len(source_groups):
        raise ValueError("Source group names must be unique for semantic selection")
    rendered = set(object_ids)
    selected = []
    for spec in region_specs:
        members = set()
        for name in spec["sourceGroupNames"]:
            if name not in group_members:
                raise ValueError(f"Required semantic source group is absent: {name}")
            members.update(group_members[name])
        if not members or members - rendered:
            raise ValueError(f"Semantic region contains missing/non-rendered roots: {spec['name']}")
        if "expectedObjectCount" in spec and len(members) != spec["expectedObjectCount"]:
            raise ValueError(f"Semantic source membership count changed: {spec['name']}")
        weight = float(spec["weight"])
        if not np.isfinite(weight) or weight < 1:
            raise ValueError("Semantic detail weights must be finite and at least one")
        indices = [i for i, oid in enumerate(object_ids) if oid in members]
        weights[indices] = np.maximum(weights[indices], weight)
        selected.append({"name": spec["name"], "sourceGroupNames": spec["sourceGroupNames"],
                         "weight": weight, "objectIndices": indices})
    return weights, selected


def sample_surface(vertices, triangles, object_indices, object_ids,
                   object_weights, group_lookup, count, seed, allocated_counts=None):
    if not np.isfinite(vertices).all() or (triangles < 0).any() or (triangles >= len(vertices)).any():
        raise ValueError("Invalid source mesh coordinates or indices")
    tri_vertices = vertices[triangles]
    cross = np.cross(tri_vertices[:, 1] - tri_vertices[:, 0],
                     tri_vertices[:, 2] - tri_vertices[:, 0])
    lengths = np.linalg.norm(cross, axis=1)
    areas = lengths * 0.5
    object_areas = np.bincount(object_indices, weights=areas, minlength=len(object_ids))
    counts = (allocate_counts(object_areas * object_weights, count) if allocated_counts is None
              else np.asarray(allocated_counts, dtype=np.int64))
    if counts.shape != object_areas.shape or counts.sum() != count or (counts < 0).any():
        raise ValueError("Invalid explicit object allocations")
    if np.any((counts > 0) & (object_areas <= 0)):
        raise ValueError("Allocated root has no nondegenerate triangles")
    order = np.argsort(object_indices, kind="stable")
    offsets = np.r_[0, np.cumsum(np.bincount(object_indices, minlength=len(object_ids)))]
    positions = np.empty((count, 3), dtype=np.float64)
    normals = np.empty_like(positions)
    groups = np.empty(count, dtype=np.uint16)
    cursor = 0
    for i, oid in enumerate(object_ids):
        n = int(counts[i])
        if not n:
            continue
        triangle_ids = order[offsets[i]:offsets[i + 1]]
        triangle_ids = triangle_ids[areas[triangle_ids] > 0]
        cumulative = np.cumsum(areas[triangle_ids])
        # UUID-derived randomness means object identity never depends on Python hash().
        object_seed = int.from_bytes(hashlib.sha256(f"{seed}:{oid}".encode()).digest()[:8], "little")
        rng = np.random.Generator(np.random.PCG64(object_seed))
        # Stratification retains small surface features more reliably than iid draws.
        pick = (np.arange(n) + rng.random(n)) / n * cumulative[-1]
        chosen = triangle_ids[np.searchsorted(cumulative, pick, side="right")]
        r1, r2 = np.sqrt(rng.random(n)), rng.random(n)
        barycentric = np.column_stack([1 - r1, r1 * (1 - r2), r1 * r2])
        end = cursor + n
        positions[cursor:end] = np.einsum("ij,ijk->ik", barycentric, tri_vertices[chosen])
        normals[cursor:end] = cross[chosen] / lengths[chosen, None]
        groups[cursor:end] = group_lookup[i]
        cursor = end
    # Stable permutation disperses root blocks while retaining reconstructible provenance.
    permutation = np.random.Generator(np.random.PCG64(seed)).permutation(count)
    return positions[permutation], normals[permutation], groups[permutation], counts, object_areas


def make_shot(view, scale, source_points):
    original_projection = np.asarray(view["cameraToClip"], dtype=np.float64)
    projection = original_projection.copy()
    projection[2] *= -1  # Rhino clip depth is reversed relative to OpenGL.
    # New camera-space coordinates are uniformly scaled. Scaling the translation
    # column retains every NDC component, including asymmetric two-point frusta.
    projection[:, 3] *= scale
    eye = map_xyz(view["CameraLocation"], scale)
    basis = np.array([unit_mapped(view[key]) for key in ("CameraX", "CameraY", "CameraZ")])
    transformed = (map_xyz(source_points, scale) - eye) @ basis.T
    normalized_clip = np.c_[transformed, np.ones(len(transformed))] @ projection.T
    original_clip = np.c_[source_points, np.ones(len(source_points))] @ np.asarray(view["worldToClip"]).T
    original_clip[:, 2] *= -1
    safe = np.abs(original_clip[:, 3]) > 1e-8
    error = np.max(np.abs(normalized_clip[safe, :3] / normalized_clip[safe, 3, None]
                          - original_clip[safe, :3] / original_clip[safe, 3, None]))
    if error > 1e-7:
        raise ValueError(f"Projection equivalence failed for {view['name']}: {error}")
    return {
        "name": view["name"], "eye": eye.tolist(), "up": unit_mapped(view["CameraUp"]),
        "direction": unit_mapped(view["CameraDirection"]),
        "rawTarget": map_xyz(view["TargetPoint"], scale).tolist(),
        "cameraX": basis[0].tolist(), "cameraY": basis[1].tolist(), "cameraZ": basis[2].tolist(),
        "projection": projection.flatten().tolist(), "projectionLayout": "row-major OpenGL",
        "savedAspect": view["ScreenPortAspect"], "originalFrustum": view["frustum"],
        "frustum": {key: value * scale for key, value in view["frustum"].items()},
        "isTwoPointPerspective": view["IsTwoPointPerspectiveProjection"],
        "lens35mm": view["Camera35mmLensLength"], "screenPort": view["screenPort"],
        "projectionValidationMaxNdcError": float(error),
    }


def verify_binary(data, bounds, group_count, point_count=POINT_COUNT):
    if len(data) != 16 + 20 * point_count or struct.unpack_from("<4sIII", data) != (b"PVR1", point_count, 1, 0):
        raise ValueError("Cache header/length mismatch")
    positions = np.frombuffer(data, dtype="<f4", count=3 * point_count, offset=16).reshape(-1, 3)
    normals = np.frombuffer(data, dtype="<i2", count=3 * point_count, offset=16 + 12 * point_count).reshape(-1, 3)
    indices = np.frombuffer(data, dtype="<u2", count=point_count, offset=16 + 18 * point_count)
    if not np.isfinite(positions).all() or np.any(positions < np.asarray(bounds[0]) - 1e-6) or np.any(positions > np.asarray(bounds[1]) + 1e-6):
        raise ValueError("Decoded positions are nonfinite or outside source bounds")
    if np.max(np.abs(np.linalg.norm(normals.astype(float) / 32767, axis=1) - 1)) > 0.00004:
        raise ValueError("Decoded normals are not snorm16 unit normals")
    found = set(indices.tolist())
    if found - set(range(group_count)) or set(range(1, group_count)) - found:
        raise ValueError("Missing or out-of-range motion group identity")



def allocate_scene_counts(areas, weights, columns):
    """Reserve equal, readable density for 72 columns; weight venue separately."""
    areas, weights = np.asarray(areas), np.asarray(weights)
    columns = np.asarray(columns, dtype=bool)
    if columns.shape != areas.shape or int(columns.sum()) != COLUMN_COUNT:
        raise ValueError('Expected exactly 72 column roots')
    if np.any(areas[columns] <= 0):
        raise ValueError('A column has no nondegenerate cached surface')
    counts = np.zeros(len(areas), dtype=np.int64)
    counts[columns] = COLUMN_POINT_COUNT // COLUMN_COUNT
    counts[~columns] = allocate_counts(areas[~columns] * weights[~columns], POINT_COUNT-COLUMN_POINT_COUNT)
    return counts


def make_motion_groups(inventory):
    """Select source semantics explicitly; one rigid motion group per root."""
    rendered = inventory['renderedObjectIds']
    if len(set(rendered)) != len(rendered):
        raise ValueError('Duplicate rendered object identity')
    objects = {o['id']: o for o in inventory['objects']}
    layer_ids = {l['index'] for l in inventory['layers'] if l['name'] == 'pillarette'}
    definitions = {d['id']: d for d in inventory['instanceDefinitions'] if d['name'] == 'people'}
    if len(layer_ids) != 1 or len(definitions) != 1:
        raise ValueError('Expected unique pillarette layer and people block definition')
    column_ids = {oid for oid in rendered if objects[oid]['type'] == 'Extrusion'
                  and objects[oid]['layerIndex'] in layer_ids}
    people_ids = {oid for oid in rendered if objects[oid]['type'] == 'InstanceReference'
                  and objects[oid].get('definitionId') in definitions}
    source_groups = {g['name']: set(g['objectIds']) for g in inventory['groups']}
    halves = [source_groups.get(name, set()) for name in ('Group01', 'Group02')]
    if (len(column_ids) != COLUMN_COUNT or len(people_ids) != CROWD_COUNT
            or any(len(h) != 36 for h in halves) or halves[0] & halves[1]
            or halves[0] | halves[1] != column_ids):
        raise ValueError('Source column (72, two groups of 36) / people (117) identity changed')
    groups = [{'index': 0, 'id': 'static', 'kind': 'static', 'pivot': [0,0,0],
               'amplitude': [0,0], 'frequencyHz': 0, 'phase': [0,0]}]
    lookup = np.zeros(len(rendered), dtype=np.uint16)
    columns = np.array([oid in column_ids for oid in rendered])
    for kind, ids in [('height', column_ids), ('crowd', people_ids)]:
        for i, oid in enumerate(rendered):
            if oid not in ids:
                continue
            obj = objects[oid]
            bounds = np.asarray(obj['renderedBounds'], dtype=float)
            if bounds.shape != (2,3) or not np.isfinite(bounds).all() or np.any(bounds[1] < bounds[0]):
                raise ValueError('Invalid rendered root bounds')
            pivot = (bounds[0]+bounds[1])/2
            pivot[2] = bounds[0,2]
            seed = int.from_bytes(hashlib.sha256(f'{SEED}:motion:{oid}'.encode()).digest()[:4], 'little')
            rng = np.random.Generator(np.random.PCG64(seed))
            frequency = float(rng.uniform(.1,.24) if kind == 'height' else rng.uniform(.12,.32))
            phase = rng.uniform(0, np.pi*2, 2).tolist()
            amplitude = [1.,0.] if kind == 'height' else [-float(rng.uniform(.006,.014)),float(rng.uniform(.004,.01))]
            group = {'index': len(groups), 'id': f'{kind}:{oid}', 'kind': kind,
                     'sourceObjectId': oid, 'seed': seed, 'pivot': map_xyz(pivot, SCALE).tolist(),
                     'amplitude': amplitude, 'frequencyHz': frequency, 'phase': phase}
            if kind == 'height':
                group['heightScaleRange'] = [.12, 1.3]
            else:
                group['definitionMemberIds'] = definitions[obj['definitionId']]['objectIds']
            lookup[i] = len(groups)
            groups.append(group)
    return groups, lookup, columns


def bake_model(study_dir, source_path, crowd_weight=8.):
    inventory_path = study_dir / 'profile-inventory.json'
    mesh_path = study_dir / 'profile-mesh.npz'
    inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
    expected_sha = inventory['sha256'].lower()
    if sha256(source_path) != expected_sha:
        raise ValueError('Provided source does not match the extracted Profile study')
    if inventory['units'] != 'UnitSystem.Meters':
        raise ValueError('The unified Profile scene must use meters')
    views = inventory['namedViews']
    if len(views) != 4 or {v['name'] for v in views} != set(SHOT_NAMES):
        raise ValueError('Expected exactly Student, Career, Photo, Band saved author views')
    groups, group_lookup, columns = make_motion_groups(inventory)
    rendered_ids = inventory['renderedObjectIds']
    if len(rendered_ids) != 527:
        raise ValueError('Expected all 527 visible rendered source roots')
    weights = np.ones(len(rendered_ids))
    weights[group_lookup > COLUMN_COUNT] = crowd_weight
    weights, detail_regions = apply_region_weights(rendered_ids, inventory['groups'], weights, DETAIL_REGIONS)
    with np.load(mesh_path, allow_pickle=False) as mesh:
        vertices, triangles, object_indices = mesh['vertices'], mesh['triangles'], mesh['objectIds']
    if (not len(triangles) or object_indices.shape != (len(triangles),)
            or object_indices.min() < 0 or object_indices.max() >= len(rendered_ids)):
        raise ValueError('Invalid triangle-to-root-object identity')
    if not np.isfinite(vertices).all() or np.any(triangles < 0) or np.any(triangles >= len(vertices)):
        raise ValueError('Invalid source mesh coordinates or indices')
    tri_vertices = vertices[triangles]
    areas = np.linalg.norm(np.cross(tri_vertices[:,1]-tri_vertices[:,0],tri_vertices[:,2]-tri_vertices[:,0]), axis=1)*.5
    object_areas = np.bincount(object_indices, weights=areas, minlength=len(rendered_ids))
    counts = allocate_scene_counts(object_areas, weights, columns)
    positions, normals, motion_indices, counts, object_areas = sample_surface(
        vertices, triangles, object_indices, rendered_ids, weights, group_lookup, POINT_COUNT, SEED, counts)
    baseline_counts = allocate_scene_counts(object_areas, np.ones(len(rendered_ids)), columns)
    regions = []
    for region in detail_regions + [{'name':'people', 'sourceGroupNames':[], 'weight':crowd_weight,
                                      'objectIndices':np.flatnonzero(group_lookup > COLUMN_COUNT).tolist()}]:
        indices = region['objectIndices']
        count, baseline = int(counts[indices].sum()), int(baseline_counts[indices].sum())
        if count <= baseline:
            raise ValueError(f'Detail weighting did not increase samples: {region["name"]}')
        regions.append({k:v for k,v in region.items() if k != 'objectIndices'} |
                       {'objectCount':len(indices), 'pointCount':count, 'uniformVenuePointCount':baseline,
                        'sourceSurfaceArea':float(object_areas[indices].sum())})
    normalized = map_xyz(positions, SCALE).astype('<f4')
    data = (struct.pack('<4sIII', b'PVR1', POINT_COUNT, 1, 0) + normalized.tobytes()
            + np.rint(map_xyz(normals,1)*32767).astype('<i2').tobytes()
            + motion_indices.astype('<u2').tobytes())
    mapped_vertices = map_xyz(vertices[np.unique(triangles)], SCALE)
    bounds = [mapped_vertices.min(axis=0).tolist(), mapped_vertices.max(axis=0).tolist()]
    verify_binary(data, bounds, len(groups))
    reconstructed = reconstruct_source_object_indices(counts, SEED)
    if not np.array_equal(group_lookup[reconstructed], motion_indices):
        raise ValueError('Root provenance reconstruction does not match motion groups')
    group_counts = np.bincount(motion_indices, minlength=len(groups))
    for group in groups:
        group['pointCount'] = int(group_counts[group['index']])
    by_name = {v['name']:v for v in views}
    shots = [make_shot(by_name[name], SCALE, positions[::100]) for name in SHOT_NAMES]
    if sha256(source_path) != expected_sha:
        raise ValueError('Source changed during the read-only bake')
    return data, {
        'id':'profile', 'url':'scene.bin', 'sourceSha256':expected_sha,
        'sourceUnits':inventory['units'], 'scale':SCALE, 'pointCount':POINT_COUNT,
        'byteLength':len(data), 'sha256':hashlib.sha256(data).hexdigest(),
        'bounds':bounds, 'groups':groups, 'shots':shots,
        'sampling': {
            'method':'stratified surface-area sampling within each source root object',
            'allocation':'135000 points equally among 72 columns; 135000 weighted largest remainder among remaining roots with positive-area coverage',
            'seed':SEED, 'columnPointCount':COLUMN_POINT_COUNT, 'pointsPerColumn':COLUMN_POINT_COUNT//COLUMN_COUNT,
            'venuePointCount':POINT_COUNT-COLUMN_POINT_COUNT, 'crowdSurfaceWeight':crowd_weight,
            'objectAllocations':[{'sourceObjectId':oid, 'pointCount':int(counts[i]),
                                  'motionGroupIndex':int(group_lookup[i]), 'surfaceWeight':float(weights[i])}
                                 for i,oid in enumerate(rendered_ids)],
            'sourceIdentity':{'allocationOrder':'inventory renderedObjectIds order; consecutive root blocks before permutation',
                              'permutationAlgorithm':'numpy.random.Generator(numpy.random.PCG64(seed)).permutation(pointCount)',
                              'permutationSeed':SEED, 'numpyVersion':np.__version__,
                              'permutationDirection':'output point i takes original slot permutation[i]',
                              'reconstructionFunction':'scripts/bake-profile-rhino-cache.py:reconstruct_source_object_indices'},
            'detailRegions':regions, 'weightOverlapRule':'maximum, never multiply',
            'renderedObjects':len(rendered_ids), 'sampledObjects':int((counts>0).sum()),
            'triangles':len(triangles), 'sourceSurfaceArea':float(object_areas.sum()),
            'surfaceAreaUnits':'meters squared', 'inventorySha256':sha256(inventory_path), 'meshSha256':sha256(mesh_path)
        }
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='Private unified Profile .3dm; read only')
    parser.add_argument('--study-dir', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--crowd-weight', type=float, default=8.)
    parser.add_argument('--verify-determinism', action='store_true')
    args = parser.parse_args()
    if not np.isfinite(args.crowd_weight) or args.crowd_weight <= 0:
        parser.error('--crowd-weight must be finite and positive')
    if args.study_dir.resolve() == args.output_dir.resolve():
        parser.error('Keep private study inputs separate from public output')
    data, model = bake_model(args.study_dir, args.source, args.crowd_weight)
    if args.verify_determinism:
        again, again_model = bake_model(args.study_dir, args.source, args.crowd_weight)
        if data != again or model != again_model:
            raise ValueError('Repeated Profile bake is not deterministic')
    manifest = {'version':2, 'pointCount':POINT_COUNT, 'seed':SEED,
                'coordinateConvention':'source (x,y,z) -> (x,z,-y)*0.1; Y up, right handed',
                'normalEncoding':'signed normalized int16; divide by 32767',
                'particleIdentity':'fixed array index within the one unified source scene',
                'motionConvention':'positive amplitude.x: anchored column height; negative amplitude.x: rigid crowd translation; zero: static',
                'model':model}
    from profile_dumbo_exterior import bake_exterior
    exterior_data, exterior = bake_exterior(args.study_dir)
    manifest['exterior'] = exterior
    manifest_path = args.output_dir / 'manifest.json'
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / 'scene.bin').write_bytes(data)
    (args.output_dir / 'dumbo.bin').write_bytes(exterior_data)
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'sha256':model['sha256'], 'bytes':len(data), 'points':POINT_COUNT,
                      'columns':COLUMN_COUNT, 'people':CROWD_COUNT, 'shots':[s['name'] for s in model['shots']],
                      'detailRegions':model['sampling']['detailRegions'], 'determinismVerified':args.verify_determinism}))


if __name__ == '__main__':
    main()
