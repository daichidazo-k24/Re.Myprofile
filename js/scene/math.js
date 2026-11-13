/** Column-major 4×4 transforms and geometry. Shared by the zero-dependency WebGL engine. */
export const M={
 id(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},
 mul(a,b){const o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[col*4+k];o[col*4+row]=v}return o},
 move(x,y,z){const a=M.id();a[12]=x;a[13]=y;a[14]=z;return a},
 size(x,y,z){const a=M.id();a[0]=x;a[5]=y;a[10]=z;return a},
 rotY(a){const m=M.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[8]=s;m[2]=-s;m[10]=c;return m},
 rotX(a){const m=M.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[9]=-s;m[6]=s;m[10]=c;return m},
 rotZ(a){const m=M.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[4]=-s;m[1]=s;m[5]=c;return m},
 model(x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0){return M.mul(M.move(x,y,z),M.mul(M.rotY(ry),M.mul(M.rotX(rx),M.mul(M.rotZ(rz),M.size(sx,sy,sz)))))},
 persp(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o},
 look(eye,at){const norm=v=>{const d=Math.hypot(...v)||1;return v.map(x=>x/d)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const z=norm(eye.map((v,i)=>v-at[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);const m=M.id();m[0]=x[0];m[1]=y[0];m[2]=z[0];m[4]=x[1];m[5]=y[1];m[6]=z[1];m[8]=x[2];m[9]=y[2];m[10]=z[2];m[12]=-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]);m[13]=-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]);m[14]=-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]);return m},
};
export function seeded(a,b,c=0){let n=Math.imul(a+31,374761393)+Math.imul(b+51,668265263)+Math.imul(c+23,2654435761);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
export function hex(s){s=s.replace('#','');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255)}
export function makeCube(){const vertices=[],faces=[[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]];const uv=[[0,0],[1,0],[1,1],[0,1]];for(const [n,q] of faces)for(const idx of [0,1,2,0,2,3]){const p=q[idx];vertices.push(...p.map(v=>v*.5),...n,...uv[idx],1,1,1)}return vertices}
export function makePlane(){const out=[];let p=[[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0]],uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of [0,1,2,0,2,3])out.push(...p[i],0,0,1,...uv[i],1,1,1);return out}
