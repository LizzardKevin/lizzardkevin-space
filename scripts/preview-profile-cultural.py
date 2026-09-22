"""Offline diagnostic renders of authored mesh and sampled particles."""
import argparse,sys,struct
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import moderngl
from profile_cultural_models import build_model
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
ctx=moderngl.create_standalone_context();w,h=600,440
fbo=ctx.simple_framebuffer((w,h));fbo.use();ctx.enable(moderngl.DEPTH_TEST|moderngl.PROGRAM_POINT_SIZE)
shader=ctx.program(vertex_shader='''#version 330
in vec3 p;in vec4 c;in vec3 n;uniform float angle;uniform float fit;uniform int solid;out vec4 color;
void main(){mat3 r=mat3(cos(angle),0,-sin(angle),0,1,0,sin(angle),0,cos(angle));vec3 v=r*p;float d=3.8-v.z;
gl_Position=vec4(v.x*1.55/1.363636*fit,v.y*1.55*fit,d*.98-.05,d);gl_PointSize=1.8*sqrt(c.a);
float light=solid==1 ? .5+.5*abs(dot(normalize(r*n),normalize(vec3(-.3,.6,1)))) : 1.;color=vec4(c.rgb*light,c.a);}
''',fragment_shader='''#version 330
in vec4 color;out vec4 frag;uniform int solid;void main(){if(solid==0 && (length(gl_PointCoord-.5)>.5 || color.a<.005))discard;frag=vec4(color.rgb*sqrt(color.a),1);}
''')
data=Path('apps/web/public/particles/profile/cultural.bin').read_bytes();canvas=Image.new('RGB',(w*3,h*5),(26,27,28));draw=ImageDraw.Draw(canvas)
for index in range(2,7):
    offset=16+(index-1)*48000*16;ps=np.frombuffer(data,dtype='<f4',count=48000*3,offset=offset).reshape(-1,3);cs=np.frombuffer(data,dtype='uint8',count=48000*4,offset=offset+48000*12).reshape(-1,4)/255
    import json
    aspect=json.loads(Path('apps/web/public/particles/profile/cultural.json').read_text())['scenes'][index-1]['aspect'];model=build_model(index,aspect)
    for col,angle in enumerate([45,-15,15]):
        solid=col==0
        if solid:
            arrays=[]
            for m in model.meshes:
                if m.environment:continue
                tri=m.vertices[m.faces];normal=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-8)
                arrays.append(np.c_[tri.reshape(-1,3),np.tile([*m.color,1],(len(tri)*3,1)),np.repeat(normal,3,axis=0)])
            verts=np.concatenate(arrays).astype('f4');mode=moderngl.TRIANGLES
        else:verts=np.c_[ps,cs,np.zeros_like(ps)].astype('f4');mode=moderngl.POINTS
        theta=np.radians(angle);r=np.array([[np.cos(theta),0,np.sin(theta)],[0,1,0],[-np.sin(theta),0,np.cos(theta)]])
        v=ps[cs[:,3]>.34]@r.T;ext=np.max(np.abs(v[:,:2]*1.55/(3.8-v[:,2,None])),axis=0);fit=min(.86*(w/h)/ext[0],.86/ext[1])
        shader['angle']=theta;shader['fit']=fit;shader['solid']=int(solid)
        vbo=ctx.buffer(verts.tobytes());vao=ctx.vertex_array(shader,[(vbo,'3f 4f 3f','p','c','n')]);fbo.clear(.10,.105,.11,1);vao.render(mode)
        im=Image.frombytes('RGB',(w,h),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);canvas.paste(im,(col*w,(index-2)*h));draw.text((col*w+12,(index-2)*h+12),f'CULTURAL {index} / '+('SOLID 45' if solid else f'PARTICLES {angle}'),fill=(180,220,220));vao.release();vbo.release()
a.output.parent.mkdir(parents=True,exist_ok=True);canvas.save(a.output);print(a.output)
