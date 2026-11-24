import re, html
from content import CAROUSELS

def fmt(t):
    t = html.escape(t)
    t = re.sub(r"\{(.+?)\}", r'<span class="pill">\1</span>', t)
    t = re.sub(r"\[(.+?)\]", r'<span class="g">\1</span>', t)
    return t

FONTS = "".join(
    f"@font-face{{font-family:M;font-weight:{w};src:url({s}-{w}-normal.woff2);unicode-range:{r}}}"
    for w in (500, 600, 700, 800)
    for s, r in (("montserrat-cyrillic", "U+0400-04FF"), ("montserrat-latin", "U+0000-03FF,U+2000-206F,U+2190-22FF")))

CSS = FONTS + """
:root{--dark:#221C18;--cream:#EFE9E0;--ink:#1E1915;--lime:#B7DA92;--lime-ink:#1D2716;--green:#1E9A45}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#555;font-family:M,sans-serif;padding:40px;display:flex;flex-direction:column;gap:40px;align-items:center}
.s{width:1080px;height:1350px;position:relative;overflow:hidden;padding:80px 84px 76px;display:flex;flex-direction:column}
.dark{background:var(--dark);color:#F4EEE7;--acc:var(--lime);--mut:#B9ADA2;--body:#D9CFC5;--card:#2C241F;--line:rgba(255,240,225,.12)}
.light{background:var(--cream);color:var(--ink);--acc:var(--green);--mut:#7A6D63;--body:#4A3F37;--card:rgba(255,255,255,.6);--line:rgba(60,40,25,.1)}
.bg{position:absolute;inset:0}
.dark .bg{background:radial-gradient(900px 700px at 100% 0%,rgba(196,140,92,.26),transparent 60%),radial-gradient(700px 600px at 0% 100%,rgba(120,84,58,.22),transparent 65%)}
.slats{position:absolute;top:0;bottom:0;right:0;width:300px;background:repeating-linear-gradient(90deg,rgba(255,235,210,.07) 0 34px,rgba(0,0,0,.18) 34px 40px);-webkit-mask:linear-gradient(90deg,transparent,#000 45%)}
.light .slats{background:repeating-linear-gradient(90deg,rgba(120,90,60,.06) 0 34px,rgba(120,90,60,.13) 34px 40px)}
.wm{position:absolute;right:40px;top:150px;font-weight:800;font-size:440px;line-height:1;letter-spacing:-.05em;color:var(--acc);opacity:.07}
.z{position:relative;z-index:2}
.head{display:flex;justify-content:space-between;align-items:center}
.head img{width:230px;display:block}
.cnt{font-weight:700;font-size:24px;letter-spacing:.08em;color:var(--mut)}
.cnt b{color:var(--acc)}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center}
.ft{font-weight:600;font-size:18px;letter-spacing:.22em;text-transform:uppercase;color:var(--mut)}
.ft::before{content:"";display:block;width:64px;height:5px;border-radius:3px;background:var(--acc);margin-bottom:20px}
.arrow{display:flex;align-items:center;gap:16px;font-weight:700;font-size:24px;color:var(--mut)}
.arrow i{width:72px;height:72px;border-radius:50%;background:var(--lime);display:grid;place-items:center}
.arrow svg{width:30px;height:30px;stroke:var(--lime-ink)}
.kicker{font-weight:700;font-size:24px;letter-spacing:.24em;text-transform:uppercase;color:var(--acc);margin-bottom:30px}
h1{font-weight:800;font-size:90px;line-height:1.07;letter-spacing:-.015em;text-transform:uppercase}
h2{font-weight:800;font-size:68px;line-height:1.1;letter-spacing:-.01em;text-transform:uppercase}
.pill{display:inline-block;background:var(--lime);color:var(--lime-ink);border-radius:999px;padding:0 .3em .04em;margin:.05em -.05em}
.g{color:var(--acc)}
.sub{font-weight:500;font-size:34px;line-height:1.45;color:var(--body);margin-top:40px;max-width:820px}
.p{font-weight:500;font-size:36px;line-height:1.5;color:var(--body);margin-top:26px;max-width:860px}
.p:first-of-type{margin-top:44px}
.mid{margin:auto 0}
.label{display:inline-flex;align-items:baseline;gap:18px;font-weight:700;font-size:26px;letter-spacing:.2em;text-transform:uppercase;color:var(--acc);margin-bottom:26px}
.tip{margin-top:auto;margin-bottom:56px;background:var(--card);border:1.5px solid var(--line);border-left:8px solid var(--acc);border-radius:26px;padding:38px 42px}
.tip b{display:block;font-weight:800;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:var(--acc);margin-bottom:14px}
.tip p{font-weight:600;font-size:33px;line-height:1.45}
.cards{display:flex;flex-direction:column;gap:20px;margin-top:auto;margin-bottom:56px}
.card{background:var(--card);border:1.5px solid var(--line);border-radius:26px;padding:32px 38px}
.card b{display:block;font-weight:800;font-size:22px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:16px}
.card.plus b{color:var(--acc)} .card.minus b{color:#C9786A}
.card li{list-style:none;font-weight:600;font-size:30px;line-height:1.35;padding-left:46px;position:relative;margin-top:12px}
.card li::before{position:absolute;left:0;top:-1px;font-weight:800;font-size:32px}
.card.plus li::before{content:"+";color:var(--acc)} .card.minus li::before{content:"–";color:#C9786A}
.items{margin-top:auto;margin-bottom:56px;display:flex;flex-direction:column}
.it{display:flex;gap:28px;align-items:center;padding:26px 0;border-top:2px solid var(--line);font-weight:700;font-size:36px;line-height:1.3}
.it:last-child{border-bottom:2px solid var(--line)}
.it i{flex:none;width:60px;height:60px;border-radius:50%;background:var(--lime);display:grid;place-items:center}
.it svg{width:28px;height:28px;stroke:var(--lime-ink)}
.myth{margin-top:110px}
.tag{display:inline-block;font-weight:800;font-size:22px;letter-spacing:.2em;text-transform:uppercase;padding:12px 24px;border-radius:999px;margin-bottom:24px}
.myth .t1{background:rgba(201,120,106,.16);color:#B0574A}
.myth h2{text-decoration:line-through;text-decoration-thickness:6px;text-decoration-color:rgba(201,120,106,.7)}
.truth{margin-top:auto;margin-bottom:56px;background:var(--card);border:1.5px solid var(--line);border-left:8px solid var(--acc);border-radius:26px;padding:38px 42px}
.truth .tag{background:var(--lime);color:var(--lime-ink)}
.truth p{font-weight:600;font-size:38px;line-height:1.45}
.stats{margin-top:auto;margin-bottom:56px}
.st{display:grid;grid-template-columns:420px 1fr;align-items:center;border-top:2px solid var(--line);padding:30px 0}
.st:last-child{border-bottom:2px solid var(--line)}
.st b{font-weight:800;font-size:100px;letter-spacing:-.03em;line-height:1}
.st b i{font-style:normal;color:var(--acc)}
.st span{font-weight:600;font-size:32px;line-height:1.3;color:var(--body)}
.btn{display:inline-flex;align-items:center;gap:20px;background:var(--lime);color:var(--lime-ink);font-weight:800;font-size:34px;border-radius:999px;padding:30px 46px;margin-top:52px}
.btn svg{width:34px;height:34px;stroke:var(--lime-ink)}
.links{margin-top:32px;display:flex;gap:44px;font-weight:600;font-size:28px;color:var(--body)}
.links b{font-weight:800;color:inherit}
.save{display:flex;align-items:center;gap:18px;margin-top:60px;font-weight:600;font-size:27px;color:var(--mut)}
.save svg{width:34px;height:34px;stroke:var(--acc)}
"""

ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
BOOKMARK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>'

