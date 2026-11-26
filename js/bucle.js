// Blood Crypt — bucle del juego: loop(), update() y una función por sistema. El orden de carga está en index.html (ver CLAUDE.md).
// ─── GAME LOOP ────────────────────────────────────────────────────────────────
// Escena estática (menú, pausa, mejora, muerte): el canvas queda detrás de un scrim y no cambia,
// así que se redibuja una sola vez (al entrar en el estado o al redimensionar) en vez de en cada frame
function loop(ts=0){
  raf=requestAnimationFrame(loop);
  const dt=Math.max(0,Math.min((ts-lastT)/1000,.05)); lastT=ts; // entre 0 y 50 ms: un timestamp anterior al último no hace retroceder el tiempo
  if(!G.run||paused||G.lvlPending){ if(_redraw){ _redraw=false; draw(); } return; } // draw() puede volver a pedir redibujo (animación de muerte)
  update(dt); draw(); _redraw=true;
}
function update(dt){
  const p=G.p; G.time+=dt; p.animT+=dt;
  if(p.up.regen>0) p.hp=Math.min(p.mhp,p.hp+p.up.regen*dt);

  // Movement
  let mx=0,my=0;
  if(keys['w']||keys['arrowup'])    my=-1;
  if(keys['s']||keys['arrowdown'])  my=1;
  if(keys['a']||keys['arrowleft'])  mx=-1;
  if(keys['d']||keys['arrowright']) mx=1;
  // Joystick override
  if(joystickActive&&(joyVX!==0||joyVY!==0)){mx=joyVX;my=joyVY;}
  const moving=mx!==0||my!==0;
  if(mx&&my){mx*=.707;my*=.707;}
  if(moving) p.walkPhase+=dt*8;
  if(moving){ p.facingAng=Math.atan2(my,mx); p.facingLeft=(mx<0); }
  if(G.furyTimer>0) G.furyTimer-=dt;
  const furyBoost=G.furyTimer>0?FURY_SPEED_BOOST:0;
  // Durante la embestida de Yoko, el movimiento normal se desactiva (lo controla updateYokoCharge)
  if(!p.charging){
    p.x+=mx*(p.spd+p.up.spd+furyBoost)*dt; p.y+=my*(p.spd+p.up.spd+furyBoost)*dt;
  }
  p.y=Math.max(-RH*TILE*.38,Math.min(RH*TILE*.38,p.y));
  const camK=1-Math.pow(.87,dt*60); // suavizado de cámara por tiempo (igual al .13 por frame a 60 Hz)
  G.cam.x+=(p.x-G.cam.x)*camK; G.cam.y+=(p.y-G.cam.y)*camK;
  // Screen shake decay
  if(G.shake>0){
    G.shake=Math.max(0,G.shake-dt*18);
    G.shakeX=(Math.random()-.5)*2*G.shake;
    G.shakeY=(Math.random()-.5)*2*G.shake;
  } else { G.shakeX=0; G.shakeY=0; }
  // lvlUp flash decay
  if(G.lvlUpFlash>0) G.lvlUpFlash=Math.max(0,G.lvlUpFlash-dt*3);
  if(p.invT>0)p.invT-=dt; if(p.dmgF>0)p.dmgF-=dt;

  // Attack
  p.atkt-=dt;
  const hero=HEROES[p.id];
  if(p.atkt<=0){p.atkt=Math.max(.1,p.rate/(1+p.up.rate)); hero.attack();}
  if(hero.update) hero.update(dt);
  // Sistemas que se activan por nivel de mejora (no por héroe); además inicializan campos de G que usa el dibujo
  updateArrowQueue(dt);
  updateShurikens(dt);
  updateRain(dt);
  updateTraps(dt);
  updateStealth(dt);
  updatePoison(dt);
  updateKnightSpriteAnim(dt,mx,my);

  // Resto del frame, en orden fijo. Las que devuelven true terminaron la partida (endGame) y cortan el frame acá,
  // igual que el return que había antes en medio de update().
  updateProjectiles(dt);
  if(updateEnemies(dt)) return;
  if(updateEnemyProjectiles(dt)) return;
  updateOrbs(dt);
  updateEffects(dt);
  updateSpawner(dt);
  if(updateBoss(dt)) return;
  if(updateLilith(dt)) return;
  if(updateBossProjectiles(dt)) return;

  // Red de seguridad: si por cualquier vía la vida llegó a 0 sin comprobarse, se termina la partida
  if(G.run && G.p.hp<=0){ G.p.hp=0; endGame(); return; }
  updHUD();
}

