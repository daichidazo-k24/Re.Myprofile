import {STAGES} from './data/stages.js';
import {createMiningSkyBridge} from './scene/sky-model.js';
const motionPreference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
/** Scroll is tracked in actual CSS pixels of each stage's native scroll viewport. */
export const state = {
 active:0,scrollY:STAGES.map(()=>0),aim:0,cameraX:0,
 entered:false,focused:false,focusMix:0,
 mouseX:0,mouseY:0,dragX:0,dragY:0,
 orbitYaw:0,orbitPitch:0,orbitDistance:17.5,orbitPanX:0,orbitPanY:0,
 cameraUnlocked:false,atLadder:false,observatoryPhase:'ground',observatoryHeight:0,
 reduceMotion:motionPreference?.matches??false,
 miningSky:createMiningSkyBridge(),
};
motionPreference?.addEventListener?.('change',event=>{state.reduceMotion=event.matches});
