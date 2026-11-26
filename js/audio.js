// Blood Crypt — efectos de sonido, volumen, temblor de pantalla y música procedural. El orden de carga está en index.html (ver CLAUDE.md).
// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
let _actx = null;
function getACtx(){
  if(!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
  return _actx;
}
const BASE_VOL = 0.28;

// ─── VOLUMEN GENERAL (reemplaza al mute) ────────────────────────────────────
// Un solo control 0–100% para efectos y música. VOL_DEFAULT (80%) equivale al volumen original del juego;
// de 80% a 100% se puede subir hasta ~1.5x. La curva es cuadrática (más natural al oído que una lineal).
const VOL_DEFAULT = 80;
let _volPct = VOL_DEFAULT;
try{ const sv=localStorage.getItem('bloodcrypt_vol'); if(sv!==null && sv!=='' && !isNaN(+sv)) _volPct=clamp(Math.round(+sv),0,100); }catch(e){}
let _volGain = Math.pow(_volPct/VOL_DEFAULT, 2);
const MASTER_VOL_FN = () => BASE_VOL * _volGain;
const musicTarget = () => MUSIC.musicVol * _volGain;

function volIcon(){ return _volPct===0 ? '🔇' : _volPct<34 ? '🔈' : _volPct<67 ? '🔉' : '🔊'; }
function syncVolUI(){
  document.querySelectorAll('.vol-slider').forEach(sl=>{ if(+sl.value!==_volPct) sl.value=_volPct; });
  document.querySelectorAll('.vol-pct').forEach(el=>{ el.textContent=_volPct+'%'; });
  const btn=document.getElementById('volbtn');
  if(btn){ btn.textContent=volIcon(); btn.classList.toggle('zero', _volPct===0); }
}
function setVolume(pct){
  _volPct = clamp(Math.round(pct),0,100);
  _volGain = Math.pow(_volPct/VOL_DEFAULT, 2);
  syncVolUI();
  try{ localStorage.setItem('bloodcrypt_vol', String(_volPct)); }catch(e){}
  // La música ya sonando se ajusta en vivo (no si está en crossfade o apagándose: esos fades toman el volumen al terminar)
  if(MUSIC.masterGain && MUSIC.currentTheme && !MUSIC.crossfading && !MUSIC._stopping){
    const t=getMCtx().currentTime, g=MUSIC.masterGain.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value,t); g.linearRampToValueAtTime(musicTarget(), t+.05);
  }
}
function toggleVolPop(ev){
  if(ev) ev.stopPropagation();
  const pop=document.getElementById('volpop'), btn=document.getElementById('volbtn');
  const open = pop.style.display!=='flex';
  pop.style.display = open ? 'flex' : 'none';
  btn.classList.toggle('open', open);
}
function closeVolPop(){
  const pop=document.getElementById('volpop'), btn=document.getElementById('volbtn');
  if(pop) pop.style.display='none'; if(btn) btn.classList.remove('open');
}
function showVolBtn(on){
  const btn=document.getElementById('volbtn'); if(btn) btn.style.display=on?'block':'none';
  if(!on) closeVolPop();
}
(function initVolume(){
  document.querySelectorAll('.vol-slider').forEach(sl=>{
    sl.addEventListener('input',()=>setVolume(+sl.value));
    // al soltar: un pequeño sonido para oír el nivel, y se quita el foco para que WASD/flechas no muevan el slider
    sl.addEventListener('change',()=>{ if(_volPct>0) sndOrb(); sl.blur(); });
  });
  // clic fuera del control: se cierra
  document.addEventListener('pointerdown',e=>{
    const pop=document.getElementById('volpop'), btn=document.getElementById('volbtn');
    if(pop && pop.style.display==='flex' && !pop.contains(e.target) && e.target!==btn) closeVolPop();
  });
  syncVolUI();
})();

