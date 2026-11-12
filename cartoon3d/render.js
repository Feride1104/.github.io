// usage: node render.js preview t1,t2,... | node render.js video out.mp4 audio.mp3
const { chromium } = require('playwright');
const path = require('path'); const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  const b = await chromium.launch({ args: ['--allow-file-access-from-files','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('console', m => console.log('PAGE', m.text())); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.evaluate(() => window.ready);
  if (mode === 'preview') {
    const PD = process.argv[4] || 'prev'; fs.mkdirSync(PD, { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) {
      await pg.evaluate(t => render(t), t);
      await pg.screenshot({ path: `${PD}/t${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 80 });
    }
  } else {
    const out = process.argv[3], audio = process.argv[4], fps = 30, dur = 63.95;
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-i', audio,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = Math.ceil(dur * fps);
    for (let i = 0; i < N; i++) {
      await pg.evaluate(t => render(t), i / fps);
      const buf = await pg.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log('frame', i, '/', N);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
