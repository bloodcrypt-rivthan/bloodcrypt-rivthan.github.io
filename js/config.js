// Blood Crypt — canvas, constantes de juego y de balance, efectos 2.5D. El orden de carga está en index.html (ver CLAUDE.md).
// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
let ctx = canvas.getContext('2d');
var _redraw=true; // ver loop(): redibujo de escenas estáticas
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;_redraw=true;}
resize(); window.addEventListener('resize',resize);

function toggleFS(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
}
document.addEventListener('keydown',e=>{if(e.key==='F11'){e.preventDefault();toggleFS();}});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PI=Math.PI, TILE=32, RW=100, RH=30;
const HERO_Y_LIMIT=RH*TILE*.38;   // |y| máximo al que puede llegar el héroe (mismo límite que el clamp de movimiento)
const ORB_FLY_TIME=0.25;          // s que dura la animación del orbe volando hacia el héroe al ser recogido
const RANGE_MAX=6;                // niveles máximos de ALCANCE+ (6 mejoras de +25% compuesto = ×3.81)
const XP_GAIN_PER_PICK=1.2;       // GANANCIA XP: cada mejora multiplica la XP ganada por este factor, compuesto (antes ×1.5 = +50%)
// ORBE DEL MAGO (ataque básico): impacta y se divide en 2 orbes que buscan OTROS enemigos (66% del daño); al impactar cada uno se divide en 2 más (33%); esos ya desaparecen al impactar.
const MAGE_SPLIT_FRACS=[0.66,0.33];   // daño de la 1.ª y la 2.ª división, como fracción del daño base
const MAGE_SPLIT_COUNT=2;             // en cuántos orbes se divide en cada impacto
const MAGE_SPLIT_RADIUS=240;          // px alrededor del impacto en los que busca nuevos enemigos
const MAGE_CHILD_SPEED=380;           // velocidad (px/s) de los orbes divididos
// Para que la división se VEA: en hordas compactas los vecinos están encimados y un hijo impactaba al instante (74% vivía ≤2 frames)
const MAGE_SPLIT_MIN_DIST=85;         // px: los hijos prefieren enemigos al menos a esta distancia del impacto
const MAGE_SPLIT_MIN_ANGLE=0.9;       // rad (~50°): los hijos prefieren direcciones distintas entre sí
const MAGE_FORK_ANGLE=0.55;           // rad (~31°): cada hijo sale abierto hacia un lado (forma de "V") y luego se curva hacia su objetivo
const MAGE_TURN_RATE=12;              // rad/s: giro máximo del orbe teledirigido
const MAGE_CHILD_ARM=0.06;            // s tras dividirse en que el hijo no colisiona (le da tiempo a salir del grupo)
const MULTISHOT_MAX=3;            // MULTIDISPARO del Mago: máximo de enemigos a los que dispara a la vez (x3 = 2 mejoras; antes x5)
const ORB_SLIDE_SPEED=170;        // px/s a la que un orbe fuera de alcance se desliza hacia el borde más cercano
const ORB_PICKUP_R=50, BONE_PICKUP_R=24;  // radio base de recogida de orbes de XP (antes 16) y de huesos (Yoko)
const PICKUP_MAX=5;                       // niveles máximos de la mejora RECOLECCIÓN
const ORB_PICKUP_GROWTH=1.0;              // orbes: +100% del radio base por nivel (+50 px): 50, 100, 150, 200, 250, 300 px
const BONE_PICKUP_GROWTH=1.5;             // huesos de Yoko: +150% por nivel (sin cambios): 24, 60, 96, 132, 168, 204 px
// Radio de recogida con la mejora RECOLECCIÓN (lvl opcional para consultar otro nivel, p. ej. en el texto de la mejora)
function pickupRadius(base,growth,lvl){ if(lvl===undefined) lvl=(G.p&&G.p.up.pickupLevel)||0; return base*(1+growth*lvl); }
const rf=(lo,hi)=>lo+(hi-lo)*Math.random();
const ri=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
// Velocidad de movimiento actual del héroe (base + mejoras + bonus de FURIA/VELOZ). La usa Lilith para no dejarse escapar.
const FURY_SPEED_BOOST=60;
const LILITH_SPEED_FACTOR=1.08; // Lilith se mueve un 8% más rápido que el héroe
// Daño por contacto. ANTES: ATK×dt (≈ATK/60: casi nulo, dependiente de los FPS) y una sola vez por ventana de invulnerabilidad,
// sin importar cuántos enemigos tocaran al héroe. AHORA: golpe fijo por contacto, independiente de los FPS, y la multitud suma.
const CONTACT_HIT_MULT=0.25;      // golpe de contacto de un enemigo = ATK × 0.25 (Demonio 7, Gárgola 5.5, Zombi 3.5…)
const BOSS_CONTACT_HIT_MULT=0.5;  // golpe de contacto del Rey Liche = ATK × mult. de fase × 0.5
const CONTACT_CROWD_MULT=0.10;    // cada enemigo EXTRA que toca al héroe suma el 10% de su golpe…
const CONTACT_CROWD_CAP=2;        // …hasta un máximo de +200% del golpe base (3× en total). Pon CONTACT_CROWD_MULT=0 para desactivarlo
// Proyectiles del Rey Liche (fase 2+). ANTES: anillo en todas direcciones (giratorio) con daño fijo 18.
// AHORA: abanico APUNTADO AL HÉROE (hacia donde está al disparar) con el doble de daño.
const BOSS_PROJ_DMG=36;           // daño por proyectil (antes 18; la armadura lo reduce)
const BOSS_PROJ_SPREAD2=0.9;      // apertura total del abanico en fase 2 (rad ≈ 52°, 5 proyectiles)
const BOSS_PROJ_SPREAD3=1.2;      // apertura total del abanico en fase 3 (rad ≈ 69°, 8 proyectiles)
const ARMOR_MAX=0.75;             // tope de reducción de daño por ARMADURA (4 picks de 20%: el 4.º llega justo al tope)
const ATK_SPEED_PER_PICK=0.2;     // VEL. ATAQUE: +20% de ataques por segundo por mejora (aditivo)
function heroMoveSpeed(p){ return p.spd+p.up.spd+(G.furyTimer>0?FURY_SPEED_BOOST:0); }
const hyp=(dx,dy)=>Math.sqrt(dx*dx+dy*dy);
// ─── EFECTOS VISUALES 2.5D ───────────────────────────────────────────────────
// FX_HIGH activa la iluminación dinámica, la oclusión/paralaje de la pared y el postproceso extra.
// Con "BAJO" el juego se dibuja como antes de esas mejoras (útil en móviles lentos). Se recuerda en el navegador.
let FX_HIGH=true;
try{ FX_HIGH=localStorage.getItem('bloodcrypt_fx')!=='low'; }catch(e){}
function updFxBtn(){
  const b=document.getElementById('fx-toggle'); if(!b) return;
  b.textContent='✨ EFECTOS: '+(FX_HIGH?'ALTO':'BAJO');
  b.classList.toggle('active',FX_HIGH);
}
function toggleFx(){
  FX_HIGH=!FX_HIGH;
  try{ localStorage.setItem('bloodcrypt_fx',FX_HIGH?'high':'low'); }catch(e){}
  updFxBtn(); _redraw=true; // en pausa el canvas no se redibuja solo
}