function playTone(opts){
  try{
    const ctx = getACtx();
    if(ctx.state==='suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_VOL_FN();
    osc.type = opts.type||'sine';
    osc.frequency.setValueAtTime(opts.freq||440, t);
    if(opts.freq2) osc.frequency.exponentialRampToValueAtTime(opts.freq2, t+(opts.dur||0.2));
    const atk = opts.attack||0.005;
    const dec = opts.decay||(opts.dur||0.2);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(opts.vol||0.5, t+atk);
    gain.gain.exponentialRampToValueAtTime(0.001, t+dec);
    if(opts.filterFreq){
      const filt = ctx.createBiquadFilter();
      filt.type = opts.filterType||'lowpass';
      filt.frequency.value = opts.filterFreq;
      osc.connect(filt); filt.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(masterGain);
    masterGain.connect(ctx.destination);
    osc.start(t); osc.stop(t+dec+0.05);
  }catch(e){}
}

function playNoise(opts){
  try{
    const ctx = getACtx();
    if(ctx.state==='suspended') ctx.resume();
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate*(opts.dur||0.1));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_VOL_FN();
    const filt = ctx.createBiquadFilter();
    filt.type = opts.filterType||'bandpass';
    filt.frequency.value = opts.filterFreq||800;
    filt.Q.value = opts.Q||1;
    const atk = opts.attack||0.003;
    const dec = opts.decay||(opts.dur||0.1);
    gain.gain.setValueAtTime(0,t);
    gain.gain.linearRampToValueAtTime(opts.vol||0.4,t+atk);
    gain.gain.exponentialRampToValueAtTime(0.001,t+dec);
    src.connect(filt); filt.connect(gain); gain.connect(masterGain); masterGain.connect(ctx.destination);
    src.start(t); src.stop(t+dec+0.05);
  }catch(e){}
}

let lastHitSndT=0;
function sndHit(){
  const now=performance.now(); if(now-lastHitSndT<35) return; // varios golpes en el mismo instante: un solo sonido
  lastHitSndT=now;
  playNoise({filterFreq:1200,filterType:'bandpass',Q:0.8,vol:0.55,dur:0.08,decay:0.07});
  playTone({type:'square',freq:180,freq2:80,dur:0.07,vol:0.3,filterFreq:600});
}
function sndShoot(){
  playTone({type:'sine',freq:520,freq2:280,dur:0.12,vol:0.22,attack:0.004,filterFreq:2000});
}
function sndBoneShoot(){
  playTone({type:'triangle',freq:300,freq2:160,dur:0.10,vol:0.20,attack:0.003,filterFreq:1400});
}
let lastCritSndT=0;
function sndCrit(){
  // Si varios enemigos reciben un golpe crítico en el mismo instante (mismo frame),
  // sndCrit() se llama una vez por cada uno y los sonidos se apilan sumando volumen,
  // sonando muchísimo más fuerte que un crítico normal. Con este pequeño cooldown
  // solo suena una vez por "ráfaga" de críticos simultáneos, sin afectar críticos
  // consecutivos reales (que están separados por bastante más de 50ms).
  const now=performance.now();
  if(now-lastCritSndT<50) return;
  lastCritSndT=now;
  playTone({type:'sine',freq:1200,freq2:900,dur:0.25,vol:0.35,attack:0.003});
  playTone({type:'triangle',freq:800,freq2:600,dur:0.20,vol:0.20,attack:0.005});
}
let lastLightningSndT=0;
function sndLightning(isCrit){
  const now=performance.now();
  if(now-lastLightningSndT<60) return; // varios rayos a la vez suenan una sola vez
  lastLightningSndT=now;
  playNoise({filterFreq:3000,filterType:'highpass',Q:0.6,vol:0.35,dur:0.18,decay:0.16});
  playTone({type:'sawtooth',freq:900,freq2:60,dur:0.22,vol:0.22,attack:0.002,filterFreq:1800});
  if(isCrit) sndCrit();
}
let lastKillSndT=0;
function sndKill(){
  const now=performance.now(); if(now-lastKillSndT<45) return; // muertes simultáneas: un solo sonido (cada uno crea varios nodos de audio)
  lastKillSndT=now;
  playTone({type:'sine',freq:120,freq2:55,dur:0.18,vol:0.45,attack:0.004,decay:0.18});
  playNoise({filterFreq:400,filterType:'lowpass',Q:0.5,vol:0.3,dur:0.07,decay:0.06});
}
function sndDamage(){
  playNoise({filterFreq:250,filterType:'lowpass',Q:0.5,vol:0.5,dur:0.14,decay:0.12});
  playTone({type:'sawtooth',freq:90,freq2:50,dur:0.12,vol:0.25,filterFreq:400});
}
let lastOrbSndT=0;
function sndOrb(){
  const now=performance.now(); if(now-lastOrbSndT<40) return; // varios orbes a la vez: un solo sonido
  lastOrbSndT=now;
  playTone({type:'sine',freq:1400,freq2:1800,dur:0.10,vol:0.15,attack:0.003,decay:0.09});
}
function sndLevelUp(){
  const ctx=getACtx(); if(ctx.state==='suspended') ctx.resume();
  [{f:440,t:0},{f:554,t:0.1},{f:659,t:0.2},{f:880,t:0.32}].forEach(n=>{
    setTimeout(()=>playTone({type:'sine',freq:n.f,freq2:n.f*1.02,dur:0.22,vol:0.38,attack:0.01}),n.t*1000);
    setTimeout(()=>playTone({type:'triangle',freq:n.f*.5,dur:0.18,vol:0.18,attack:0.01}),n.t*1000);
  });
}
function sndDeath(){
  const ctx=getACtx(); if(ctx.state==='suspended') ctx.resume();
  [{f:200,d:0},{f:150,d:0.08},{f:100,d:0.18}].forEach(n=>{
    setTimeout(()=>playTone({type:'sawtooth',freq:n.f,freq2:n.f*0.4,dur:0.8,vol:0.35,attack:0.01,decay:0.7,filterFreq:600}),n.d*1000);
  });
  playNoise({filterFreq:150,filterType:'lowpass',Q:0.4,vol:0.4,dur:0.5,decay:0.45});
}
// ─── SCREEN SHAKE ─────────────────────────────────────────────────────────────
function addShake(amount){
  G.shake = Math.max(G.shake, amount);
}

function sndBossAppear(){
  // Rugido grave + acorde oscuro descendente
  const ctx=getACtx(); if(ctx.state==='suspended') ctx.resume();
  [{f:80,d:0},{f:60,d:0.15},{f:45,d:0.35}].forEach(n=>{
    setTimeout(()=>playTone({type:'sawtooth',freq:n.f,freq2:n.f*.5,dur:1.2,vol:0.4,attack:0.06,decay:1.1,filterFreq:500}),n.d*1000);
  });
  playNoise({filterFreq:120,filterType:'lowpass',Q:0.3,vol:0.55,dur:0.9,decay:0.85});
  setTimeout(()=>playTone({type:'sine',freq:220,freq2:110,dur:0.8,vol:0.3,attack:0.1,decay:0.7}),200);
}
function sndBossHit(){
  playNoise({filterFreq:600,filterType:'bandpass',Q:0.6,vol:0.6,dur:0.12,decay:0.10});
  playTone({type:'square',freq:140,freq2:70,dur:0.09,vol:0.35,filterFreq:500});
}
function sndBossDeath(){
  const ctx=getACtx(); if(ctx.state==='suspended') ctx.resume();
  [{f:160,d:0},{f:120,d:0.1},{f:90,d:0.25},{f:55,d:0.45}].forEach(n=>{
    setTimeout(()=>playTone({type:'sawtooth',freq:n.f,freq2:n.f*.3,dur:1.5,vol:0.38,attack:0.02,decay:1.4,filterFreq:400}),n.d*1000);
  });
  playNoise({filterFreq:100,filterType:'lowpass',Q:0.25,vol:0.6,dur:1.0,decay:0.95});
  // Fanfarria de victoria tras la muerte
  setTimeout(()=>{
    [{f:330,t:0},{f:440,t:0.12},{f:550,t:0.24},{f:660,t:0.38},{f:880,t:0.55}].forEach(n=>{
      setTimeout(()=>playTone({type:'sine',freq:n.f,dur:0.3,vol:0.32,attack:0.01}),n.t*1000);
    });
  },600);
}
function sndSummon(){
  playTone({type:'sine',freq:200,freq2:600,dur:0.35,vol:0.28,attack:0.04,decay:0.3,filterFreq:2000});
  playTone({type:'triangle',freq:100,freq2:300,dur:0.3,vol:0.18,attack:0.05,decay:0.28});
}


// ─── MUSIC ENGINE ─────────────────────────────────────────────────────────────
// Dungeon Synth procedural — todo generado con Web Audio API, sin archivos externos

const MUSIC = {
  ctx: null,
  masterGain: null,
  musicVol: 0.18,       // volumen de música independiente de SFX
  currentTheme: null,   // 'dungeon' | 'boss' | null
  nodes: [],            // nodos activos para cleanup
  schedulerTimer: null,
  beatTime: 0,
  bpm: 52,              // tempo lento dungeon
  bar: 0,               // contador de compases
  melodyStep: 0,
  crossfading: false,
};

// Escala pentatónica menor en D (dungeon feel)
const PENTA_MINOR = [146.83, 174.61, 195.99, 220.00, 261.63, 293.66, 349.23, 391.99, 440.00, 523.25];
// Escala frigia para el boss (más oscura/disonante)
const PHRYGIAN   = [130.81, 138.59, 155.56, 174.61, 196.00, 207.65, 220.00, 246.94, 261.63, 277.18];

function getMCtx(){
  if(!MUSIC.ctx) MUSIC.ctx = getACtx();
  return MUSIC.ctx;
}

function getMaster(){
  if(!MUSIC.masterGain){
    const ctx = getMCtx();
    MUSIC.masterGain = ctx.createGain();
    MUSIC.masterGain.gain.value = musicTarget();
    MUSIC.masterGain.connect(ctx.destination);
  }
  return MUSIC.masterGain;
}

function musicNote(freq, startTime, dur, vol, type='sine', detune=0, filterFreq=null, attack=0.04, release=null){
  try{
    const ctx = getMCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if(detune) osc.detune.value = detune;
    const rel = release || dur * 0.55;
    const atk = Math.min(attack, dur * 0.3);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + atk);
    gain.gain.setValueAtTime(vol, startTime + dur - rel);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    let src = osc;
    if(filterFreq){
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = filterFreq;
      filt.Q.value = 1.2;
      osc.connect(filt);
      src = filt;
    }
    src.connect(gain);
    gain.connect(getMaster());
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
    _trackMusicNode(osc);
  }catch(e){}
}