// Mecánicas de impacto de un proyectil del héroe sobre un objetivo t (enemigo o jefe), en este orden:
// veneno (flechas), división (orbe del mago) y perforación. Devuelve true si el proyectil sigue (perforó)
// y false si se consumió (queda pr.alive=false).
// Ojo con el orden respecto de la muerte: un enemigo muere ANTES de llamar a esto (killE) y el jefe DESPUÉS
// (killBoss, que además puede esclavizarlo). Es así desde antes; cambiarlo cambia la jugabilidad.
function projAfterHit(pr,t){
  if(pr.arrow) applyPoison(t);
  if(pr.mage) mageSplit(pr,t);
  if(pr.pierceLeft>0){ pr.pierceLeft--; pr.hit.add(t); pr.dmg*=pr.pierceDecay; return true; }
  pr.alive=false;
  return false;
}

// Choque de un proyectil del héroe con el jefe (ox,oy = posición anterior, para el barrido de las flechas).
// Tiene sus propios efectos (flash, sangre lila, sonido de golpe al jefe) y mata al jefe después de las mecánicas.
function projHitBoss(pr,ox,oy){
  if(pr.alive && !(pr.arm>0) && (!pr.home||pr.home===G.boss) && G.bossAlive && G.boss && G.boss.alive && !(pr.hit && pr.hit.has(G.boss))){
    const boss=G.boss;
    const touchedB = pr.arrow ? segDist(boss.x,boss.y,ox,oy,pr.x,pr.y)<boss.sz+pr.sz : hyp(pr.x-boss.x,pr.y-boss.y)<boss.sz+pr.sz;
    if(touchedB){
      boss.hp-=pr.dmg; boss.fl=.10;
      if(pr.isCrit){G.totalCrits++;spawnDmgNum(boss.x,boss.y-boss.sz*2,pr.dmg,true);sndCrit();}
      else{sndBossHit();}
      spawnBlood(boss.x,boss.y,pr.isCrit?16:10,'#c8b8ff');
      spParts(boss.x,boss.y,pr.isCrit?'#ff8800':(pr.arrow?'#d9c27a':'#aa66ff'),pr.isCrit?12:7);
      projAfterHit(pr,boss);
      if(boss.hp<=0) killBoss();
    }
  }
}

