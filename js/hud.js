// Blood Crypt — HUD y barra de habilidades. El orden de carga está en index.html (ver CLAUDE.md).
// ─── HUD UPDATE ───────────────────────────────────────────────────────────────
// ─── BARRA DE HABILIDADES CON RECARGA ───────────────────────────────────────────
// Un cuadrito por habilidad con temporizador: gris al usarse y se llena de color de abajo hacia arriba hasta estar lista.
const SKILLBAR_DEFS=[
  {id:'summon', ico:'💀', rgb:'110,255,170', nm:'INVOCACIÓN DE ESQUELETOS'},
  {id:'rayo',   ico:'⚡', rgb:'255,225,77',  nm:'RAYO'},
  {id:'lluvia', ico:'🌧', rgb:'111,179,255', nm:'LLUVIA DE FLECHAS'},
  {id:'trampa', ico:'🪤', rgb:'230,160,80',  nm:'TRAMPAS'},
  {id:'sigilo', ico:'👁', rgb:'127,224,160', nm:'SIGILO'},
  {id:'certero',ico:'🎯', rgb:'255,122,92',  nm:'TIRO CERTERO'},
];
const _sk={sig:'',slots:{}};
// Estado de recarga de cada habilidad. idleRetry = valor al que el juego reinicia el temporizador cuando no hay objetivos (queda "lista, esperando enemigos")
function skCooldown(T,iv,idleRetry){
  if(typeof T!=='number') return {frac:0,txt:'',ready:false};
  if(T<=idleRetry) return {frac:1,txt:'',ready:true};
  return {frac:Math.max(0,Math.min(1,1-T/iv)),txt:T.toFixed(1),ready:false};
}
function skillState(id,p){
  const up=p.up;
  switch(id){
    case 'summon':{
      if(!p.necro) return null;
      const max=up.maxSkeletons||2, n=G.skeletons.length, iv=(up.summonRate||1)*8, T=G.summonTimer||0;
      if(n>=max) return {lvl:0,frac:1,txt:'',ready:false,idle:true,tag:n+'/'+max};
      return {lvl:0,frac:Math.min(1,T/iv),txt:Math.max(0,iv-T).toFixed(1),ready:false,tag:n+'/'+max};
    }
    case 'rayo':{ const l=up.lightningLevel||0; if(l<=0) return null;
      return Object.assign({lvl:l},skCooldown(G.lightningT,LIGHTNING_INTERVAL,0.4)); }
    case 'lluvia':{ const l=up.rainLevel||0; if(l<=0) return null;
      return Object.assign({lvl:l},skCooldown(G.rainT,Math.max(4,9-1.2*(l-1)),0.5)); }
    case 'trampa':{ const l=up.trapLevel||0; if(l<=0) return null;
      return Object.assign({lvl:l,tag:G.traps.length+'/'+(1+l)},skCooldown(G.trapT,Math.max(2.5,6-.8*(l-1)),0)); }
    case 'sigilo':{ const l=up.stealthLevel||0; if(l<=0) return null;
      if(p.invisT>0) return {lvl:l,frac:1,txt:p.invisT.toFixed(1),ready:false,active:true};
      return Object.assign({lvl:l},skCooldown(G.stealthT,Math.max(7,16-2.5*(l-1)),0.5)); }
    case 'certero':{ const l=up.preciseLevel||0; if(l<=0) return null;
      const need=PRECISE_BASE_SHOTS-l, c=p.shotCount||0;
      return {lvl:l,frac:Math.min(1,c/need),txt:c+'/'+need,ready:c>=need-1}; }
  }
  return null;
}
function updSkillBar(){
  const bar=document.getElementById('skillbar'); if(!bar||!G.p) return;
  const p=G.p, st={}; let sig='';
  for(const d of SKILLBAR_DEFS){ const s=skillState(d.id,p); if(s){ st[d.id]=s; sig+=d.id+':'+s.lvl+';'; } }
  if(sig!==_sk.sig){                       // cambió el conjunto de habilidades o algún nivel: se reconstruye
    _sk.sig=sig; _sk.slots={};
    bar.innerHTML=SKILLBAR_DEFS.filter(d=>st[d.id]).map(d=>
      `<div class="sk-slot" data-id="${d.id}" title="${d.nm}" style="--rgb:${d.rgb}">`+
      `<div class="sk-ico sk-grey">${d.ico}</div><div class="sk-ico sk-col">${d.ico}</div>`+
      `<div class="sk-t"></div><div class="sk-lvl"></div></div>`).join('');
    bar.querySelectorAll('.sk-slot').forEach(el=>{
      _sk.slots[el.dataset.id]={el,col:el.querySelector('.sk-col'),t:el.querySelector('.sk-t'),lv:el.querySelector('.sk-lvl'),f:-1,txt:null,lbl:null,ready:false,active:false};
    });
  }
  for(const id in st){
    const s=st[id], sl=_sk.slots[id]; if(!sl) continue;
    const f=Math.round(s.frac*200)/200;     // pasos de 0.5% para no tocar el DOM en cada frame
    if(f!==sl.f){ sl.f=f; sl.col.style.clipPath='inset('+((1-f)*100).toFixed(1)+'% 0 0 0)'; sl.el.dataset.f=f.toFixed(3); }
    if(s.txt!==sl.txt){ sl.txt=s.txt; sl.t.textContent=s.txt; }
    const lbl=s.tag||(s.lvl>0?'Nv.'+s.lvl:'');
    if(lbl!==sl.lbl){ sl.lbl=lbl; sl.lv.textContent=lbl; }
    const rdy=!!s.ready, act=!!s.active;
    if(rdy!==sl.ready){ sl.ready=rdy; sl.el.classList.toggle('ready',rdy);
      if(rdy){ sl.el.classList.add('flash'); setTimeout(()=>sl.el.classList.remove('flash'),480); } }
    if(act!==sl.active){ sl.active=act; sl.el.classList.toggle('active',act); }
  }
}
// Escrituras al DOM solo si el valor cambió (textContent reemplaza los nodos aunque el valor sea igual)
const _hudEls={};
function _hudEl(id){ return _hudEls[id]||(_hudEls[id]=document.getElementById(id)); }
function _hudTxt(id,v){ const e=_hudEl(id); v=''+v; if(e._t!==v){ e._t=v; e.textContent=v; } }
function _hudSty(id,prop,v){ const e=_hudEl(id), k='_s_'+prop; if(e[k]!==v){ e[k]=v; e.style[prop]=v; } }
const _pw=v=>v.toFixed(2)+'%';
function updHUD(){
  if(!G.p)return; const p=G.p;
  updSkillBar();
  _hudSty('hpbar','width',_pw(Math.max(0,p.hp/p.mhp*100)));
  _hudTxt('hptxt',Math.ceil(p.hp)+'/'+p.mhp);
  _hudSty('xpbar','width',_pw(p.xp/p.xpN*100));
  _hudTxt('xptxt',p.xp+'/'+p.xpN);
  _hudTxt('hlv',p.lv);
  _hudTxt('skills',G.kills);
  _hudTxt('sgold',G.gold|0);
  const m=Math.floor(G.time/60),s=Math.floor(G.time%60);
  _hudTxt('stime',m+':'+String(s).padStart(2,'0'));
  _hudTxt('swave',G.wave);
  // Lilith, Hija del Odio — indicador de daño del próximo golpe
  if(G.lilithAlive && G.lilith){
    _hudSty('lilith-bar','display','block');
    _hudTxt('lilith-dmg-val',Math.ceil(G.lilith.atk));
  } else {
    _hudSty('lilith-bar','display','none');
  }
  if(p.yoko){
    _hudEl('bloodlust-row').style.display='block';
    if(p.bloodlustActive){
      _hudTxt('bloodlust-txt',Math.ceil(p.bloodlustT)+'s');
      _hudSty('bloodlust-bar-fill','width',_pw(p.bloodlustT/BLOODLUST_DURATION*100));
      _hudSty('bloodlust-bar-fill','background','linear-gradient(90deg,#8a0000,#ff2222)');
      _hudSty('bloodlust-row','color','#ff2222');
    } else {
      _hudTxt('bloodlust-txt',Math.ceil(p.bloodlustCD)+'s');
      _hudSty('bloodlust-bar-fill','width',_pw((BLOODLUST_COOLDOWN-p.bloodlustCD)/BLOODLUST_COOLDOWN*100));
      _hudSty('bloodlust-bar-fill','background','linear-gradient(90deg,#555,#888)');
      _hudSty('bloodlust-row','color','#994444');
    }
  }
  updateUpgradesPanel();
  updateBonePanel();
}