// Registra el nodo y lo olvida cuando termina (antes la lista solo crecía porque el contexto nunca se cierra)
function _trackMusicNode(n){
  MUSIC.nodes.push(n);
  n.onended=()=>{ const i=MUSIC.nodes.indexOf(n); if(i>=0) MUSIC.nodes.splice(i,1); try{n.disconnect();}catch(e){} };
}
function musicNoise(startTime, dur, vol, filterFreq=200, filterType='lowpass'){
  try{
    const ctx = getMCtx();
    const bufSize = Math.floor(ctx.sampleRate * Math.min(dur + 0.1, 2.0));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType; filt.frequency.value = filterFreq; filt.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    src.connect(filt); filt.connect(gain); gain.connect(getMaster());
    src.start(startTime); src.stop(startTime + dur + 0.05);
    _trackMusicNode(src);
  }catch(e){}
}

// ── DRONE DE FONDO (pad largo que se renueva) ────────────────────────────────
function scheduleDroneDungeon(t, barDur){
  // Pad de cuerdas — acorde Dm sostenido
  const roots = [73.42, 110.00, 146.83]; // D2, A2, D3
  roots.forEach((f,i)=>{
    musicNote(f, t, barDur*2, 0.22, 'triangle', i*3, 800, 0.8, barDur*0.8);
    musicNote(f*2, t+0.1, barDur*2, 0.10, 'sine', -i*2, 1200, 0.9, barDur*0.7);
  });
  // Reverb simulado: nota desfasada con detune
  musicNote(146.83, t+0.08, barDur*2, 0.08, 'sine', 8, 600, 1.0, barDur*0.9);
}

