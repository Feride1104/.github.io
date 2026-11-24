const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:1400}});
await p.goto('file://'+__dirname+'/carousels.html');await p.evaluate(()=>document.fonts.ready);
const ids=await p.evaluate(()=>[...document.querySelectorAll('.s')].map(s=>s.id));
const issues=await p.evaluate(()=>[...document.querySelectorAll('.s')].map(s=>{const r=s.getBoundingClientRect();const f=s.querySelector('.foot').getBoundingClientRect();
 const zs=[...s.querySelectorAll(':scope>.z')].filter(z=>!z.classList.contains('foot')&&!z.classList.contains('head'));
 const h=s.querySelector('.head').getBoundingClientRect();
 const lastB=Math.max(...zs.map(z=>z.getBoundingClientRect().bottom));const firstT=Math.min(...zs.map(z=>z.getBoundingClientRect().top));
 let gaps=[];for(let i=1;i<zs.length;i++)gaps.push(Math.round(zs[i].getBoundingClientRect().top-zs[i-1].getBoundingClientRect().bottom));
 // check pill overflow horizontally
 const wide=[...s.querySelectorAll('h1,h2,.pill,p,span')].some(e=>e.getBoundingClientRect().right>r.right-60);
 return s.id+' top:'+Math.round(firstT-h.bottom)+' gaps:'+gaps+' toFoot:'+Math.round(f.top-lastB)+' footPad:'+Math.round(r.bottom-f.bottom)+(wide?' WIDE':'')}));
console.log(issues.join('\n'));
if(process.argv[2]){fs.mkdirSync('car',{recursive:true});for(const id of ids){await p.locator('[id="'+id+'"]').screenshot({path:'car/'+id+'.png'})}}
await b.close()})();