// Efectos temporales de los huesos de Yoko (panel derecho): VELOZ con tiempo restante y FUERZA pendiente
let _boneMaxFury=3;
function updateBonePanel(){
  const panel=document.getElementById('bone-panel');
  if(!panel) return;
  const p=G.p;
  if(!p||!p.yoko){ panel.style.display='none'; return; }
  const rows=[];
  const fury=G.furyTimer||0;
  if(fury>0){
    _boneMaxFury=Math.max(_boneMaxFury,fury); // la barra se escala al máximo visto (los efectos se acumulan)
    rows.push(`<div class="bone-row bone-veloz">💨 VELOZ<span class="bone-val">${fury.toFixed(1)}s</span><div class="bone-bar"><div style="width:${Math.min(100,fury/_boneMaxFury*100)}%"></div></div></div>`);
  } else _boneMaxFury=3;
  if(p.chargeDmgBonus>0){
    rows.push(`<div class="bone-row bone-fuerza">💪 FUERZA<span class="bone-val">próx. embestida +60%</span></div>`);
  }
  const html=rows.join('');
  if(html!==panel._lastHtml){ panel.innerHTML=html; panel._lastHtml=html; }
  panel.style.bottom=joystickActive?'200px':'14px'; // con joystick activo, se sube para no taparlo
  panel.style.display=rows.length?'flex':'none';
}

