// Blood Crypt — guardado de progreso y récords (localStorage). El orden de carga está en index.html (ver CLAUDE.md).
// ─── GUARDADO DE PROGRESO / RÉCORDS ───────────────────────────────────────────
// Se guarda en localStorage: es propio de cada navegador y de cada origen, así que cada persona que juegue
// desde https://bloodcrypt-rivthan.github.io/ tiene sus propios récords, sin mezclarse con los de nadie.
const SAVE_KEY='bloodcrypt_save_v1', MAX_RUNS=30, MIN_RUN_TIME=5;
const GOLD_DROP_CHANCE=.25;      // probabilidad de que un enemigo suelte una moneda
const GOLD_BOSS_COINS=12, GOLD_BOSS_VAL=10;
// PRECIO DE DESBLOQUEO de héroes: 5 partidas llegando hasta Lilith (minuto 8). Oro estimado por partida así: ver Entrada 144 del .md
const GOLD_PER_LILITH_RUN=3500, LILITH_RUNS_PRICE=5, UNLOCK_PRICE=GOLD_PER_LILITH_RUN*LILITH_RUNS_PRICE;
function emptySave(){ return {v:1,runs:[],totals:{runs:0,time:0,kills:0,gold:0},best:{},wallet:0,unlocked:[]}; }
function num(x,max){ x=Number(x); return (isFinite(x)&&x>0)?Math.min(Math.floor(x),max||1e9):0; }
function sanitizeSave(d){
  const o=emptySave(); if(!d||typeof d!=='object'||d.v!==1) return null;
  if(d.totals) for(const k of ['runs','time','kills','gold']) o.totals[k]=num(d.totals[k],1e10);
  if(d.best&&typeof d.best==='object') for(const n of Object.keys(d.best).slice(0,20)){
    const b=d.best[n]; if(!b||typeof b!=='object') continue;
    o.best[String(n).slice(0,20)]={time:num(b.time,1e6),kills:num(b.kills),gold:num(b.gold),lv:num(b.lv,999),wave:num(b.wave,999),runs:num(b.runs)};
  }
  // monedero (oro gastable) y héroes desbloqueados. Guardados antiguos (sin estos campos): se acredita todo el oro
  // ganado hasta ahora y se desbloquean los héroes con los que ya habían jugado.
  const names=CHARS.map(c=>c.name);
  o.wallet=(d.wallet===undefined)?o.totals.gold:num(d.wallet,1e10);
  o.unlocked=Array.isArray(d.unlocked)?d.unlocked.filter(n=>names.includes(n)).slice(0,20):Object.keys(o.best).filter(n=>names.includes(n));
  if(Array.isArray(d.runs)) for(const r of d.runs.slice(0,MAX_RUNS)){
    if(!r||typeof r!=='object') continue;
    o.runs.push({ch:String(r.ch||'?').slice(0,20),time:num(r.time,1e6),kills:num(r.kills),gold:num(r.gold),lv:num(r.lv,999),wave:num(r.wave,999),res:r.res==='quit'?'quit':'dead',lil:r.lil?1:0,gl:num(r.gl),t:num(r.t,1e14)});
  }
  return o;
}
function loadSave(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(raw){ const d=sanitizeSave(JSON.parse(raw)); if(d) return d; } }catch(e){}
  return emptySave();
}
function isUnlocked(d,name){ return name===CHARS[0].name || d.unlocked.includes(name); }
function unlockHero(){
  const d=loadSave(), n=CHARS[selChar].name; if(isUnlocked(d,n)) return;
  if(d.wallet<UNLOCK_PRICE){ alert('Oro insuficiente.\nTienes '+d.wallet+' y '+n+' cuesta '+UNLOCK_PRICE+'.'); return; }
  if(!confirm('¿Desbloquear a '+n+' por '+UNLOCK_PRICE+' de oro?\nSaldo tras la compra: '+(d.wallet-UNLOCK_PRICE))) return;
  d.wallet-=UNLOCK_PRICE; d.unlocked.push(n);
  if(!writeSave(d)){ alert('No se pudo guardar (el navegador bloquea el almacenamiento). No se cobró nada.'); return; }
  updateCharCard();
}
function writeSave(d){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
function esc(t){ return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtT(t){ t=Math.floor(t); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); }
function fmtTLong(t){ t=Math.floor(t); const h=Math.floor(t/3600),m=Math.floor(t%3600/60); return h>0?h+'h '+m+'m':m+'m '+(t%60)+'s'; }

// Registra la partida en curso (una sola vez). Devuelve qué récords personales se batieron.
function saveRun(res){
  if(!G||!G.p||G.saved||G.time<MIN_RUN_TIME) return null;
  G.saved=true;
  const p=G.p, d=loadSave();
  const run={ch:p.name,time:Math.floor(G.time),kills:G.kills|0,gold:G.gold|0,lv:p.lv|0,wave:G.wave|0,res,lil:G.goldAtLilith!==undefined?1:0,gl:G.goldAtLilith|0,t:Date.now()};
  const prev=d.best[p.name], isFirst=!prev;
  const b=prev||{time:0,kills:0,gold:0,lv:0,wave:0,runs:0};
  const nw={time:run.time>b.time,kills:run.kills>b.kills,gold:run.gold>b.gold};
  for(const k of ['time','kills','gold','lv','wave']) if(run[k]>b[k]) b[k]=run[k];
  b.runs++; d.best[p.name]=b;
  d.runs.unshift(run); d.runs.length=Math.min(d.runs.length,MAX_RUNS);
  d.totals.runs++; d.totals.time+=run.time; d.totals.kills+=run.kills; d.totals.gold+=run.gold; d.wallet+=run.gold;
  writeSave(d);
  return isFirst?{time:false,kills:false,gold:false,first:true}:nw;
}
window.addEventListener('pagehide',()=>{ if(G&&G.run) saveRun('quit'); });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'&&G&&G.run) saveRun('quit'); });

function openRecords(){
  const d=loadSave(), T=d.totals;
  let h='<h3>TOTAL ACUMULADO</h3><div class="rec-tot"><span>Partidas: <b>'+T.runs+'</b></span><span>Tiempo: <b>'+fmtTLong(T.time)+'</b></span><span>Bajas: <b>'+T.kills+'</b></span><span class="rec-gold">'+COIN_HTML+' Oro ganado: <b class="rec-gold">'+T.gold+'</b></span><span class="rec-gold">Saldo: <b class="rec-gold">'+d.wallet+'</b></span></div>';
  h+='<h3>MEJOR MARCA POR PERSONAJE</h3><table class="rec-tbl"><tr><th>PERSONAJE</th><th>TIEMPO</th><th>BAJAS</th><th>ORO</th><th>NIVEL</th><th>OLEADA</th><th>PARTIDAS</th></tr>';
  for(const c of CHARS){
    const b=d.best[c.name];
    h+= b? '<tr><td>'+esc(c.name)+'</td><td>'+fmtT(b.time)+'</td><td>'+b.kills+'</td><td class="rec-gold">'+b.gold+'</td><td>'+b.lv+'</td><td>'+b.wave+'</td><td>'+b.runs+'</td></tr>'
           : '<tr><td>'+esc(c.name)+'</td><td colspan="6" style="color:#444">'+(isUnlocked(d,c.name)?'sin partidas':'🔒 bloqueado · '+UNLOCK_PRICE+' '+COIN_HTML)+'</td></tr>';
  }
  h+='</table><h3>ÚLTIMAS PARTIDAS</h3>';
  if(!d.runs.length) h+='<div style="color:#444">Aún no hay partidas registradas.</div>';
  else{
    h+='<table class="rec-tbl"><tr><th>PERSONAJE</th><th>TIEMPO</th><th>BAJAS</th><th>ORO</th><th>NIVEL</th><th>FIN</th></tr>';
    for(const r of d.runs.slice(0,12)) h+='<tr><td>'+esc(r.ch)+'</td><td>'+fmtT(r.time)+'</td><td>'+r.kills+'</td><td class="rec-gold">'+r.gold+'</td><td>'+r.lv+'</td><td>'+(r.res==='quit'?'abandonó':'murió')+(r.lil?' · Lilith':'')+'</td></tr>';
    h+='</table>';
  }
  document.getElementById('rec-body').innerHTML=h;
  document.getElementById('records').style.display='flex';
}
function closeRecords(){ document.getElementById('records').style.display='none'; updateCharCard(); }
function exportSave(){
  const code=btoa(JSON.stringify(loadSave()));
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(code):Promise.reject()).then(
    ()=>alert('Código de guardado copiado al portapapeles.\nPégalo con IMPORTAR en otro navegador o dispositivo.'),
    ()=>prompt('Copia este código de guardado:',code));
}
function importSave(){
  const code=prompt('Pega tu código de guardado.\nATENCIÓN: reemplaza los récords actuales de este navegador.'); if(!code) return;
  try{ const d=sanitizeSave(JSON.parse(atob(code.trim()))); if(!d) throw 0; writeSave(d); openRecords(); }
  catch(e){ alert('Código inválido.'); }
}
function resetSave(){ if(confirm('¿Borrar TODOS los récords de este navegador? No se puede deshacer.')){ try{localStorage.removeItem(SAVE_KEY);}catch(e){} openRecords(); } }

