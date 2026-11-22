import {STAGE_INDEX,STEP} from '../data/stages.js';
const badgesX=STAGE_INDEX.badges*STEP;
export const OBSERVATORY=Object.freeze({
 x:(STAGE_INDEX.quests+STAGE_INDEX.badges)*STEP/2,
 z:-3.85, height:13.35, leftStage:STAGE_INDEX.quests, rightStage:STAGE_INDEX.badges,
 stairZ:1.85, stairTop:2.35, ladderX:badgesX-5.85,
 actorCenter:.85,actorWidth:1.9,actorHeight:1.65,
});
export const STAIR_ARRIVAL_DISTANCE=.3;
const {x,z,height,stairZ,stairTop,ladderX}=OBSERVATORY;
const deckArrival=height-1.05;
const roofX=ladderX+1.58;
export const TELESCOPE_POSITION=Object.freeze([roofX+1, height+1.55, -5.64]);
export const TELESCOPE_EYE=Object.freeze([TELESCOPE_POSITION[0]-.54,TELESCOPE_POSITION[1]+.15,TELESCOPE_POSITION[2]]);
export const STAIR_HOTSPOT=Object.freeze([x,1.06,stairZ]);
const mix=(a,b,t)=>a+(b-a)*t;

export function observatoryClimberPose(progress){
 if(progress<stairTop){
  const t=progress/stairTop;
  return {x:mix(x,ladderX,t),y:progress,z:mix(stairZ,z+.36,t),onStairs:true,onLadder:false};
 }
 if(progress<deckArrival){
  const t=(progress-stairTop)/(deckArrival-stairTop);
  return {x:ladderX,y:mix(stairTop,height,t),z:z+.36,onLadder:true};
 }
 const t=(progress-deckArrival)/(height-deckArrival);
 return {x:mix(ladderX,roofX,t),y:height,z:mix(z+.36,-5.03,t),onLadder:false};
}

export function observatoryCameraOffset(progress){
 const actor=observatoryClimberPose(progress);
 return [actor.x-x,actor.y,(actor.z-stairZ)*.65];
}

export function isObservatoryApproach(px,pz){
 return px>x-1.4&&px<ladderX+1.4&&pz>z-.6&&pz<stairZ+1.05;
}

export function buildRooftopStructure(box){
 const stone=['#455876','#637490'],wood=['#4d3837','#85563e','#b37d52','#e1b67b'];
 const steps=6;
 for(let step=0;step<steps;step++){
  const top=.08+(stairTop-.08)*step/(steps-1);
  const center=observatoryClimberPose(stairTop*step/(steps-1));
  box(center.x,(top-.1)*.5,center.z,1.68,top+.1,1.12,stone[step%2]);
  box(center.x,top-.035,center.z+.31,1.6,.11,.3,wood[step%2?2:3]);
 }
 // An upright fixed to the root wall carries the ladder and the roof walk.
 box(ladderX+.48,(height+stairTop)/2,z-.62,1.02,height-stairTop,.98,wood[0]);
 for(const offset of [-.6,.6]){
  box(ladderX+offset,(height+stairTop)/2,z,.16,height-stairTop,.24,wood[2]);
 }
 for(let y=stairTop+.29;y<height;y+=.46)box(ladderX,y,z+.07,1.29,.13,.25,wood[3]);
 for(const y of [3.25,5.5,7.7,9.88,12.22]){
  box(ladderX+.69,y,z-.23,.36,.25,.63,wood[1]);
 }
 // Crosspieces tie the uprights into the stone ledges and the cabin floor.
 box(ladderX+1.43,4.07,-4.95,2.38,.32,.66,wood[1]);
 box(ladderX+1.85,6.05,-5.24,3.15,.35,.83,wood[0]);
 box(ladderX+2.29,8.17,-5.53,4.28,.35,.53,wood[1]);
 box(ladderX+3.43,10.25,-5.69,6.08,.42,.62,wood[0]);

 // The planks meet the left eave. Keep the ladder opening clear of the rail.
 const deckEnd=badgesX+.18,deckStart=ladderX-.82,deckDepth=2.68,deckZ=z-1.38;
 const width=deckEnd-deckStart;
 box(deckStart+width/2,height-.28,deckZ,width,.4,deckDepth,wood[0]);
 for(let offset=0;offset<width;offset+=.5){
  const w=Math.min(.485,width-offset);
  box(deckStart+offset+w/2,height-.075,deckZ,w,.15,deckDepth,wood[offset%1===0?1:2]);
 }
 for(const railZ of [deckZ-1.21,deckZ+1.21]){
  const start=railZ<deckZ?deckStart:ladderX+.82;
  box((start+deckEnd)/2,height+.62,railZ,deckEnd-start,.14,.15,wood[2]);
  for(let px=start+.12;px<deckEnd;px+=.92)box(px,height+.29,railZ,.13,.67,.13,wood[1]);
 }
 box(deckStart+.07,height+.62,deckZ,.14,.14,deckDepth,wood[2]);
 box(deckStart+.1,height+.3,deckZ+1.21,.15,.67,.15,wood[1]);
 box(ladderX+.92,height-1.2,deckZ-.85,.36,1.69,.48,wood[1]);
 box(roofX+1.04,height-.6,deckZ-.72,2.12,.29,.5,wood[1]);
}

export function buildRooftopTelescope(box){
 const [tx,ty,tz]=TELESCOPE_POSITION;
 box(tx,height+.14,tz,.73,.28,.65,'#433537');
 box(tx,height+.7,tz,.21,1.14,.21,'#b17b4d');
 for(const dz of [-.27,.27])box(tx,height+.32,tz+dz,.15,.59,.15,'#895e49');
 box(tx,ty-.08,tz,1.52,.42,.49,'#e6ad59');
 box(tx-.44,ty,tz,.59,.45,.52,'#e6ad59');
 box(tx-.83,ty+.07,tz,.22,.6,.64,'#34415b');
 box(tx-.96,ty+.07,tz,.06,.46,.49,'#84e0ca');
 box(tx+.81,ty-.14,tz,.27,.25,.28,'#34415b');
}
