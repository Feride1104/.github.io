# Перемонтаж ролика «лечение зуба»: python3 edit.py <исходник.mp4> <выход.mp4>
import subprocess, sys
SRC, OUT = sys.argv[1:3]
X = 0.3  # длительность мягкого перехода
# (от, до, замедление>1 / ускорение<1, комментарий)
SEG = [(0.0, 3.5, 1, 'Ильмир осматривает, наезд в зеркальце'),
       (3.5, 8.6, 1, 'жевательная поверхность → зуб в разрезе'),
       (22.25, 24.0, 1.15, 'изоляция коффердамом (до лечения)'),
       (13.1, 18.2, 1, 'бор входит, удаление кариеса'),
       (18.2, 21.4, 0.75, 'очищенная полость'),
       (24.0, 25.9, 1.15, 'пломбирование'),
       (0.0, 1.6, 1.3, 'финал: Ильмир')]
fc, durs = [], []
for k, (a, b, sl, _) in enumerate(SEG):
    d = (b - a) * sl; durs.append(d)
    fc.append(f'[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)*{sl},fps=30,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,format=yuv420p[v{k}]')
    at = f'atempo={1 / sl:.4f},' if sl != 1 else ''
    fc.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,{at}aresample=48000[a{k}]')
v, a, off = '[v0]', '[a0]', 0.0
for k in range(1, len(SEG)):
    off += durs[k - 1] - X
    fc.append(f'{v}[v{k}]xfade=transition=fade:duration={X}:offset={off:.3f}[vx{k}]'); v = f'[vx{k}]'
    fc.append(f'{a}[a{k}]acrossfade=d={X}[ax{k}]'); a = f'[ax{k}]'
total = sum(durs) - X * (len(SEG) - 1)
fc.append(f'{v}fade=t=out:st={total - 0.6:.3f}:d=0.6[vo]')
fc.append(f'{a}afade=t=out:st={total - 1.0:.3f}:d=1.0,loudnorm=I=-14:TP=-1.5[ao]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]',
                '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], check=True)
print(f'OK {total:.1f} c')
