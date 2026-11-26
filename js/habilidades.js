// Blood Crypt — mano espectral, rayo, esqueletos y esclavos. El orden de carga está en index.html (ver CLAUDE.md).
// ─── MANO ESPECTRAL ──────────────────────────────────────────────────────────
// Niveles 1-4: cono de daño direccional. Nivel 5: explosión circular (como Knight).
// Direcciones por nivel (ángulos en radianes, 0=este, sentido horario):
//   Lv1: hacia el enemigo más cercano (1 mano, cono ~50°)
//   Lv2: + dirección opuesta (2 manos)
//   Lv3: + norte/sur (si la primaria es horizontal) o este/oeste (si es vertical) → 4 manos cardinales
//   Lv4: + 4 diagonales (NE/NO/SE/SO) → 8 manos en total
//   Lv5: daño circular completo, ya no son conos individuales

// ─── RAYO ─────────────────────────────────────────────────────────────────────
// Mejora común: cada LIGHTNING_INTERVAL s cae un rayo sobre un enemigo al azar.
// Cada nivel extra: +25% de daño y +1 rayo sobre otro enemigo distinto al azar.
const LIGHTNING_MAX=6, LIGHTNING_INTERVAL=2.6;
function updateLightning(dt){
  const p=G.p, lvl=p.up.lightningLevel||0;
  if(lvl<=0) return;
  G.lightningT-=dt;
  if(G.lightningT>0) return;
  const pool=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) pool.push(G.boss);
  if(!pool.length){ G.lightningT=.4; return; } // sin enemigos: reintenta pronto
  G.lightningT=LIGHTNING_INTERVAL;
  // barajar y tomar hasta `lvl` objetivos distintos
  for(let i=pool.length-1;i>0;i--){const j=ri(0,i);[pool[i],pool[j]]=[pool[j],pool[i]];}
  const targets=pool.slice(0,lvl);
  const base=(p.atk+p.up.atk)*1.6*(1+.25*(lvl-1));
  targets.forEach((t,i)=>{
    // pequeño desfase entre rayos para que no caigan todos en el mismo frame
    G.lightningFX.push({x:t.x,y:t.y,life:.35,ml:.35,delay:i*.08,seed:Math.random()*1000,target:t,base,struck:false});
  });
}
function strikeLightning(fx){
  const t=fx.target;
  fx.struck=true;
  if(!t||!t.alive||t.hp<=0) return; // ya murió antes del impacto: solo queda el efecto visual
  const{dmg,isCrit}=calcDmg(fx.base);
  t.hp-=dmg; t.fl=.2;
  if(isCrit){G.totalCrits++;spawnDmgNum(t.x,t.y-t.sz*2,dmg,true);}
  else spawnDmgNum(t.x,t.y-t.sz*2,dmg,false);
  spParts(t.x,t.y,'#aee6ff',isCrit?12:8);
  spawnBlood(t.x,t.y,isCrit?10:6,'#cc1111');
  addShake(2);
  sndLightning(isCrit);
  if(t.hp<=0){ if(t===G.boss) killBoss(); else killE(t); }
}

