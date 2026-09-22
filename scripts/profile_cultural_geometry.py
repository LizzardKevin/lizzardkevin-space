"""Mesh-first Cultural geometry. No image pixels participate in vertex placement."""
from dataclasses import dataclass
import numpy as np
from skimage.measure import marching_cubes

@dataclass
class Mesh:
    name: str
    vertices: np.ndarray
    faces: np.ndarray
    color: tuple = (.5,.5,.5)
    photo: float = 1.
    density: float = 1.
    environment: bool = False

class Model:
    def __init__(self, aspect):
        self.height=min(2.8/aspect,2.6);self.width=self.height*aspect
        self.meshes=[];self.solids=[]
    def p(self,u,v,z=0):return np.array([(u-.5)*self.width,(.5-v)*self.height,z],dtype=np.float32)
    def ell(self,u,v,rx,ry,rz,z=0):
        self.solids.append(('ell',self.p(u,v,z),np.array([rx*self.width,ry*self.height,rz],dtype=np.float32)))
    def limb(self,a,b,r1,r2=None):
        self.solids.append(('limb',self.p(*a),self.p(*b),r1,r2 or r1))
    def fuse(self,name,color=(.5,.5,.5)):
        # Smooth union produces one watertight outer skin at shoulders, neck,
        # elbows and knees. Internal primitive surfaces are never sampled.
        bounds=[]
        for s in self.solids:
            if s[0]=='ell':bounds.extend([s[1]-s[2],s[1]+s[2]])
            else:
                r=max(s[3:]);bounds.extend([s[1]-r,s[1]+r,s[2]-r,s[2]+r])
        lo=np.min(bounds,axis=0)-.07;hi=np.max(bounds,axis=0)+.07
        step=.012
        axes=[np.arange(lo[i],hi[i]+step,step,dtype=np.float32) for i in range(3)]
        grid=np.stack(np.meshgrid(*axes,indexing='ij'),axis=-1);field=np.full(grid.shape[:-1],100,dtype=np.float32)
        for s in self.solids:
            if s[0]=='ell':
                q=(grid-s[1])/s[2];d=(np.sqrt(np.sum(q*q,axis=-1))-1)*min(s[2])
            else:
                a,b,r1,r2=s[1:];ba=b-a;t=np.clip(np.sum((grid-a)*ba,axis=-1)/np.dot(ba,ba),0,1)
                d=np.linalg.norm(grid-a-t[...,None]*ba,axis=-1)-(r1+(r2-r1)*t)
            k=.027;h=np.clip(.5+.5*(d-field)/k,0,1);field=d*(1-h)+field*h-k*h*(1-h)
        vertices,faces,_,_=marching_cubes(field,0,spacing=(step,step,step),gradient_direction='descent')
        self.meshes.append(Mesh(name,vertices+lo,faces,color,1,1.35));self.solids=[]
    def mesh(self,name,vertices,faces,color,photo=0,density=1,environment=False):
        self.meshes.append(Mesh(name,np.asarray(vertices,dtype=np.float32),np.asarray(faces,dtype=np.int32),color,photo,density,environment))
    def tube(self,name,a,b,r,color,photo=0,r2=None,density=2):
        a=np.asarray(a);b=np.asarray(b);direction=b-a;direction=direction/np.linalg.norm(direction)
        right=np.cross(direction,[0,0,1] if abs(direction[2])<.9 else [0,1,0]);right/=np.linalg.norm(right);up=np.cross(direction,right)
        n=20;angle=np.arange(n)*2*np.pi/n;ring=np.cos(angle)[:,None]*right+np.sin(angle)[:,None]*up
        vs=np.r_[a+ring*r,b+ring*(r if r2 is None else r2),[a,b]];fs=[]
        for i in range(n):
            j=(i+1)%n;fs.extend([(i,j,n+j),(i,n+j,n+i),(2*n,j,i),(2*n+1,n+i,n+j)])
        self.mesh(name,vs,fs,color,photo,density)
    def box(self,name,centre,size,color,photo=0,density=1,environment=False):
        c=np.asarray(centre);r=np.asarray(size)/2
        vs=[c+r*np.array([x,y,z]) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        fs=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(3,7,6),(3,6,2),(0,4,7),(0,7,3),(1,2,6),(1,6,5)]
        self.mesh(name,vs,fs,color,photo,density,environment)
    def outline(self,name,uv,z,thickness,color,photo=1,smooth=False):
        points=np.array([self.p(u,v,z)[:2] for u,v in uv])
        if smooth:
            for _ in range(2):
                following=np.roll(points,-1,axis=0);points=np.stack([.75*points+.25*following,.25*points+.75*following],axis=1).reshape(-1,2)
        # Ear clipping supports concave guitar / blade silhouettes, unlike fans.
        area=np.sum(points[:,0]*np.roll(points[:,1],-1)-points[:,1]*np.roll(points[:,0],-1))
        if area<0:points=points[::-1]
        n=len(points);remaining=list(range(n));triangles=[]
        cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
        while len(remaining)>3:
            for j,current in enumerate(remaining):
                prev=remaining[j-1];nxt=remaining[(j+1)%len(remaining)];a,b,c=points[[prev,current,nxt]]
                if cross(b-a,c-b)<=1e-10:continue
                others=[k for k in remaining if k not in (prev,current,nxt)]
                if any(cross(b-a,points[k]-a)>=0 and cross(c-b,points[k]-b)>=0 and cross(a-c,points[k]-c)>=0 for k in others):continue
                triangles.append((prev,current,nxt));remaining.pop(j);break
            else:raise ValueError(f'Cannot triangulate {name}')
        triangles.append(tuple(remaining));vs=np.r_[np.c_[points,np.full(n,z+thickness/2)],np.c_[points,np.full(n,z-thickness/2)]]
        fs=triangles+[(c+n,b+n,a+n) for a,b,c in triangles]
        for i in range(n):
            j=(i+1)%n;fs.extend([(i,i+n,j+n),(i,j+n,j)])
        self.mesh(name,vs,fs,color,photo,2)
    def environment(self,kind,floor_v=1.07):
        floor=(.5-floor_v)*self.height
        self.box('floor', [0,floor-.025,-.6],[self.width*1.55,.05,3.5],(.27,.28,.30),0,.065,True)
        if kind=='corridor':
            for x in [-self.width*.64,self.width*.64]:
                for z in [-.7,-1.5,-2.2]:
                    self.box('corridor-column',[x,floor+.8,z],[.07,1.6,.09],(.38,.4,.42),0,.10,True)
                    self.box('ceiling-beam',[0,floor+1.62,z],[self.width*1.3,.06,.07],(.32,.34,.35),0,.08,True)
        elif kind=='stage':
            self.box('stage-back',[0,.1,-1.8],[self.width*1.5,self.height*1.6,.06],(.18,.09,.14),0,.07,True)
            for x in [-1.35,1.35]:self.tube('light-stand',[x,floor,-1],[x,.9,-1],.018,(.32,.25,.27),density=.25)
    def export(self,path):
        with path.open('w',encoding='utf8') as f:
            f.write('# Authored continuous models; source photograph supplies colour only.\n');offset=1
            for m in self.meshes:
                f.write(f'o {m.name}\n')
                for p in m.vertices:f.write('v %.6f %.6f %.6f\n'%tuple(p))
                for tri in m.faces:f.write('f %d %d %d\n'%tuple(tri+offset))
                offset+=len(m.vertices)

