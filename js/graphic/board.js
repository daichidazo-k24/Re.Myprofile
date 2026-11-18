import {STAGES,STEP} from '../data/stages.js';
import {NOTEBOOK_WIDTH,NOTEBOOK_HEIGHT,NOTEBOOK_FACE_Z,NOTEBOOK_LABEL,notebookLabelPixels} from './notebook.js';
export const GRAPHIC_STAGES=Object.freeze(['profile','skills'].map(id=>STAGES.findIndex(s=>s.id===id)));
export const GRAPHIC_BOARD=Object.freeze({x:(GRAPHIC_STAGES[0]+GRAPHIC_STAGES[1])*STEP/2,y:8.5,z:-10,width:NOTEBOOK_WIDTH,height:NOTEBOOK_HEIGHT});

/** Project the physical front face, reusing eight screen-coordinate floats. */
export function projectGraphicBoard(vp,width,height,out){
 const b=GRAPHIC_BOARD;
 for(let i=0;i<4;i++){
  const x=b.x+(i===0||i===3?-.5:.5)*b.width,y=b.y+(i<2?.5:-.5)*b.height,z=b.z+NOTEBOOK_FACE_Z;
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