function doNecroAttack(){
  const p=G.p;
  const lvl=p.up.spectralLevel||1;
  const range=p.range*p.up.rng*1.15; // alcance ligeramente mayor que el disparo normal

  // Encontrar el objetivo más cercano para anclar la dirección base
  const alive=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) alive.push(G.boss);

  // ── NIVEL 5: explosión circular total (como Knight, pero verde espectral) ──
  if(lvl>=5){
    // Solo activar si hay al menos un enemigo realmente dentro de rango
    const anyInRange=alive.some(t=>hyp(t.x-p.x,t.y-p.y)<range+t.sz);
    if(!anyInRange) return;
    triggerSprAttack(p);
    let hit=false, hitSnd=false, hitBossSnd=false; // el sonido de impacto suena una sola vez por onda, no una por enemigo
    const allTargets=[...alive];
    allTargets.forEach(target=>{
      const d=hyp(target.x-p.x,target.y-p.y);
      if(d<range+target.sz){
        const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
        target.hp-=dmg; target.fl=.15;
        if(isCrit){G.totalCrits++;spawnDmgNum(target.x,target.y-target.sz*2,dmg,true);sndCrit();}
        else if(target===G.boss){hitBossSnd=true;} else{hitSnd=true;}
        spParts(target.x,target.y,isCrit?'#aaffcc':'#44ffaa',isCrit?12:7);
        spawnBlood(target.x,target.y,isCrit?12:7,'#225533');
        hit=true;
        if(target.hp<=0){ if(target===G.boss) killBoss(); else killE(target); }
      }
    });
    if(hitBossSnd) sndBossHit(); else if(hitSnd) sndHit();
    if(hit){ sndSummon(); G.meleeEff.push({x:p.x,y:p.y,life:.3,range,col:'#44ffaa'}); }
    G.spectralFX.push({type:'circle',x:p.x,y:p.y,life:.35,ml:.35,range});
    return;
  }

  if(!alive.length) return;
  alive.sort(_byDist2(p.x,p.y));
  const nearest=alive[0];
  // Solo atacar si el enemigo más cercano está realmente dentro de rango
  if(hyp(nearest.x-p.x,nearest.y-p.y)>range+nearest.sz) return;
  triggerSprAttack(p);
  const baseAng=Math.atan2(nearest.y-p.y, nearest.x-p.x);

  // Construir lista de direcciones según nivel
  let dirs=[baseAng];
  if(lvl>=2) dirs.push(baseAng+PI); // opuesta
  if(lvl>=3){
    // Cardinales perpendiculares a la dirección base
    dirs.push(baseAng+PI/2, baseAng-PI/2);
  }
  if(lvl>=4){
    // 4 diagonales relativas a la base (45°, 135°, 225°, 315° offset)
    dirs.push(baseAng+PI/4, baseAng+3*PI/4, baseAng-PI/4, baseAng-3*PI/4);
  }

  const coneHalfAngle = PI/6; // ~30° de medio-ángulo → cono de 60°
  let anyHit=false;

  dirs.forEach(ang=>{
    G.spectralFX.push({type:'cone',x:p.x,y:p.y,ang,life:.28,ml:.28,range,half:coneHalfAngle});
    alive.forEach(target=>{
      const ddx=target.x-p.x, ddy=target.y-p.y;
      const d=hyp(ddx,ddy);
      if(d>range+target.sz) return;
      let a=Math.atan2(ddy,ddx)-ang;
      while(a>PI) a-=PI*2; while(a<-PI) a+=PI*2;
      if(Math.abs(a)<=coneHalfAngle){
        const{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
        target.hp-=dmg; target.fl=.15;
        if(isCrit){G.totalCrits++;spawnDmgNum(target.x,target.y-target.sz*2,dmg,true);sndCrit();}
        spParts(target.x,target.y,isCrit?'#aaffcc':'#44ffaa',isCrit?10:6);
        spawnBlood(target.x,target.y,isCrit?10:6,'#225533');
        anyHit=true;
        if(target.hp<=0){ if(target===G.boss) killBoss(); else killE(target); }
      }
    });
  });
  sndBoneShoot();
  if(anyHit) sndHit();
}

function killSkeleton(sk){
  if(!sk.alive) return;
  const p=G.p;
  const resChance=p.up.resurrectChance||0;
  if(resChance>0 && Math.random()<resChance && !sk.hasRevived){
    // Resucita con 50% HP máx, marca para no volver a resucitar (1 sola vez)
    sk.hp=sk.mhp*0.5;
    sk.hasRevived=true;
    sk.spawnFlash=0.6;
    spParts(sk.x,sk.y,'#aaffcc',14);
    sndSummon();
    return;
  }
  sk.alive=false;
  spParts(sk.x,sk.y,'#225533',8);
}