def sample_model(model,rgb,count,rng):
    triangles=[];colors=[];photo=[];densities=[];env=[];groups=[]
    for i,m in enumerate(model.meshes):
        tris=m.vertices[m.faces];triangles.append(tris);n=len(tris)
        colors.extend([m.color]*n);photo.extend([m.photo]*n);densities.extend([m.density]*n);env.extend([m.environment]*n);groups.extend([i]*n)
    triangles=np.concatenate(triangles);colors=np.asarray(colors);env=np.array(env);photo=np.array(photo)
    cross=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]);areas=np.linalg.norm(cross,axis=1)/2
    normals=cross/np.maximum(2*areas[:,None],1e-9)
    weight=areas*np.array(densities)*(.55+.65*np.maximum(0,normals[:,2]))
    # Keep environment sparse, but geometrically complete and joined to the subject.
    weight[env]*=.1/np.maximum(weight[env].sum(),1e-9);weight[~env]*=.9/weight[~env].sum()
    selected=rng.choice(len(triangles),count,p=weight/weight.sum());tris=triangles[selected]
    a=np.sqrt(rng.random(count));b=rng.random(count)
    positions=tris[:,0]*(1-a[:,None])+tris[:,1]*(a*(1-b))[:,None]+tris[:,2]*(a*b)[:,None]
    h,w=rgb.shape[:2];u=positions[:,0]/model.width+.5;v=.5-positions[:,1]/model.height
    px=np.clip((u*w).astype(int),0,w-1);py=np.clip((v*h).astype(int),0,h-1)
    # One coherent front projection on the completed mesh; sides use material
    # colour so hidden areas are not painted with a second copy of a face/hand.
    facing=np.clip((normals[selected,2]+.15)/.65,0,1)
    mix=photo[selected]*facing*((u>0)&(u<1)&(v>0)&(v<1))
    sampled=rgb[py,px]*.8+(rgb[py,px]@np.array([.2126,.7152,.0722]))[:,None]*.2
    color=colors[selected]*(1-mix[:,None])+sampled*mix[:,None]
    lighting=.72+.28*np.clip(normals[selected]@np.array([-.3,.5,.81]),0,1)
    color=np.clip(color*lighting[:,None],0,1)
    environment=env[selected];alpha=np.full(count,.96)
    radius=np.sqrt((positions[:,0]/(model.width*.76))**2+((positions[:,2]+.4)/2)**2)
    alpha[environment]=np.clip(1-radius[environment],0,1)**2*.65
    # Feather only the bottom of inferred cropped portraits, not arbitrary image regions.
    edge=np.clip((positions[:,1]+model.height*.64)/(.15*model.height),0,1)
    alpha*=edge*edge*(3-2*edge)
    rgba=np.c_[color*255,alpha*255].astype('uint8')
    normal=(positions-positions.min(0))/(np.ptp(positions,axis=0)+1e-6);ints=(normal*1023).astype(np.uint32);keys=np.zeros(count,dtype=np.uint32)
    for bit in range(10):
        for axis in range(3):keys|=((ints[:,axis]>>bit)&1)<<(3*bit+axis)
    order=np.argsort(keys,kind='stable')
    return positions[order].astype('<f4'),rgba[order],{'method':'closed 3D meshes, area-weighted surface samples; image used only for colour','meshCount':len(model.meshes),'triangleCount':len(triangles),'environmentFraction':float(environment.mean()),'meshes':[{'name':m.name,'vertices':len(m.vertices),'triangles':len(m.faces)} for m in model.meshes]}
