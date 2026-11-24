import glob,sys
from PIL import Image
for slug in sorted({p.split('/')[-1].rsplit('_',1)[0] for p in glob.glob('car/*.png')}):
    fs=sorted(glob.glob(f'car/{slug}_*.png')); n=len(fs); cols=5; rows=(n+cols-1)//cols
    w,h=360,450; s=Image.new('RGB',(cols*w+(cols-1)*10,rows*h+(rows-1)*10),'white')
    for k,f in enumerate(fs): s.paste(Image.open(f).resize((w,h)),((k%cols)*(w+10),(k//cols)*(h+10)))
    s.save(f'car_sheet_{slug}.png')