function updateSkeletons(dt){
  const p=G.p;
  const maxSkel=p.up.maxSkeletons||2;
  const skelSpd=110*(p.up.skelSpdMult||1);
  const skelDmg=(p.atk+p.up.atk)*(p.up.skelDmgMult||1)*0.6;
  const skelAtkSpdMult=p.up.skelAtkSpdMult||1;
  const summonInterval=(p.up.summonRate||1)*8;

  // Invocación automática si hay espacio
  G.summonTimer=(G.summonTimer||0)+dt;
  if(G.summonTimer>=summonInterval&&G.skeletons.length<maxSkel){
    G.summonTimer=0;
    const angle=rf(0,PI*2);
    G.skeletons.push({
      x:p.x+Math.cos(angle)*50, y:p.y+Math.sin(angle)*50,
      hp:40+p.lv*5, mhp:40+p.lv*5,
      atkt:0, atkRate:1.2,
      alive:true, wb:rf(0,PI*2), spawnFlash:0.5,
      targetId:null,  // ID único del enemigo asignado
      hasRevived:false, hitFlash:0, atkCooldown:0,
      sprAnim:'idle', sprFrame:0, sprFrameT:0, facingLeft:false,
      sprAttacking:false, sprAttackT:0
    });
    sndSummon();
    spParts(p.x,p.y,'#44ffaa',8);
  }

  // Recolectar IDs ya reclamados por otros esqueletos vivos
  const claimed=new Set(G.skeletons.map(sk=>sk.targetId).filter(id=>id!=null));

  // Lógica de esqueletos
  for(let i=G.skeletons.length-1;i>=0;i--){
    const sk=G.skeletons[i];
    if(!sk.alive){G.skeletons.splice(i,1);continue;}
    sk.wb+=dt*4;
    if(sk.spawnFlash>0) sk.spawnFlash-=dt;
    if(sk.hitFlash>0) sk.hitFlash-=dt;
    if(sk.atkCooldown>0) sk.atkCooldown-=dt;

    // Validar target actual: descartar si murió
    let target=null;
    if(sk.targetId!=null){
      target=G.enemies.find(e=>e.alive&&e._uid===sk.targetId)||null;
    }

    // Reasignar si no tiene target válido
    if(!target){
      sk.targetId=null;
      // Buscar el enemigo vivo más cercano que no esté ya reclamado por otro esqueleto
      let bestDist=Infinity;
      for(const e of G.enemies){
        if(!e.alive) continue;
        // Asignar UID único si no lo tiene
        if(e._uid==null) e._uid=Math.random();
        if(claimed.has(e._uid)) continue; // ya reclamado
        const d=hyp(e.x-sk.x,e.y-sk.y);
        if(d<bestDist){bestDist=d;target=e;}
      }
      if(target){
        sk.targetId=target._uid;
        claimed.add(target._uid); // marcar como reclamado
      }
    }

    // Si no hay target normal, usar el boss como objetivo
    if(!target && G.bossAlive && G.boss && G.boss.alive){
      target = G.boss;
    }

    let moving=false;
    if(target){
      const dx=target.x-sk.x, dy=target.y-sk.y, d=hyp(dx,dy);
      if(dx!==0) sk.facingLeft=dx<0;
      if(d>30&&d>0){sk.x+=dx/d*skelSpd*dt; sk.y+=dy/d*skelSpd*dt; moving=true;}
      // Atacar
      sk.atkt-=dt;
      if(sk.atkt<=0&&d<target.sz+18){
        sk.atkt=sk.atkRate/skelAtkSpdMult;
        target.hp-=skelDmg; target.fl=.12;
        spParts(target.x,target.y,'#44ffaa',3);
        triggerSkelSprAttack(sk);
        if(target.hp<=0){
          if(target===G.boss) killBoss();
          else { killE(target); sk.targetId=null; }
        }
      }
    } else {
      // Sin enemigos: orbitar alrededor del jugador con separación entre esqueletos
      const orbitAngle=G.time*0.8 + i*(PI*2/maxSkel);
      const orbitR=55;
      const tx=p.x+Math.cos(orbitAngle)*orbitR;
      const ty=p.y+Math.sin(orbitAngle)*orbitR;
      const dx=tx-sk.x, dy=ty-sk.y, d=hyp(dx,dy);
      if(dx!==0) sk.facingLeft=dx<0;
      if(d>8&&d>0){sk.x+=dx/d*skelSpd*0.9*dt; sk.y+=dy/d*skelSpd*0.9*dt; moving=true;}
    }
    updateSkelSpriteAnim(sk,dt,moving);
  }
}

