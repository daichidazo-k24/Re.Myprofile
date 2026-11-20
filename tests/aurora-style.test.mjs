import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleAurora} from '../js/scene/aurora-style.js';

test('aurora curtains concentrate above the horizon throughout the color cycle',()=>{
 for(const time of [0,20,40,60,80]){
  let energy=0,elevation=0,lowerEnergy=0;
  for(let i=0;i<6000;i++){
   const y=(i+.5)/3000-1,angle=i*2.399963,radius=Math.sqrt(1-y*y);
   const light=sampleAurora([radius*Math.cos(angle),y,radius*Math.sin(angle)],time);
   for(const value of [light.density,light.ridge,light.glow,...light.color])assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
   energy+=light.density;elevation+=light.density*Math.asin(y)*180/Math.PI;
   if(y<0)lowerEnergy+=light.density;
  }
  assert.ok(elevation/energy>34,'curtains should occupy the higher sky');
  assert.ok(lowerEnergy/energy<.01,'glow must not flood the ground or lower sky');
  assert.ok(energy/6000<.2,'retain dark sky between curtains for visible stars');
 }
});