def slide(c, s, i, n):
    th = c["theme"]; logo = "logo_w.svg" if th == "dark" else "logo_b.svg"
    k = s["kind"]
    bg = '<div class="bg"></div><div class="slats"></div>'
    if k == "point": bg += f'<div class="wm">{s["n"]}</div>'
    head = f'<div class="z head"><img src="{logo}"><div class="cnt"><b>{i:02d}</b> / {n:02d}</div></div>'
    last = i == n
    right = '' if last else f'<div class="arrow"><i>{ARROW}</i></div>'
    foot = f'<div class="z foot"><div class="ft">Проектирование · Производство · Реализация</div>{right}</div>'
    kick = lambda: f'<div class="kicker">{html.escape(s["kicker"])}</div>' if s.get("kicker") else ''
    if k == "cover":
        body = f'<div class="z mid">{kick()}<h1>{fmt(s["title"])}</h1><p class="sub">{fmt(s["sub"])}</p></div>'
    elif k == "text":
        ps = "".join(f'<p class="p">{fmt(p)}</p>' for p in s["body"])
        body = f'<div class="z mid">{kick()}<h2>{fmt(s["title"])}</h2>{ps}</div>'
    elif k == "point":
        body = (f'<div class="z" style="margin-top:110px"><div class="label">{s["label"]} {s["n"]}</div>'
                f'<h2>{fmt(s["title"])}</h2><p class="p">{fmt(s["body"])}</p></div>'
                f'<div class="z tip"><b>Как правильно</b><p>{fmt(s["tip"])}</p></div>')
        if c["slug"].startswith("03"):
            body = body.replace("<b>Как правильно</b>", "<b>Важно</b>")
        if c["slug"].startswith("05"):
            body = body.replace("<b>Как правильно</b>", "<b>Совет</b>")
    elif k == "compare":
        li = lambda xs: "".join(f"<li>{fmt(x)}</li>" for x in xs)
        body = (f'<div class="z" style="margin-top:90px">{kick()}<h2>{fmt(s["title"])}</h2></div>'
                f'<div class="z cards"><div class="card plus"><b>Плюсы</b><ul>{li(s["plus"])}</ul></div>'
                f'<div class="card minus"><b>Минусы</b><ul>{li(s["minus"])}</ul></div></div>')
    elif k == "list":
        its = "".join(f'<div class="it"><i>{CHECK}</i><span>{fmt(x)}</span></div>' for x in s["items"])
        body = f'<div class="z" style="margin-top:110px">{kick()}<h2>{fmt(s["title"])}</h2></div><div class="z items">{its}</div>'
    elif k == "myth":
        body = (f'<div class="z myth"><div class="label">Миф {s["n"]}</div><br><span class="tag t1">Говорят</span>'
                f'<h2>{fmt(s["myth"])}</h2></div>'
                f'<div class="z truth"><span class="tag">На самом деле</span><p>{fmt(s["truth"])}</p></div>')
        body = body.replace('<div class="label">Миф', '<div class="label" style="margin-bottom:10px">Миф')
    elif k == "stats":
        body = ('<div class="z" style="margin-top:100px"><div class="kicker">О нас в цифрах</div>'
                '<h2>Цифры, за которыми — <span class="g">доверие</span></h2></div><div class="z stats">'
                '<div class="st"><b>2008</b><span>Год основания.<br>Опыт, проверенный временем</span></div>'
                '<div class="st"><b>5 000<i>+</i></b><span>Реализованных<br>проектов</span></div>'
                '<div class="st"><b>2</b><span>Города: Астана<br>и Алматы</span></div></div>')
    elif k == "cta":
        body = (f'<div class="z mid"><div class="kicker">Ваш проект</div>'
                f'<h1>Расскажите, какую мебель <span class="pill">вы хотите</span></h1>'
                f'<p class="sub">Напишите в Direct или оставьте заявку по ссылке в профиле — ответим на вопросы и подскажем, с чего начать.</p>'
                f'<div class="btn">Написать в Direct {ARROW}</div>'
                f'<div class="links"><b>taplink.cc/partnerz</b><span>Астана · Алматы</span></div>'
                f'<div class="save">{BOOKMARK}Сохраните пост, чтобы вернуться к нему</div></div>')
    return f'<section class="s {th}" id="{c["slug"]}_{i:02d}">{bg}{head}{body}{foot}</section>'

out = [f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body>']
for c in CAROUSELS:
    n = len(c["slides"])
    for i, s in enumerate(c["slides"], 1):
        out.append(slide(c, s, i, n))
out.append("</body></html>")
open("carousels.html", "w").write("".join(out))
print(sum(len(c["slides"]) for c in CAROUSELS), "slides")
