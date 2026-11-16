import subprocess, os
U="/root/.claude/uploads/35415dec-2b2f-5462-aae2-18d743f1321e"; S="/tmp/claude-0/-home-user--github-io/35415dec-2b2f-5462-aae2-18d743f1321e/scratchpad/ep1"
C={1:f"{U}/90388c85-gemini_generated_video_03C24910.mp4",2:f"{U}/feb299d9-gemini_generated_video_018AF1C5.mp4",3:f"{U}/51943f75-gemini_generated_video_97A07CD6.mp4",4:f"{U}/e6bb492a-gemini_generated_video_0822F2C3.mp4",5:f"{U}/ab4c0794-gemini_generated_video_4E742BE7.mp4"}
# clip, src_start, src_dur, target, extra zoom (end crop zoom factor)
SEG=[(1,0.0,3.0,5.5,1.10),(1,3.0,4.0,4.5,1.0),(1,7.0,3.0,3.24,1.0),(2,0.0,8.0,7.79,1.0),(3,1.5,5.5,5.17,1.0),
(4,0.4,2.2,2.0,1.0),(4,4.4,2.0,2.0,1.0),(4,6.9,2.5,2.19,1.0),(5,0.6,3.0,2.49,1.0),(5,4.6,5.0,4.71,1.18)]
os.makedirs(f"{S}/seg",exist_ok=True); lst=[]
for i,(c,ss,d,tg,zm) in enumerate(SEG):
    out=f"{S}/seg/s{i:02}.mp4"; f=tg/d; n=int(round(tg*30))
    sp=f"setpts=(PTS-STARTPTS)*{f:.5f}"+(",minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.08 else ",fps=30")
    # punch-in at cut (1.06->1 in 8 frames) times slow drift zoom to zm
    z=f"(if(lt(on,8),1.06-0.0075*on,1))*(1+({zm}-1)*on/{n})"
    vf=sp+f",tpad=stop_mode=clone:stop_duration=1,trim=duration={tg},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,unsharp=5:5:0.6,eq=saturation=1.06:contrast=1.03"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",str(d+0.3),"-i",C[c],"-an","-vf",vf,"-frames:v",str(n),"-c:v","libx264","-crf","15","-preset","fast","-pix_fmt","yuv420p","-r","30",out],check=True)
    print(i,tg,subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",out],capture_output=True,text=True).stdout.strip()); lst.append(out)
open(f"{S}/seg/list.txt","w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/seg/list.txt","-c","copy",f"{S}/base.mp4"],check=True)
print(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{S}/base.mp4"],capture_output=True,text=True).stdout)
