/** Fine hinged tiles on a cube-sphere, approximately 1/8 of the former tile area. */
export const PANEL_SEGMENTS=45;
export const PANEL_FLIP_PERIOD=4.8;
export const PANEL_FLIP_START=.58;
export const PANEL_FLIP_END=.90;
export const PANEL_COLOR_STEP=1.8;
export const PANEL_INSET=.982;
const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n)};
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const FACES=[
 [[1,0,0],[0,0,-1],[0,1,0]], [[-1,0,0],[0,0,1],[0,1,0]],
 [[0,1,0],[1,0,0],[0,0,-1]], [[0,-1,0],[1,0,0],[0,0,1]],
 [[0,0,1],[1,0,0],[0,1,0]], [[0,0,-1],[-1,0,0],[0,1,0]],
];

export function createAuroraPanels(){
 const panels=[],step=2/PANEL_SEGMENTS;
 for(const [face,u,v] of FACES)for(let row=0;row<PANEL_SEGMENTS;row++)for(let col=0;col<PANEL_SEGMENTS;col++){
  const x=-1+(col+.5)*step,y=-1+(row+.5)*step;
  const point=(a,b)=>norm(face.map((n,i)=>n+u[i]*a+v[i]*b));
  const center=point(x,y),axis=norm(u.map((n,i)=>n-center[i]*dot(u,center))),up=cross(center,axis);
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{
   const p=point(x+a*step/2,y+b*step/2),offset=p.map((n,i)=>n-center[i]);
   // Project each corner into the tile's tangent plane, then leave a narrow joint.
   return {local:[dot(offset,axis)*PANEL_INSET,dot(offset,up)*PANEL_INSET],uv:[(a+1)/2,(b+1)/2]};
  });
  // A smooth traveling phase closes at the longitude seam (two full flip cycles).
  const phase=(Math.atan2(center[2],center[0])/Math.PI+1)+center[1]*.32
   +.035*Math.sin(center[0]*137+center[1]*173+center[2]*97);
  panels.push({center,axis,corners,phase});
 }
 return panels;
}

export function panelFlipState(time,phase){
 const clock=time/PANEL_FLIP_PERIOD+phase,cycle=Math.floor(clock);
 const p=Math.max(0,Math.min(1,(clock-cycle-PANEL_FLIP_START)/(PANEL_FLIP_END-PANEL_FLIP_START)));
 const turn=p*p*(3-2*p),odd=((cycle%2)+2)%2;
 return {angle:Math.PI*(odd+turn),turn,
  frontTime:(cycle-phase+odd)*PANEL_COLOR_STEP,
  backTime:(cycle-phase+1-odd)*PANEL_COLOR_STEP};
}
