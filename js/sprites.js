// Blood Crypt — carga de sprites y su configuración (SPRITE_CFG). El orden de carga está en index.html (ver CLAUDE.md).
// ─── SPRITE SHEETS ────────────────────────────────────────────────────────────
const SPRITES = {};
(function loadSprites(){
  // Knight — 19 frames x 96px: idle(0-4) walk(5-9) attack(10-13) death(14-18)
  const knightImg = new Image();
  knightImg.src = 'sprites/knight.png';
  knightImg.onload = () => { SPRITES.knight = knightImg; };
  // Knight NUEVO v2 (caballero negro, visor cian, cresta en el casco): 5 celdas de 149x128 = cuadros 4,3,5,1 de la hoja de caminata + cuadro 6 (idle).
  // Caminata 4-3-5-1-3-4 => seq [0,1,2,3,1,0]. La hoja vieja (SPRITES.knight) queda como respaldo si esta no carga.
  const knightNewImg = new Image();
  knightNewImg.src = 'sprites/knightNew.png';
  knightNewImg.onload = () => { SPRITES.knightNew = knightNewImg; };
  // Knight ATAQUE (hoja attack_knight.png): 4 celdas de 249x153 = cuadros 5,3,4,2. Ataque 5-3-4-2-4-3 => seq [0,1,2,3,2,1].
  // Misma escala por pixel que la hoja de caminata (por eso la celda es más grande: incluye la espada alzada/estocada).
  const knightAtkImg = new Image();
  knightAtkImg.src = 'sprites/knightAtk.png';
  knightAtkImg.onload = () => { SPRITES.knightAtk = knightAtkImg; };

  // Caballero SUAVE: una hoja por animación, cargadas tal cual desde suave/ (sin procesar; suave/normalizar_hojas.py solo calcula su configuración).
  // Se usan cuando el botón de la pausa dice "ANIM. CABALLERO: SUAVE"; con "ORIGINAL" se siguen usando las hojas de arriba.
  // Si alguna no carga, el modo SUAVE cae a las hojas originales con movimiento por código (ver knightSheetsReady).
  [['knSWalk','caminar'],['knSIdle','reposo'],['knSAtk','ataque'],['knSHurt','golpeado'],['knSDeath','muerte']].forEach(([key,arch])=>{
    const im = new Image();
    im.onload = () => { SPRITES[key] = im; };
    im.src = 'suave/caballero-'+arch+'.png';
  });

  // Necromancer — 15 frames x 64px: idle(0-3) walk(4-7) attack(8-11) death(12-14)
  const necroImg = new Image();
  necroImg.src = 'sprites/necro.png';
  necroImg.onload = () => { SPRITES.necro = necroImg; };

  // Skeleton (Nigromante summon) — 15 frames x 64px: idle(0-3) walk(4-7) attack(8-11) death(12-14)
  const skelImg = new Image();
  skelImg.src = 'sprites/skeleton.png';
  skelImg.onload = () => { SPRITES.skeleton = skelImg; };

  // Mage — 16 frames x 130px: idle(0-4) walk(5-9) attack(10-11) death(12-15)
  // (Entrada 85: recortes corregidos — se elimino el sangrado entre celdas de la grilla original)
  const mageImg = new Image();
  mageImg.src = 'sprites/mage.png';
  mageImg.onload = () => { SPRITES.mage = mageImg; };

  // Bat (enemigo) — 12 frames x 140px: idle/vuelo(0-7) ataque en picado(8-10) golpeado(11)
  const batImg = new Image();
  batImg.src = 'sprites/bat.png';
  batImg.onload = () => { SPRITES.bat = batImg; };

  // Zombie (enemigo) — 6 frames x 313px, tira armada a partir del sheet 4x4 subido por el usuario
  // usando solo la fila 1: orden columnas 3,1,2,4,2,1 (y vuelve a empezar) para dar efecto de movimiento
  const zombieImg = new Image();
  zombieImg.src = 'sprites/zombie.png';
  zombieImg.onload = () => { SPRITES.zombie = zombieImg; };

  // Warlock (enemigo a distancia) — 6 frames x 362px: ciclo de caminata con llama azul (idle/walk/attack/hurt comparten ciclo)
  const warlockImg = new Image();
  warlockImg.src = 'sprites/warlock.png';
  warlockImg.onload = () => { SPRITES.warlock = warlockImg; };

  // Skull (enemigo cuerpo a cuerpo, espectro encapuchado) — 6 frames x 362px: ciclo flotante con llama púrpura
  const skullImg = new Image();
  skullImg.src = 'sprites/skull.png';
  skullImg.onload = () => { SPRITES.skull = skullImg; };

  // Demon (enemigo cuerpo a cuerpo, 95 HP) — 6 frames x 362px: ciclo de caminata con alas y cola
  const demonImg = new Image();
  demonImg.src = 'sprites/demon.png';
  demonImg.onload = () => { SPRITES.demon = demonImg; };

  // Gargoyle (enemigo con dash) — 6 frames x 362px: ciclo de caminata de piedra con ojos rojos
  const gargoyleImg = new Image();
  gargoyleImg.src = 'sprites/gargoyle.png';
  gargoyleImg.onload = () => { SPRITES.gargoyle = gargoyleImg; };

  // Archer (héroe) — 12 frames x 392px: 0-1 idle, 2-5 ataque (preparar, tensar, tensar a fondo, soltar), 6-11 caminata
  const archerImg = new Image();
  archerImg.src = 'sprites/archer.png';
  archerImg.onload = () => { SPRITES.archer = archerImg; };

  // Yoko — 15 frames x 64px: idle(0-3) walk(4-7) attack(8-12, orden 1-2-4-3-1) death(13-14)
  const yokoImg = new Image();
  yokoImg.src = 'sprites/yoko.png';
  yokoImg.onload = () => { SPRITES.yoko = yokoImg; };

  // Boss (Rey Liche) — 12 frames x 170px: idle(0-3) cast(4-5) [frame6 sin uso] summon(7) enrage(8) hurt(9) death(10-11)
  const bossImg = new Image();
  bossImg.src = 'sprites/boss.png';
  bossImg.onload = () => { SPRITES.boss = bossImg; };

  // Lilith, Hija del Odio — 16 frames x 190px: idle(0-3) enrage(4-7) summon(8) attack(9-12) death(13-15)
  const lilithImg = new Image();
  lilithImg.src = 'sprites/lilith.png';
  lilithImg.onload = () => { SPRITES.lilith = lilithImg; };
})();

