/** One round planetarium shell encloses the island, including mobile camera poses.
 * Aurora panels and the night backing share this center and radius; no vertical scaling. */
import {STAGES,STEP} from '../data/stages.js';

export const SKY_DOME_RADIUS=180;
export const SKY_DOME_CENTER=Object.freeze([(STAGES.length-1)*STEP*.5,0,0]);
export const SKY_DOME_GLSL=`
const float SKY_RADIUS=${SKY_DOME_RADIUS.toFixed(1)};
const vec3 SKY_CENTER=vec3(${SKY_DOME_CENTER.map(n=>n.toFixed(2)).join(',')});
`;

/** Intersect a world viewing ray with the inside of the same spherical shell. */
export function skyDomeDirection(eye,ray,out){
 const length=Math.hypot(...ray)||1;
 const dx=ray[0]/length,dy=ray[1]/length,dz=ray[2]/length;
 const x=eye[0]-SKY_DOME_CENTER[0],y=eye[1]-SKY_DOME_CENTER[1],z=eye[2]-SKY_DOME_CENTER[2];
 const b=x*dx+y*dy+z*dz;
 const distance=-b+Math.sqrt(Math.max(0,b*b+SKY_DOME_RADIUS**2-x*x-y*y-z*z));
 out[0]=(x+dx*distance)/SKY_DOME_RADIUS;
 out[1]=(y+dy*distance)/SKY_DOME_RADIUS;
 out[2]=(z+dz*distance)/SKY_DOME_RADIUS;
 return out;
}