function triggerSkelSprAttack(sk){
  if(!SPRITES.skeleton) return;
  const[,count,fps]=SPRITE_CFG.skeleton.anims.attack;
  sk.sprAttacking=true;
  sk.sprAttackT=count/fps;
  sk.sprAnim='attack'; sk.sprFrame=0; sk.sprFrameT=0;
}

function updateSkelSpriteAnim(sk,dt,moving){
  if(!SPRITES.skeleton) return;
  if(sk.sprAttacking){
    sk.sprAttackT-=dt;
    if(sk.sprAttackT<=0) sk.sprAttacking=false;
  }
  const newAnim=sk.sprAttacking?'attack':moving?'walk':'idle';
  if(newAnim!==sk.sprAnim){ sk.sprAnim=newAnim; sk.sprFrame=0; sk.sprFrameT=0; }
  const [,count,fps]=SPRITE_CFG.skeleton.anims[sk.sprAnim]||SPRITE_CFG.skeleton.anims.idle;
  sk.sprFrameT+=dt;
  const frameDur=1/fps;
  while(sk.sprFrameT>=frameDur){
    sk.sprFrameT-=frameDur;
    sk.sprFrame=((sk.sprFrame||0)+1)%count;
  }
}

function updateThralls(dt){
  const p=G.p;
  const claimed=new Set(G.skeletons.map(sk=>sk.targetId).filter(id=>id!=null));

  for(let i=G.thralls.length-1;i>=0;i--){
    const th=G.thralls[i];
    if(!th.alive){ G.thralls.splice(i,1); continue; }
    th.life-=dt;
    th.animT=(th.animT||0)+dt; if(th.fl>0) th.fl-=dt;
    th.wb=(th.wb||0)+dt*4;

    // Expiración a los 60s — se desmorona
    if(th.life<=0){
      th.alive=false;
      spParts(th.x,th.y, th.isBoss?'#c8b8ff':'#44ffaa', th.isBoss?40:14);
      spawnBlood(th.x,th.y,th.isBoss?30:10,'#225533');
      if(th.isBoss) addShake(8);
      continue;
    }

    // Buscar enemigo más cercano (incluye boss normal si existe otro spawn futuro)
    let target=null, bestDist=Infinity;
    for(const e of G.enemies){
      if(!e.alive) continue;
      if(e._uid==null) e._uid=Math.random();
      if(claimed.has(e._uid)) continue;
      const d=hyp(e.x-th.x,e.y-th.y);
      if(d<bestDist){bestDist=d;target=e;}
    }

    const dx=(target?target.x:p.x)-th.x, dy=(target?target.y:p.y)-th.y, d=hyp(dx,dy)||1;
    if(Math.abs(dx)>1) th.facingLeft=dx<0; // los sprites miran hacia donde está su objetivo

    if(target){
      // Movimiento según el tipo de enemigo original (igual que su IA normal pero atacando enemigos)
      if(th.name==='warlock'){
        th.shootTimer-=dt;
        if(th.shootTimer<=0 && d<420){
          th.shootTimer=rf(2.2,4.0);
          const spd=155, nx=dx/d, ny=dy/d;
          [-0.22,0,0.22].forEach(ang=>{
            const ca=Math.cos(ang),sa=Math.sin(ang);
            G.thrallProjs.push({x:th.x,y:th.y,vx:(nx*ca-ny*sa)*spd,vy:(nx*sa+ny*ca)*spd,
              life:3.5,dmg:th.atk*.65,trail:[]});
          });
          sndBoneShoot();
        }
        if(d<160 && d>0){ th.x-=dx/d*th.spd*.6*dt; th.y-=dy/d*th.spd*.6*dt; }
        else if(d>0){ th.x+=dx/d*th.spd*.5*dt; th.y+=dy/d*th.spd*.5*dt; }
      } else if(th.name==='gargoyle'){
        if(th.dashing){
          th.x+=th.dashVx*dt; th.y+=th.dashVy*dt;
          th.dashT-=dt; th.fl=.08;
          if(th.dashT<=0){th.dashing=false; th.dashTimer=rf(3.5,6.0);}
        } else {
          th.dashTimer-=dt;
          if(th.dashTimer<=0 && d>60){
            th.dashing=true; th.dashT=.26;
            const dspd=500; th.dashVx=dx/d*dspd; th.dashVy=dy/d*dspd; addShake(2);
          }
          if(d>0){ th.x+=dx/d*th.spd*dt; th.y+=dy/d*th.spd*dt; }
        }
      } else if(th.isBoss){
        // IA simplificada del boss esclavizado — persigue y golpea
        if(d>0){ th.x+=dx/d*th.spd*dt; th.y+=dy/d*th.spd*dt; }
      } else if(d>0){
        th.x+=dx/d*th.spd*dt; th.y+=dy/d*th.spd*dt;
      }

      // Ataque cuerpo a cuerpo si está en rango
      th.atkt=(th.atkt||0)-dt;
      if(th.atkt<=0 && d<target.sz+th.sz*.8){
        th.atkt=th.isBoss?0.5:0.7;
        target.hp-=th.atk*(th.isBoss?0.4:0.5);
        target.fl=.12;
        spParts(target.x,target.y, th.isBoss?'#c8b8ff':'#44ffaa', th.isBoss?6:3);
        if(target.hp<=0) killE(target);
      }
    } else {
      // Sin enemigos — orbita cerca del jugador
      const orbitAngle=G.time*0.6+i*1.3;
      const orbitR=th.isBoss?100:65;
      const tx=p.x+Math.cos(orbitAngle)*orbitR, ty=p.y+Math.sin(orbitAngle)*orbitR;
      const odx=tx-th.x, ody=ty-th.y, od=hyp(odx,ody);
      if(od>8){ th.x+=odx/od*th.spd*.7*dt; th.y+=ody/od*th.spd*.7*dt; }
    }
  }

  // Proyectiles de warlock esclavizado
  for(let i=G.thrallProjs.length-1;i>=0;i--){
    const pr=G.thrallProjs[i];
    if(!pr.trail) pr.trail=[];
    pr.trail.push({x:pr.x,y:pr.y});
    if(pr.trail.length>6) pr.trail.shift();
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    if(pr.life<=0){ G.thrallProjs.splice(i,1); continue; }
    let hitSomething=false;
    for(const e of G.enemies){
      if(!e.alive) continue;
      if(hyp(pr.x-e.x,pr.y-e.y)<e.sz+6){
        e.hp-=pr.dmg; e.fl=.12;
        spParts(e.x,e.y,'#44ffaa',5);
        if(e.hp<=0) killE(e);
        hitSomething=true; break;
      }
    }
    if(hitSomething) G.thrallProjs.splice(i,1);
  }
}

