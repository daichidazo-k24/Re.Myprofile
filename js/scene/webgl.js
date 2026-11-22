/** Raw WebGL scene: geometry, shaders, fog, lighting, camera and DOM-textured boards. */
import {M,seeded,hex,makeCube,makePlane} from './math.js';
import {STAGES,STEP} from '../data/stages.js';
import {boardProgress} from '../ui/board-scroll.js';
import {createNativeBoardTextures,isNativeHTMLCanvasAvailable} from './native-html-textures.js';
import {drawFishingWorld,FISH_WORLD} from '../fishing/scene.js';
import {fishingState} from '../fishing/state.js';
import {positionFishingHotspot} from '../fishing/ui.js';
import {loadMinerWalkFrames,minerModel,minerWalkModel,minerWalkPose} from './miner-pose.js';
import {worldCameraPose,telescopeFov} from '../ui/orbit-camera.js';
import {createSkyRenderer} from './sky.js';
import {createSkyBackground} from './sky-background.js';
import {createPlanetarium} from './planetarium.js';
import {createSkyCamera,updateSkyCamera} from './sky-camera.js';
import {GRAPHIC_BOARD,createGraphicSign} from '../graphic/board.js';
import {syncGraphicBoard} from '../graphic/ui.js';
import {createNotebookMesh,NOTEBOOK_LABEL} from '../graphic/notebook.js';
import {drawObservatory,updateObservatory} from './observatory.js';
import {isObservatoryApproach} from './observatory-layout.js';
import {syncObservatoryUI,positionObservatoryHotspots} from '../ui/observatory.js';
import {buildIslandLandscape,islandTreePlanes} from './island-landscape.js';
import {createIslandTreeAtlas} from './island-trees.js';
import {FRUIT_GLOW,collectFruitShadows,createFruitGlow,fruitLights,islandFaceLight,rasterIslandFace} from './island-lighting.js';
import {createFrostSprite,frostFlakes,frostPose,showIslandFrost} from './island-frost.js';

