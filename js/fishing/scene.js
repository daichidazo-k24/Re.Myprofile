/** Fishing jetty sits in the VOID beyond the final badge-island edge. No whiteboard. */
import {fishingState} from './state.js';
import {STAGE_INDEX,STEP} from '../data/stages.js';
// All rod segments share exact endpoints. The first endpoint is fixed to the pier;
// the last endpoint is the attachment point for the line, tip block and hook.
export const ROD_POINTS=[
 [-2.35,.95,1.15],
 [-.70,2.55,1.15],
 [1.50,4.22,1.15],
 [3.20,5.12,1.15]
];
const fishingX=STAGE_INDEX.fishing*STEP;
export const FISH_WORLD={x:fishingX,hookX:fishingX+ROD_POINTS.at(-1)[0],hookY:1.0,hookZ:ROD_POINTS.at(-1)[2],rodTipY:ROD_POINTS.at(-1)[1]};
// Grip position measured within the cropped sprite, from its top-left corner.
const gripX=.907,gripY=.618,width=2.05,height=2.61;
const [handleX,handleY,handleZ]=ROD_POINTS[0];
export const FISHING_CHARACTER={
 crop:[368,304,560,712],gripX,gripY,width,height,
 x:fishingX+handleX-(gripX-.5)*width,
 y:handleY+(gripY-.5)*height,z:handleZ+.03,
};
// A box has its length along local Y; rotate around Z so it reaches endpoint B.
export function segmentGeometry(a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
 return {x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,z:(a[2]+b[2])/2,
         length:Math.hypot(dx,dy,dz),angle:-Math.atan2(dx,dy)};
}

export function drawFishingWorld({box},t){
 const x=FISH_WORLD.x;
 // The island ends to the left. Only a short wooden pier continues into open air.
 for(let j=0;j<7;j++){
  const px=x-5.5+j*.84;
  box(px,-.35,1.4,.82,.36,3.5,j%2?'#735885':'#50699d');
  box(px,-.10,1.4,.8,.12,3.4,j%2?'#c1a36c':'#d1b883');
  if(j%2===0)box(px, -.03, 3.19,.14,.13,.20,'#4b4f71');
 }
 // Cantilever support beams & safety marker next to the last solid block.
 box(x-4.9,-1.15,1.65,.55,1.65,.55,'#243c65');
 box(x-1.7,-1.65,1.65,.48,2.6,.48,'#1c3155');
 box(x-.05,-.70,1.3,.38,1.2,.38,'#344e7d');
 box(x-4.8,.9,1.1,.28,2.2,.28,'#ddac58');
 box(x-4.8,2.1,1.1,1.2,.7,.1,'#e9a43e');
 box(x-4.8,2.12,1.22,.7,.28,.08,'#19365d');
 // Rod, tip block, and hanging line form one continuous connected rig.
 const points=ROD_POINTS.map(([dx,y,z])=>[x+dx,y,z]);
 const colors=['#78553b','#dca65a','#f6d893'];
 points.slice(0,-1).forEach((point,i)=>{
  const v=segmentGeometry(point,points[i+1]);
  box(v.x,v.y,v.z,i===0?.25:.15,v.length,.19,colors[i],0,0,v.angle);
  box(point[0],point[1],point[2],.18,.18,.18,i===0?'#283652':colors[i]);
 });
 const tip=points.at(-1);
 // Yellow tip block and the cord have the SAME x/z position as the rod endpoint.
 box(tip[0],tip[1],tip[2],.32,.32,.32,'#f68d1f',t*.08);
 const p=fishingState.phase==='reeling'?Math.min(1,(performance.now()-fishingState.castingAt)/1220):fishingState.phase==='caught'?1:0;
 fishingState.progress=p;
 const hookY=FISH_WORLD.hookY+Math.sin(t*2.8)*.14+3.6*p;
 const lineLen=Math.max(.12,tip[1]-hookY);
 box(tip[0],(tip[1]+hookY)/2,tip[2],.042,lineLen,.042,'#d7e7fa');
 box(tip[0],hookY,tip[2],.42,.45,.26,p>.7?'#ffe68b':'#f68d1f',t*.6);
 box(tip[0],hookY+.10,tip[2]+.17,.24,.19,.08,'#fff5c4');
 box(tip[0]+.14,hookY-.19,tip[2],.09,.21,.09,'#e6edf9');
 // Thin pixels drift down into the void, making it visibly separate from the platform.
 for(let j=0;j<13;j++){
  const dx=x+1.5+j*.31, yy=-1.5-j*.6+Math.sin(t*1.5+j)*.17;
  box(dx,yy,1.15+(j%3)*.6,.06,.12,.08,j%3===0?'#ed9b42':'#6185b2');
 }
}