// Halo del dash de la gárgola (el mismo que tenía el dibujo procedural), para usar con el sprite
function gargoyleDashAura(sx,sy,wy,s,dashing,flash){
  if(!dashing||flash) return;
  ctx.save(); ctx.globalAlpha=0.25; ctx.shadowColor='#aabbcc'; ctx.shadowBlur=20; ctx.fillStyle='#aabbcc';
  ctx.beginPath(); ctx.arc(sx,sy+wy,s*2.2,0,PI*2); ctx.fill(); ctx.restore();
}
// Altura visual (px sobre sy) de un enemigo según su sprite/dibujo — la usan las barras de vida
function enemyTopPx(name,s){
  const k=SPR_ANCHOR[name];
  if(SPRITES[name] && k!==undefined) return SPRITE_CFG[name].drawH - k*s;
  if(name==='demon') return s*3.6;      // cuernos hasta ~3.6·s
  if(name==='gargoyle') return s*3.05;  // cuernos hasta ~2.95·s
  return s*2.8;
}

// Sheets con tinte verde de esclavitud (caché): conserva la luminosidad del sprite original y lo vuelve verde "no-muerto"
const _thrallSheets={};
function getThrallSheet(name){
  if(_thrallSheets[name]) return _thrallSheets[name];
  const src=SPRITES[name]; if(!src) return null;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
  const cx2=c.getContext('2d'); cx2.drawImage(src,0,0);
  try{
    const img=cx2.getImageData(0,0,c.width,c.height), d=img.data;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]===0) continue;
      const lum=.3*d[i]+.59*d[i+1]+.11*d[i+2];
      d[i]=lum*.4; d[i+1]=Math.min(255,lum*1.1+34); d[i+2]=lum*.7+20;
    }
    cx2.putImageData(img,0,0);
  }catch(err){ // si el navegador bloquea getImageData, se usa un tinte simple encima
    cx2.globalCompositeOperation='source-atop'; cx2.fillStyle='rgba(40,230,150,.45)'; cx2.fillRect(0,0,c.width,c.height);
  }
  _thrallSheets[name]=c; return c;
}
// Precalcula las hojas teñidas en tiempo ocioso (una por callback) para que el primer esclavo de cada tipo no cause un tirón de ~140 ms
function prewarmThrallSheets(){
  const names=ETYPES.map(e=>e.name).concat('liche').filter(n=>SPRITES[n]&&!_thrallSheets[n]);
  const idle=window.requestIdleCallback||(f=>setTimeout(f,200));
  (function next(){ const n=names.shift(); if(!n) return; idle(()=>{ getThrallSheet(n); next(); }); })();
}
// Dibuja un esclavo con el sprite nuevo de su tipo (si lo tiene); devuelve false para usar el dibujo procedural
function drawThrallSprite(th,sx,sy,wy,flash){
  const k=SPR_ANCHOR[th.name], cfg=SPRITE_CFG[th.name];
  if(k===undefined || !cfg || !SPRITES[th.name]) return false;
  const sheet=getThrallSheet(th.name); if(!sheet) return false;
  const [,count,fps]=cfg.anims.idle;
  const frame=Math.floor((th.animT||0)*fps)%count;
  return drawSpriteFrame(sheet,cfg,'idle',frame,sx,sy+th.sz*k+wy,th.facingLeft,flash);
}