// Proyectiles del héroe: movimiento, búsqueda del orbe dividido del mago y choque con enemigos y jefe.
function updateProjectiles(dt){
  // Projectiles
  for(let i=G.projs.length-1;i>=0;i--){
    const pr=G.projs[i];
    if(!pr.alive){G.projs.splice(i,1);continue;}
    pr.trail.push({x:pr.x,y:pr.y});
    if(pr.trail.length>8) pr.trail.shift();
    if(pr.home){   // orbe dividido: va hacia su objetivo; si este muere en el camino busca otro cercano
      let t=pr.home;
      // objetivo inválido: murió, o ya fue golpeado por otra rama de la cadena (no se puede volver a golpear) -> busca otro cercano
      if(!t.alive||pr.fam.hit.has(t)||(t===G.boss&&!G.bossAlive)){ pr.fam.claim.delete(t); t=mageCandidates(pr.x,pr.y,pr.fam)[0]; pr.home=t||null; if(!t){ pr.alive=false; continue; } pr.fam.claim.add(t); }
      const hs=hyp(pr.vx,pr.vy)||MAGE_CHILD_SPEED, hd=hyp(t.x-pr.x,t.y-pr.y);
      const want=Math.atan2(t.y-pr.y,t.x-pr.x), cur=Math.atan2(pr.vy,pr.vx);
      let da=want-cur; while(da>PI) da-=PI*2; while(da<-PI) da+=PI*2;
      const maxT=MAGE_TURN_RATE*dt, step=hd<40?da:Math.max(-maxT,Math.min(maxT,da));   // giro limitado (curva en "V"); muy cerca apunta directo para no orbitar
      pr.vx=Math.cos(cur+step)*hs; pr.vy=Math.sin(cur+step)*hs;
    }
    if(pr.arm>0) pr.arm-=dt;
    const ox=pr.x, oy=pr.y;
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.tr+=hyp(pr.vx,pr.vy)*dt;
    if(pr.tr>pr.range){ if(pr.fam&&pr.home) pr.fam.claim.delete(pr.home); pr.alive=false;continue;}
    for(const e of G.enemies){
      if(pr.arm>0) break;           // recién dividido: aún no colisiona (le da tiempo a salir del grupo)
      if(pr.home && e!==pr.home) continue;   // orbe dividido: solo impacta a SU objetivo (atraviesa al resto para que se vea ir a buscarlo)
      if(!e.alive)continue;
      if(pr.hit && pr.hit.has(e)) continue;
      const touched = pr.arrow ? segDist(e.x,e.y,ox,oy,pr.x,pr.y)<e.sz+pr.sz : hyp(pr.x-e.x,pr.y-e.y)<e.sz+pr.sz;
      if(touched){
        e.hp-=pr.dmg; e.fl=.15;
        if(pr.isCrit){G.totalCrits++;spawnDmgNum(e.x,e.y-e.sz*2,pr.dmg,true);sndCrit();}
        spawnBlood(e.x,e.y,pr.isCrit?14:8,pr.isCrit?'#ff6600':'#aa1111');
        spParts(e.x,e.y,pr.isCrit?'#ff8800':(pr.arrow?'#d9c27a':'#cc44ff'),pr.isCrit?10:6);
        if(e.hp<=0) killE(e);
        if(!projAfterHit(pr,e)) break;   // se consumió; si perforó, la flecha sigue de largo
      }
    }
    projHitBoss(pr,ox,oy);
  }
  G.projs=G.projs.filter(p=>p.alive);
}

