"""Approved penguin plus the original five shallow photographic reliefs."""
import argparse, hashlib, json, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFilter
COUNT=48000
DISTANCE=3.8
# Image-space ellipsoids: centre XY, radius XY, depth, thickness, tilt.
VOLUMES={
1:[(.68,.49,.135,.22,.62,.31,-.4),(.57,.29,.055,.08,.65,.12,0),(.48,.48,.19,.037,.6,.055,-.35),(.83,.43,.14,.028,.62,.055,.3),(.32,.76,.085,.15,-.1,.22,-.8),(.80,.88,.09,.14,-.7,.2,.5),(.63,.86,.06,.095,-1.3,.15,.3),(.07,.17,.07,.18,-1.1,.15,-.5),(.08,.68,.075,.12,-.45,.18,.6)],
}

def smooth(x):
    t=np.clip(x,0,1);return t*t*(3-2*t)

def bake_relief(index,rgb):
    """Original Cultural2–6 sampling, depth and colour, without inferred meshes."""
    h,w=rgb.shape[:2];lum=rgb@np.array([.2126,.7152,.0722])
    gy,gx=np.gradient(lum);edge=np.clip(np.hypot(gx,gy)*6,0,1)
    yy,xx=np.mgrid[0:h,0:w];u=(xx+.5)/w;v=(yy+.5)/h
    feather=np.clip(np.minimum.reduce([u,1-u,v,1-v])/.08,0,1)
    foreground=np.exp(-(((u-.51)/.40)**4+((v-.50)/.55)**4))
    weight=(np.clip((.83-lum)*2,0,1)+edge*.6+.015)*feather if index==5 else (.025+lum*.8+edge)*foreground*feather
    rng=np.random.default_rng(20260910+index)
    picks=rng.choice(h*w,COUNT,replace=True,p=(weight/weight.sum()).ravel());row,col=np.divmod(picks,w)
    keys=np.zeros(COUNT,dtype=np.uint32);ix=(col/w*1023).astype(np.uint32);iy=(row/h*1023).astype(np.uint32)
    for bit in range(10):keys|=((ix>>bit)&1)<<(2*bit);keys|=((iy>>bit)&1)<<(2*bit+1)
    order=np.argsort(keys,kind='stable');row=row[order];col=col[order]
    px=(col+rng.random(COUNT))/w-.5;py=.5-(row+rng.random(COUNT))/h
    scale=min(1.9/(w/h),1.5);width=scale*w/h
    blurred=np.asarray(Image.fromarray((lum*255).astype('uint8')).filter(ImageFilter.GaussianBlur(12)),dtype=float)/255
    depth=.19*foreground[row,col]+.11*blurred[row,col]+rng.normal(0,.008,COUNT)
    positions=np.c_[px*width,py*scale,depth-.16].astype('<f4')
    colors=rgb[row,col];gray=colors@np.array([.2126,.7152,.0722]);colors=colors*.65+gray[:,None]*.35
    # Keep the original samples and shallow depth; only widen the soft perimeter.
    # Fade each axis independently so corners dissolve without a rectangular rim.
    alpha=smooth((.5-np.abs(px))/.30)*smooth((.5-np.abs(py))/.30)
    rgba=np.c_[np.clip(colors*255,0,255),alpha*255].astype('uint8')
    return positions,rgba

