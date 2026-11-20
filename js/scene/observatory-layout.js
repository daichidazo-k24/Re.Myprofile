import {STEP} from '../data/stages.js';
// Board faces sit at z=-1.327. The ladder is slightly behind the boards.
export const OBSERVATORY=Object.freeze({x:3.5*STEP,z:-2.1,height:8,leftStage:3,rightStage:4});
export const TELESCOPE_EYE=Object.freeze([OBSERVATORY.x+.65,OBSERVATORY.height+1.75,OBSERVATORY.z-.8]);
export function isObservatoryApproach(x,z){return Math.abs(x-OBSERVATORY.x)<1.5&&z>OBSERVATORY.z-1.5&&z<OBSERVATORY.z+5}
