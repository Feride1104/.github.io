import subprocess, os
U="/root/.claude/uploads/35415dec-2b2f-5462-aae2-18d743f1321e"; S="/tmp/claude-0/-home-user--github-io/35415dec-2b2f-5462-aae2-18d743f1321e/scratchpad/ep2"
C={1:f"{U}/b3f34a7f-gemini_generated_video_A5161264.mp4",2:f"{U}/cc6f8944-gemini_generated_video_F2873787.mp4",3:f"{U}/c592b836-gemini_generated_video_A1B8F998.mp4",4:f"{U}/80314414-gemini_generated_video_1489888C.mp4",6:f"{U}/e59449da-gemini_generated_video_12C00D59.mp4"}
SEG=[(1,0.0,3.6,3.6),(1,6.0,2.4,2.4),(1,0.15,0.05,4.4),(2,3.5,1.78,1.78),(2,6.2,3.58,3.58),(3,0.3,2.54,2.54),(3,7.5,1.84,1.84),(4,2.0,2.55,2.55),(6,0.5,1.96,1.96),(6,11.5,2.87,2.87),(6,4.0,1.89,1.89),(6,17.6,3.0,3.0)]
os.makedirs(f"{S}/seg",exist_ok=True); lst=[]
for i,(c,ss,d,tg) in enumerate(SEG):
    out=f"{S}/seg/s{i:02}.mp4"; f=tg/d; n=int(round(tg*30))
    sp=f"setpts=(PTS-STARTPTS)*{f:.5f}"+(",minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if 1.08<f<5 else ",fps=30")
    z="if(lt(on,8),1.06-0.0075*on,1)" if i not in (0,2) else "1"
    vf=sp+f",tpad=stop_mode=clone:stop_duration={tg+1},trim=duration={tg},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,unsharp=5:5:0.6,eq=saturation=1.06:contrast=1.03"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",str(d+0.3),"-i",C[c],"-an","-vf",vf,"-frames:v",str(n),"-c:v","libx264","-crf","15","-preset","fast","-pix_fmt","yuv420p","-r","30",out],check=True)
    lst.append(out)
open(f"{S}/seg/list.txt","w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/seg/list.txt","-c","copy",f"{S}/base.mp4"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-sseof","-0.05","-i",f"{S}/base.mp4","-frames:v","1",f"{S}/last.png"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-loop","1","-t","6","-i",f"{S}/last.png","-vf","zoompan=z='min(1+0.12*on/30,1.12)':x='iw/2-(iw/zoom/2)':y='ih*0.4-(ih/zoom*0.4)':d=1:s=1080x1920:fps=30,format=yuv420p","-frames:v","180","-c:v","libx264","-crf","15",f"{S}/tail.mp4"],check=True)
open(f"{S}/full.txt","w").write(f"file '{S}/base.mp4'\nfile '{S}/tail.mp4'\n")
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/full.txt","-c","copy",f"{S}/video.mp4"],check=True)
print(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{S}/base.mp4",],capture_output=True,text=True).stdout)