function updateUpgradesPanel(){
  const p=G.p, up=p.up, panel=document.getElementById('upgrades-panel');
  if(!panel) return;
  const rows=[];

  // Helpers
  const pct=v=>Math.round(v*100)+'%';
  const add=(icon,label,val,tier,maxed)=>rows.push({icon,label,val,tier:tier||'common',maxed:!!maxed});

  // ATK
  if(up.atk>0) add('⚔','ATQ','+'+up.atk,'rare');
  // Velocidad movimiento
  if(up.spd>0) add('💨','VEL','+'+up.spd,'common');
  // Rate de ataque
  if(up.rate>0) add('⚡','ATQ/S','+'+pct(up.rate),'common');
  // Alcance
  if(up.rng>1) add('🎯','ALC','Nv.'+(up.rngLevel||0)+' x'+up.rng.toFixed(1),'common',(up.rngLevel||0)>=RANGE_MAX);
  // Regen
  if(up.regen>0) add('💚','REGEN','+'+up.regen.toFixed(1)+'/s','rare');
  // Armadura
  if(up.armor>0) add('🛡','ARM',pct(up.armor),'rare');
  // Vampiro
  if(up.lifesteal>0) add('🩸','VAMPIRO','+'+up.lifesteal,'rare');
  // XP mult
  if(up.xpm>1) add('✨','XP','x'+up.xpm.toFixed(1),'gold');
  // Crit mult
  if(up.critMult>2) add('💥','CRIT×','x'+up.critMult.toFixed(1),'epic');
  // Furia
  if(up.furyStacks>0) add('🔥','FURIA','x'+up.furyStacks,'rare');
  // Multishot (Mage)
  if(up.multishot>1) add('➳','MULTI','x'+(up.multishot),'epic',up.multishot>=MULTISHOT_MAX);
  // Proj speed
  if((up.lightningLevel||0)>0) add('⚡','RAYO','Nv.'+up.lightningLevel,'epic',up.lightningLevel>=LIGHTNING_MAX);
  if((up.pickupLevel||0)>0) add('🧲','RECOLEC.','Nv.'+up.pickupLevel,'common',up.pickupLevel>=PICKUP_MAX);
  if((up.pierceLevel||0)>0) add('➳','PENETR.','Nv.'+up.pierceLevel,'common',up.pierceLevel>=PIERCE_MAX);
  if((up.shurikenLevel||0)>0) add('✴','SHURIKEN','Nv.'+up.shurikenLevel,'epic',up.shurikenLevel>=SHURIKEN_MAX);
  if((up.rainLevel||0)>0) add('🌧','LLUVIA','Nv.'+up.rainLevel,'epic',up.rainLevel>=RAIN_MAX);
  if((up.trapLevel||0)>0) add('🪤','TRAMPAS','Nv.'+up.trapLevel,'common',up.trapLevel>=TRAP_MAX);
  if((up.stealthLevel||0)>0) add('👁','SIGILO','Nv.'+up.stealthLevel+(p.invisT>0?' · '+p.invisT.toFixed(1)+'s':''),'epic',up.stealthLevel>=STEALTH_MAX);
  if((up.preciseLevel||0)>0) add('🎯','CERTERO','Nv.'+up.preciseLevel+' · '+(p.shotCount||0)+'/'+(PRECISE_BASE_SHOTS-up.preciseLevel),'epic',up.preciseLevel>=PRECISE_MAX);
  if((up.poisonLevel||0)>0) add('☠','VENENO','Nv.'+up.poisonLevel,'common',up.poisonLevel>=POISON_MAX);
  // Necro
  if(p.necro){
    if(up.maxSkeletons>2) add('💀','MUERTOS',up.maxSkeletons,'rare');
    if(up.skelDmgMult>1) add('💀','ESQ+',pct(up.skelDmgMult-1),'rare');
    if(up.skelSpdMult>1) add('💀','ESQ⚡',pct(up.skelSpdMult-1),'common');
    if(up.skelAtkSpdMult>1) add('💀','ESQ🗡',pct(up.skelAtkSpdMult-1),'common');
    if(up.summonRate<1) add('⏱','RITUAL',pct(1-up.summonRate)+' más rápido','common',Math.round((1-up.summonRate)*100)>=100);
    if(up.resurrectChance>0) add('✝','RESUC',pct(up.resurrectChance),'epic',up.resurrectChance>=1);
    if((up.spectralLevel||1)>1) add('👻','MANO','Nv.'+(up.spectralLevel||1),'epic',(up.spectralLevel||1)>=5);
  }
  // Yoko
  if(p.yoko){
    if(up.chargeDmgMult>1) add('🐾','EMBESTIDA','x'+up.chargeDmgMult.toFixed(2),'rare');
    if(up.boneChance>0.05) add('🦴','HUESO',pct(up.boneChance),'rare',up.boneChance>=1);
    if(up.boneDuration>1) add('🦴','HUESO×',up.boneDuration.toFixed(0)+'x dur.','common');
    if(up.chargeLifesteal>0) add('🩸','VAMPIRO+','+'+up.chargeLifesteal,'rare');
  }

  // El panel solo se reescribe si cambió el HTML (sin delay en el string, para no forzar innerHTML cada frame);
  // tras reescribirlo, el delay negativo ligado al reloj mantiene continua la fase del pulso
  const html=rows.map(r=>
    `<div class="stat-upg-row stat-${r.tier}${r.maxed?' maxed':''}"><span class="stat-upg-icon">${r.icon}</span><span>${r.label}</span><span class="stat-upg-val">${r.val}</span></div>`
  ).join('');
  if(html!==panel._lastHtml){
    panel.innerHTML=html; panel._lastHtml=html;
    const glowDelay='-'+(((performance.now()/1000)%1.6).toFixed(3))+'s';
    panel.querySelectorAll('.maxed').forEach(el=>el.style.setProperty('--gd',glowDelay));
  }
}
function endGame(){
  sndDeath(); stopMusic(2.0);
  G.run=false;
  const nr=saveRun('dead');
  const _p0=G.p;
  if(_p0&&_p0.melee&&KNIGHT_NAT&&knightSheetsReady()){ // muerte animada del Caballero SUAVE: la pantalla de fin aparece cuando termina
    _p0.sprAnim='death'; _p0.kDeathT0=performance.now(); _redraw=true;
    setTimeout(()=>{ if(!G.run&&G.p===_p0) document.getElementById('gover').style.display='flex'; },(knSecs('knS_death')+KN2_DEATH_EXTRA)*1000);
  } else document.getElementById('gover').style.display='flex';
  document.getElementById('hud').style.display='none';
  document.getElementById('pausebtn').style.display='none';
  showVolBtn(false);
  document.getElementById('boss-bar').style.display='none';
  const p=G.p,m=Math.floor(G.time/60),s=Math.floor(G.time%60);
  const xm=p.up.xpm>1?`<br><span class="stat-hi">Bonus XP:</span> x${p.up.xpm.toFixed(1)}`:'';
  const cr=G.totalCrits>0?`<br><span class="stat-crit">Golpes críticos:</span> ${G.totalCrits}`:'';
  const crS=p.up.critChance>.05?`<br><span class="stat-crit">Crítico: ${Math.round(p.up.critChance*100)}% x${p.up.critMult.toFixed(1)}</span>`:'';
  document.getElementById('gstats').innerHTML=
    `Tiempo: <span class="stat-hi">${m}:${String(s).padStart(2,'0')}</span><br>`+
    `Enemigos: <span class="stat-hi">${G.kills}</span>${cr}<br>`+
    `Oro: <span class="stat-hi" style="color:#ffcc44">${COIN_HTML} ${G.gold}</span> · Saldo: <span class="stat-hi" style="color:#ffcc44">${loadSave().wallet}</span><br>`+
    `Nivel: <span class="stat-hi">${p.lv}</span> · Oleada: <span class="stat-hi">${G.wave}</span>`+xm+crS+
    (nr?(nr.first?'<br><span class="stat-new">★ PRIMERA PARTIDA CON '+esc(p.name)+' ★</span>':
       (nr.time?'<br><span class="stat-new">★ NUEVO RÉCORD DE TIEMPO ★</span>':'')+(nr.kills?'<br><span class="stat-new">★ NUEVO RÉCORD DE BAJAS ★</span>':'')+(nr.gold?'<br><span class="stat-new">★ NUEVO RÉCORD DE ORO ★</span>':'')):'');
}

