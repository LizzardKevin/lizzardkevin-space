import { useEffect, type RefObject } from 'react';
import type Lenis from 'lenis';
import { prefersReducedMotion } from '../../scroll/useLenisScroll.ts';
import { createProfileWheelGesture, sampleProfileWheel, resolveProfileSnapTarget, PROFILE_WHEEL_SNAP } from './profileWheelSnap.ts';

/** Fast wheel bursts settle on the same reading centers used by the title index.
 * Slow wheel input, touch dragging, keys and scrollbar dragging stay native. */
export function useProfileWheelSnap(scroller:HTMLElement|null,lenisRef:RefObject<Lenis|null>,enabled:boolean){
  useEffect(()=>{
    if(!scroller||!enabled)return;
    let gesture=createProfileWheelGesture(),timer:ReturnType<typeof setTimeout>|undefined,snapping=false;
    const cancel=()=>{
      clearTimeout(timer);timer=undefined;gesture=createProfileWheelGesture();
      if(snapping){lenisRef.current?.scrollTo(scroller.scrollTop,{immediate:true});snapping=false;}
    };
    const settle=()=>{
      timer=undefined;
      if(!gesture.fast||document.hidden)return;
      const limit=Math.max(0,scroller.scrollHeight-scroller.clientHeight),top=scroller.getBoundingClientRect().top;
      const centers=Array.from(scroller.querySelectorAll<HTMLElement>('[data-profile-stage]'),el=>
        Math.min(limit,Math.max(0,el.getBoundingClientRect().top-top+scroller.scrollTop+Math.max(0,(el.clientHeight-scroller.clientHeight)/2))));
      const lenis=lenisRef.current;
      const target=resolveProfileSnapTarget(centers,lenis?.targetScroll??scroller.scrollTop,gesture.direction,gesture.start);
      gesture=createProfileWheelGesture();
      if(target===null||Math.abs(target-scroller.scrollTop)<2)return;
      if(lenis&&!prefersReducedMotion()){
        snapping=true;
        lenis.scrollTo(target,{duration:.78,lock:false,easing:t=>1-(1-t)**3,onComplete:()=>{snapping=false;}});
      }else scroller.scrollTo({top:target,behavior:'instant'});
    };
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)){cancel();return;}
      // Capture phase cancels before Lenis handles this new input, so its first
      // wheel delta is retained instead of being overwritten by cancellation.
      if(snapping)cancel();
      const fast=sampleProfileWheel(gesture,performance.now(),event.deltaY,scroller.scrollTop);
      clearTimeout(timer);
      if(fast)timer=setTimeout(settle,PROFILE_WHEEL_SNAP.quietMs);
    };
    const key=(event:KeyboardEvent)=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Escape','Tab'].includes(event.key))cancel();};
    scroller.addEventListener('wheel',wheel,{passive:true,capture:true});
    window.addEventListener('pointerdown',cancel,true);window.addEventListener('touchstart',cancel,{passive:true});
    window.addEventListener('keydown',key);window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);
    return()=>{cancel();scroller.removeEventListener('wheel',wheel,true);window.removeEventListener('pointerdown',cancel,true);
      window.removeEventListener('touchstart',cancel);window.removeEventListener('keydown',key);window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);};
  },[scroller,lenisRef,enabled]);
}
