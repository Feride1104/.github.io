import subprocess, os, glob
U="/root/.claude/uploads/35415dec-2b2f-5462-aae2-18d743f1321e"; S="/tmp/claude-0/-home-user--github-io/35415dec-2b2f-5462-aae2-18d743f1321e/scratchpad/ep4"
def C(p): return glob.glob(f"{U}/{p}*")[0]
NIGHT=",eq=brightness=-0.07:saturation=0.9,colorbalance=bs=0.08:bm=0.04"
SEPIA=",colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.1"
SEG=[("e267e31b",0.0,3.75,3.75,""),("e267e31b",5.2,1.8,1.8,""),("9c8b1217",0.5,3.8,3.8,""),("23aaa8c6",1.5,2.4,2.4,""),("9c8b1217",6.5,1.25,1.25,""),("23aaa8c6",5.0,2.8,2.8,""),
("4616f32d",0.0,2.1,2.1,NIGHT),("4616f32d",2.0,3.0,3.0,NIGHT),("4616f32d",5.5,3.7,3.7,NIGHT),("3d950c12",1.5,4.0,3.8,""),("3d950c12",6.0,1.2,1.2,""),
("8db70dd1",0.0,2.4,2.4,""),("8db70dd1",2.4,2.0,2.0,""),("8db70dd1",8.0,2.0,2.0,""),("8db70dd1",4.4,3.2,3.2,""),("064ea4b4",0.8,4.2,4.2,""),("064ea4b4",5.0,5.0,5.0,""),
("90388c85",0.0,2.6,2.6,SEPIA),("fa83b62e",0.0,4.0,4.0,""),("fa83b62e",4.0,2.0,2.0,""),("fa83b62e",6.5,3.0,3.0,"")]
os.makedirs(f"{S}/seg",exist_ok=True); lst=[]; t=0; cuts=[]
for i,(c,ss,d,tg,ex) in enumerate(SEG):
    out=f"{S}/seg/s{i:02}.mp4"; f=tg/d; n=int(round(tg*30))
    sp=f"setpts=(PTS-STARTPTS)*{f:.5f}"+(",minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.08 else ",fps=30")
    z="if(lt(on,8),1.06-0.0075*on,1)" if i>0 else "1"
    vf=sp+f",tpad=stop_mode=clone:stop_duration={tg+1},trim=duration={tg},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,unsharp=5:5:0.6,eq=saturation=1.06:contrast=1.03"+ex
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(ss),"-t",str(d+0.3),"-i",C(c),"-an","-vf",vf,"-frames:v",str(n),"-c:v","libx264","-crf","15","-preset","fast","-pix_fmt","yuv420p","-r","30",out],check=True)
    lst.append(out); cuts.append(round(t,3)); t+=n/30
print("cuts",cuts[1:],"end",round(t,3))
open(f"{S}/seg/list.txt","w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/seg/list.txt","-c","copy",f"{S}/base.mp4"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-sseof","-0.05","-i",f"{S}/base.mp4","-frames:v","1",f"{S}/last.png"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-loop","1","-t","7","-i",f"{S}/last.png","-vf","zoompan=z='min(1+0.1*on/40,1.1)':x='iw/2-(iw/zoom/2)':y='ih*0.4-(ih/zoom*0.4)':d=1:s=1080x1920:fps=30,format=yuv420p","-frames:v","210","-c:v","libx264","-crf","15",f"{S}/tail.mp4"],check=True)
open(f"{S}/full.txt","w").write(f"file '{S}/base.mp4'\nfile '{S}/tail.mp4'\n")
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{S}/full.txt","-c","copy",f"{S}/video.mp4"],check=True)
