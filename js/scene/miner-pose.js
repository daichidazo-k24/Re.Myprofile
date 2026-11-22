/** The idle and walking poses for the stage character. */
import {M} from './math.js';
import {STAGE_INDEX,STEP} from '../data/stages.js';
import {OBSERVATORY,STAIR_ARRIVAL_DISTANCE} from './observatory-layout.js';
import {FISHING_CHARACTER,FISH_WORLD} from '../fishing/scene.js';

const MINER_X=-5.75;
const MINER_Z=2.38;
const MINER_WIDTH=2.35;
const MINER_HEIGHT=1.95;
export const ARRIVAL_DISTANCE=.24;
const WALK_SPRITES=['walk1','walk2'];
const WALK_CROP=[128,236,1024,840];
const SPRITE_CROPS={walk1:WALK_CROP,walk2:WALK_CROP,upright:[128,221,1024,840],question:[445,488,360,344],curiosity:[236,280,704,780],fishing:FISHING_CHARACTER.crop};
const stairBubbleWidth=.76;
const stairBubbleHeight=stairBubbleWidth*780/704;
// Keep the lower-left corner beside the character as the bubble grows up and right.
export const STAIR_BUBBLE={
 x:OBSERVATORY.x+.84+stairBubbleWidth,y:OBSERVATORY.actorCenter+1+stairBubbleHeight,z:OBSERVATORY.stairZ+.09,
 width:stairBubbleWidth*3,height:stairBubbleHeight*3,
};

export function minerPose(index){
 return {
  x:index*STEP+MINER_X,
  y:2.05,
  z:MINER_Z,
  width:MINER_WIDTH,height:MINER_HEIGHT,
  ry:-.09,
 };
}
export function minerModel(index){
 const p=minerPose(index);
 return M.model(p.x,p.y,p.z,p.width,p.height,1,p.ry);
}

export function minerWalkPose({active,aim,cameraX,entered,atLadder,observatoryPhase,reduceMotion},time){
 const remaining=aim-cameraX;
 const groundTravel=atLadder?observatoryPhase==='ground'&&aim===OBSERVATORY.x:aim===active*STEP;
 const stopDistance=atLadder?STAIR_ARRIVAL_DISTANCE:ARRIVAL_DISTANCE;
 if(!entered||reduceMotion||!groundTravel||Math.abs(remaining)<stopDistance)return null;
 const pedestalX=Math.min(Math.round(cameraX/STEP),STAGE_INDEX.badges)*STEP;
 const lift=Math.max(0,1-Math.abs(cameraX-pedestalX)/2.7);
 const pierProgress=Math.max(0,cameraX/STEP-STAGE_INDEX.badges);
 // Both navigation targets share the same path through the stair landing.
 const stairOffset=cameraX-OBSERVATORY.x;
 const stairMix=Math.max(0,Math.min(1,(STEP/2-Math.abs(stairOffset))/(STEP/2-STAIR_ARRIVAL_DISTANCE)));
 const groundMix=1-stairMix;
 const routeX=stairMix?OBSERVATORY.x+Math.sign(stairOffset)*STEP/2*groundMix:cameraX;
 return {
  x:routeX+MINER_X*groundMix+(FISHING_CHARACTER.x-FISH_WORLD.x-MINER_X)*pierProgress,
  y:(1.18+.87*lift)*groundMix+OBSERVATORY.actorCenter*stairMix+(FISHING_CHARACTER.y-1.18)*pierProgress,
  z:(MINER_Z+.32*(1-lift))*groundMix+OBSERVATORY.stairZ*stairMix+(FISHING_CHARACTER.z-MINER_Z-.32)*pierProgress,
  width:MINER_WIDTH*groundMix+OBSERVATORY.actorWidth*stairMix,
  height:MINER_HEIGHT*groundMix+OBSERVATORY.actorHeight*stairMix,
  lift,pierProgress,stairMix,routeX,
  direction:Math.sign(remaining),sprite:WALK_SPRITES[Math.floor(time*9)%2],
 };
}

export function minerWalkModel({x,y,z,width,height,direction}){
 return M.model(x,y,z,width*direction,height,1);
}

export function createMinerArrival(){
 let arrivedAt=0,previousDestination=null;
 return ({active,aim,cameraX,entered,atLadder,observatoryPhase,reduceMotion},time)=>{
  const arrived=atLadder
   ? observatoryPhase==='ground'&&aim===OBSERVATORY.x&&Math.abs(aim-cameraX)<STAIR_ARRIVAL_DISTANCE
   : active!==STAGE_INDEX.fishing&&aim===active*STEP&&Math.abs(aim-cameraX)<ARRIVAL_DISTANCE;
  if(!entered||!arrived){
   previousDestination=null;
   return 0;
  }
  if(previousDestination!==aim){previousDestination=aim;arrivedAt=time;}
  const elapsed=time-arrivedAt;
  const duration=1.6;
  if(elapsed>=duration)return 0;
  if(reduceMotion)return 1;
  const pop=Math.min(1,elapsed/.22);
  const settle=.35+.65*(1-(1-pop)**3)+.22*Math.sin(Math.PI*pop);
  return settle*Math.min(1,(duration-elapsed)/.18);
 };
}

export function minerQuestionModel(index,scale){
 const {x,y,z}=minerPose(index);
 return M.model(x+1.02,y+1.18,z+.09,.83*scale,.79*scale,1);
}

export function loadMinerSprites(onSprite){
 for(const [name,[x,y,width,height]] of Object.entries(SPRITE_CROPS)){
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');
   canvas.width=width/4;
   canvas.height=height/4;
   const ctx=canvas.getContext('2d');
   if(!ctx)return;
   // Trim transparent padding and keep the character's feet aligned across poses.
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(image,x,y,width,height,0,0,canvas.width,canvas.height);
   onSprite(canvas,name);
  };
  image.src=new URL('../../assets/'+name+'.png',import.meta.url).href;
 }
}
