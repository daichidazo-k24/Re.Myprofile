import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningIntro} from '../js/intro/mining.js';
import {state} from '../js/state.js';
import {MINING_STAR_COUNT,createMiningSkyBridge,createSkyStars,projectMiningTargets} from '../js/scene/sky-model.js';
import {M} from '../js/scene/math.js';

for(const [width,height] of [[1440,900],[390,844]])test(`mining retains debris/progress and hands off spread stars at ${width}x${height}; replay/skip/reduced motion reset`,t=>{
 const priorState={...state},originals=new Map(),frames=new Map(),rects=[];
 let nextFrame=0,clock=0;
 const classes=()=>({add(){},remove(){},toggle(){}});
 const ctx={globalAlpha:1,setTransform(){},clearRect(){},fillRect(x,y,w,h){rects.push({x,y,w,h,alpha:this.globalAlpha,color:this.fillStyle})}};
 const node=()=>({style:{},classList:classes(),setAttribute(){},replaceChildren(){},appendChild(){}});
 const nodes=new Map(),getElementById=id=>{
  if(!nodes.has(id))nodes.set(id,node());
  return nodes.get(id);
 };
 getElementById('rockCanvas').getContext=()=>ctx;
 const install=(name,value)=>{originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true})};
 install('document',{getElementById,body:node(),querySelectorAll:()=>[],createElement:node});
 install('window',{addEventListener(){}});install('innerWidth',width);install('innerHeight',height);install('devicePixelRatio',1);
 install('Image',class{complete=false});
 install('requestAnimationFrame',fn=>{frames.set(++nextFrame,fn);return nextFrame});
 install('cancelAnimationFrame',id=>frames.delete(id));install('setTimeout',()=>0);
 t.mock.method(performance,'now',()=>clock);
 const tick=ts=>{clock=ts;const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(ts)};
 try{
  state.active=0;state.entered=false;state.reduceMotion=false;
  const bridge=state.miningSky=createMiningSkyBridge();bridge.available=true;
  const intro=createMiningIntro();intro.start();
  const vp=M.mul(M.persp((width<750?67:56)*Math.PI/180,width/height,.1,120),M.look([2.4,6.47,15.36],[0,2.65,-1.55]));
  projectMiningTargets(bridge,createSkyStars(),vp,width,height);
  assert.equal(bridge.active,true);
  for(let ts=0;ts<6400;ts+=1000/60)tick(ts);
  assert.equal(state.entered,true);assert.equal(bridge.active,false);assert.equal(frames.size,0);
  assert.ok(bridge.count>=12&&bridge.count<=MINING_STAR_COUNT,`enough fragments become stars: ${bridge.count}`);
  const xs=Array.from({length:bridge.count},(_,i)=>bridge.targets[i*3]);
  assert.ok(Math.min(...xs)<.12&&Math.max(...xs)>.8,'actual mined stars reach both sides');
  assert.equal(getElementById('miningPercent').textContent,'100%');
  assert.equal(getElementById('miningFill').style.width,'100%');
  assert.ok(rects.some(r=>r.alpha>0&&r.alpha<1&&r.w>=3&&r.w<=9&&r.color.startsWith('#')),'ordinary fading debris remains');
  assert.ok(rects.some(r=>r.color.startsWith('rgb(')&&r.alpha===.9),'settled star cores are drawn');
  assert.ok(rects.every(r=>[r.x,r.y,r.w,r.h].every(Number.isFinite)));
  intro.replay();assert.equal(state.entered,false);assert.equal(bridge.count,0);assert.equal(bridge.targetCount,0);assert.ok(bridge.indices.every(i=>i===-1));
  intro.finish();assert.equal(state.entered,true);assert.equal(frames.size,0);
  state.reduceMotion=true;intro.replay();assert.equal(state.entered,true);assert.equal(bridge.count,0);assert.equal(frames.size,0);
  state.reduceMotion=false;bridge.available=false;intro.replay();
  const start=clock;
  for(let ts=start;ts<start+6400;ts+=1000/60)tick(ts);
  assert.equal(state.entered,true);assert.equal(bridge.count,0,'unsupported renderer retains the original intro');
 }finally{
  Object.assign(state,priorState);
  for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}
 }
});