function scheduleDroneBoss(t, barDur){
  // Acorde más oscuro — cluster disonante
  const freqs = [65.41, 69.30, 87.31, 98.00]; // C2, Db2, F2, G2
  freqs.forEach((f,i)=>{
    musicNote(f, t+i*0.06, barDur*2, 0.20, 'sawtooth', i*5, 400+i*60, 0.6, barDur*0.8);
  });
  // Sub-bass pulsante
  musicNote(32.70, t, barDur*2, 0.30, 'sine', 0, 150, 0.3, barDur*0.6);
}

// ── MELODÍA DUNGEON SYNTH ────────────────────────────────────────────────────
const MELODY_PATTERNS = [
  // Patrón A — pregunta melódica
  [0,null,2,null,4,3,null,2,null,0,null,null,null,null,null,null],
  // Patrón B — respuesta
  [null,null,5,null,7,null,6,null,4,null,3,null,2,null,null,null],
  // Patrón C — subida
  [0,null,2,4,null,5,null,7,null,9,null,7,null,5,null,null],
  // Patrón D — silencio dramático
  [null,null,null,null,null,null,null,0,null,null,2,null,null,null,null,null],
];

function scheduleMelodyDungeon(t, beatDur){
  const patIdx = Math.floor(MUSIC.bar / 2) % MELODY_PATTERNS.length;
  const pat = MELODY_PATTERNS[patIdx];
  pat.forEach((noteIdx, i)=>{
    if(noteIdx===null) return;
    const freq = PENTA_MINOR[noteIdx % PENTA_MINOR.length];
    const st = t + i * beatDur;
    // Nota principal
    musicNote(freq, st, beatDur*1.6, 0.18, 'sine', 0, 2200, 0.03, beatDur*1.2);
    // Octava baja suave
    musicNote(freq*0.5, st+0.02, beatDur*1.4, 0.08, 'triangle', 3, 800, 0.04, beatDur);
    // Shimmer agudo muy suave
    if(i%4===0) musicNote(freq*4, st, beatDur*0.8, 0.04, 'sine', 0, 3000, 0.02, beatDur*0.5);
  });
}

