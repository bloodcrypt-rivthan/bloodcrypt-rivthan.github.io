// Blood Crypt — Yoko: embestida, sed de sangre y huesos enterrados. El orden de carga está en index.html (ver CLAUDE.md).
// ─── YOKO: EMBESTIDA, PASIVA "SED DE SANGRE" Y HUESOS ENTERRADOS ───────────────

// Busca el enemigo (o boss) vivo más cercano dentro de maxDist. Devuelve null si no hay ninguno alcanzable.
function findYokoChargeTarget(p,maxDist){
  const alive=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) alive.push(G.boss);
  if(!alive.length) return null;
  alive.sort(_byDist2(p.x,p.y));
  const t=alive[0];
  if(hyp(t.x-p.x,t.y-p.y)>maxDist+t.sz) return null; // el más cercano sigue fuera del alcance del dash
  return t;
}

// Inicia una embestida hacia target. extra=true cuando es la segunda embestida automática del frenesí (no resetea chargeExtraUsed).
function startYokoDash(p,target,extra){
  const boosted=p.bloodlustActive;
  const chargeSpd=620*(boosted?BLOODLUST_CHARGE_MULT:1), chargeT=0.32;
  const ang=Math.atan2(target.y-p.y,target.x-p.x);
  p.charging=true;
  p.chargeT=chargeT;
  p.chargeVx=Math.cos(ang)*chargeSpd;
  p.chargeVy=Math.sin(ang)*chargeSpd;
  p.chargeHit=new Set(); // enemigos ya golpeados en esta embestida (evita multi-hit del mismo)
  p.chargeBonusUsed=false;
  if(!extra) p.chargeExtraUsed=false; // habilita una nueva embestida extra si el frenesí sigue activo
  triggerSprAttack(p);
  sndShoot();
  addShake(boosted?4:3);
}

function doYokoCharge(){
  const p=G.p;
  if(p.charging) return; // ya está embistiendo, no reiniciar
  const chargeSpd=620*(p.bloodlustActive?BLOODLUST_CHARGE_MULT:1), chargeT=0.32;
  const chargeDist=chargeSpd*chargeT; // distancia total que recorre la embestida (con boost si aplica)
  const target=findYokoChargeTarget(p,chargeDist);
  if(!target) return; // nadie alcanzable, no embestir al aire
  startYokoDash(p,target,false);
}

// Pasiva "Sed de Sangre": ciclo cooldown→ventana activa. Durante la ventana,
// la embestida es más veloz/larga y, al terminar, dispara una segunda embestida automática.
function updateBloodlust(dt){
  const p=G.p;
  if(p.bloodlustActive){
    p.bloodlustT-=dt;
    if(p.bloodlustT<=0){
      p.bloodlustActive=false;
      p.bloodlustCD=BLOODLUST_COOLDOWN;
    }
  } else {
    p.bloodlustCD-=dt;
    if(p.bloodlustCD<=0){
      p.bloodlustActive=true;
      p.bloodlustT=BLOODLUST_DURATION;
    }
  }
}

function triggerSprAttack(p){
  if(!SPRITES[p.id]) return; // el id del héroe es su clave en SPRITES/SPRITE_CFG
  const cfg=SPRITE_CFG[p.id];
  const[,count,fps]=cfg.anims.attack;
  p.sprAttacking=true;
  p.sprAttackT=count/fps;
  p.sprAnim='attack'; p.sprFrame=0; p.sprFrameT=0;
  if(p.melee && KNIGHT_NAT && knightSheetsReady()) p.sprAttackT=knSecs('knS_atk'); // el ataque SUAVE dura lo que dicen sus cuadros (suave/animaciones.json)
}

function updateBossSpriteAnim(dt){
  const boss=G.boss;
  if(!SPRITES.boss || !boss) return;
  const cfg=SPRITE_CFG.boss;
  if(!boss.alive){
    if(boss.sprAnim!=='death'){ boss.sprAnim='death'; boss.sprFrame=0; boss.sprFrameT=0; }
  } else {
    if(boss.hurtT>0) boss.hurtT-=dt;
    if(boss.castT>0) boss.castT-=dt;
    let newAnim;
    if(G.bossAnnounce>0) newAnim='summon';
    else if(boss.hurtT>0) newAnim='hurt';
    else if(boss.castT>0) newAnim='cast';
    else newAnim=boss.phase===3?'enrage':'idle';
    if(newAnim!==boss.sprAnim){ boss.sprAnim=newAnim; boss.sprFrame=0; boss.sprFrameT=0; }
  }
  const [,count,fps]=cfg.anims[boss.sprAnim]||cfg.anims.idle;
  boss.sprFrameT+=dt;
  const frameDur=1/fps;
  while(boss.sprFrameT>=frameDur){
    boss.sprFrameT-=frameDur;
    if(boss.sprAnim==='death') boss.sprFrame=Math.min((boss.sprFrame||0)+1,count-1);
    else boss.sprFrame=((boss.sprFrame||0)+1)%count;
  }
}

