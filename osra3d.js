/* OsRa 3D Couple Motion — R45
 * Local, offline, low-poly 3D miniature renderer for Osama + Rania.
 * WebGL is used for the couple so the figures are genuine 3D geometry rather than PNG/CSS overlays.
 * The classic message scenes remain lightweight 2D procedural drawings.
 */
(function(){
  'use strict';
  const API={};
  const TAU=Math.PI*2;
  let glCanvas=null,gl=null,glReady=false,glProgram=null,glAttempted=false;
  let uiCanvas=null,ctx=null,raf=0,active=false,mode='idle',started=0,duration=0,onDone=null,sceneData=null;
  let meshes={},uMVP=null,uModel=null,uColor=null,uLightDir=null;
  let viewW=innerWidth,viewH=innerHeight,dpr=1;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const rgb=(hex,amt=0)=>{const h=hex.replace('#','');let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);r=clamp(r+amt,0,255);g=clamp(g+amt,0,255);b=clamp(b+amt,0,255);return `rgb(${r},${g},${b})`};

  /* ----------------------------- 2D overlay ----------------------------- */
  function setupUI(){
    if(uiCanvas)return;
    uiCanvas=document.createElement('canvas');uiCanvas.id='osra3dUI';uiCanvas.setAttribute('aria-hidden','true');
    uiCanvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:100004;pointer-events:none;display:none;overflow:hidden;';
    document.body.appendChild(uiCanvas);ctx=uiCanvas.getContext('2d',{alpha:true});resize();
  }
  function gradientBg(){const g=ctx.createLinearGradient(0,0,0,viewH);g.addColorStop(0,'rgba(255,250,252,.10)');g.addColorStop(1,'rgba(255,221,238,.07)');ctx.fillStyle=g;ctx.fillRect(0,0,viewW,viewH)}
  function proj2(p){const f=11,z=clamp(p.z,-5,5),s=f/(f-z),u=viewH/5.8;return{x:viewW/2+p.x*s*u,y:viewH/2-p.y*s*u,s}}
  function line3(a,b,w,color,alpha=1){const A=proj2(a),B=proj2(b);ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,w*((A.s+B.s)/2));ctx.lineCap='round';ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.restore()}
  function ellipse3(p,rx,ry,color,alpha=1,stroke=null,sw=1){const q=proj2(p),u=viewH/5.8;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(q.x,q.y,rx*q.s*u,ry*q.s*u,0,0,TAU);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke()}ctx.restore()}
  function poly3(pts,color,alpha=1,stroke=null){if(!pts?.length)return;const q=pts.map(proj2);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);for(let i=1;i<q.length;i++)ctx.lineTo(q[i].x,q[i].y);ctx.closePath();ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}ctx.restore()}
  function shadow(x,y,s=1){const q=proj2({x,y,z:-.7});ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#2b2030';ctx.beginPath();ctx.ellipse(q.x,q.y,72*s*q.s,16*s*q.s,0,0,TAU);ctx.fill();ctx.restore()}
  function text(txt,x,y,size,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.font=`800 ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(58,29,50,.92)';ctx.shadowColor='rgba(255,255,255,.85)';ctx.shadowBlur=6;ctx.fillText(txt,x,y);ctx.restore()}

  /* ----------------------------- tiny 3D math ----------------------------- */
  const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function mm(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
  function mt(x,y,z){const m=I();m[12]=x;m[13]=y;m[14]=z;return m}
  function ms(x,y,z){const m=I();m[0]=x;m[5]=y;m[10]=z;return m}
  function rx(a){const c=Math.cos(a),s=Math.sin(a),m=I();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
  function ry(a){const c=Math.cos(a),s=Math.sin(a),m=I();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
  function rz(a){const c=Math.cos(a),s=Math.sin(a),m=I();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m}
  function perspective(fov,aspect,n,f){const q=1/Math.tan(fov/2),m=new Array(16).fill(0);m[0]=q/aspect;m[5]=q;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m}
  function normalize(v){const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l]}
  function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function lookAt(eye,center,up){const z=normalize(sub(eye,center)),x=normalize(cross(up,z)),y=cross(z,x),m=I();m[0]=x[0];m[1]=x[1];m[2]=x[2];m[4]=y[0];m[5]=y[1];m[6]=y[2];m[8]=z[0];m[9]=z[1];m[10]=z[2];m[12]=-dot(x,eye);m[13]=-dot(y,eye);m[14]=-dot(z,eye);return m}
  function quatFromTo(a,b){a=normalize(a);b=normalize(b);const c=cross(a,b),d=dot(a,b),w=Math.sqrt(Math.max(0,1+d));if(w<1e-5){const axis=Math.abs(a[0])<.9?cross(a,[1,0,0]):cross(a,[0,1,0]);const n=normalize(axis);return[n[0],n[1],n[2],0]}const q=[c[0]/w,c[1]/w,c[2]/w,w];const l=Math.hypot(...q);return q.map(v=>v/l)}
  function qm(q){const[x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z,m=I();m[0]=1-2*(yy+zz);m[1]=2*(xy+wz);m[2]=2*(xz-wy);m[4]=2*(xy-wz);m[5]=1-2*(xx+zz);m[6]=2*(yz+wx);m[8]=2*(xz+wy);m[9]=2*(yz-wx);m[10]=1-2*(xx+yy);return m}
  function segMat(a,b,r){const d=sub(b,a),len=Math.hypot(...d)||1,q=qm(quatFromTo([0,1,0],d)),m=mm(mt((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),mm(q,ms(r,len/2,r)));return m}
  function part(root,pos,rot,scale){return mm(root,mm(mt(pos[0],pos[1],pos[2]),mm(rz(rot[2]||0),mm(ry(rot[1]||0),mm(rx(rot[0]||0),ms(scale[0],scale[1],scale[2]))))))}

  /* ----------------------------- WebGL meshes ----------------------------- */
  function meshData(type,detail=14){
    const P=[],N=[],T=[];const push=(p,n)=>{P.push(...p);N.push(...n)};
    if(type==='cube'){
      const faces=[[[0,0,1],[-1,-1,1,1,-1,1,1,1,1,-1,1,1]],[[0,0,-1],[-1,-1,-1,-1,1,-1,1,1,-1,1,-1,-1]],[[1,0,0],[1,-1,-1,1,1,-1,1,1,1,1,-1,1]],[[-1,0,0],[-1,-1,1,-1,1,1,-1,1,-1,-1,-1,-1]],[[0,1,0],[-1,1,1,1,1,1,1,1,-1,-1,1,-1]],[[0,-1,0],[-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1]]];
      for(const [n,v] of faces){const ids=[0,1,2,0,2,3];for(const k of ids){const i=k*3;push([v[i],v[i+1],v[i+2]],n)}}
      return{p:P,n:N};
    }
    if(type==='sphere'){
      const lat=detail,lon=detail*2;for(let y=0;y<lat;y++){const v0=y/lat,v1=(y+1)/lat,th0=v0*Math.PI,th1=v1*Math.PI;for(let x=0;x<lon;x++){const u0=x/lon,u1=(x+1)/lon,ph0=u0*TAU,ph1=u1*TAU;const a=[Math.sin(th0)*Math.cos(ph0),Math.cos(th0),Math.sin(th0)*Math.sin(ph0)],b=[Math.sin(th0)*Math.cos(ph1),Math.cos(th0),Math.sin(th0)*Math.sin(ph1)],c=[Math.sin(th1)*Math.cos(ph1),Math.cos(th1),Math.sin(th1)*Math.sin(ph1)],d=[Math.sin(th1)*Math.cos(ph0),Math.cos(th1),Math.sin(th1)*Math.sin(ph0)];push(a,a);push(b,b);push(c,c);push(a,a);push(c,c);push(d,d)}}return{p:P,n:N};
    }
    if(type==='cylinder'||type==='frustum'){
      const top=type==='frustum'?.34:1,bottom=1;const lat=1;for(let x=0;x<detail;x++){const a=x/detail*TAU,b=(x+1)/detail*TAU,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);push([bottom*ca,-1,bottom*sa],[ca,.15,sa]);push([bottom*cb,-1,bottom*sb],[cb,.15,sb]);push([top*cb,1,top*sb],[cb,.15,sb]);push([bottom*ca,-1,bottom*sa],[ca,.15,sa]);push([top*cb,1,top*sb],[cb,.15,sb]);push([top*ca,1,top*sa],[ca,.15,sa]);}return{p:P,n:N};
    }
    return{p:[],n:[]}
  }
  function createMesh(type,detail){const d=meshData(type,detail),m=gl.createBuffer(),n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.p),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.n),gl.STATIC_DRAW);return{v:m,n, count:d.p.length/3}}
  function compileShader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader compile failed');return s}
  function makeGL(){
    if(glReady)return true;
    if(glAttempted)return false;
    glAttempted=true;
    glCanvas=document.createElement('canvas');glCanvas.id='osra3dGL';glCanvas.setAttribute('aria-hidden','true');
    glCanvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:100003;pointer-events:none;display:none;overflow:hidden;';document.body.appendChild(glCanvas);
    try{gl=glCanvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false})||glCanvas.getContext('experimental-webgl',{alpha:true,antialias:true})}catch{}if(!gl)return false;
    try{
      const vs=compileShader(gl.VERTEX_SHADER,'attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMVP; uniform mat4 uModel; varying vec3 vNormal; void main(){ vNormal=mat3(uModel)*aNormal; gl_Position=uMVP*vec4(aPosition,1.0); }');
      const fs=compileShader(gl.FRAGMENT_SHADER,'precision mediump float; uniform vec4 uColor; uniform vec3 uLightDir; varying vec3 vNormal; void main(){ vec3 n=normalize(vNormal); float l=.52+.48*max(dot(n,normalize(-uLightDir)),0.0); gl_FragColor=vec4(uColor.rgb*l,uColor.a); }');
      glProgram=gl.createProgram();gl.attachShader(glProgram,vs);gl.attachShader(glProgram,fs);gl.linkProgram(glProgram);if(!gl.getProgramParameter(glProgram,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(glProgram)||'program link failed');
      gl.useProgram(glProgram);uMVP=gl.getUniformLocation(glProgram,'uMVP');uModel=gl.getUniformLocation(glProgram,'uModel');uColor=gl.getUniformLocation(glProgram,'uColor');uLightDir=gl.getUniformLocation(glProgram,'uLightDir');
      meshes={cube:createMesh('cube'),sphere:createMesh('sphere',10),cylinder:createMesh('cylinder',16),frustum:createMesh('frustum',18)};
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);glReady=true;
    }catch(e){console.warn('OsRa 3D fallback:',e);glReady=false;if(glCanvas){glCanvas.remove();glCanvas=null}gl=null}
    resize();return glReady;
  }
  function resize(){viewW=innerWidth;viewH=innerHeight;dpr=Math.min(1.5,Math.max(1,devicePixelRatio||1));if(uiCanvas){uiCanvas.width=Math.round(viewW*dpr);uiCanvas.height=Math.round(viewH*dpr);uiCanvas._d=dpr}if(glCanvas){glCanvas.width=Math.round(viewW*dpr);glCanvas.height=Math.round(viewH*dpr);if(gl)gl.viewport(0,0,glCanvas.width,glCanvas.height)}}
  addEventListener('resize',resize,{passive:true});
  function color(hex,a=1){const h=hex.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255,a]}
  function drawMesh(mesh,model,hex,alpha=1){if(!glReady||!mesh)return;const aspect=viewW/viewH,cam=mode==='page'?[0,.15,8.8]:[0,.25,10.8],target=[0,.35,0],Pj=perspective(46*Math.PI/180,aspect,.1,50),V=lookAt(cam,target,[0,1,0]),mvp=mm(Pj,mm(V,model));gl.useProgram(glProgram);gl.uniformMatrix4fv(uMVP,false,new Float32Array(mvp));gl.uniformMatrix4fv(uModel,false,new Float32Array(model));gl.uniform4fv(uColor,new Float32Array(color(hex,alpha)));gl.uniform3fv(uLightDir,new Float32Array([-3,5,7]));const vp=gl.getAttribLocation(glProgram,'aPosition'),nn=gl.getAttribLocation(glProgram,'aNormal');gl.bindBuffer(gl.ARRAY_BUFFER,mesh.v);gl.enableVertexAttribArray(vp);gl.vertexAttribPointer(vp,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.enableVertexAttribArray(nn);gl.vertexAttribPointer(nn,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
  const draw=(type,root,pos,rot,scale,c,a=1)=>drawMesh(meshes[type],part(root,pos,rot,scale),c,a);
  const seg=(root,a,b,r,c,aAlpha=1)=>{const M=segMat(a,b,r);drawMesh(meshes.cylinder,mm(root,M),c,aAlpha)};

  /* ----------------------------- 3D characters ----------------------------- */
  function drawEyes(root,kind,headY,scale){
    const z=.53*scale;
    const eyeY=headY+.08*scale;
    draw('sphere',root,[-.20*scale,eyeY,z],[0,0,0],[.075*scale,.10*scale,.055*scale],'#20191d');
    draw('sphere',root,[.20*scale,eyeY,z],[0,0,0],[.075*scale,.10*scale,.055*scale],'#20191d');
    draw('sphere',root,[-.17*scale,eyeY+.04*scale,z+.018],[0,0,0],[.022*scale,.025*scale,.018*scale],'#ffffff');
    draw('sphere',root,[.23*scale,eyeY+.04*scale,z+.018],[0,0,0],[.022*scale,.025*scale,.018*scale],'#ffffff');
  }
  function drawOsama(root,s,pose,ph,opts={}){
    const gait=Math.sin(ph*TAU),lift=pose==='lift';
    const legSwing=gait*.26,armSwing=Math.sin(ph*TAU+Math.PI)*.22;
    // shoes + legs
    const hip=.92*s;
    let lAng=legSwing,rAng=-legSwing;if(pose==='lift'){lAng=.12*Math.sin(ph*TAU);rAng=-lAng}
    const kL=[-.28*s,.86*s,0],kR=[.28*s,.86*s,0],fL=[kL[0]+Math.sin(lAng)*.30*s,.18*s,.08],fR=[kR[0]+Math.sin(rAng)*.30*s,.18*s,.08];
    const hL=[-.28*s,1.25*s,0],hR=[.28*s,1.25*s,0];seg(root,hL,kL,.20*s,'#19191d');seg(root,kL,fL,.19*s,'#19191d');seg(root,hR,kR,.20*s,'#19191d');seg(root,kR,fR,.19*s,'#19191d');
    draw('sphere',root,[fL[0]+.10*s,.10*s,.08],[0,0,0],[.33*s,.11*s,.44*s],'#131317');draw('sphere',root,[fR[0]+.10*s,.10*s,.08],[0,0,0],[.33*s,.11*s,.44*s],'#131317');
    // jacket torso, shirt, tie
    draw('cube',root,[0,1.92*s,0],[0,0,0],[.68*s,.76*s,.42*s],'#b9bcc6');
    draw('cube',root,[0,2.05*s,.43*s],[0,0,0],[.13*s,.42*s,.035*s],'#f9f9fb');
    draw('cube',root,[0,1.93*s,.49*s],[0,0,0],[.08*s,.46*s,.025*s],'#286fc3');
    draw('cube',root,[0,2.30*s,.47*s],[0,0,0],[.18*s,.12*s,.035*s],'#f9f9fb');
    // shoulders/arms — exact two arms, no phantom hand
    let eL,eR,hL2,hR2;
    if(pose==='highfive'){eL=[-.72*s,2.10*s,.05];hL2=[-.98*s,2.62*s,.18];eR=[.72*s,2.24*s,.12];hR2=[1.03*s,2.76*s,.32]}
    else if(pose==='lift'){eL=[-.78*s,1.95*s,.14];hL2=[.12*s,1.42*s,.47];eR=[.78*s,1.95*s,.16];hR2=[.78*s,1.38*s,.49]}
    else if(pose==='shuffle'||pose==='dance3'||pose==='hold'){eL=[-.34*s,1.70*s,.14];hL2=[-.78*s,1.38*s,.35];eR=[.34*s,1.70*s,.14];hR2=[.78*s,1.38*s,.35]}
    else if(pose==='hug'){eL=[-.58*s,1.78*s,.10];hL2=[-.82*s,1.24*s,.12];eR=[.40*s,1.88*s,.28];hR2=[.72*s,1.72*s,.42]}
    else if(pose==='push'){
      if(opts.pushSide==='left'){eL=[-.86*s,2.04*s,.18];hL2=[-1.16*s,2.30*s,.34];eR=[.55*s,1.78*s,.08];hR2=[.72*s,1.26*s,.11]}
      else{eL=[-.55*s,1.78*s,.08];hL2=[-.72*s,1.26*s,.11];eR=[.86*s,2.04*s,.18];hR2=[1.16*s,2.30*s,.34]}
    }
    else {eL=[-.55*s+armSwing*s,1.78*s,.08];hL2=[-.70*s+armSwing*s,1.25*s,.12];eR=[.55*s-armSwing*s,1.78*s,.08];hR2=[.70*s-armSwing*s,1.25*s,.12]}
    seg(root,[-.58*s,2.25*s,.10],eL,.14*s,'#afb2bb');seg(root,eL,hL2,.11*s,'#c88969');seg(root,[.58*s,2.25*s,.10],eR,.14*s,'#afb2bb');seg(root,eR,hR2,.11*s,'#c88969');
    draw('sphere',root,hL2,[0,0,0],[.13*s,.13*s,.13*s],'#c88969');draw('sphere',root,hR2,[0,0,0],[.13*s,.13*s,.13*s],'#c88969');
    // head/hair/beard
    const hy=3.02*s;draw('sphere',root,[0,hy,.02],[0,0,0],[.61*s,.70*s,.58*s],'#c88969');
    draw('sphere',root,[0,3.38*s,-.02],[0,0,0],[.62*s,.33*s,.55*s],'#211b1c');
    draw('sphere',root,[0,2.87*s,.50*s],[0,0,0],[.40*s,.28*s,.10*s],'#302629');
    drawEyes(root,'osama',hy,s);
    draw('sphere',root,[0,2.86*s,.55*s],[0,0,0],[.18*s,.052*s,.025*s],'#7d263f');
  }
  function drawRania(root,s,pose,ph,opts={}){
    const gait=Math.sin(ph*TAU),long=pose==='lift';
    // dress silhouette
    draw('frustum',root,[0,1.55*s,0],[0,0,0],[.92*s,1.45*s,.58*s],'#ad8ab9');
    draw('sphere',root,[0,2.42*s,.02],[0,0,0],[.48*s,.43*s,.40*s],'#b58fbd');
    // off-shoulder neckline and pearls
    const pearlY=2.62*s;for(let i=-4;i<=4;i++){const xx=i*.115*s;draw('sphere',root,[xx,pearlY-(1-Math.abs(i)/4)*.08*s,.43*s],[0,0,0],[.035*s,.035*s,.035*s],'#f5f1eb')}
    // arms: exactly two, one contact arm in partner dances
    let eL,eR,hL,hR;
    if(pose==='highfive'){eL=[-.70*s,2.18*s,.05];hL=[-1.03*s,2.76*s,.30];eR=[.58*s,1.80*s,.08];hR=[.83*s,1.32*s,.12]}
    else if(pose==='lift'){eL=[-.66*s,2.02*s,.12];hL=[-1.02*s,2.26*s,.20];eR=[.64*s,1.98*s,.16];hR=[1.06*s,2.28*s,.18]}
    else if(pose==='shuffle'||pose==='dance3'||pose==='hold'){eL=[-.34*s,1.84*s,.14];hL=[-.78*s,1.38*s,.35];eR=[.58*s,1.78*s,.07];hR=[.82*s,1.30*s,.12]}
    else if(pose==='hug'){eL=[-.40*s,1.90*s,.28];hL=[-.70*s,1.75*s,.42];eR=[.62*s,1.82*s,.06];hR=[.80*s,1.30*s,.12]}
    else if(pose==='push'){
      if(opts.pushSide==='right'){eL=[-.55*s,1.78*s,.08];hL=[-.72*s,1.27*s,.11];eR=[.86*s,2.04*s,.18];hR=[1.16*s,2.30*s,.34]}
      else{eL=[-.86*s,2.04*s,.18];hL=[-1.16*s,2.30*s,.34];eR=[.55*s,1.78*s,.08];hR=[.72*s,1.27*s,.11]}
    }
    else {const swing=gait*.18;eL=[-.50*s+swing,1.82*s,.07];hL=[-.64*s+swing,1.28*s,.12];eR=[.50*s-swing,1.82*s,.07];hR=[.64*s-swing,1.28*s,.12]}
    seg(root,[-.53*s,2.45*s,.08],eL,.135*s,'#b58fbd');seg(root,eL,hL,.105*s,'#d49b7a');seg(root,[.53*s,2.45*s,.08],eR,.135*s,'#b58fbd');seg(root,eR,hR,.105*s,'#d49b7a');
    draw('sphere',root,hL,[0,0,0],[.125*s,.125*s,.125*s],'#d49b7a');draw('sphere',root,hR,[0,0,0],[.125*s,.125*s,.125*s],'#d49b7a');
    // head + long hair + cheerful face
    const hy=3.26*s;draw('sphere',root,[0,hy,.02],[0,0,0],[.58*s,.69*s,.55*s],'#d49b7a');
    draw('sphere',root,[0,3.58*s,-.05],[0,0,0],[.62*s,.40*s,.53*s],'#6b4b45');
    draw('sphere',root,[-.50*s,3.12*s,-.02],[0,0,0],[.22*s,.62*s,.22*s],'#6b4b45');draw('sphere',root,[.50*s,3.12*s,-.02],[0,0,0],[.22*s,.62*s,.22*s],'#6b4b45');
    drawEyes(root,'rania',hy,s);
    draw('sphere',root,[0,3.07*s,.51*s],[0,0,0],[.20*s,.055*s,.03*s],'#852b49');
    // earrings
    draw('sphere',root,[-.58*s,3.02*s,.43*s],[0,0,0],[.07*s,.07*s,.045*s],'#f4e8dc');draw('sphere',root,[.58*s,3.02*s,.43*s],[0,0,0],[.07*s,.07*s,.045*s],'#f4e8dc');
  }
  function rootM(x,y,z,s,ryaw=0,rzv=0){return mm(mt(x,y,z),mm(ry(ryaw),rz(rzv),ms(s,s,s)))}
  function drawCouple3D(phase,pose){
    let ax=-4.4,bx=4.4,scale=.92,ay=-1.92,by=-1.92,az=0,bz=.10,ar=0,br=0,ayaw=0,byaw=0;
    const p=phase||0;
    if(pose==='approach'){const e=easeInOut(clamp(p,0,1));ax=lerp(-4.4,-1.22,e);bx=lerp(4.4,1.22,e);scale=lerp(.68,.94,e)}
    if(pose==='count3'){ax=-1.88;bx=1.88;scale=1.00}
    if(pose==='count2'){ax=-1.50;bx=1.50;scale=1.04}
    if(pose==='count1'){ax=-1.06;bx=1.06;scale=1.10}
    if(pose==='hold'){ax=-.72;bx=.72;scale=1.08}
    if(pose==='highfive'){ax=-.76;bx=.76;scale=1.06}
    if(pose==='dance1'||pose==='dance3'){ax=-.78;bx=.78;scale=1.03}
    if(pose==='shuffle'){ax=-.69;bx=.69;scale=1.04}
    if(pose==='hug'){ax=-.24;bx=.24;scale=1.06}
    if(pose==='lift'){
      // A readable lift-and-spin: Osama stays grounded while Rania is raised and orbits him.
      const th=p*TAU,rad=.62;ax=-.18+Math.sin(th)*.10;bx=.34+Math.cos(th)*rad;by=-1.18+.12*Math.sin(th);bz=.08+.48*Math.sin(th);scale=1.06;byaw=th+.35;br=.16*Math.sin(th);ar=.06*Math.sin(th)
    }
    const A=rootM(ax,ay,az,scale,ayaw,ar),B=rootM(bx,by,bz,scale,byaw,br);
    drawOsama(A,1,pose,p*({lift:1.06,shuffle:1.35,dance3:1.2,dance1:.72,hug:.70,highfive:.95}[pose]||1));
    drawRania(B,1,pose,p*({lift:1.06,shuffle:1.35,dance3:1.2,dance1:.72,hug:.70,highfive:.95}[pose]||1),{lift:pose==='lift'});
    if(['hold','dance3','shuffle'].includes(pose)){
      // One physical hand connection only — never a separate floating hand.
      const q1=[ax+.72*scale,ay+1.38*scale,.34],q2=[bx-.78*scale,by+1.38*scale,.34];seg(I(),q1,q2,.07*scale,'#c88969',.98)
    }
    if(pose==='lift'){
      // Extra visual ribbon behind the couple, not an anatomical limb.
      const t=p*TAU;for(let i=0;i<5;i++){const a=t+i*.35;const qx=.2+Math.cos(a)*.95,qy=-.50+Math.sin(a*.75)*.30,qz=.20;draw('sphere',I(),[qx,qy,qz],[0,0,0],[.045,.045,.045],'#f2c5d8',.82)}
    }
  }
  function drawPage3D(t){const p=clamp(t/.92,0,1),ch=sceneData.character==='osama'?'osama':'rania',e=easeInOut(p),s=.58;if(ch==='osama'){const r=rootM(2.55,-2.18,0,s,-.20,0);drawOsama(r,1,'push',p,{pushSide:'left'})}else{const r=rootM(-2.55,-2.18,0,s,.20,0);drawRania(r,1,'push',p,{pushSide:'right'})}}

  /* ----------------------------- 2D couple fallback ----------------------------- */
  function drawFallbackHead(p,kind,tilt=0){
    const q=proj2(p),u=viewH/5.8,skin=kind==='osama'?'#c88969':'#d49b7a',hair=kind==='osama'?'#201b1c':'#6b4b45';ctx.save();ctx.translate(q.x,q.y);ctx.rotate(tilt);
    const g=ctx.createRadialGradient(-.15*q.s*u,-.18*q.s*u,.05*q.s*u,0,0,.72*q.s*u);g.addColorStop(0,rgb(skin,22));g.addColorStop(1,rgb(skin,-18));ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,.58*q.s*u,.70*q.s*u,0,0,TAU);ctx.fill();
    ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,-.42*q.s*u,.62*q.s*u,.35*q.s*u,0,Math.PI,TAU);ctx.fill();
    if(kind==='rania'){ctx.beginPath();ctx.ellipse(-.46*q.s*u,.26*q.s*u,.20*q.s*u,.66*q.s*u,0,0,TAU);ctx.ellipse(.46*q.s*u,.26*q.s*u,.20*q.s*u,.66*q.s*u,0,0,TAU);ctx.fill()}
    ctx.fillStyle='#211a1e';ctx.beginPath();ctx.ellipse(-.19*q.s*u,-.03*q.s*u,.078*q.s*u,.10*q.s*u,0,0,TAU);ctx.ellipse(.19*q.s*u,-.03*q.s*u,.078*q.s*u,.10*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-.16*q.s*u,-.06*q.s*u,.024*q.s*u,0,TAU);ctx.arc(.22*q.s*u,-.06*q.s*u,.024*q.s*u,0,TAU);ctx.fill();
    if(kind==='osama'){ctx.fillStyle='#2c2528';ctx.beginPath();ctx.ellipse(0,.30*q.s*u,.42*q.s*u,.29*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,.22*q.s*u,.34*q.s*u,.19*q.s*u,0,0,TAU);ctx.fill()}
    ctx.strokeStyle='#7c2441';ctx.lineWidth=Math.max(1,2.4*q.s);ctx.beginPath();ctx.arc(0,.18*q.s*u,.20*q.s*u,.14*Math.PI,.86*Math.PI);ctx.stroke();ctx.restore();
  }
  function drawFallbackPerson(kind,x,scale,pose,ph,opts={}){
    const z=0,u=viewH/5.8,y0=-2.45+(opts.yShift||0),s=scale,bob=pose==='lift'?.10*Math.sin(ph*TAU):(['dance3','shuffle'].includes(pose)?Math.abs(Math.sin(ph*TAU))*.18:(pose==='dance1'?.08*Math.sin(ph*TAU):0)),y=y0+bob,lean=opts.lean||0;
    const q=proj2({x,y:y+1.3*s,z:0});ctx.save();ctx.translate(q.x,q.y);ctx.rotate(lean);ctx.translate(-q.x,-q.y);shadow(x,y-.52,s);
    // legs for Osama only
    if(kind==='osama'){const swing=Math.sin(ph*TAU)*.24;const hipL={x:x-.28*s,y:y+.78*s,z:0},hipR={x:x+.28*s,y:y+.78*s,z:0},kL={x:hipL.x+Math.sin(swing)*.18*s,y:y+.07*s,z:.06},kR={x:hipR.x+Math.sin(-swing)*.18*s,y:y+.07*s,z:.05};line3(hipL,kL,.20*s,'#19191d');line3(kL,{x:kL.x,y:y-.55*s,z:.10},.18*s,'#19191d');line3(hipR,kR,.20*s,'#19191d');line3(kR,{x:kR.x,y:y-.55*s,z:.10},.18*s,'#19191d');ellipse3({x:kL.x+.05*s,y:y-.62*s,z:.10},.30*s,.11*s,'#131317');ellipse3({x:kR.x+.05*s,y:y-.62*s,z:.10},.30*s,.11*s,'#131317')}
    if(kind==='osama'){poly3([{x:x-.67*s,y:y+1.42*s,z},{x:x+.67*s,y:y+1.42*s,z},{x:x+.54*s,y:y+.43*s,z:z+.02},{x:x-.54*s,y:y+.43*s,z:z+.02}], '#b9bcc6');poly3([{x:x-.08*s,y:y+1.42*s,z:.08},{x:x+.08*s,y:y+1.42*s,z:.08},{x:x+.07*s,y:y+.70*s,z:.10},{x:x-.07*s,y:y+.70*s,z:.10}], '#2a70c4')}else{poly3([{x:x-.54*s,y:y+1.46*s,z},{x:x+.54*s,y:y+1.46*s,z},{x:x+1.0*s,y:y+.25*s,z:z-.02},{x:x-1.0*s,y:y+.25*s,z:z-.02}], '#b391bd');for(let i=0;i<9;i++)ellipse3({x:x-.42*s+i*.105*s,y:y+1.35*s,z:.16},.034*s,.034*s,'#f7f4ef')}
    const shL={x:x-.54*s,y:y+1.32*s,z:.08},shR={x:x+.54*s,y:y+1.32*s,z:.08};let eL,hL,eR,hR;
    if(pose==='highfive'){if(kind==='osama'){eL={x:x-.70*s,y:y+.87*s,z:.06};hL={x:x-.90*s,y:y+.38*s,z:.10};eR={x:x+.76*s,y:y+1.47*s,z:.18};hR={x:x+1.02*s,y:y+1.96*s,z:.27}}else{eL={x:x-.76*s,y:y+1.47*s,z:.18};hL={x:x-1.02*s,y:y+1.96*s,z:.27};eR={x:x+.70*s,y:y+.87*s,z:.06};hR={x:x+.88*s,y:y+.39*s,z:.10}}}
    else if(pose==='lift'){if(kind==='osama'){eL={x:x-.78*s,y:y+1.05*s,z:.15};hL={x:x-.02*s,y:y+.78*s,z:.35};eR={x:x+.78*s,y:y+1.04*s,z:.16};hR={x:x+.82*s,y:y+.77*s,z:.38}}else{eL={x:x-.68*s,y:y+1.30*s,z:.16};hL={x:x-1.00*s,y:y+1.55*s,z:.20};eR={x:x+.68*s,y:y+1.20*s,z:.16};hR={x:x+1.04*s,y:y+1.52*s,z:.18}}}
    else if(['shuffle','dance3','hold'].includes(pose)){eL={x:x-.34*s,y:y+1.02*s,z:.12};hL={x:x-.72*s,y:y+.78*s,z:.32};eR={x:x+.50*s,y:y+.90*s,z:.06};hR={x:x+.76*s,y:y+.40*s,z:.10}}
    else if(pose==='hug'){eL={x:x-.56*s,y:y+1.00*s,z:.06};hL={x:x-.82*s,y:y+.43*s,z:.10};eR={x:x+.36*s,y:y+1.06*s,z:.22};hR={x:x+.68*s,y:y+.95*s,z:.34}}
    else if(pose==='push'){
      if(opts.pushSide==='left'){eL={x:x-.78*s,y:y+1.08*s,z:.18};hL={x:x-1.16*s,y:y+1.42*s,z:.30};eR={x:x+.62*s,y:y+.92*s,z:.06};hR={x:x+.80*s,y:y+.38*s,z:.10}}
      else{eL={x:x-.62*s,y:y+.92*s,z:.06};hL={x:x-.80*s,y:y+.38*s,z:.10};eR={x:x+.78*s,y:y+1.08*s,z:.18};hR={x:x+1.16*s,y:y+1.42*s,z:.30}}
    }
    else{const sw=Math.sin(ph*TAU)*.20;eL={x:shL.x+sw*s,y:y+.88*s,z:.06};hL={x:eL.x+sw*s,y:y+.38*s,z:.11};eR={x:shR.x-sw*s,y:y+.88*s,z:.06};hR={x:eR.x-sw*s,y:y+.38*s,z:.11}}
    const sleeve=kind==='osama'?'#adb0b9':'#b691c1';line3(shL,eL,.15*s,sleeve);line3(eL,hL,.11*s,'#c88969');line3(shR,eR,.15*s,sleeve);line3(eR,hR,.11*s,'#d49b7a');ellipse3({...hL,z:hL.z+.04},.12*s,.12*s,'#c88969');ellipse3({...hR,z:hR.z+.04},.12*s,.12*s,'#d49b7a');drawFallbackHead({x,y:y+2.12*s,z:.10},kind,opts.headTilt||0);ctx.restore();
  }
  function drawFallbackCouple(ph,pose){let ax=-4.4,bx=4.4,scale=.92,ay=-0,by=-0,leanA=0,leanB=0,yB=0;if(pose==='approach'){const e=easeInOut(clamp(ph,0,1));ax=lerp(-4.4,-1.20,e);bx=lerp(4.4,1.20,e);scale=lerp(.68,.94,e)}if(pose==='count3'){ax=-1.88;bx=1.88;scale=1.0}if(pose==='count2'){ax=-1.50;bx=1.50;scale=1.04}if(pose==='count1'){ax=-1.06;bx=1.06;scale=1.10}if(pose==='hold'){ax=-.72;bx=.72;scale=1.08}if(pose==='highfive'){ax=-.76;bx=.76;scale=1.06}if(pose==='dance1'||pose==='dance3'){ax=-.78;bx=.78;scale=1.04}if(pose==='shuffle'){ax=-.69;bx=.69;scale=1.04}if(pose==='hug'){ax=-.24;bx=.24;scale=1.06}if(pose==='lift'){const th=ph*TAU;ax=-.18+Math.sin(th)*.10;bx=.34+Math.cos(th)*.62;by=.55+.12*Math.sin(th);leanB=.10*Math.sin(th);yB=.58}drawFallbackPerson('osama',ax,scale,pose,ph,{lean:leanA});drawFallbackPerson('rania',bx,scale,pose,ph+.10,{yShift:yB,lean:leanB,headTilt:leanB*.5});if(['hold','dance3','shuffle'].includes(pose))line3({x:-.08,y:-1.55,z:.42},{x:.08,y:-1.55,z:.42},.10,'#c88969',.98);if(pose==='highfive')text('✨',viewW/2,viewH*.27,26,.82);if(pose==='lift')text('💖',viewW/2,viewH*.22,30,.80)}

  /* ----------------------------- 2D boot/classic effects ----------------------------- */
  function drawBoot2D(t){
    const total=sceneData?.total||29;if(t<5.9)return;
    const e=clamp((t-5.9)/Math.max(1,total-5.9),0,1);
    for(let i=0;i<24;i++){const x=(i*83.7%100)/100*viewW,y=((t*(30+i%6)*18+i*131)%120-10)/100*viewH;const g=['❤️','🌹','🌸','💋','✨','💕'][i%6];ctx.save();ctx.globalAlpha=.18+.15*Math.sin(t*2+i);ctx.font=`${16+(i%4)*4}px system-ui`;ctx.fillText(g,x,y);ctx.restore()}
    for(let i=0;i<10;i++){const a=i/10*TAU+t*.55,x=viewW/2+Math.cos(a)*viewW*.26,y=viewH*.50+Math.sin(a)*viewH*.27;ctx.save();ctx.globalAlpha=.32+.18*(1-e);ctx.font=`${18+(i%3)*5}px system-ui`;ctx.fillText(['✨','💖','🌸','💕'][i%4],x,y);ctx.restore()}
  }
  function drawDog(x,z,step,scale=1){const y=-2.55+Math.abs(Math.sin(step*TAU))*.02;shadow(x,-2.98,scale);ellipse3({x,y:y+.85*scale,z},.78*scale,.48*scale,'#f7f7f4');ellipse3({x:x+.48*scale,y:y+1.03*scale,z:z+.06},.40*scale,.36*scale,'#fff');poly3([{x:x+.72*scale,y:y+1.25*scale,z:z+.08},{x:x+1.04*scale,y:y+1.53*scale,z:z+.08},{x:x+.85*scale,y:y+1.04*scale,z:z+.08}], '#fff');poly3([{x:x+.25*scale,y:y+1.28*scale,z:z+.08},{x:x+.09*scale,y:y+1.60*scale,z:z+.08},{x:x+.48*scale,y:y+1.42*scale,z:z+.08}], '#ecebe9');const legs=[-.46,-.10,.28,.55];for(let i=0;i<4;i++){const a=(i%2?-.28:.28)*Math.sin(step*TAU);const hx=x+legs[i]*scale,hy=y+.62*scale;line3({x:hx,y:hy,z},{x:hx+a*scale,y:hy-.70*scale,z:z+.03},.14*scale,'#d8d5d4')}line3({x:x-.70*scale,y:y+.94*scale,z:z-.02},{x:x-1.04*scale,y:y+1.20*scale+Math.sin(step*TAU)*.12,z},.11*scale,'#f0eeec');ellipse3({x:x+.60*scale,y:y+1.08*scale,z:z+.24},.055*scale,.065*scale,'#241e22');line3({x:x+.24*scale,y:y+1.24*scale,z:z+.12},{x:x+.73*scale,y:y+1.13*scale,z:z+.12},.09*scale,'#3e6fb9');for(let i=-2;i<=2;i++)line3({x:x+.18*scale+i*.12*scale,y:y+1.20*scale,z:z+.05},{x:x+.16*scale+i*.16*scale,y:y+1.48*scale,z:z-.01},.06*scale,'#fff',.9)}
  function drawHorse(x,z,step,scale=1){const y=-2.55;shadow(x,-3,scale);ellipse3({x,y:y+.92*scale,z},1.02*scale,.50*scale,'#8c5d43');line3({x:x+.70*scale,y:y+1.05*scale,z},{x:x+1.08*scale,y:y+1.85*scale,z:z+.02},.43*scale,'#8c5d43');ellipse3({x:x+1.18*scale,y:y+2.02*scale,z:z+.04},.48*scale,.34*scale,'#8c5d43');poly3([{x:x+1.34*scale,y:y+2.30*scale,z},{x:x+1.52*scale,y:y+2.52*scale,z},{x:x+1.36*scale,y:y+2.18*scale,z}], '#6e4333');for(let i=0;i<4;i++){const lx=x+(-.58+i*.38)*scale;const a=(i%2?-.18:.18)*Math.sin(step*TAU);line3({x:lx,y:y+.62*scale,z},{x:lx+a*scale,y:y-.75*scale,z:z+.02},.16*scale,'#6e4333')}line3({x:x+.82*scale,y:y+1.64*scale,z:z-.02},{x:x+.98*scale,y:y+1.92*scale,z:z-.04},.12*scale,'#3b241e');line3({x:x-1.00*scale,y:y+1.04*scale,z},{x:x-1.35*scale,y:y+1.28*scale,z},.12*scale,'#3b241e')}
  function drawRobinson(x,z,step,scale=1){const y=-2.5+Math.abs(Math.sin(step*TAU))*.03;shadow(x,-3,scale);line3({x,y:y+.65*scale,z},{x,y:y+1.42*scale,z},.30*scale,'#75644c');line3({x,y:y+1.45*scale,z},{x:x-.30*scale,y:y+2.18*scale,z},.16*scale,'#d19a72');drawHead2({x:x-.30*scale,y:y+2.30*scale,z:z+.06},'#c48769','#2c2424',false,false,true,0);line3({x:x-.23*scale,y:y+1.15*scale,z:z+.06},{x:x-.66*scale,y:y+.78*scale,z:z+.06},.12*scale,'#7f6b50');line3({x:x+.23*scale,y:y+1.15*scale,z:z+.06},{x:x+.58*scale,y:y+.83*scale,z:z+.08},.12*scale,'#7f6b50');line3({x:x-.10*scale,y:y+.7*scale,z},{x:x-.22*scale,y:y-.55*scale,z:z+.05},.14*scale,'#4b3f35');line3({x:x+.10*scale,y:y+.7*scale,z},{x:x+.30*scale,y:y-.55*scale,z:z+.05},.14*scale,'#4b3f35')}
  function drawHead2(p,skin,hair,beard=false,longHair=false,smile=true,tilt=0){const q=proj2(p),u=viewH/5.8;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(tilt);ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,0,.58*q.s*u,.72*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,-.40*q.s*u,.61*q.s*u,.35*q.s*u,0,Math.PI,TAU);ctx.fill();if(longHair){ctx.beginPath();ctx.ellipse(-.46*q.s*u,.28*q.s*u,.20*q.s*u,.62*q.s*u,0,0,TAU);ctx.ellipse(.46*q.s*u,.28*q.s*u,.20*q.s*u,.62*q.s*u,0,0,TAU);ctx.fill()}ctx.fillStyle='#231c20';ctx.beginPath();ctx.ellipse(-.19*q.s*u,-.03*q.s*u,.075*q.s*u,.095*q.s*u,0,0,TAU);ctx.ellipse(.19*q.s*u,-.03*q.s*u,.075*q.s*u,.095*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-.16*q.s*u,-.06*q.s*u,.022*q.s*u,0,TAU);ctx.arc(.22*q.s*u,-.06*q.s*u,.022*q.s*u,0,TAU);ctx.fill();if(beard){ctx.fillStyle='#2e2528';ctx.beginPath();ctx.ellipse(0,.33*q.s*u,.42*q.s*u,.28*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,.24*q.s*u,.34*q.s*u,.20*q.s*u,0,0,TAU);ctx.fill()}if(smile){ctx.strokeStyle='#6b2637';ctx.lineWidth=Math.max(1,2.2*q.s);ctx.lineCap='round';ctx.beginPath();ctx.arc(0,.18*q.s*u,.18*q.s*u,.15*Math.PI,.85*Math.PI);ctx.stroke()}ctx.restore()}
  function drawPrincess(x,z,step,scale=1){const y=-2.52+Math.abs(Math.sin(step*TAU))*.02;shadow(x,-3,scale);poly3([{x:x-.90*scale,y:y+.22*scale,z},{x:x+.90*scale,y:y+.22*scale,z},{x:x+.50*scale,y:y+1.55*scale,z},{x:x-.50*scale,y:y+1.55*scale,z}], '#93a7e9');line3({x:x-.34*scale,y:y+1.25*scale,z:z+.06},{x:x-.78*scale,y:y+1.78*scale,z:z+.11},.11*scale,'#d9a27c');line3({x:x+.34*scale,y:y+1.25*scale,z:z+.06},{x:x+.82*scale,y:y+1.52*scale,z:z+.11},.11*scale,'#d9a27c');drawHead2({x,y:y+1.98*scale,z:z+.08},'#d8a07c','#8d684e',false,true,true,0);line3({x:x+.82*scale,y:y+1.52*scale,z:z+.12},{x:x+1.26*scale,y:y+1.92*scale+Math.sin(step*TAU)*.16,z:z+.22},.055*scale,'#e7d5c4');ellipse3({x:x+1.31*scale,y:y+1.98*scale+Math.sin(step*TAU)*.16,z:z+.23},.12*scale,.12*scale,'#ffd85a')}
  function drawTomJerry(x,z,step,scale=1){const cx=x+Math.sin(step*TAU)*.28;ellipse3({x:cx-.65*scale,y:-2.70+1.0*scale,z},.72*scale,.42*scale,'#7e8792');ellipse3({x:cx-.65*scale,y:-2.70+1.47*scale,z:z+.02},.40*scale,.40*scale,'#7e8792');poly3([{x:cx-.92*scale,y:-2.70+1.75*scale,z:z+.02},{x:cx-1.04*scale,y:-2.70+2.02*scale,z:z+.02},{x:cx-.73*scale,y:-2.70+1.86*scale,z:z+.02}], '#7e8792');poly3([{x:cx-.43*scale,y:-2.70+1.75*scale,z:z+.02},{x:cx-.32*scale,y:-2.70+2.02*scale,z:z+.02},{x:cx-.56*scale,y:-2.70+1.86*scale,z:z+.02}], '#7e8792');ellipse3({x:cx+.42*scale,y:-2.76+.72*scale,z:z+.10},.33*scale,.23*scale,'#c98552');ellipse3({x:cx+.42*scale,y:-2.76+1.02*scale,z:z+.12},.20*scale,.22*scale,'#c98552');line3({x:cx+.62*scale,y:-2.76+.70*scale,z:z},{x:cx+1.12*scale,y:-2.76+1.05*scale,z:z},.06*scale,'#c98552');text('💨 💥',viewW/2,viewH*.30,30,.78)}
  function drawMashaBear(x,z,step,scale=1){const y=-2.55;shadow(x,-3,scale);ellipse3({x:x+.58*scale,y:y+1.0*scale,z},.88*scale,.55*scale,'#9a6d49');ellipse3({x:x+.58*scale,y:y+1.72*scale,z:z+.04},.52*scale,.48*scale,'#9a6d49');ellipse3({x:x+.34*scale,y:y+2.03*scale,z:z+.08},.11*scale,.11*scale,'#d7ad7d');ellipse3({x:x+.82*scale,y:y+2.03*scale,z:z+.08},.11*scale,.11*scale,'#d7ad7d');const gy=y+.65*scale;poly3([{x:x-.88*scale,y:gy,z},{x:x-.05*scale,y:gy,z},{x:x-.18*scale,y:y+1.62*scale,z},{x:x-1.00*scale,y:y+1.42*scale,z}], '#e3a2bb');drawHead2({x:x-.60*scale,y:y+1.88*scale,z:z+.08},'#dfa27f','#6c3b34',false,true,true,0);line3({x:x+.1*scale,y:y+1.0*scale,z:z+.10},{x:x-.45*scale,y:y+1.58*scale+Math.sin(step*TAU)*.16,z:z+.12},.10*scale,'#e3a2bb')}
  function drawShaun(x,z,step,scale=1){const y=-2.62;shadow(x,-3,scale);ellipse3({x,y:y+.92*scale,z},.92*scale,.55*scale,'#f5f2ee');ellipse3({x:x+.72*scale,y:y+1.22*scale,z:z+.05},.42*scale,.34*scale,'#2d2a2b');ellipse3({x:x+.54*scale,y:y+1.30*scale,z:z+.16},.055*scale,.065*scale,'#fff');ellipse3({x:x+.88*scale,y:y+1.30*scale,z:z+.16},.055*scale,.065*scale,'#fff');for(let i=0;i<4;i++){const lx=x+(-.55+i*.36)*scale;const a=(i%2?-.18:.18)*Math.sin(step*TAU);line3({x:lx,y:y+.56*scale,z},{x:lx+a*scale,y:y-.70*scale,z:z+.05},.14*scale,'#2d2a2b')}line3({x:x-.82*scale,y:y+1.02*scale,z:z-.02},{x:x-1.14*scale,y:y+1.30*scale,z:z-.01},.08*scale,'#f5f2ee')}
  function drawSponge(x,z,step,scale=1){const y=-2.55;shadow(x,-3,scale);poly3([{x:x-.72*scale,y:y+.25*scale,z},{x:x+.72*scale,y:y+.25*scale,z},{x:x+.62*scale,y:y+1.75*scale,z:z+.03},{x:x-.62*scale,y:y+1.75*scale,z:z+.03}], '#f3d64a');ellipse3({x:x-.22*scale,y:y+1.42*scale,z:z+.16},.13*scale,.17*scale,'#fff');ellipse3({x:x+.22*scale,y:y+1.42*scale,z:z+.16},.13*scale,.17*scale,'#fff');ellipse3({x:x-.22*scale,y:y+1.42*scale,z:z+.20},.055*scale,.07*scale,'#42a5c5');ellipse3({x:x+.22*scale,y:y+1.42*scale,z:z+.20},.055*scale,.07*scale,'#42a5c5');const q=proj2({x,y:y+1.08*scale,z:z+.22});ctx.save();ctx.strokeStyle='#7b3d35';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,20*scale*q.s,.12*Math.PI,.88*Math.PI);ctx.stroke();ctx.restore();const legY=y+.22*scale;line3({x:x-.34*scale,y:legY,z},{x:x-.34*scale,y:legY-.55*scale,z:z+.05},.12*scale,'#f3efe1');line3({x:x+.34*scale,y:legY,z},{x:x+.34*scale,y:legY-.55*scale,z:z+.05},.12*scale,'#f3efe1')}
  function drawClassic(t){if(!sceneData)return;const st=clamp(t/sceneData.life,0,1),msg=sceneData.message||'بحبك ❤️';if(sceneData.scene==='dog'){drawDog(lerp(-4.5,1.6,easeInOut(st)),0,t*.25,.95);text(msg,viewW*.50,viewH*.18,Math.min(viewW*.055,34),1)}else if(sceneData.scene==='gift'){drawDog(-1.7,0,t*.22,.9);text('🎁',viewW*.50,viewH*.22,52,1);text(msg,viewW*.50,viewH*.15,Math.min(viewW*.05,30),.96)}else if(sceneData.scene==='fish'){text('🎈',viewW*.54,viewH*.35,60,1);text('🐟',viewW*(0.08+0.82*st),viewH*.42,42,1);text(msg,viewW*.50,viewH*.18,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='cinderella'){drawPrincess(0,0,t*.32,.96);text(msg,viewW*.50,viewH*.16,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='tomjerry'){drawTomJerry(0,0,t*.7,.94);text(msg,viewW*.50,viewH*.17,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='robinson'){drawRobinson(-1.5,0,t*.5,.84);drawHorse(1.2,0,t*.5,.82);text(msg,viewW*.50,viewH*.17,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='masha'){drawMashaBear(0,0,t*.45,.92);text(msg,viewW*.50,viewH*.17,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='sponge'){drawSponge(0,0,t*.65,.95);text(msg,viewW*.50,viewH*.17,Math.min(viewW*.052,32),1)}else if(sceneData.scene==='shaun'){drawShaun(0,0,t*.45,.94);text(msg,viewW*.50,viewH*.17,Math.min(viewW*.052,32),1)}for(let i=0;i<12;i++){const a=i*.8+t*.8,x=viewW/2+Math.cos(a)*viewW*.30,y=viewH*.52+Math.sin(a)*viewH*.28;ctx.save();ctx.globalAlpha=.35;ctx.font='24px system-ui';ctx.fillText(['✨','❤️','🌹','💋'][i%4],x,y);ctx.restore()}if(t>=sceneData.life)finish()}

  /* ----------------------------- animation control ----------------------------- */
  function setup(){setupUI();makeGL();}
  function show(){setup();active=true;uiCanvas.style.display='block';if(glCanvas)glCanvas.style.display=(mode==='classic'?'none':'block');startLoop()}
  function hide(){active=false;if(uiCanvas)uiCanvas.style.display='none';if(glCanvas)glCanvas.style.display='none';sceneData=null;mode='idle';}
  function startLoop(){if(raf)return;const loop=()=>{raf=0;if(!active)return;drawFrame();raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}
  function finish(){if(onDone){const f=onDone;onDone=null;hide();setTimeout(()=>{try{f()}catch{}},0)}else hide()}
  function clearUI(){if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewW,viewH)}
  function drawFrame(){
    const t=(performance.now()-started)/1000;
    clearUI();
    gradientBg();
    if(mode==='classic'){
      if(glCanvas)glCanvas.style.display='none';
      drawClassic(t);
    }else if(glReady){
      glCanvas.style.display='block';
      gl.viewport(0,0,glCanvas.width,glCanvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if(mode==='boot'){
        if(t<2)drawCouple3D(t/2,'approach');
        else if(t<2.9)drawCouple3D(0,'count3');
        else if(t<3.8)drawCouple3D(0,'count2');
        else if(t<4.7)drawCouple3D(0,'count1');
        else if(t<5.9)drawCouple3D(easeInOut((t-4.7)/1.2),'highfive');
        else drawCouple3D((t-5.9)/Math.max(1,sceneData.total-5.9),['dance1','lift','dance3','hug','shuffle'][sceneData.dance||0]);
        drawBoot2D(t);
      }else{
        drawPage3D(t);
      }
    }else{
      if(glCanvas)glCanvas.style.display='none';
      if(mode==='boot'){
        if(t<2)drawFallbackCouple(t/2,'approach');
        else if(t<2.9)drawFallbackCouple(0,'count3');
        else if(t<3.8)drawFallbackCouple(0,'count2');
        else if(t<4.7)drawFallbackCouple(0,'count1');
        else if(t<5.9)drawFallbackCouple(easeInOut((t-4.7)/1.2),'highfive');
        else drawFallbackCouple((t-5.9)/Math.max(1,sceneData.total-5.9),['dance1','lift','dance3','hug','shuffle'][sceneData.dance||0]);
        drawBoot2D(t);
      }else{
        const ch=sceneData.character==='osama'?'osama':'rania';
        drawFallbackPerson(ch,ch==='osama'?2.55:-2.55,.58,'push',t,{pushSide:ch==='osama'?'left':'right'});
      }
    }
    if(t>=duration&&mode!=='classic')finish();
  }
  API.bootSequence=function(){return new Promise(resolve=>{const celebrate=23+Math.floor(Math.random()*8);run('boot',{total:celebrate+5.9,dance:Math.floor(Math.random()*5)},celebrate+5.9,resolve)})};
  function run(type,data,seconds,cb){setup();mode=type;sceneData=data;started=performance.now();duration=seconds;data.total=seconds;onDone=cb||null;show()}
  API.pageTurn=function(dir){run('page',{character:dir>0?'osama':'rania'},.92)};
  API.classicRandom=function(message){const scenes=['dog','fish','cinderella','gift','tomjerry','robinson','masha','sponge','shaun'],scene=scenes[Math.floor(Math.random()*scenes.length)];run('classic',{scene,message:String(message||'بحبك ❤️'),life:Math.max(8.4,Math.min(12.6,9.6+Math.random()*3))},10.2);return scene};
  API.classic=function(scene,message){const allowed=['dog','fish','cinderella','gift','tomjerry','robinson','masha','sponge','shaun'];if(!allowed.includes(scene))scene='dog';run('classic',{scene,message:String(message||'بحبك ❤️'),life:10.2},10.2)};
  API.stop=function(){onDone=null;hide()};
  window.OsRa3D=API;
})();
