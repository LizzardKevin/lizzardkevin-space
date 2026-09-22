"""Source-independent and optional private-source Profile baker checks."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

SPEC = importlib.util.spec_from_file_location('baker', Path(__file__).with_name('bake-profile-rhino-cache.py'))
baker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(baker)


def inventory():
    columns = [{'id': f'column-{i}', 'type': 'Extrusion', 'layerIndex': 6,
                'renderedBounds': [[i, 2, 3], [i+2, 4, 8]]} for i in range(72)]
    people = [{'id': f'person-{i}', 'type': 'InstanceReference', 'layerIndex': 0,
               'definitionId': 'people-definition', 'renderedBounds': [[i, 2, 3], [i+1, 3, 5]]} for i in range(117)]
    objects = columns + people + [{'id': 'ground', 'type': 'Extrusion', 'layerIndex': 7}]
    return {'objects': objects, 'renderedObjectIds': [o['id'] for o in objects],
            'layers': [{'index': 6, 'name': 'pillarette'}, {'index': 7, 'name': 'ground'}],
            'groups': [{'name': 'Group01', 'objectIds': [o['id'] for o in columns[:36]]},
                       {'name': 'Group02', 'objectIds': [o['id'] for o in columns[36:]]}],
            'instanceDefinitions': [{'id': 'people-definition', 'name': 'people', 'objectIds': ['body','head']}]}


class SamplingTests(unittest.TestCase):
    def test_unified_budget_reserves_column_density_and_keeps_ground(self):
        areas = np.r_[np.geomspace(.01, 10, 72), 1000., .001]
        columns = np.arange(len(areas)) < 72
        counts = baker.allocate_scene_counts(areas, np.ones(len(areas)), columns)
        self.assertEqual(int(counts.sum()), 270000)
        self.assertTrue(np.all(counts[:72] == 1875))
        self.assertEqual(int(counts[72:].sum()), 135000)
        self.assertGreater(counts[-1], 0)
        with self.assertRaises(ValueError):
            baker.allocate_scene_counts(areas, np.ones(len(areas)), np.zeros(len(areas), bool))

    def test_motion_groups_follow_source_semantics_and_rendered_bottom_center(self):
        source = inventory()
        groups, lookup, columns = baker.make_motion_groups(source)
        self.assertEqual(len(groups), 190)
        self.assertEqual(sum(g['kind']=='height' for g in groups), 72)
        self.assertEqual(sum(g['kind']=='crowd' for g in groups), 117)
        self.assertTrue(np.allclose(groups[1]['pivot'], [.1, .3, -.3]))
        self.assertEqual(lookup[-1], 0)
        self.assertEqual(int(columns.sum()), 72)
        self.assertTrue(all(g['amplitude'][0] > 0 for g in groups[1:73]))
        self.assertTrue(all(g['amplitude'][0] < 0 for g in groups[73:]))
        self.assertEqual(len(set(g['phase'][0] for g in groups[1:73])), 72)
        self.assertEqual(len(set(g['frequencyHz'] for g in groups[1:73])), 72)
        again, _, _ = baker.make_motion_groups(source)
        self.assertEqual(groups, again)
        source['objects'][0]['layerIndex'] = 7
        with self.assertRaises(ValueError):
            baker.make_motion_groups(source)

    def test_surface_samples_are_deterministic_and_retain_root_identity(self):
        vertices = np.array([[0,0,0],[1,0,0],[0,1,0],[10,0,0],[12,0,0],[10,2,0]], float)
        args = (vertices, np.array([[0,1,2],[3,4,5]]), np.array([0,1]),
                ['ground','moving'], np.ones(2), np.array([0,1]), 10000, 42)
        first = baker.sample_surface(*args)
        second = baker.sample_surface(*args)
        for a,b in zip(first, second):
            self.assertTrue(np.array_equal(a,b))
        positions,normals,groups,counts,_ = first
        self.assertLess(abs(counts[1]/counts[0]-4), .01)
        roots = baker.reconstruct_source_object_indices(counts, 42)
        self.assertTrue(np.array_equal(roots, groups))
        self.assertTrue(np.array_equal(np.floor(positions[:,0]/10).astype(int), roots))
        self.assertTrue(np.allclose(normals, [0,0,1]))

    def test_detail_weights_preserve_crowd_and_are_order_independent(self):
        groups = [{'name':'frame','objectIds':['a','b']},{'name':'arrays','objectIds':['b','c']}]
        specs = [{'name':'truss','sourceGroupNames':['frame'],'weight':6},
                 {'name':'speakers','sourceGroupNames':['arrays'],'weight':10}]
        base = np.array([1,8,1,1.])
        weights,_ = baker.apply_region_weights(['c','a','b','ground'], groups, base, specs)
        self.assertTrue(np.array_equal(weights, [10,8,10,1]))
        reverse,_ = baker.apply_region_weights(['c','a','b','ground'], groups, base, specs[::-1])
        self.assertTrue(np.array_equal(weights, reverse))
        self.assertTrue(np.array_equal(base, [1,8,1,1]))

    def test_mapping_preserves_handedness(self):
        xyz = baker.map_xyz(np.eye(3), 1)
        self.assertTrue(np.allclose(np.cross(xyz[0],xyz[1]), xyz[2]))
        self.assertTrue(np.allclose(baker.map_xyz([[2,3,4]], .1), [[.2,.4,-.3]]))


class ExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            import rhino3dm
        except ImportError:
            raise unittest.SkipTest('rhino3dm is needed only for extraction tests')
        spec = importlib.util.spec_from_file_location('extractor', Path(__file__).with_name('extract-profile-rhino-study.py'))
        cls.extractor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.extractor)
        cls.rhino = rhino3dm

    def test_hidden_parent_layer_hides_child_geometry(self):
        from types import SimpleNamespace
        zero = '00000000-0000-0000-0000-000000000000'
        parent = SimpleNamespace(Id='parent', ParentLayerId=zero, Visible=False)
        child = SimpleNamespace(Id='child', ParentLayerId='parent', Visible=True)
        layers = {0:parent,1:child}
        self.assertFalse(self.extractor.visible_layer(1,layers))
        parent.Visible = True
        self.assertTrue(self.extractor.visible_layer(1,layers))
        parent.ParentLayerId = 'child'
        self.assertFalse(self.extractor.visible_layer(1,layers))

    def test_mesh_quads_are_preserved_and_curves_have_empty_meshes(self):
        r = self.rhino
        mesh = r.Mesh()
        for point in [(0,0,0),(1,0,0),(1,1,0),(0,1,0)]:
            mesh.Vertices.Add(*point)
        mesh.Faces.AddFace(0,1,2,3)
        vertices,triangles,audit = self.extractor.cached_mesh(mesh)
        self.assertTrue(np.array_equal(triangles, [[0,1,2],[0,2,3]]))
        self.assertEqual(audit['vertices'],4)
        curve = r.LineCurve(r.Point3d(0,0,0),r.Point3d(1,1,1))
        vertices,triangles,audit = self.extractor.cached_mesh(curve)
        self.assertEqual(vertices.shape,(0,3))
        self.assertEqual(triangles.shape,(0,3))
        self.assertEqual(audit['expectedParts'],0)


if __name__ == '__main__':
    unittest.main()
