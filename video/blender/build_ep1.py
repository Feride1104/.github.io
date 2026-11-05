# Blender-превиз серии 1 «Ночной гость» (Зубик против Кариеса).
# Запуск: blender -b -P build_ep1.py -- <папка_вывода>   (или python с модулем bpy)
# Создаёт zubik_ep1_previz.blend: персонажи, камеры, анимация по таймингу серии, звук.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Euler, Quaternion

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.getcwd()
HERE = os.path.dirname(os.path.abspath(__file__))
FPS, DUR = 24, 30
fr = lambda t: int(round(t * FPS)) + 1

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
S.render.fps = FPS; S.frame_start = 1; S.frame_end = fr(DUR) - 1
S.render.resolution_x, S.render.resolution_y = 1080, 1920

# ---------------- helpers ----------------
def P(x, y, z):  # координаты «как в three.js» (Y вверх, Z к зрителю) -> Blender (Z вверх, -Y к зрителю)
    return Vector((x, -z, y))
def SC(sx, sy, sz): return Vector((sx, sz, sy))
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)
def mat(name, color, rough=.4, coat=0., metal=0., emit=None, es=1., alpha=1.):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(emit), 1); b.inputs['Emission Strength'].default_value = es
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    m.diffuse_color = (*lin(color), 1)
    return m
