import type { ProfileTimeline } from './profileTimeline.ts';

/** Shared optical treatment for the name card and every Profile particle cloud. */
export const PROFILE_DIFFUSION={strength:.18,radius:.32,threshold:.52} as const;
export const PROFILE_HALFTONE={spacing:4.4,maxDots:80000} as const;

export function profileCardMix(state:Pick<ProfileTimeline,'from'|'to'|'progress'>){
  const card=(stage:string)=>stage==='hero'||stage==='links'?1:0;
  return card(state.from)+(card(state.to)-card(state.from))*state.progress;
}

export function createProfileCardGrid(width:number,height:number){
  let spacing=Math.max(PROFILE_HALFTONE.spacing,Math.sqrt(width*height/PROFILE_HALFTONE.maxDots));
  let columns=Math.max(1,Math.ceil(width/spacing)),rows=Math.max(1,Math.ceil(height/spacing));
  while(columns*rows>PROFILE_HALFTONE.maxDots){spacing*=1.01;columns=Math.ceil(width/spacing);rows=Math.ceil(height/spacing);}
  const coordinates=new Float32Array(columns*rows*2);
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const i=(row*columns+col)*2;
    coordinates[i]=(col+.5+(row%2)*.28)/columns*2-1;
    coordinates[i+1]=(row+.5)/rows*2-1;
  }
  return {coordinates,spacing};
}