// Enemigos: movimiento, disparos del brujo, dash de la gárgola, daño por contacto al héroe y a los esqueletos.
// Devuelve true si el contacto mató al héroe (la partida terminó y el frame se corta).
function updateEnemies(dt){
  const p=G.p;
  // Enemies
  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];
    if(!e.alive){G.enemies.splice(i,1);continue;}
    e.wb+=dt*5; e.animT+=dt; if(e.fl>0)e.fl-=dt;
    if(e.slowT>0){ // ralentizado por una trampa del Arquero
      if(e.baseSpd===undefined) e.baseSpd=e.spd;
      e.slowT-=dt; e.spd=e.slowT>0?e.baseSpd*TRAP_SLOW_MULT:e.baseSpd;
    }
    // Con SIGILO activo los enemigos comunes pierden al héroe y van hacia el último lugar donde lo vieron
    const inv=p.invisT>0;
    const tgx=inv?G.invisPos.x:p.x, tgy=inv?G.invisPos.y:p.y;
    const dx=tgx-e.x,dy=tgy-e.y,d=hyp(dx,dy);
    e.facingLeft = dx<0;

    // ── WARLOCK: dispara proyectiles al jugador ───────────────────────────────
    if(e.name==='warlock' && e.shootTimer>=0){
      e.shootTimer-=dt;
      if(e.shootTimer<=0 && d<420 && !inv){
        e.shootTimer=rf(2.2,4.0);
        const spd=155, nx=dx/d, ny=dy/d;
        [-0.22,0,0.22].forEach(ang=>{
          const ca=Math.cos(ang),sa=Math.sin(ang);
          G.eProjs.push({x:e.x,y:e.y,vx:(nx*ca-ny*sa)*spd,vy:(nx*sa+ny*ca)*spd,
            life:3.5,col:'#00cccc',sc:'#004444',dmg:e.atk*.65,trail:[]});
        });
        sndBoneShoot();
      }
      // Warlock mantiene distancia
      if(d<160 && d>0){e.x-=dx/d*e.spd*.6*dt; e.y-=dy/d*e.spd*.6*dt;}
      else if(d>0){e.x+=dx/d*e.spd*.5*dt; e.y+=dy/d*e.spd*.5*dt;}
    }
    // ── GARGOYLE: dash ────────────────────────────────────────────────────────
    else if(e.name==='gargoyle'){
      if(e.dashing){
        e.x+=e.dashVx*dt; e.y+=e.dashVy*dt;
        e.dashT-=dt; e.fl=0.08;
        if(e.dashT<=0){e.dashing=false; e.dashTimer=rf(3.5,6.0);}
      } else {
        e.dashTimer-=dt;
        if(e.dashTimer<=0 && d>60 && !inv){
          e.dashing=true; e.dashT=0.26;
          const dspd=500; e.dashVx=dx/d*dspd; e.dashVy=dy/d*dspd; addShake(2);
        }
        if(d>0){e.x+=dx/d*e.spd*dt; e.y+=dy/d*e.spd*dt;}
      }
    }
    // ── Movimiento normal ─────────────────────────────────────────────────────
    else if(d>0){e.x+=dx/d*e.spd*dt; e.y+=dy/d*e.spd*dt;}

    updateEnemySpriteAnim(e,dt,d);

    if(!inv&&d<e.sz+14&&p.invT<=0){
      const dmgMult=1-Math.min(ARMOR_MAX,p.up.armor||0);
      let hit=e.atk*CONTACT_HIT_MULT, extra=0;
      // multitud: los demás enemigos que también tocan al héroe suman una fracción de su golpe (con tope)
      for(const o of G.enemies){ if(o===e||!o.alive) continue; if(hyp(o.x-p.x,o.y-p.y)<o.sz+14) extra+=o.atk*CONTACT_HIT_MULT*CONTACT_CROWD_MULT; }
      hit+=Math.min(extra,hit*CONTACT_CROWD_CAP);
      p.hp-=hit*dmgMult;p.dmgF=.15;p.invT=.28;sndDamage();addShake(4);if(p.hp<=0){endGame();return true;}
    }

    // Enemigo ataca al esqueleto más cercano si está en rango (en vez del jugador)
    if(G.skeletons.length>0){
      let nearestSk=null, nearestD=Infinity;
      for(const sk of G.skeletons){
        if(!sk.alive) continue;
        const skd=hyp(sk.x-e.x,sk.y-e.y);
        if(skd<nearestD){ nearestD=skd; nearestSk=sk; }
      }
      if(nearestSk && nearestD<e.sz+16){
        nearestSk.atkCooldown=(nearestSk.atkCooldown||0)-dt;
        if(nearestSk.atkCooldown===undefined || nearestSk.atkCooldown<=0){
          nearestSk.atkCooldown=0.5;
          nearestSk.hp-=e.atk*0.5;
          nearestSk.hitFlash=0.15;
          spParts(nearestSk.x,nearestSk.y,'#ff4444',3);
          if(nearestSk.hp<=0){ killSkeleton(nearestSk); }
        }
      }
    }
  }
}

// Proyectiles enemigos (brujo). Devuelve true si mataron al héroe.
function updateEnemyProjectiles(dt){
  const p=G.p;
  // Proyectiles enemigos (warlock)
  for(let i=G.eProjs.length-1;i>=0;i--){
    const pr=G.eProjs[i];
    if(!pr.trail) pr.trail=[];
    pr.trail.push({x:pr.x,y:pr.y});
    if(pr.trail.length>6) pr.trail.shift();
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    if(pr.life<=0){G.eProjs.splice(i,1);continue;}
    const ddx=pr.x-p.x,ddy=pr.y-p.y;
    if(Math.sqrt(ddx*ddx+ddy*ddy)<14&&p.invT<=0){
      const dmgMult=1-Math.min(ARMOR_MAX,p.up.armor||0);
      p.hp-=pr.dmg*dmgMult; p.dmgF=.15; p.invT=.35; sndDamage(); addShake(3);
      G.eProjs.splice(i,1);
      if(p.hp<=0){endGame();return true;}
    }
  }
}

