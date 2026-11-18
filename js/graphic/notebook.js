/** Code-built voxel notebook. All parts are baked into one static WebGL mesh. */
import {makeCube,hex} from '../scene/math.js';
export const NOTEBOOK_WIDTH=5.8;
export const NOTEBOOK_HEIGHT=3.5;
export const NOTEBOOK_FACE_Z=.23;
export const NOTEBOOK_LABEL=Object.freeze({width:489,height:69,pixel:6,stroke:9,worldWidth:4.65,worldHeight:4.65*69/489,y:-.25,z:.255});
const PIXEL=NOTEBOOK_WIDTH/100;
const INK='#141512',PAPER='#f8e8ce';

// A chipped silhouette in a 100 x 50 pixel grid; no random changes between loads.
function paperCell(x,y){
 const left=y<2?4:y<4?2:y>47?3:0;
 const right=y<2?96:y>47?97:100;
 if(x<left||x>=right)return false;
 return !((x<2&&y>=26&&y<=28)||(x>=98&&y>=14&&y<=17)||
  (y>=48&&x>=44&&x<=47)||(y===0&&x>=76&&x<=79));
}
export function createNotebookParts(){
 const parts=[];
 const box=(x,y,z,w,h,d,color)=>parts.push({x,y,z,w,h,d,color});
 const strips=new Map();
 const strip=(x,y,z,w,h,d,color)=>{
  const key=`${x}:${w}:${z}:${color}`,prior=strips.get(key);
  if(prior&&Math.abs(prior.y-prior.h/2-(y+h/2))<1e-8){
   const top=prior.y+prior.h/2;prior.h+=h;prior.y=top-prior.h/2;
  }else{box(x,y,z,w,h,d,color);strips.set(key,parts.at(-1))}
 };
 // Merge equal pixels into horizontal strips, including the outline and exposed paper edge.
 for(let row=0;row<50;row++){
  let start=0,last=null;
  const colorAt=col=>{
   if(col===100||!paperCell(col,row))return null;
   return !paperCell(col-1,row)||!paperCell(col+1,row)||row===0||row===49||
    !paperCell(col,row-1)||!paperCell(col,row+1)?INK:PAPER;
  };
  for(let col=0;col<=100;col++){
   const color=colorAt(col);
   if(color===last)continue;
   if(last){
    const x=((start+col)/2-50)*PIXEL,y=(24-row)*PIXEL-.12,w=(col-start)*PIXEL;
    strip(x+.045,y-.055,-.08,w,PIXEL,.24,'#6f391d');
    strip(x+.025,y-.025,.055,w,PIXEL,.12,'#b76a32');
    strip(x,y,.17,w,PIXEL,.12,last);
   }
   start=col;last=color;
  }
 }
 // Small ink chips inside the corners, as in a weathered pixel-art sketchbook.
 for(const [x,y,w,h] of [[-2.64,1.13,.16,.12],[-2.70,1.04,.12,.15],[-2.53,.91,.055,.055],
  [2.57,1.12,.13,.18],[2.67,.99,.07,.18],[2.55,.77,.06,.06],
  [-2.65,-1.34,.13,.10],[-2.52,-1.39,.18,.06],[2.68,-.83,.10,.07]])box(x,y,.237,w,h,.014,INK);
 // Eight stepped metal loops. Each is a connected 3D path with an empty centre.
 for(let i=0;i<8;i++){
  const x=-2.24+i*.64;
  box(x+.035,1.13,.245,.19,.16,.06,INK);
  box(x+.035,1.14,.282,.105,.08,.025,'#e89c28');
  const segments=[[-.06,1.42,.31,.10,.42,.10],[.015,1.66,.26,.25,.10,.20],
   [.125,1.56,.13,.09,.24,.14],[.125,1.38,.02,.09,.18,.14],
   [.045,1.24,.12,.24,.10,.30],[-.06,1.23,.25,.10,.18,.10]];
  for(const [dx,y,z,w,h,d] of segments){
   box(x+dx,y,z,w+.055,h+.055,d+.035,INK);
   box(x+dx-.008,y+.01,z+.026,w*.62,h*.82,d,'#bfc2bf');
  }
  box(x-.077,1.45,.398,.025,.31,.012,'#f1f0e9');
 }
 return parts;
}

export function createNotebookMesh(){
 const cube=makeCube(),out=[];
 for(const p of createNotebookParts()){
  const color=hex(p.color);
  for(let i=0;i<cube.length;i+=11)out.push(cube[i]*p.w+p.x,cube[i+1]*p.h+p.y,cube[i+2]*p.d+p.z,
   cube[i+3],cube[i+4],cube[i+5],cube[i+6],cube[i+7],...color);
 }
 return new Float32Array(out);
}

// Seven-column katakana glyphs: the label is deterministic, independent of installed fonts.
const GLYPHS={
 'ク':['0011110','0010010','0100010','1000100','0000100','0001000','0010000','0100000','0000000'],
 'ラ':['0111110','0000000','1111111','0000001','0000010','0000100','0001000','0110000','0000000'],
 'フ':['1111111','0000001','0000001','0000010','0000100','0001000','0110000','0000000','0000000'],
 'ィ':['0000000','0000000','0000010','0000100','0001000','0011000','0101000','0001000','0001000'],
 'ッ':['0000000','0000000','0000000','1010001','1010001','0000010','0000010','0000100','0011000'],
 'ホ':['0001000','0001000','1111111','0001000','0101010','0101010','1001001','1001001','0011000'],
 'ー':['0000000','0000000','0000000','1111111','1111111','0000000','0000000','0000000','0000000'],
 'ト':['1000000','1000000','1000000','1110000','1001100','1000010','1000000','1000000','1000000'],
};
export function notebookLabelPixels(){
 const out=[];
 for(const [index,char] of [...'グラフィックボード'].entries()){
  const base=char==='グ'?'ク':char==='ボ'?'ホ':char==='ド'?'ト':char;
  GLYPHS[base].forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1')out.push([index*9+x,y+2])}));
  if(['グ','ボ','ド'].includes(char))out.push([index*9+5,0],[index*9+6,1],[index*9+7,0],[index*9+8,1]);
 }
 return out;
}

/** Same code-built artwork for the existing CSS3D renderer, with no new asset dependency. */
export function createNotebookFallback(){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const scale=100;
 for(const p of createNotebookParts().sort((a,b)=>(a.z+a.d/2)-(b.z+b.d/2))){
  ctx.fillStyle=p.color;ctx.fillRect(320+(p.x-p.w/2)*scale,185-(p.y+p.h/2)*scale,p.w*scale,p.h*scale);
 }
 ctx.fillStyle=INK;
 const label=NOTEBOOK_LABEL,s=label.worldWidth*scale/label.width;
 for(const [x,y] of notebookLabelPixels())ctx.fillRect(320-label.worldWidth*scale/2+x*label.pixel*s,
  185-(label.y+label.worldHeight/2)*scale+y*label.pixel*s,label.stroke*s,label.stroke*s);
 return canvas;
}
