"""Deterministic, authored 3D DUMBO-inspired streetscape outside the Rhino window.

This is supplemental procedural geometry, not an extraction of the original 3dm
and not a photographic plane. Geometry is authored in Rhino XYZ metres, then
mapped to the Livehouse's (x,z,-y)*0.1 coordinates. No source image is bundled.
"""
import hashlib
import json
from pathlib import Path
import struct

import numpy as np


COUNT = 45000
SEED = 0x44554D42
STREET_ELEVATION = -.30  # One 3m storey below the unchanged Livehouse floor.
BRIDGE_HEIGHT_SCALE = .90
BRIDGE_DEPTH = 6.73
BRIDGE_DIRECTION = np.array([.4472135955, .8944271910])
BRIDGE_CROSS = np.array([BRIDGE_DIRECTION[1], -BRIDGE_DIRECTION[0]])
REAR_WALL_ID = "b8d64761-8970-4c53-ad11-5f7e46b556f8"
FEATURE_COUNTS = {"brick-warehouse-facades": 14000, "repeated-window-frames": 9000,
                  "cobblestone-street": 6500, "steel-portal-tower-and-crossbracing": 7500,
                  "diagonal-elevated-deck": 4000, "curved-suspension-cables": 2000,
                  "parked-cars": 1500, "street-lamps": 500}


def derive_portal(study_dir):
    """Find the central four-sided hole from the actual rear-wall mesh boundary."""
    inventory = json.loads((study_dir / "profile-inventory.json").read_text(encoding="utf-8"))
    index = inventory["renderedObjectIds"].index(REAR_WALL_ID)
    with np.load(study_dir / "profile-mesh.npz", allow_pickle=False) as mesh:
        vertices, triangles, objects = mesh["vertices"], mesh["triangles"], mesh["objectIds"]
    wall = vertices[triangles[objects == index]]
    rear_y = float(wall[:, :, 1].min())
    wall = wall[np.all(np.abs(wall[:, :, 1] - rear_y) < 1e-5, axis=1)]
    edge_counts = {}
    for triangle in wall:
        for a, b in [(0, 1), (1, 2), (2, 0)]:
            edge = tuple(sorted((tuple(np.round(triangle[a, [0, 2]], 7)),
                                 tuple(np.round(triangle[b, [0, 2]], 7)))))
            edge_counts[edge] = edge_counts.get(edge, 0) + 1
    boundary = [np.asarray(edge) for edge, count in edge_counts.items() if count == 1]
    target_x = next(view for view in inventory["namedViews"] if view['name'].lower()=='photo')["TargetPoint"][0]
    verticals = [edge for edge in boundary if abs(edge[0, 0] - edge[1, 0]) < 1e-6]
    left = max((edge for edge in verticals if edge[0, 0] < target_x), key=lambda edge: edge[0, 0])
    right = min((edge for edge in verticals if edge[0, 0] > target_x), key=lambda edge: edge[0, 0])
    if not np.allclose(sorted(left[:, 1]), sorted(right[:, 1]), atol=1e-6):
        raise ValueError("Window side boundary heights disagree")
    low, high = sorted(left[:, 1])
    for height in (low, high):
        if not any(np.allclose(edge[:, 1], height) and
                   np.allclose(sorted(edge[:, 0]), [left[0, 0], right[0, 0]]) for edge in boundary):
            raise ValueError("Window horizontal boundary is absent")
    return {"z": -rear_y * .1, "xMin": float(left[0, 0] * .1),
            "xMax": float(right[0, 0] * .1), "yMin": float(low * .1), "yMax": float(high * .1)}


