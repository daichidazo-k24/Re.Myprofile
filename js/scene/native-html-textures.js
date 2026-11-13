/**
 * Chrome 157+ HTML-in-Canvas source-of-truth: real DOM lives INSIDE
 * the same <canvas content="drawable"> that draws the 3D world.
 *
 * gl.texElementSubImage2D() uploads ONLY changed 960×560 viewports.
 * Camera orbit never invalidates DOM textures. No HTML-on-top layers,
 * no stencil/foreground replay, no duplicate meshes.
 *
 * https://developer.chrome.com/docs/web-platform/html-in-canvas/webgl
 */
import {STAGES} from '../data/stages.js';
import {state} from '../state.js';
import {renderStageDocument} from '../ui/document.js';
import {registerBoard,scrollToSection} from '../ui/board-scroll.js';

export const BOARD_W=960,BOARD_H=560;
export const BOARD_COUNT=STAGES.filter(s=>s.id!=='fishing').length;
const MAX_TEXTURE_SIZE=2048;
export const isNativeHTMLCanvasAvailable=(canvas,gl)=>Boolean(
 canvas?.content==='drawable'&&
 typeof canvas.getElementImageDefaultSize==='function'&&
 typeof canvas.updateElementGeometry==='function'&&
 typeof gl?.texElementSubImage2D==='function'
);

