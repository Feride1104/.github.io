# Builds subtitle timing: speech segments come from ffmpeg silencedetect,
# words inside a segment are spread by vowel count.
import json, re

segs = [
 (0.00, 2.02, ["В этом доме", "все давно", "*спали."]),
 (2.42, 3.00, ["Ну…"]),
 (3.32, 4.12, ["почти *все."]),
 (4.56, 10.19, ["В три часа", "семнадцать минут", "папа", "и его", "четырёхлетний сын", "решили устроить", "маме *сюрприз."]),
 (10.49, 11.47, ["План был *простой:"]),
 (11.73, 13.71, ["приготовить завтрак,", "пока она *спит."]),
 (14.02, 16.34, ["Но была одна", "небольшая *проблема."]),
 (16.64, 19.86, ["Мама просыпалась", "даже от самого", "*тихого *звука."]),
 (20.18, 23.42, ["Поэтому действовать", "нужно было", "предельно *осторожно."]),
 (23.77, 26.06, ["Первым делом", "им понадобилась", "*скалка."]),
 (26.40, 28.27, ["Сын открыл", "кухонный ящик…"]),
 (28.74, 30.47, ["и случайно", "его *отпустил."]),
 (30.82, 33.67, ["Папа уже представил,", "как просыпается", "*весь *дом."]),
 (33.97, 36.87, ["Но ящик закрылся", "совершенно", "*бесшумно."]),
 (37.19, 38.73, ["Операция", "*продолжилась."]),
 (39.01, 44.27, ["Через *двадцать *минут", "кухня выглядела так,", "будто здесь произошла", "небольшая", "*катастрофа."]),
 (44.59, 46.36, ["Зато завтрак", "был *готов."]),
 (46.66, 48.62, ["Оставалось только", "разбудить *маму."]),
 (48.97, 51.11, ["Правда,", "была одна *деталь…"]),
 (51.47, 55.61, ["Мама уже", "*десять *минут", "стояла за дверью", "и наблюдала", "за ними."]),
 (55.94, 58.90, ["И это был", "лучший *сюрприз", "в её жизни."]),
 (59.46, 60.31, ["*PartnerZ."]),
 (60.62, 63.75, ["Мебель,", "с которой начинаются", "семейные *истории."]),
]

V = set("аеёиоуыэюяaeiouy")
def weight(w):
    n = sum(1 for c in w.lower() if c in V)
    return max(n, 1) + 0.6

chunks = []
for s, e, parts in segs:
    words = []
    for ci, p in enumerate(parts):
        for w in p.split():
            words.append((ci, w))
    tot = sum(weight(w) for _, w in words)
    t = s
    per = (e - s) / tot
    out = {}
    for ci, w in words:
        acc = w.startswith("*")
        txt = w.lstrip("*").upper()
        out.setdefault(ci, []).append({"t": round(t, 3), "w": txt, "a": acc})
        t += weight(w) * per
    for ci in sorted(out):
        chunks.append({"t": out[ci][0]["t"], "words": out[ci]})

# chunk end = next chunk start (or +0.6s after segment end if a pause follows)
seg_end = {}
for s, e, parts in segs:
    for c in chunks:
        if s <= c["t"] < e + 0.01:
            seg_end[id(c)] = e
for i, c in enumerate(chunks):
    nxt = chunks[i + 1]["t"] if i + 1 < len(chunks) else 63.95
    c["end"] = round(min(nxt, seg_end[id(c)] + 0.9), 3)

json.dump(chunks, open("subs.json", "w"), ensure_ascii=False, indent=0)
print(len(chunks), "chunks")