def bake(source,output):
    chunks=[];metadata=[]
    for index in range(1,7):
        path=source/f'cultural{index}.jpg';raw=path.read_bytes()
        image=ImageOps.exif_transpose(Image.open(path)).convert('RGB');image.thumbnail((720,720))
        rgb=np.asarray(image,dtype=float)/255;h,w=rgb.shape[:2]
        if index>1:
            positions,rgba=bake_relief(index,rgb)
            chunks.extend([positions.tobytes(),rgba.tobytes()])
            metadata.append({'name':f'cultural{index}','sourceSha256':hashlib.sha256(raw).hexdigest(),'aspect':w/h,'pointCount':COUNT,
                'bounds':[positions.min(0).tolist(),positions.max(0).tolist()],
                'method':'original shallow photographic relief; smooth foreground and luminance depth'})
            print(f'Restored shallow relief cultural{index}',flush=True)
            continue
        lum=rgb@np.array([.2126,.7152,.0722]);gy,gx=np.gradient(lum);edge=np.clip(np.hypot(gx,gy)*6,0,1)
        yy,xx=np.mgrid[0:h,0:w];u=(xx+.5)/w;v=(yy+.5)/h
        feather=smooth(np.minimum.reduce([u,1-u,v,1-v])/.30)
        shell=np.zeros((h,w));depth=np.full((h,w),-1.65);thickness=np.zeros((h,w));centre=depth.copy()
        for cx,cy,rx,ry,z,rz,tilt in VOLUMES[index]:
            dx,dy=u-cx,v-cy
            q=((dx*np.cos(tilt)+dy*np.sin(tilt))/rx)**2+((dy*np.cos(tilt)-dx*np.sin(tilt))/ry)**2
            cap=np.sqrt(np.clip(1-q,0,1));front=z+rz*cap;selected=(q<1)&(front>depth)
            shell=np.maximum(shell,smooth((1-q)*5));depth[selected]=front[selected];centre[selected]=z;thickness[selected]=rz*cap[selected]
        if index==1:
            # Hand-traced silhouettes exclude water between flippers and bodies.
            silhouettes=[
                (.55,[(.562,.29),(.61,.315),(.637,.367),(.695,.39),(.764,.393),(.801,.414),(.81,.441),(.80,.454),(.72,.429),(.699,.433),(.74,.539),(.756,.572),(.781,.602),(.768,.61),(.758,.59),(.768,.63),(.756,.64),(.74,.606),(.74,.631),(.717,.638),(.699,.60),(.665,.582),(.639,.532),(.63,.505),(.624,.55),(.625,.616),(.616,.632),(.607,.626),(.594,.599),(.594,.55),(.602,.493),(.608,.454),(.599,.414),(.599,.386),(.587,.358)]),
                (-.15,[(.28,.61),(.30,.6),(.315,.62),(.339,.76),(.4,.766),(.425,.76),(.40,.80),(.344,.82),(.325,.85),(.29,.86),(.27,.843),(.19,.846),(.178,.82),(.259,.815),(.254,.69)]),
                (-.6,[(.05,.55),(.086,.575),(.10,.56),(.146,.747),(.19,.744),(.211,.767),(.197,.79),(.154,.79),(.144,.834),(.106,.852),(.069,.796),(0,.749),(0,.724),(.064,.76)]),
                (-1.0,[(.662,.77),(.72,.739),(.70,.77),(.69,.802),(.686,.853),(.694,.927),(.68,.965),(.665,.952),(.651,.884),(.588,.925),(.553,.918),(.53,.937),(.533,.904),(.558,.863),(.534,.839),(.625,.839)]),
                (-1.4,[(.835,.845),(.85,.866),(.863,.916),(.844,.97),(.874,.99),(.855,1),(.82,.97),(.784,1),(.711,1),(.735,.96),(.766,.927),(.739,.918),(.786,.905)]),
                (-.7,[(0,.034),(.045,.047),(.10,.082),(.127,.141),(.093,.15),(.069,.122),(.103,.267),(.157,.33),(.113,.339),(.112,.38),(.075,.367),(.052,.317),(0,.284)])]
            shell[:]=0;depth[:]=-1.65;thickness[:]=0
            for z0,polygon in silhouettes:
                mask=Image.new('L',(w,h));ImageDraw.Draw(mask).polygon([(int(a*w),int(b*h)) for a,b in polygon],fill=255)
                soft=np.asarray(mask.filter(ImageFilter.GaussianBlur(1.3)),dtype=float)/255
                selected=soft>.03;xs=[p[0] for p in polygon];ys=[p[1] for p in polygon]
                cx,cy=(min(xs)+max(xs))/2,(min(ys)+max(ys))/2
                cap=np.sqrt(np.clip(1-((u-cx)/(max(xs)-min(xs)))**2-((v-cy)/(max(ys)-min(ys)))**2,0,1))*.28
                shell=np.maximum(shell,soft);centre[selected]=z0;thickness[selected]=cap[selected];depth[selected]=z0+cap[selected]
            subject=shell*(.15+(1-lum)*.8+edge*.25)
            background=feather*(.02+edge*.08);subject_fraction=.97
        rng=np.random.default_rng(20260910+index);ns=int(COUNT*subject_fraction)
        picks=np.r_[rng.choice(h*w,ns,p=(subject*feather/(subject*feather).sum()).ravel()),rng.choice(h*w,COUNT-ns,p=(background/background.sum()).ravel())]
        row,col=np.divmod(picks,w);px=(col+rng.random(COUNT))/w-.5;py=.5-(row+rng.random(COUNT))/h
        height=min(2.8/(w/h),2.4);width=height*w/h;z=depth[row,col].copy()
        # Continuous side and rear shells provide volume instead of parallel image sheets.
        back=(np.arange(COUNT)<ns)&(rng.random(COUNT)<.32)
        z[back]=centre[row[back],col[back]]+thickness[row[back],col[back]]*rng.uniform(-1,1,back.sum())
        z+=rng.normal(0,.013,COUNT)
        # Preserve the front silhouette by placing points along the photograph's rays.
        x=px*width*(DISTANCE-z)/DISTANCE;y=py*height*(DISTANCE-z)/DISTANCE;env=np.arange(COUNT)>=ns
        if index==1:
            # Flying penguins: sparse water plane overhead, birds at independent depths.
            z[env]=rng.uniform(-2,.8,env.sum());x[env]=rng.uniform(-1.6,1.6,env.sum());y[env]=1.12+.055*np.sin(x[env]*9+z[env]*7)
        positions=np.c_[x,y,z].astype('<f4');colors=rgb[row,col].copy();gray=colors@np.array([.2126,.7152,.0722])
        colors=colors*.72+gray[:,None]*.28;colors[back]*=.72
        alpha=feather[row,col].copy();alpha[:ns]*=shell[row[:ns],col[:ns]];alpha[env]*=.20 if index==1 else .35
        alpha*=smooth((width*.72-np.abs(x))/(width*.20))
        rgba=np.c_[np.clip(colors*255,0,255),np.clip(alpha*255,0,255)].astype('uint8')
        # Spatial Morton order keeps reassembly close to the cloud.
        normal=(positions-positions.min(0))/(np.ptp(positions,axis=0)+1e-6);ints=(normal*1023).astype(np.uint32);keys=np.zeros(COUNT,dtype=np.uint32)
        for bit in range(10):
            for axis in range(3):keys|=((ints[:,axis]>>bit)&1)<<(3*bit+axis)
        order=np.argsort(keys,kind='stable');positions=positions[order];rgba=rgba[order]
        chunks.extend([positions.tobytes(),rgba.tobytes()])
        metadata.append({'name':f'cultural{index}','sourceSha256':hashlib.sha256(raw).hexdigest(),'aspect':w/h,'pointCount':COUNT,'environmentFraction':1-subject_fraction,'volumeCount':len(VOLUMES[index]),'bounds':[positions.min(0).tolist(),positions.max(0).tolist()]})
    data=struct.pack('<4sIII',b'PCU1',COUNT,6,1)+b''.join(chunks);output.mkdir(parents=True,exist_ok=True)
    (output/'cultural.bin').write_bytes(data)
    (output/'cultural.json').write_text(json.dumps({'version':1,'pointCount':COUNT,'count':6,'sha256':hashlib.sha256(data).hexdigest(),'method':'approved penguin retained; original shallow photographic reliefs restored for cultural2–6','scenes':metadata},indent=2)+'\n')
    print(f'Baked 6 x {COUNT} points, {len(data)} bytes')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();bake(a.source_dir,a.output_dir)
