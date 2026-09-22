import type { ProfileMotionGroup } from './profileCache.ts';

// Both the shader and title anchors use these constants; no per-frame random jumps.
export const COLUMN_MOTION={min:.12,range:1.18,speed:.42,modulation:1.1,modulationBase:.13,modulationRate:.27} as const;
export function profileColumnHeight(time:number,group:ProfileMotionGroup):number {
  const c=COLUMN_MOTION;
  const phase=time*group.frequencyHz*Math.PI*2*c.speed+group.phase[0]
    +Math.sin(time*(c.modulationBase+group.frequencyHz*c.modulationRate)+group.phase[1])*c.modulation;
  return c.min+c.range*(.5+.5*Math.sin(phase));
}
export function profileColumnGrowing(time:number,group:ProfileMotionGroup):boolean {
  return profileColumnHeight(time+.03,group)>profileColumnHeight(time,group);
}