def emis(name, color, strength=3.):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*lin(color), 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], o.inputs[0]); return m
def stripes(name, c1, c2, scale=6.):
    m = mat(name, c1, .25, 1.)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    w = nt.nodes.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = scale; w.bands_direction = 'DIAGONAL'
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
    r.color_ramp.elements[0].color = (*lin(c1), 1); r.color_ramp.elements[1].position = .5; r.color_ramp.elements[1].color = (*lin(c2), 1)
    nt.links.new(w.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m
def link(o, coll=None): (coll or S.collection).objects.link(o); return o
def empty(name, loc=(0, 0, 0), parent=None, coll=None):
    o = bpy.data.objects.new(name, None); o.empty_display_size = .5; o.location = loc
    if parent: o.parent = parent
    return link(o, coll)
def obj_from_bm(name, bm, m, loc, scale, parent, coll, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); o.data.materials.append(m)
    o.location = loc; o.scale = scale
    if parent: o.parent = parent
    return link(o, coll)
def sph(name, loc, scale, m, parent=None, coll=None, seg=32, ring=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    return obj_from_bm(name, bm, m, loc, scale, parent, coll)
def cyl(name, loc, r1, r2, depth, m, parent=None, coll=None, seg=32, rot=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth)
    o = obj_from_bm(name, bm, m, loc, (1, 1, 1), parent, coll, smooth=seg > 8)
    if rot: o.rotation_euler = rot
    return o
def capsule(name, a, b, r, m, parent=None, coll=None):
    pts = [a.lerp(b, i / 8) for i in range(9)]
    return tube(name, pts, r, m, parent, coll, caps=True)
def tube(name, pts, r, m, parent=None, coll=None, caps=True, poly=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = caps
    sp = cu.splines.new('POLY' if poly else 'NURBS'); sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts): p.co = (*v, 1)
    if not poly: sp.use_endpoint_u = True; sp.order_u = 3
    o = bpy.data.objects.new(name, cu); o.data.materials.append(m)
    if parent: o.parent = parent
    return link(o, coll)
def halfdisc(name, r, center, m, parent=None, coll=None):
    bm = bmesh.new(); c = bm.verts.new(center); arc = []
    for i in range(25):
        a = math.pi + math.pi * i / 24
        arc.append(bm.verts.new(center + Vector((r * math.cos(a), 0, r * math.sin(a)))))
    for i in range(24): bm.faces.new((c, arc[i + 1], arc[i]))
    return obj_from_bm(name, bm, m, (0, 0, 0), (1, 1, 1), parent, coll, smooth=False)
def lathe(name, prof, m, parent=None, coll=None, seg=40):
    bm = bmesh.new(); rings = []
    for r, z in prof: rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    return obj_from_bm(name, bm, m, (0, 0, 0), (1, 1, 1), parent, coll)
def catmull(pts, n=60):
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for k in range(n // (len(pts) - 1)):
            t = k / (n // (len(pts) - 1)); t2, t3 = t * t, t * t * t
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1]); return out
def at_u(pts, u):
    f = u * (len(pts) - 1); i = min(int(f), len(pts) - 2); return pts[i].lerp(pts[i + 1], f - i)
def coll(name):
    c = bpy.data.collections.new(name); S.collection.children.link(c); return c
def key_vis(o, f, show):
    o.hide_render = not show; o.hide_viewport = not show
    o.keyframe_insert('hide_render', frame=f); o.keyframe_insert('hide_viewport', frame=f)
class VisTrack:  # ставит ключи видимости только при изменении
    def __init__(self): self.last = {}
    def __call__(self, o, f, show):
        if self.last.get(o.name) != show: key_vis(o, f, show); self.last[o.name] = show
vis = VisTrack()
def key_loc(o, f, v): o.location = v; o.keyframe_insert('location', frame=f)
def key_scale(o, f, v): o.scale = v; o.keyframe_insert('scale', frame=f)
def key_rot(o, f, v): o.rotation_euler = v; o.keyframe_insert('rotation_euler', frame=f)
clamp = lambda v, a=0., b=1.: max(a, min(b, v))
prog = lambda t, a, b: clamp((t - a) / (b - a))
ease = lambda k: 4 * k ** 3 if k < .5 else 1 - (-2 * k + 2) ** 3 / 2
def rand(i): x = math.sin(i * 127.1 + 311.7) * 43758.5453; return x - math.floor(x)

# ---------------- materials ----------------
M = dict(
    tooth=mat('Зуб', '#f6f9ff', .15, 1.), white=mat('Белый', '#ffffff', .15), black=mat('Чёрный', '#14182a', .2),
    cheek=mat('Румянец', '#ff8fa8', .6), mouth=mat('Ротик', '#b8243f', .4), tongueS=mat('Язычок', '#ff8fa3', .5),
    arm=mat('Ручки', '#3b6ea8', .35, .6), spot=mat('Налёт', '#b08429', .85),
    gum=mat('Десна', '#e0708c', .5, .3), tongue=mat('Язык', '#d65a7c', .55, .2), lips=mat('Губы', '#c84e6a', .4, .4),
    cave=mat('Полость рта', '#7a2a48', .9), milk=mat('Молоко', '#fffaf0', .2, 1.), nipple=mat('Соска', '#f2c98a', .35, .8),
    bottle=mat('Бутылочка', '#e8f4ff', .05, 0, alpha=.35), ring=mat('Кольцо', '#5ab0ff', .3, .6),
    pink=mat('Ручка щётки', '#ff6fa5', .2, 1.), bristleW=mat('Щетина белая', '#ffffff', .5), bristleB=mat('Щетина голубая', '#7fd3ff', .5),
    eyeGlow=emis('Глаза в темноте', '#ffd21a', 3.), germMouth=mat('Пасть микроба', '#3a1020', .5),
)
M['hat'] = stripes('Шляпа-фантик', '#ff4f8b', '#ffe14d', 4.)
M['cane'] = stripes('Трость-леденец', '#ffffff', '#e8304a', 9.)

# ---------------- characters ----------------
CH = coll('Персонажи'); ENV = coll('Окружение'); CAMS = coll('Камеры'); CANDY = coll('Сцена с конфетами')

def make_tooth(name, arms, c):
    root = empty(name + '_CTRL', coll=c); body = empty(name + '_тело', parent=root, coll=c)
    sph(name + '_коронка', P(0, 0, 0), SC(1, 1.15, .85), M['tooth'], body, c)
    for s in (-1, 1): sph(name + '_бугорок', P(s * .45, .78, 0), SC(.58, .5, .6), M['tooth'], body, c)
    sph(name + '_шейка', P(0, -.9, 0), SC(.8, .7, .7), M['tooth'], body, c)
    parts = dict(root=root, body=body, open=[], closed=[], smile=[], frown=[], sleep=[], spots=[], arm=None)
    for s in (-1, 1):
        parts['open'] += [sph(name + '_глаз', P(s * .36, .25, .74), SC(.25, .3, .14), M['white'], body, c),
                          sph(name + '_зрачок', P(s * .34, .22, .86), SC(.13, .15, .06), M['black'], body, c),
                          sph(name + '_блик', P(s * .34 - .04, .28, .91), SC(.045, .045, .02), M['white'], body, c)]
        arc = [P(s * .36 + .17 * math.cos(math.pi + math.pi * i / 10), .27 + .17 * math.sin(math.pi + math.pi * i / 10), .8) for i in range(11)]
        parts['closed'].append(tube(name + '_веко', arc, .035, M['black'], body, c))
        sph(name + '_щёчка', P(s * .62, -.08, .64), SC(.16, .1, .06), M['cheek'], body, c)
    parts['smile'] += [halfdisc(name + '_улыбка', .3, P(0, -.16, .86), M['mouth'], body, c),
                       halfdisc(name + '_язычок', .14, P(0, -.29, .865), M['tongueS'], body, c)]
    zz = [P(-.28 + i * .07, -.22 + (.05 if i % 2 else 0), .85) for i in range(9)]
    parts['frown'].append(tube(name + '_дрожащий_рот', zz, .028, M['black'], body, c, poly=True))
    for s in (-1, 1):
        parts['frown'].append(capsule(name + '_бровь', P(s * .36 - .12, .62 + s * .04, .67), P(s * .36 + .12, .62 - s * .04, .67), .035, M['black'], body, c))
    parts['sleep'].append(sph(name + '_сонный_рот', P(0, -.2, .83), SC(.07, .09, .04), M['mouth'], body, c))
    for i, (x, y) in enumerate([(-.55, .5), (.52, .52), (.6, -.45), (-.62, -.48), (.15, -.68), (-.12, .82)]):
        z = .85 * math.sqrt(max(.05, 1 - x * x - (y / 1.15) ** 2)) + .01
        o = sph(name + f'_пятно{i + 1}', P(x, y, z), (0, 0, 0), M['spot'], body, c, 16, 8)
        n = P(x, y / 1.32, z / .72).normalized(); o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, -1, 0)).rotation_difference(n)
        o['base'] = (.17 - i * .01, .04, .15 - i * .01); parts['spots'].append(o)
    if arms:
        aL = empty(name + '_рука_L', P(-.95, -.1, .1), body, c); aL.rotation_euler = (0, .6, 0)
        capsule(name + '_рука', Vector((0, 0, 0)), Vector((0, 0, -.8)), .09, M['arm'], aL, c); sph(name + '_кисть', (0, 0, -.9), (.17,) * 3, M['arm'], aL, c)
        aR = empty(name + '_рука_R', P(.95, -.1, .1), body, c); aR.rotation_euler = (0, -.6, 0)
        capsule(name + '_рука', Vector((0, 0, 0)), Vector((0, 0, -.8)), .09, M['arm'], aR, c); sph(name + '_кисть', (0, 0, -.9), (.17,) * 3, M['arm'], aR, c)
        parts['arm'] = aR
    return parts

