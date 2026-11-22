import {STAGE_INDEX,STEP} from '../data/stages.js';
import {NOTEBOOK_WIDTH,NOTEBOOK_HEIGHT,NOTEBOOK_FACE_Z,NOTEBOOK_LABEL,notebookLabelPixels} from './notebook.js';
export const GRAPHIC_STAGES=Object.freeze([STAGE_INDEX.projects,STAGE_INDEX.quests]);
// Lean the notebook against the project-stage pedestal in the gap to Quest Log.
export const GRAPHIC_BOARD=Object.freeze({x:GRAPHIC_STAGES[0]*STEP+5.5,y:1.35,z:3.35,tilt:-.30,scale:.78,width:NOTEBOOK_WIDTH,height:NOTEBOOK_HEIGHT});

/** Project the physical front face, reusing eight screen-coordinate floats. */
export function projectGraphicBoard(vp,width,height,out){
 const b=GRAPHIC_BOARD;
 for(let i=0;i<4;i++){
  const x=b.x+(i===0||i===3?-.5:.5)*b.width*b.scale;
  const localY=(i<2?.5:-.5)*b.height*b.scale,localZ=NOTEBOOK_FACE_Z*b.scale;
  const y=b.y+Math.cos(b.tilt)*localY-Math.sin(b.tilt)*localZ;
  const z=b.z+Math.sin(b.tilt)*localY+Math.cos(b.tilt)*localZ;
  const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
  if(w<=.1)return false;
  out[i*2]=((vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w+1)*width/2;
  out[i*2+1]=(1-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w)*height/2;
 }
 return true;
}
export function pointInGraphicBoard(quad,x,y){
 let sign=0;
 for(let i=0;i<4;i++){
  const j=(i+1)%4,cross=(quad[j*2]-quad[i*2])*(y-quad[i*2+1])-(quad[j*2+1]-quad[i*2+1])*(x-quad[i*2]);
  if(Math.abs(cross)<.0001)continue;
  if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);
 }
 return sign!==0;
}

/** Only the pixel lettering is textured. Paper, chipped edges and rings are actual geometry. */
export function createGraphicSign(){
 const canvas=document.createElement('canvas');canvas.width=NOTEBOOK_LABEL.width;canvas.height=NOTEBOOK_LABEL.height;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#141512';
 for(const [x,y] of notebookLabelPixels())ctx.fillRect(x*NOTEBOOK_LABEL.pixel,y*NOTEBOOK_LABEL.pixel,NOTEBOOK_LABEL.stroke,NOTEBOOK_LABEL.stroke);
 return canvas;
}
