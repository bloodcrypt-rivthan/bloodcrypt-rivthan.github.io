// Blood Crypt — panel de debug (solo para probar). El orden de carga está en index.html (ver CLAUDE.md).
// ============ DEBUG PANEL — borrar estas 3 funciones + su llamado desde el HTML/CSS para quitarlo ============
function debugLevelUp(){
  if(!G.run || G.lvlPending) return;
  triggerLvlUp();
}
function debugSkipToBoss(){
  if(!G.run) return;
  G.time = Math.max(G.time, 225);
  G.wave = 1+Math.floor(G.time/25);
  G.bossSpawned=true; spawnBoss(); // spawnBoss() ya evita duplicar si G.bossAlive
}
function debugSkipToLilith(){
  if(!G.run) return;
  G.time = Math.max(G.time, 480);
  G.lilithSpawned=true; spawnLilith(); // spawnLilith() ya evita duplicar si G.lilithAlive
}
// REROLL+: solo habilitado mientras está abierta la pantalla de elegir mejoras; cada click suma una repetición
function debugAddReroll(){
  if(!G.run || !G.lvlPending) return;
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
  if(!cb||!cb.checked||!G||!G.run||!G.lvlPending) return;
  setTimeout(()=>{
    if(!cb.checked||!G.run||!G.lvlPending) return;
    const btns=document.querySelectorAll('#upgrow .ubtn');
    if(btns.length) btns[Math.floor(Math.random()*btns.length)].click();
  },300);
}
// ============ FIN DEBUG PANEL ============