function updateEnemySpriteAnim(e,dt,distToPlayer){
  const sheet=SPRITES[e.name];
  if(!sheet) return; // este tipo de enemigo aún no tiene sprite propio (usa dibujo procedural)
  const cfg=SPRITE_CFG[e.name];
  let newAnim;
  if(e.fl>0) newAnim='hurt';
  else if(distToPlayer<130) newAnim='attack'; // se acerca al jugador: pose de ataque/picado
  else newAnim='idle';
  if(newAnim!==e.sprAnim){ e.sprAnim=newAnim; e.sprFrame=0; e.sprFrameT=0; }
  const anim=cfg.anims[e.sprAnim]||cfg.anims.idle;
  const [,count,fps]=anim;
  e.sprFrameT+=dt;
  const frameDur=1/fps;
  while(e.sprFrameT>=frameDur){
    e.sprFrameT-=frameDur;
    e.sprFrame=((e.sprFrame||0)+1)%count;
  }
}

function updateLilithSpriteAnim(dt){
  const lilith=G.lilith;
  if(!SPRITES.lilith || !lilith) return;
  const cfg=SPRITE_CFG.lilith;
  let newAnim;
  if(G.lilithAnnounce>0) newAnim='summon';
  else if(lilith.attackT>0) newAnim='attack';
  else {
    // cuanto más letal se volvió su próximo golpe, más agresiva su pose de reposo
    const danger=Math.min(1, Math.log2(Math.max(1,lilith.atk/6))/6);
    newAnim = danger>0.5 ? 'enrage' : 'idle';
  }
  if(newAnim!==lilith.sprAnim){ lilith.sprAnim=newAnim; lilith.sprFrame=0; lilith.sprFrameT=0; }
  const [,count,fps]=cfg.anims[lilith.sprAnim]||cfg.anims.idle;
  lilith.sprFrameT+=dt;
  const frameDur=1/fps;
  while(lilith.sprFrameT>=frameDur){
    lilith.sprFrameT-=frameDur;
    lilith.sprFrame=((lilith.sprFrame||0)+1)%count;
  }
}

function updateKnightSpriteAnim(dt,mx,my){
  const p=G.p;
  const usesSprite=!!SPRITES[p.id];
  if(!usesSprite) return;
  if(p.melee && KNIGHT_NAT && SPRITES.knightNew){ // animación suave (prueba)
    if(knightSheetsReady()){ knightSuaveAnim(dt,mx,my); return; }
    if(!p.sprDead && p.hp>0){ knightNatAnim(dt,mx,my); return; }
  }
  const cfg=SPRITE_CFG[p.id];
  if(p.hp<=0 && !p.sprDead){
    p.sprAnim='death'; p.sprFrame=0; p.sprFrameT=0; p.sprDead=true;
  } else if(!p.sprDead){
    // p.sprAttacking se activa en doMelee()/doNecroAttack() y dura la duración del ataque
    if(p.sprAttacking){
      p.sprAttackT=(p.sprAttackT||0)-dt;
      if(p.sprAttackT<=0){ p.sprAttacking=false; }
    }
    const moving=(mx!==0||my!==0);
    const newAnim=(p.sprAttacking && !(p.melee&&SPRITES.knightNew&&!SPRITES.knightAtk))?'attack':moving?'walk':'idle';
    if(newAnim!==p.sprAnim){
      p.sprAnim=newAnim;
      p.sprFrame=0;
      p.sprFrameT=0;
    }
  }
  const [,count,fps]=cfg.anims[p.sprAnim]||cfg.anims.idle;
  p.sprFrameT+=dt;
  const frameDur=1/fps;
  while(p.sprFrameT>=frameDur){
    p.sprFrameT-=frameDur;
    if(p.sprAnim==='death') p.sprFrame=Math.min((p.sprFrame||0)+1,count-1);
    else p.sprFrame=((p.sprFrame||0)+1)%count;
  }
}