// Orbes de XP y oro: deslizamiento, recogida y subida de nivel.
function updateOrbs(dt){
  const p=G.p;
  // Orbes de XP: ya NO se dirigen hacia el héroe; quedan donde cayeron y hay que ir a recogerlos.
  // Si cayeron fuera de la zona alcanzable (más allá de los muros, donde el héroe no puede entrar),
  // se deslizan hacia el borde alcanzable más cercano.
  // Los orbes NUNCA desaparecen por tiempo: solo al ser recogidos. Al recogerse, la XP se da al instante y el orbe
  // vuela hacia el héroe (ORB_FLY_TIME) encogiéndose hasta desaparecer.
  const orbPR=pickupRadius(ORB_PICKUP_R,ORB_PICKUP_GROWTH);
  for(let i=G.orbs.length-1;i>=0;i--){
    const o=G.orbs[i]; o.pulse+=dt*5;
    if(o.taken){
      o.tt+=dt;
      const t=Math.min(1,o.tt/ORB_FLY_TIME), e=t*t;          // acelera al acercarse
      o.x=o.sx+(p.x-o.sx)*e; o.y=o.sy+(p.y-o.sy)*e;          // apunta a la posición ACTUAL del héroe
      if(t>=1) G.orbs.splice(i,1);
      continue;
    }
    if(o.y>HERO_Y_LIMIT||o.y<-HERO_Y_LIMIT){
      const targetY=o.y>0?HERO_Y_LIMIT:-HERO_Y_LIMIT;
      const dy2=targetY-o.y, step=ORB_SLIDE_SPEED*dt;
      o.y=Math.abs(dy2)<=step?targetY:o.y+Math.sign(dy2)*step;
    }
    if(hyp(p.x-o.x,p.y-o.y)<orbPR){
      o.taken=true; o.tt=0; o.sx=o.x; o.sy=o.y;
      if(o.gold){ G.gold+=o.val; sndOrb(); }
      else{ p.xp+=Math.round(o.val*p.up.xpm); sndOrb();
      while(p.xp>=p.xpN)triggerLvlUp(); }
    }
  }
}

// Efectos visuales con vida propia: partículas, sangre, anillos, divisiones, manos espectrales, rayos y números de daño.
function updateEffects(dt){
  // Particles
  for(let i=G.parts.length-1;i>=0;i--){
    const pt=G.parts[i];
    pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vy+=120*dt;
    pt.vx*=Math.pow(.88,dt*60); pt.life-=dt; pt.rot+=pt.rotV*dt;
    if(pt.life<=0)G.parts.splice(i,1);
  }
  for(let i=G.bloodSplats.length-1;i>=0;i--){
    const b=G.bloodSplats[i];
    if(b.moving!==false){
      b.x+=b.vx*dt; b.y+=b.vy*dt; b.vy+=200*dt; b.vx*=Math.pow(.82,dt*60);
      if(Math.abs(b.vy)<8&&Math.abs(b.vx)<8){ b.moving=false; b.life=rf(1.2,2.5); b.ml=b.life; } // se asienta
    }
    b.life-=dt;
    if(b.life<=0)G.bloodSplats.splice(i,1);
  }
  for(let i=G.meleeEff.length-1;i>=0;i--){G.meleeEff[i].life-=dt;if(G.meleeEff[i].life<=0)G.meleeEff.splice(i,1);}
  for(let i=G.splitFx.length-1;i>=0;i--){G.splitFx[i].life-=dt;if(G.splitFx[i].life<=0)G.splitFx.splice(i,1);}
  for(let i=G.spectralFX.length-1;i>=0;i--){G.spectralFX[i].life-=dt;if(G.spectralFX[i].life<=0)G.spectralFX.splice(i,1);}
  updateLightning(dt);
  for(let i=G.lightningFX.length-1;i>=0;i--){
    const fx=G.lightningFX[i];
    if(fx.delay>0){ fx.delay-=dt; continue; }
    if(!fx.struck) strikeLightning(fx);
    fx.life-=dt;
    if(fx.life<=0) G.lightningFX.splice(i,1);
  }
  for(let i=G.dmgNums.length-1;i>=0;i--){
    const d=G.dmgNums[i];
    d.x+=d.vx*dt; d.y+=d.vy*dt; {const dk=Math.pow(.9,dt*60); d.vy*=dk; d.vx*=dk;} d.life-=dt;
    if(d.life<=0)G.dmgNums.splice(i,1);
  }
}

