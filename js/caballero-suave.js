// Blood Crypt — animación SUAVE del caballero (hojas de suave/) y utilidades chicas. El orden de carga está en index.html (ver CLAUDE.md).
// ─── ANIMACIÓN SUAVE DEL CABALLERO (prueba) ─────────────────────────────────
// SUAVE: usa las hojas nuevas de suave/ (más cuadros). Si no cargaron, cae a las hojas originales con movimiento por código.
// ORIGINAL: las hojas y animación de siempre. Interruptor en la pausa ("ANIM. CABALLERO"). Solo afecta al Caballero.
let KNIGHT_NAT=true;
try{ KNIGHT_NAT=localStorage.getItem('bloodcrypt_knight_nat')!=='off'; }catch(e){}
function toggleKnightNat(){
  KNIGHT_NAT=!KNIGHT_NAT;
  try{ localStorage.setItem('bloodcrypt_knight_nat',KNIGHT_NAT?'on':'off'); }catch(e){}
  updKnBtn(); _redraw=true;
}
function updKnBtn(){
  const b=document.getElementById('kn-toggle'); if(!b) return;
  b.textContent='🗡 ANIM. CABALLERO: '+(KNIGHT_NAT?'SUAVE':'ORIGINAL');
  b.classList.toggle('active',KNIGHT_NAT);
}
const KN_STRIDE=78;                    // px que recorre en un ciclo completo de caminata (6 cuadros); igual al ritmo original a 130 px/s
const KN_ATK_W=[.5,.5,1.3,1.5,1.1,1.1];// duración relativa de cada cuadro del ataque (suma 6): rápido al armar el golpe, se detiene en la estocada
const KN_LUNGE=7;                      // px que se adelanta el sprite en la estocada (solo visual, no mueve al héroe)
const KN_LEAN_WALK=.06, KN_LEAN_ATK=.08; // inclinación (rad) al caminar y al atacar
function knightAtkFrame(u){ // u = avance del ataque (0 a 1) -> cuadro (0 a 5) según los pesos de duración
  let acc=0; for(let i=0;i<6;i++){ acc+=KN_ATK_W[i]/6; if(u<acc) return i; } return 5;
}
function knightNatAnim(dt,mx,my){
  const p=G.p;
  if(p.sprAttacking){ p.sprAttackT=(p.sprAttackT||0)-dt; if(p.sprAttackT<=0) p.sprAttacking=false; }
  const moving=(mx!==0||my!==0);
  const anim=(p.sprAttacking&&SPRITES.knightAtk)?'attack':moving?'walk':'idle';
  if(anim!==p.sprAnim){
    if(p.sprAnim==='walk'&&anim==='idle') p.kSettle=1; // al frenar: pequeño "asentamiento"
    p.sprAnim=anim; p.sprFrameT=0;
    if(anim==='walk') p.kPhase=0;
  }
  if(anim==='attack'){
    const [,count,fps]=SPRITE_CFG.knightAtk.anims.attack;
    p.kU=1-Math.max(0,p.sprAttackT)/(count/fps);
    p.sprFrame=knightAtkFrame(p.kU);
  } else {
    p.kU=0;
    if(anim==='walk'){ // el ritmo de pasos depende de la distancia recorrida: los pies no patinan al ir más rápido o más lento
      const spd=p.spd+p.up.spd+(G.furyTimer>0?FURY_SPEED_BOOST:0);
      p.kPhase=(p.kPhase||0)+Math.hypot(mx,my)*spd*dt/KN_STRIDE;
      p.sprFrame=Math.floor(p.kPhase*6)%6;
    } else p.sprFrame=0;
  }
  const tl=anim==='walk'?Math.sign(mx)*KN_LEAN_WALK:anim==='attack'?(p.facingLeft?-1:1)*KN_LEAN_ATK:0;
  p.kLean=(p.kLean||0)+(tl-(p.kLean||0))*(1-Math.exp(-14*dt));
  p.kSettle=Math.max(0,(p.kSettle||0)-dt*7);
}
// ── Caballero SUAVE con las hojas de suave/ ──────────────────────────────────────
// Los tiempos de cada cuadro (ms) vienen de suave/animaciones.json a través de SPRITE_CFG.knS_*.dur (los escribe normalizar_hojas.py --aplicar).
const KN2_STRIDE=78;                   // px que recorre en un ciclo completo de caminata (igual al ritmo original)
const KN2_HURT_CD=.5;                  // tiempo mínimo (s) entre dos reacciones al golpe (para no bloquear la caminata)
const KN2_DEATH_EXTRA=.15;             // espera (s) tras el último cuadro de la muerte, antes de mostrar la pantalla de fin
const _sumMs=a=>{ let t=0; for(const v of a) t+=v; return t; };
function knScale(){ return SPRITE_CFG.knS_idle.figH/64; } // tamaño del Caballero SUAVE respecto al original (64 px de alto)
function knSecs(key){ return _sumMs(SPRITE_CFG[key].dur)/1000; } // duración total de una animación suave (s)
function frameAtTime(t,dur,loop){ // cuadro que corresponde al instante t (s) según la duración de cada cuadro (ms)
  const tot=_sumMs(dur)/1000;
  if(loop) t=((t%tot)+tot)%tot; else if(t>=tot) return dur.length-1;
  let acc=0; for(let i=0;i<dur.length;i++){ acc+=dur[i]/1000; if(t<acc) return i; }
  return dur.length-1;
}
function knightSheetsReady(){ return !!(SPRITES.knSWalk&&SPRITES.knSIdle&&SPRITES.knSAtk&&SPRITES.knSHurt&&SPRITES.knSDeath); }
function weightedFrame(u,W){ // u (0-1) -> índice de cuadro según pesos de duración
  let tot=0; for(const w of W) tot+=w;
  let acc=0; for(let i=0;i<W.length;i++){ acc+=W[i]/tot; if(u<acc) return i; } return W.length-1;
}
function knightSuaveAnim(dt,mx,my){
  const p=G.p;
  if(p.hp<=0){ p.sprAnim='death'; return; } // la animación de muerte la dibuja drawKnightSuave desde endGame()
  // golpe recibido: se reacciona en el flanco de subida de dmgF, con tiempo de enfriamiento
  p.kHurtCD=Math.max(0,(p.kHurtCD||0)-dt);
  const hit=p.dmgF>0;
  if(hit&&!p.kHitPrev&&p.kHurtCD<=0&&!p.sprAttacking){ p.kHurtT=knSecs('knS_hurt'); p.kHurtCD=KN2_HURT_CD; }
  p.kHitPrev=hit;
  if(p.kHurtT>0) p.kHurtT-=dt;
  if(p.sprAttacking){ p.sprAttackT=(p.sprAttackT||0)-dt; if(p.sprAttackT<=0) p.sprAttacking=false; }
  const moving=(mx!==0||my!==0);
  const anim=p.sprAttacking?'attack':(p.kHurtT>0?'hurt':(moving?'walk':'idle'));
  if(anim!==p.sprAnim){
    p.sprAnim=anim; p.sprFrameT=0;
    if(anim==='walk') p.kPhase=0;
    if(anim==='idle') p.kIdleT=0;
  }
  if(anim==='attack'){
    p.sprFrame=frameAtTime(knSecs('knS_atk')-Math.max(0,p.sprAttackT),SPRITE_CFG.knS_atk.dur,false);
  } else if(anim==='hurt'){
    p.sprFrame=frameAtTime(knSecs('knS_hurt')-Math.max(0,p.kHurtT),SPRITE_CFG.knS_hurt.dur,false);
  } else if(anim==='walk'){ // el ritmo de pasos depende de la distancia recorrida: los pies no patinan
    const spd=p.spd+p.up.spd+(G.furyTimer>0?FURY_SPEED_BOOST:0);
    p.kPhase=(p.kPhase||0)+Math.hypot(mx,my)*spd*dt/(KN2_STRIDE*knScale()); // el paso crece con el tamaño del sprite
    p.sprFrame=weightedFrame((p.kPhase%1+1)%1,SPRITE_CFG.knS_walk.dur);
  } else {
    p.kIdleT=(p.kIdleT||0)+dt;
    p.sprFrame=frameAtTime(p.kIdleT,SPRITE_CFG.knS_idle.dur,true);
  }
}
function drawKnightSuave(sx,sy,p){
  let a=p.sprAnim, fr=p.sprFrame;
  if(a==='death'&&p.kDeathT0!==undefined){
    const dd=SPRITE_CFG.knS_death.dur;
    fr=frameAtTime((performance.now()-p.kDeathT0)/1000,dd,false);
    if(fr<dd.length-1) _redraw=true; // la partida ya terminó (el bucle solo redibuja si se lo pide): seguir hasta el último cuadro
  }
  let sheet,cfg;
  switch(a){
    case 'walk':   sheet=SPRITES.knSWalk;  cfg=SPRITE_CFG.knS_walk;  break;
    case 'attack': sheet=SPRITES.knSAtk;   cfg=SPRITE_CFG.knS_atk;   break;
    case 'hurt':   sheet=SPRITES.knSHurt;  cfg=SPRITE_CFG.knS_hurt;  break;
    case 'death':  sheet=SPRITES.knSDeath; cfg=SPRITE_CFG.knS_death; break;
    default:       a='idle'; sheet=SPRITES.knSIdle; cfg=SPRITE_CFG.knS_idle;
      if(fr===undefined) fr=frameAtTime(p.animT||0,SPRITE_CFG.knS_idle.dur,true); // vista previa del menú: sin estado de animación propio
  }
  drawSpriteFrame(sheet,cfg,a,fr||0,sx,sy,p.facingLeft||false,p.dmgF>0);
}
// Dibuja al Caballero con inclinación, estirar/comprimir y avance de estocada sobre los mismos cuadros
// (respaldo del modo SUAVE si las hojas nuevas no cargaron)
function drawKnightNat(sx,sy,p,anim){
  const dir=p.facingLeft?-1:1;
  let ox=0,oy=0,scx=1,scy=1;
  if(anim==='attack'){
    const b=Math.exp(-Math.pow(((p.kU||0)-.3)/.2,2)); // pico en la estocada
    ox=dir*KN_LUNGE*b; scx=1+.07*b; scy=1-.05*b;
  } else if(anim==='walk'){
    const s=Math.abs(Math.sin((p.kPhase||0)*PI*2)); // dos apoyos por ciclo: sube a mitad de paso y baja al apoyar
    oy=-1.4*s; scy=1-.025*(1-s); scx=1+.02*(1-s);
  } else {
    scy=1+.012*Math.sin(G.time*2.2); // respiración
  }
  const st=p.kSettle||0; scy-=.06*st; scx+=.04*st;
  ctx.save();
  ctx.translate(sx+ox,sy+oy); ctx.rotate(p.kLean||0); ctx.scale(scx,scy);
  if(anim==='attack'&&SPRITES.knightAtk) drawSpriteFrame(SPRITES.knightAtk,SPRITE_CFG.knightAtk,'attack',p.sprFrame||0,0,0,p.facingLeft||false,p.dmgF>0);
  else drawSpriteFrame(SPRITES.knightNew,SPRITE_CFG.knight,anim,p.sprFrame||0,0,0,p.facingLeft||false,p.dmgF>0);
  ctx.restore();
}
// Sombra elíptica en el suelo (todas las entidades la usan para verse coherentes)
function drawGroundShadow(x,y,rx,ry,a){
  ctx.fillStyle='rgba(0,0,0,'+a+')';
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,PI*2); ctx.fill();
}
// Enemigos voladores: su sombra queda en el suelo, HOVER px más abajo del sprite, y más chica y tenue
const HOVER={bat:8,gargoyle:5};
function drawEnemyShadow(sx,sy,s,name){
  const h=HOVER[name]||0;
  drawGroundShadow(sx,sy+s*.6+h, s*(h?.75:.9), s*(h?.25:.3), h?.22:.3);
}
// Comparador por cercanía a (x,y) con distancia al cuadrado: mismo orden que hyp() sin calcular raíces dentro del sort
const _byDist2=(x,y)=>(a,b)=>{ const ax=a.x-x, ay=a.y-y, bx=b.x-x, by=b.y-y; return (ax*ax+ay*ay)-(bx*bx+by*by); };
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