def make_germ(name, color, seed, c):
    root = empty(name + '_CTRL', coll=c); body = empty(name + '_тело', parent=root, coll=c)
    m = mat(name + '_кожа', color, .5, .4)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1)
    for v in bm.verts:
        x, y, z = v.co; v.co *= 1 + .07 * math.sin(x * 5 + seed) * math.sin(z * 5) * math.sin(y * 5 + seed * 2)
    obj_from_bm(name + '_тело_меш', bm, m, (0, 0, 0), (1, 1, 1), body, c)
    for i in range(16):
        phi = math.acos(1 - 2 * (i + .5) / 16); th = i * 2.4 + seed
        d = Vector((math.sin(phi) * math.cos(th), math.cos(phi), math.sin(phi) * math.sin(th)))
        if d.z > .6: continue
        sph(name + '_шип', P(*(d * 1.02)), (.22,) * 3, m, body, c, 12, 8)
    eyes = []
    for s in (-1, 1):
        e = empty(name + '_глаз', P(s * .33, .18, .86), body, c); eyes.append(e)
        sph(name + '_белок', (0, 0, 0), SC(.24, .26, .15), M['white'], e, c, 16, 8)
        sph(name + '_зрачок', P(-s * .03, -.03, .11), SC(.11, .12, .05), M['black'], e, c, 12, 8)
        capsule(name + '_злая_бровь', P(s * .33 - .19, .52 - s * .09, .86), P(s * .33 + .19, .52 + s * .09, .86), .045, M['black'], body, c)
    halfdisc(name + '_пасть', .36, P(0, -.2, .93), M['germMouth'], body, c)
    for x in (-.15, .12): cyl(name + '_клык', P(x, -.25, .95), .06, 0, .15, M['white'], body, c, 4, rot=(math.pi, 0, 0))
    return dict(root=root, body=body, eyes=eyes)

def make_caries(name, c):
    g = make_germ(name, '#6a3fb0', 7, c)
    hat = empty(name + '_треуголка', P(0, .95, 0), g['body'], c); hat.rotation_euler = (0, -.15, 0)
    cyl(name + '_шляпа', (0, 0, 0), 1.2, 1.05, .35, M['hat'], hat, c, 3, rot=(0, 0, math.pi / 2))
    sph(name + '_тулья', (0, 0, .25), (.62, .62, .45), M['hat'], hat, c)
    for s in (-1, 1): cyl(name + '_хвостик_фантика', (s * 1.25, .3, .05), .22, 0, .5, M['hat'], hat, c, 12, rot=(0, s * math.pi / 2, 0))
    cane = empty(name + '_трость', P(1.25, -.1, .3), g['root'], c)
    pts = [P(*v) for v in [(0, -1.3, 0), (0, .4, 0), (0, 1.0, 0), (-.12, 1.32, 0), (-.4, 1.42, 0), (-.6, 1.2, 0)]]
    tube(name + '_леденец', pts, .11, M['cane'], cane, c)
    g['cane'] = cane; return g

# ---------------- environment (рот) ----------------
cave = sph('Полость_рта', P(0, 5, -5), (40, 40, 40), M['cave'], coll=ENV, seg=48, ring=24); cave.visible_shadow = False
RAD, ANG = 9, .27
teeth = []
for i in range(7):
    a = (i - 3) * ANG
    T = make_tooth('Зубик' if i == 3 else f'Зуб{i + 1}', i == 3, CH if i == 3 else ENV)
    T['s'] = 1.12 if i == 3 else 1.
    T['base'] = P(RAD * math.sin(a), 0, RAD * math.cos(a) - RAD)
    T['root'].location = T['base']; T['root'].rotation_euler = (0, 0, -a * .7); T['root'].scale = (T['s'],) * 3
    teeth.append(T)