export function project3DPoint(matrix,x,y,z,width=innerWidth,height=innerHeight){
 const w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
 if(w<=.05)return null;
 return [((matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w+1)*width/2,
         (1-(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w)*height/2];
}
/** Projective 3×3 transform: maps a DOM element box to a tilted WebGL quad. */
export function quadHomography(corners,width=BOARD_W,height=BOARD_H){
 if(!corners||corners.some(p=>!p))return null;
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=corners;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
 const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 let g=0,h=0;
 if(Math.abs(dx3)+Math.abs(dy3)>1e-7){
  const div=dx1*dy2-dx2*dy1;
  if(Math.abs(div)<1e-8)return null;
  g=(dx3*dy2-dx2*dy3)/div;
  h=(dx1*dy3-dx3*dy1)/div;
 }
 const a=(x1-x0+g*x1)/width,b=(x3-x0+h*x3)/height;
 const d=(y1-y0+g*y1)/width,e=(y3-y0+h*y3)/height;
 const values=[a,d,0,g/width,b,e,0,h/height,0,0,1,0,x0,y0,0,1];
 return values.every(Number.isFinite)?values:null;
}
/** Screen point -> DOM coordinate, accounting for the 3D perspective. */
export function unprojectQuad(matrix,x,y){
 if(!matrix)return null;
 const a=matrix[0]-x*matrix[3],b=matrix[4]-x*matrix[7];
 const c=matrix[1]-y*matrix[3],d=matrix[5]-y*matrix[7];
 const det=a*d-b*c;
 if(Math.abs(det)<1e-8)return null;
 const u=x-matrix[12],v=y-matrix[13];
 const px=(u*d-b*v)/det,py=(a*v-u*c)/det;
 const epsilon=.0001;
 return px>=-epsilon&&px<=BOARD_W+epsilon&&py>=-epsilon&&py<=BOARD_H+epsilon?
  [Math.max(0,Math.min(BOARD_W,px)),Math.max(0,Math.min(BOARD_H,py))]:null;
}

/** Pixel memory excluding driver overhead / mipmaps. */
export const estimatedTextureBytes=(n=BOARD_COUNT,w=BOARD_W,h=BOARD_H)=>n*w*h*4;

export function createNativeBoardTextures(gl,canvas){
 if(!isNativeHTMLCanvasAvailable(canvas,gl))throw new Error('HTML-in-Canvas WebGL API unavailable');
 const roots=[],textures=[],dirty=new Set(),sizes=[],projected=[];
 const stats={uploads:0,uploadedBytes:0,uploadErrors:0,paints:0,frames:0,engine:'native-html-in-canvas',lastUploadMs:0};
 let destroyed=false;
 const old=canvas.style.touchAction;
 canvas.style.touchAction='none';
 STAGES.slice(0,BOARD_COUNT).forEach((stage,i)=>{
  const element=document.createElement('div');
  element.className='hic-board-viewport board-scroll-area';
  element.dataset.stage=stage.id;
  element.id=`hic-board-${stage.id}`;
  element.setAttribute('drawable','');
  element.tabIndex=0;
  element.setAttribute('role','region');
  element.setAttribute('aria-label',`${stage.short} の連続HTML文書`);
  element.innerHTML=renderStageDocument(i);
  canvas.appendChild(element);
  roots.push(element);
  registerBoard(i,element);
  element.addEventListener('scroll',()=>dirty.add(i),{passive:true});
  const texture=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  // Until first paint, display a normal, opaque, lavender board background.
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
   new Uint8Array([174,194,225,255]));
  textures.push(texture);sizes.push([1,1]);dirty.add(i);
 });
 // The browser sends 'paint' when actual DOM descendants change. Merely
 // orbiting the camera cannot cause a new texture upload.
 const onPaint=event=>{
  stats.paints++;
  if(event.changedElements&&event.changedElements.length){
   for(const changed of event.changedElements){
    const idx=roots.indexOf(changed);
    if(idx>=0)dirty.add(idx);
   }
  }else for(let i=0;i<roots.length;i++)dirty.add(i);
 };
 canvas.addEventListener('paint',onPaint);
 const onClick=event=>{
  if(!state.focused||!state.entered||state.active>=roots.length)return;
  // The native DOM hit-test dispatches real <a> clicks. Internal anchors
  // need to scroll this board, NOT the outer document with duplicate IDs.
  const nativeAnchor=event.target?.closest?.('a[href]');
  if(nativeAnchor){
   const section=nativeAnchor.getAttribute('href');
   if(section?.startsWith('#')){event.preventDefault();scrollToSection(state.active,section)}
   return;
  }
  // Fallback hit-test if the API projected the pixels but not the link target.
  const matrix=projected[state.active];
  const pt=unprojectQuad(matrix,event.clientX,event.clientY);
  if(!pt)return;
  const root=roots[state.active];
  const anchor=findLinkAt(root,pt[0],pt[1]+root.scrollTop);
  if(!anchor)return;
  event.preventDefault();
  const href=anchor.getAttribute('href');
  if(href?.startsWith('#'))scrollToSection(state.active,href);
  else if(href)window.open(anchor.href,'_blank','noopener,noreferrer');
 };
 canvas.addEventListener('click',onClick);
 let touchY=null;
 const onTouchStart=e=>{if(state.focused&&state.entered&&e.touches.length===1)touchY=e.touches[0].clientY};
 const onTouchMove=e=>{
  if(touchY===null||!state.focused||e.touches.length!==1)return;
  const y=e.touches[0].clientY,dy=touchY-y;touchY=y;
  // Safari/older browsers don't dispatch native scrollbar input into a texture.
  e.preventDefault();roots[state.active]?.scrollBy({top:dy*1.6,behavior:'instant'});
 };
 const onTouchEnd=()=>{touchY=null};
 canvas.addEventListener('touchstart',onTouchStart,{passive:true});
 canvas.addEventListener('touchmove',onTouchMove,{passive:false});
 canvas.addEventListener('touchend',onTouchEnd,{passive:true});
 canvas.addEventListener('touchcancel',onTouchEnd,{passive:true});

 function uploadPending(limit=2){
  if(destroyed)return;
  // Active board first, then nearest other boards. Limit bursts for low-end GPUs.
  const ids=[...dirty].sort((a,b)=>Math.abs(a-state.active)-Math.abs(b-state.active));
  let updated=0;
  for(const i of ids){
   if(updated>=limit)break;
   const node=roots[i];
   try{
    const natural=canvas.getElementImageDefaultSize(node);
    const width=Math.ceil(natural.width),height=Math.ceil(natural.height);
    if(!width||!height)continue; // no layout yet: retry on the next paint
    if(width>MAX_TEXTURE_SIZE||height>MAX_TEXTURE_SIZE)throw Error(`Texture too large: ${width}x${height}`);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,textures[i]);
    // The HTML viewport is not the entire long document; GPU usage stays fixed.
    if(sizes[i][0]!==width||sizes[i][1]!==height){
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8??gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
     sizes[i]=[width,height];
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    const t0=performance.now();
    gl.texElementSubImage2D(gl.TEXTURE_2D,0,0,0,node);
    const error=gl.getError();
    if(error!==gl.NO_ERROR)throw Error(`texElementSubImage2D: WebGL error ${error}`);
    stats.lastUploadMs=performance.now()-t0;
    stats.uploads++;stats.uploadedBytes+=width*height*4;
    dirty.delete(i);updated++;
   }catch(error){
    stats.uploadErrors++;
    if(stats.uploadErrors<=3)console.warn('HTML-in-Canvas upload:',error);
    // Keep the last GOOD texture, never overwrite it with a blank screenshot.
    if(stats.uploadErrors>5)dirty.delete(i);
   }
  }
 }
 function syncGeometry(i,model,vp){
  const matrix=new Float32Array(16);
  // The render model and DOM hit-test use IDENTICAL physical board geometry.
  for(let col=0;col<4;col++)for(let row=0;row<4;row++){
   let n=0;for(let j=0;j<4;j++)n+=vp[j*4+row]*model[col*4+j];
   matrix[col*4+row]=n;
  }
  const points=[[-.5,.5,0],[.5,.5,0],[.5,-.5,0],[-.5,-.5,0]];
  const corners=points.map(p=>project3DPoint(matrix,...p));
  const h=quadHomography(corners);
  projected[i]=h;
  if(h){
   // Geometry update does NOT re-render the DOM snapshot or upload a texture.
   try{canvas.updateElementGeometry(roots[i],{canvasTransform:new DOMMatrix(h)});}
   catch(error){if(!stats.geometryWarning){stats.geometryWarning=String(error);console.warn('HTML-in-Canvas hit-testing:',error)}}
  }
 }
 function destroy(){
  destroyed=true;
  canvas.removeEventListener('paint',onPaint);canvas.removeEventListener('click',onClick);
  canvas.removeEventListener('touchstart',onTouchStart);canvas.removeEventListener('touchmove',onTouchMove);
  canvas.removeEventListener('touchend',onTouchEnd);canvas.removeEventListener('touchcancel',onTouchEnd);
  roots.forEach(node=>node.remove());textures.forEach(texture=>gl.deleteTexture(texture));
  canvas.style.touchAction=old;
 }
 return {roots,textures,dirty,stats,uploadPending,syncGeometry,destroy};
}

/** Link lookup via the actual DOM layout, not a second hidden DOM tree. */
export function findLinkAt(root,x,y){
 for(const anchor of root.querySelectorAll('a[href]')){
  let node=anchor,ax=0,ay=0;
  for(let guard=0;node&&node!==root&&guard<30;guard++){
   ax+=node.offsetLeft||0;ay+=node.offsetTop||0;
   node=node.offsetParent;
  }
  if(x>=ax&&x<=ax+anchor.offsetWidth&&y>=ay&&y<=ay+anchor.offsetHeight)return anchor;
 }
 return null;
}