function updateYokoCharge(dt){
  const p=G.p;
  if(!p.charging) return;
  p.chargeT-=dt;
  // Durante la embestida el facing sigue la dirección del dash, no el input
  if(p.chargeVx!==0) p.facingLeft=p.chargeVx<0;
  // Mover al jugador en línea recta a alta velocidad (ignora el movimiento normal mientras dura)
  p.x+=p.chargeVx*dt; p.y+=p.chargeVy*dt;
  p.y=Math.max(-RH*TILE*.38,Math.min(RH*TILE*.38,p.y));

  // Rastro de polvo durante la embestida (rojo sangre si está activo el frenesí)
  if(Math.random()<.6) spParts(p.x-p.chargeVx*.01,p.y-p.chargeVy*.01,p.bloodlustActive?'#ff2222':'#c89a6a',2);

  // Bonus de daño si se desenterró un hueso recientemente
  let dmgMult=1;
  if(p.chargeDmgBonus>0){ dmgMult=1.6; }

  // Colisión contra enemigos en el camino (en cada frame de la embestida)
  const allTargets=[...G.enemies.filter(e=>e.alive)];
  if(G.bossAlive && G.boss && G.boss.alive) allTargets.push(G.boss);
  allTargets.forEach(target=>{
    if(p.chargeHit.has(target)) return;
    const d=hyp(target.x-p.x,target.y-p.y);
    if(d<target.sz+p.range*p.up.rng){
      p.chargeHit.add(target);
      const{dmg,isCrit}=calcDmg((p.atk+p.up.atk)*1.4*dmgMult*(p.up.chargeDmgMult||1));
      target.hp-=dmg; target.fl=.15;
      if(isCrit){G.totalCrits++;spawnDmgNum(target.x,target.y-target.sz*2,dmg,true);sndCrit();}
      else{ if(target===G.boss) sndBossHit(); else sndHit(); }
      spawnBlood(target.x,target.y,isCrit?16:10,isCrit?'#ff6600':'#cc1111');
      spParts(target.x,target.y,'#d49a5a',8);
      addShake(2);
      if(p.up.chargeLifesteal) p.hp=Math.min(p.mhp,p.hp+(p.up.chargeLifesteal||0));
      if(target.hp<=0){
        if(target===G.boss) killBoss();
        else {
          if(Math.random()<(p.up.boneChance||0.05)) buryBone(target.x,target.y);
          killE(target);
        }
      }
    }
  });

  if(p.chargeT<=0){
    p.charging=false;
    p.chargeDmgBonus=0;
    // Frenesí de "Sed de Sangre": al terminar la embestida, dispara una segunda automática (solo una vez por ciclo de ataque)
    if(p.bloodlustActive && !p.chargeExtraUsed){
      p.chargeExtraUsed=true;
      const chargeSpd=620*BLOODLUST_CHARGE_MULT, chargeT=0.32;
      const chargeDist=chargeSpd*chargeT;
      const target=findYokoChargeTarget(p,chargeDist);
      if(target) startYokoDash(p,target,true);
    }
  }
}

// Hueso enterrado al matar un enemigo durante la embestida
// Un hueso no recogido se mantiene BONE_SOLID_TIME segundos (×DOBLE HUESO) y luego se desvanece lentamente durante BONE_FADE_TIME
const BONE_SOLID_TIME=6, BONE_FADE_TIME=2.5;
function buryBone(x,y){
  const boneLt=BONE_SOLID_TIME*(G.p.up.boneDuration||1)+BONE_FADE_TIME;
  G.bones.push({x,y,life:boneLt,ml:boneLt,bob:rf(0,PI*2)});
}

function updateBones(dt){
  const p=G.p;
  for(let i=G.bones.length-1;i>=0;i--){
    const b=G.bones[i];
    b.life-=dt; b.bob+=dt*2;
    if(b.life<=0){ G.bones.splice(i,1); continue; }
    const d=hyp(b.x-p.x,b.y-p.y);
    if(d<pickupRadius(BONE_PICKUP_R,BONE_PICKUP_GROWTH)){
      // Desenterrar — efecto aleatorio
      const roll=Math.random();
      if(roll<0.34){
        const heal=p.mhp*0.12;
        p.hp=Math.min(p.mhp,p.hp+heal);
        spawnDmgNum(p.x,p.y-30,'+'+Math.round(heal),false,true);
      } else if(roll<0.67){
        p.chargeDmgBonus=1; // próxima embestida con bonus de daño
        spawnDmgNum(p.x,p.y-30,'¡FUERZA!',false,true);
      } else {
        G.furyTimer=(G.furyTimer||0)+3.0;
        spawnDmgNum(p.x,p.y-30,'¡VELOZ!',false,true);
      }
      spParts(p.x,p.y,'#ffcc66',16);
      sndOrb();
      G.bones.splice(i,1);
    }
  }
}