// ── MELODÍA BOSS ──────────────────────────────────────────────────────────────
const BOSS_PATTERNS = [
  [0,null,1,null,0,null,3,null,2,null,1,null,0,null,null,null],
  [null,null,0,null,null,1,null,0,null,null,3,null,5,null,3,null],
  [0,1,0,null,1,3,1,null,0,null,null,null,5,null,3,null],
  [null,null,null,0,null,null,1,null,3,null,1,null,0,null,null,null],
];

function scheduleMelodyBoss(t, beatDur){
  const patIdx = Math.floor(MUSIC.bar / 2) % BOSS_PATTERNS.length;
  const pat = BOSS_PATTERNS[patIdx];
  pat.forEach((noteIdx, i)=>{
    if(noteIdx===null) return;
    const freq = PHRYGIAN[noteIdx % PHRYGIAN.length];
    const st = t + i * beatDur;
    musicNote(freq, st, beatDur*1.3, 0.16, 'sawtooth', 0, 1200, 0.02, beatDur*0.9);
    musicNote(freq*.5, st+0.03, beatDur*1.5, 0.12, 'triangle', -5, 600, 0.05, beatDur);
  });
}

// ── BAJO ──────────────────────────────────────────────────────────────────────
const BASS_DUNGEON = [73.42, 0, 0, 73.42, 0, 65.41, 0, 0, 82.41, 0, 0, 73.42, 0, 0, 65.41, 0];
const BASS_BOSS    = [65.41, 0, 65.41, 0, 61.74, 0, 65.41, 0, 58.27, 0, 61.74, 0, 65.41, 0, 0, 0];

function scheduleBass(t, beatDur, pattern){
  pattern.forEach((freq, i)=>{
    if(!freq) return;
    const st = t + i * beatDur;
    musicNote(freq, st, beatDur*1.1, 0.28, 'triangle', 0, 300, 0.01, beatDur*0.7);
    musicNote(freq*2, st+0.01, beatDur*0.7, 0.08, 'sine', 0, 500, 0.01, beatDur*0.5);
  });
}

// ── PERCUSIÓN BOSS ────────────────────────────────────────────────────────────
function schedulePercBoss(t, beatDur){
  // Bombo en 1 y 9
  [0, 8].forEach(i=>{
    const st = t + i * beatDur;
    musicNoise(st, 0.18, 0.35, 80, 'lowpass');
    musicNote(55, st, 0.22, 0.40, 'sine', 0, null, 0.004, 0.18);
  });
  // Hi-hat oscuro en 4, 8, 12, 16
  [3,7,11,15].forEach(i=>{
    musicNoise(t + i*beatDur, 0.06, 0.12, 3000, 'highpass');
  });
  // Snare en 5 y 13
  [4,12].forEach(i=>{
    const st = t + i*beatDur;
    musicNoise(st, 0.14, 0.22, 500, 'bandpass');
    musicNote(180, st, 0.10, 0.15, 'triangle', 0, null, 0.003, 0.08);
  });
}

