# Монтаж ролика PartnerZ: рассказ Ильмира + озвучка «вы видите красоту…» + новая озвучка.
# python3 edit3.py <папка_исходников> <выход.mp4> [draft|final] [озвучка1 озвучка2]
import subprocess, sys
SRC, OUT = sys.argv[1:3]; MODE = sys.argv[3] if len(sys.argv) > 3 else 'draft'
VO = sys.argv[4:6] if len(sys.argv) > 5 else None
HERE = sys.path[0]
CC = 'crop=798:1420:141:0'   # убрать вшитые субтитры ролика C
CA = 'crop=596:1060:40:0'    # убрать надпись PART 2 в ролике A
# Секции: звук (файл, от, до) + видео [(файл, от, до, кроп, замедление)] + субтитры [(от, до, текст)] во времени звука
SECTIONS = [
  dict(name='Крючок — НОВАЯ ОЗВУЧКА 1', audio=('A.mp4', 0.0, 3.5), new_vo=1,
       video=[('A.mp4', 0.0, 3.5, None, 1)],
       subs=[(0.2, 3.5, 'почему одна кухня служит двадцать лет,\\Nа другая разбухает через год?')]),
  dict(name='Ильмир: вступление', audio=('B.mp4', 2.0, 7.8),
       video=[('B.mp4', 2.0, 7.8, None, 1)],
       subs=[(1.98, 3.69, 'а сейчас покажу вам кое-что интересное'), (4.43, 6.0, 'вы когда-нибудь задумывались,'), (6.0, 7.78, 'что скрывается внутри дорогой мебели?')]),
  dict(name='Ильмир: кромка', audio=('A.mp4', 4.0, 9.5),
       video=[('A.mp4', 4.0, 6.2, None, 1), ('A.mp4', 14.15, 17.45, None, 1)],
       subs=[(4.1, 5.25, 'смотрите на кромку'), (5.25, 6.66, 'если торец обработан плохо,'), (7.1, 8.1, 'влага может попасть внутрь,'), (8.1, 9.45, 'и плита начнёт разбухать')]),
  dict(name='Ильмир: петли Blum', audio=('A.mp4', 11.55, 19.3),
       video=[('A.mp4', 20.15, 27.9, None, 1)],
       subs=[(11.67, 13.96, 'а вот петли Blum. Видите?'), (14.61, 16.7, 'даже если слегка подтолкнуть дверцу,'), (16.72, 19.25, 'доводчик мягко завершит закрывание')]),
  dict(name='Ильмир: Hettich', audio=('A.mp4', 19.9, 27.95),
       video=[('C.mov', 3.44, 4.94, CC, 1), ('C.mov', 13.0, 14.44, CC, 1), ('A.mp4', 10.3, 13.4, CA, 1), ('A.mp4', 27.98, 30.0, None, 1)],
       subs=[(20.0, 20.9, 'а это Hettich'), (21.49, 23.5, 'направляющие скрыты под ящиком'), (23.78, 26.1, 'вы их не видите, но чувствуете,'), (26.52, 27.9, 'насколько плавно он движется')]),
  dict(name='Ильмир: вывод', audio=('D.mp4', 0.0, 8.6),
       video=[('D.mp4', 0.0, 8.6, None, 1)],
       subs=[(0.13, 1.5, 'вот почему мы в PartnerZ'), (1.5, 2.95, 'уделяем внимание каждой детали'), (3.59, 5.4, 'потому что настоящее качество'), (6.0, 8.55, 'скрыто внутри')]),
  dict(name='Озвучка «вы видите красоту»', audio=('C.mov', 0.0, 16.9),
       video=[('C.mov', 0.0, 3.44, CC, 1.3), ('C.mov', 4.94, 11.48, CC, 1), ('C.mov', 11.48, 13.0, CC, 1.6), ('C.mov', 14.44, 16.9, CC, 1.4)],
       subs=[(0.38, 1.6, 'вы видите красоту'), (2.88, 4.4, 'мы видим сотни решений'), (5.0, 7.1, 'благодаря которым она становится возможной'),
             (10.23, 12.6, 'от первого чертежа до последнего миллиметра'), (13.84, 15.4, 'всё должно быть безупречно')]),
  dict(name='Логотип — НОВАЯ ОЗВУЧКА 2', audio=('D.mp4', 8.6, 9.8), new_vo=2, freeze=3.3,
       video=[('D.mp4', 8.92, 9.8, None, 1)],
       subs=[(0.25, 4.4, 'хотите кухню, где продумана каждая деталь?\\Nссылка — в профиле')]),
]
files = sorted({s['audio'][0] for s in SECTIONS} | {v[0] for s in SECTIONS for v in s['video']})
idx = {f: i for i, f in enumerate(files)}
ins = sum([['-i', f'{SRC}/{f}'] for f in files], [])
fc, vl, al, events, vo_at = [], [], [], [], {}
t0, k = 0.0, 0
def tc(s): return f'{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}'
for si, s in enumerate(SECTIONS):
    f, a, b = s['audio']; adur = b - a; fz = s.get('freeze', 0); dur = adur + fz
    # видео секции подгоняется точно под длину звука
    vtot = sum((v[2] - v[1]) * v[4] for v in s['video'])
    for j, (vf, va, vb, crop, sl) in enumerate(s['video']):
        flt = f'[{idx[vf]}:v]trim={va}:{vb},setpts=(PTS-STARTPTS)*{sl},fps=30'
        if crop: flt += ',' + crop
        flt += ',scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p'
        if j == len(s['video']) - 1:
            pad = dur - vtot
            flt += f',tpad=stop_mode=clone:stop_duration={max(pad, 0):.3f},trim=duration={(vb - va) * sl + pad:.3f}' if pad > 0 else f',trim=duration={(vb - va) * sl + pad:.3f}'
        fc.append(flt + f'[v{k}]'); vl.append(f'[v{k}]'); k += 1
    flt = f'[{idx[f]}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.04,afade=t=out:st={adur - 0.06:.3f}:d=0.06'
    fc.append(flt + f'[a{si}]'); al.append(f'[a{si}]')
    if fz:
        fc.append(f'[{idx["A.mp4"]}:a]atrim=0.3:{0.3 + fz},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st={fz - 1.2}:d=1.2[af{si}]'); al.append(f'[af{si}]')
    off = t0 - (a if not s.get('new_vo') else 0)
    for sa, sb, txt in s['subs']:
        st, en = (t0 + sa, t0 + sb) if s.get('new_vo') else (off + sa, off + sb)
        events.append(f'Dialogue: 0,{tc(st)},{tc(en)},Sub,,0,0,0,,{txt}')
    if s.get('new_vo'):
        vo_at[s['new_vo']] = t0 + s['subs'][0][0]
        if MODE == 'draft': events.append(f'Dialogue: 0,{tc(t0)},{tc(t0 + dur)},Mark,,0,0,0,,🎙 {s["name"]} ({dur:.1f} с)')
    t0 += dur
