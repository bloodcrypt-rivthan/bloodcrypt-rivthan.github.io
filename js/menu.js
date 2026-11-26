// Blood Crypt — carrusel de héroes, preview animado, pausa y sprite de la moneda. El orden de carga está en index.html (ver CLAUDE.md).
// ─── UI HELPERS ───────────────────────────────────────────────────────────────
// ── CHAR SELECT CAROUSEL ──────────────────────────────────────────────────────
// Los datos de la tarjeta (rol, descripción, stats) salen de CHARS; los máximos de las barras de CHAR_STAT_MAX.

let _previewRaf = null;
let _previewT = 0;
let _previewLastT = 0;

function selC(i){ selChar=i; } // compat

// Un punto del carrusel por héroe de CHARS (antes estaban fijos en el HTML)
function buildCharDots(){
  document.getElementById('char-dots').innerHTML=CHARS.map((c,i)=>`<div class="char-dot" onclick="charGoTo(${i})"></div>`).join('');
}

function charNav(dir){
  const next = ((selChar + dir) + CHARS.length) % CHARS.length;
  charGoTo(next, dir > 0 ? 'right' : 'left');
}

function charGoTo(idx, dir=null){
  if(idx === selChar && dir === null) return;
  const prev = selChar;
  selChar = idx;

  // Animación de slide
  const wrap = document.getElementById('char-preview-wrap');
  if(dir || idx !== prev){
    const slideDir = dir || (idx > prev ? 'right' : 'left');
    wrap.classList.remove('slide-right','slide-left');
    void wrap.offsetWidth; // reflow
    wrap.classList.add('slide-'+slideDir);
  }

  updateCharCard();
}

function updateCharCard(){
  const d = CHARS[selChar];
  document.getElementById('char-title').textContent = d.name;
  document.getElementById('char-role').textContent = d.role;
  document.getElementById('char-desc').textContent = d.desc;
  { const b=loadSave().best[CHARS[selChar].name], el=document.getElementById('char-best');
    el.textContent=b?('🏆 MEJOR: '+fmtT(b.time)+' · '+b.kills+' bajas · '+b.gold+' oro'):'🏆 Sin partidas aún';
    const sv=loadSave(), un=isUnlocked(sv,CHARS[selChar].name);
    document.getElementById('menu-wallet').innerHTML=COIN_HTML+' SALDO: '+sv.wallet;
    document.getElementById('char-lock').innerHTML=un?'':('🔒 BLOQUEADO · '+UNLOCK_PRICE+' '+COIN_HTML);
    document.getElementById('char-canvas').classList.toggle('locked',!un);
    document.getElementById('char-card').classList.toggle('locked',!un);
    document.getElementById('start-btn').style.display=un?'':'none';
    const ub=document.getElementById('unlock-btn'); ub.style.display=un?'none':'';
    ub.innerHTML='🔓 DESBLOQUEAR · '+UNLOCK_PRICE+' '+COIN_HTML; ub.disabled=false; ub.title=sv.wallet<UNLOCK_PRICE?'Te faltan '+(UNLOCK_PRICE-sv.wallet)+' de oro':''; }

  // Stats bars
  const stats = [
    {id:'hp', val:d.hp, max:CHAR_STAT_MAX.hp, col:'#c0392b'},
    {id:'atk', val:d.atk, max:CHAR_STAT_MAX.atk, col:'#e67e22'},
    {id:'spd', val:d.spd, max:CHAR_STAT_MAX.spd, col:'#3498db'},
    {id:'rng', val:d.range, max:CHAR_STAT_MAX.rng, col:'#9b59b6'},
  ];
  stats.forEach(s=>{
    const fill = document.getElementById('sb-'+s.id);
    const val  = document.getElementById('sv-'+s.id);
    if(fill){ fill.style.width = Math.round(s.val/s.max*100)+'%'; fill.style.background = s.col; }
    if(val) val.textContent = s.val;
  });

  // Dots
  document.querySelectorAll('.char-dot').forEach((d,i)=>d.classList.toggle('active',i===selChar));

  // Reiniciar preview
  _previewT = 0;
}