// Frame size en el sheet
const SP_SIZE = 64;

// Config genérica de sprites por personaje/enemigo
// { anims: {nombre: [frameStart, count, fps]}, srcX, srcY, srcW, srcH, drawH }
const SPRITE_CFG = {
  // Caballero NUEVO v2 (hoja SPRITES.knightNew, 5 celdas): 0=cuadro 4, 1=cuadro 3, 2=cuadro 5, 3=cuadro 1, 4=cuadro 6 (idle, de pie).
  // Caminata = ciclo 4-3-5-1-3-4 => celdas [0,1,2,3,1,0] vía cfg.seq. attack no se usa (el golpe lo muestra el arco de código);
  // death = caída por código (rotación), solo cuenta frames/fps.
  knight: {
    anims: { idle:[4,1,2], walk:[0,6,10], attack:[0,6,18], death:[0,5,8] },   // attack: solo da duración/fps (6 cuadros a 18 fps ≈ 0.33 s); se dibuja con SPRITE_CFG.knightAtk
    seq: { walk:[0,1,2,3,1,0] },
    srcX:0, srcY:0, srcW:149, srcH:128, drawH:64, stride:149
  },
  // Caballero ATAQUE (hoja SPRITES.knightAtk): celdas 0=cuadro 5, 1=cuadro 3, 2=cuadro 4, 3=cuadro 2. Secuencia 5-3-4-2-4-3.
  // drawH = srcH*0.5 para conservar la misma escala que la caminata (128 px de celda -> drawH 64).
  knightAtk: {
    anims: { attack:[0,6,18] },
    seq: { attack:[0,1,2,3,2,1] },
    srcX:0, srcY:0, srcW:249, srcH:153, drawH:76.5, stride:249
  },
  // Caballero SUAVE (ver loadSprites): una hoja por animación. ax = fracción del ancho de celda donde están los pies (punto de anclaje).
  // Las hojas suaves se dibujan reducidas: drawH hace que el Caballero de pie mida 64 px, como con la hoja original dibujada al 50%.
  // [suave-cfg:inicio] (lo reescribe suave/normalizar_hojas.py --aplicar)
  knS_walk: { anims:{ walk:[0,12,20] }, srcX:0, srcY:0, srcW:256, srcH:160, drawH:87.521, figH:64, stride:256, ax:0.5000, dur:[50,50,50,50,50,50,50,50,50,50,50,50], loop:true, off:[-3.14,-1.46,4.52,2.33,6.48,-8.98,-3.26,-0.67,5.3,7.03,7.31,-3.16] },
  knS_idle: { anims:{ idle:[0,6,5] }, srcX:0, srcY:0, srcW:256, srcH:160, drawH:87.521, figH:64, stride:256, ax:0.5000, dur:[200,200,200,200,200,200], loop:true, off:[0.0,-1.02,-1.86,-0.58,-0.34,-0.44] },
  knS_atk: { anims:{ attack:[0,14,31] }, srcX:0, srcY:0, srcW:256, srcH:160, drawH:87.521, figH:64, stride:256, ax:0.5000, dur:[15,15,15,20,15,20,60,60,50,40,35,35,35,35], loop:false, off:[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0] },
  knS_hurt: { anims:{ hurt:[0,4,17] }, srcX:0, srcY:0, srcW:256, srcH:160, drawH:87.521, figH:64, stride:256, ax:0.5000, dur:[45,75,75,45], loop:false, off:[0.0,-1.16,-1.16,-0.26] },
  knS_death: { anims:{ death:[0,10,12] }, srcX:0, srcY:0, srcW:256, srcH:160, drawH:87.521, figH:64, stride:256, ax:0.5000, dur:[80,80,80,80,80,80,80,80,80,80], loop:false, off:[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0] },
  // [suave-cfg:fin]
  // Caballero VIEJO (capa roja): solo como respaldo si la hoja nueva no carga
  knightOld: {
    anims: { idle:[0,5,8], walk:[5,5,10], attack:[10,4,16], death:[14,5,8] },
    srcX:8, srcY:1, srcW:56, srcH:62, drawH:60
  },
  necro: {
    anims: { idle:[0,4,8], walk:[4,4,10], attack:[8,4,14], death:[12,3,8] },
    srcX:2, srcY:0, srcW:60, srcH:64, drawH:78
  },
  skeleton: {
    anims: { idle:[0,4,8], walk:[4,4,10], attack:[8,4,14], death:[12,3,8] },
    srcX:0, srcY:0, srcW:64, srcH:64, drawH:44
  },
  mage: {
    // Sheet nuevo (16 frames de 400x347, pies en la misma línea y calavera del cinturón como ancla horizontal):
    //   0-1 idle (provisorio: frames de pie de la caminata), 2-7 caminata, 8-13 ataque (gesto de lanzar SIN proyectil: el orbe sale por código),
    //   14-15 muerte (provisoria: frames viejos de colapso reescalados; falta la animación de muerte nueva).
    anims: { idle:[0,2,3], walk:[2,6,10], attack:[8,6,24], death:[14,2,4] },
    srcX:0, srcY:0, srcW:400, srcH:347, drawH:58, stride:400
  },
  yoko: {
    anims: { idle:[0,4,8], walk:[4,4,10], attack:[8,5,16], death:[13,2,6] },
    srcX:0, srcY:0, srcW:64, srcH:64, drawH:50
  },
  boss: {
    // idle=respirar con orbe pulsante, cast=invocar+bola de fuego (ataque a distancia),
    // summon=círculo mágico (anuncio de aparición),
    // enrage=aura con espectros (idle de fase 3), hurt=agachado (transición de fase), death=colapso final
    anims: { idle:[0,4,8], walk:[0,4,8], cast:[4,2,6], summon:[7,1,4], enrage:[8,1,4], hurt:[9,1,4], death:[10,2,5] },
    srcX:0, srcY:0, srcW:170, srcH:170, drawH:190, stride:170
  },
  lilith: {
    // idle=respiración con alas semi-plegadas, enrage=alas abiertas agresivas,
    // summon=pose de invocación (mano extendida, anuncio de aparición),
    // attack=embiste con garra + gema del pecho encendiéndose (fila3: col4,col2,col3 + fila4 col3),
    // death=forma enfurecida de alas totales → colapso (fila4: col1,col2,col4)
    anims: { idle:[0,4,8], walk:[0,4,8], enrage:[4,4,8], summon:[8,1,4], attack:[9,4,8], death:[13,3,5] },
    srcX:0, srcY:0, srcW:190, srcH:190, drawH:210, stride:190
  },
  bat: {
    // idle/walk=ciclo de vuelo con aleteo (8 frames), attack=picado + mordida (3 frames, se activa cerca del jugador),
    // hurt=pose agazapada con alas abiertas (frame suelto, destello breve al recibir daño)
    anims: { idle:[0,8,10], walk:[0,8,10], attack:[8,3,8], hurt:[11,1,6] },
    srcX:0, srcY:0, srcW:140, srcH:140, drawH:40, stride:140
  },
  zombie: {
    // Solo se usa para el movimiento: 6 frames armados en tira a partir de la fila 1 del sheet
    // subido por el usuario, en el orden pedido (columnas 3,1,2,4,2,1) para dar efecto de andar.
    // idle/walk/attack/hurt comparten el mismo ciclo — todavía no hay poses separadas para esas otras animaciones.
    anims: { idle:[0,6,8], walk:[0,6,8], attack:[0,6,8], hurt:[0,6,8] },
    srcX:0, srcY:0, srcW:313, srcH:290, drawH:48, stride:313
  },
  warlock: {
    // Tira de 6 frames (362x413 c/u) en el orden original del PNG: de pie, paso, cruce, paso, cruce, de pie.
    // Por ahora idle/walk/attack/hurt comparten el mismo ciclo (no hay poses separadas todavía).
    anims: { idle:[0,6,8], walk:[0,6,8], attack:[0,6,8], hurt:[0,6,8] },
    srcX:0, srcY:0, srcW:362, srcH:413, drawH:53, stride:362
  },
  skull: {
    // Tira de 6 frames (362x420 c/u) en el orden original del PNG; el espectro flota y la capa ondea.
    // idle/walk/attack/hurt comparten el mismo ciclo (no hay poses separadas todavía).
    anims: { idle:[0,6,8], walk:[0,6,8], attack:[0,6,8], hurt:[0,6,8] },
    srcX:0, srcY:0, srcW:362, srcH:420, drawH:52, stride:362
  },
  demon: {
    // Tira de 6 frames (362x397 c/u) en el orden original del PNG; pies alineados a la misma línea.
    // idle/walk/attack/hurt comparten el mismo ciclo (no hay poses separadas todavía).
    anims: { idle:[0,6,8], walk:[0,6,8], attack:[0,6,8], hurt:[0,6,8] },
    srcX:0, srcY:0, srcW:362, srcH:397, drawH:75, stride:362
  },
  gargoyle: {
    // Tira de 6 frames (362x402 c/u) en el orden original del PNG; pies ya alineados en el original.
    // idle/walk/attack/hurt comparten el mismo ciclo (no hay poses separadas todavía).
    anims: { idle:[0,6,8], walk:[0,6,8], attack:[0,6,8], hurt:[0,6,8] },
    srcX:0, srcY:0, srcW:362, srcH:402, drawH:76, stride:362
  },
  archer: {
    // Sheet de 12 frames (392x408, ojos como ancla horizontal y pies en la misma línea):
    //   0-1 idle (poses de reposo del disparo), 2-5 ataque (alcanzar flecha, tensar, tensar a fondo, SOLTAR), 6-11 caminata (original, 6 frames).
    // La flecha NO está dibujada saliendo: el proyectil lo genera doArcherShoot() justo en el último frame (soltar).
    // death: la hoja no tiene cuadros de muerte; 5 cuadros a 8 fps son solo el tiempo de la caída por código (drawSpriteFall).
    anims: { idle:[0,2,2.5], attack:[2,4,26], walk:[6,6,10], death:[0,5,8] },
    srcX:0, srcY:0, srcW:392, srcH:408, drawH:62, stride:392
  },
  // (todos los enemigos comunes ya tienen sprite; el boss Rey Liche esclavizado sigue procedural)
};

