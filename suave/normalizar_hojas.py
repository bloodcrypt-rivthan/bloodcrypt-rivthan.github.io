#!/usr/bin/env python3
"""Calcula la configuración del Caballero SUAVE a partir de las hojas de suave/ y la escribe en index.html.

NO modifica ninguna imagen: el juego carga directamente suave/caballero-<anim>.png (las hojas originales, a todo su
tamaño) y las reduce al dibujarlas. Este script solo calcula, por cada cuadro, cuánto hay que desplazar el sprite
horizontalmente para que no se mueva sin querer, y lo escribe junto con las medidas y los tiempos:

  - 'caminar'            el ancla sigue al CUERPO (cabeza + tronco), no al pie que se apoya: si no, el cuerpo avanza y
                         retrocede en cada paso mientras el héroe se mueve a velocidad constante.
  - 'reposo', 'golpeado' el ancla sigue a las BOTAS (que quedan fijas entre cuadros): el héroe no se desliza.
  - 'ataque', 'muerte'   se respeta el ancla del artista (el avance de la estocada y la caída son movimiento intencional).

Entrada:  suave/caballero-<anim>.png  y  suave/animaciones.json  (cuadros, celda, ancla, duraciones_ms, bucle...)
Salida:   las entradas knS_* de SPRITE_CFG en index.html, entre las marcas // [suave-cfg:inicio] y // [suave-cfg:fin]
          (celda, escala, ancla, duración de cada cuadro y desplazamiento `off` de cada cuadro, en px de la hoja original).

Uso:  python3 suave/normalizar_hojas.py --aplicar    (escribe en index.html)
      python3 suave/normalizar_hojas.py              (solo muestra lo que calcula)
Requiere Pillow.
"""
import os, re, sys, json
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ALTO_PIE = 64                      # alto (px de pantalla) del Caballero de pie. El Caballero original mide 64 (hoja de 128 px dibujada al 50%);
                                   # más alto = más detalle de tus hojas (que miden 117 px), pero ocupa más pantalla
ALINEAR_BOTAS = {'reposo', 'golpeado'}
ANCLAR_CUERPO = {'caminar'}
ORDEN = ['caminar', 'reposo', 'ataque', 'golpeado', 'muerte']
JUEGO = {'caminar': ('knS_walk', 'walk'), 'reposo': ('knS_idle', 'idle'), 'ataque': ('knS_atk', 'attack'),
         'golpeado': ('knS_hurt', 'hurt'), 'muerte': ('knS_death', 'death')}


def cargar(nombre, meta):
    im = Image.open(os.path.join(AQUI, f'caballero-{nombre}.png')).convert('RGBA')
    n, (cw, ch) = meta['cuadros'], meta['celda']
    if im.size != (cw * n, ch):
        raise SystemExit(f'{nombre}: la hoja mide {im.size} y animaciones.json dice {cw*n}x{ch} ({n} cuadros de {cw}x{ch})')
    return [im.crop((i * cw, 0, (i + 1) * cw, ch)) for i in range(n)]


def mascara(celda):
    return celda.getchannel('A').point(lambda v: 255 if v > 128 else 0)


def cx(zona):
    """x medio (con decimales) de los píxeles opacos de una máscara."""
    col = list(zona.resize((zona.width, 1), Image.BOX).tobytes()); t = sum(col)
    return sum(x * v for x, v in enumerate(col)) / t if t else zona.width / 2


def centro_botas(celda, frac=.10):
    a = mascara(celda); bb = a.getbbox()
    return cx(a.crop((0, bb[3] - max(2, int((bb[3] - bb[1]) * frac)), a.width, bb[3])))


def centro_cuerpo(celda):
    """Promedio del centro de la cabeza (22% superior de la figura) y del tronco (30%-55% de la altura)."""
    a = mascara(celda); bb = a.getbbox(); h = bb[3] - bb[1]
    return (cx(a.crop((0, bb[1], a.width, bb[1] + int(h * .22)))) + cx(a.crop((0, bb[1] + int(h * .30), a.width, bb[1] + int(h * .55))))) / 2


