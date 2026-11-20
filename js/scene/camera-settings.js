/** Slightly raised frontal view, with a gentle upward sightline. */
export const WORLD_CAMERA=Object.freeze({targetHeight:3.7,pitch:-.035,distance:17.5});
/** Optical field of view in degrees, independent of world-camera distance. */
const referenceFov=56;
export const TELESCOPE_OPTICS=Object.freeze({defaultFov:referenceFov,
 minFov:2*Math.atan(Math.tan(referenceFov*Math.PI/360)/3)*180/Math.PI,
 maxFov:referenceFov,referenceFov,minMagnification:1,maxMagnification:3});
