import { Box3, PerspectiveCamera, Scene, Sprite, Vector3 } from 'three';
import type { WebGPURenderer } from 'three/webgpu';
import { createWebGPURenderer } from '../../rendering/createWebGPURenderer.ts';
import type { RendererProfileId, RendererResolution } from '../../rendering/rendererProfile.ts';
import { type ProfileExteriorData, type ProfileModelData, type ProfileShot } from './profileCache.ts';
import { buildProfileParticleArrays } from './profileParticleArrays.ts';
import { createProfileParticleMaterial, createProfileUniforms } from './profileParticleMaterial.ts';
import { resolveProfileTimeline, type ProfileTimeline } from './profileTimeline.ts';
import { profileSceneCamera, extendProfileShots } from './profileCamera.ts';
import { advanceProfilePointer, createProfilePointer, profileParallaxMatrix, profileCursorJitter } from './profilePointer.ts';
import { profileColumnHeight, profileColumnGrowing } from './profileColumnMotion.ts';
import { profileBreathingOffset } from './profileSceneDecorations.ts';
import type { ColumnAnchor } from './profileColumnLabels.ts';
import { ProfileCulturalCloud } from './ProfileCulturalCloud.ts';
import type { CulturalScene } from './profileCultural.ts';
import { ProfileCardField } from './ProfileCardField.ts';
import { ProfileDiffusion } from './ProfileDiffusion.ts';
import { profileCardMix, PROFILE_DIFFUSION } from './profileAtmosphere.ts';
import { profileFlightHandoff } from './profileCardFlight.ts';

export class ProfileParticleRenderer {
  readonly uniforms=createProfileUniforms();
  readonly camera=new PerspectiveCamera(50,1,.002,200);
  private readonly scene=new Scene();
  private renderer: WebGPURenderer | null=null;
  private points: Sprite | null=null;
  private data:ProfileModelData|undefined;
  private shots:ProfileShot[]=[];
  private exterior:ProfileExteriorData|undefined;
  private cultural:ProfileCulturalCloud|undefined;
  private card:ProfileCardField|undefined;
  private diffusion:ProfileDiffusion|undefined;
  private columnBounds=new Map<number,Box3>();
  private state=resolveProfileTimeline(0,[]);
  private readonly pointer=createProfilePointer();
  private disposed=false;
  resolution: RendererResolution | null=null;