ZI = 3
top_of = lambda i: teeth[i]['base'] + Vector((0, 0, 1.3 * teeth[i]['s']))
gp = [P(RAD * math.sin(a), -1.2, RAD * math.cos(a) - RAD) for a in [-1.05 + k / 24 * 2.1 for k in range(25)]]
tube('Десна', gp, 1.15, M['gum'], coll=ENV)
sph('Язык', P(0, -2.7, 4.6), SC(6.5, 1.7, 4.2), M['tongue'], coll=ENV)
OPEN = P(0, 7.2, -12)
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=False, segments=64, radius=4.6)
lipsO = bpy.data.objects.new('Губы', bpy.data.curves.new('ГубыК', 'CURVE'))
lipsO.data.bevel_depth = 1.3; lipsO.data.bevel_resolution = 6; lipsO.data.dimensions = '3D'
spl = lipsO.data.splines.new('NURBS'); spl.points.add(63); spl.use_cyclic_u = True
for k, p in enumerate(spl.points): a = 2 * math.pi * k / 64; p.co = (4.6 * math.cos(a), 0, 4.6 * .62 * math.sin(a), 1)
lipsO.data.materials.append(M['lips']); lipsO.location = OPEN; link(lipsO, ENV); bm.free()
# небо: ночь/утро (смешивание по ключам)
skyM = bpy.data.materials.new('Небо'); skyM.use_nodes = True; nt = skyM.node_tree; nt.nodes.clear()
outN = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader')
eN = nt.nodes.new('ShaderNodeEmission'); eD = nt.nodes.new('ShaderNodeEmission')
eN.inputs['Color'].default_value = (*lin('#141c55'), 1); eD.inputs['Color'].default_value = (*lin('#aee0ff'), 1)
eN.inputs['Strength'].default_value = 1.2; eD.inputs['Strength'].default_value = 1.1
vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 18
ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .0; ramp.color_ramp.elements[0].color = (1, 1, .85, 1)
ramp.color_ramp.elements[1].position = .05; ramp.color_ramp.elements[1].color = (*lin('#141c55'), 1)
nt.links.new(vor.outputs['Distance'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], eN.inputs['Color'])
nt.links.new(eN.outputs[0], mix.inputs[1]); nt.links.new(eD.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], outN.inputs[0])
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=4.75)
sky = obj_from_bm('Небо_в_окне', bm, skyM, OPEN + Vector((0, .4, 0)), (1, .62, 1), None, ENV, smooth=False)
sky.rotation_euler = (math.pi / 2, 0, 0); sky.visible_shadow = False
moon = sph('Луна', OPEN + Vector((1.9, .3, 1.3)), (.55, .1, .55), emis('Луна', '#fff3b0', 6), coll=ENV)
# глаза в темноте (крючок)
hook = empty('Глаза_в_темноте_CTRL', OPEN + Vector((0, -.3, .1)), coll=CH)
hookParts = [sph('Глаз_жёлтый', (s * .55, 0, .25), (.32, .05, .2), M['eyeGlow'], hook, CH) for s in (-1, 1)]
grin = tube('Ухмылка', [Vector((.75 * math.cos(a), 0, .05 + .75 * math.sin(a) * .6)) for a in [math.pi * (1.15 + .7 * i / 12) for i in range(13)]], .07, M['eyeGlow'], hook, CH)
# бутылочка
bottle = empty('Бутылочка_CTRL', coll=CH)
cyl('Бутылка', (0, 0, 3.2), 1.6, 1.6, 3.4, M['bottle'], bottle, CH, 40)
cyl('Молоко_в_бутылке', (0, 0, 2.8), 1.45, 1.45, 2.6, M['milk'], bottle, CH, 40)
cyl('Кольцо', (0, 0, 1.4), 1.7, 1.7, .6, M['ring'], bottle, CH, 40)
lathe('Соска', [(0.001, -1.75), (.22, -1.72), (.33, -1.45), (.3, -1.05), (.45, -.4), (1.1, .5), (1.45, 1.15)], M['nipple'], bottle, CH)
BOT_IN = P(0, 6.6, -7.6); BOT_ROT = Euler((-.25, -.15, 0))
TIP = BOT_IN + BOT_ROT.to_matrix() @ Vector((0, 0, -1.75))
T5 = top_of(5) + Vector((0, 0, .1))
STREAM = catmull([TIP, P(2.6, 4.6, -5.2), P(4.3, 3.0, -2.6), T5], 60)
stream = tube('Струя_молока', STREAM, .2, M['milk'], coll=CH, poly=True)
pool = sph('Лужица_молока', T5 - Vector((0, 0, .05)), (.6, .45, .08), M['milk'], coll=CH)
# микробы и Кариес
GCOL = ['#7ed957', '#ffb347', '#b07cff']; GNAME = ['Кисляк_зелёный', 'Кисляк_оранжевый', 'Кисляк_фиолетовый']
germs = [make_germ(GNAME[i], GCOL[i], i + 1, CH) for i in range(3)]
car = make_caries('Капитан_Кариес', CH)
# щётка
brush = empty('Щётка_Шустрик_CTRL', coll=CH)
capsule('Ручка', Vector((.5, 0, 0)), Vector((5.5, 0, 0)), .28, M['pink'], brush, CH)
cyl('Головка', (0, 0, 0), .5, .5, 1.8, M['pink'], brush, CH, 4, rot=(0, math.pi / 2, math.pi / 4))
for i in range(6):
    for j in range(2): cyl('Щетинка', (-.7 + i * .28, -.12 + j * .24, .6), .1, .1, .8, M['bristleB' if i % 2 else 'bristleW'], brush, CH, 8)