function goMenu(){
  if(G&&G.run) saveRun('quit');
  paused=false; G.run=false;
  document.getElementById('records').style.display='none';
  stopMusic(1.2);
  ['pausemenu','gover','lvlup'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('menu').style.display='flex';
  updateCharCard(); startPreview();
  document.getElementById('hud').style.display='none';
  document.getElementById('pausebtn').style.display='none';
  showVolBtn(false);
}
function startGame(){
  if(!isUnlocked(loadSave(),CHARS[selChar].name)){ selChar=0; updateCharCard(); return; } // héroe bloqueado: no se puede jugar
  ['menu','gover'].forEach(id=>document.getElementById(id).style.display='none');
  stopPreview();
  document.getElementById('hud').style.display='block';
  document.getElementById('pausebtn').style.display='block';
  document.getElementById('pausebtn').textContent='⏸';
  showVolBtn(true);
  startMusic('dungeon');
  document.getElementById('xp-mult').style.display='none';
  document.getElementById('crit-row').style.display='none';
  document.getElementById('bloodlust-row').style.display='none';
  document.getElementById('bone-panel').style.display='none';
  dbgSyncRerollBtn();
  paused=false; initG();
  if(CHARS[selChar].necro) prewarmThrallSheets();
  if(raf) cancelAnimationFrame(raf);
  lastT=performance.now(); loop(lastT); // primer dt = 0 (antes el primer frame simulaba 50 ms de golpe)
}
function restartGame(){document.getElementById('gover').style.display='none'; startGame();}

// Todos los arrays de una partida, vacíos y nuevos. Es la única lista: un array nuevo de G se agrega ACÁ
// (no inicializarlo después con if(!G.x) G.x=[], ni proteger su uso con if(G.x)). La usan initG() y el G del arranque (menú),
// así G tiene siempre la misma forma, haya partida o no.
function freshRunLists(){
  return {enemies:[],projs:[],parts:[],orbs:[],meleeEff:[],dmgNums:[],bloodSplats:[],
          skeletons:[],thralls:[],thrallProjs:[],bones:[],                   // nigromante y Yoko
          arrowQueue:[],shurPts:[],rains:[],rainArrows:[],traps:[],trapFX:[], // arquero
          bossProjs:[],eProjs:[],spectralFX:[],lightningFX:[],splitFx:[]};
}
function initG(){
  const ch=CHARS[selChar];
  G={...freshRunLists(),run:true,time:0,kills:0,gold:0,saved:false,wave:1,spT:0,spI:2.2,cam:{x:0,y:0},lvlPending:false,totalCrits:0,rerollsLeft:0,furyTimer:0,summonTimer:0,boss:null,bossAlive:false,bossAnnounce:0,bossSpawned:false,lightningT:0,shurAng:0,stealthT:4,invisPos:{x:0,y:0},rainT:3,trapT:3,shake:0,shakeX:0,shakeY:0,lvlUpFlash:0,
    lilith:null,lilithAlive:false,lilithSpawned:false,lilithAnnounce:0,
    p:{x:0,y:0,hp:ch.hp,mhp:ch.hp,atk:ch.atk,spd:ch.spd,range:ch.range,rate:ch.rate,
       atkt:0,id:ch.id,melee:ch.melee,col:ch.col,sc:ch.sc,name:ch.name,
       invT:0,dmgF:0,xp:0,xpN:20,lv:1,animT:0,walkPhase:0,sprAnim:'idle',sprFrame:0,sprFrameT:0,sprDead:false,
       up:{atk:0,regen:0,spd:0,rng:1,rate:0,xpm:1,critChance:ch.archer?.15:.05,critMult:2.0,spectralLevel:1},
       charging:false,chargeT:0,chargeVx:0,chargeVy:0,chargeHit:new Set(),chargeDmgBonus:0,facingAng:0,
       chargeExtraUsed:false,
       bloodlustActive:false,bloodlustT:0,bloodlustCD:BLOODLUST_COOLDOWN,
       necro:ch.necro||false, yoko:ch.yoko||false, mage:ch.mage||false, archer:ch.archer||false}};
  document.getElementById('char-name').textContent=ch.name+' · LV ';
  document.getElementById('char-name').appendChild(document.createTextNode(''));
  document.getElementById('char-name').innerHTML=ch.name+' · LV <span id="hlv">1</span>';
  updHUD();
}

