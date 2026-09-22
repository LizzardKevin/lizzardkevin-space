import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ProfileParticleRenderer } from '../../particles/profile/ProfileParticleRenderer.ts';
import { fetchProfileManifest, fetchProfileModel, fetchProfileExterior, type ProfileExteriorData, type ProfileModelData } from '../../particles/profile/profileCache.ts';
import { resolveProfileTimeline, type ProfileStage, type ProfileStop } from '../../particles/profile/profileTimeline.ts';
import { useScrollPage } from '../../scroll/scrollPageContext.ts';
import { usePageLanguage } from '../../scroll/usePageLanguage.ts';
import { ProfileColumnLabels, profileWorkTitles, profileColumnLabelFrame } from '../../particles/profile/profileColumnLabels.ts';
import './profile-column-labels.css';
import { fetchCultural } from '../../particles/profile/profileCultural.ts';

/** One generation per ArchiveHub; pausing retains buffers and the autonomous motion clock. */
export function ProfileParticleHost({active}:{active:boolean}) {
  const hostRef=useRef<HTMLDivElement>(null);
  const activeRef=useRef(active);
  const controllerRef=useRef<{synchronize:()=>void}|null>(null);
  const {scroller}=useScrollPage();
  const language=usePageLanguage(),languageRef=useRef(language);
  const titles=useMemo(()=>({student:profileWorkTitles('student',language),career:profileWorkTitles('career',language)}),[language]);
  const titlesRef=useRef(titles);
  useLayoutEffect(()=>{languageRef.current=language;titlesRef.current=titles;},[language,titles]);
  useLayoutEffect(()=>{activeRef.current=active;controllerRef.current?.synchronize();},[active]);
  useEffect(()=>{
    const host=hostRef.current;
    if(!host || !scroller)return;
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.dataset.profileParticleState='loading';
    Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});host.appendChild(canvas);
    const renderer=new ProfileParticleRenderer(),abort=new AbortController();
    const labels=new ProfileColumnLabels();
    const labelNodes=Array.from({length:3},()=>{
      const span=document.createElement('span');span.className='profile-column-label';span.setAttribute('aria-hidden','true');host.appendChild(span);return span;
    });
    let disposed=false,failed=false,ready=false,raf=0,last=0,frames=0;
    let stops:ProfileStop[]=[];
    let state=resolveProfileTimeline(scroller.scrollTop,stops);
    const sample=()=>{
      if(!activeRef.current)return;
      state=resolveProfileTimeline(scroller.scrollTop,stops,scroller.clientHeight);renderer.setTimeline(state);
      if(import.meta.env.DEV){canvas.dataset.profileTimeline=JSON.stringify(state);}
    };
    const measure=()=>{
      if(disposed || !activeRef.current)return;
      const top=scroller.getBoundingClientRect().top;
      stops=Array.from(scroller.querySelectorAll<HTMLElement>('[data-profile-stage]'),el=>({stage:el.dataset.profileStage as ProfileStage,offset:el.getBoundingClientRect().top-top+scroller.scrollTop+Math.max(0,(el.clientHeight-scroller.clientHeight)/2)}));
      renderer.resize(host.clientWidth,host.clientHeight,devicePixelRatio||1);sample();
    };
    const frame=(now:number)=>{
      raf=0;
      if(disposed || !activeRef.current || document.hidden || !ready){last=0;return;}
      try {
        renderer.render(last?Math.min((now-last)/1000,.05):0);last=now;frames++;
        const chapter=state.progress<.5?state.from:state.to;
        const show=(chapter==='student'||chapter==='career')&&renderer.uniforms.cloudVisibility.value>.75;
        const anchors=show?renderer.getColumnAnchors():[],time=renderer.uniforms.time.value;
        const current=labels.update(time,anchors,show?titlesRef.current[chapter]:[],show?`${chapter}|${languageRef.current}`:'');
        labelNodes.forEach((span,index)=>{
          const label=current[index],anchor=label&&anchors.find(a=>a.index===label.column);
          if(!label||!anchor){span.style.opacity='0';span.textContent='';return;}
          const frame=profileColumnLabelFrame(label,time);
          span.textContent=frame.text;span.style.opacity=String(frame.opacity);
          span.style.left=`${anchor.x*100}%`;span.style.top=`${anchor.y*100}%`;
          span.dataset.column=String(label.column);span.dataset.workTitle=label.title;
        });
        if(import.meta.env.DEV){
          canvas.dataset.profileFrames=String(frames);canvas.dataset.profileTime=String(renderer.uniforms.time.value);
          if(frames%12===0)canvas.dataset.profilePointer=JSON.stringify(renderer.getPointerPose());
          if(frames%12===0)canvas.dataset.profileCultural=JSON.stringify(renderer.getCulturalState());
          if(frames%12===0)canvas.dataset.profileAtmosphere=JSON.stringify(renderer.getAtmosphereState());
        }
        raf=requestAnimationFrame(frame);
      } catch(error) {
        failed=true;canvas.dataset.profileParticleState='failed';ready=false;abort.abort();renderer.dispose();
        labelNodes.forEach(span=>{span.style.opacity='0';span.textContent='';});
        console.error('[Profile particles] renderer stopped',error);
      }
    };
    const synchronize=()=>{
      cancelAnimationFrame(raf);raf=0;last=0;
      if(activeRef.current && !document.hidden && ready){measure();raf=requestAnimationFrame(frame);}
    };
    controllerRef.current={synchronize};
    const pointer=(event:PointerEvent)=>{
      if(!activeRef.current)return;
      const rect=host.getBoundingClientRect();renderer.setCursor((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
    };
    const leave=()=>renderer.setCursor(10,10);
    const resize=new ResizeObserver(measure);resize.observe(scroller);
    const content=scroller.querySelector('.ark-scroll__content');if(content)resize.observe(content);
    scroller.addEventListener('scroll',sample,{passive:true});
    window.addEventListener('pointermove',pointer,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
    document.addEventListener('visibilitychange',synchronize);
    const requested=import.meta.env.DEV && new URLSearchParams(location.search).get('ppBackend')==='webgl2'?'simplified':undefined;
    void renderer.init(canvas,requested).then(()=>{
      if(disposed)return;
      ready=true;canvas.dataset.profileBackend=renderer.resolution?.backend;
      if(canvas.dataset.profileParticleState==='loading')canvas.dataset.profileParticleState='ambient';
      synchronize();
    }).catch(error=>{if(!disposed){failed=true;abort.abort();renderer.dispose();canvas.dataset.profileParticleState='failed';console.error('[Profile particles] initialization failed',error);}});
    void fetchProfileManifest(abort.signal).then(manifest=>{
      if(disposed||failed)return;
      let model:ProfileModelData|undefined;
      let exterior:ProfileExteriorData|undefined;
      const install=()=>renderer.setScene(model,exterior);
      if(manifest.exterior){
        canvas.dataset.profileExteriorState='loading';
        void fetchProfileExterior(manifest.exterior,abort.signal).then(data=>{
          if(disposed||failed)return;exterior=data;install();canvas.dataset.profileExteriorState='ready';
        }).catch(error=>{if(!disposed&&!failed){canvas.dataset.profileExteriorState='failed';console.warn('[Profile particles] exterior unavailable',error);}});
      }
      // The complete Rhino scene loads once; all chapters retain the same point IDs.
      void fetchProfileModel(manifest.model,abort.signal).then(data=>{
        if(disposed||failed)return;
        model=data;
        install();
        canvas.dataset.profileParticleState='ready';
      }).catch(error=>{if(!disposed&&!failed){canvas.dataset.profileParticleState='partial';console.warn('[Profile particles] model unavailable; using ambient field',error);}});
    }).catch(error=>{if(!disposed&&!failed){canvas.dataset.profileParticleState='partial';console.warn('[Profile particles] assets unavailable; using ambient field',error);}});
    void fetchCultural(abort.signal).then(scenes=>{
      if(disposed||failed)return;renderer.setCultural(scenes);
    }).catch(error=>{if(!disposed&&!failed)console.warn('[Profile particles] Cultural scenes unavailable',error);});
    return()=>{
      disposed=true;abort.abort();controllerRef.current=null;cancelAnimationFrame(raf);resize.disconnect();
      scroller.removeEventListener('scroll',sample);window.removeEventListener('pointermove',pointer);document.documentElement.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',synchronize);
      renderer.dispose();canvas.remove();labelNodes.forEach(span=>span.remove());
    };
  },[scroller]);
  return <div ref={hostRef} className="profile-particles" aria-hidden="true" style={{position:'fixed',inset:'var(--ark-topbar-h) 0 0',zIndex:-1,pointerEvents:'none',visibility:active?'visible':'hidden'}} />;
}
