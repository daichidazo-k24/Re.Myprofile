/** A single source of truth for the WebGL miner plane and its DOM depth overlay. */
import {M} from './math.js';
import {STEP} from '../data/stages.js';
export function minerPose(index,t){
 return {
  x:index*STEP-5.75,
  y:2.05+.09*Math.sin(t*5.6),
  z:2.38,
  width:2.35,height:1.95,
  ry:-.09+.08*Math.sin(t*1.1),
  rx:.04*Math.sin(t*4.5)
 };
}
export function minerModel(index,t){
 const p=minerPose(index,t);
 return M.model(p.x,p.y,p.z,p.width,p.height,1,p.ry,p.rx);
}
