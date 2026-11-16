/** Deterministic sky data and timing; no DOM, textures or renderer dependencies. */
import {STAGES,STEP} from '../data/stages.js';
import {seeded} from './math.js';

export const MINING_STAR_COUNT=24;
export const SKY_STAR_COUNT=192;
export const STAR_MIN_PIXELS=4;
export const STAR_MAX_PIXELS=16;
export const STAR_COLORS=[[1,.9,.67],[.88,.95,1],[.62,.83,1]];
export const clamp01=n=>Math.max(0,Math.min(1,n));
export const smooth01=n=>{const t=clamp01(n);return t*t*(3-2*t)};

export function createSkyStars(){
 const columns=24,rows=SKY_STAR_COUNT/columns,left=-25,span=(STAGES.length-1)*STEP+50;
 return Array.from({length:SKY_STAR_COUNT},(_,i)=>({
  // Jittered cells cover the whole world, including both sides of the end stages.
  // Keep the mined stars' original depth range, behind every whiteboard.
  position:[left+(i%columns+.12+seeded(i,11)*.76)/columns*span,
   3+(Math.floor(i/columns)+.12+seeded(i,12)*.76)/rows*16,-7-seeded(i,13)*6],
  size:.20+seeded(i,17)*.14,color:STAR_COLORS[i%3],phase:seeded(i,18)*6.28,
 }));
}

export function createMiningSkyBridge(){
 return {available:false,active:false,count:0,targetCount:0,
  indices:new Int16Array(MINING_STAR_COUNT).fill(-1),
  targets:new Float32Array(MINING_STAR_COUNT*3),
  projected:new Float32Array(SKY_STAR_COUNT*3)};
}

/** Choose spread-out visible destinations once per replay; then only project those slots.
 * Actual world positions never depend on viewport, camera, or achievement data. */
export function projectMiningTargets(bridge,stars,vp,width,height,pixelRatio=1){
 function project(i,out,j){
  const [x,y,z]=stars[i].position,w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
  out[j]=w>.1?(1+(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w)*.5:-10;
  out[j+1]=w>.1?(1-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w)*.5:-10;
  out[j+2]=Math.min(STAR_MAX_PIXELS,Math.max(STAR_MIN_PIXELS,stars[i].size*height/Math.max(.1,w)/pixelRatio));
 }
 if(!bridge.targetCount){
  for(let i=0;i<stars.length;i++)project(i,bridge.projected,i*3);
  // Top-to-bottom selection lets early rock fragments rise to upper stars first.
  for(let slot=0;slot<MINING_STAR_COUNT;slot++){
   const tx=.08+(slot%6)/5*.84,ty=.08+Math.floor(slot/6)/3*.58;
   let best=-1,bestDistance=Infinity;
   for(let i=0;i<stars.length;i++){
    const x=bridge.projected[i*3],y=bridge.projected[i*3+1];
    if(x<.04||x>.96||y<.04||y>.7||bridge.indices.includes(i))continue;
    const d=(x-tx)**2+(y-ty)**2;
    if(d<bestDistance){best=i;bestDistance=d}
   }
   if(best<0)break;
   bridge.indices[bridge.targetCount++]=best;
  }
 }
 for(let i=0;i<bridge.targetCount;i++)project(bridge.indices[i],bridge.targets,i*3);
}

/** Ballistic stone first, then a smooth upward flight. Mutates a fixed particle slot. */
export function advanceMiningStar(p,dt,targetX,targetY,targetSize){
 p.age+=Math.max(0,dt);
 const ballistic=Math.min(p.age,.2);
 const bx=p.startX+p.vx*ballistic,by=p.startY+p.vy*ballistic+135*ballistic*ballistic;
 const flight=smooth01((p.age-.2)/1.25);
 p.x=bx+(targetX-bx)*flight;
 p.y=by+(targetY-by)*flight-Math.sin(flight*Math.PI)*32;
 p.glow=smooth01((p.age-.12)/.5);
 p.size=p.initialSize+(targetSize-p.initialSize)*flight;
 p.settled=flight===1;
 return p;
}
