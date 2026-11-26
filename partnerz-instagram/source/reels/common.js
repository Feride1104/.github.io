
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3);            // ease out cubic
const eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const back=x=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const lerp=(a,b,x)=>a+(b-a)*x;
const $=s=>document.querySelector(s);
// appear: fade+slide in at a, out at b
function appear(el,t,a,b,dy=40,dur=.6){const i=eo(prog(t,a,a+dur));const o=b==null?0:eio(prog(t,b,b+dur*.7));
 el.style.opacity=i*(1-o);el.style.transform=`translateY(${(1-i)*dy - o*dy*.5}px)`;}
// ---- tiny CSS-3D engine ----
// box(parent,{w,h,d,tex,shade}) -> group element; faces shaded for fake light
function face(g,w,h,tr,shade,tex){const f=document.createElement('div');f.className='face';f.style.width=w+'px';f.style.height=h+'px';
 f.style.marginLeft=-w/2+'px';f.style.marginTop=-h/2+'px';f.style.transform=tr;
 f.innerHTML=`<div class="fl" style="--tex:${tex}"></div><div class="sh" style="background:rgba(0,0,0,${shade})"></div>`;g.appendChild(f);return f}
function box(parent,w,h,d,tex,opt={}){const g=document.createElement('div');g.className='grp';
 const s=opt.shade||[0,.28,.18,.1,.35,.4]; // front,back,left,right,top(light),bottom
 g.faces=[
  face(g,w,h,`translateZ(${d/2}px)`,s[0],tex),
  face(g,w,h,`rotateY(180deg) translateZ(${d/2}px)`,s[1],tex),
  face(g,d,h,`rotateY(-90deg) translateZ(${w/2}px)`,s[2],tex),
  face(g,d,h,`rotateY(90deg) translateZ(${w/2}px)`,s[3],tex),
  face(g,w,d,`rotateX(90deg) translateZ(${h/2}px)`,-0.06,tex),
  face(g,w,d,`rotateX(-90deg) translateZ(${h/2}px)`,s[5],tex)];
 if(opt.front){g.faces[0].insertAdjacentHTML('beforeend',opt.front)}
 if(opt.top){g.faces[4].insertAdjacentHTML('beforeend',opt.top)}
 parent.appendChild(g);return g}
function grp(parent){const g=document.createElement('div');g.className='grp';parent.appendChild(g);return g}
// set wireframe(0..1) / solid(0..1)
function look(g,wire,solid){for(const f of g.faces){f.style.borderColor=`rgba(183,218,146,${wire*(1-solid)})`;f.firstChild.style.opacity=solid;f.lastChild.style.opacity=solid}}
const T3=(x=0,y=0,z=0,ry=0,rx=0,rz=0)=>`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`;
