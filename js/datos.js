// Blood Crypt — héroes (CHARS), enemigos (ETYPES), colores del piso y estado global (G). El orden de carga está en index.html (ver CLAUDE.md).
// ─── CHARACTER & ENEMY DEFS ───────────────────────────────────────────────────
// Pasiva de Yoko: "Sed de Sangre" — ventana de frenesí cíclica
const BLOODLUST_COOLDOWN=60;   // segundos de espera entre activaciones
const BLOODLUST_DURATION=30;   // segundos que dura activa
const BLOODLUST_CHARGE_MULT=1.4; // multiplicador de velocidad (y por ende distancia, ya que dist=vel×tiempo) de la embestida durante el modo
// Un héroe = una entrada acá (stats, texto del menú) + su comportamiento en HEROES[id] + su sprite sprites/<id>.png con SPRITE_CFG[id].
// id: clave en HEROES, SPRITES y SPRITE_CFG. name: clave del guardado (best/unlocked), no cambiarlo.
// Los flags (melee/mage/necro/yoko/archer) quedan para chequeos puntuales de una mecánica; qué ataca/dibuja cada héroe lo decide HEROES.
const CHARS=[
  {id:'knight', name:'CABALLERO', hp:150,atk:35,spd:130,range:62, rate:.85,melee:true,    col:'#4a9eff',sc:'#1a4499',
   role:'GUERRERO · CUERPO A CUERPO',
   desc:'Guerrero cuerpo a cuerpo con alta salud. Su ataque golpea a todos los enemigos en radio. Ideal para sobrevivir sin pensar mucho.'},
  {id:'mage',   name:'MAGO',      hp:80, atk:25,spd:170,range:230,rate:1,  melee:false,   col:'#cc44ff',sc:'#661188',mage:true,
   role:'MAGO · A DISTANCIA',
   desc:'Lanza un orbe arcano que, al impactar, se divide en dos orbes que buscan a otros enemigos, y estos vuelven a dividirse. Frágil pero devastador contra hordas.'},
  {id:'necro',  name:'NIGROMANTE',hp:90, atk:20,spd:120,range:100,rate:1.2,melee:false,  col:'#44ffaa',sc:'#116644',necro:true,
   role:'INVOCADOR · HÍBRIDO',
   desc:'Invoca esqueletos cada 8s que luchan por él. Debil solo pero escala exponencialmente con el nivel.'},
  {id:'yoko',   name:'YOKO',      hp:120,atk:40,spd:155,range:50, rate:1.4,melee:false,   col:'#d49a5a',sc:'#8a5a2e',yoko:true,
   role:'EMBESTIDOR · ARIETE',
   desc:'Embiste en línea recta atravesando enemigos. Entierra huesos al rematar, que al desenterrarlos dan curación, daño extra o velocidad al azar.'},
  {id:'archer', name:'ARQUERO',   hp:95, atk:22,spd:165,range:260,rate:.55,melee:false,  col:'#6fbf4a',sc:'#2d5a1e',archer:true,
   role:'CAZADOR · A DISTANCIA',
   desc:'Dispara flechas rápidas desde lejos, con crítico alto. Sus mejoras le permiten atravesar enemigos y rodearse de shurikens.'},
];
// Máximos de las barras de stats de la tarjeta del menú (iguales para todos los héroes)
const CHAR_STAT_MAX={hp:150, atk:50, spd:200, rng:260};
const ETYPES=[
  {name:'bat',     hp:18,  atk:8,  spd:90,  col:'#9955ee',sc:'#4411aa',sz:11,xp:4},
  {name:'zombie',  hp:45,  atk:14, spd:52,  col:'#33aa33',sc:'#116611',sz:13,xp:10},
  {name:'skull',   hp:30,  atk:18, spd:72,  col:'#d8d8cc',sc:'#8888aa',sz:12,xp:8},
  {name:'demon',   hp:95,  atk:28, spd:44,  col:'#ee2222',sc:'#880000',sz:16,xp:20},
  {name:'warlock', hp:38,  atk:16, spd:58,  col:'#00cccc',sc:'#006666',sz:13,xp:15, ranged:true},
  {name:'gargoyle',hp:120, atk:22, spd:100, col:'#8899aa',sc:'#334455',sz:17,xp:28, canDash:true},
];

// ─── TILE COLORS ──────────────────────────────────────────────────────────────
const TPAL={0:'#18140f',1:'#2a2318',2:'#211a10',3:'#1c1610'};
const TFLO=['#1a1510','#17120d','#191410','#1b160f'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let G={}, keys={}, selChar=0, raf, lastT=0, paused=false;

function getTile(tx,ty){
  const lx=((tx%RW)+RW)%RW, ly=((ty%RH)+RH)%RH;
  if(ly===0||ly===RH-1) return 1;
  if(lx===0||lx===RW-1) return 2;
  if(lx%10===0&&ly>1&&ly<RH-2) return 3;
  return 0;
}

// Pre-generate torches
const TORCHES=Array.from({length:18},(_,i)=>({
  ox:(i-9)*155+rf(-20,20), oy:rf(-60,60), ph:rf(0,PI*2), sz:rf(0.85,1.15)
}));

