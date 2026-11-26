// Blood Crypt — pool de mejoras (buildPool) y comportamiento por héroe (HEROES). El orden de carga está en index.html (ver CLAUDE.md).
// ─── UPGRADES ─────────────────────────────────────────────────────────────────
function buildPool(){
  const p=G.p;
  const pool=[
    {title:'ATAQUE+',        desc:'+10 daño de ataque',         t:'',      apply(){p.up.atk+=10}},
    {title:'VIDA+',        desc:'+40 HP máx + curación',      t:'',      apply(){p.mhp+=40;p.hp=Math.min(p.mhp,p.hp+40)}},
    {title:'VEL. MOVIMIENTO',desc:'+25 vel. de movimiento',     t:'',      apply(){p.up.spd+=25}},
    {title:'ALCANCE+',       desc:'+25% alcance/radio ataque (Nv.'+((p.up.rngLevel||0)+1)+'/'+RANGE_MAX+')', t:'', apply(){ if((p.up.rngLevel||0)>=RANGE_MAX) return; p.up.rngLevel=(p.up.rngLevel||0)+1; p.up.rng*=1.25; }, hide(){ return (p.up.rngLevel||0)>=RANGE_MAX; }},
    {title:'VEL. ATAQUE',    desc:'+20% velocidad de ataque',   t:'',      apply(){p.up.rate+=ATK_SPEED_PER_PICK}},
    {title:'REGEN',          desc:'+2 HP/seg regeneración',     t:'',      apply(){p.up.regen+=2}},
    {title:'VAMPIRO',        desc:'+1.5 HP por enemigo',        t:'',      apply(){p.up.lifesteal=(p.up.lifesteal||0)+1.5}},
    {title:'ARMADURA',       desc:'-20% daño recibido (máx. 75%)', t:'',    apply(){p.up.armor=Math.min(ARMOR_MAX,(p.up.armor||0)+.2)}, hide(){return (p.up.armor||0)>=ARMOR_MAX}},
    {title:'GANANCIA XP',        desc:'+'+Math.round((XP_GAIN_PER_PICK-1)*100)+'% XP de enemigos', t:'xp-t',  apply(){p.up.xpm*=XP_GAIN_PER_PICK}},
    (()=>{
      const cur=p.up.pickupLevel||0;
      return {
        title:'RECOLECCIÓN'+(cur>0?` Nv.${cur+1}`:''),
        desc:'Recogida de orbes '+pickupRadius(ORB_PICKUP_R,ORB_PICKUP_GROWTH,cur)+' → '+pickupRadius(ORB_PICKUP_R,ORB_PICKUP_GROWTH,cur+1)+' px'+(p.yoko?' y huesos':''),
        t:'xp-t',
        apply(){ p.up.pickupLevel=Math.min(PICKUP_MAX,(p.up.pickupLevel||0)+1); },
        hide(){ return (p.up.pickupLevel||0)>=PICKUP_MAX; }
      };
    })(),
    {title:'CRÍTICO+',       desc:'+8% prob. golpe crítico',    t:'crit-t',apply(){p.up.critChance=Math.min(1.0,p.up.critChance+.08)},hide(){return p.up.critChance>=1.0}},
    {title:'GOLPE×',         desc:'+0.5× daño crítico',         t:'crit-t',apply(){p.up.critMult+=.5}},
    (()=>{
      const cur=p.up.lightningLevel||0;
      return {
        title:'RAYO'+(cur>0?` Nv.${cur+1}`:''),
        desc:cur===0?'Cae un rayo sobre un enemigo al azar cada pocos segundos':'+25% daño del rayo · +1 rayo sobre otro enemigo al azar',
        t:'magic-t',
        apply(){ p.up.lightningLevel=Math.min(LIGHTNING_MAX,(p.up.lightningLevel||0)+1); },
        hide(){ return (p.up.lightningLevel||0)>=LIGHTNING_MAX; }
      };
    })(),
    // Exclusivos del héroe
    ...HEROES[p.id].upgrades(p),
  ];
  return pool;
}