  async init(canvas:HTMLCanvasElement, requestedProfile?:RendererProfileId) {
    const renderer=await createWebGPURenderer({canvas,alpha:true,requestedProfile,onResolved:r=>{this.resolution=r;}});
    if(this.disposed){renderer.dispose();return;}
    this.renderer=renderer;
    this.card=new ProfileCardField(this.uniforms);this.scene.add(this.card.points);
    this.diffusion=new ProfileDiffusion(renderer,this.scene,this.camera);
    this.replacePoints();
  }
  private replacePoints() {
    if(this.disposed)return;
    const arrays=buildProfileParticleArrays(this.data,this.exterior);
    const material=createProfileParticleMaterial(arrays,this.uniforms);
    const points=new Sprite(material);points.geometry=points.geometry.clone();points.count=arrays.count;points.frustumCulled=false;
    if(this.points){this.scene.remove(this.points);this.points.geometry.dispose();this.points.material.dispose();}
    this.points=points;this.scene.add(points);
    this.card?.setTargets(arrays,this.shots);
    points.visible=profileFlightHandoff(1-profileCardMix(this.state))>0;
  }
  setScene(model?:ProfileModelData,exterior?:ProfileExteriorData){
    if(this.disposed)return;
    this.data=model;this.shots=model?extendProfileShots(model.model.shots):[];
    this.exterior=exterior;
    this.columnBounds.clear();
    if(model){
      const point=new Vector3();
      for(let i=0;i<model.cache.groupIndices.length;i++){
        const group=model.cache.groupIndices[i];
        let bounds=this.columnBounds.get(group);
        if(!bounds){bounds=new Box3();this.columnBounds.set(group,bounds);}
        bounds.expandByPoint(point.fromArray(model.cache.positions,i*3));
      }
      this.uniforms.jitterA.value=profileCursorJitter(model.model,model.cache.groupIndices.length);
    }
    if(exterior){const p=exterior.exterior.portal;this.uniforms.portalRect.value.set(p.xMin,p.xMax,p.yMin,p.yMax);this.uniforms.portalZ.value=p.z;}
    const boxes=exterior?.exterior.occluders;
    this.uniforms.occlusionEnabled.value=boxes?.length===2?1:0;
    if(boxes?.length===2){
      this.uniforms.occluderMinA.value.fromArray(boxes[0].min);this.uniforms.occluderMaxA.value.fromArray(boxes[0].max);
      this.uniforms.occluderMinB.value.fromArray(boxes[1].min);this.uniforms.occluderMaxB.value.fromArray(boxes[1].max);
      this.uniforms.occlusionBias.value=exterior?.exterior.occlusionSurfaceBias??.012;
    }
    this.uniforms.availableA.value=model?1:0;
    this.replacePoints();this.setTimeline(this.state);
  }
  setTimeline(state:ProfileTimeline){
    this.state=state;
    const u=this.uniforms;u.offset.value=state.viewOffset;u.flow.value=state.motionTime;
    const cardMix=profileCardMix(state);
    u.cloudVisibility.value=profileFlightHandoff(1-cardMix);
    this.card?.setVisibility(cardMix,state.from==='experiments'||state.from==='links'||state.to==='links');
    if(this.points)this.points.visible=u.cloudVisibility.value>0;
    this.updateViews();
  }
  private updateViews(){
    const state=this.state,u=this.uniforms,p=this.pointer;
    if(this.shots.length){
      const frame=profileSceneCamera(this.shots,state.cameraProgress,this.camera.aspect);
      u.viewA.value.copy(frame.view).premultiply(profileParallaxMatrix(p.azimuth,p.elevation,frame.distance));
      u.projectionA.value.copy(frame.projection);
      u.eyeB.value.setFromMatrixPosition(u.viewA.value.clone().invert());
    }
    u.fieldView.value.copy(profileParallaxMatrix(p.azimuth,p.elevation,3));
  }
  resize(width:number,height:number,dpr:number){
    const w=Math.max(1,width),h=Math.max(1,height);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    this.uniforms.fixedProjection.value.set(this.camera.projectionMatrix.elements[0],this.camera.projectionMatrix.elements[5]);
    this.uniforms.aspect.value=w/h;this.uniforms.height.value=h;
    this.renderer?.setPixelRatio(Math.min(dpr||1,this.resolution?.profile==='simplified'?1:2));
    this.renderer?.setSize(w,h,false);this.setTimeline(this.state);
    this.card?.resize(w,h);
  }
  setCursor(x:number,y:number){this.pointer.targetX=x;this.pointer.targetY=y;}
  getPointerPose(){return {azimuth:this.pointer.azimuth,elevation:this.pointer.elevation};}
  setCultural(scenes:CulturalScene[]){
    if(this.disposed)return;
    if(this.cultural){this.scene.remove(this.cultural.points);this.cultural.dispose();}
    this.cultural=new ProfileCulturalCloud(scenes,this.uniforms);this.scene.add(this.cultural.points);
  }
  getCulturalState(){return this.cultural?.getState();}
  getAtmosphereState(){return {card:profileCardMix(this.state),flight:1-profileCardMix(this.state),particles:this.uniforms.cloudVisibility.value,cursor:this.uniforms.cursor.value.toArray(),diffusion:PROFILE_DIFFUSION};}
  getColumnAnchors():ColumnAnchor[]{
    const data=this.data;if(!data)return [];
    const time=this.uniforms.time.value,p=this.uniforms.projectionA.value;
    const [bx,by]=profileBreathingOffset(time);
    return data.model.groups.filter(g=>g.kind==='height').map(g=>{
      const height=profileColumnHeight(time,g),bounds=this.columnBounds.get(g.index);
      if(!bounds)return {index:g.index,x:0,y:0,height,growing:false};
      const top=g.pivot[1]+(bounds.max.y-g.pivot[1])*height;
      // The highest projected roof corner, rather than an interior point, keeps
      // text above the entire cap even in Career's oblique camera and parallax.
      const corners=[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.z,bounds.max.z].map(z=>{
        const v=new Vector3(x,top,z).applyMatrix4(this.uniforms.viewA.value);
        return {x:((v.x*p.x+v.z*p.z)/-v.z+this.state.viewOffset+bx+1)/2,
          y:(1-((v.y*p.y+v.z*p.w)/-v.z+by))/2,front:v.z<-.002};
      }));
      const x=(Math.min(...corners.map(v=>v.x))+Math.max(...corners.map(v=>v.x)))/2;
      const y=Math.min(...corners.map(v=>v.y))-18/this.uniforms.height.value;
      return {index:g.index,x,y,height,growing:corners.every(v=>v.front)&&profileColumnGrowing(time,g)};
    });
  }
  render(dt:number){
    if(this.disposed || !this.renderer)return;
    const step=Math.max(0,Math.min(dt,.05));
    if(advanceProfilePointer(this.pointer,step))this.updateViews();
    this.uniforms.cursor.value.set(this.pointer.x,this.pointer.y);
    this.uniforms.time.value+=step;
    this.cultural?.update(step,this.state.cameraProgress);
    this.diffusion?.render();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    if(this.points){this.scene.remove(this.points);this.points.geometry.dispose();this.points.material.dispose();this.points=null;}
    if(this.cultural){this.scene.remove(this.cultural.points);this.cultural.dispose();this.cultural=undefined;}
    if(this.card){this.scene.remove(this.card.points);this.card.dispose();this.card=undefined;}
    this.diffusion?.dispose();this.diffusion=undefined;
    this.renderer?.dispose();this.renderer=null;this.data=undefined;this.shots=[];this.exterior=undefined;
  }
}
