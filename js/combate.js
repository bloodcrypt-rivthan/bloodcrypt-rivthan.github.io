// Blood Crypt — ataques del caballero y del mago, golpes y muertes. El orden de carga está en index.html (ver CLAUDE.md).
// ─── COMBAT ───────────────────────────────────────────────────────────────────
function calcDmg(base){
  const p=G.p, isCrit=Math.random()<p.up.critChance;
  return{dmg:isCrit?Math.round(base*p.up.critMult):Math.round(base),isCrit};
}
function spawnDmgNum(x,y,dmg,isCrit,isText){
  if(typeof dmg==='number') dmg=Math.round(dmg); // sin decimales (ej. 250.9999 → 251)
  G.dmgNums.push({x,y:y-10,vy:rf(-70,-40),vx:rf(-20,20),dmg,isCrit,isText,life:isText?1.6:0.9,ml:isText?1.6:0.9});
}
function spawnBoss(){
  if(G.bossAlive) return;
  const W=canvas.width, H=canvas.height;
  const a=rf(0,PI*2), d=Math.max(W,H)*.65+80;
  const hs = 1 + G.wave * .18;
  const bossHp = Math.round(95 * hs * 28); // ~28x demon base HP
  G.boss = {
    x: G.p.x+Math.cos(a)*d, y: G.p.y+Math.sin(a)*d,
    hp: bossHp, mhp: bossHp,
    atk: 22, spd: 38,
    col:'#c8b8ff', sc:'#442266',
    sz: 32, xp: 800,
    name:'liche',
    fl:0, wb:0, alive:true, ti:-1,
    animT:0, deathT:-1,
    phase:1,           // 1=normal 2=enraged(<50%) 3=final(<20%)
    projTimer:0,       // lanza proyectiles de hueso
    projInterval:2.2,
    announced:false,
    sprAnim:'summon', sprFrame:0, sprFrameT:0, facingLeft:false,
    castT:0, hurtT:0, lastPhase:1
  };
  G.bossAlive = true;
  sndBossAppear();
  startMusic('boss');
  // Anuncio visual
  G.bossAnnounce = 3.5; // segundos que dura el texto
  document.getElementById('boss-bar').style.display='block';
}

function spawnLilith(){
  if(G.lilithAlive) return;
  const W=canvas.width, H=canvas.height;
  const a=rf(0,PI*2), d=Math.max(W,H)*.65+80;
  G.lilith = {
    x: G.p.x+Math.cos(a)*d, y: G.p.y+Math.sin(a)*d,
    sz: 35, atk: 6, spd: 70, atkRange: 150, atkTimer: 0,
    fl:0, animT:0, wb:0, facingLeft:false,
    sprAnim:'summon', sprFrame:0, sprFrameT:0, attackT:0
  };
  G.lilithAlive = true;
  G.lilithAnnounce = 4.0;
  sndBossAppear();
  addShake(14);
}

