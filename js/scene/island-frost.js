import {STAGE_INDEX,STAGES,STEP} from '../data/stages.js';
import {seeded} from './math.js';

// The flakes occupy the island's air, separately from the planetarium.
export const frostFlakes=STAGES.flatMap((stage,index)=>{
 if(stage.id==='fishing')return [];
 return Array.from({length:38},(_,i)=>{
  const edge=i>=27;
  const random=key=>seeded(index*53+i,key);
  const side=i%2===0?-1:1;
  const floor=-.32+random(22)*.9;
  const ceiling=stage.id==='badges'?17.4:13.7+index*.65;
  return {
   x:index*STEP+(edge?side*(6.2+random(12)*.9):(random(12)-.5)*13.3),
   z:edge?-.8+random(13)*2.65:-8.2+random(13)*5.6,
   floor,height:ceiling-floor,phase:random(15),speed:.46+random(16)*.61,
   size:.079+random(17)*.152,drift:(edge ? .14 : .34)+random(18)*.21,
   tint:.72+random(19)*.28,
  };
 });
});

export function showIslandFrost(state){
 return state.entered&&!state.focused&&state.focusMix<.05
  &&state.observatoryPhase!=='viewing'&&state.active!==STAGE_INDEX.fishing;
}

export function frostPose(flake,time,out){
 const travel=flake.phase+time*flake.speed/flake.height;
 const progress=travel-Math.floor(travel);
 const fade=Math.min(1,progress*14,(1-progress)*13);
 out[0]=flake.x+Math.sin(time*.52+flake.phase*6.28)*flake.drift;
 out[1]=flake.floor+(1-progress)*flake.height;
 out[2]=flake.z+Math.cos(time*.31+flake.phase*6.28)*.19;
 out[3]=flake.size*Math.sqrt(fade);
}

export function createFrostSprite(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=9;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#75aaff35';
 ctx.fillRect(3,3,3,3);
 ctx.fillRect(4,0,1,9);ctx.fillRect(0,4,9,1);
 ctx.fillStyle='#b3dfffad';
 ctx.fillRect(4,2,1,5);ctx.fillRect(2,4,5,1);
 ctx.fillStyle='#eaf7ff';
 ctx.fillRect(4,4,1,1);
 return canvas;
}
