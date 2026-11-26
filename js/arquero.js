// Blood Crypt — arquero: flechas, shurikens, lluvia, trampas, sigilo, tiro certero y veneno. El orden de carga está en index.html (ver CLAUDE.md).
// ─── ARQUERO ──────────────────────────────────────────────────────────────────
const ARROW_SPEED=520, ARROW_PIERCE_DECAY=.85;   // las flechas son rápidas; cada enemigo atravesado resta 15% de daño
const PIERCE_MAX=4;
const SHURIKEN_MAX=5, SHURIKEN_RADIUS=58, SHURIKEN_SPIN=3.4, SHURIKEN_HIT_R=8, SHURIKEN_HIT_CD=.45;
function doArcherShoot(){
  const p=G.p, range=p.range*p.up.rng;
  const alive=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) alive.push(G.boss);
  if(!alive.length) return;
  alive.sort(_byDist2(p.x,p.y));
  const target=alive.find(e=>hyp(e.x-p.x,e.y-p.y)<=range+e.sz);
  if(!target) return;
  let{dmg,isCrit}=calcDmg(p.atk+p.up.atk);
  // TIRO CERTERO: cada N disparos sale una flecha cargada (más daño, atraviesa todo)
  let charged=false;
  const pl=p.up.preciseLevel||0;
  if(pl>0){
    p.shotCount=(p.shotCount||0)+1;
    if(p.shotCount>=PRECISE_BASE_SHOTS-pl){ p.shotCount=0; charged=true; dmg*=3+.5*(pl-1); }
  }
  // SIGILO: la primera flecha tras volverse invisible (o hasta 1.5 s después) hace daño extra
  let ambush=false;
  if(p.ambush){ ambush=true; p.ambush=false; dmg*=2+.5*(p.up.stealthLevel||1); }
  p.facingLeft=target.x<p.x; // mira hacia donde dispara
  const dir=p.facingLeft?-1:1;
  // Con sprite, la flecha sale desde el arco (adelante y a altura del pecho); sin sprite, desde el héroe
  const hasSpr=!!SPRITES.archer;
  const ox=hasSpr?dir*12:0, oy=hasSpr?-16:-8;
  const len=hyp(target.x-(p.x+ox),target.y-(p.y+oy))||1;
  const proj={x:p.x+ox,y:p.y+oy,
    vx:(target.x-(p.x+ox))/len*ARROW_SPEED, vy:(target.y-(p.y+oy))/len*ARROW_SPEED,
    dmg,isCrit,range,tr:0,col:'#d9c27a',sz:charged?8:(isCrit?6:4),alive:true,trail:[],
    arrow:true, pierceLeft:charged?999:(p.up.pierceLevel||0), pierceDecay:charged?1:ARROW_PIERCE_DECAY, hit:new Set(),
    charged, ambush};
  if(hasSpr){
    // La flecha sale cuando el sprite SUELTA la cuerda (último frame de la animación de ataque)
    const[,count,fps]=SPRITE_CFG.archer.anims.attack;
    G.arrowQueue.push({t:(count-1)/fps,proj,ox,oy});
  } else { sndArrow(); if(charged) sndCharged(); G.projs.push(proj); }
  triggerSprAttack(p);
}
// Cola de flechas pendientes: sale cada flecha cuando termina su tiempo de preparación
function updateArrowQueue(dt){
  if(!G.arrowQueue.length) return;
  const p=G.p;
  for(let i=G.arrowQueue.length-1;i>=0;i--){
    const q=G.arrowQueue[i]; q.t-=dt;
    if(q.t>0) continue;
    q.proj.x=p.x+q.ox; q.proj.y=p.y+q.oy; // sale desde donde está el arco ahora
    G.projs.push(q.proj); sndArrow(); if(q.proj.charged) sndCharged();
    G.arrowQueue.splice(i,1);
  }
}
// Distancia de un punto (px,py) al segmento (ax,ay)-(bx,by): colisión "barrida" para flechas rápidas (sin efecto túnel)
function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t=l2?((px-ax)*dx+(py-ay)*dy)/l2:0; t=Math.max(0,Math.min(1,t));
  return hyp(px-(ax+t*dx), py-(ay+t*dy));
}
let lastArrowSndT=0, lastShurSndT=0;
function sndArrow(){
  const now=performance.now(); if(now-lastArrowSndT<40) return; lastArrowSndT=now;
  playNoise({filterFreq:2600,filterType:'bandpass',Q:.8,vol:.12,dur:.09,decay:.08});
  playTone({type:'triangle',freq:760,freq2:300,dur:.07,vol:.10,attack:.002});
}
function sndShuriken(){
  const now=performance.now(); if(now-lastShurSndT<80) return; lastShurSndT=now;
  playTone({type:'triangle',freq:1900,freq2:1200,dur:.06,vol:.10,attack:.001});
}
// Shurikens orbitales: giran alrededor del héroe y dañan al contacto (cada enemigo, como máximo cada SHURIKEN_HIT_CD s)
function updateShurikens(dt){
  const p=G.p, lvl=p.up.shurikenLevel||0;
  if(lvl<=0){ G.shurPts=[]; return; }
  G.shurAng=(G.shurAng||0)+dt*SHURIKEN_SPIN;
  const targets=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) targets.push(G.boss);
  targets.forEach(t=>{ if(t._shurT>0) t._shurT-=dt; });
  const base=(p.atk+p.up.atk)*.7*(1+.2*(lvl-1));
  G.shurPts=[];
  for(let k=0;k<lvl;k++){
    const ang=G.shurAng+k*PI*2/lvl;
    const x=p.x+Math.cos(ang)*SHURIKEN_RADIUS, y=p.y+Math.sin(ang)*SHURIKEN_RADIUS;
    G.shurPts.push({x,y});
    for(const t of targets){
      if(!t.alive||t._shurT>0) continue;
      if(hyp(x-t.x,y-t.y)>=t.sz+SHURIKEN_HIT_R) continue;
      const{dmg,isCrit}=calcDmg(base);
      t.hp-=dmg; t.fl=.12; t._shurT=SHURIKEN_HIT_CD;
      if(isCrit){G.totalCrits++;spawnDmgNum(t.x,t.y-t.sz*2,dmg,true);}
      spParts(t.x,t.y,'#cfd8e3',isCrit?8:4);
      spawnBlood(t.x,t.y,isCrit?8:4,'#aa1111');
      sndShuriken();
      if(t.hp<=0){ if(t===G.boss) killBoss(); else killE(t); }
    }
  }
}
// ─── ARQUERO · etapa 2: LLUVIA DE FLECHAS y TRAMPAS ──────────────────────────
const RAIN_MAX=4, RAIN_DUR=2.2, RAIN_TICK=.07, RAIN_FALL=.2, RAIN_HIT_R=16, RAIN_RANGE=380;
const TRAP_MAX=3, TRAP_LIFE=25, TRAP_ARM=.6, TRAP_TRIG_R=20, TRAP_SLOW_TIME=2.5, TRAP_SLOW_MULT=.4;
function liveTargets(){
  const a=G.enemies.filter(e=>e.alive);
  if(G.bossAlive && G.boss && G.boss.alive) a.push(G.boss);
  return a;
}
// Golpe del Arquero (lluvia / trampa): daño con posible crítico, partículas y muerte
function archerHit(t,base,col){
  const{dmg,isCrit}=calcDmg(base);
  t.hp-=dmg; t.fl=.12;
  if(isCrit){G.totalCrits++;spawnDmgNum(t.x,t.y-t.sz*2,dmg,true);}
  spParts(t.x,t.y,col,isCrit?8:4);
  spawnBlood(t.x,t.y,isCrit?8:4,'#aa1111');
  if(t.hp<=0){ if(t===G.boss) killBoss(); else killE(t); }
}
let lastRainSndT=0, lastTrapSndT=0;
function sndRainHit(){
  const now=performance.now(); if(now-lastRainSndT<70) return; lastRainSndT=now;
  playNoise({filterFreq:3500,filterType:'highpass',Q:.5,vol:.05,dur:.05,decay:.04});
}
function sndTrapSnap(){
  const now=performance.now(); if(now-lastTrapSndT<80) return; lastTrapSndT=now;
  playNoise({filterFreq:900,filterType:'lowpass',Q:.7,vol:.22,dur:.18,decay:.15});
  playTone({type:'square',freq:260,freq2:70,dur:.16,vol:.12,attack:.001});
}
function updateRain(dt){
  const p=G.p, lvl=p.up.rainLevel||0;
  if(lvl>0){
    G.rainT-=dt;
    if(G.rainT<=0){
      // centro: el enemigo con más vecinos cerca (grupo más denso) dentro del alcance de la lluvia
      const pool=liveTargets().filter(t=>hyp(t.x-p.x,t.y-p.y)<=RAIN_RANGE);
      if(pool.length){
        let best=null,bestN=-1,bestD=1e9;
        for(const t of pool){
          let n=0; for(const u of pool) if(hyp(u.x-t.x,u.y-t.y)<80) n++;
          const dd=hyp(t.x-p.x,t.y-p.y);
          if(n>bestN||(n===bestN&&dd<bestD)){best=t;bestN=n;bestD=dd;}
        }
        G.rains.push({x:best.x,y:best.y,r:62+14*lvl,t:0,dur:RAIN_DUR,tick:0,lvl});
        G.rainT=Math.max(4,9-1.2*(lvl-1));
      } else G.rainT=.5;
    }
  }
  for(let i=G.rains.length-1;i>=0;i--){
    const r=G.rains[i]; r.t+=dt;
    if(r.t<r.dur){
      r.tick-=dt;
      while(r.tick<=0){
        r.tick+=RAIN_TICK;
        const ang=Math.random()*PI*2, rad=Math.sqrt(Math.random())*r.r;
        G.rainArrows.push({x:r.x+Math.cos(ang)*rad,y:r.y+Math.sin(ang)*rad,t:0,done:false,lvl:r.lvl});
      }
    } else if(r.t>=r.dur+RAIN_FALL) G.rains.splice(i,1);
  }
  for(let i=G.rainArrows.length-1;i>=0;i--){
    const a=G.rainArrows[i]; a.t+=dt;
    if(!a.done && a.t>=RAIN_FALL){
      a.done=true;
      const base=(p.atk+p.up.atk)*.5*(1+.25*(a.lvl-1));
      for(const t of liveTargets()){
        if(!t.alive) continue;
        if(hyp(a.x-t.x,a.y-t.y)<RAIN_HIT_R+t.sz) archerHit(t,base,'#d9c27a');
      }
      sndRainHit();
    }
    if(a.t>=RAIN_FALL+.5) G.rainArrows.splice(i,1);
  }
}
function updateTraps(dt){
  const p=G.p, lvl=p.up.trapLevel||0;
  if(lvl>0){
    G.trapT-=dt;
    if(G.trapT<=0){
      const lejos=!G.traps.some(tr=>hyp(tr.x-p.x,tr.y-p.y)<40);
      if(G.traps.length<1+lvl && lejos) G.traps.push({x:p.x,y:p.y,t:0,lvl});
      G.trapT=Math.max(2.5,6-.8*(lvl-1));
    }
  }
  for(let i=G.traps.length-1;i>=0;i--){
    const tr=G.traps[i]; tr.t+=dt;
    if(tr.t>=TRAP_LIFE){ G.traps.splice(i,1); continue; }
    if(tr.t<TRAP_ARM) continue;
    const targets=liveTargets();
    if(!targets.some(t=>t.alive && hyp(tr.x-t.x,tr.y-t.y)<t.sz+TRAP_TRIG_R)) continue;
    // ¡Se activa! daño y frenado en área
    const blast=52+6*tr.lvl, base=(p.atk+p.up.atk)*1.8*(1+.35*(tr.lvl-1));
    for(const t of targets){
      if(!t.alive) continue;
      if(hyp(tr.x-t.x,tr.y-t.y)<blast+t.sz){
        archerHit(t,base,'#ffb347');
        if(t!==G.boss && t.alive) t.slowT=TRAP_SLOW_TIME; // el jefe no se ralentiza
      }
    }
    G.trapFX.push({x:tr.x,y:tr.y,t:0,life:.35,r:blast});
    spParts(tr.x,tr.y,'#ffb347',10); addShake(2); sndTrapSnap();
    G.traps.splice(i,1);
  }
  for(let i=G.trapFX.length-1;i>=0;i--){ G.trapFX[i].t+=dt; if(G.trapFX[i].t>=G.trapFX[i].life) G.trapFX.splice(i,1); }
}
// Flecha vista de frente (para la lluvia): dibuja astil, punta y plumas apuntando en la dirección ang
function drawArrowGlyph(x,y,ang,len){
  ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
  ctx.strokeStyle='#b8925a'; ctx.lineWidth=2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-len,0); ctx.lineTo(len*.5,0); ctx.stroke();
  ctx.fillStyle='#dfe6ee'; ctx.beginPath(); ctx.moveTo(len*.5+6,0); ctx.lineTo(len*.5,-3); ctx.lineTo(len*.5,3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8bc34a'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-len,0); ctx.lineTo(-len-3,-3); ctx.moveTo(-len,0); ctx.lineTo(-len-3,3); ctx.moveTo(-len+3,0); ctx.lineTo(-len,-3); ctx.moveTo(-len+3,0); ctx.lineTo(-len,3); ctx.stroke();
  ctx.restore();
}
// Capa de suelo (bajo los enemigos): áreas de lluvia, flechas clavadas y trampas
function drawArcherGround(cx,cy){
  for(const r of G.rains){
    const k=Math.min(1,(r.dur+RAIN_FALL-r.t)/.4), pulse=.5+.5*Math.sin(r.t*8);
    ctx.save();
    ctx.globalAlpha=.5*k; ctx.fillStyle='rgba(90,160,60,.12)'; ctx.strokeStyle='rgba(150,220,100,'+(.35+.2*pulse)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(r.x+cx,r.y+cy,r.r,0,PI*2); ctx.fill(); ctx.setLineDash([6,5]); ctx.stroke();
    ctx.restore();
  }
  for(const a of G.rainArrows){
    if(!a.done) continue;
    const k=1-(a.t-RAIN_FALL)/.5;
    ctx.save(); ctx.globalAlpha=Math.max(0,k);
    drawArrowGlyph(a.x+cx,a.y+cy-9,PI/2+.12,7);
    ctx.restore();
  }
  for(const tr of G.traps){
    if(tr.t>TRAP_LIFE-4 && Math.floor(tr.t*6)%2===0) continue; // parpadea antes de desaparecer
    const x=tr.x+cx, y=tr.y+cy, armed=tr.t>=TRAP_ARM;
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='#262a30'; ctx.strokeStyle='#7d858f'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.ellipse(0,0,12,5.5,0,0,PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#aab1bb';
    for(let k=0;k<6;k++){
      const a=k*PI/3, bx=Math.cos(a)*8, by=Math.sin(a)*3.6;
      ctx.beginPath(); ctx.moveTo(bx-2,by); ctx.lineTo(bx,by-6); ctx.lineTo(bx+2,by); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle=armed?'rgba(255,60,40,'+(.6+.4*Math.sin(tr.t*7))+')':'#555';
    ctx.beginPath(); ctx.arc(0,0,1.8,0,PI*2); ctx.fill();
    ctx.restore();
  }
}
// Capa aérea (sobre los enemigos): flechas de la lluvia cayendo, explosiones de trampas y shurikens
function drawArcherAir(cx,cy){
  for(const a of G.rainArrows){
    if(a.done) continue;
    const k=a.t/RAIN_FALL;
    drawArrowGlyph(a.x+cx,a.y+cy-(1-k)*170-9,PI/2,8);
  }
  for(const f of G.trapFX){
    const k=f.t/f.life;
    ctx.save();
    ctx.globalAlpha=(1-k)*.7; ctx.strokeStyle='#ffb347'; ctx.lineWidth=3; ctx.fillStyle='rgba(255,170,60,.18)';
    ctx.beginPath(); ctx.arc(f.x+cx,f.y+cy,f.r*(.25+.75*k),0,PI*2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if(G.shurPts.length){
    for(const sp of G.shurPts){
      ctx.save(); ctx.translate(sp.x+cx,sp.y+cy); ctx.rotate((G.shurAng||0)*7);
      ctx.shadowColor='#9fb4d0'; ctx.shadowBlur=9;
      ctx.fillStyle='#d5dbe6'; ctx.strokeStyle='#3b4558'; ctx.lineWidth=1;
      ctx.beginPath();
      for(let i=0;i<8;i++){ const r=i%2===0?10:3.6, a=i*PI/4; ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#3b4558'; ctx.beginPath(); ctx.arc(0,0,2,0,PI*2); ctx.fill();
      ctx.restore();
    }
  }
}
// ─── ARQUERO · etapa 3: SIGILO, TIRO CERTERO y FLECHA DE VENENO ─────────────────
const STEALTH_MAX=3, PRECISE_MAX=3, POISON_MAX=3;
const PRECISE_BASE_SHOTS=7;      // TIRO CERTERO: cada (7 − nivel) disparos → 6, 5, 4
const POISON_TIME=4, POISON_TICK=.5;
let lastStealthSndT=0;
function sndCharged(){ playTone({type:'sawtooth',freq:320,freq2:110,dur:.14,vol:.12,attack:.002}); }
function sndStealth(){
  const now=performance.now(); if(now-lastStealthSndT<300) return; lastStealthSndT=now;
  playTone({type:'sine',freq:600,freq2:180,dur:.35,vol:.12,attack:.01});
  playNoise({filterFreq:700,filterType:'lowpass',Q:.6,vol:.10,dur:.3,decay:.25});
}
// SIGILO: cada cierto tiempo el héroe se vuelve invisible; los enemigos comunes lo pierden (los jefes no se dejan engañar)
function updateStealth(dt){
  const p=G.p, lvl=p.up.stealthLevel||0;
  if(p.ambushT>0){ p.ambushT-=dt; if(p.ambushT<=0) p.ambush=false; }   // la emboscada dura 1.5 s tras reaparecer
  if(lvl<=0) return;
  if(p.invisT>0){
    p.invisT-=dt;
    if(p.invisT<=0){ p.invisT=0; p.ambushT=1.5; spParts(p.x,p.y-10,'#aee9a0',8); }
    return;
  }
  G.stealthT-=dt;
  if(G.stealthT<=0){
    if(!G.enemies.some(e=>e.alive && hyp(e.x-p.x,e.y-p.y)<450)){ G.stealthT=.5; return; } // sin enemigos cerca, no se gasta
    p.invisT=2+.7*(lvl-1);
    p.ambush=true; p.ambushT=0;
    G.invisPos={x:p.x,y:p.y};
    G.stealthT=Math.max(7,16-2.5*(lvl-1));
    spParts(p.x,p.y-10,'#aee9a0',14); sndStealth();
  }
}
// FLECHA DE VENENO: las flechas dejan veneno (daño continuo); no se acumula, renueva duración y conserva el mayor daño
function applyPoison(t){
  const lvl=G.p.up.poisonLevel||0; if(lvl<=0||!t||!t.alive) return;
  const dps=(G.p.atk+G.p.up.atk)*(.25+.08*lvl);
  t.poisonT=POISON_TIME; t.poisonDps=Math.max(t.poisonDps||0,dps);
}
function updatePoison(dt){
  for(const t of liveTargets()){
    if(!(t.poisonT>0)) continue;
    t.poisonT-=dt; t._ptick=(t._ptick||0)-dt;
    if(t._ptick<=0){
      t._ptick+=POISON_TICK;
      t.hp-=t.poisonDps*POISON_TICK;
      spParts(t.x,t.y-4,'#7bff4a',2);
      if(t.hp<=0){ if(t===G.boss) killBoss(); else killE(t); }
    }
  }
}
function killBoss(){
  const boss=G.boss, p=G.p;
  if(!boss||!boss.alive) return;

  // ESCLAVITUD: chance de esclavizar al Rey Liche en vez de matarlo
  if(p.necro && Math.random()<0.05){
    boss.alive=false; G.bossAlive=false;
    document.getElementById('boss-bar').style.display='none';
    enslaveBoss(boss);
    G.boss=null;
    return;
  }

  boss.alive=false; boss.deathT=SPRITES.boss?1.4:0.8; boss.fl=1;
  G.bossAlive=false;
  sndBossDeath(); addShake(22);
  startMusic('dungeon');
  // Orbs masivos de XP
  for(let i=0;i<18;i++){
    const ang=rf(0,PI*2), d=rf(10,90);
    G.orbs.push({x:boss.x+Math.cos(ang)*d,y:boss.y+Math.sin(ang)*d,val:Math.round(boss.xp/18),pulse:rf(0,PI*2)});
  }
  for(let i=0;i<GOLD_BOSS_COINS;i++){ const ang=rf(0,PI*2), d=rf(10,100); G.orbs.push({x:boss.x+Math.cos(ang)*d,y:boss.y+Math.sin(ang)*d,val:GOLD_BOSS_VAL,gold:true,pulse:rf(0,PI*2)}); }
  // Explosión de sangre/partículas
  spawnBlood(boss.x,boss.y,60,'#9955ee');
  spParts(boss.x,boss.y,'#c8b8ff',40);
  // Ocultar boss bar con delay
  setTimeout(()=>{ document.getElementById('boss-bar').style.display='none'; },1800);
  G.kills++;
}

function killE(e){
  if(!e.alive) return; e.alive=false;
  const p=G.p;

  // ESCLAVITUD: el Necromancer tiene una pequeña chance de revivir al enemigo como esclavo
  if(p.necro && Math.random()<0.05){
    enslaveEnemy(e);
    return; // no drop normal de muerte — el esclavo "vive" en su lugar
  }

  sndKill();
  spawnBlood(e.x,e.y,20,e.col);
  spParts(e.x,e.y,e.col,16);
  G.orbs.push({x:e.x,y:e.y,val:e.xp,pulse:rf(0,PI*2)});
  if(Math.random()<GOLD_DROP_CHANCE) G.orbs.push({x:e.x+rf(-8,8),y:e.y+rf(-8,8),val:Math.max(1,Math.round(e.xp/4)),gold:true,pulse:rf(0,PI*2)});
  G.kills++;
  if(p.up.lifesteal) p.hp=Math.min(p.mhp,p.hp+p.up.lifesteal);
  // FURIA: cada kill acumula un pequeño boost de velocidad temporal
  if(p.up.furyStacks) G.furyTimer=(G.furyTimer||0)+0.8*p.up.furyStacks;
}

