import test from 'node:test';
import assert from 'node:assert/strict';
import {isNativeHTMLCanvasAvailable,createNativeBoardTextures,
 BOARD_COUNT,estimatedTextureBytes,quadHomography,unprojectQuad} from '../js/scene/native-html-textures.js';

const makeFake=()=>{
 const children=[],listeners={};
 const canvas={content:'drawable',style:{touchAction:'none'},
  getElementImageDefaultSize:()=>({width:960,height:560}),updateElementGeometry(){},
  addEventListener(name,fn){listeners[name]=fn},removeEventListener(name){delete listeners[name]},
  appendChild(node){children.push(node)}};
 const gl={TEXTURE_2D:3553,TEXTURE0:33984,TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,
  TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,CLAMP_TO_EDGE:33071,LINEAR:9729,
  RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,NO_ERROR:0,
  createTexture(){return{}},bindTexture(){},texParameteri(){},texImage2D(){},activeTexture(){},
  pixelStorei(){},texElementSubImage2D(){this.uploads++},getError(){return 0},
  deleteTexture(){},uploads:0};
 return {canvas,gl,children,listeners};
};
test('native Chrome feature detection does not mistake an ordinary canvas for HTML-in-Canvas',()=>{
 const {canvas,gl}=makeFake();assert.ok(isNativeHTMLCanvasAvailable(canvas,gl));
 assert.equal(isNativeHTMLCanvasAvailable({...canvas,content:''},gl),false);
 assert.equal(isNativeHTMLCanvasAvailable(canvas,{...gl,texElementSubImage2D:null}),false);
 assert.equal(estimatedTextureBytes(),BOARD_COUNT*960*560*4);
 assert.ok(estimatedTextureBytes()<11*1024*1024);
});

test('paint and scroll trigger uploads; changing camera geometry does NOT reupload the HTML',()=>{
 const prior=globalThis.document,priorDOM=globalThis.DOMMatrix,priorWidth=globalThis.innerWidth,priorHeight=globalThis.innerHeight;
 globalThis.innerWidth=1440;globalThis.innerHeight=900;
 const {canvas,gl,children,listeners}=makeFake();
 globalThis.document={createElement(){return {
  style:{},dataset:{},scrollTop:0,scrollHeight:4000,clientHeight:560,
  addEventListener(name,cb){(this.listeners??={})[name]=cb},removeEventListener(){},
  setAttribute(){},remove(){},classList:{contains(){return false}},
  querySelectorAll(){return[]}
 }}};
 globalThis.DOMMatrix=class{constructor(a){this.matrix=a}};
 try{
  const boards=createNativeBoardTextures(gl,canvas);
  assert.equal(children.length,5);
  assert.ok(children.every(n=>n.getAttribute===undefined||n.scrollHeight>n.clientHeight));
  boards.uploadPending(2);boards.uploadPending(2);boards.uploadPending(2);
  assert.equal(gl.uploads,5);assert.equal(boards.stats.uploadedBytes,5*960*560*4);
  boards.uploadPending(5);assert.equal(gl.uploads,5,'idle world does not reupload');
  const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  boards.syncGeometry(0,matrix,matrix);
  boards.uploadPending(5);assert.equal(gl.uploads,5,'orbit does not reupload');
  listeners.paint({changedElements:[children[0]]});
  boards.uploadPending(5);assert.equal(gl.uploads,6,'changed document uploads just once');
  children[2].listeners.scroll();boards.uploadPending(5);assert.equal(gl.uploads,7,'scroll uploads only active texture');
  boards.destroy();assert.equal(Object.keys(listeners).length,0);
 }finally{globalThis.document=prior;globalThis.DOMMatrix=priorDOM;globalThis.innerWidth=priorWidth;globalThis.innerHeight=priorHeight;}
});

test('all four 3D projected corners map back to the same document coordinates',()=>{
 const quad=[[110,75],[930,120],[812,612],[80,535]];
 const matrix=quadHomography(quad);
 for(const [[px,py],[x,y]] of [
  [[0,0],quad[0]],[[960,0],quad[1]],[[960,560],quad[2]],[[0,560],quad[3]]]){
  const inverse=unprojectQuad(matrix,x,y);
  assert.ok(inverse&&Math.abs(inverse[0]-px)<1e-5&&Math.abs(inverse[1]-py)<1e-5);
 }
 assert.equal(unprojectQuad(matrix,-10000,-10000),null);
});
