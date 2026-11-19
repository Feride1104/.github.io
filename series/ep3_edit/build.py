import subprocess, os, glob
U="/root/.claude/uploads/35415dec-2b2f-5462-aae2-18d743f1321e"; S="/tmp/claude-0/-home-user--github-io/35415dec-2b2f-5462-aae2-18d743f1321e/scratchpad/ep3"
def C(p): return glob.glob(f"{U}/{p}*")[0]
SEG=[("cb99602a",0.5,3.5,3.5),("cb99602a",4.5,1.5,1.5),("cb99602a",7.5,3.5,3.5),("733f7a61",1.0,3.9,3.52),("733f7a61",5.5,1.72,1.72),
("656d9ff1",0.8,4.8,4.15),("656d9ff1",6.0,2.16,2.16),("7b6c56c8",0.3,5.5,4.74),("7b6c56c8",6.5,1.97,1.97),("ce2e59b1",0.5,4.1,3.72),
("f3aa4472",1.3,3.6,3.37),("f3aa4472",5.0,2.62,2.62),("f3aa4472",7.6,2.4,2.4)]
os.makedirs(f"{S}/seg",exist_ok=True); lst=[]; t=0; cuts=[]
for i,(c,ss,d,tg) in enumerate(SEG):
    out=f"{S}/seg/s{i:02}.mp4"; f=tg/d; n=int(round(tg*30))
    sp=f"setpts=(PTS-STARTPTS)*{f:.5f}"+(",minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.08 else ",fps=30")
    z="if(lt(on,8),1.06-0.0075*on,1)" if i>0 else "1"
    vf=sp+f",tpad=stop_mode=clone:stop_duration={tg+1},trim=duration={tg},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,unsharp=5:5:0.6,eq=saturation=1.06:contrast=1.03"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",str(d+0.3),"-i",C(c),"-an","-vf",vf,"-frames:v",str(n),"-c:v","libx264","-crf","15","-preset","fast","-pix_fmt","yuv420p","-r","30",out],check=True)
    lst.append(out); dur=n/30; cuts.append(round(t,3)); t+=dur
print("cuts",cuts[1:],"end",round(t,3))
open(f"{S}/seg/list.txt","w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/seg/list.txt","-c","copy",f"{S}/base.mp4"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-sseof","-0.05","-i",f"{S}/base.mp4","-frames:v","1",f"{S}/last.png"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-loop","1","-t","9","-i",f"{S}/last.png","-vf","zoompan=z='min(1+0.12*on/40,1.12)':x='iw/2-(iw/zoom/2)':y='ih*0.4-(ih/zoom*0.4)':d=1:s=1080x1920:fps=30,format=yuv420p","-frames:v","270","-c:v","libx264","-crf","15",f"{S}/tail.mp4"],check=True)
open(f"{S}/full.txt","w").write(f"file '{S}/base.mp4'\nfile '{S}/tail.mp4'\n")
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/full.txt","-c","copy",f"{S}/video.mp4"],check=True)