for i in range(6): sph('Пена', (-.8 + i * .32, 0, 1.1 + (i % 2) * .15), (.28,) * 3, M['white'], brush, CH, 12, 8)

# ---------------- сцена с коробкой конфет (смещена в сторону) ----------------
CO = Vector((60, 0, 0))
cyl('Стол', CO + Vector((0, 0, -.5)), 30, 30, 1, mat('Стол', '#c98b5a', .6), coll=CANDY, seg=48)
wall = cyl('Стена', CO + Vector((0, 8, 10)), 30, 30, .5, mat('Стена', '#ffe9d1', .95), coll=CANDY, seg=4, rot=(math.pi / 2, 0, math.pi / 4))
def heart_curve(name, s, depth, m, loc, parent=None):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = depth / 2; cu.bevel_depth = .1; cu.bevel_resolution = 3
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(1); sp.use_cyclic_u = True
    a, b = sp.bezier_points
    a.co = (0, -1.6 * s, 0); b.co = (0, 1.1 * s, 0)
    a.handle_right_type = a.handle_left_type = b.handle_right_type = b.handle_left_type = 'FREE'
    a.handle_right = (-2.6 * s, .2 * s, 0); b.handle_left = (-1.6 * s, 2.2 * s, 0); b.handle_right = (1.6 * s, 2.2 * s, 0); a.handle_left = (2.6 * s, .2 * s, 0)
    o = bpy.data.objects.new(name, cu); o.data.materials.append(m); o.location = loc
    if parent: o.parent = parent
    return link(o, CANDY)
heart_curve('Коробка_сердце', 1, 1.1, mat('Коробка', '#d12b4f', .25, 1.), CO + Vector((0, 0, .55)))
heart_curve('Дырка_коробки', .82, .02, mat('Внутри_коробки', '#3a0d18', .9), CO + Vector((0, 0, 1.2)))
hinge = empty('Крышка_петля', CO + Vector((0, 1.75, 1.25)), coll=CANDY)
heart_curve('Крышка', 1.04, .25, mat('Крышка', '#ff4f72', .2, 1.), Vector((0, -1.75, .1)), hinge)
for k, (x, y, cc) in enumerate([(-3.4, -1.8, '#ff6f91'), (3.2, -2.2, '#7ed957'), (-2.6, -3.4, '#ffc93c'), (2.4, -3.6, '#6c8cff'), (4.4, -.2, '#ffb347')]):
    cm = mat('Конфета', cc, .15, 1.); e = empty('Конфета', CO + Vector((x, y, .35)), coll=CANDY); e.rotation_euler = (0, 0, k)
    sph('Конфета', (0, 0, 0), (.5, .35, .35), cm, e, CANDY)
    for s in (-1, 1): cyl('Фантик', (s * .62, 0, 0), .3, 0, .45, cm, e, CANDY, 16, rot=(0, -s * math.pi / 2, 0))
car2 = make_caries('Капитан_Кариес_в_коробке', CANDY)

