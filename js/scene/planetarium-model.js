/** A fixed, illustrative celestial sphere, independent of stages and mining stars. */
import {seeded} from './math.js';

export const PLANETARIUM_STAR_COUNT=5200;
const FIELD_COUNT=4200;
const COLORS=[[.94,.97,1],[.76,.87,1],[1,.91,.76]];

export function createPlanetariumStars(){
 return Array.from({length:PLANETARIUM_STAR_COUNT},(_,i)=>{
  const angle=seeded(i,211)*Math.PI*2;
  // Uniform solid-angle sampling avoids crowded poles and a visible grid.
  // An additional faint population forms a gently tilted, uneven Milky Way.
  const band=i>=FIELD_COUNT;
  const y=band?(seeded(i,223)+seeded(i,227)-1)*(.09+.12*seeded(i,229)):seeded(i,223)*2-1;
  const ring=Math.sqrt(1-y*y),x=ring*Math.cos(angle),z=ring*Math.sin(angle);
  const tx=x*Math.cos(.62)-y*Math.sin(.62),ty=x*Math.sin(.62)+y*Math.cos(.62);
  const direction=[tx,ty*Math.cos(.42)-z*Math.sin(.42),ty*Math.sin(.42)+z*Math.cos(.42)];
  const magnitude=seeded(i,233),bright=!band&&magnitude>.975,medium=!band&&magnitude>.76;
  return {direction,
   radius:bright?1.8+seeded(i,239)*.5:medium?1.05+seeded(i,239)*.4:.65+seeded(i,239)*.35,
   brightness:bright?.88+seeded(i,241)*.12:medium?.52+seeded(i,241)*.24:.24+seeded(i,241)*.22,
   phase:seeded(i,251)*Math.PI*2,
   color:COLORS[seeded(i,257)<.73?0:seeded(i,263)<.65?1:2],
  };
 });
}