fc.append(''.join(vl) + f'concat=n={len(vl)}:v=1:a=0[vc]')
fc.append(''.join(al) + f'concat=n={len(al)}:v=0:a=1[ac]')
ass = f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,1.2,1.5,2,80,80,430,204
Style: Mark,Nunito,40,&H00FFFFFF,&H00FFFFFF,&H00B05A1E,&HB0000000,1,0,0,0,100,100,0,0,3,14,0,8,50,50,120,204

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
''' + '\n'.join(events) + '\n'
assf = OUT.rsplit('.', 1)[0] + '.ass'; open(assf, 'w').write(ass)
fc.append(f'[vc]ass={assf}:fontsdir={HERE}/..[vo]')
if VO:  # новые реплики: музыка под ними приглушается
    n = len(files); ins += ['-i', VO[0], '-i', VO[1]]
    d1, d2 = int(vo_at[1] * 1000), int(vo_at[2] * 1000)
    fc.append(f'[{n}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d1}|{d1}[n1];[{n + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d2}|{d2}[n2]')
    fc.append('[n1][n2]amix=inputs=2:normalize=0,asplit[s1][s2];[ac][s1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[duck];[duck][s2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[ao]')
else:
    fc.append('[ac]loudnorm=I=-14:TP=-1.5[ao]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]',
                '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], check=True)
print(f'OK {OUT} {t0:.1f} c, озвучка 1 с {vo_at.get(1, 0):.1f} c, озвучка 2 с {vo_at.get(2, 0):.1f} c')