// ── SCHEDULER PRINCIPAL ───────────────────────────────────────────────────────
function scheduleBar(){
  if(!MUSIC.currentTheme || MUSIC.crossfading) return;
  const ctx = getMCtx();
  const t = MUSIC.beatTime;
  const secPerBeat = 60 / MUSIC.bpm;
  const barDur = secPerBeat * 16; // 16 pulsos por compás

  if(MUSIC.currentTheme === 'dungeon'){
    if(MUSIC.bar % 2 === 0) scheduleDroneDungeon(t, barDur);
    scheduleMelodyDungeon(t, secPerBeat);
    scheduleBass(t, secPerBeat, BASS_DUNGEON);
  } else if(MUSIC.currentTheme === 'boss'){
    if(MUSIC.bar % 2 === 0) scheduleDroneBoss(t, barDur);
    scheduleMelodyBoss(t, secPerBeat);
    scheduleBass(t, secPerBeat, BASS_BOSS);
    schedulePercBoss(t, secPerBeat);
  }

  MUSIC.beatTime += barDur;
  MUSIC.bar++;

  // Limpiar nodos viejos
  MUSIC.nodes = MUSIC.nodes.filter(n=>{ try{ return n.context && n.context.state!=='closed'; }catch(e){return false;} });
}

function startMusic(theme){
  if(MUSIC.currentTheme === theme && !MUSIC._stopping) return; // si está apagándose, hay que reiniciarla
  clearTimeout(MUSIC._stopTimer); // cancela el currentTheme=null pendiente de stopMusic
  MUSIC._stopping = false;
  const ctx = getMCtx();
  if(ctx.state === 'suspended') ctx.resume();

  // Crossfade: bajar volumen actual, cambiar tema, subir
  const master = getMaster();
  const now = ctx.currentTime;

  if(MUSIC.currentTheme){
    MUSIC.crossfading = true;
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 1.5);
    setTimeout(()=>{
      MUSIC.currentTheme = theme;
      MUSIC.bar = 0; MUSIC.melodyStep = 0;
      MUSIC.beatTime = getMCtx().currentTime + 0.1;
      master.gain.setValueAtTime(0, getMCtx().currentTime);
      master.gain.linearRampToValueAtTime(musicTarget(), getMCtx().currentTime+2.0);
      MUSIC.crossfading = false;
      scheduleBar(); scheduleBar(); // pre-schedule 2 compases
    }, 1600);
  } else {
    MUSIC.currentTheme = theme;
    MUSIC.bar = 0;
    MUSIC.beatTime = now + 0.3;
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(musicTarget(), now + 2.5);
    scheduleBar(); scheduleBar();
  }

  // Scheduler loop — programa el siguiente compás cuando falta 1s
  clearInterval(MUSIC.schedulerTimer);
  MUSIC.schedulerTimer = setInterval(()=>{
    if(!MUSIC.currentTheme || MUSIC.crossfading) return;
    const ctx = getMCtx();
    if(ctx.currentTime >= MUSIC.beatTime - 1.0) scheduleBar();
  }, 400);
}

function stopMusic(fade=1.5){
  clearInterval(MUSIC.schedulerTimer);
  if(!MUSIC.masterGain) return;
  MUSIC._stopping = true; // mientras se apaga, el slider de volumen no debe pisar el fade-out
  const ctx = getMCtx();
  const now = ctx.currentTime;
  MUSIC.masterGain.gain.setValueAtTime(MUSIC.masterGain.gain.value, now);
  MUSIC.masterGain.gain.linearRampToValueAtTime(0, now + fade);
  clearTimeout(MUSIC._stopTimer);
  MUSIC._stopTimer = setTimeout(()=>{ MUSIC.currentTheme = null; }, fade * 1000 + 100);
}




