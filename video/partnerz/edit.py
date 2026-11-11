import subprocess, sys
SRC = sys.argv[1]; OUT = sys.argv[2]; ASS = sys.argv[3]; VO = sys.argv[4] if len(sys.argv) > 4 else None
# (файл, начало, конец, звук: 'orig' | 'bed')
EDL = [('A.mp4', 0.0, 3.6, 'orig'), ('B.mp4', 2.0, 8.0, 'orig'),
       ('A.mp4', 14.2, 16.4, 'bed'), ('D.mp4', 1.5, 3.36, 'bed'), ('A.mp4', 21.0, 23.24, 'bed'),
       ('C.mov', 0.0, 16.9, 'orig'), ('D.mp4', 6.82, 7.9, 'bed'), ('D.mp4', 8.95, 9.8, 'bed')]
FREEZE = 1.8  # удержание логотипа в конце
ins, fc, vl, al = [], [], [], []
files = sorted(set(e[0] for e in EDL)); idx = {f: i for i, f in enumerate(files)}
for f in files: ins += ['-i', f'{SRC}/{f}']
for k, (f, a, b, snd) in enumerate(EDL):
    i = idx[f]; d = b - a
    pad = f',tpad=stop_mode=clone:stop_duration={FREEZE}' if k == len(EDL) - 1 else ''
    fc.append(f'[{i}:v]trim={a}:{b},setpts=PTS-STARTPTS,fps=30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p{pad}[v{k}]')
    dd = d + (FREEZE if k == len(EDL) - 1 else 0)
    if snd == 'orig':
        fc.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a{k}]')
    else:  # музыкальная подложка без речи: начало ролика A (0–3.6 c), по кругу
        fc.append(f'[{idx["A.mp4"]}:a]atrim=0.2:3.5,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,aloop=loop=-1:size=158400,atrim=0:{dd},volume=0.8[a{k}]')
    vl.append(f'[v{k}]'); al.append(f'[a{k}]')
fc.append(''.join(v + a for v, a in zip(vl, al)) + f'concat=n={len(EDL)}:v=1:a=1[vc][ac]')
fc.append(f'[vc]ass={ASS}:fontsdir=/home/user/.github.io/video[vo]')
if VO:
    ins += ['-i', VO]; fc.append(f'[ac]volume=0.55[bg];[{len(files)}:a]aresample=48000,aformat=channel_layouts=stereo[vo2];[bg][vo2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[ao]')
else:
    fc.append('[ac]loudnorm=I=-14:TP=-1.5[ao]')
cmd = ['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]',
       '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