def alto_figura(celda):
    bb = mascara(celda).getbbox(); return bb[3] - bb[1]


def desplazamientos(nombre, celdas, ancla_x):
    """Desplazamiento de cada cuadro (px de la hoja original): el sprite se dibuja movido -off para que el punto de
    referencia (botas o cuerpo) quede siempre en el mismo sitio."""
    if nombre in ALINEAR_BOTAS:
        c0 = centro_botas(celdas[0]); return [centro_botas(c) - c0 for c in celdas]
    if nombre in ANCLAR_CUERPO:
        return [centro_cuerpo(c) - ancla_x for c in celdas]
    return [0.0] * len(celdas)


def calcular():
    meta = json.load(open(os.path.join(AQUI, 'animaciones.json'), encoding='utf-8'))
    alturas = sorted(alto_figura(c) for c in cargar('reposo', meta['reposo']))
    esc = ALTO_PIE / alturas[len(alturas) // 2]          # escala común: el Caballero de pie mide ALTO_PIE px en pantalla
    todo = {}
    for nombre in ORDEN:
        m = meta[nombre]; celdas = cargar(nombre, m)
        off = desplazamientos(nombre, celdas, m['ancla'][0])
        todo[nombre] = {'cuadros': m['cuadros'], 'celda_w': m['celda'][0], 'celda_h': m['celda'][1], 'ancla_x': m['ancla'][0],
                        'dur': m['duraciones_ms'], 'bucle': m.get('bucle', False), 'off': [round(v, 2) for v in off]}
    return todo, esc


def aplicar(todo, esc):
    ruta = os.path.join(AQUI, '..', 'index.html')
    html = open(ruta, encoding='utf-8').read()
    lineas = []
    for nombre in ORDEN:
        clave, anim = JUEGO[nombre]; m = todo[nombre]
        fps = round(1000 / (sum(m['dur']) / len(m['dur'])))
        lineas.append(f"  {clave}: {{ anims:{{ {anim}:[0,{m['cuadros']},{fps}] }}, srcX:0, srcY:0, srcW:{m['celda_w']}, srcH:{m['celda_h']}, "
                      f"drawH:{m['celda_h'] * esc:.3f}, figH:{ALTO_PIE}, stride:{m['celda_w']}, ax:{m['ancla_x'] / m['celda_w']:.4f}, "
                      f"dur:{json.dumps(m['dur'], separators=(',', ':'))}, loop:{'true' if m['bucle'] else 'false'}, "
                      f"off:{json.dumps(m['off'], separators=(',', ':'))} }},")
    nuevo = '  // [suave-cfg:inicio] (lo reescribe suave/normalizar_hojas.py --aplicar)\n' + '\n'.join(lineas) + '\n  // [suave-cfg:fin]'
    html2, k = re.subn(r"  // \[suave-cfg:inicio\].*?// \[suave-cfg:fin\]", lambda _: nuevo, html, flags=re.S)
    if k != 1: raise SystemExit('no se encontraron las marcas [suave-cfg] en index.html')
    open(ruta, 'w', encoding='utf-8').write(html2)
    print('index.html actualizado (SPRITE_CFG de las hojas suaves)')


def main():
    todo, esc = calcular()
    print(f'escala de dibujo: {esc:.5f}  (el Caballero de pie mide {ALTO_PIE} px en pantalla; el original mide 64)')
    for nombre in ORDEN:
        m = todo[nombre]
        print(f"{nombre:9s} {m['cuadros']:2d} cuadros de {m['celda_w']}x{m['celda_h']}  desplazamientos: {m['off']}")
    if '--aplicar' in sys.argv: aplicar(todo, esc)


if __name__ == '__main__':
    main()