// Oleada por tiempo, aparición del jefe y de Lilith, y generación de enemigos comunes.
function updateSpawner(dt){
  // Wave & Boss trigger
  G.wave=1+Math.floor(G.time/25); G.spI=Math.max(.5,2.2-G.wave*.15);
  if(G.wave>=10 && !G.bossSpawned){ G.bossSpawned=true; spawnBoss(); }

  // Lilith, Hija del Odio — entidad inmortal que aparece al minuto 8 (480s) y escala su daño con cada golpe
  if(G.time>=480 && !G.lilithSpawned){ G.lilithSpawned=true; G.goldAtLilith=G.gold|0; spawnLilith(); }

  // Spawner (suppressed during boss fight and while Lilith está viva, para enfocar la atención)
  if(!G.bossAlive && !G.lilithAlive){
    G.spT-=dt;
    if(G.spT<=0){if(G.enemies.length<180){const n=1+Math.floor(G.wave*.5);for(let i=0;i<n&&G.enemies.length<180;i++)spawnEnemy();}G.spT=G.spI;}
  }
}

// Rey Liche: persecución, fases, golpe cuerpo a cuerpo, abanico de proyectiles y animación de muerte.
// Devuelve true si su golpe mató al héroe.
function updateBoss(dt){
  // Boss update
  if(G.bossAlive && G.boss && G.boss.alive){
    const boss=G.boss, p=G.p;
    boss.animT+=dt;
    if(boss.fl>0) boss.fl-=dt;

    // Phase thresholds
    const ratio=boss.hp/boss.mhp;
    boss.phase = ratio>0.5?1:ratio>0.2?2:3;
    if(boss.phase!==boss.lastPhase){ boss.hurtT=0.5; boss.lastPhase=boss.phase; }

    // Movement — chase player, speed scales with phase
    const spdMult=boss.phase===3?1.65:boss.phase===2?1.3:1.0;
    const dx=p.x-boss.x, dy=p.y-boss.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
    boss.x+=dx/dist*boss.spd*spdMult*dt;
    boss.y+=dy/dist*boss.spd*spdMult*dt;
    boss.wb=Math.sin(boss.animT*2)*3;
    boss.facingLeft = dx<0;

    // Boss melee damage to player
    boss.inMelee = dist<boss.sz+14;
    if(boss.inMelee && p.invT<=0){
      const dmgMult=1-Math.min(ARMOR_MAX,p.up.armor||0);
      const phaseDmg=boss.phase===3?boss.atk*2.2:boss.phase===2?boss.atk*1.5:boss.atk;
      p.hp-=phaseDmg*BOSS_CONTACT_HIT_MULT*dmgMult; p.dmgF=.15; p.invT=.32; sndDamage(); addShake(7);
      if(p.hp<=0){ p.hp=0; endGame(); return true; }
    }

    // Boss ranged attack — abanico de proyectiles apuntado al héroe en fase 2+
    if(boss.phase>=2){
      const pIntv=boss.phase===3?1.0:1.6;
      boss.projTimer-=dt;
      if(boss.projTimer<=0){
        boss.projTimer=pIntv;
        const shots=boss.phase===3?8:5;
        const spread=boss.phase===3?BOSS_PROJ_SPREAD3:BOSS_PROJ_SPREAD2;
        const aim=Math.atan2(G.p.y-boss.y,G.p.x-boss.x);   // dirección hacia el héroe en el momento del disparo
        for(let i=0;i<shots;i++){
          const ang=aim+(i-(shots-1)/2)*(spread/(shots-1)); // abanico centrado en el héroe
          const spd=180+boss.phase*40;
          G.bossProjs.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:3.0});
        }
        boss.castT=0.5;
        sndBoneShoot();
      }
    }

    // Boss HP bar
    document.getElementById('boss-hp-fill').style.width=(boss.hp/boss.mhp*100)+'%';

    updateBossSpriteAnim(dt);

    if(boss.hp<=0){ killBoss(); }
  }

  // Boss death animation tick (fuera del alive check)
  if(G.boss && !G.boss.alive){
    G.boss.deathT -= dt;
    if(SPRITES.boss){
      if(G.boss.fl>0) G.boss.fl-=dt*3; // flash breve al morir, luego se ve el sprite de muerte
      updateBossSpriteAnim(dt);
    } else {
      G.boss.fl = 1; // mantener flash blanco durante death anim (fallback procedural)
    }
    if(G.boss.deathT <= 0){ G.boss = null; G.bossAlive = false; }
  }

  // Boss announce timer
  if(G.bossAnnounce>0) G.bossAnnounce-=dt;
}

