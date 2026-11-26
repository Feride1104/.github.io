
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
