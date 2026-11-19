/** Reuse the world canvas for the same sky when only HTML-in-Canvas is missing.
 * The CSS3D world remains in front of the camera-aware sky dome. */
import {createSkyBackground} from './sky-background.js';
import {createAuroraPanelRenderer} from './aurora-panels.js';

export function createSkyBackdrop(canvas){
 let background,panels;
 try{
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
  if(!gl)return null;
  background=createSkyBackground(gl);
  panels=createAuroraPanelRenderer(gl);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(.012,.023,.055,1);
  canvas.style.display='';
  return {
   draw(state,dt,camera){
    const ratio=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(canvas.clientWidth*ratio));
    const height=Math.max(1,Math.round(canvas.clientHeight*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
    gl.viewport(0,0,width,height);
    gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    background.draw(state,dt,width,height,camera);
    panels.draw(state,dt,camera);
   },
   destroy(){background.destroy();panels.destroy()},
  };
 }catch(error){
  background?.destroy();
  panels?.destroy();
  console.warn('Aurora background unavailable:',error);
  return null;
 }
}
