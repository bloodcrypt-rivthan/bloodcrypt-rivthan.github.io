// Blood Crypt — arranque: arma el G del menú y empieza el bucle. Tiene que cargarse ÚLTIMO. El orden de carga está en index.html (ver CLAUDE.md).
// ─── BOOT ─────────────────────────────────────────────────────────────────────
G={...freshRunLists(),cam:{x:0,y:0},time:0,run:false,p:null};
loop();
// Iniciar preview del menú al cargar
buildCharDots(); updateCharCard(); startPreview(); updFxBtn(); updKnBtn();
// Recién ahora está todo cargado: el menú empieza a aceptar clicks (ver body:not(.booted) en css/estilos.css)
document.body.classList.add('booted');