// Lilith: se acerca hasta su rango y golpea en área; su daño se duplica con cada golpe. Devuelve true si mató al héroe.
function updateLilith(dt){
  // Lilith, Hija del Odio — update (se acerca solo hasta su rango de ataque, luego golpea en área a distancia; inmortal, escala su daño con cada golpe)
  if(G.lilithAlive && G.lilith){
    const lilith=G.lilith, p=G.p;
    lilith.animT+=dt;
    if(lilith.fl>0) lilith.fl-=dt;
    if(lilith.attackT>0) lilith.attackT-=dt;
    if(lilith.atkTimer>0) lilith.atkTimer-=dt;
    if(G.lilithAnnounce>0) G.lilithAnnounce-=dt;

    const dx=p.x-lilith.x, dy=p.y-lilith.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
    lilith.facingLeft = dx<0;
    // Solo se acerca hasta entrar en rango de ataque; si el héroe se aleja, vuelve a acercarse
    if(dist>lilith.atkRange){
      // Siempre un poco más rápida que el héroe (incluyendo sus mejoras de velocidad y bonus temporales),
      // para que no pueda escapar; nunca más lenta que su velocidad base
      const lilSpd=Math.max(lilith.spd, heroMoveSpeed(p)*LILITH_SPEED_FACTOR);
      lilith.x+=dx/dist*lilSpd*dt;
      lilith.y+=dy/dist*lilSpd*dt;
    }
    lilith.wb=Math.sin(lilith.animT*2.4)*3;

    // Ataque en área a distancia (mismo sistema visual que el anillo del Caballero, en rojo/tinto)
    if(dist<=lilith.atkRange && lilith.atkTimer<=0 && G.lilithAnnounce<=0){
      lilith.atkTimer=1.6;
      lilith.fl=.35; lilith.attackT=0.6;
      G.meleeEff.push({x:lilith.x,y:lilith.y,life:.35,range:lilith.atkRange,col:'#8b0020'});
      sndBoneShoot(); addShake(Math.min(30,10+lilith.atk*0.4));
      p.hp-=lilith.atk; p.dmgF=.25;
      sndDamage();
      lilith.atk*=2; // el daño de su PRÓXIMO golpe se duplica, para siempre
      if(p.hp<=0){ p.hp=0; endGame(); return true; }
    }

    updateLilithSpriteAnim(dt);
  }
}

// Proyectiles del jefe. Devuelve true si mataron al héroe.
function updateBossProjectiles(dt){
  // Boss projectiles update & collision
  const p=G.p;
  for(let i=G.bossProjs.length-1;i>=0;i--){
    const pr=G.bossProjs[i];
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    if(pr.life<=0){G.bossProjs.splice(i,1);continue;}
    if(!pr.trail) pr.trail=[];
    pr.trail.push({x:pr.x,y:pr.y});
    if(pr.trail.length>8) pr.trail.shift();
    const dx=pr.x-p.x, dy=pr.y-p.y;
    if(Math.sqrt(dx*dx+dy*dy)<16 && p.invT<=0){
      const dmgMult=1-Math.min(ARMOR_MAX,p.up.armor||0);
      p.hp-=BOSS_PROJ_DMG*dmgMult; p.dmgF=.15; p.invT=.38; sndDamage(); addShake(5);
      G.bossProjs.splice(i,1);
      if(p.hp<=0){ p.hp=0; endGame(); return true; }
    }
  }
}

