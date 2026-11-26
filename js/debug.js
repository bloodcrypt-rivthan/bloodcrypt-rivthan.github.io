// Blood Crypt — panel de debug (solo para probar). El orden de carga está en index.html (ver CLAUDE.md).
// ============ DEBUG PANEL — borrar este archivo + su bloque en index.html y en css/estilos.css para quitarlo ============
// (si se borra, dejar en el juego dbgSyncRerollBtn/dbgAutoPick como funciones vacías o quitar sus llamadas)

// ¿Panel prendido? Prendido en tu máquina (localhost o abriendo el archivo con doble clic) y apagado en la versión
// publicada. El parámetro ?debug manda siempre: ?debug (o ?debug=1) lo prende en cualquier lado; ?debug=0, =false,
// =off o =no lo apagan. "Tu máquina" incluye [::] y 0.0.0.0, que son las direcciones que imprimen algunos
// servidores locales (python -m http.server muestra http://[::]:8000/).
// loc = {protocol, hostname, search} (window.location u otro objeto con esos campos, para poder probarla).
function debugEnabled(loc){
  const q=new URLSearchParams(loc.search||'').get('debug');
  if(q!==null) return !['0','false','off','no'].includes(q.toLowerCase());
  return loc.protocol==='file:' || ['localhost','127.0.0.1','[::1]','[::]','0.0.0.0',''].includes(loc.hostname);
}
const DEBUG_ON=debugEnabled(location);
document.body.classList.toggle('debug-on',DEBUG_ON); // sin esta clase el CSS oculta #debug-panel

function debugLevelUp(){
  if(!DEBUG_ON || !G.run || G.lvlPending) return;
  triggerLvlUp();
}
function debugSkipToBoss(){
  if(!DEBUG_ON || !G.run) return;
  G.time = Math.max(G.time, 225);
  G.wave = 1+Math.floor(G.time/25);
  G.bossSpawned=true; spawnBoss(); // spawnBoss() ya evita duplicar si G.bossAlive
}
function debugSkipToLilith(){
  if(!DEBUG_ON || !G.run) return;
  G.time = Math.max(G.time, 480);
  G.lilithSpawned=true; spawnLilith(); // spawnLilith() ya evita duplicar si G.lilithAlive
}
// REROLL+: solo habilitado mientras está abierta la pantalla de elegir mejoras; cada click suma una repetición
function debugAddReroll(){
  if(!DEBUG_ON || !G.run || !G.lvlPending) return;
  G.rerollsLeft++;
  updRerollBtn();
}
function dbgSyncRerollBtn(){
  const b=document.getElementById('dbg-reroll-btn');
  if(b) b.disabled=!(G && G.run && G.lvlPending);
}
// AUTO-MEJORA: con el check activo, al abrirse la pantalla de mejoras se elige una carta al azar (tras 300 ms, para verla)
function dbgAutoPick(){
  const cb=document.getElementById('dbg-auto');
  if(!DEBUG_ON||!cb||!cb.checked||!G||!G.run||!G.lvlPending) return;
  setTimeout(()=>{
    if(!cb.checked||!G.run||!G.lvlPending) return;
    const btns=document.querySelectorAll('#upgrow .ubtn');
    if(btns.length) btns[Math.floor(Math.random()*btns.length)].click();
  },300);
}
// ============ FIN DEBUG PANEL ============
