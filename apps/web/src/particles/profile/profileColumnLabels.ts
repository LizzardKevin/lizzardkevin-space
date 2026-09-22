import { getLizzardKevinProfile } from '../../content/lizzardKevinProfile.ts';
import type { SupportedLanguage } from '../../i18n/resolveInitialLanguage.ts';
import { mulberry32 } from '../seededRandom.ts';
import { cipherFrame } from '../../scroll/asciiTransition.ts';

export type ColumnAnchor={index:number;x:number;y:number;height:number;growing:boolean};
export type ColumnLabel={column:number;title:string;start:number;duration:number};
export function profileWorkTitles(stage:'student'|'career',language:SupportedLanguage):string[] {
  const id=stage==='student'?'profile-education':'profile-architecture';
  return getLizzardKevinProfile(language).sections.find(section=>section.id===id)!.fill
    .map(line=>line.split(' · ')[1]?.split(/[:：]/u)[0].trim()).filter((title):title is string=>Boolean(title));
}

/** Three slots, seeded choice, and growth-triggered appearances; the renderer owns time. */
export class ProfileColumnLabels {
  private random=mulberry32(0x434f4c55);
  private labels:ColumnLabel[]=[];
  private next=0;
  private context='';
  update(time:number,anchors:readonly ColumnAnchor[],titles:readonly string[],context:string):readonly ColumnLabel[]{
    if(context!==this.context){this.labels=[];this.next=time+.35;this.context=context;}
    this.labels=this.labels.filter(label=>time<label.start+label.duration);
    if(!context || !titles.length){this.labels=[];return this.labels;}
    if(time>=this.next&&this.labels.length<Math.min(3,titles.length)){
      const available=anchors.filter(anchor=>anchor.growing&&anchor.height>.32&&anchor.x>.06&&anchor.x<.94&&anchor.y>.08&&anchor.y<.94
        &&!this.labels.some(label=>label.column===anchor.index));
      const names=titles.filter(title=>!this.labels.some(label=>label.title===title));
      if(available.length&&names.length){
        const column=available[Math.floor(this.random()*available.length)].index;
        this.labels.push({column,title:names[Math.floor(this.random()*names.length)],start:time,duration:3+this.random()*5});
      }
      this.next=time+.75+this.random()*1.2;
    }
    return this.labels;
  }
}

export function profileColumnLabelFrame(label:ColumnLabel,time:number):{text:string;opacity:number}{
  const age=time-label.start,remaining=label.duration-age;
  if(age<0||remaining<=0)return {text:'',opacity:0};
  const tick=Math.floor(age*12),enter=Math.min(1,age/.6),exit=Math.min(1,remaining/.55);
  // Brief noisy bursts between readable periods, with slower entrance and departure.
  const flash=(tick+label.column*7)%19<3?.25:1;
  const reveal=Math.min(enter,exit,flash);
  return {text:cipherFrame(label.title,reveal,'enter',tick).text,opacity:Math.min(1,age/.25,remaining/.4)*.88};
}
