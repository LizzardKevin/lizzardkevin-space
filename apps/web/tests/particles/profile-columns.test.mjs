import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileColumnHeight,profileColumnGrowing} from '../../src/particles/profile/profileColumnMotion.ts';
import {ProfileColumnLabels,profileWorkTitles,profileColumnLabelFrame} from '../../src/particles/profile/profileColumnLabels.ts';
const manifest=JSON.parse(readFileSync(new URL('../../public/particles/profile/manifest.json',import.meta.url)));
const groups=manifest.model.groups.filter(g=>g.kind==='height');
test('column heights stay grounded with lower minima, independent varying speeds and smooth trajectories',()=>{
  assert.equal(groups.length,72);
  const minima=groups.map(()=>Infinity),maxima=groups.map(()=>-Infinity);
  groups.forEach((g,i)=>{
    const rates=[];
    for(let t=0;t<180;t+=.1){const h=profileColumnHeight(t,g);minima[i]=Math.min(minima[i],h);maxima[i]=Math.max(maxima[i],h);assert.ok(h>=.12&&h<=1.3);assert.ok(Math.abs(profileColumnHeight(t+.01,g)-h)<.03);rates.push(Math.abs(profileColumnHeight(t+.01,g)-h));}
    assert.ok(Math.max(...rates)>Math.min(...rates)*3);
  });
  assert.ok(minima.every(h=>h<.15));assert.ok(maxima.every(h=>h>1.25));
  assert.ok(new Set(groups.map(g=>profileColumnHeight(4,g).toFixed(5))).size>30);
  assert.ok(groups.some(g=>profileColumnGrowing(4,g)));
});
test('localized names come from their corresponding real project catalog',()=>{
  assert.equal(profileWorkTitles('student','en').length,7);
  assert.ok(profileWorkTitles('student','zh').includes('Tree Habitat'));
  assert.deepEqual(profileWorkTitles('career','zh'),['UABB 华强北研究','Game Jam']);
  assert.deepEqual(profileWorkTitles('career','en'),['UABB Huaqiangbei study','Game Jam']);
});
test('names occupy at most three unique growing columns and last 3–8 seconds',()=>{
  const scheduler=new ProfileColumnLabels(),titles=profileWorkTitles('student','en');
  const anchors=groups.map((g,i)=>({index:g.index,x:.2+i*.01,y:.4,height:.8,growing:true}));
  const seen=new Set();let peak=0;
  for(let time=0;time<120;time+=.1){const labels=scheduler.update(time,anchors,titles,'student|en');peak=Math.max(peak,labels.length);assert.ok(labels.length<=3);assert.equal(new Set(labels.map(l=>l.column)).size,labels.length);assert.equal(new Set(labels.map(l=>l.title)).size,labels.length);
    for(const l of labels){assert.ok(titles.includes(l.title));assert.ok(l.duration>=3&&l.duration<=8);assert.ok(time<l.start+l.duration);seen.add(l.column);assert.equal(profileColumnLabelFrame(l,l.start+l.duration+.01).opacity,0);}
  }
  assert.equal(peak,3);assert.ok(seen.size>15);
  assert.equal(scheduler.update(121,anchors,[],'').length,0);
  assert.equal(new ProfileColumnLabels().update(10,anchors.map(a=>({...a,growing:false})),titles,'student').length,0);
});
test('name text alternates between ASCII and readable title during its bounded lifetime',()=>{
  const label={column:4,title:'Tree Habitat',start:0,duration:5};
  const frames=Array.from({length:50},(_,i)=>profileColumnLabelFrame(label,i*.1).text);
  assert.ok(frames.includes(label.title));assert.ok(frames.some(text=>text!==label.title&&/[<>/\\\[\]{}#%+=_:;01]/.test(text)));
});