# ---------------- свет ----------------
world = bpy.data.worlds.new('Мир'); S.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']
sun = bpy.data.objects.new('Луна_свет / Солнце', bpy.data.lights.new('Ключевой', 'SUN')); link(sun, ENV)
sun.rotation_euler = (math.radians(40), math.radians(-15), math.radians(-20)); sun.data.angle = math.radians(8)
rim = bpy.data.objects.new('Контровой_розовый', bpy.data.lights.new('Контровой', 'POINT')); link(rim, ENV)
rim.location = P(6, 4, -4); rim.data.shadow_soft_size = 1.5; rim.data.color = lin('#ff5fa0')
fill = bpy.data.objects.new('Заполняющий', bpy.data.lights.new('Заполняющий', 'AREA')); link(fill, ENV)
fill.location = P(0, 6, 12); fill.data.size = 10; fill.rotation_euler = (math.radians(60), 0, 0)
eyeL = bpy.data.objects.new('Свет_глаз', bpy.data.lights.new('Свет_глаз', 'POINT')); link(eyeL, ENV)
eyeL.location = OPEN + Vector((0, -1.5, 0)); eyeL.data.color = lin('#ffe14d')
cl = bpy.data.objects.new('Свет_кухни', bpy.data.lights.new('Свет_кухни', 'SUN')); link(cl, CANDY)
cl.rotation_euler = (math.radians(45), 0, math.radians(-30)); cl.data.energy = 0; cl.data.color = lin('#fff0d8')
def key_light(t, night):
    f = fr(t)
    sun.data.color = lin('#9fb4ff') if night else lin('#fff2d8'); sun.data.energy = 1.2 if night else 3.5
    rim.data.energy = 900 if night else 250; fill.data.energy = 0 if night else 900
    bg.inputs['Color'].default_value = (*lin('#2a1840' if night else '#ffd6e0'), 1); bg.inputs['Strength'].default_value = .3 if night else .8
    mix.inputs['Fac'].default_value = 0 if night else 1
    M['cave'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#3a1030' if night else '#e48aa2'), 1)
    for d, p in [(sun.data, 'color'), (sun.data, 'energy'), (rim.data, 'energy'), (fill.data, 'energy')]: d.keyframe_insert(p, frame=f)
    bg.inputs['Color'].keyframe_insert('default_value', frame=f); bg.inputs['Strength'].keyframe_insert('default_value', frame=f)
    mix.inputs['Fac'].keyframe_insert('default_value', frame=f)
    M['cave'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].keyframe_insert('default_value', frame=f)
key_light(0, True); key_light(20.96, True); key_light(21.0, False)

# ---------------- камеры ----------------
def make_cam(name, c):
    cd = bpy.data.cameras.new(name); cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(62)
    o = bpy.data.objects.new(name, cd); o.rotation_mode = 'QUATERNION'; return link(o, c)
camM = make_cam('Камера_рот', CAMS); camC = make_cam('Камера_конфеты', CAMS)
def look(pos, tgt, roll=0.):
    q = (tgt - pos).to_track_quat('-Z', 'Y'); return q @ Quaternion((0, 0, 1), roll)
prevq = [None]
def key_cam(o, t, pos, tgt, roll=0.):
    q = look(pos, tgt, roll)
    if prevq[0] is not None and q.dot(prevq[0]) < 0: q.negate()
    prevq[0] = q; o.location = pos; o.rotation_quaternion = q
    o.keyframe_insert('location', frame=fr(t)); o.keyframe_insert('rotation_quaternion', frame=fr(t))
CK = [(0, (0, 7.3, -3.2), (0, 7.3, -12), .16), (1.8, (0, 7.25, -3.9), (0, 7.2, -12), .12),
      (4.6, (0, 3.4, 13.5), (0, 2.5, -2), 0), (8.55, (1.2, 3.5, 13), (1.8, 2.6, -2), 0),
      (8.95, (0, 1.15, 5.6), (0, .55, 0), 0), (12.9, (0, 1.05, 4.9), (0, .55, 0), .03),
      (13.3, (-2.5, 3.4, 13.5), (0, 2.0, -2), 0), (18.2, (2.5, 3.3, 13.5), (0, 2.0, -2), 0),
      (18.9, (0, 1.0, 4.2), (0, .7, 0), 0), (20.95, (0, .95, 3.5), (0, .7, 0), 0),
      (21.0, (0, 3.4, 13.5), (0, 2.4, -2), 0), (26, (0, 3.2, 12.5), (0, 2.3, -2), 0)]
for t, p, g, r in CK: key_cam(camM, t, P(*p), P(*g), r)
# тряска камеры во время погони (модификатор шума на F-кривой)
ad = camM.animation_data
for fc in ad.action.fcurves if hasattr(ad.action, 'fcurves') else []:
    if fc.data_path == 'location' and fc.array_index in (0, 2):
        nz = fc.modifiers.new('NOISE'); nz.scale = 2; nz.strength = .12; nz.use_restricted_range = True
        nz.frame_start = fr(13.2); nz.frame_end = fr(18); nz.blend_in = 3; nz.blend_out = 3
prevq[0] = None
key_cam(camC, 26, CO + P(0, 5.2, 9.5), CO + P(0, 1.8, 0)); key_cam(camC, 28.2, CO + P(0, 3.9, 6.6), CO + P(0, 1.8, 0))
S.camera = camM
for t, cam, label in [(0, camM, 'Рот'), (26, camC, 'Конфеты')]:
    mk = S.timeline_markers.new(label, frame=fr(t)); mk.camera = cam
for t, label in [(0, '1 Крючок: глаза'), (4.6, '2 Бутылочка и Кариес'), (8.6, '3 Зубик просыпается'), (13.1, '4 Микробы прыгают'),
                 (18.2, '5 Пятно на Зубике'), (21, '6 Утро, щётка'), (23.6, '6б Совет'), (27.6, '7 Подмигивание')]:
    if t not in (0, 26): S.timeline_markers.new(label, frame=fr(t))

# ---------------- анимация персонажей ----------------
HOP, H0 = .7, 13.1
SEQ = [[0, 1, 2, 1, 0, 2, 1], [6, 4, 6, 4, 6, 4, 6], [2, 4, 1, 6, 0, 4, 2]]; START = [0, 6, 2]
def landings(t):
    L = [0] * 7
    if t < H0: return L
    for s in SEQ:
        for k in range(min(len(s), int((t - H0) // HOP))): L[s[k]] += 1
    return L
GR = .55
def germ_pos(g, t):
    sit = lambda i: top_of(i) + Vector((0, 0, GR))
    if t < 6.4: return None
    if t < 8.8:
        u = ease(prog(t, 6.6 + g * .3, 7.9 + g * .3))
        if u <= 0: return None
        return at_u(STREAM, u) + Vector(((g - 1) * .5 * u, 0, .45)), 1
    if t < 13: a = t * 1.6 + g * 2.1; return P(math.cos(a) * 1.65, .35 + math.sin(a) * 1.35, 1.0), 1
    if t < H0: return sit(START[g]), 1
    if t < H0 + HOP * 7:
        k = (t - H0) / HOP; st = int(k); f = k - st
        fr_, to = (START[g] if st == 0 else SEQ[g][st - 1]), SEQ[g][min(st, 6)]
        p = sit(fr_).lerp(sit(to), f); p.z += math.sin(math.pi * f) * 2; return p, 1
    p = sit(SEQ[g][6])
    if g == 2 and t > 18.6: f = prog(t, 18.6, 19.1); p = p.lerp(P(.75, 1.25, .75), f); p.z += math.sin(math.pi * f) * 1.6
    if t > 22: f = ease(prog(t, 22 + g * .15, 23.2 + g * .15)); p = p.lerp(OPEN + P((g - 1) * 1.2, -1, 2), f); return p, 1 - f * .7
    return p, 1

def look_at_cam(o, cam):
    c = o.constraints.new('TRACK_TO'); c.target = cam; c.track_axis = 'TRACK_NEGATIVE_Y'; c.up_axis = 'UP_Z'
for gm in germs: look_at_cam(gm['root'], camM)
look_at_cam(car['root'], camM); look_at_cam(car2['root'], camC)

def meshes_under(root): return [o for o in root.children_recursive if o.type != 'EMPTY']
for gm in germs: gm['meshes'] = meshes_under(gm['root'])
CAR_MESHES = meshes_under(car['root'])
STEP = 2  # ключ каждые 2 кадра для сложных траекторий
for f in range(1, fr(DUR)):
    t = (f - 1) / FPS
    night = t < 21
    # --- зубы ---
    L = landings(t); bx = -12 + 25 * ease(prog(t, 22.1, 23.9))
    for i, T in enumerate(teeth):
        isZ = i == ZI
        dirt = (1 if t > 19.1 else 0) if isZ else (1 if L[i] > 0 else 0)
        nsp = (1 if t > 19.1 else 0) if isZ else min(6, L[i] * 2)
        if not night: dirt = 1 if (isZ or L[i] > 0) else 0
        if isZ and 19.1 < t < 19.6: dirt = prog(t, 19.1, 19.6)
        clean = clamp((bx - 1 - T['base'].x) / 1.5)
        if t > 22: dirt *= 1 - clean
        sleep = night; mood = 1
        if isZ and t > 9.3 and night: sleep = False; mood = 0
        if not night: mood = 1 if clean > .9 else .3
        blink = ((t + rand(i) * 3) % 3.3) < .12
        vis_open = not (sleep or blink)
        for o in T['open']: vis(o, f, vis_open)
        for o in T['closed']: vis(o, f, not vis_open)
        for o in T['smile']: vis(o, f, (not sleep) and mood >= .5)
        for o in T['frown']: vis(o, f, (not sleep) and mood < .5)
        for o in T['sleep']: vis(o, f, sleep)
        for k, o in enumerate(T['spots']):
            sc = Vector(o['base']) * (dirt if k < nsp else 0)
            if (o.get('last') is None) or (Vector(o['last']) - sc).length > 1e-3 or f == 1:
                key_scale(o, f, sc); o['last'] = tuple(sc)
        happy = (not night) and clean > .9
        if f % STEP == 1 or f == 1:
            bounce = abs(math.sin((t - 23) * 5 + i)) * .45 if happy else 0
            key_loc(T['root'], f, T['base'] + Vector((0, 0, bounce)))
            if isZ:
                shake = math.sin(t * 30) * .03 if (night and t > 9.3) else 0
                key_rot(T['root'], f, (0, shake, -0.0))
                if T['arm']: key_rot(T['arm'], f, (0, -(.6 + (1 if happy else 0) * (2.0 + math.sin(t * 10) * .35)), 0))
    if f % STEP != 1 and f != 1: continue
    # --- глаза в темноте ---
    ea = min(prog(t, .25, .5), 1 - prog(t, 3.0, 3.5))
    for o in hookParts + [grin]: vis(o, f, ea > 0)
    bl = .15 if (t % 1.7) < .1 else 1
    for o in hookParts: key_scale(o, f, (.32, .05, .2 * bl))
    key_scale(grin, f, (max(.01, prog(t, .9, 1.4)),) * 3)
    eyeL.data.energy = ea * 60; eyeL.data.keyframe_insert('energy', frame=f)
    # --- бутылочка, струя ---
    inK = 1 - (1 - prog(t, 4.3, 5.0)) ** 3; outK = ease(prog(t, 21.6, 22.4))
    key_loc(bottle, f, BOT_IN + Vector((0, 0, (1 - inK) * 10 + outK * 12))); bottle.rotation_euler = BOT_ROT
    vis(bottle, f, inK > 0 and outK < 1)
    for ch in bottle.children: vis(ch, f, inK > 0 and outK < 1)
    sa = min(prog(t, 4.9, 5.3), 1 - prog(t, 20.9, 21.2)); grow = prog(t, 4.9, 5.5)
    vis(stream, f, sa > 0); stream.data.bevel_factor_end = max(.001, grow); stream.data.keyframe_insert('bevel_factor_end', frame=f)
    vis(pool, f, sa > 0 and grow > .9)
    # --- щётка ---
    bk = prog(t, 22.1, 23.9); a = math.asin(clamp(bx / RAD, -1, 1))
    on = 0 < bk < 1
    for o in [brush] + list(brush.children): vis(o, f, on)
    key_loc(brush, f, P(bx, .7 + math.sin(bk * 60) * .25, RAD * math.cos(a) - RAD + 1.7)); key_rot(brush, f, (math.pi + .15, 0, -a))
    # --- микробы ---
    for g, gm in enumerate(germs):
        r = germ_pos(g, t)
        for o in gm['meshes']: vis(o, f, r is not None)
        if r: key_loc(gm['root'], f, r[0]); key_scale(gm['root'], f, (GR * r[1],) * 3)
        key_rot(gm['body'], f, (0, math.sin(t * 2.5 + g) * .25, 0))
    # --- Кариес ---
    show = 5.2 < t < 23.8
    for o in CAR_MESHES: vis(o, f, show)
    u = ease(prog(t, 5.3, 7.2)); p = at_u(STREAM, u) + Vector((0, 0, .7))
    if t > 22.6: p = p.lerp(OPEN + P(1.5, -1, 2), ease(prog(t, 22.6, 23.8)))
    key_loc(car['root'], f, p); key_scale(car['root'], f, (.78,) * 3)
    key_rot(car['cane'], f, (0, -(math.sin(t * 6) * .5 if 13 < t < 18 else .15), 0))
    # --- сцена с конфетами ---
    lt = t - 26
    lidK = 1 - (1 - prog(lt, .4, 1.0)) ** 3
    key_rot(hinge, f, (-lidK * 1.9, 0, 0))
    k = prog(lt, .7, 1.3); c1, c3 = 1.9, 2.9; rise = 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2 if k > 0 else 0
    key_loc(car2['root'], f, CO + Vector((0, 0, .2 + rise * 1.75))); key_scale(car2['root'], f, (.85,) * 3)
    key_scale(car2['eyes'][1], f, (1, 1, .12 if 1.5 < lt < 2.1 else 1))
cl.data.energy = 0; cl.data.keyframe_insert('energy', frame=fr(25.9)); cl.data.energy = 4; cl.data.keyframe_insert('energy', frame=fr(26))

# ---------------- звук ----------------
wav = os.path.join(HERE, 'zubik_ep1_sound.wav')
if os.path.exists(wav):
    S.sequence_editor_create()
    strips = S.sequence_editor.strips if hasattr(S.sequence_editor, 'strips') else S.sequence_editor.sequences
    snd = strips.new_sound('Звук серии 1', wav, channel=1, frame_start=1)
    try: snd.sound.pack()
    except Exception as e: print('sound pack', e)

# ---------------- рендер ----------------
S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = 6; S.cycles.use_denoising = True; S.cycles.use_adaptive_sampling = True; S.cycles.caustics_reflective = False; S.cycles.caustics_refractive = False
S.cycles.max_bounces = 3; S.cycles.diffuse_bounces = 2; S.cycles.glossy_bounces = 2; S.cycles.transparent_max_bounces = 4; S.render.use_persistent_data = True
S.view_settings.view_transform = 'Standard'
S.render.image_settings.file_format = 'PNG'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'zubik_ep1_previz.blend'), compress=True)
print('SAVED', os.path.join(OUT, 'zubik_ep1_previz.blend'))