function spawnEnemy(){
  const W=canvas.width,H=canvas.height;
  const a=rf(0,PI*2),d=Math.max(W,H)*.65+60;
  const tMax=G.wave<3?1:G.wave<5?2:G.wave<6?3:G.wave<8?4:5;
  const ti=ri(0,Math.min(tMax,ETYPES.length-1));
  const et=ETYPES[ti],hs=1+G.wave*.18;
  G.enemies.push({x:G.p.x+Math.cos(a)*d,y:G.p.y+Math.sin(a)*d,
    hp:et.hp*hs,mhp:et.hp*hs,atk:et.atk,spd:et.spd+G.wave*2,
    col:et.col,sc:et.sc,sz:et.sz,xp:et.xp,name:et.name,
    fl:0,wb:rf(0,PI*2),alive:true,ti,
    animT:rf(0,PI*2),deathT:-1,
    sprAnim:'idle', sprFrame:0, sprFrameT:0, facingLeft:false,
    // warlock
    shootTimer: et.ranged ? rf(1.5,3.0) : -1,
    // gargoyle
    dashTimer: et.canDash ? rf(3.0,6.0) : -1,
    dashVx:0, dashVy:0, dashing:false, dashT:0});
}
function doMelee(){
  const p=G.p, range=p.range*p.up.rng; let hit=false;
  for(const e of G.enemies){
    if(!e.alive) continue;
    if(hyp(e.x-p.x,e.y-p.y)<range+e.sz){
      const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
      e.hp-=dmg; e.fl=.15;
      if(isCrit){G.totalCrits++;spawnDmgNum(e.x,e.y-e.sz*2,dmg,true);sndCrit();}else{sndHit();}
      spawnBlood(e.x,e.y,isCrit?14:8,isCrit?'#ff6600':'#cc1111');
      spParts(e.x,e.y,isCrit?'#ff8800':'#ff3333',isCrit?10:6);
      hit=true; if(e.hp<=0) killE(e);
    }
  }
  // Boss melee hit
  if(G.bossAlive && G.boss && G.boss.alive){
    const boss=G.boss;
    if(hyp(boss.x-p.x,boss.y-p.y)<range+boss.sz){
      const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
      boss.hp-=dmg; boss.fl=.12;
      if(isCrit){G.totalCrits++;spawnDmgNum(boss.x,boss.y-boss.sz*2,dmg,true);sndCrit();}
      else{sndBossHit();}
      spawnBlood(boss.x,boss.y,isCrit?16:10,'#c8b8ff');
      spParts(boss.x,boss.y,isCrit?'#ff8800':'#aa66ff',isCrit?12:7);
      hit=true; if(boss.hp<=0) killBoss();
    }
  }
  if(hit){
    G.meleeEff.push({x:p.x,y:p.y,life:.22,range,col:p.col});
    triggerSprAttack(p);
  }
}
function doShoot(){
  const p=G.p;
  const shots=p.up.multishot||1;
  const range=p.range*p.up.rng;

  // Ordenar enemigos vivos + boss por distancia y tomar los N más cercanos
  const alive=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) alive.push(G.boss);
  if(!alive.length) return;
  alive.sort(_byDist2(p.x,p.y));
  // Solo disparar si hay al menos un enemigo realmente dentro de rango
  const inRange=alive.filter(e=>hyp(e.x-p.x,e.y-p.y)<=range+e.sz);
  if(!inRange.length) return;
  const targets=inRange.slice(0,shots);
  if(!targets.length) return;

  sndShoot();
  targets.forEach(target=>{
    const len=hyp(target.x-p.x,target.y-p.y)||1;
    const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
    const speed=(isCrit?400:340);
    // 'fam' la comparten el orbe y todos sus descendientes: hit = enemigos ya golpeados, claim = objetivos ya elegidos por algún orbe hermano
    const fam={hit:new Set(),claim:new Set()};
    G.projs.push({x:p.x,y:p.y,
      vx:(target.x-p.x)/len*speed, vy:(target.y-p.y)/len*speed,
      dmg,isCrit,range,tr:0,col:p.col,
      sz:isCrit?7:5,alive:true,trail:[],mage:true,gen:0,fam,hit:fam.hit});
  });
  triggerSprAttack(p);
}
// Enemigos (y jefe) vivos cerca de (x,y) que la cadena aún no ha golpeado ni reservado otro orbe (salvo `own`), del más cercano al más lejano
function mageCandidates(x,y,fam,own){
  const ok=e=>e.alive&&!fam.hit.has(e)&&(!fam.claim.has(e)||e===own)&&hyp(e.x-x,e.y-y)<=MAGE_SPLIT_RADIUS;
  const c=G.enemies.filter(ok);
  const b=G.boss; if(G.bossAlive&&b&&ok(b)) c.push(b);
  return c.sort(_byDist2(x,y));
}
// Elige `count` objetivos entre los candidatos (ordenados de cerca a lejos): prefiere los que están a >= MAGE_SPLIT_MIN_DIST del impacto
// y en direcciones distintas (>= MAGE_SPLIT_MIN_ANGLE entre sí); si no hay suficientes así, completa con los más cercanos.
function magePickTargets(x,y,cands,count){
  if(cands.length<=count) return cands.slice();
  const far=cands.filter(e=>hyp(e.x-x,e.y-y)>=MAGE_SPLIT_MIN_DIST);
  const pool=far.length>=count?far:cands;
  const ang=e=>Math.atan2(e.y-y,e.x-x);
  const sep=(a,b)=>{ let d=Math.abs(a-b); if(d>PI) d=PI*2-d; return d; };
  const picked=[pool[0]];
  while(picked.length<count){
    const rest=pool.filter(e=>!picked.includes(e)); if(!rest.length) break;
    picked.push(rest.find(e=>picked.every(q=>sep(ang(e),ang(q))>=MAGE_SPLIT_MIN_ANGLE))||rest[0]);
  }
  return picked;
}
// El orbe `pr` acaba de impactar a `victim`: se divide en hasta 2 orbes que van a por otros enemigos
function mageSplit(pr,victim){
  const fam=pr.fam; if(!fam) return;
  fam.hit.add(victim); if(pr.home) fam.claim.delete(pr.home);          // ya golpeado: ninguna rama de la cadena lo vuelve a golpear
  const gen=pr.gen||0; if(gen>=MAGE_SPLIT_FRACS.length) return;      // la última generación solo impacta y desaparece
  const p=G.p, x=victim.x, y=victim.y;
  const targets=magePickTargets(x,y,mageCandidates(x,y,fam),MAGE_SPLIT_COUNT);
  if(!targets.length) return;                                         // sin otros enemigos cerca: se acaba aquí
  const frac=MAGE_SPLIT_FRACS[gen];
  targets.forEach((t,k)=>{
    fam.claim.add(t);                                                 // reservado: los orbes hermanos/primos buscarán otro
    const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);                        // cada orbe hijo tira su propio crítico
    const base=Math.atan2(t.y-y,t.x-x);
    const fork=targets.length>1?(k%2===0?1:-1)*MAGE_FORK_ANGLE:0;     // salen abiertos en "V" y se curvan hacia su objetivo
    const la=base+fork;
    G.projs.push({x,y,vx:Math.cos(la)*MAGE_CHILD_SPEED,vy:Math.sin(la)*MAGE_CHILD_SPEED,
      dmg:Math.max(1,Math.round(dmg*frac)),isCrit,range:MAGE_SPLIT_RADIUS*2.2,tr:0,
      col:gen===0?'#e08bff':'#f3c8ff',sz:gen===0?(isCrit?7:5):(isCrit?6:4.5),alive:true,trail:[],
      mage:true,gen:gen+1,fam,hit:fam.hit,home:t,arm:MAGE_CHILD_ARM});
  });
  spParts(x,y,'#e6aaff',8);
  G.splitFx.push({x,y,life:.28});                   // anillo de destello en el punto de la división
}
