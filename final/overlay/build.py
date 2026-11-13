import subprocess, os
U="/root/.claude/uploads/35415dec-2b2f-5462-aae2-18d743f1321e"; S="/tmp/claude-0/-home-user--github-io/35415dec-2b2f-5462-aae2-18d743f1321e/scratchpad/edit"
C={1:f"{U}/562fdf5a-269091281_1794582591557065.mp4",2:f"{U}/a875e048-493346763_1794577575856924.mp4",3:f"{U}/d4737171-690638708_1794577340648654.mp4",4:f"{U}/20b9b515-902242107_1794577910277446.mp4",5:f"{U}/592e9030-808790456_1794577900062223.mp4",6:f"{U}/13b06bbd-199010686_1794577889924476.mp4"}
# (clip, src_start, src_dur, target_dur, mode)
SEG=[(1,0.0,2.0,2.42,''),(1,3.0,2.14,2.14,''),(1,1.6,1.4,1.79,''),(1,5.14,2.86,4.14,''),(1,8.0,3.22,3.22,''),
(2,0,6.125,6.125,''),(2,6.125,3.875,3.875,''),
(3,0,2.625,2.625,''),(3,2.625,4.5,4.5,''),(3,7.125,2.875,3.135,''),
(4,0,5.0,5.04,''),(4,5.0,1.167,1.16,''),(4,6.167,3.833,4.42,''),
(5,0.2,2.07,2.07,''),(5,2.5,5.5,5.5,''),(5,8.0,2.0,2.0,''),(6,0,2.5,2.5,''),(6,2.5,2.8,2.8,'')]
os.makedirs(f"{S}/seg",exist_ok=True); lst=[]
for i,(c,ss,d,tg,mode) in enumerate(SEG):
    out=f"{S}/seg/s{i:02}.mp4"
    if mode=='hold':
        n=int(round(tg*30))
        vf=f"scale=1080:1920,loop=loop={n}:size=1:start=0,setpts=N/30/TB,zoompan=z='1+0.12*on/{n}':x='iw/2-(iw/zoom/2)':y='ih*0.42-(ih/zoom*0.42)':d=1:s=1080x1920:fps=30,trim=duration={tg}"
    else:
        f=tg/d
        vf=f"setpts=(PTS-STARTPTS)*{f:.5f}"+(",minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.08 else ",fps=30")+f",tpad=stop_mode=clone:stop_duration=1,trim=duration={tg},setpts=PTS-STARTPTS,scale=1080:1920"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",str(d+0.3),"-i",C[c],"-an","-vf",vf,"-c:v","libx264","-crf","14","-preset","fast","-pix_fmt","yuv420p","-r","30",out],check=True)
    dur=float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",out],capture_output=True,text=True).stdout)
    print(i,c,round(tg,3),round(dur,3)); lst.append(out)
open(f"{S}/seg/list.txt","w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/seg/list.txt","-c","copy",f"{S}/base.mp4"],check=True)
print(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{S}/base.mp4"],capture_output=True,text=True).stdout)
