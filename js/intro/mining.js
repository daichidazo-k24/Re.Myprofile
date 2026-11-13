/** 2D pixel block excavation intro. Independent of the 3D renderer. */
import {seeded} from '../scene/math.js';
import {state} from '../state.js';
import {beep} from '../ui/audio.js';
import {selectStage,setFocus} from '../ui/navigation.js';
export function createMiningIntro(){
 const $=id=>document.getElementById(id),canvas=$('rockCanvas'),ctx=canvas.getContext('2d',{alpha:true});
 const miner=new Image();miner.src=new URL('../../assets/miner.png',import.meta.url).href;
 let tiles=[],debris=[],introStart=0,introRAF=0,active=false,lastStrike=0;
 const introDuration=state.reduceMotion?350:6100;
 function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;const size=innerWidth<650?43:58;tiles=[];const cols=Math.ceil(innerWidth/size),rows=Math.ceil(innerHeight/size),lanes=5;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const lane=Math.min(lanes-1,Math.floor((y*size/innerHeight)*lanes)),within=lane%2===0?x/(cols-1||1):1-x/(cols-1||1);tiles.push({x:x*size,y:y*size,size,kind:seeded(x,y,2),gold:seeded(x,y,9),rank:(lane+within)/lanes+(seeded(x,y,5)-.5)*.03,alive:true})}
 }
 function paintRock(tile){const {x,y,size:s}=tile,palette=['#354568','#40527c','#4d6090','#384869','#52658d'];ctx.fillStyle='#1b2744';ctx.fillRect(x,y,s,s);ctx.fillStyle=palette[Math.floor(tile.kind*palette.length)];ctx.fillRect(x+2,y+2,s-4,s-4);ctx.fillStyle='#9aabd4';ctx.fillRect(x+4,y+3,s-8,5);ctx.fillStyle='#273555';ctx.fillRect(x+s-8,y+8,5,s-13);ctx.fillRect(x+6,y+s-9,s-12,5);const p=Math.max(4,Math.round(s/9));if(tile.gold>.8){ctx.fillStyle='#f68d1f';ctx.fillRect(x+s*.23,y+s*.45,p*2,p);ctx.fillStyle='#ffcf76';ctx.fillRect(x+s*.23+p,y+s*.45-p,p,p)}else{ctx.fillStyle='#6e84b3';ctx.fillRect(x+s*.32,y+s*.56,p,p);ctx.fillRect(x+s*.55,y+s*.42,p*2,p)}}
 function spray(x,y,n=5){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=1+Math.random()*3;debris.push({x,y,vx:Math.cos(a)*v*40,vy:Math.sin(a)*v*35-75,life:300+Math.random()*450,color:['#f68d1f','#ecab37','#a2b5df','#526993','#fff1c4'][Math.floor(Math.random()*5)],size:3+Math.random()*6})}if(debris.length>135)debris.splice(0,debris.length-135)}
 function paintDebris(dt){for(let i=debris.length-1;i>=0;i--){const p=debris[i];p.life-=dt;if(p.life<=0){debris.splice(i,1);continue}p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=270*dt/1000;ctx.globalAlpha=Math.min(1,p.life/150);ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),p.size,p.size)}ctx.globalAlpha=1}
 function paintMiner(x,y,left,t){if(!miner.complete||!miner.naturalWidth)return;const w=Math.min(190,innerWidth*.31),h=w*miner.naturalHeight/miner.naturalWidth;ctx.save();ctx.translate(x,y);if(left)ctx.scale(-1,1);ctx.rotate(Math.sin(t*.022)*.05);ctx.drawImage(miner,-w*.95,-h*.57+Math.sin(t*.022)*3,w,h);ctx.restore();if(Math.sin(t*.03)>.48){ctx.fillStyle='#ffe5a5';ctx.fillRect(x+9,y-21,8,8);ctx.fillRect(x+24,y-8,5,5);ctx.fillRect(x-1,y-43,5,5)}}
 function frame(ts){if(!active)return;const elapsed=ts-introStart,p=Math.min(1,elapsed/introDuration);ctx.clearRect(0,0,innerWidth,innerHeight);
  for(let j=0;j<tiles.length;j++){const tile=tiles[j];if(tile.rank<p){if(tile.alive){tile.alive=false;if(seeded(j,4)>.54)spray(tile.x+tile.size*.5,tile.y+tile.size*.5,4);if(ts-lastStrike>65){lastStrike=ts;beep(150+Math.random()*80,.06)}}}else paintRock(tile)}
  const lanes=5,part=Math.min(lanes-.001,p*lanes),lane=Math.floor(part),fract=part-lane,goingLeft=lane%2===1;
  const x=(goingLeft?1-fract:fract)*innerWidth,y=(lane+.68)*innerHeight/lanes;
  paintDebris(16);paintMiner(x,y,goingLeft,elapsed);
  $('miningFill').style.width=`${Math.round(p*100)}%`;$('miningPercent').textContent=`${String(Math.round(p*100)).padStart(3,'0')}%`;
  if(p>.11)$('introCenter').style.opacity=String(Math.max(0,1-(p-.11)/.22));
  if(p>=1){finish();return}introRAF=requestAnimationFrame(frame);
 }
 function finish(){active=false;cancelAnimationFrame(introRAF);state.entered=true;document.body.classList.add('world-entered');$('introScreen').classList.add('is-done');$('miningFill').style.width='100%';$('miningPercent').textContent='100%';const notice=$('notification');notice.classList.add('visible');setTimeout(()=>notice.classList.remove('visible'),2300);beep(580,.15)}
 function replay(){setFocus(false);state.entered=false;document.body.classList.remove('world-entered');state.focused=false;state.focusMix=0;active=false;cancelAnimationFrame(introRAF);debris=[];$('introScreen').classList.remove('is-done');$('introCenter').style.opacity='1';selectStage(0);resize();active=true;introStart=performance.now()+250;introRAF=requestAnimationFrame(frame)}
 window.addEventListener('resize',()=>{if(active){const p=(performance.now()-introStart)/introDuration;resize();if(p>.2)tiles.forEach(t=>{t.alive=t.rank>p})}});
 return {start(){if(state.reduceMotion)finish();else replay()},finish,replay};
}