export function startWebGL(state,onPageChange){
 const glCanvas=document.getElementById('worldCanvas');
 const gl=glCanvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance'})||glCanvas.getContext('webgl',{alpha:false,antialias:true,depth:true});
 // No overlay / double-render workaround: only the native HTML-in-Canvas route
 // can run the WebGL stage. Unsupported browsers use the CSS3D fallback.
 if(!gl||!isNativeHTMLCanvasAvailable(glCanvas,gl))return null;
 let program,cubeMesh,planeMesh,terrainMesh,loc={},whiteTex,minerTex,climbTextures=[null,null],titleTextures=[],htmlBoards=null;
 let lastTs=0,introZoom=30,running=true,sky=null,background=null,planetarium=null,graphicTex=null,graphicMesh=null;
 let fruitGlowTex,frostTex,frostMesh,treeTex,treeMesh,frostTime=0;
 const walkTextures=[];
 const spritePlane=makePlane();
 const frostData=new Float32Array(frostFlakes.length*spritePlane.length),frostPosition=new Float32Array(4);
 const propShadows=new Map();
 const skyCamera=createSkyCamera();
 const graphicModel=M.model(GRAPHIC_BOARD.x,GRAPHIC_BOARD.y,GRAPHIC_BOARD.z,GRAPHIC_BOARD.scale,GRAPHIC_BOARD.scale,GRAPHIC_BOARD.scale,0,GRAPHIC_BOARD.tilt);
 const graphicLabelModel=M.mul(graphicModel,M.model(0,NOTEBOOK_LABEL.y,NOTEBOOK_LABEL.z,NOTEBOOK_LABEL.worldWidth,NOTEBOOK_LABEL.worldHeight,1));
 const time0=performance.now();
 const vertexShader=`attribute vec3 aPos;attribute vec3 aNorm;attribute vec2 aUv;attribute vec3 aCol;uniform mat4 uModel;uniform mat4 uVP;varying vec2 vUv;varying vec3 vCol;varying float vBright;varying vec3 vPos;void main(){vec4 p=uModel*vec4(aPos,1.);vPos=p.xyz;vUv=aUv;vCol=aCol;vec3 n=normalize(mat3(uModel)*aNorm);vBright=.7+.3*max(0.,dot(n,normalize(vec3(-.25,.82,.6))));gl_Position=uVP*p;}`;
 const fragmentShader=`precision mediump float;varying vec2 vUv;varying vec3 vCol;varying float vBright;varying vec3 vPos;uniform vec4 uColor;uniform sampler2D uTex;uniform float uUseTex;uniform float uUnlit;uniform float uFog;uniform vec3 uEye;void main(){vec4 s=mix(vec4(1.),texture2D(uTex,vUv),uUseTex);if(s.a<.02)discard;vec3 rgb=s.rgb*vCol*uColor.rgb*mix(vBright,1.,uUnlit);float d=length(vPos-uEye);float f=smoothstep(15.,65.,d)*uFog;rgb=mix(rgb,vec3(.025,.065,.14),f);gl_FragColor=vec4(rgb,s.a*uColor.a);}`;
 function compile(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
 function mesh(array){const v=new Float32Array(array),b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);return{buffer:b,count:v.length/11}}
 function texFromCanvas(c,filter=gl.LINEAR){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
 function setupGl(){
  const vs=compile(gl,gl.VERTEX_SHADER,vertexShader),fs=compile(gl,gl.FRAGMENT_SHADER,fragmentShader);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  loc={aPos:gl.getAttribLocation(program,'aPos'),aNorm:gl.getAttribLocation(program,'aNorm'),aUv:gl.getAttribLocation(program,'aUv'),aCol:gl.getAttribLocation(program,'aCol'),uModel:gl.getUniformLocation(program,'uModel'),uVP:gl.getUniformLocation(program,'uVP'),uColor:gl.getUniformLocation(program,'uColor'),uTex:gl.getUniformLocation(program,'uTex'),uUseTex:gl.getUniformLocation(program,'uUseTex'),uUnlit:gl.getUniformLocation(program,'uUnlit'),uFog:gl.getUniformLocation(program,'uFog'),uEye:gl.getUniformLocation(program,'uEye')};
  cubeMesh=mesh(makeCube());planeMesh=mesh(spritePlane);
  const white=document.createElement('canvas');white.width=white.height=2;const c=white.getContext('2d');c.fillStyle='white';c.fillRect(0,0,2,2);whiteTex=texFromCanvas(white);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1i(loc.uTex,0);
  terrainMesh=mesh(buildTerrain());
  const trees=islandTreePlanes();
  const treeAtlas=createIslandTreeAtlas(trees);
  treeTex=texFromCanvas(treeAtlas.canvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  treeMesh=mesh(buildTreePlanes(trees,treeAtlas));
  fruitGlowTex=texFromCanvas(createFruitGlow());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  frostTex=texFromCanvas(createFrostSprite());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  frostMesh={buffer:gl.createBuffer(),count:0};
  gl.bindBuffer(gl.ARRAY_BUFFER,frostMesh.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,frostData.byteLength,gl.DYNAMIC_DRAW);
  graphicTex=texFromCanvas(createGraphicSign());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  graphicMesh=mesh(createNotebookMesh());
  const miner=new Image();miner.onload=()=>{try{minerTex=texFromCanvas(miner)}catch(error){console.warn('Miner texture:',error)}};
  miner.src=new URL('../../assets/miner.png',import.meta.url).href;
  loadMinerWalkFrames((canvas,index)=>{
   if(!running)return;
   try{walkTextures[index]=texFromCanvas(canvas,gl.NEAREST)}
   catch(error){console.warn('Walking sprite:',error)}
  });
  ['sub1.png','sub2.png'].forEach((name,index)=>{
   const image=new Image();
   image.onload=()=>{try{
    const texture=texFromCanvas(image);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    climbTextures[index]=texture;
   }catch(error){console.warn('Climbing sprite:',error)}};
   image.src=new URL('../../assets/'+name,import.meta.url).href;
  });
  titleTextures=STAGES.filter(s=>s.id!=='fishing').map(stage=>{
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=86;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='#050b1c';ctx.fillRect(16,10,696,68);
   ctx.fillStyle='#152341';ctx.fillRect(12,5,696,68);
   ctx.strokeStyle='#b4c7e9';ctx.lineWidth=3;ctx.strokeRect(12.5,5.5,695,67);
   ctx.fillStyle='#b4c7e9';ctx.beginPath();ctx.moveTo(346,73);ctx.lineTo(360,85);ctx.lineTo(374,73);ctx.fill();
   ctx.font='bold 28px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f3f6ff';
   ctx.fillText(stage.boardHeading,360,39,664);
   return texFromCanvas(canvas);
  });
 }
function buildTerrain(){
 const vertices=[],cube=makeCube(),cuboids=[];
 const emit=(...cuboid)=>cuboids.push(cuboid);
 buildIslandLandscape(emit);
 const shadows=collectFruitShadows(cuboids);
 function emitLitFace(center,u,v,normal,{columns,rows,colors}){
  const sameColor=(a,b)=>colors[a]===colors[b]&&colors[a+1]===colors[b+1]&&colors[a+2]===colors[b+2];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;){
   const offset=(row*columns+col)*3;
   let end=col+1;
   while(end<columns&&sameColor(offset,(row*columns+end)*3))end++;
   const left=col/columns-.5,right=end/columns-.5,bottom=row/rows-.5,top=(row+1)/rows-.5;
   const light=[colors[offset]/255,colors[offset+1]/255,colors[offset+2]/255];
   for(const [a,b] of [[left,bottom],[right,bottom],[right,top],[left,bottom],[right,top],[left,top]]){
    vertices.push(center[0]+a*u[0]+b*v[0],center[1]+a*u[1]+b*v[1],center[2]+a*u[2]+b*v[2],...normal,0,0,...light);
   }
   col=end;
  }
 }
 for(const [x,y,z,width,height,depth,color,emissive] of cuboids){
  const rgb=hex(color);
  const dimensions=[width,height,depth];
  const faceSize=6*11;
  for(let face=0;face<cube.length;face+=faceSize){
   const nx=cube[face+3],ny=cube[face+4],nz=cube[face+5];
   const normal=[nx,ny,nz],center=[x+nx*width/2,y+ny*height/2,z+nz*depth/2];
   const u=dimensions.map((size,i)=>size*(cube[face+11+i]-cube[face+i]));
   const v=dimensions.map((size,i)=>size*(cube[face+22+i]-cube[face+11+i]));
   const field=rasterIslandFace(rgb,center,u,v,normal,emissive,shadows);
   if(field){emitLitFace(center,u,v,normal,field);continue}
   const lit=islandFaceLight(rgb,...center,nx,ny,nz,emissive,shadows);
   for(let k=face;k<face+faceSize;k+=11){
    vertices.push(cube[k]*width+x,cube[k+1]*height+y,cube[k+2]*depth+z,...cube.slice(k+3,k+8),...lit);
   }
  }
 }
 return vertices;
}
function buildTreePlanes(trees,atlas){
 const vertices=[];
 const {width,height}=atlas.canvas;
 for(const tree of trees){
  const frame=atlas.frame(tree),sin=Math.sin(tree.yaw),cos=Math.cos(tree.yaw);
  for(let k=0;k<spritePlane.length;k+=11){
   const u=spritePlane[k]*tree.width,v=spritePlane[k+1]*tree.height;
   const tx=(frame.x+.01+spritePlane[k+6]*(frame.width-.02))/width;
   const ty=1-(frame.y+.01+(1-spritePlane[k+7])*(frame.height-.02))/height;
   vertices.push(tree.x+cos*u,tree.y+v,tree.z-sin*u,sin,0,cos,tx,ty,1,1,1);
  }
 }
 return vertices;
}
function draw(mesh_,model,color='#fff',tex=whiteTex,unlit=0,fog=1){gl.bindBuffer(gl.ARRAY_BUFFER,mesh_.buffer);const stride=44;for(const [name,size,offs] of [['aPos',3,0],['aNorm',3,12],['aUv',2,24],['aCol',3,32]]){const l=loc[name];gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,offs)}gl.uniformMatrix4fv(loc.uModel,false,model);const v=hex(color);gl.uniform4f(loc.uColor,v[0],v[1],v[2],1);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex||whiteTex);gl.uniform1f(loc.uUseTex,tex&&tex!==whiteTex?1:0);gl.uniform1f(loc.uUnlit,unlit);gl.uniform1f(loc.uFog,fog);gl.drawArrays(gl.TRIANGLES,0,mesh_.count)}
function box(x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0){draw(cubeMesh,M.model(x,y,z,sx,sy,sz,ry,rx,rz),color)}
function quad(x,y,z,w,h,color,tex,ry=0,rx=0,rz=0){draw(planeMesh,M.model(x,y,z,w,h,1,ry,rx,rz),color,tex,1,0)}
function sceneryBox(x,y,z,w,h,d,color,...rotation){
 if(!propShadows.has(color)){
  const [r,g,b]=hex(color);
  const dim=[r*.40+.024,g*.44+.029,b*.53+.048];
  propShadows.set(color,'#'+dim.map(n=>Math.round(n*255).toString(16).padStart(2,'0')).join(''));
 }
 box(x,y,z,w,h,d,propShadows.get(color),...rotation);
}
function drawFrost(cameraX){
 let offset=0;
 for(const flake of frostFlakes){
  if(Math.abs(flake.x-cameraX)>22)continue;
  frostPose(flake,frostTime,frostPosition);
  const [x,y,z,size]=frostPosition;
  if(size<.018)continue;
  for(let k=0;k<spritePlane.length;k+=11){
   frostData[offset++]=x+spritePlane[k]*size;
   frostData[offset++]=y+spritePlane[k+1]*size;
   frostData[offset++]=z;
   frostData[offset++]=0;frostData[offset++]=0;frostData[offset++]=1;
   frostData[offset++]=spritePlane[k+6];frostData[offset++]=spritePlane[k+7];
   frostData[offset++]=flake.tint;frostData[offset++]=flake.tint;frostData[offset++]=flake.tint;
  }
 }
 if(!offset)return;
 frostMesh.count=offset/11;
 gl.bindBuffer(gl.ARRAY_BUFFER,frostMesh.buffer);
 gl.bufferSubData(gl.ARRAY_BUFFER,0,frostData.subarray(0,offset));
 draw(frostMesh,M.id(),'#ffffff',frostTex,1,0);
}
function drawForestEffects(cameraX,dt){
 // Test both effects against opaque scenery without obscuring other transparent pixels.
 gl.useProgram(program);
 gl.depthMask(false);
 for(const [x,y,z] of fruitLights){
  if(Math.abs(x-cameraX)>25)continue;
  quad(x,y,z+FRUIT_GLOW.offsetZ,FRUIT_GLOW.width,FRUIT_GLOW.height,'#ffffff',fruitGlowTex);
 }
 if(showIslandFrost(state)){
  if(!state.reduceMotion)frostTime+=dt;
  drawFrost(cameraX);
 }
 gl.depthMask(true);
}
function destroyForestEffects(){
 for(const texture of [fruitGlowTex,frostTex,treeTex])if(texture)gl.deleteTexture(texture);
 if(frostMesh)gl.deleteBuffer(frostMesh.buffer);
 if(treeMesh)gl.deleteBuffer(treeMesh.buffer);
}
function board(i,t){const x=i*STEP,hover=Math.sin(t*1.4+i*.65)*.055,rot=.03*Math.sin(t*.45+i),z=-1.55;
 // cast shadow, mechanical depth and stepped rear shell
 box(x,3.08+hover,z-.20,9.38,5.85,.55,'#182548',rot);
 box(x,3.08+hover,z-.01,9.04,5.50,.26,'#3d4f97',rot);
 box(x,3.08+hover,z+.12,8.78,5.27,.18,'#9fbee7',rot);
 quad(x,3.08+hover,z+.223,8.51,4.98,'#ffffff',htmlBoards?.textures[i]??whiteTex,rot);
 // Title is itself a fixed, physically located 3D plane (not a billboard).
 quad(x,3.08+hover+2.49+.56,z+.223+.13,6.65,.74,'#ffffff',titleTextures[i],rot);
 // physical metal frame: edge strips, bolts
 box(x,5.68+hover,z+.22,9.34,.17,.19,'#c0d5e6',rot);box(x, .50+hover,z+.22,9.34,.19,.19,'#3d4f97',rot);
 box(x-4.60,3.08+hover,z+.22,.14,5.27,.18,'#b3c8ee',rot);box(x+4.60,3.08+hover,z+.22,.14,5.27,.18,'#263e79',rot);
 box(x-3.95,5.72+hover,z+.30,.65,.15,.18,STAGES[i].color);box(x-3.06,5.72+hover,z+.30,.65,.15,.18,'#4666a0');box(x+4.07,5.72+hover,z+.31,.36,.2,.2,'#f68d1f');
 // Mechanical scroll rail: travel is independent for each stage.
 const pct=boardProgress(i),trackY=3.08+hover,knobY=trackY+1.85-3.7*pct;
 box(x+4.49,trackY,z+.47,.095,3.92,.17,'#202e52',rot);
 box(x+4.49,knobY,z+.58,.16,.38,.24,i===state.active?'#ffc46b':'#8aa2cc',rot);
 // thick wall console leg, floating ledge
 box(x, .17,z-.85,2.7,1.0,1.5,'#202e52');box(x,.76,z+.18,7.8,.2,.8,'#1a315a');box(x, .88,z+.42,2.7,.19,.28,'#f68d1f');
}
function drawVoxelMiner(i,t,walk){const box=sceneryBox,x=i*STEP-5.75;box(x,.30,2.3,2.35,.6,2.3,'#2b3962');box(x,.66,2.3,1.95,.18,1.95,'#6f85b3');box(x, .84,2.3,1.18,.18,1.2,'#e68b29');if(minerTex&&!walk)draw(planeMesh,minerModel(i,t),'#ffffff',minerTex,1,0)
 for(let j=0;j<5;j++){const zz=-3.5+j*1.5;box(x-1.5+.3*Math.sin(t+j),1.25+seeded(j,i),zz,.35,.35,.35,j%2?'#f6ac45':'#81a8ef',t*(.3+j*.1))}}
