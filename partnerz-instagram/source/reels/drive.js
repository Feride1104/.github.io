// usage: node drive.js reel.html out.mp4 [fps] [onlyFrameAtSec]
const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const [file,out,fpsA,only]=process.argv.slice(2);const fps=+(fpsA||30);
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/'+file);await p.evaluate(()=>document.fonts.ready);
const D=await p.evaluate(()=>window.DURATION);
if(only!==undefined){for(const s of only.split(',')){await p.evaluate(t=>window.render(t),+s);await p.screenshot({path:`${out}_${s}.png`});}await b.close();return}
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','18','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
const N=Math.round(D*fps);
for(let i=0;i<N;i++){await p.evaluate(t=>window.render(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:93});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out,N,'frames')})();
