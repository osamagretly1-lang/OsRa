/* OsRa 3D Miniatures — R44
 * Self-contained lightweight 3D-style renderer. No CDN, no cloud, no image overlays.
 * Builds actual 3D-coordinate meshes from primitives and projects them with perspective
 * onto a transparent canvas, keeping the offline app fast and self-contained.
 */
(function(){
  'use strict';
  const API={};
  let canvas=null,ctx=null,raf=0,active=false,mode='idle',started=0,duration=0,onDone=null;
  let sceneData=null;
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rgb=(hex,amt=0)=>{
    const h=hex.replace('#','');
    let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    r=clamp(r+amt,0,255);g=clamp(g+amt,0,255);b=clamp(b+amt,0,255);
    return `rgb(${r},${g},${b})`;
  };
  function setup(){
    if(canvas)return;
    canvas=document.createElement('canvas');canvas.id='osra3dCanvas';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:100003;pointer-events:none;display:none;overflow:hidden;';
    document.body.appendChild(canvas);ctx=canvas.getContext('2d',{alpha:true});
    resize();window.addEventListener('resize',resize,{passive:true});
  }
  function resize(){if(!canvas)return;const d=Math.min(1.35,Math.max(1,window.devicePixelRatio||1));canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);canvas._d=d;}
  function show(){setup();canvas.style.display='block';active=true;startLoop();}
  function hide(){active=false;if(canvas){canvas.style.display='none';}sceneData=null;mode='idle';}
  function startLoop(){if(raf)return;const loop=()=>{raf=0;if(!active)return;drawFrame();raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}

  // Perspective projection: x/y/z are real 3D coordinates. Positive z moves toward camera.
  function proj(p){
    const f=11, z=clamp(p.z,-5,5), s=f/(f-z), d=canvas._d||1;
    return {x:innerWidth/2+p.x*s*(innerHeight/5.8),y:innerHeight/2-p.y*s*(innerHeight/5.8),s:s,d:d};
  }
  function line3(a,b,w,color,alpha=1){
    const A=proj(a),B=proj(b);ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,w*((A.s+B.s)/2));ctx.lineCap='round';ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.restore();
  }
  function ellipse3(p,rx,ry,color,alpha=1,stroke=null,sw=1){
    const q=proj(p);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(q.x,q.y,rx*q.s*(innerHeight/5.8),ry*q.s*(innerHeight/5.8),0,0,TAU);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke()}ctx.restore();
  }
  function poly3(pts,color,alpha=1,stroke=null){
    if(!pts?.length)return;const q=pts.map(proj);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);for(let i=1;i<q.length;i++)ctx.lineTo(q[i].x,q[i].y);ctx.closePath();ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}ctx.restore();
  }
  function shadow(x,y,s=1){const q=proj({x,y,z:-.7});ctx.save();ctx.globalAlpha=.17;ctx.fillStyle='#2b2030';ctx.beginPath();ctx.ellipse(q.x,q.y,72*s*q.s,16*s*q.s,0,0,TAU);ctx.fill();ctx.restore();}
  function text(txt,x,y,size,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.font=`800 ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(58,29,50,.92)';ctx.shadowColor='rgba(255,255,255,.85)';ctx.shadowBlur=6;ctx.fillText(txt,x,y);ctx.restore();}
  function gradientBg(){
    const g=ctx.createLinearGradient(0,0,0,innerHeight);g.addColorStop(0,'rgba(255,250,252,.12)');g.addColorStop(1,'rgba(255,221,238,.08)');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  function drawHead(p,skin,hair,beard=false,longHair=false,smile=true,tilt=0){
    const q=proj(p),u=innerHeight/5.8;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(tilt);ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,0,0.58*q.s*u,0.72*q.s*u,0,0,TAU);ctx.fill();
    // hair cap
    ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,-.40*q.s*u,.61*q.s*u,.35*q.s*u,0,Math.PI,TAU);ctx.fill();
    if(longHair){ctx.beginPath();ctx.ellipse(-.46*q.s*u,.28*q.s*u,.20*q.s*u,.62*q.s*u,0,0,TAU);ctx.ellipse(.46*q.s*u,.28*q.s*u,.20*q.s*u,.62*q.s*u,0,0,TAU);ctx.fill();}
    // eyes
    ctx.fillStyle='#231c20';ctx.beginPath();ctx.ellipse(-.19*q.s*u,-.03*q.s*u,.075*q.s*u,.095*q.s*u,0,0,TAU);ctx.ellipse(.19*q.s*u,-.03*q.s*u,.075*q.s*u,.095*q.s*u,0,0,TAU);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-.16*q.s*u,-.06*q.s*u,.022*q.s*u,0,TAU);ctx.arc(.22*q.s*u,-.06*q.s*u,.022*q.s*u,0,TAU);ctx.fill();
    if(beard){ctx.fillStyle='#2e2528';ctx.beginPath();ctx.ellipse(0,.33*q.s*u,.42*q.s*u,.28*q.s*u,0,0,TAU);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,.24*q.s*u,.34*q.s*u,.20*q.s*u,0,0,TAU);ctx.fill();}
    if(smile){ctx.strokeStyle='#6b2637';ctx.lineWidth=Math.max(1,2.2*q.s);ctx.lineCap='round';ctx.beginPath();ctx.arc(0,.18*q.s*u,.18*q.s*u,.15*Math.PI,.85*Math.PI);ctx.stroke();}
    ctx.restore();
  }
  function drawPerson(kind,x,z,scale,pose,step){
    const y0=-2.45;const s=scale;
    const skin='#c88969';
    const forward=pose==='walk'||pose==='approach';
    const handHold=pose==='hold'||pose==='dance3';
    const high=pose==='highfive';
    const hug=pose==='hug';
    const jump=pose==='dance2'||pose==='dance3';
    const t=step;
    const legA=Math.sin(t*TAU)*.45,legB=-legA;
    const armA=Math.sin(t*TAU+Math.PI)*.35,armB=-armA;
    let bob=jump?Math.abs(Math.sin(t*Math.PI*2))*0.35:0;
    if(pose==='dance1') bob=.12*Math.sin(t*TAU);
    if(pose==='dance2') bob=Math.abs(Math.sin(t*TAU))*0.55;
    if(pose==='dance4') bob=.10*Math.sin(t*TAU);
    const base={x,y:y0+bob,z};shadow(x,y0-.52,z===0?1:scale);
    // legs
    const hipL={x:x-.28*s,y:base.y+.80*s,z:z};const hipR={x:x+.28*s,y:base.y+.80*s,z:z};
    const kneeL={x:hipL.x+Math.sin(legA)*.25*s,y:hipL.y-.78*s+Math.abs(Math.sin(legA))*.14*s,z:z+.10};
    const kneeR={x:hipR.x+Math.sin(legB)*.25*s,y:hipR.y-.78*s+Math.abs(Math.sin(legB))*.14*s,z:z+.08};
    const footL={x:kneeL.x+Math.sin(legA)*.18*s,y:kneeL.y-.65*s,z:z+.16};const footR={x:kneeR.x+Math.sin(legB)*.18*s,y:kneeR.y-.65*s,z:z+.15};
    const pant=kind==='osama'?'#17171b':'#b8a1c7';
    line3(hipL,kneeL,.22*s,pant);line3(kneeL,footL,.20*s,pant);line3(hipR,kneeR,.22*s,pant);line3(kneeR,footR,.20*s,pant);
    ellipse3({...footL,y:footL.y-.05},.30*s,.12*s,'#17171b');ellipse3({...footR,y:footR.y-.05},.30*s,.12*s,'#17171b');
    // torso
    if(kind==='osama'){
      poly3([{x:x-.68*s,y:base.y+1.45*s,z},{x:x+.68*s,y:base.y+1.45*s,z},{x:x+.56*s,y:base.y+.45*s,z:z+.02},{x:x-.56*s,y:base.y+.45*s,z:z+.02}], '#b9bcc6');
      poly3([{x:x-.12*s,y:base.y+1.50*s,z:z+.08},{x:x+.12*s,y:base.y+1.50*s,z:z+.08},{x:x+.10*s,y:base.y+.72*s,z:z+.09},{x:x-.10*s,y:base.y+.72*s,z:z+.09}], '#2567b8');
      line3({x:x-.25*s,y:base.y+1.4*s,z:z+.05},{x:x-.13*s,y:base.y+.7*s,z:z+.05},.08*s,'#f7f7fa');
    }else{
      poly3([{x:x-.54*s,y:base.y+1.5*s,z},{x:x+.54*s,y:base.y+1.5*s,z},{x:x+1.05*s,y:base.y+.35*s,z:z-.02},{x:x-1.05*s,y:base.y+.35*s,z:z-.02}], '#b391bd');
      poly3([{x:x-.44*s,y:base.y+1.45*s,z:z+.03},{x:x+.44*s,y:base.y+1.45*s,z:z+.03},{x:x+.24*s,y:base.y+.75*s,z:z+.03},{x:x-.24*s,y:base.y+.75*s,z:z+.03}], '#c39ac9');
      // pearl accents
      for(let i=0;i<6;i++)ellipse3({x:x-.42*s+i*.17*s,y:base.y+1.33*s,z:z+.08},.035*s,.035*s,'#f6f3ef');
    }
    // arms
    const shoulderL={x:x-(kind==='osama'?.55:.53)*s,y:base.y+1.35*s,z:z+.08};
    const shoulderR={x:x+(kind==='osama'?.55:.53)*s,y:base.y+1.35*s,z:z+.08};
    let elbowL,elbowR,handL,handR;
    if(high){
      elbowL={x:x-.82*s,y:base.y+1.55*s,z:z+.12};elbowR={x:x+.82*s,y:base.y+1.55*s,z:z+.13};
      handL={x:x-.55*s,y:base.y+2.05*s,z:z+.22};handR={x:x+.55*s,y:base.y+2.05*s,z:z+.22};
    }else if(hug){
      elbowL={x:x+.25*s,y:base.y+1.04*s,z:z+.25};elbowR={x:x+.46*s,y:base.y+1.25*s,z:z+.27};
      handL={x:x+.56*s,y:base.y+1.10*s,z:z+.32};handR={x:x+.58*s,y:base.y+1.46*s,z:z+.31};
    }else if(handHold){
      const side=kind==='osama'?1:-1; // inner hands point toward partner
      elbowL={x:x+(side*.20)*s,y:base.y+1.00*s,z:z+.20};
      elbowR={x:x-(side*.45)*s,y:base.y+1.00*s,z:z+.20};
      handL={x:x+(side*.76)*s,y:base.y+.83*s,z:z+.32};
      handR={x:x-(side*.56)*s,y:base.y+.83*s,z:z+.27};
    }else{
      elbowL={x:shoulderL.x+armA*.45*s,y:base.y+.86*s+Math.abs(armA)*.08*s,z:z+.11};
      elbowR={x:shoulderR.x+armB*.45*s,y:base.y+.86*s+Math.abs(armB)*.08*s,z:z+.11};
      handL={x:elbowL.x+armA*.34*s,y:base.y+.34*s,z:z+.18};handR={x:elbowR.x+armB*.34*s,y:base.y+.34*s,z:z+.17};
    }
    const sleeve=kind==='osama'?'#aeb1ba':'#b691c1';
    line3(shoulderL,elbowL,.14*s,sleeve);line3(elbowL,handL,.12*s,skin);line3(shoulderR,elbowR,.14*s,sleeve);line3(elbowR,handR,.12*s,skin);
    ellipse3({...handL,z:handL.z+.04},.13*s,.13*s,skin);ellipse3({...handR,z:handR.z+.04},.13*s,.13*s,skin);
    // head
    drawHead({x:x,y:base.y+2.15*s,z:z+.08},skin,kind==='osama'?'#201b1c':'#6f5148',kind==='osama',kind!=='osama',true,0);
  }
  function drawDog(x,z,step,scale=1){
    const y=-2.55+Math.abs(Math.sin(step*TAU))*0.02;shadow(x,-2.98,scale);
    ellipse3({x,y:y+.85*scale,z},.78*scale,.48*scale,'#f7f7f4');ellipse3({x:x+.48*scale,y:y+1.03*scale,z:z+.06},.40*scale,.36*scale,'#fff');
    poly3([{x:x+.72*scale,y:y+1.25*scale,z:z+.08},{x:x+1.04*scale,y:y+1.53*scale,z:z+.08},{x:x+.85*scale,y:y+1.04*scale,z:z+.08}], '#fff');
    poly3([{x:x+.25*scale,y:y+1.28*scale,z:z+.08},{x:x+.09*scale,y:y+1.60*scale,z:z+.08},{x:x+.48*scale,y:y+1.42*scale,z:z+.08}], '#ecebe9');
    const legs=[-.46,-.10,.28,.55];for(let i=0;i<4;i++){const a=(i%2?-.28:.28)*Math.sin(step*TAU);const hx=x+legs[i]*scale,hy=y+.62*scale;line3({x:hx,y:hy,z},{x:hx+a*scale,y:hy-.70*scale,z:z+.03},.14*scale,'#d8d5d4')}
    line3({x:x-.70*scale,y:y+.94*scale,z:z-.02},{x:x-1.04*scale,y:y+1.20*scale+Math.sin(step*TAU)*.12,z:z},.11*scale,'#f0eeec');
    ellipse3({x:x+.60*scale,y:y+1.08*scale,z:z+.24},.055*scale,.065*scale,'#241e22');
    // blue collar
    line3({x:x+.24*scale,y:y+1.24*scale,z:z+.12},{x:x+.73*scale,y:y+1.13*scale,z:z+.12},.09*scale,'#3e6fb9');
    // fluffy neck tufts for the requested long-haired white German Shepherd look
    for(let i=-2;i<=2;i++){line3({x:x+.18*scale+i*.12*scale,y:y+1.20*scale,z:z+.05},{x:x+.16*scale+i*.16*scale,y:y+1.48*scale,z:z-.01},.06*scale,'#ffffff',.9)}
  }
  function drawHorse(x,z,step,scale=1){
    const y=-2.55;shadow(x,-3.00,scale);ellipse3({x,y:y+.92*scale,z},1.02*scale,.50*scale,'#8c5d43');
    line3({x:x+.70*scale,y:y+1.05*scale,z:z},{x:x+1.08*scale,y:y+1.85*scale,z:z+.02},.43*scale,'#8c5d43');
    ellipse3({x:x+1.18*scale,y:y+2.02*scale,z:z+.04},.48*scale,.34*scale,'#8c5d43');
    poly3([{x:x+1.34*scale,y:y+2.30*scale,z:z},{x:x+1.52*scale,y:y+2.52*scale,z:z},{x:x+1.36*scale,y:y+2.18*scale,z:z}], '#6e4333');
    for(let i=0;i<4;i++){const lx=x+(-.58+i*.38)*scale;const a=(i%2?-.18:.18)*Math.sin(step*TAU);line3({x:lx,y:y+.62*scale,z:z},{x:lx+a*scale,y:y-.75*scale,z:z+.02},.16*scale,'#6e4333')}
    // mane/tail
    line3({x:x+.82*scale,y:y+1.64*scale,z:z-.02},{x:x+.98*scale,y:y+1.92*scale,z:z-.04},.12*scale,'#3b241e');
    line3({x:x-1.00*scale,y:y+1.04*scale,z:z},{x:x-1.35*scale,y:y+1.28*scale,z:z},.12*scale,'#3b241e');
  }
  function drawRobinson(x,z,step,scale=1){
    // explorer figure + horse
    const y=-2.5+Math.abs(Math.sin(step*TAU))*.03;shadow(x,-3,scale);
    line3({x:x,y:y+.65*scale,z},{x:x,y:y+1.42*scale,z},.30*scale,'#75644c');
    line3({x:x,y:y+1.45*scale,z},{x:x-.30*scale,y:y+2.18*scale,z},.16*scale,'#d19a72');
    drawHead({x:x-.30*scale,y:y+2.30*scale,z:z+.06},'#c48769','#2c2424',false,false,true,0);
    line3({x:x-.23*scale,y:y+1.15*scale,z:z+.06},{x:x-.66*scale,y:y+.78*scale,z:z+.06},.12*scale,'#7f6b50');
    line3({x:x+.23*scale,y:y+1.15*scale,z:z+.06},{x:x+.58*scale,y:y+.83*scale,z:z+.08},.12*scale,'#7f6b50');
    line3({x:x-.10*scale,y:y+.7*scale,z},{x:x-.22*scale,y:y-.55*scale,z:z+.05},.14*scale,'#4b3f35');
    line3({x:x+.10*scale,y:y+.7*scale,z},{x:x+.30*scale,y:y-.55*scale,z:z+.05},.14*scale,'#4b3f35');
  }
  function drawPrincess(x,z,step,scale=1){
    const y=-2.52+Math.abs(Math.sin(step*TAU))*0.02;shadow(x,-3,scale);
    poly3([{x:x-.90*scale,y:y+.22*scale,z},{x:x+.90*scale,y:y+.22*scale,z},{x:x+.50*scale,y:y+1.55*scale,z},{x:x-.50*scale,y:y+1.55*scale,z}], '#93a7e9');
    line3({x:x-.34*scale,y:y+1.25*scale,z:z+.06},{x:x-.78*scale,y:y+1.78*scale,z:z+.11},.11*scale,'#d9a27c');
    line3({x:x+.34*scale,y:y+1.25*scale,z:z+.06},{x:x+.82*scale,y:y+1.52*scale,z:z+.11},.11*scale,'#d9a27c');
    drawHead({x,y:y+1.98*scale,z:z+.08},'#d8a07c','#8d684e',false,true,true,0);
    // wand waving
    line3({x:x+.82*scale,y:y+1.52*scale,z:z+.12},{x:x+1.26*scale,y:y+1.92*scale+Math.sin(step*TAU)*.16,z:z+.22},.055*scale,'#e7d5c4');
    ellipse3({x:x+1.31*scale,y:y+1.98*scale+Math.sin(step*TAU)*.16,z:z+.23},.12*scale,.12*scale,'#ffd85a');
  }
  function drawTomJerry(x,z,step,scale=1){
    // Tom + Jerry chase, no dog
    const cx=x+Math.sin(step*TAU)*.28;
    ellipse3({x:cx-0.65*scale,y:-2.70+1.0*scale,z:z},.72*scale,.42*scale,'#7e8792');
    ellipse3({x:cx-0.65*scale,y:-2.70+1.47*scale,z:z+.02},.40*scale,.40*scale,'#7e8792');
    poly3([{x:cx-.92*scale,y:-2.70+1.75*scale,z:z+.02},{x:cx-1.04*scale,y:-2.70+2.02*scale,z:z+.02},{x:cx-.73*scale,y:-2.70+1.86*scale,z:z+.02}], '#7e8792');
    poly3([{x:cx-.43*scale,y:-2.70+1.75*scale,z:z+.02},{x:cx-.32*scale,y:-2.70+2.02*scale,z:z+.02},{x:cx-.56*scale,y:-2.70+1.86*scale,z:z+.02}], '#7e8792');
    ellipse3({x:cx+0.42*scale,y:-2.76+0.72*scale,z:z+.10},.33*scale,.23*scale,'#c98552');
    ellipse3({x:cx+0.42*scale,y:-2.76+1.02*scale,z:z+.12},.20*scale,.22*scale,'#c98552');
    line3({x:cx+0.62*scale,y:-2.76+0.70*scale,z:z},{x:cx+1.12*scale,y:-2.76+1.05*scale,z:z},.06*scale,'#c98552');
    // motion marks
    text('💨 💥',innerWidth/2,innerHeight*.30,30,.78);
  }
  function drawMashaBear(x,z,step,scale=1){
    const y=-2.55;shadow(x,-3,scale);
    ellipse3({x:x+.58*scale,y:y+1.0*scale,z},.88*scale,.55*scale,'#9a6d49');
    ellipse3({x:x+.58*scale,y:y+1.72*scale,z:z+.04},.52*scale,.48*scale,'#9a6d49');
    ellipse3({x:x+.34*scale,y:y+2.03*scale,z:z+.08},.11*scale,.11*scale,'#d7ad7d');ellipse3({x:x+.82*scale,y:y+2.03*scale,z:z+.08},.11*scale,.11*scale,'#d7ad7d');
    const gy=y+.65*scale;poly3([{x:x-.88*scale,y:gy,z},{x:x-.05*scale,y:gy,z},{x:x-.18*scale,y:y+1.62*scale,z},{x:x-1.00*scale,y:y+1.42*scale,z}], '#e3a2bb');drawHead({x:x-.60*scale,y:y+1.88*scale,z:z+.08},'#dfa27f','#6c3b34',false,true,true,0);
    line3({x:x+.1*scale,y:y+1.0*scale,z:z+.10},{x:x-.45*scale,y:y+1.58*scale+Math.sin(step*TAU)*.16,z:z+.12},.10*scale,'#e3a2bb');
  }
  function drawShaun(x,z,step,scale=1){
    const y=-2.62;shadow(x,-3,scale);
    // fluffy sheep: white wool body, dark face/legs, playful head tilt
    ellipse3({x,y:y+.92*scale,z},.92*scale,.55*scale,'#f5f2ee');
    ellipse3({x:x+.72*scale,y:y+1.22*scale,z:z+.05},.42*scale,.34*scale,'#2d2a2b');
    ellipse3({x:x+.54*scale,y:y+1.30*scale,z:z+.16},.055*scale,.065*scale,'#fff');ellipse3({x:x+.88*scale,y:y+1.30*scale,z:z+.16},.055*scale,.065*scale,'#fff');
    for(let i=0;i<4;i++){const lx=x+(-.55+i*.36)*scale;const a=(i%2?-.18:.18)*Math.sin(step*TAU);line3({x:lx,y:y+.56*scale,z},{x:lx+a*scale,y:y-.70*scale,z:z+.05},.14*scale,'#2d2a2b')}
    line3({x:x-.82*scale,y:y+1.02*scale,z:z-.02},{x:x-1.14*scale,y:y+1.30*scale,z:z-.01},.08*scale,'#f5f2ee');
  }
  function drawSponge(x,z,step,scale=1){
    const y=-2.55;shadow(x,-3,scale);poly3([{x:x-.72*scale,y:y+.25*scale,z},{x:x+.72*scale,y:y+.25*scale,z},{x:x+.62*scale,y:y+1.75*scale,z:z+.03},{x:x-.62*scale,y:y+1.75*scale,z:z+.03}], '#f3d64a',1);
    // face
    ellipse3({x:x-.22*scale,y:y+1.42*scale,z:z+.16},.13*scale,.17*scale,'#fff');ellipse3({x:x+.22*scale,y:y+1.42*scale,z:z+.16},.13*scale,.17*scale,'#fff');ellipse3({x:x-.22*scale,y:y+1.42*scale,z:z+.20},.055*scale,.07*scale,'#42a5c5');ellipse3({x:x+.22*scale,y:y+1.42*scale,z:z+.20},.055*scale,.07*scale,'#42a5c5');
    ctx.save();ctx.strokeStyle='#7b3d35';ctx.lineWidth=3;const q=proj({x,y:y+1.08*scale,z:z+.22});ctx.beginPath();ctx.arc(q.x,q.y,20*scale*q.s,.12*Math.PI,.88*Math.PI);ctx.stroke();ctx.restore();
    const legY=y+.22*scale;line3({x:x-.34*scale,y:legY,z},{x:x-.34*scale,y:legY-.55*scale,z:z+.05},.12*scale,'#f3efe1');line3({x:x+.34*scale,y:legY,z},{x:x+.34*scale,y:legY-.55*scale,z:z+.05},.12*scale,'#f3efe1');
  }
  function drawCouple(phase,pose){
    let ax=-4.3,bx=4.3,scale=1;
    if(pose==='approach'){const e=ease(clamp(phase/1,0,1));ax=lerp(-4.3,-1.25,e);bx=lerp(4.3,1.25,e);scale=lerp(.80,1.02,e)}
    if(pose==='count3'){ax=-1.8;bx=1.8;scale=1.05}
    if(pose==='count2'){ax=-1.45;bx=1.45;scale=1.10}
    if(pose==='count1'){ax=-1.0;bx=1.0;scale=1.17}
    if(pose==='hold'){ax=-.82;bx=.82;scale=1.24}
    if(pose.startsWith('dance')){ax=-1.0;bx=1.0;scale=1.08}
    if(pose==='hug'){ax=-.24;bx=.24;scale=1.12}
    const s=phase;
    drawPerson('osama',ax,0,scale,pose, s);
    drawPerson('rania',bx,.06,scale,pose, s+.12);
    if(['hold','dance3'].includes(pose)){line3({x:-.28,y:-1.05,z:.35},{x:.28,y:-1.05,z:.35},.10,'#c88969',.9)}
    if(pose==='highfive'){
      ellipse3({x:0,y:.02,z:.45},.18,.15,'#c88969',1);text('✋  ✋',innerWidth/2,innerHeight*.26,28,.95);
    }
    if(pose==='hug')text('❤️',innerWidth/2,innerHeight*.30,34,.92);
  }
  function drawFrame(){
    const d=canvas._d||1;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
    if(!active)return;
    gradientBg();
    const now=performance.now();const t=(now-started)/1000;
    if(mode==='boot'){drawBoot(t)}
    else if(mode==='page'){drawPage(t);if(t>=duration)finish()}
    else if(mode==='classic'){drawClassic(t)}
  }
  function drawBoot(t){
    if(!sceneData)return;
    const total=sceneData.total;
    // subtle backdrop only
    if(t<2.0){drawCouple(clamp(t/2,0,1),'approach');}
    else if(t<4.7){
      const n=t<2.9?'count3':t<3.8?'count2':'count1';drawCouple(0,n);
    }else if(t<5.9){
      drawCouple((t-4.7)/1.2,'highfive');
    }else{
      const e=(t-5.9)/Math.max(1,total-5.9);drawCelebration(sceneData.dance,e);
    }
    // hearts/flowers, lightweight and deterministic-ish
    for(let i=0;i<22;i++){
      const x=(i*83.7%100)/100*innerWidth,y=((t*(32+i%5)*18+i*131)%120-10)/100*innerHeight;
      const glyph=['❤️','🌹','🌸','💋','✨','💕'][i%6];ctx.save();ctx.globalAlpha=.18+.16*Math.sin(t*2+i);ctx.font=`${16+(i%4)*4}px system-ui`;ctx.fillText(glyph,x,y);ctx.restore();
    }
    if(t>=total){finish()}
  }
  function drawCelebration(dance,e){
    const p=e*10;let pose='dance1';
    if(dance===0){pose='dance1';drawCouple(pose==='dance1'?p:ease(e),'dance1')}
    else if(dance===1){pose='dance2';drawCouple(p,'dance2')}
    else if(dance===2){pose='dance3';drawCouple(p,'dance3')}
    else if(dance===3){pose='hug';drawCouple(p*.7,'hug')}
    else {pose='highfive';drawCouple(p,'highfive')}
    // sparkle crown around couple
    for(let i=0;i<7;i++){const a=(i/7)*TAU+p*.7,x=innerWidth/2+Math.cos(a)*innerWidth*.25,y=innerHeight*.52+Math.sin(a)*innerHeight*.24;ctx.save();ctx.globalAlpha=.28+.25*(1-e);ctx.font='22px system-ui';ctx.fillText(['✨','💖','🌸','💋'][i%4],x,y);ctx.restore()}
  }
  function drawPage(t){
    const p=clamp(t/.92,0,1),ch=sceneData.character;const x=ch==='osama'?innerWidth-110:110,y=innerHeight-135;
    const bob=Math.sin(p*TAU)*8;ctx.save();ctx.translate(0,bob); // character closer to corner
    if(ch==='osama')drawPerson('osama',3.9,0,0.58,'push',p); else drawPerson('rania',-3.9,0,0.58,'push',p);
    ctx.restore();
  }
  function drawClassic(t){
    if(!sceneData)return;const p=t/sceneData.life,st=clamp(p,0,1),s=.95+.08*Math.sin(t*TAU);
    const msg=sceneData.message||'بحبك ❤️';
    if(sceneData.scene==='dog'){drawDog(lerp(-4.5,1.6,ease(st)),0,t*.25,.95);text(msg,innerWidth*.50,innerHeight*.18,Math.min(innerWidth*.055,34),1)}
    else if(sceneData.scene==='gift'){drawDog(-1.7,0,t*.22,.9);drawCouple(.3,'hug');text('🎁',innerWidth*.50,innerHeight*.22,52,1);text(msg,innerWidth*.50,innerHeight*.15,Math.min(innerWidth*.05,30),.96)}
    else if(sceneData.scene==='fish'){text('🎈',innerWidth*.54,innerHeight*.35,60,1);const fx=innerWidth*(0.08+0.82*st);text('🐟',fx,innerHeight*.42,42,1);text(msg,innerWidth*.50,innerHeight*.18,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='cinderella'){drawPrincess(0,0,t*.32,.96);text(msg,innerWidth*.50,innerHeight*.16,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='tomjerry'){drawTomJerry(0,0,t*.7,.94);text(msg,innerWidth*.50,innerHeight*.17,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='robinson'){drawRobinson(-1.5,0,t*.5,.84);drawHorse(1.2,0,t*.5,.82);text(msg,innerWidth*.50,innerHeight*.17,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='masha'){drawMashaBear(0,0,t*.45,.92);text(msg,innerWidth*.50,innerHeight*.17,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='sponge'){drawSponge(0,0,t*.65,.95);text(msg,innerWidth*.50,innerHeight*.17,Math.min(innerWidth*.052,32),1)}
    else if(sceneData.scene==='shaun'){drawShaun(0,0,t*.45,.94);text(msg,innerWidth*.50,innerHeight*.17,Math.min(innerWidth*.052,32),1)}
    for(let i=0;i<12;i++){const a=i*.8+t*.8,x=innerWidth/2+Math.cos(a)*innerWidth*.30,y=innerHeight*.52+Math.sin(a)*innerHeight*.28;ctx.save();ctx.globalAlpha=.35;ctx.font='24px system-ui';ctx.fillText(['✨','❤️','🌹','💋'][i%4],x,y);ctx.restore()}
    if(t>=sceneData.life)finish();
  }
  function finish(){if(onDone){const f=onDone;onDone=null;hide();setTimeout(()=>{try{f()}catch{}} ,0)}else hide()}
  function run(type,data,seconds,cb){setup();show();mode=type;sceneData=data;started=performance.now();duration=seconds;data.total=seconds;onDone=cb||null;}

  API.bootSequence=function(){
    return new Promise(resolve=>{
      const total=23+Math.floor(Math.random()*8); // 23–30s of celebration after the short intro
      const dances=Math.floor(Math.random()*5);
      run('boot',{total:total+5.9,dance:dances},total+5.9,resolve);
    });
  };
  API.pageTurn=function(dir){
    run('page',{character:dir>0?'osama':'rania'},.92);
  };
  API.classicRandom=function(message){
    const scenes=['dog','fish','cinderella','gift','tomjerry','robinson','masha','sponge','shaun'];
    const scene=scenes[Math.floor(Math.random()*scenes.length)];
    run('classic',{scene,message:String(message||'بحبك ❤️'),life:Math.max(8.4,Math.min(12.6,9.6+Math.random()*3))},10.2);
    return scene;
  };
  API.classic=function(scene,message){
    const allowed=['dog','fish','cinderella','gift','tomjerry','robinson','masha','sponge','shaun'];
    if(!allowed.includes(scene))scene='dog';
    run('classic',{scene,message:String(message||'بحبك ❤️'),life:10.2},10.2);
  };
  API.stop=function(){onDone=null;hide()};
  window.OsRa3D=API;
})();