// Dibuja un esclavo (una llamada por esclavo, para ordenarlo por profundidad con el resto)
function drawThrall(th,cx,cy){
    if(!th.alive) return;
    const sx=th.x+cx, sy=th.y+cy;
    if(sx<-150||sx>canvas.width+150||sy<-150||sy>canvas.height+150) return;

    // Aura verde de esclavitud
    ctx.save();
    const fadeWarn = th.life<8 ? (0.5+Math.sin(G.time*10)*.5) : 1; // parpadea antes de expirar
    ctx.globalAlpha=0.2*fadeWarn;
    ctx.shadowColor='#44ffaa'; ctx.shadowBlur=th.isBoss?40:18;
    ctx.fillStyle='#22cc88';
    ctx.beginPath(); ctx.arc(sx,sy,th.sz*(th.isBoss?2.2:1.8),0,PI*2); ctx.fill();
    ctx.restore();

    if(!th.isBoss) drawEnemyShadow(sx,sy,th.sz,th.name);

    // Reusar sprite original pero con color de esqueleto — fake enemy object
    const fakeE = {
      x:th.x, y:th.y, sz:th.sz, fl:th.fl, wb:th.wb, animT:th.animT,
      col:'#44ffaa', sc:'#117744', name:th.name,
      dashing:th.dashing, alive:true, hp:th.hp, mhp:th.mhp
    };
    const wy=Math.sin(th.wb)*1.5;
    const flash=th.fl>0;

    if(th.isBoss){
      const fakeBoss={...th, alive:true, deathT:1, col:'#44ffaa', sc:'#117744'};
      drawBoss(fakeBoss, cx, cy, canvas.width, canvas.height);
    } else {
      switch(th.name){
        case 'bat':      drawThrallSprite(th,sx,sy,wy,flash) || drawBat(sx,sy,fakeE,wy,flash,th.sz);      break;
        case 'zombie':   drawThrallSprite(th,sx,sy,wy,flash) || drawZombie(sx,sy,fakeE,wy,flash,th.sz);   break;
        case 'skull':    drawThrallSprite(th,sx,sy,wy,flash) || drawSkull(sx,sy,fakeE,wy,flash,th.sz);    break;
        case 'demon':    drawThrallSprite(th,sx,sy,wy,flash) || drawDemon(sx,sy,fakeE,wy,flash,th.sz);    break;
        case 'warlock':  drawThrallSprite(th,sx,sy,wy,flash) || drawWarlock(sx,sy,fakeE,wy,flash,th.sz);  break;
        case 'gargoyle': gargoyleDashAura(sx,sy,wy,th.sz,th.dashing,flash); drawThrallSprite(th,sx,sy,wy,flash) || drawGargoyle(sx,sy,fakeE,wy,flash,th.sz); break;
      }
    }

    // Mini HP bar
    const hr=th.hp/th.mhp;
    const barW=th.isBoss?60:24;
    const barY=th.isBoss ? sy-th.sz*2.8 : sy-enemyTopPx(th.name,th.sz)-6; // sobre la cabeza del sprite
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(sx-barW/2-1,barY-1,barW+2,5);
    ctx.fillStyle='#117744'; ctx.fillRect(sx-barW/2,barY,barW,4);
    ctx.fillStyle='#44ffaa'; ctx.fillRect(sx-barW/2,barY,barW*hr,4);

    // Timer de vida restante (solo si quedan <10s, como advertencia)
    if(th.life<10){
      ctx.fillStyle=`rgba(255,200,100,${0.6+Math.sin(G.time*8)*.4})`;
      ctx.font=`bold 10px 'Courier New'`;
      ctx.textAlign='center';
      ctx.fillText(Math.ceil(th.life)+'s', sx, th.isBoss ? sy-th.sz*3.3 : barY-4);
      ctx.textAlign='left';
    }
}

