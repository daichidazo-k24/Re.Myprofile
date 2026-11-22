/** The idle and walking poses for the stage character. */
import {M} from './math.js';
import {STAGE_INDEX,STEP} from '../data/stages.js';

const MINER_X=-5.75;
const MINER_Z=2.38;
const MINER_WIDTH=2.35;
const MINER_HEIGHT=1.95;

export function minerPose(index,t){
 return {
  x:index*STEP+MINER_X,
  y:2.05+.09*Math.sin(t*5.6),
  z:MINER_Z,
  width:MINER_WIDTH,height:MINER_HEIGHT,
  ry:-.09+.08*Math.sin(t*1.1),
  rx:.04*Math.sin(t*4.5)
 };
}
export function minerModel(index,t){
 const p=minerPose(index,t);
 return M.model(p.x,p.y,p.z,p.width,p.height,1,p.ry,p.rx);
}

export function minerWalkPose({active,aim,cameraX,entered,atLadder,reduceMotion},time){
 const remaining=aim-cameraX;
 if(!entered||atLadder||reduceMotion||aim!==active*STEP||Math.abs(remaining)<.24)return null;
 const pedestalX=Math.min(Math.round(cameraX/STEP),STAGE_INDEX.badges)*STEP;
 const lift=Math.max(0,1-Math.abs(cameraX-pedestalX)/2.7);
 const pierProgress=Math.max(0,cameraX/STEP-STAGE_INDEX.badges);
 return {
  x:cameraX+MINER_X+1.25*pierProgress,y:1.18+.87*lift,z:MINER_Z+.32*(1-lift),lift,pierProgress,
  direction:Math.sign(remaining),frame:Math.floor(time*9)%2,
 };
}

export function minerWalkModel({x,y,z,direction}){
 return M.model(x,y,z,MINER_WIDTH*direction,MINER_HEIGHT,1);
}

export function loadMinerWalkFrames(onFrame){
 for(const [index,name] of ['walk1.png','walk2.png'].entries()){
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');
   canvas.width=256;
   canvas.height=210;
   const ctx=canvas.getContext('2d');
   if(!ctx)return;
   // Both source frames share the same crop so the face and feet stay aligned.
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(image,128,236,1024,840,0,0,canvas.width,canvas.height);
   onFrame(canvas,index);
  };
  image.src=new URL('../../assets/'+name,import.meta.url).href;
 }
}