// ─── HÉROES: comportamiento por héroe ───────────────────────────────────────
// Clave = CHARS[i].id (la misma que en SPRITES y SPRITE_CFG). Un héroe nuevo necesita su entrada en CHARS y acá.
//   attack()      ataque básico, cada vez que se cumple su recarga (p.rate)
//   update(dt)    lógica propia por frame (opcional)
//   draw(x,y,p)   dibuja al héroe (en el juego y en el preview del menú)
//   upgrades(p)   mejoras exclusivas del héroe; buildPool() las suma a las comunes
const HEROES={
  knight:{
    attack(){ doMelee(); },
    draw(x,y,p){ drawKnight(x,y,p); },
    upgrades(p){ return [
      {title:'FURIA',      desc:'Cada kill +0.8s de velocidad', t:'', apply(){p.up.furyStacks=(p.up.furyStacks||0)+1}},
    ]; },
  },
  mage:{
    attack(){ doShoot(); },
    draw(x,y,p){ drawMage(x,y,p); },
    upgrades(p){ return [
      (()=>{
        const cur=p.up.multishot||1;
        return {
          title:'MULTIDISPARO',
          desc:'Dispara a '+cur+' → '+Math.min(MULTISHOT_MAX,cur+1)+' enemigos a la vez',
          t:'',
          apply(){ p.up.multishot=Math.min(MULTISHOT_MAX,(p.up.multishot||1)+1); },
          hide(){ return true; }   // RETIRADA DEL POOL por ahora (el ataque básico del Mago ahora se divide); se reactiva quitando esta línea y restaurando: (p.up.multishot||1)>=MULTISHOT_MAX
        };
      })(),
    ]; },
  },
  necro:{
    attack(){ doNecroAttack(); },
    update(dt){ updateSkeletons(dt); updateThralls(dt); },
    draw(x,y,p){ drawNecro(x,y,p); },
    upgrades(p){ return [
      {title:'MÁS MUERTOS',desc:'+1 esqueleto máximo activo',   t:'', apply(){p.up.maxSkeletons=(p.up.maxSkeletons||2)+1}},
      {title:'ESQUELETO+', desc:'+30% daño · +5% vel. mov. · +10% vel. ataque', t:'', apply(){p.up.skelDmgMult=(p.up.skelDmgMult||1)*1.3; p.up.skelSpdMult=(p.up.skelSpdMult||1)*1.05; p.up.skelAtkSpdMult=(p.up.skelAtkSpdMult||1)*1.1}},
      {title:'RITUAL',     desc:'Invocación un 25% más rápida', t:'', apply(){p.up.summonRate=(p.up.summonRate||1)*0.75}, hide(){return Math.round((1-(p.up.summonRate||1))*100)>=100;}},
      {title:'RESURRECCIÓN', desc:'25% de revivir al morir (1 vez)', t:'', apply(){p.up.resurrectChance=Math.min(1,(p.up.resurrectChance||0)+.25)}, hide(){return (p.up.resurrectChance||0)>=1}},
      (()=>{
        const curLvl=p.up.spectralLevel||1;
        const descByLvl={
          1:'Mano espectral: cono de daño hacia el enemigo más cercano',
          2:'+1 mano espectral en dirección opuesta (2 manos)',
          3:'+2 manos cardinales perpendiculares (4 manos)',
          4:'+4 manos diagonales (8 manos en total)',
          5:'Mano espectral se vuelve onda circular total',
        };
        return {
          title:'MANO ESPECTRAL'+(curLvl>1?` Nv.${curLvl+1}`:''),
          desc:descByLvl[Math.min(5,curLvl+1)],
          t:'',
          apply(){ p.up.spectralLevel=Math.min(5,(p.up.spectralLevel||1)+1); },
          hide(){ return (p.up.spectralLevel||1)>=5; }
        };
      })(),
    ]; },
  },
  yoko:{
    attack(){ doYokoCharge(); },
    update(dt){ updateBloodlust(dt); updateYokoCharge(dt); updateBones(dt); },
    draw(x,y,p){ drawYoko(x,y,p); },
    upgrades(p){ return [
      {title:'EMBESTIDA+',   desc:'+35% daño de embestida',       t:'', apply(){p.up.chargeDmgMult=(p.up.chargeDmgMult||1)*1.35}},
      {title:'HUESO EXTRA',  desc:'+20% prob. de enterrar hueso', t:'', apply(){p.up.boneChance=Math.min(1,(p.up.boneChance||0.05)+.20)}, hide(){return (p.up.boneChance||0.05)>=1}},
      {title:'FURIA',        desc:'Cada kill +0.8s de velocidad', t:'', apply(){p.up.furyStacks=(p.up.furyStacks||0)+1}},
      {title:'DOBLE HUESO',  desc:'Los huesos duran el doble de tiempo', t:'', apply(){p.up.boneDuration=(p.up.boneDuration||1)*2}},
      {title:'VAMPIRO CARGA',desc:'+5 HP por enemigo golpeado en carga', t:'', apply(){p.up.chargeLifesteal=(p.up.chargeLifesteal||0)+5}},
    ]; },
  },
  archer:{
    attack(){ doArcherShoot(); },
    draw(x,y,p){ drawArcher(x,y,p); },
    upgrades(p){ return [
      (()=>{
        const cur=p.up.pierceLevel||0;
        return {
          title:'PENETRANTES'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Las flechas atraviesan 1 enemigo (−15% daño por enemigo)':'Las flechas atraviesan 1 enemigo más',
          t:'', apply(){ p.up.pierceLevel=Math.min(PIERCE_MAX,(p.up.pierceLevel||0)+1); },
          hide(){ return (p.up.pierceLevel||0)>=PIERCE_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.shurikenLevel||0;
        return {
          title:'SHURIKENS'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Un shuriken gira a tu alrededor dañando a quien toque':'+1 shuriken orbital · +20% de daño',
          t:'', apply(){ p.up.shurikenLevel=Math.min(SHURIKEN_MAX,(p.up.shurikenLevel||0)+1); },
          hide(){ return (p.up.shurikenLevel||0)>=SHURIKEN_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.rainLevel||0;
        return {
          title:'LLUVIA DE FLECHAS'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Cada pocos segundos cae una lluvia de flechas sobre el grupo de enemigos más denso':'+25% daño · +área · cae más seguido',
          t:'', apply(){ p.up.rainLevel=Math.min(RAIN_MAX,(p.up.rainLevel||0)+1); },
          hide(){ return (p.up.rainLevel||0)>=RAIN_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.trapLevel||0;
        return {
          title:'TRAMPAS'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Deja trampas a tu paso: dañan y ralentizan a quien las pise':'+1 trampa activa · +35% daño · se colocan más rápido',
          t:'', apply(){ p.up.trapLevel=Math.min(TRAP_MAX,(p.up.trapLevel||0)+1); },
          hide(){ return (p.up.trapLevel||0)>=TRAP_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.stealthLevel||0;
        return {
          title:'SIGILO'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Cada cierto tiempo te vuelves invisible: los enemigos te pierden y tu siguiente flecha pega mucho más fuerte':'+duración · +daño de emboscada · se activa más seguido',
          t:'', apply(){ p.up.stealthLevel=Math.min(STEALTH_MAX,(p.up.stealthLevel||0)+1); },
          hide(){ return (p.up.stealthLevel||0)>=STEALTH_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.preciseLevel||0;
        return {
          title:'TIRO CERTERO'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Cada 6 disparos sale una flecha cargada: triple daño y atraviesa a todos':'La flecha cargada sale antes y pega más fuerte',
          t:'', apply(){ p.up.preciseLevel=Math.min(PRECISE_MAX,(p.up.preciseLevel||0)+1); },
          hide(){ return (p.up.preciseLevel||0)>=PRECISE_MAX; }
        };
      })(),
      (()=>{
        const cur=p.up.poisonLevel||0;
        return {
          title:'FLECHA DE VENENO'+(cur>0?` Nv.${cur+1}`:''),
          desc:cur===0?'Tus flechas envenenan: daño continuo durante 4 segundos':'+daño de veneno por segundo',
          t:'', apply(){ p.up.poisonLevel=Math.min(POISON_MAX,(p.up.poisonLevel||0)+1); },
          hide(){ return (p.up.poisonLevel||0)>=POISON_MAX; }
        };
      })(),
    ]; },
  },
};

// Draws 3 random picks from pool, excluding already-shown titles this level
let _lastPicks=[];
function pickUpgrades(){
  const pool=[...buildPool()].filter(u=>!u.hide||!u.hide());
  // shuffle
  for(let i=pool.length-1;i>0;i--){const j=ri(0,i);[pool[i],pool[j]]=[pool[j],pool[i]];}
  // exclude last shown so reroll always gives different options
  const filtered=pool.filter(u=>!_lastPicks.includes(u.title));
  const source=filtered.length>=3?filtered:pool;
  const picks=source.slice(0,3);
  _lastPicks=picks.map(u=>u.title);
  return picks;
}

function renderUpgrades(picks){
  const row=document.getElementById('upgrow'); row.innerHTML='';
  picks.forEach(u=>{
    const b=document.createElement('button');
    b.className='ubtn '+u.t;
    b.innerHTML=`<span class="utitle">${u.title}</span><span class="udesc">${u.desc}</span>`;
    b.onclick=()=>{
      u.apply();
      document.getElementById('lvlup').style.display='none';
      G.lvlPending=false;
      _lastPicks=[];
      dbgSyncRerollBtn();
      updCritHUD(); updXpMult();
    };
    row.appendChild(b);
  });
}

function triggerLvlUp(){
  sndLevelUp();
  G.lvlUpFlash = 1.0; addShake(3);
  const p=G.p; p.lv++; p.xp-=p.xpN;
  // Curva de XP suavizada: crece rápido al inicio (~25%) y se aplana en late game (~8%)
  const growthRate = Math.max(0.08, 0.28 - (p.lv * 0.012));
  p.xpN = Math.floor(p.xpN * (1 + growthRate));
  G.lvlPending=true;
  G.rerollsLeft=1; // 1 free reroll per level-up
  _lastPicks=[];
  document.getElementById('lvlup').style.display='flex';
  renderUpgrades(pickUpgrades());
  updRerollBtn();
  dbgSyncRerollBtn();
  dbgAutoPick(); // DEBUG: borrar junto con el panel de debug
}

function doReroll(){
  if(G.rerollsLeft<=0) return;
  G.rerollsLeft--;
  // brief flash animation on the cards
  const row=document.getElementById('upgrow');
  row.style.opacity='0'; row.style.transition='opacity .15s';
  setTimeout(()=>{
    renderUpgrades(pickUpgrades());
    row.style.opacity='1';
  },150);
  updRerollBtn();
}

function updRerollBtn(){
  const btn=document.getElementById('reroll-btn');
  const ctr=document.getElementById('reroll-counter');
  if(G.rerollsLeft>0){
    btn.disabled=false;
    ctr.textContent=G.rerollsLeft+(G.rerollsLeft===1?' REPETICIÓN DISPONIBLE':' REPETICIONES DISPONIBLES');
    ctr.style.color='#665577';
  }else{
    btn.disabled=true;
    ctr.textContent='SIN REPETICIONES';
    ctr.style.color='#332233';
  }
}

function updCritHUD(){
  const p=G.p;
  if(p.up.critChance>.05||p.up.critMult>2){
    document.getElementById('crit-row').style.display='block';
    document.getElementById('crit-pct').textContent=Math.round(p.up.critChance*100);
    document.getElementById('crit-dmg').textContent=p.up.critMult.toFixed(1);
  }
}
function updXpMult(){
  const p=G.p;
  if(p.up.xpm>1){
    const el=document.getElementById('xp-mult');
    el.style.display='block';
    el.textContent='BONUS XP ×'+p.up.xpm.toFixed(1);
  }
}


