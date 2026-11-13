import {STAGES} from './data/stages.js';
/** Scroll is tracked in actual CSS pixels of each stage's native scroll viewport. */
export const state = {
 active:0,scrollY:STAGES.map(()=>0),aim:0,cameraX:0,
 entered:false,focused:false,focusMix:0,
 mouseX:0,mouseY:0,dragX:0,dragY:0,
 orbitYaw:.14,orbitPitch:.22,orbitDistance:17.5,orbitPanX:0,orbitPanY:0,
 reduceMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,
};