function drawStageProps(i,t,walk){const box=sceneryBox,x=i*STEP,fx=x+5.5,stage=STAGES[i];
 if(i===state.active&&!state.atLadder)drawVoxelMiner(i,t,walk);
 if(stage.id==='profile'){
  box(fx,.45,1.2,1.55,1.1,1.55,'#2c416c');
  box(fx,1.3,1.2,1,1,1,'#f68d1f',t*.8);
  box(fx,1.3,1.2,.5,.5,1.1,'#b8dbfa',t*.8);
  return;
 }
 if(stage.id==='projects'){box(fx,1.03,1.2,3.4,1.1,3.2,'#2e406a');box(fx,2.18+Math.sin(t*.9)*.17,1.2,1.7,1.7,1.7,'#415e9a',t*.42);box(fx,2.2+Math.sin(t*.9)*.17,2.1,1.08,1.1,.15,'#ecab37',t*.42);box(fx,2.22+Math.sin(t*.9)*.17,2.22,.32,.35,.19,'#d4e3fc',t*.42);}
 if(stage.id==='quests'){for(let j=0;j<5;j++){const px=x+4.5+j*.53;const pz=2.8-j*.6;let h=.9+j*.4;if(isObservatoryApproach(px,pz))continue;box(px,h*.5,pz,.4,h,.4,j<3?'#314e85':'#f1a33e');box(px,h+.16,pz,.52,.18,.52,'#a9c2e8')}}
 // Decorative crystals sit in the same shadow as the surrounding forest.
 for(let j=0;j<4;j++){const sign=j%2?-1:1;const px=x+sign*(7.05+((j>>1)*.8)),pz=(j>>1)*3.4-3.3;if(isObservatoryApproach(px,pz))continue;box(px,1.45+Math.sin(t+j)*.14,pz,.36,.72,.36,STAGES[i].color,t*.3+j*.6,.2);box(px,.6,pz,.55,1.15,.55,'#263d64')}
}

 function viewport(){
  // Scale both axes together: separate caps stretch a round dome on tall/wide screens.
  const dpr=Math.min(devicePixelRatio||1,1.5,1800/innerWidth,1100/innerHeight);
  const w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));
  if(glCanvas.width!==w||glCanvas.height!==h){glCanvas.width=w;glCanvas.height=h}
  gl.viewport(0,0,w,h);return w/h;
 }
 function frame(ts){
  if(!running)return;const dt=Math.min(.045,(ts-lastTs)/1000||.016);lastTs=ts;
  const t=(ts-time0)/1000,ratio=viewport();
  updateObservatory(dt);syncObservatoryUI();
  gl.clearColor(.025,.059,.125,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const responsiveness=state.reduceMotion?1:Math.min(1,dt*3.3);
  state.cameraX+=(state.aim-state.cameraX)*responsiveness;
  state.focusMix+=((state.focused?1:0)-state.focusMix)*Math.min(1,dt*4.5);
  if(state.entered){introZoom+=(15.3-introZoom)*Math.min(1,dt*1.3)}else introZoom=29;
  const cameraX=state.cameraX,focusMix=state.focusMix;
  // The world camera really orbits around the selected 3D stage. Drag controls
  // yaw/pitch; touchpad wheel changes the orbit, pinch/zoom controls distance.
  // The floor and the boards stay in world space while the camera moves.
  const worldPose=worldCameraPose(cameraX);
  const targetDistance=innerWidth<680?Math.max(15,28*(innerHeight/850)):8.15;
  const focusEye=[cameraX+.18,4.09,targetDistance];
  const focusTarget=[cameraX,3.65,-1.55];
  const eye=worldPose.eye.map((v,i)=>v*(1-focusMix)+focusEye[i]*focusMix);
  const look=worldPose.target.map((v,i)=>v*(1-focusMix)+focusTarget[i]*focusMix);
  const fov=state.observatoryPhase==='viewing'?telescopeFov():((innerWidth<750?67:56)*(1-focusMix)+40*focusMix)*Math.PI/180;
  const vWorld=M.mul(M.persp(fov,ratio,.1,120),M.look(eye,look));
  updateSkyCamera(skyCamera,eye,look,fov,ratio);
  gl.useProgram(program);gl.uniformMatrix4fv(loc.uVP,false,vWorld);gl.uniform3fv(loc.uEye,eye);
  htmlBoards.uploadPending(2);htmlBoards.stats.frames++;
  if(htmlBoards.stats.uploadErrors>=6 || (ts-time0>6500 && htmlBoards.stats.uploads===0)){
   running=false;
   document.dispatchEvent(new CustomEvent('quest:native-failed',{detail:{reason:'HTML-in-Canvas texture upload unavailable'}}));
   return;
  }
  draw(terrainMesh,M.id(),'#ffffff',whiteTex,1);
  draw(treeMesh,M.id(),'#ffffff',treeTex,1);
  drawObservatory({box:sceneryBox,quad},minerTex,climbTextures,t);
  positionObservatoryHotspots(pos=>{
   const w=vWorld[3]*pos[0]+vWorld[7]*pos[1]+vWorld[11]*pos[2]+vWorld[15];
   if(w<=.05)return null;
   return {x:((vWorld[0]*pos[0]+vWorld[4]*pos[1]+vWorld[8]*pos[2]+vWorld[12])/w+1)*innerWidth/2,
    y:(1-(vWorld[1]*pos[0]+vWorld[5]*pos[1]+vWorld[9]*pos[2]+vWorld[13])/w)*innerHeight/2};
  });
  const walk=walkTextures[0]&&walkTextures[1]&&minerWalkPose(state,t);
  for(let i=0;i<STAGES.length;i++){if(Math.abs(i*STEP-cameraX)>28)continue;if(STAGES[i].id==='fishing'){drawFishingWorld({box},t)}else{board(i,t);drawStageProps(i,t,walk)}}
  if(walk)draw(planeMesh,minerWalkModel(walk),'#ffffff',walkTextures[walk.frame],1,0);
  const g=GRAPHIC_BOARD;
  if(Math.abs(g.x-cameraX)<28){
   draw(graphicMesh,graphicModel,'#ffffff',whiteTex,.65,0);
   draw(planeMesh,graphicLabelModel,'#ffffff',graphicTex,1,0);
  }
  syncGraphicBoard(vWorld,innerWidth,innerHeight,eye);
  background?.draw(state,dt,glCanvas.width,glCanvas.height,skyCamera);
  planetarium?.draw(state,dt,glCanvas.width,glCanvas.height,skyCamera,innerHeight);
  sky?.draw(vWorld,state,t,dt,glCanvas.width,glCanvas.height,innerHeight);
  drawForestEffects(cameraX,dt);
  // Sync hit-testing geometry without re-uploading DOM pixels during orbit.
  for(let i=0;i<STAGES.length-1;i++){
   if(Math.abs(i*STEP-cameraX)>28)continue;
   const hover=Math.sin(t*1.4+i*.65)*.055,rot=.03*Math.sin(t*.45+i);
   const model=M.model(i*STEP,3.08+hover,-1.55+.223,8.51,4.98,1,rot);
   htmlBoards.syncGeometry(i,model,vWorld);
  }
  // The hardware depth test establishes front/back in the shared scene.
  if(state.entered&&STAGES[state.active].id==='fishing'){
   const p=fishingState.phase==='reeling'?Math.min(1,(performance.now()-fishingState.castingAt)/1220):0;
   const pos=[FISH_WORLD.hookX,FISH_WORLD.hookY+Math.sin(t*2.8)*.14+3.6*p,FISH_WORLD.hookZ];
   const w=vWorld[3]*pos[0]+vWorld[7]*pos[1]+vWorld[11]*pos[2]+vWorld[15];
   if(w>.05){const px=(vWorld[0]*pos[0]+vWorld[4]*pos[1]+vWorld[8]*pos[2]+vWorld[12])/w;
    const py=(vWorld[1]*pos[0]+vWorld[5]*pos[1]+vWorld[9]*pos[2]+vWorld[13])/w;
    positionFishingHotspot((px+1)*innerWidth/2,(1-py)*innerHeight/2+40);}
  }
  requestAnimationFrame(frame)
 }
 try{
  setupGl();
  // Optional decoration failure must not disable the native HTML-in-Canvas engine.
  try{sky=createSkyRenderer(gl,state.miningSky)}catch(error){console.warn('Sky effects unavailable:',error)}
  try{background=createSkyBackground(gl)}catch(error){console.warn('Sky background unavailable:',error)}
  try{planetarium=createPlanetarium(gl)}catch(error){console.warn('Planetarium unavailable:',error)}
  htmlBoards=createNativeBoardTextures(gl,glCanvas);
  document.body.classList.add('native-html-canvas');
  requestAnimationFrame(frame);
  return {type:'webgl',htmlInCanvas:true,depthOcclusion:false,stats:htmlBoards.stats,boards:htmlBoards.roots,
   destroy(){running=false;sky?.destroy();background?.destroy();planetarium?.destroy();destroyForestEffects();walkTextures.forEach(texture=>gl.deleteTexture(texture));if(graphicTex)gl.deleteTexture(graphicTex);if(graphicMesh)gl.deleteBuffer(graphicMesh.buffer);htmlBoards?.destroy();document.body.classList.remove('native-html-canvas')}};
 }catch(error){
  running=false;
  console.error('Native HTML-in-Canvas fallback:',error);
  sky?.destroy();background?.destroy();planetarium?.destroy();destroyForestEffects();if(graphicTex)gl.deleteTexture(graphicTex);if(graphicMesh)gl.deleteBuffer(graphicMesh.buffer);htmlBoards?.destroy();return null;
 }
}
