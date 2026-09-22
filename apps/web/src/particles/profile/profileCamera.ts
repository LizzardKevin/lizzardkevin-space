import { CatmullRomCurve3, Matrix4, Quaternion, Vector3, Vector4 } from 'three';
import type { ProfileShot } from './profileCache.ts';

export function composeProfileView(shots: ProfileShot[], progress: number): Matrix4 {
  const basis=(s:ProfileShot)=>new Matrix4().makeBasis(new Vector3(...s.cameraX),new Vector3(...s.cameraY),new Vector3(...s.cameraZ));
  const a=shots[0],b=shots[1];
  const q=new Quaternion().setFromRotationMatrix(basis(a)).slerp(new Quaternion().setFromRotationMatrix(basis(b)),progress);
  const eye=new Vector3(...a.eye).lerp(new Vector3(...b.eye),progress);
  return new Matrix4().compose(eye,q,new Vector3(1,1,1)).invert();
}
export function profileProjectionParameters(shots:ProfileShot[],progress:number,aspect:number):Vector4 {
  const [a,b]=shots;
  const lerp=(x:number,y:number)=>x+(y-x)*progress;
  return new Vector4(lerp(a.projection[0],b.projection[0])*lerp(a.savedAspect,b.savedAspect)/aspect,
    lerp(a.projection[5],b.projection[5]),lerp(a.projection[2],b.projection[2]),lerp(a.projection[6],b.projection[6]));
}

/** Saved poses are exact endpoints; the scroll timeline supplies easing. */
export function profileSceneCamera(shots:ProfileShot[],progress:number,aspect:number){
  const t=Math.max(0,Math.min(shots.length-1,progress)),index=Math.min(shots.length-2,Math.floor(t)),blend=t-index;
  const pair=[shots[index],shots[index+1]];
  const distance=(shot:ProfileShot)=>Math.hypot(...shot.eye.map((n,i)=>n-shot.rawTarget[i]));
  const view=composeProfileView(pair,blend);
  if(index===1&&blend>0&&blend<1){
    // Travel around the exterior wall, then enter through the real window opening.
    const route=new CatmullRomCurve3([new Vector3(...pair[0].eye),new Vector3(2.05,1.22,2.72),
      new Vector3(.02,.72,2.65),new Vector3(.02,.50,1.96),new Vector3(...pair[1].eye)],false,'centripetal');
    const pose=view.clone().invert();pose.setPosition(route.getPointAt(blend));view.copy(pose.invert());
  }
  if(index===3&&blend>0&&blend<1){
    const route=new CatmullRomCurve3([new Vector3(...pair[0].eye),new Vector3(.02,.55,1.96),
      new Vector3(.02,.76,2.65),new Vector3(-8.8,.9,3.7),new Vector3(...pair[1].eye)],false,'centripetal');
    const pose=view.clone().invert();pose.setPosition(route.getPointAt(blend));view.copy(pose.invert());
  }
  if(index===4&&blend>0&&blend<1){
    const route=new CatmullRomCurve3([new Vector3(...pair[0].eye),new Vector3(-9.6,1.4,4.3),
      new Vector3(0,2.1,4.5),new Vector3(...pair[1].eye)],false,'centripetal');
    const pose=view.clone().invert();pose.setPosition(route.getPointAt(blend));view.copy(pose.invert());
  }
  return {view,projection:profileProjectionParameters(pair,blend,aspect),
    distance:distance(pair[0])+(distance(pair[1])-distance(pair[0]))*blend};
}

/** User-approved continuation cameras; the four saved Rhino poses remain unchanged. */
export function extendProfileShots(source:ProfileShot[]):ProfileShot[]{
  const authored=(name:string,eye:Vector3,target:Vector3):ProfileShot=>{
    const rotation=new Matrix4().lookAt(eye,target,new Vector3(0,1,0)),e=rotation.elements;
    const projection=[...source[3].projection];projection[0]=1.55/source[3].savedAspect;projection[5]=1.55;projection[2]=0;projection[6]=0;
    return {...source[3],name,eye:eye.toArray(),rawTarget:target.toArray(),cameraX:[e[0],e[1],e[2]],cameraY:[e[4],e[5],e[6]],cameraZ:[e[8],e[9],e[10]],projection};
  };
  return [...source,
    authored('Cultural',new Vector3(-9.5,.6,3.2),new Vector3(-9.5,.6,-.6)),
    authored('Experimental',new Vector3(4.6,2.9,4.5),new Vector3(.7,.25,.3)),
  ];
}