// ── PREVIEW ANIMADO EN CANVAS ─────────────────────────────────────────────────
function startPreview(){
  const canvas = document.getElementById('char-canvas');
  if(!canvas) return;
  const ctx2 = canvas.getContext('2d');
  _previewLastT = performance.now();

  function previewLoop(ts){
    _previewRaf = requestAnimationFrame(previewLoop);
    const dt = Math.min((ts - _previewLastT)/1000, 0.05);
    _previewLastT = ts;
    _previewT += dt;

    const W = canvas.width, H = canvas.height;
    ctx2.clearRect(0,0,W,H);

    // Fondo con viñeta
    const vg = ctx2.createRadialGradient(W/2,H/2,10,W/2,H/2,W*.7);
    vg.addColorStop(0,'rgba(15,5,20,.0)');
    vg.addColorStop(1,'rgba(0,0,0,.7)');
    ctx2.fillStyle = vg; ctx2.fillRect(0,0,W,H);

    const d = CHARS[selChar];
    const bob = Math.sin(_previewT*2.2)*2.5;
    const cx = W/2, cy = H/2 + 10;

    // Sombra en suelo
    ctx2.fillStyle = 'rgba(0,0,0,.35)';
    ctx2.beginPath(); ctx2.ellipse(cx, cy+22, 18, 5, 0, 0, Math.PI*2); ctx2.fill();

    // Aura de color del personaje
    ctx2.save();
    ctx2.shadowColor = d.col; ctx2.shadowBlur = 28;
    ctx2.globalAlpha = 0.12 + Math.sin(_previewT*1.8)*.05;
    ctx2.fillStyle = d.col;
    ctx2.beginPath(); ctx2.arc(cx, cy+bob, 34, 0, Math.PI*2); ctx2.fill();
    ctx2.restore();

    // Dibujar el sprite — swap temporal del ctx global
    const _ctxBackup = ctx;
    ctx = ctx2; // redirigir draw functions al canvas de preview
    const fakeP = {
      col: d.col, sc: d.sc,
      dmgF: 0, animT: _previewT,
      id: d.id, melee: !!d.melee, necro: !!d.necro, yoko: !!d.yoko, archer: !!d.archer,
      charging: !!d.yoko && Math.sin(_previewT*0.8)>0.5, // embiste cíclicamente en el preview
      facingAng: 0, walkPhase: _previewT*8,
      chargeVx: 80, chargeVy: 0,
      up:{critChance:.05, critMult:2, maxSkeletons:2},
    };
    try {
      HEROES[d.id].draw(cx, cy+bob, fakeP);
    } catch(e){ console.warn('Preview draw error:', e); }
    ctx = _ctxBackup; // restaurar siempre

    // Partículas decorativas flotantes
    const numParts = 5;
    for(let i=0;i<numParts;i++){
      const ang = (_previewT*0.4 + i*(Math.PI*2/numParts));
      const r = 36 + Math.sin(_previewT*1.2+i)*8;
      const px = cx + Math.cos(ang)*r;
      const py = cy + Math.sin(ang)*r*0.45 + bob;
      const a = 0.3 + Math.sin(_previewT*2+i)*.15;
      ctx2.save();
      ctx2.globalAlpha = a;
      ctx2.shadowColor = d.col; ctx2.shadowBlur = 8;
      ctx2.fillStyle = d.col;
      ctx2.beginPath(); ctx2.arc(px,py,2,0,Math.PI*2); ctx2.fill();
      ctx2.restore();
    }
  }
  if(_previewRaf) cancelAnimationFrame(_previewRaf);
  previewLoop(performance.now());
}

function stopPreview(){
  if(_previewRaf){ cancelAnimationFrame(_previewRaf); _previewRaf=null; }
}

function togglePause(){
  if(!G.run||G.lvlPending) return;
  paused=!paused;
  document.getElementById('pausemenu').style.display=paused?'flex':'none';
  document.getElementById('pausebtn').textContent=paused?'▶':'⏸';
}


// ─── SPRITE DE MONEDA (tira de 9 cuadros de 32x32: giro de la moneda) ───────
const COIN_SRC='sprites/coin.png';
const COIN_IMG=new Image(); let COIN_OK=false;
COIN_IMG.onload=()=>{ COIN_OK=true; };
COIN_IMG.src=COIN_SRC;
// COIN_IMG.src ya devuelve la URL absoluta: así el url() de la variable CSS no depende de contra qué base la resuelve el navegador
document.documentElement.style.setProperty('--coin-strip','url("'+COIN_IMG.src+'")');
const COIN_HTML='<span class="coin-ico"></span>'; // el emoji 🪙 no existe en muchas fuentes (salía un cuadrado)

