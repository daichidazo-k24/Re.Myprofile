/** World-space viewing rays for the distant aurora dome. Reuse these arrays. */
export function createSkyCamera(){return {eye:new Float32Array(3),rays:new Float32Array(9)}}

export function updateSkyCamera(camera,eye,target,fov,aspect){
 const fx=target[0]-eye[0],fy=target[1]-eye[1],fz=target[2]-eye[2];
 const length=Math.hypot(fx,fy,fz)||1,x=fx/length,y=fy/length,z=fz/length;
 const horizontal=Math.hypot(x,z)||1,rx=-z/horizontal,rz=x/horizontal;
 const scale=Math.tan(fov/2),r=camera.rays;
 r[0]=rx*scale*aspect;r[1]=0;r[2]=rz*scale*aspect;
 r[3]=-rz*y*scale;r[4]=(rz*x-rx*z)*scale;r[5]=rx*y*scale;
 r[6]=x;r[7]=y;r[8]=z;
 camera.eye.set(eye);
 return camera;
}

/** Invert the CSS world's exact translate/rotate/scale camera transform.
 * CSS pixels use Y down; the sky uses Y up and the world's scene units. */
export function updateCSSSkyCamera(camera,{width,height,perspective,scale,yaw,pitch,x,y,z,stageX,units}){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 function inverse(px,py,pz,out,offset=0,gain=1){
  const a=cy*px-sy*pz,c=sy*px+cy*pz;
  out[offset]=a*gain;out[offset+1]=-(cp*py+sp*c)*gain;out[offset+2]=(-sp*py+cp*c)*gain;
 }
 const r=camera.rays;
 inverse(width/(2*perspective),0,0,r);
 inverse(0,-height/(2*perspective),0,r,3);
 inverse(0,0,-1,r,6);
 inverse(-x,height*.09-y,perspective-z,camera.eye,0,1/(scale*units));
 camera.eye[0]+=stageX/units;
 return camera;
}
