const { chromium } = require('playwright'); const path = require('path'); const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('file://' + path.resolve(__dirname, 'index.html')); await pg.evaluate(() => window.ready);
  if (mode === 'preview') { fs.mkdirSync('pv', { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) { await pg.evaluate(t => render(t), t); await pg.screenshot({ path: `pv/o${t.toFixed(2)}.png`, omitBackground: true }); }
  } else {
    const dur = +process.argv[4], fps = 30, N = Math.round(dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'png', '-pix_fmt', 'rgba', process.argv[3]], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < N; i++) { await pg.evaluate(t => render(t), i / fps); const buf = await pg.screenshot({ type: 'png', omitBackground: true }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (i % 300 === 0) console.log('ov', i, N); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
