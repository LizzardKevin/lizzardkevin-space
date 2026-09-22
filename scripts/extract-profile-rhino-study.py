#!/usr/bin/env python3
"""Read saved Rhino render meshes into a private, reproducible Profile study.

Requires numpy and rhino3dm. Never modifies the 3dm or remeshes geometry.
  python scripts/extract-profile-rhino-study.py --source PRIVATE.3dm --output-dir PRIVATE_STUDY
The study includes source camera metadata and UUIDs. Keep it outside public assets.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import rhino3dm as r


def sha256(path):
    with Path(path).open('rb') as stream:
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def xyz(value):
    return [value.X, value.Y, value.Z]


def matrix(transform):
    return [[getattr(transform, f'M{i}{j}') for j in range(4)] for i in range(4)]


def simple(value):
    if hasattr(value, 'X'):
        return xyz(value)
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def camera(view):
    viewport = view.Viewport
    keys = ['Id', 'CameraLocation', 'CameraDirection', 'CameraUp', 'CameraX', 'CameraY',
            'CameraZ', 'TargetPoint', 'Camera35mmLensLength', 'CameraAngle', 'ScreenPortAspect',
            'IsParallelProjection', 'IsPerspectiveProjection', 'IsTwoPointPerspectiveProjection',
            'IsValidCamera', 'IsValidFrustum']
    result = {key:simple(getattr(viewport,key)) for key in keys}
    result.update(name=view.Name, frustum=viewport.GetFrustum(), screenPort=viewport.GetScreenPort(),
                  targetDistance=viewport.TargetDistance(False),
                  worldToCamera=matrix(viewport.GetXform(r.CoordinateSystem.World,r.CoordinateSystem.Camera)),
                  worldToClip=matrix(viewport.GetXform(r.CoordinateSystem.World,r.CoordinateSystem.Clip)),
                  cameraToClip=matrix(viewport.GetXform(r.CoordinateSystem.Camera,r.CoordinateSystem.Clip)),
                  encodedViewport=viewport.Encode())
    return result


def visible_layer(layer_index, layers):
    """Honor hidden parents as well as the directly assigned layer."""
    by_id = {str(layer.Id):layer for layer in layers.values()}
    layer = layers.get(layer_index)
    seen = set()
    while layer is not None:
        if not layer.Visible or str(layer.Id) in seen:
            return False
        seen.add(str(layer.Id))
        parent = str(layer.ParentLayerId)
        if parent == '00000000-0000-0000-0000-000000000000':
            return True
        layer = by_id.get(parent)
    return False


def cached_mesh(geometry):
    parts = []
    if isinstance(geometry,r.Brep):
        parts = [face.GetMesh(r.MeshType.Render) for face in geometry.Faces]
    elif isinstance(geometry,r.Extrusion):
        parts = [geometry.GetMesh(r.MeshType.Render)]
    elif isinstance(geometry,r.Mesh):
        parts = [geometry]
    vertices, triangles, offset = [], [], 0
    for mesh in parts:
        if mesh is None:
            continue
        mesh_vertices = [xyz(point) for point in mesh.Vertices]
        for a,b,c,d in mesh.Faces:
            triangles.append([a+offset,b+offset,c+offset])
            if c != d:
                triangles.append([a+offset,c+offset,d+offset])
        vertices.extend(mesh_vertices)
        offset += len(mesh_vertices)
    vertices = np.asarray(vertices,dtype=np.float64).reshape(-1,3)
    triangles = np.asarray(triangles,dtype=np.int32).reshape(-1,3)
    return vertices, triangles, {'expectedParts':len(parts), 'cachedParts':sum(p is not None for p in parts),
                                 'vertices':len(vertices), 'triangles':len(triangles)}


def extract(source, output_dir):
    before = sha256(source)
    doc = r.File3dm.Read(str(source))
    if doc is None:
        raise ValueError('Rhino could not open the provided source')
    if str(doc.Settings.ModelUnitSystem) != 'UnitSystem.Meters':
        raise ValueError('The unified Profile source must use meters')
    objects = {str(obj.Attributes.Id):obj for obj in doc.Objects}
    definitions = {str(definition.Id):definition for definition in doc.InstanceDefinitions}
    layers = {layer.Index:layer for layer in doc.Layers}
    report = dict(source=str(source), sha256=before, byteLength=source.stat().st_size,
                  rhino3dmVersion=r.__version__, units=str(doc.Settings.ModelUnitSystem),
                  absoluteTolerance=doc.Settings.ModelAbsoluteTolerance,
                  angleToleranceRadians=doc.Settings.ModelAngleToleranceRadians,
                  coordinateConvention='Rhino world XYZ, Z up; source units retained',
                  namedViews=[camera(view) for view in doc.NamedViews], views=[camera(view) for view in doc.Views],
                  layers=[], groups=[], instanceDefinitions=[], objects=[], meshAudit=[])
    if len(report['namedViews']) != 4 or {v['name'] for v in report['namedViews']} != {'Student','Career','Photo','Band'}:
        raise ValueError('Expected four saved author views: Student, Career, Photo, Band')
    for layer in doc.Layers:
        report['layers'].append(dict(index=layer.Index,id=str(layer.Id),name=layer.Name,
                                     parentId=str(layer.ParentLayerId),visible=layer.Visible,
                                     locked=layer.Locked,color=layer.Color))
    for definition in doc.InstanceDefinitions:
        report['instanceDefinitions'].append(dict(id=str(definition.Id),name=definition.Name,
                                                   objectIds=[str(i) for i in definition.GetObjectIds()]))
    for group in doc.Groups:
        report['groups'].append(dict(index=group.Index,id=str(group.Id),name=group.Name,
                                     objectIds=[oid for oid,obj in objects.items() if group.Index in obj.Attributes.GetGroupList()]))
    cache, object_reports = {}, {}
    for oid,obj in objects.items():
        geometry, attrs = obj.Geometry, obj.Attributes
        bbox = geometry.GetBoundingBox()
        row = dict(id=oid,name=attrs.Name,type=type(geometry).__name__,layerIndex=attrs.LayerIndex,
                   mode=str(attrs.Mode),visible=attrs.Visible,isInstanceDefinitionObject=attrs.IsInstanceDefinitionObject,
                   groups=list(attrs.GetGroupList()),bbox=[xyz(bbox.Min),xyz(bbox.Max)],
                   userStrings=attrs.GetUserStrings(),geometryUserStrings=geometry.GetUserStrings())
        if isinstance(geometry,r.Extrusion):
            row.update(pathStart=xyz(geometry.PathStart),pathEnd=xyz(geometry.PathEnd),
                       pathTangent=xyz(geometry.PathTangent),profileCount=geometry.ProfileCount,isSolid=geometry.IsSolid)
        if isinstance(geometry,r.InstanceReference):
            row.update(definitionId=str(geometry.ParentIdefId),transform=matrix(geometry.Xform))
        else:
            vertices, triangles, audit = cached_mesh(geometry)
            cache[oid] = vertices, triangles
            report['meshAudit'].append({'id':oid, **audit})
            if audit['cachedParts'] != audit['expectedParts']:
                raise ValueError(f'Missing saved render mesh for source root/member {oid}; save render meshes in Rhino first')
        report['objects'].append(row)
        object_reports[oid] = row

    def expand(oid, transform, ancestry):
        if oid in ancestry:
            raise ValueError('Cyclic Rhino block definition')
        obj = objects[oid]
        if not obj.Attributes.Visible or not visible_layer(obj.Attributes.LayerIndex,layers):
            return []
        geometry = obj.Geometry
        if isinstance(geometry,r.InstanceReference):
            definition = definitions[str(geometry.ParentIdefId)]
            combined = transform @ np.asarray(matrix(geometry.Xform))
            pieces = []
            for child in definition.GetObjectIds():
                pieces.extend(expand(str(child),combined,ancestry | {oid}))
            return pieces
        vertices,triangles = cache[oid]
        if not len(vertices) or not len(triangles):
            return []  # Curves/points and empty cached roots do not create phantom mesh identities.
        mapped = (np.c_[vertices,np.ones(len(vertices))] @ transform.T)[:,:3]
        return [(mapped,triangles)]

    all_vertices,all_triangles,all_indices,rendered,offset = [],[],[],[],0
    for oid,obj in objects.items():
        if obj.Attributes.IsInstanceDefinitionObject:
            continue
        pieces = expand(oid,np.eye(4),set())
        if not pieces:
            continue
        root_index = len(rendered)
        rendered.append(oid)
        used_vertices = []
        for vertices,triangles in pieces:
            all_vertices.append(vertices)
            all_triangles.append(triangles+offset)
            all_indices.append(np.full(len(triangles),root_index,dtype=np.int32))
            used_vertices.append(vertices[np.unique(triangles)])
            offset += len(vertices)
        used = np.concatenate(used_vertices)
        object_reports[oid]['renderedBounds'] = [used.min(0).tolist(),used.max(0).tolist()]
    if not rendered:
        raise ValueError('No visible saved render meshes in the provided source')
    vertices,triangles,indices = np.concatenate(all_vertices),np.concatenate(all_triangles),np.concatenate(all_indices)
    if not np.isfinite(vertices).all():
        raise ValueError('Nonfinite saved mesh coordinates')
    report.update(renderedObjectIds=rendered,renderedTriangleCount=len(triangles),renderedVertexCount=len(vertices),
                  renderedBounds=[vertices.min(0).tolist(),vertices.max(0).tolist()])
    if sha256(source) != before:
        raise ValueError('Source changed during read-only extraction')
    output_dir.mkdir(parents=True,exist_ok=True)
    np.savez_compressed(output_dir/'profile-mesh.npz',vertices=vertices,triangles=triangles,objectIds=indices)
    (output_dir/'profile-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,type=Path)
    parser.add_argument('--output-dir',required=True,type=Path)
    args = parser.parse_args()
    report = extract(args.source,args.output_dir)
    print(json.dumps({'renderedRoots':len(report['renderedObjectIds']), 'triangles':report['renderedTriangleCount'],
                      'sha256':report['sha256'], 'views':[v['name'] for v in report['namedViews']]}))


if __name__ == '__main__':
    main()