class Scene:
    def __init__(self, center_x):
        self.center_x = center_x
        self.primitives = {name: [] for name in FEATURE_COUNTS}

    def xyz(self, x, depth, height):
        # Helpers use display-sized dimensions; stored construction coordinates
        # are true source-axis XYZ metres, outside the source's negative-Y wall.
        return np.array([(self.center_x + x) * 10, -depth * 10,
                         (height + STREET_ELEVATION) * 10])

    def tube(self, feature, start, end, radius=.003, weight=1):
        a, b = self.xyz(*start), self.xyz(*end)
        self.primitives[feature].append(("tube", np.array([a, b]), radius * 10,
                                        np.linalg.norm(b - a) * weight))

    def quad(self, feature, a, b, c, d, weight=1):
        points = np.array([self.xyz(*point) for point in (a, b, c, d)])
        area = np.linalg.norm(np.cross(points[1] - points[0], points[3] - points[0]))
        self.primitives[feature].append(("quad", points, 0, area * weight))

    def box(self, feature, x, depth, height, width, length, tall):
        corners = [(x + dx * width / 2, depth + dz * length / 2, height + dy * tall / 2)
                   for dx, dz, dy in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
                                     (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]]
        for indices in [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
                        (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
            self.quad(feature, *(corners[i] for i in indices))


def bridge_point(along, across, height):
    """One rigid plan basis for tower, level deck, cables and hangers."""
    x, depth = BRIDGE_DIRECTION * along + BRIDGE_CROSS * across
    return (float(x), float(depth + BRIDGE_DEPTH), height * BRIDGE_HEIGHT_SCALE)


def facade_occluders(portal):
    center = (portal["xMin"] + portal["xMax"]) / 2
    # Inset the solid proxy past the window-frame recess and wall tube radius.
    # Endpoint distance alone cannot protect those surfaces at grazing angles.
    return [{"id": "left-warehouse", "min": [center - 3.5, STREET_ELEVATION, 3.0],
             "max": [center - .772, 1.88 + STREET_ELEVATION, 6.52]},
            {"id": "right-warehouse", "min": [center + .772, STREET_ELEVATION, 3.0],
             "max": [center + 3.5, 1.88 + STREET_ELEVATION, 6.52]}]


def occluded_by_facades(points, eye, boxes, surface_bias=.012):
    """Segment/AABB reference for diagnostics; runtime uses the current eye."""
    points, eye = np.asarray(points), np.asarray(eye)
    ray = points - eye
    distance = np.linalg.norm(ray, axis=1)
    occluded = np.zeros(len(points), dtype=bool)
    for box in boxes:
        low, high = np.asarray(box["min"]), np.asarray(box["max"])
        entry = np.full(len(points), -np.inf)
        leave = np.full(len(points), np.inf)
        intersects = np.ones(len(points), dtype=bool)
        for axis in range(3):
            parallel = np.abs(ray[:, axis]) < 1e-8
            intersects &= ~parallel | ((eye[axis] >= low[axis]) & (eye[axis] <= high[axis]))
            safe_ray = np.where(parallel, 1, ray[:, axis])
            a, b = (low[axis] - eye[axis]) / safe_ray, (high[axis] - eye[axis]) / safe_ray
            entry = np.maximum(entry, np.where(parallel, -np.inf, np.minimum(a, b)))
            leave = np.minimum(leave, np.where(parallel, np.inf, np.maximum(a, b)))
        occluded |= intersects & (leave >= np.maximum(entry, 0)) & (leave > 0) & (entry > 0) & ((1 - entry) * distance > surface_bias)
    return occluded


def make_scene(portal):
    scene = Scene((portal["xMin"] + portal["xMax"]) / 2)
    facade, window = "brick-warehouse-facades", "repeated-window-frames"
    for side in (-1, 1):
        x = side * .76
        # Recessed windows are genuine holes between wall strips, with inset
        # framing. Each facade has six storeys and eleven repeated warehouse bays.
        for bay in range(11):
            start = 3.00 + bay * .32
            for floor in range(6):
                bottom = .06 + floor * .30
                scene.quad(facade, (x, start, bottom), (x, start + .32, bottom),
                           (x, start + .32, bottom + .085), (x, start, bottom + .085))
                scene.quad(facade, (x, start, bottom + .085), (x, start + .095, bottom + .085),
                           (x, start + .095, bottom + .30), (x, start, bottom + .30))
                for height in (bottom + .025, bottom + .055):
                    scene.tube(facade, (x - side * .002, start, height),
                               (x - side * .002, start + .32, height), .001, .25)
                wx, low, high = x + side * .006, bottom + .10, bottom + .275
                z1, z2 = start + .115, start + .295
                for a, b in [((wx, z1, low), (wx, z2, low)), ((wx, z2, low), (wx, z2, high)),
                             ((wx, z2, high), (wx, z1, high)), ((wx, z1, high), (wx, z1, low)),
                             ((wx, (z1 + z2) / 2, low), (wx, (z1 + z2) / 2, high)),
                             ((wx, z1, (low + high) / 2), (wx, z2, (low + high) / 2))]:
                    scene.tube(window, a, b, .002)
        for height in (.04, .95, 1.86, 1.88):
            scene.tube(facade, (x, 3, height), (x, 6.52, height), .008)
    road = "cobblestone-street"
    scene.quad(road, (-.62, 2.86, .006), (.62, 2.86, .006), (.62, 7.30, .006), (-.62, 7.30, .006), .05)
    for row in range(75):
        z = 2.88 + row * .058
        scene.tube(road, (-.62, z, .008), (.62, z, .008), .001)
        for column in range(16):
            x = -.62 + column * .08 + (row % 2) * .04
            scene.tube(road, (x, z, .008), (x, z + .058, .008), .001, .55)
    for side in (-1, 1):
        for x in (.62, .71):
            scene.tube(road, (side * x, 2.86, .025), (side * x, 7.30, .025), .004)
    tower = "steel-portal-tower-and-crossbracing"
    # Tower cross-section is perpendicular to the bridge's longitudinal axis.
    # Its steel legs straddle the road deck in the same physical coordinate frame.
    for side in (-1, 1):
        outer, inner = side * .47, side * .33
        for along in (-.07, .07):
            for across in (outer, inner):
                scene.tube(tower, bridge_point(along, across, .10), bridge_point(along, across, 1.94), .014, 2)
            for low in np.arange(.12, 1.80, .22):
                high = min(low + .22, 1.94)
                scene.tube(tower, bridge_point(along, outer, low), bridge_point(along, inner, high), .005)
                scene.tube(tower, bridge_point(along, inner, low), bridge_point(along, outer, high), .005)
                scene.tube(tower, bridge_point(along, outer, low), bridge_point(along, inner, low), .009)
        for height in (.12, .55, .99, 1.43, 1.94):
            for across in (outer, inner):
                scene.tube(tower, bridge_point(-.07, across, height), bridge_point(.07, across, height), .012)
    for along in (-.07, .07):
        for height in (1.83, 1.94):
            scene.tube(tower, bridge_point(along, -.50, height), bridge_point(along, .50, height), .018, 2)
        for a, b in zip(np.linspace(-.33, .33, 40)[:-1], np.linspace(-.33, .33, 40)[1:]):
            for base, rise in [(1.46, .34), (.30, .50)]:
                scene.tube(tower, bridge_point(along, a, base + rise * np.sqrt(max(0, 1 - (a / .33) ** 2))),
                           bridge_point(along, b, base + rise * np.sqrt(max(0, 1 - (b / .33) ** 2))), .010, 1.4)
    for across in (-.49, -.34, .34, .49):
        scene.tube(tower, bridge_point(0, across, 1.94), bridge_point(0, across, 2.02), .013)
    deck = "diagonal-elevated-deck"
    # A level deck recedes obliquely in actual plan; perspective supplies its
    # apparent slope. It runs through the tower rather than crossing in front.
    spans = np.unique(np.r_[np.linspace(-3.10, 4.20, 55), 0.0])
    for across in (-.40, .40):
        for height in (.89, 1.005, .835):
            scene.tube(deck, bridge_point(spans[0], across, height), bridge_point(spans[-1], across, height), .011, 2)
        for a, b in zip(spans[:-1], spans[1:]):
            scene.tube(deck, bridge_point(a, across, .89), bridge_point(b, across, 1.005), .004)
            scene.tube(deck, bridge_point(a, across, 1.005), bridge_point(b, across, .89), .004)
    for along in spans:
        scene.tube(deck, bridge_point(along, -.40, .835), bridge_point(along, .40, .835), .006)
    cable = "curved-suspension-cables"
    for across in (-.40, .40):
        for extent in (-3.10, 4.20):
            def cable_height(t):
                return 1.05 + .90 * (1 - t) ** 2
            points = [bridge_point(extent * t, across, cable_height(t)) for t in np.linspace(0, 1, 75)]
            for a, b in zip(points[:-1], points[1:]):
                scene.tube(cable, a, b, .0025, 2)
            for t in np.linspace(.06, .98, 22):
                scene.tube(cable, bridge_point(extent * t, across, 1.005),
                           bridge_point(extent * t, across, cable_height(t)), .0015)
    for side in (-1, 1):
        for z in (3.4, 4.05, 4.70, 5.35, 6.0):
            scene.box("parked-cars", side * .52, z, .070, .18, .35, .085)
            scene.box("parked-cars", side * .52, z + .02, .132, .145, .19, .070)
        for z in (3.75, 5.25, 6.45):
            x = side * .67
            scene.tube("street-lamps", (x, z, .02), (x, z, .46), .005)
            scene.tube("street-lamps", (x, z, .46), (x - side * .075, z, .47), .004)
            scene.box("street-lamps", x - side * .075, z, .455, .035, .035, .035)
    return scene


def build_exterior(portal):
    scene = make_scene(portal)
    rng = np.random.Generator(np.random.PCG64(SEED))
    all_positions, all_normals, features = [], [], []
    for name, count in FEATURE_COUNTS.items():
        primitives = scene.primitives[name]
        weights = np.array([primitive[3] for primitive in primitives])
        quotas = weights / weights.sum() * count
        counts = np.floor(quotas).astype(int)
        counts[np.argsort(-(quotas - counts), kind="stable")[:count - counts.sum()]] += 1
        points, normals = [], []
        for (kind, geometry, radius, _), n in zip(primitives, counts):
            if not n:
                continue
            a, b = geometry[:2]
            if kind == "tube":
                direction = (b - a) / np.linalg.norm(b - a)
                axis = np.eye(3)[np.argmin(np.abs(direction))]
                u = np.cross(direction, axis)
                u /= np.linalg.norm(u)
                v = np.cross(direction, u)
                angles = rng.random(n) * 2 * np.pi
                normal = np.cos(angles)[:, None] * u + np.sin(angles)[:, None] * v
                position = a + ((np.arange(n) + rng.random(n)) / n)[:, None] * (b - a) + radius * normal
            else:
                d = geometry[3]
                position = a + rng.random((n, 1)) * (b - a) + rng.random((n, 1)) * (d - a)
                normal = np.cross(b - a, d - a)
                normal /= np.linalg.norm(normal)
                normal = np.tile(normal, (n, 1))
            points.append(position)
            normals.append(normal)
        positions = np.concatenate(points)
        feature_normals = np.concatenate(normals)
        if len(positions) != count:
            raise ValueError(f"Exterior feature allocation mismatch: {name}")
        all_positions.append(positions)
        all_normals.append(feature_normals)
        features.append({"name": name, "pointCount": count, "primitiveCount": len(primitives)})
    positions = np.concatenate(all_positions)[:, [0, 2, 1]] * [.1, .1, -.1]
    normals = np.concatenate(all_normals)[:, [0, 2, 1]] * [1, 1, -1]
    if len(positions) != COUNT or np.any(positions[:, 2] <= portal["z"]) or not np.isfinite(positions).all():
        raise ValueError("Exterior count, coordinates, or window-plane separation failed")
    permutation = np.random.Generator(np.random.PCG64(SEED)).permutation(COUNT)
    positions = positions[permutation].astype("<f4")
    normals = np.rint(normals[permutation] * 32767).astype("<i2")
    data = struct.pack("<4sIII", b"PVR1", COUNT, 1, 0) + positions.tobytes() + normals.tobytes() + bytes(COUNT * 2)
    return data, {"id": "dumbo", "url": "dumbo.bin", "pointCount": COUNT, "byteLength": len(data),
                  "sha256": hashlib.sha256(data).hexdigest(),
                  "bounds": [positions.min(0).tolist(), positions.max(0).tolist()], "portal": portal,
                  "description": "Authored simplified DUMBO street canyon with brick warehouses and a Manhattan Bridge steel portal, diagonal deck and suspension cables; approximate composition inspired by supplied references.",
                  "source": "authored-procedural; supplemental exterior, not part of the original Rhino model",
                  "coordinateConvention": "Rhino XYZ metres -> (x,z,-y)*0.1, same Livehouse world coordinates",
                  "portalSourceObjectId": REAR_WALL_ID, "features": features, "seed": SEED,
                  "compositionFit": "Exterior lowered by one 3m storey; rigid oblique bridge plan and level deck, with bridge heights uniformly scaled by 0.90",
                  "streetElevation": STREET_ELEVATION, "floorHeight": .30,
                  "bridgePlan": {"origin": [scene.center_x, BRIDGE_DEPTH],
                                 "longitudinal": BRIDGE_DIRECTION.tolist(), "transverse": BRIDGE_CROSS.tolist(),
                                 "deckElevation": .89 * BRIDGE_HEIGHT_SCALE + STREET_ELEVATION,
                                 "spanRange": [-3.10, 4.20]},
                  "occluders": facade_occluders(portal), "occlusionSurfaceBias": .012,
                  "motionGroups": "all static group 0", "requiresExtendedFarPlane": True}


def bake_exterior(study_dir):
    return build_exterior(derive_portal(study_dir))


def render_diagnostic(data, exterior, livehouse, output_dir, live_data=None):
    """Offline saved-camera projection with the same world-space portal clipping."""
    from PIL import Image, ImageDraw
    output_dir.mkdir(parents=True, exist_ok=True)
    shot = next(shot for shot in livehouse["shots"] if shot['name'].lower()=='photo')
    eye = np.asarray(shot["eye"])
    basis = np.asarray([shot["cameraX"], shot["cameraY"], shot["cameraZ"]])
    projection = np.asarray(shot["projection"]).reshape(4, 4)
    width, height = 1800, round(1800 / shot["savedAspect"])
    portal = exterior["portal"]
    canvas = np.zeros((height, width), dtype=float)

    def project(points):
        camera = (points - eye) @ basis.T
        clip = np.c_[camera, np.ones(len(points))] @ projection.T
        return clip[:, :2] / clip[:, 3, None], clip[:, 3]

    def draw_points(binary, count, clip_portal, intensity):
        points = np.frombuffer(binary, "<f4", 3 * count, 16).reshape(-1, 3)
        ndc, depth = project(points)
        valid = (depth > 0) & (np.abs(ndc[:, 0]) < 1) & (np.abs(ndc[:, 1]) < 1)
        if clip_portal:
            t = (portal["z"] - eye[2]) / (points[:, 2] - eye[2])
            hit = eye + t[:, None] * (points - eye)
            valid &= ((t > 0) & (t < 1) & (hit[:, 0] >= portal["xMin"]) & (hit[:, 0] <= portal["xMax"])
                      & (hit[:, 1] >= portal["yMin"]) & (hit[:, 1] <= portal["yMax"]))
            valid &= ~occluded_by_facades(points, eye, exterior["occluders"], exterior["occlusionSurfaceBias"])
        px = ((ndc[valid, 0] + 1) * .5 * (width - 1)).astype(int)
        py = ((1 - ndc[valid, 1]) * .5 * (height - 1)).astype(int)
        np.add.at(canvas, (py, px), intensity)
        return int(valid.sum())

    if live_data:
        draw_points(live_data, livehouse["pointCount"], False, .50)
    visible = draw_points(data, exterior["pointCount"], True, .70)
    rgb = np.clip(245 - 220 * (1 - np.exp(-canvas)), 0, 255).astype(np.uint8)
    image = Image.fromarray(rgb, mode="L").convert("RGB")
    draw = ImageDraw.Draw(image)
    draw.text((24, 24), "Offline author-camera projection / procedural DUMBO through actual window aperture", fill=(30, 30, 30))
    draw.text((24, 44), f"{visible} exterior points inside author view and portal; projected XY preserved; diagnostic ignores saved far clip", fill=(40, 40, 40))
    image.save(output_dir / "dumbo-author-view.png")
    corners = np.array([[portal["xMin"], portal["yMin"], portal["z"]], [portal["xMax"], portal["yMax"], portal["z"]]])
    ndc, _ = project(corners)
    pixels = np.column_stack([(ndc[:, 0] + 1) * .5 * width, (1 - ndc[:, 1]) * .5 * height])
    low, high = pixels.min(0).astype(int), pixels.max(0).astype(int)
    crop = image.crop((low[0] - 5, low[1] - 5, high[0] + 5, high[1] + 5))
    crop.resize((crop.width * 2, crop.height * 2)).save(output_dir / "dumbo-window-detail.png")
    print(json.dumps({"diagnosticVisibleExteriorPoints": visible, "diagnosticDirectory": str(output_dir)}))
