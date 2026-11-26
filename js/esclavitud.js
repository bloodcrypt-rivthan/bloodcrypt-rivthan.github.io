// Blood Crypt — esclavitud del nigromante. El orden de carga está en index.html (ver CLAUDE.md).
// ─── ESCLAVITUD NECROMÁNTICA ────────────────────────────────────────────────────
function enslaveEnemy(e){
  const p=G.p;
  G.kills++; // sigue contando como kill para estadísticas
  spParts(e.x,e.y,'#44ffaa',24);
  spawnDmgNum(e.x,e.y-e.sz*2,'ESCLAVIZADO',false,true);
  sndSummon();
  addShake(5);
  G.thralls.push({
    isBoss:false,
    name:e.name, x:e.x, y:e.y,
    hp:e.mhp*1.2, mhp:e.mhp*1.2,
    atk:e.atk*1.3, spd:(e.baseSpd||e.spd),
    sz:e.sz, xp:e.xp,
    fl:0, wb:e.wb||0, animT:e.animT||0,
    dashTimer:e.name==='gargoyle'?rf(3,6):-1, dashing:false, dashVx:0, dashVy:0, dashT:0,
    shootTimer:e.name==='warlock'?rf(1.5,3):-1,
    life:60, alive:true, targetId:null
  });
}

function enslaveBoss(boss){
  const p=G.p;
  spParts(boss.x,boss.y,'#44ffaa',60);
  spawnDmgNum(boss.x,boss.y-boss.sz*3,'¡ESCLAVIZADO!',false,true);
  sndSummon(); addShake(15);
  G.thralls.push({
    isBoss:true,
    name:'liche', x:boss.x, y:boss.y,
    hp:boss.mhp*1.0, mhp:boss.mhp*1.0,
    atk:boss.atk*1.2, spd:boss.spd,
    sz:boss.sz, xp:boss.xp,
    fl:0, animT:boss.animT||0, phase:1,
    projTimer:0, life:60, alive:true, targetId:null
  });
}
// Topes de partículas: con hordas grandes un solo ataque en área generaba cientos de partículas
// (cada una dibujada con shadowBlur) y el juego se trababa mientras duraban. Al acercarse al tope se reduce la cantidad.
const PARTS_MAX=450, BLOOD_MAX=600;
function spParts(x,y,col,n){
  const room=PARTS_MAX-G.parts.length; if(room<=0) return;
  if(G.parts.length>PARTS_MAX*.4) n=Math.ceil(n*.5);
  n=Math.min(n,room);
  for(let i=0;i<n;i++){
    const a=rf(0,PI*2),sp=rf(50,180),l=rf(.3,.8);
    G.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-rf(20,60),col,life:l,ml:l,sz:rf(2,5),rot:rf(0,PI*2),rotV:rf(-4,4)});
  }
}
function spawnBlood(x,y,n,col){
  const room=BLOOD_MAX-G.bloodSplats.length; if(room<=0) return;
  if(G.bloodSplats.length>BLOOD_MAX*.4) n=Math.ceil(n*.5);
  n=Math.min(n,room);
  for(let i=0;i<n;i++){
    const a=rf(0,PI*2),sp=rf(30,120);
    G.bloodSplats.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,col,life:rf(.4,.9),ml:1,sz:rf(2,5)});
  }
}


// ─── NECROMANCER LOGIC ────────────────────────────────────────────────────────
