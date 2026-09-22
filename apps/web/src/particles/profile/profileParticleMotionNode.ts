import { float, sin, vec3, instancedBufferAttribute } from 'three/tsl';
import { COLUMN_MOTION } from './profileColumnMotion.ts';
import type { ProfileUniforms } from './profileParticleMaterial.ts';

/** Shared by source particles and arriving CRT pixels: identical moving endpoints. */
type PointNode=ReturnType<typeof instancedBufferAttribute<'vec4'>>;
export function profileParticleMotionNode(a:PointNode,ma:PointNode,mb:PointNode,control:PointNode,u:ProfileUniforms){
  const c=COLUMN_MOTION;
  const phase=u.time.mul(ma.z).mul(Math.PI*2*c.speed).add(ma.w)
    .add(sin(u.time.mul(ma.z.mul(c.modulationRate).add(c.modulationBase)).add(control.y)).mul(c.modulation));
  const height=sin(phase).mul(.5).add(.5).mul(c.range).add(c.min);
  const wx=sin(u.time.mul(mb.z).mul(Math.PI*2).add(mb.w)).mul(.65)
    .add(sin(u.time.mul(mb.z).mul(Math.PI*2*.619).add(control.z)).mul(.35));
  const wy=sin(u.time.mul(mb.z).mul(Math.PI*2*.83).add(control.z)).mul(.65)
    .add(sin(u.time.mul(mb.z).mul(Math.PI*2*.83*.619).add(mb.w)).mul(.35));
  return vec3(a.x.add(wx.mul(mb.x)),control.x.add(a.y.sub(control.x).mul(ma.x.greaterThan(0).select(height,float(1)))),a.z.sub(wy.mul(mb.y)));
}