// Compat alias
const KNIGHT_ANIMS = SPRITE_CFG.knight.anims;

// Helper: dibuja un frame de sprite genérico centrado con pies en (sx,sy)
// Destello de golpe: antes cada sprite en flash se dibujaba con ctx.filter (4 filtros CSS encadenados) EN CADA FRAME.
// Con la onda circular de MANO nv.5 (todos los enemigos reciben el flash a la vez) eso eran decenas de pasadas de filtro
// por frame y el juego se trababa. Ahora el sheet con el filtro aplicado se genera UNA vez (mismo aspecto) y se reutiliza.
const FLASH_FILTER='brightness(2) saturate(0) sepia(1) hue-rotate(-30deg)';
const _flashSheets=new WeakMap();
function getFlashSheet(sheet){
  let fsh=_flashSheets.get(sheet);
  if(fsh) return fsh;
  const w=sheet.naturalWidth||sheet.width, h=sheet.naturalHeight||sheet.height;
  if(!w||!h) return null; // el sheet aún no cargó: se reintenta en el siguiente frame
  try{
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const cx2=c.getContext('2d');
    cx2.filter=FLASH_FILTER;
    cx2.drawImage(sheet,0,0);
    cx2.filter='none';
    fsh=c;
  }catch(err){ fsh=sheet; } // si falla, se dibuja sin flash en vez de romper el render
  _flashSheets.set(sheet,fsh);
  return fsh;
}
function drawSpriteFrame(sheet, cfg, animName, frame, sx, sy, facingLeft, dmgFlash){
  if(!sheet) return false;
  const [start, count, fps] = cfg.anims[animName] || cfg.anims.idle;
  const fi = Math.min(frame, count-1);
  const f = start + ((cfg.seq && cfg.seq[animName]) ? cfg.seq[animName][fi] : fi);
  const {srcX, srcY, srcW, srcH, drawH} = cfg;
  const stride = cfg.stride || SP_SIZE;
  const drawW = drawH * (srcW / srcH);
  ctx.save();
  ctx.translate(sx, sy);
  if(facingLeft) ctx.scale(-1,1);
  const srcImg=dmgFlash?(getFlashSheet(sheet)||sheet):sheet;
  // cfg.ax: fracción del ancho de celda donde está el ancla (pies). cfg.off[cuadro]: desplazamiento horizontal del cuadro (px de la hoja) para alinearlo
  const offX=cfg.off?-(cfg.off[fi]||0)*(drawW/srcW):0;
  ctx.drawImage(srcImg, f*stride+srcX, srcY, srcW, srcH, -drawW*(cfg.ax!==undefined?cfg.ax:.5)+offX, -drawH, drawW, drawH);
  ctx.restore();
  return true;
}