// Proyectiles de los esclavos warlock
function drawThrallProjs(cx,cy){
  G.thrallProjs.forEach(pr=>{
    if(pr.trail){
      for(let i=0;i<pr.trail.length;i++){
        const tp=pr.trail[i];
        ctx.globalAlpha=(i/pr.trail.length)*.35;
        ctx.fillStyle='#44ffaa';
        ctx.beginPath(); ctx.arc(tp.x+cx,tp.y+cy,(i/pr.trail.length)*3.5,0,PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    const px=pr.x+cx, py=pr.y+cy;
    ctx.save();
    ctx.shadowColor='#44ffaa'; ctx.shadowBlur=12;
    ctx.fillStyle='#aaffcc';
    ctx.beginPath(); ctx.arc(px,py,5,0,PI*2); ctx.fill();
    ctx.restore();
  });
}

// Dibuja un esqueleto aliado (una llamada por esqueleto, para poder ordenarlos por profundidad con el resto)
function drawSkeleton(sk,cx,cy){
    const sx=sk.x+cx, sy=sk.y+cy;
    const wy=Math.sin(sk.wb)*1.5;
    const alpha=sk.spawnFlash>0?sk.spawnFlash*2:1;
    const flashing=sk.hitFlash>0;
    ctx.save(); ctx.globalAlpha=Math.min(1,alpha);

    // Sombra
    drawGroundShadow(sx,sy+10,8,3,.3);

    if(SPRITES.skeleton){
      drawSpriteFrame(SPRITES.skeleton, SPRITE_CFG.skeleton, sk.sprAnim||'idle', sk.sprFrame||0, sx, sy+10, sk.facingLeft, flashing);
      if(sk.hasRevived){
        ctx.save(); ctx.globalAlpha=0.25+Math.sin(G.time*4)*.1;
        ctx.shadowColor='#ffcc00'; ctx.shadowBlur=10;
        ctx.strokeStyle='#ffcc00'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.ellipse(sx,sy-9+wy,11,14,0,0,PI*2); ctx.stroke();
        ctx.restore();
      }
      const hr=sk.hp/sk.mhp;
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(sx-10,sy-30+wy,20,4);
      ctx.fillStyle='#44ffaa'; ctx.fillRect(sx-10,sy-30+wy,20*hr,4);
      ctx.restore();
      return;
    }

    // Cuerpo - huesos verdes (o blanco si recibe daño)
    const sc=flashing?'#ffffff':'#44ffaa', dc=flashing?'#ffffff':'#117744';
    // Tibia / piernas
    ctx.fillStyle=dc;
    ctx.fillRect(sx-6,sy+wy,4,10); ctx.fillRect(sx+2,sy+wy,4,10);
    ctx.fillStyle=sc;
    ctx.fillRect(sx-5,sy+1+wy,3,8); ctx.fillRect(sx+3,sy+1+wy,3,8);
    // Pelvis / cuerpo
    ctx.fillStyle=dc; ctx.fillRect(sx-7,sy-10+wy,14,12);
    ctx.fillStyle=sc; ctx.fillRect(sx-6,sy-9+wy,12,10);
    // Costillas
    ctx.fillStyle=dc;
    for(let r=0;r<3;r++){ctx.fillRect(sx-6,sy-7+r*3+wy,12,1);}
    // Brazos
    ctx.fillStyle=sc;
    ctx.fillRect(sx-11,sy-8+wy,5,6); ctx.fillRect(sx+6,sy-8+wy,5,6);
    // Manos con garras
    ctx.fillStyle=dc;
    ctx.fillRect(sx-12,sy-4+wy,3,3); ctx.fillRect(sx+9,sy-4+wy,3,3);
    ctx.strokeStyle='#22cc77'; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sx-11,sy-2+wy);ctx.lineTo(sx-13,sy+1+wy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx+10,sy-2+wy);ctx.lineTo(sx+13,sy+1+wy);ctx.stroke();
    // Cráneo
    ctx.fillStyle=dc; ctx.beginPath();ctx.ellipse(sx,sy-17+wy,7,8,0,0,PI*2);ctx.fill();
    ctx.fillStyle=sc; ctx.beginPath();ctx.ellipse(sx,sy-17.5+wy,6,7,0,0,PI*2);ctx.fill();
    // Ojos verdes brillantes
    ctx.shadowColor='#44ffaa'; ctx.shadowBlur=8;
    ctx.fillStyle='#44ffaa';
    ctx.beginPath();ctx.arc(sx-2.5,sy-18+wy,2,0,PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(sx+2.5,sy-18+wy,2,0,PI*2);ctx.fill();
    ctx.fillStyle='#aaffdd'; ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(sx-2.5,sy-18.5+wy,0.8,0,PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(sx+2.5,sy-18.5+wy,0.8,0,PI*2);ctx.fill();
    // Jaw
    ctx.fillStyle=sc; ctx.fillRect(sx-4,sy-12+wy,8,3);
    ctx.fillStyle='#000';
    ctx.fillRect(sx-3,sy-12+wy,2,2); ctx.fillRect(sx,sy-12+wy,2,2); ctx.fillRect(sx+3,sy-12+wy,2,2);

    // Aura dorada si ya resucitó una vez
    if(sk.hasRevived){
      ctx.save(); ctx.globalAlpha=0.25+Math.sin(G.time*4)*.1;
      ctx.shadowColor='#ffcc00'; ctx.shadowBlur=10;
      ctx.strokeStyle='#ffcc00'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(sx,sy-9+wy,11,14,0,0,PI*2); ctx.stroke();
      ctx.restore();
    }

    // Mini HP bar
    const hr=sk.hp/sk.mhp;
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(sx-10,sy-30+wy,20,4);
    ctx.fillStyle='#44ffaa'; ctx.fillRect(sx-10,sy-30+wy,20*hr,4);

    ctx.restore();
}

