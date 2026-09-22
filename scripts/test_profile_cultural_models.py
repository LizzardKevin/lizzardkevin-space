"""Geometric regressions: closed skins and image-independent surface positions."""
import hashlib, unittest
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from profile_cultural_models import build_model
from profile_cultural_geometry import sample_model

class CulturalModelsTest(unittest.TestCase):
    def test_approved_penguin_is_byte_identical(self):
        data=Path('apps/web/public/particles/profile/cultural.bin').read_bytes()
        self.assertEqual(hashlib.sha256(data[16:16+48000*16]).hexdigest(),'bfddcfe4967f2ba88c19f61f7987f46cd603c57f1bf4107946d330e2988ccffe')
    def test_meshes_are_closed_and_human_skin_is_connected(self):
        for index,aspect in [(2,2/3),(3,1.5),(4,16/9),(5,2.16),(6,2.35)]:
            model=build_model(index,aspect)
            for m in model.meshes:
                self.assertTrue(np.isfinite(m.vertices).all())
                edges=np.sort(np.concatenate([m.faces[:,[0,1]],m.faces[:,[1,2]],m.faces[:,[2,0]]]),axis=1)
                unique,counts=np.unique(edges,axis=0,return_counts=True)
                self.assertTrue(np.all(counts==2),f'{index}/{m.name} has an open surface')
                if m.name.startswith('connected-'):
                    triangles=m.vertices[m.faces]
                    volume=np.sum(triangles[:,0]*np.cross(triangles[:,1],triangles[:,2]))/6
                    self.assertGreater(volume,0,'outward skin normals must receive front photo colour')
                    graph=coo_matrix((np.ones(len(unique)),(unique[:,0],unique[:,1])),shape=(len(m.vertices),len(m.vertices)))
                    self.assertEqual(connected_components(graph,directed=False,return_labels=False),1,f'{index}/{m.name} is fragmented')
    def test_photo_changes_colour_but_never_geometry(self):
        model=build_model(5,2.16)
        black=np.zeros((200,432,3));white=np.ones((200,432,3))
        a,ca,_=sample_model(model,black,4000,np.random.default_rng(42))
        b,cb,_=sample_model(model,white,4000,np.random.default_rng(42))
        np.testing.assert_array_equal(a,b)
        self.assertFalse(np.array_equal(ca,cb))
if __name__=='__main__':unittest.main()
