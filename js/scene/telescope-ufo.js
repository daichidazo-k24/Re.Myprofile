export const UFO_DIRECTION=Object.freeze({yaw:-.48,pitch:.14});

/** Project a fixed direction on the sky through the same optics as the telescope. */
export function projectTelescopeUfo(yaw,pitch,fov,width,height){
 const relativeYaw=UFO_DIRECTION.yaw-yaw;
 const forward=Math.cos(UFO_DIRECTION.pitch)*Math.cos(relativeYaw);
 const right=Math.cos(UFO_DIRECTION.pitch)*Math.sin(relativeYaw);
 const vertical=Math.sin(UFO_DIRECTION.pitch);
 const depth=forward*Math.cos(pitch)+vertical*Math.sin(pitch);
 if(depth<=0)return null;
 const focal=height/(2*Math.tan(fov/2));
 const x=width/2+right*focal/depth;
 const y=height/2-(vertical*Math.cos(pitch)-forward*Math.sin(pitch))*focal/depth;
 if(x<12||x>width-64||y<12||y>height-12)return null;
 return {x,y,size:.068*focal/depth};
}
