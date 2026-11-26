// Blood Crypt — iluminación, viñetas y draw(). El orden de carga está en index.html (ver CLAUDE.md).
// ─── ILUMINACIÓN DINÁMICA (solo con FX_HIGH) ─────────────────────────────────
// Una capa oscura a baja resolución a la que se le "perforan" agujeros de luz (héroe, antorchas, velas, proyectiles,
// jefe, Lilith). Se escala a pantalla completa y se dibuja una vez por frame, encima del mundo y bajo los números de daño.
const LIGHT_DIV=4;         // la capa se calcula a 1/4 de la resolución (más barato, y el escalado la suaviza)
const LIGHT_AMBIENT=.38;   // oscuridad (0-1) donde no llega ninguna luz; subirla oscurece el juego
const LIGHT_HERO_R=330;    // radio de la luz del héroe (px de pantalla)
const LIGHT_TINT=.3;       // fuerza del tinte de color aditivo en luces de colores (proyectiles, jefe)
const LIGHT_MAX_DYN=24;    // tope de luces de proyectiles por frame
const _lights=[]; let _lightN=0;
// x,y y r en px de pantalla; a = intensidad 0-1; col = color del tinte (o null para solo iluminar)
function addLight(x,y,r,a,col){
  let l=_lights[_lightN]; if(!l) l=_lights[_lightN]={x:0,y:0,r:0,a:0,col:null};
  l.x=x; l.y=y; l.r=r; l.a=a; l.col=col; _lightN++;
}
let _lightC=null,_lightX=null,_glowHole=null; const _glowTints={};
function _makeGlow(rgb){ // sprite de resplandor 128×128: opaco al centro, transparente en el borde
  const c=document.createElement('canvas'); c.width=c.height=128;
  const x=c.getContext('2d'), g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba('+rgb+',1)'); g.addColorStop(.3,'rgba('+rgb+',.7)');
  g.addColorStop(.6,'rgba('+rgb+',.28)'); g.addColorStop(1,'rgba('+rgb+',0)');
  x.fillStyle=g; x.fillRect(0,0,128,128); return c;
}
function _glowTint(col){
  let g=_glowTints[col];
  if(!g){ // convierte el color CSS a r,g,b con un canvas de 1 px
    const t=document.createElement('canvas'); t.width=t.height=1; const x=t.getContext('2d');
    x.fillStyle=col; x.fillRect(0,0,1,1); const d=x.getImageData(0,0,1,1).data;
    g=_glowTints[col]=_makeGlow(d[0]+','+d[1]+','+d[2]);
  }
  return g;
}
// Luces dinámicas de entidades (las de antorchas y velas se registran al dibujarlas)
function collectEntityLights(cx,cy,W,H,p){
  addLight(W/2,H/2-10,LIGHT_HERO_R,1,null);
  let n=0;
  for(const pr of G.projs){ if(pr.arrow) continue; if(n>=LIGHT_MAX_DYN) break;
    addLight(pr.x+cx,pr.y+cy,pr.sz*6+50,.8,pr.isCrit?'#ff8800':pr.col); n++; }
  for(const pr of G.eProjs){ if(n>=LIGHT_MAX_DYN) break; addLight(pr.x+cx,pr.y+cy,70,.7,pr.col||'#44ffff'); n++; }
  for(const pr of G.bossProjs){ if(n>=LIGHT_MAX_DYN) break; addLight(pr.x+cx,pr.y+cy,80,.8,'#aa66ff'); n++; }
  const b=G.boss;
  if(b&&(b.alive||b.deathT>0)){
    const ph=b.phase===3?'#ff4400':b.phase===2?'#aa44ff':'#6622cc';
    addLight(b.x+cx,b.y+cy,260,.7,ph);
  }
  if(G.lilith) addLight(G.lilith.x+cx,G.lilith.y+cy,240,.7,'#ff2200');
}
function drawLighting(W,H){
  const lw=Math.ceil(W/LIGHT_DIV), lh=Math.ceil(H/LIGHT_DIV);
  if(!_lightC){ _lightC=document.createElement('canvas'); _lightX=_lightC.getContext('2d'); _glowHole=_makeGlow('255,255,255'); }
  if(_lightC.width!==lw||_lightC.height!==lh){ _lightC.width=lw; _lightC.height=lh; }
  const lc=_lightX;
  lc.globalCompositeOperation='source-over'; lc.globalAlpha=1;
  lc.clearRect(0,0,lw,lh);
  lc.fillStyle='rgba(6,4,14,'+LIGHT_AMBIENT+')'; lc.fillRect(0,0,lw,lh);
  lc.globalCompositeOperation='destination-out';
  for(let i=0;i<_lightN;i++){
    const L=_lights[i];
    if(L.x+L.r<0||L.x-L.r>W||L.y+L.r<0||L.y-L.r>H) continue;
    const r=L.r/LIGHT_DIV;
    lc.globalAlpha=L.a;
    lc.drawImage(_glowHole,L.x/LIGHT_DIV-r,L.y/LIGHT_DIV-r,r*2,r*2);
  }
  lc.globalAlpha=1; lc.globalCompositeOperation='source-over';
  ctx.drawImage(_lightC,0,0,W,H);
  // tinte de color aditivo en las luces de colores
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<_lightN;i++){
    const L=_lights[i]; if(!L.col) continue;
    if(L.x+L.r<0||L.x-L.r>W||L.y+L.r<0||L.y-L.r>H) continue;
    ctx.globalAlpha=L.a*LIGHT_TINT;
    ctx.drawImage(_glowTint(L.col),L.x-L.r,L.y-L.r,L.r*2,L.r*2);
  }
  ctx.restore();
}

// ─── POSTPROCESO: viñetas cacheadas ──────────────────────────────────────────
const LOWHP_PULSE=.3; // por debajo de esta fracción de vida, el borde rojo late (FX_HIGH)
const _vig={};
function _vigBitmap(kind,W,H){
  let e=_vig[kind];
  if(!e||e.w!==W||e.h!==H){
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const x=c.getContext('2d');
    let g;
    if(kind==='dark'){ g=x.createRadialGradient(W/2,H/2,H*.18,W/2,H/2,H*.85); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.65)'); }
    else { g=x.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,H*.8); g.addColorStop(0,'rgba(150,0,0,0)'); g.addColorStop(1,'rgba(180,0,0,1)'); }
    x.fillStyle=g; x.fillRect(0,0,W,H);
    e=_vig[kind]={c,w:W,h:H};
  }
  return e.c;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
// Cola de profundidad: cada entidad con presencia en el suelo entra con la y de sus pies.
// Los objetos de la cola se reutilizan entre frames (sin crear basura).
const _dq=[]; let _dqN=0;
function _dqPush(y,type,o){
  let it=_dq[_dqN]; if(!it) it=_dq[_dqN]={y:0,t:0,o:null};
  it.y=y; it.t=type; it.o=o; _dqN++;
}
function drawDepthSorted(cx,cy,W,H,p,cam){
  _dqN=0;
  for(const e of G.enemies) if(e.alive) _dqPush(e.y+e.sz*.6,0,e);
  if(G.boss) _dqPush(G.boss.y+G.boss.sz*.9,1,G.boss);
  if(G.lilith) _dqPush(G.lilith.y+G.lilith.sz*.9,2,G.lilith);
  for(const sk of G.skeletons) _dqPush(sk.y+10,3,sk);
  for(const th of G.thralls) if(th.alive) _dqPush(th.y+th.sz*.6,4,th);
  _dqPush(cam.y+2,5,p); // el héroe siempre se dibuja en el centro de la pantalla, que equivale a la cámara
  const list=_dq.slice(0,_dqN).sort((a,b)=>a.y-b.y); // sort estable: a igual y se conserva el orden anterior
  for(let i=0;i<list.length;i++){
    const it=list[i], o=it.o;
    switch(it.t){
      case 0: drawEnemy(o,cx,cy,W,H); break;
      case 1: drawBoss(o,cx,cy,W,H); break;
      case 2: drawLilith(o,cx,cy,W,H); break;
      case 3: drawSkeleton(o,cx,cy); break;
      case 4: drawThrall(o,cx,cy); break;
      default: drawPlayer(W,H,o);
    }
  }
}

function draw(){
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const cam=G.cam||{x:0,y:0};
  _lightN=0; // luces de este frame (se registran al dibujar antorchas, velas y entidades)

  drawTiles(W,H,cam);
  drawTorches(W,H,cam);

  if(!G.p) return;
  const p=G.p, cx=W/2-cam.x+(G.shakeX||0), cy=H/2-cam.y+(G.shakeY||0);

  // Blood splats (floor level) — manchas que se asientan
  for(const b of G.bloodSplats){
    const sx=b.x+cx,sy=b.y+cy;
    const a=b.moving!==false?(b.life/b.ml*.8):(b.life/b.ml*.55);
    ctx.globalAlpha=Math.max(0,a);
    if(b.moving!==false){
      ctx.shadowColor=b.col; ctx.shadowBlur=4;
    }
    ctx.fillStyle=b.col;
    const sz=b.moving!==false?b.sz*.5:b.sz*.8;
    ctx.beginPath();ctx.arc(sx,sy,sz,0,PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
  }

  // Manos espectrales del Necromancer (conos + onda circular)
  G.spectralFX.forEach(fx=>{
    const t=fx.life/fx.ml;
    const sx=fx.x+cx, sy=fx.y+cy;
    ctx.save();
    if(fx.type==='cone'){
      // Cono de daño — relleno translúcido + borde
      ctx.globalAlpha=t*.35;
      ctx.fillStyle='#44ffaa';
      // el blur sobre un sector tan grande es muy caro (y con 4-8 conos a la vez, peor): solo con pocos conos activos
      if(G.spectralFX.length<=2){ ctx.shadowColor='#44ffaa'; ctx.shadowBlur=14; }
      ctx.beginPath();
      ctx.moveTo(sx,sy);
      ctx.arc(sx,sy,fx.range*(0.9+(1-t)*.25),fx.ang-fx.half,fx.ang+fx.half);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha=t*.6;
      ctx.strokeStyle='#88ffcc'; ctx.lineWidth=1.5;
      ctx.stroke();

      // Mano espectral fantasmal en la punta del cono
      const handDist=fx.range*0.7;
      const hx=sx+Math.cos(fx.ang)*handDist, hy=sy+Math.sin(fx.ang)*handDist;
      ctx.globalAlpha=t*.85;
      ctx.save();
      ctx.translate(hx,hy); ctx.rotate(fx.ang);
      ctx.shadowColor='#44ffaa'; ctx.shadowBlur=10;
      ctx.fillStyle='rgba(150,255,200,.7)';
      // Palma
      ctx.beginPath(); ctx.ellipse(0,0,9,12,0,0,PI*2); ctx.fill();
      // Dedos — 4 garras extendidas hacia adelante
      ctx.strokeStyle='rgba(150,255,200,.8)'; ctx.lineWidth=2.2; ctx.lineCap='round';
      for(let i=-1.5;i<=1.5;i++){
        ctx.beginPath();
        ctx.moveTo(i*4,-6);
        ctx.lineTo(i*5,-16-Math.abs(i)*2);
        ctx.stroke();
      }
      // Pulgar
      ctx.beginPath(); ctx.moveTo(-8,2); ctx.lineTo(-13,6); ctx.stroke();
      ctx.restore();
    } else if(fx.type==='circle'){
      // Onda circular — nivel 5
      ctx.globalAlpha=t*.4;
      ctx.strokeStyle='#44ffaa'; ctx.lineWidth=4*t+1;
      // sin shadowBlur (círculo enorme): brillo falso con un trazo ancho y tenue debajo del anillo
      ctx.save(); ctx.globalAlpha=t*.16; ctx.lineWidth=10*t+4;
      ctx.beginPath(); ctx.arc(sx,sy,fx.range*(1-t*.1),0,PI*2); ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(sx,sy,fx.range*(1-t*.1),0,PI*2);
      ctx.stroke();
      ctx.shadowBlur=0;
      ctx.globalAlpha=t*.15;
      ctx.fillStyle='#44ffaa';
      ctx.beginPath(); ctx.arc(sx,sy,fx.range*(1-t*.1),0,PI*2); ctx.fill();
      // 8 manos espectrales orbitando el círculo
      for(let i=0;i<8;i++){
        const ang=(i/8)*PI*2;
        const hx=sx+Math.cos(ang)*fx.range*.85, hy=sy+Math.sin(ang)*fx.range*.85;
        ctx.save();
        ctx.globalAlpha=t*.7;
        ctx.translate(hx,hy); ctx.rotate(ang);
        ctx.shadowBlur=0;
        ctx.fillStyle='rgba(150,255,200,.6)';
        ctx.beginPath(); ctx.ellipse(0,0,7,9,0,0,PI*2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  });

  // Rayos (mejora RAYO): zigzag desde el cielo hasta el enemigo + destello de impacto
  for(const fx of G.lightningFX){
    if(fx.delay>0) continue;
    const t=fx.life/fx.ml;
    const tx=(fx.target&&fx.target.alive?fx.target.x:fx.x)+cx, ty=(fx.target&&fx.target.alive?fx.target.y:fx.y)+cy;
    const topY=ty-260;
    ctx.save();
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowColor='#7fd4ff'; ctx.shadowBlur=18;
    // forma del rayo estable durante su vida (semilla fija)
    let sd=fx.seed;
    const rnd=()=>{sd=(sd*9301+49297)%233280; return sd/233280;};
    const pts=[[tx+(rnd()-.5)*30,topY]];
    const segs=9;
    for(let i=1;i<segs;i++){
      pts.push([tx+(rnd()-.5)*34*(1-i/segs*.6), topY+(ty-topY)*i/segs]);
    }
    pts.push([tx,ty]);
    const path=()=>{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));};
    ctx.globalAlpha=t*.55; ctx.strokeStyle='#4aa8ff'; ctx.lineWidth=9*t+2; path(); ctx.stroke();
    ctx.globalAlpha=t; ctx.strokeStyle='#e8f8ff'; ctx.lineWidth=3*t+1; path(); ctx.stroke();
    // destello en el punto de impacto
    ctx.globalAlpha=t*.6; ctx.fillStyle='#bfeaff';
    ctx.beginPath(); ctx.arc(tx,ty,10+(1-t)*22,0,PI*2); ctx.fill();
    ctx.restore();
  }

  // Anillo de destello de la división de los orbes del Mago
  for(const sf of G.splitFx){
    const t=sf.life/.28, r=7+(1-t)*26;
    ctx.save(); ctx.globalAlpha=t*.85; ctx.strokeStyle='#f0c8ff'; ctx.lineWidth=1+t*2.5;
    ctx.beginPath(); ctx.arc(sf.x+cx,sf.y+cy,r,0,PI*2); ctx.stroke();
    ctx.globalAlpha=t*.9; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(sf.x+cx,sf.y+cy,3*t+1,0,PI*2); ctx.fill();
    ctx.restore();
  }
  // Melee ring — anillo expansivo con glow
  for(const ef of G.meleeEff){
    const sx=ef.x+cx,sy=ef.y+cy;
    const t=ef.life/.22;
    const r=ef.range*(1.0+(1-t)*.18); // expande ligeramente al desvanecerse
    ctx.save();
    // Relleno interior tenue
    ctx.globalAlpha=t*.12;
    ctx.fillStyle=ef.col;
    ctx.beginPath();ctx.arc(sx,sy,r,0,PI*2);ctx.fill();
    // Anillo principal con glow
    ctx.strokeStyle=ef.col;
    if(ef.range>220){
      // anillo grande: el shadowBlur sobre un círculo así de grande es carísimo; brillo falso con un trazo ancho y tenue
      ctx.globalAlpha=t*.18; ctx.lineWidth=9+t*6;
      ctx.beginPath();ctx.arc(sx,sy,r,0,PI*2);ctx.stroke();
    } else { ctx.shadowColor=ef.col; ctx.shadowBlur=10+t*8; }
    ctx.globalAlpha=t*.8;
    ctx.lineWidth=2+t*2.5;
    ctx.beginPath();ctx.arc(sx,sy,r,0,PI*2);ctx.stroke();
    // Anillo exterior más tenue
    ctx.globalAlpha=t*.3;
    ctx.shadowBlur=0;
    ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(sx,sy,r*1.12,0,PI*2);ctx.stroke();
    ctx.restore();
  }

  // Huesos enterrados (Yoko)
  G.bones.forEach(b=>{
    const sx=b.x+cx, sy=b.y+cy;
    const bobY=Math.sin(b.bob)*2;
    const fade = Math.min(1,b.life/BONE_FADE_TIME); // 1 mientras dura, baja lentamente a 0 en la fase final
    ctx.save();
    ctx.globalAlpha=fade;
    // Halo dorado
    ctx.shadowColor='#ffcc66'; ctx.shadowBlur=12;
    ctx.globalAlpha*=0.25;
    ctx.fillStyle='#ffcc66';
    ctx.beginPath(); ctx.arc(sx,sy,12,0,PI*2); ctx.fill();
    ctx.globalAlpha=fade;
    // Hueso pixelado simple
    ctx.shadowBlur=6;
    ctx.fillStyle='#f0e0c0';
    ctx.save(); ctx.translate(sx,sy+bobY);
    ctx.fillRect(-7,-2,14,4);
    ctx.beginPath(); ctx.arc(-7,-2,2.5,0,PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-7,2,2.5,0,PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7,-2,2.5,0,PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7,2,2.5,0,PI*2); ctx.fill();
    ctx.restore();
    ctx.restore();
  });

  // XP orbs — diamante con glow y estela
  // Los orbes ya no caducan, pueden acumularse: solo se dibujan los visibles y el glow (shadowBlur, caro) solo si hay pocos
  const orbVis=[];
  for(const o of G.orbs){ const sx=o.x+cx, sy=o.y+cy; if(sx<-40||sx>W+40||sy<-40||sy>H+40) continue; orbVis.push(o); }
  const orbGlow=orbVis.length<=50;
  for(const o of orbVis){
    const sx=o.x+cx,sy=o.y+cy;
    const pulse=Math.sin(o.pulse)*2;
    const xm=p.up.xpm;
    const gc=o.gold?'#ffcc33':xm>2?'#ccff00':xm>1?'#aaff44':'#44ff88';
    // al ser recogido: se encoge y se desvanece mientras vuela hacia el héroe
    const tk=o.taken?Math.min(1,o.tt/ORB_FLY_TIME):0;
    const r=(4+pulse*.3)*(1-.7*tk), oa=1-.6*tk*tk;
    ctx.save();
    // Halo exterior
    if(orbGlow){ ctx.shadowColor=gc; ctx.shadowBlur=14+pulse; }
    ctx.globalAlpha=0.35*oa;
    ctx.fillStyle=gc;
    ctx.beginPath(); ctx.arc(sx,sy,r*2.2,0,PI*2); ctx.fill();
    ctx.globalAlpha=oa;
    // Forma diamante
    if(o.gold&&COIN_OK){   // moneda de oro: sprite girando
      const fr=Math.floor(((o.pulse%(PI*2)+PI*2)%(PI*2))/(PI*2)*9)%9, sz=22*(1-.7*tk);
      ctx.shadowBlur=0; ctx.drawImage(COIN_IMG,fr*32,0,32,32,sx-sz/2,sy-sz/2,sz,sz);
      ctx.restore(); continue;
    }
    ctx.beginPath();
    if(o.gold){ ctx.arc(sx,sy,r*1.15,0,PI*2); }   // moneda de oro: círculo
    else{
    ctx.moveTo(sx, sy-r*1.4);
    ctx.lineTo(sx+r, sy);
    ctx.lineTo(sx, sy+r*1.4);
    ctx.lineTo(sx-r, sy);
    ctx.closePath(); }
    ctx.fillStyle=gc; ctx.fill();
    // Brillo interior
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(sx-r*.2,sy-r*.3,r*.28,0,PI*2); ctx.fill();
    ctx.restore();
  }

  // Arquero: trampas, marcas de lluvia y flechas clavadas (capa de suelo, bajo los enemigos)
  drawArcherGround(cx,cy);

  // Projectile trails + bullets
  for(const pr of G.projs){
    // Trail
    for(let i=0;i<(pr.arrow?0:pr.trail.length);i++){ // las flechas dibujan su propia estela
      const t=pr.trail[i];
      const sx=t.x+cx,sy=t.y+cy;
      const a=(i/pr.trail.length)*.5;
      ctx.globalAlpha=a;
      ctx.fillStyle=pr.isCrit?'#ff6600':pr.col;
      const r=(i/pr.trail.length)*pr.sz*.7;
      ctx.beginPath();ctx.arc(sx,sy,r,0,PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Flecha del Arquero
    if(pr.arrow){
      const ax=pr.x+cx, ay=pr.y+cy, ang=Math.atan2(pr.vy,pr.vx);
      ctx.save();
      // estela corta
      if(pr.trail.length>1){
        const t0=pr.trail[Math.max(0,pr.trail.length-4)];
        ctx.globalAlpha=.35; ctx.strokeStyle=pr.isCrit?'#ffaa33':'#e6dcb4'; ctx.lineWidth=1.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(t0.x+cx,t0.y+cy); ctx.lineTo(ax,ay); ctx.stroke(); ctx.globalAlpha=1;
      }
      ctx.translate(ax,ay); ctx.rotate(ang);
      if(pr.charged){ ctx.scale(1.5,1.5); ctx.shadowColor='#ffd34d'; ctx.shadowBlur=16; }
      else if(pr.ambush){ ctx.scale(1.25,1.25); ctx.shadowColor='#9cff7a'; ctx.shadowBlur=14; }
      else if(pr.isCrit){ ctx.shadowColor='#ff8800'; ctx.shadowBlur=12; }
      ctx.strokeStyle=pr.charged?'#ffe08a':'#b8925a'; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-11,0); ctx.lineTo(6,0); ctx.stroke();                 // astil
      ctx.fillStyle=pr.isCrit?'#ffdd66':'#dfe6ee';
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(5,-3); ctx.lineTo(5,3); ctx.closePath(); ctx.fill(); // punta
      ctx.strokeStyle='#8bc34a'; ctx.lineWidth=1.5;                                      // plumas
      ctx.beginPath(); ctx.moveTo(-11,0); ctx.lineTo(-14,-3); ctx.moveTo(-11,0); ctx.lineTo(-14,3);
      ctx.moveTo(-8,0); ctx.lineTo(-11,-3); ctx.moveTo(-8,0); ctx.lineTo(-11,3); ctx.stroke();
      ctx.restore();
      continue;
    }
    // Bullet
    const sx=pr.x+cx,sy=pr.y+cy;
    ctx.save();
    if(pr.isCrit){
      ctx.shadowColor='#ff8800'; ctx.shadowBlur=16;
      ctx.fillStyle='#ffcc00';
      ctx.beginPath();ctx.arc(sx,sy,pr.sz,0,PI*2);ctx.fill();
      ctx.fillStyle='#fff'; ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(sx-1,sy-1,2,0,PI*2);ctx.fill();
    }else{
      ctx.shadowColor=pr.col; ctx.shadowBlur=8;
      ctx.fillStyle=pr.col;
      ctx.beginPath();ctx.arc(sx,sy,pr.sz*.8,0,PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.5)';
      ctx.beginPath();ctx.arc(sx-1,sy-1,1.5,0,PI*2);ctx.fill();
    }
    ctx.restore();
  }

  // Enemigos, jefe, Lilith, esqueletos, esclavos y héroe: una sola pasada ordenada por y (el de más abajo tapa al de más arriba)
  drawDepthSorted(cx,cy,W,H,p,cam);
  drawThrallProjs(cx,cy);
  if(FX_HIGH) drawLibraryFronts(W,H,cam); // zócalo y sombra de las paredes por encima de las entidades (oclusión)
  // Arquero: flechas de la lluvia cayendo, explosiones de trampas y shurikens (por encima de los enemigos)
  drawArcherAir(cx,cy);

  // Proyectiles enemigos (warlock) — orbes cyan con trail
  G.eProjs.forEach(pr=>{
    // Trail
    if(pr.trail){
      for(let i=0;i<pr.trail.length;i++){
        const tp=pr.trail[i];
        ctx.globalAlpha=(i/pr.trail.length)*.35;
        ctx.fillStyle=pr.col;
        ctx.beginPath(); ctx.arc(tp.x+cx,tp.y+cy,(i/pr.trail.length)*3.5,0,PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    const px=pr.x+cx, py=pr.y+cy;
    ctx.save();
    ctx.shadowColor=pr.col; ctx.shadowBlur=14;
    ctx.globalAlpha=0.28;
    ctx.fillStyle=pr.col;
    ctx.beginPath(); ctx.arc(px,py,8,0,PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='#aaffff';
    ctx.beginPath(); ctx.arc(px,py,4,0,PI*2); ctx.fill();
    ctx.fillStyle='#ffffff'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(px-1,py-1,1.5,0,PI*2); ctx.fill();
    ctx.restore();
  });

  // Boss projectiles — orbes oscuros con trail
  G.bossProjs.forEach(pr=>{
    const px=pr.x+cx, py=pr.y+cy;
    // Trail de desvanecimiento
    if(pr.trail){
      for(let i=0;i<pr.trail.length;i++){
        const t=pr.trail[i];
        const ta=(i/pr.trail.length)*.4;
        ctx.globalAlpha=ta;
        ctx.fillStyle='#7744cc';
        ctx.beginPath(); ctx.arc(t.x+cx,t.y+cy,(i/pr.trail.length)*4,0,PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    ctx.save();
    // Halo exterior pulsante
    const phase=G.boss?G.boss.phase:1;
    const hcol=phase===3?'#ff4400':phase===2?'#cc44ff':'#aa88ff';
    ctx.shadowColor=hcol; ctx.shadowBlur=18;
    ctx.globalAlpha=0.3;
    ctx.fillStyle=hcol;
    ctx.beginPath(); ctx.arc(px,py,10,0,PI*2); ctx.fill();
    ctx.globalAlpha=1;
    // Núcleo
    ctx.fillStyle='#e8d8ff';
    ctx.beginPath(); ctx.arc(px,py,5,0,PI*2); ctx.fill();
    // Brillo
    ctx.shadowBlur=0;
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(px-1.5,py-1.5,1.8,0,PI*2); ctx.fill();
    ctx.restore();
  });

  // Particles — círculos con glow
  // shadowBlur es lo más caro del canvas: el glow solo se dibuja mientras hay pocas partículas
  const partGlow=G.parts.length<140;
  ctx.save();
  for(const pt of G.parts){
    const sx=pt.x+cx,sy=pt.y+cy;
    const a=clamp(pt.life/pt.ml,0,1);
    ctx.globalAlpha=a;
    ctx.fillStyle=pt.col;
    if(partGlow){ ctx.shadowColor=pt.col; ctx.shadowBlur=pt.sz*2; }
    ctx.beginPath(); ctx.arc(sx,sy,pt.sz*.6,0,PI*2); ctx.fill();
    if(partGlow){
      ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.shadowBlur=0;
      ctx.beginPath(); ctx.arc(sx-pt.sz*.15,sy-pt.sz*.15,pt.sz*.18,0,PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // Iluminación dinámica: sobre todo el mundo, bajo los números de daño y los efectos de pantalla
  if(FX_HIGH){ collectEntityLights(cx,cy,W,H,p); drawLighting(W,H); }

  // Damage numbers — escalados y con sombra
  for(const d of G.dmgNums){
    const sx=d.x+cx,sy=d.y+cy;
    const a=clamp(d.life/d.ml,0,1);
    const scale=1+(1-a)*.3; // crece un poco al aparecer
    ctx.save();
    ctx.globalAlpha=a;
    ctx.translate(sx,sy);
    ctx.scale(scale,scale);
    if(d.isText){
      const sz=Math.min(20,14)|0;
      ctx.font=`bold ${sz}px 'Courier New'`;
      ctx.shadowColor='#44ffaa'; ctx.shadowBlur=16;
      ctx.fillStyle='#aaffcc';
      const tw=ctx.measureText(d.dmg).width;
      ctx.fillStyle='rgba(0,0,0,.6)';
      ctx.fillText(d.dmg, -tw/2+1, 1);
      ctx.fillStyle='#44ffaa';
      ctx.fillText(d.dmg, -tw/2, 0);
    }else if(d.isCrit){
      const sz=Math.min(28,16+Math.log10(d.dmg+1)*6)|0;
      ctx.font=`bold ${sz}px 'Courier New'`;
      ctx.shadowColor='#ff6600'; ctx.shadowBlur=18;
      ctx.fillStyle='#ffcc00';
      const tw=ctx.measureText('CRIT! '+d.dmg).width;
      // Sombra oscura detrás
      ctx.fillStyle='rgba(0,0,0,.6)';
      ctx.fillText('CRIT! '+d.dmg, -tw/2+1, 1);
      ctx.fillStyle='#ffcc00';
      ctx.fillText('CRIT! '+d.dmg, -tw/2, 0);
      // Brillo blanco encima
      ctx.fillStyle='rgba(255,255,200,.4)';
      ctx.fillText('CRIT! '+d.dmg, -tw/2, -1);
    }else{
      const sz=Math.min(18,11+Math.log10(d.dmg+1)*3)|0;
      ctx.font=`bold ${sz}px 'Courier New'`;
      ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=4;
      ctx.fillStyle='#ffffff';
      const tw=ctx.measureText(d.dmg).width;
      ctx.fillStyle='rgba(0,0,0,.5)';
      ctx.fillText(d.dmg, -tw/2+1, 1);
      ctx.fillStyle='#ffffff';
      ctx.fillText(d.dmg, -tw/2, 0);
    }
    ctx.restore();
  }

  // Damage vignette (bitmap cacheado: el gradiente ya no se recrea cada frame)
  if(p.dmgF>0){
    ctx.globalAlpha=Math.min(1,p.dmgF/.15*.5);
    ctx.drawImage(_vigBitmap('red',W,H),0,0);
    ctx.globalAlpha=1;
  }
  // Poca vida (FX_HIGH): borde rojo que late; más fuerte y más rápido cuanto menos vida queda
  if(FX_HIGH){
    const hr=p.hp/p.mhp;
    if(hr<LOWHP_PULSE){
      const k=1-hr/LOWHP_PULSE;
      ctx.globalAlpha=Math.max(0,k*(.2+.14*Math.sin(G.time*(4+6*k))));
      ctx.drawImage(_vigBitmap('red',W,H),0,0);
      ctx.globalAlpha=1;
    }
  }

  // Level up flash
  if(G.lvlUpFlash>0){
    const lfa=G.lvlUpFlash;
    ctx.save();
    ctx.globalAlpha=lfa*.45;
    const lvg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.6);
    lvg.addColorStop(0,'rgba(255,220,0,1)');
    lvg.addColorStop(0.5,'rgba(255,160,0,.5)');
    lvg.addColorStop(1,'rgba(255,100,0,0)');
    ctx.fillStyle=lvg; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  // Permanent vignette (bitmap cacheado)
  ctx.drawImage(_vigBitmap('dark',W,H),0,0);

  // Boss announcement overlay
  if(G.bossAnnounce>0){
    const aAlpha=Math.min(1,G.bossAnnounce)*Math.min(1,(3.5-G.bossAnnounce)*4);
    ctx.save();
    ctx.globalAlpha=Math.max(0,aAlpha);
    // Fondo rojo pulsante
    const pulse=Math.sin(G.time*8)*.08+.18;
    ctx.fillStyle=`rgba(80,0,0,${pulse})`;
    ctx.fillRect(0,0,W,H);
    // Texto principal
    ctx.shadowColor='#ff4400'; ctx.shadowBlur=40;
    ctx.fillStyle='#ff6622';
    ctx.font=`bold ${Math.floor(W*.055)}px Courier New`;
    ctx.textAlign='center';
    ctx.fillText('☠ REY LICHE ☠', W/2, H/2-20);
    ctx.shadowBlur=0;
    ctx.fillStyle='#c8a060';
    ctx.font=`${Math.floor(W*.022)}px Courier New`;
    ctx.fillText('EL SEÑOR DE LOS MUERTOS DESPIERTA', W/2, H/2+18);
    ctx.textAlign='left';
    ctx.restore();
  }

  // Lilith, Hija del Odio — announcement overlay (aparece al minuto 8, es inmortal)
  if(G.lilithAnnounce>0){
    const aAlpha=Math.min(1,G.lilithAnnounce)*Math.min(1,(4.0-G.lilithAnnounce)*4);
    ctx.save();
    ctx.globalAlpha=Math.max(0,aAlpha);
    const pulse=Math.sin(G.time*10)*.1+.22;
    ctx.fillStyle=`rgba(20,0,0,${pulse})`;
    ctx.fillRect(0,0,W,H);
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=50;
    ctx.fillStyle='#dd1111';
    ctx.font=`bold ${Math.floor(W*.048)}px Courier New`;
    ctx.textAlign='center';
    ctx.fillText('☠ LILITH, HIJA DEL ODIO ☠', W/2, H/2-20);
    ctx.shadowBlur=0;
    ctx.fillStyle='#999999';
    ctx.font=`${Math.floor(W*.022)}px Courier New`;
    ctx.fillText('ES INMORTAL. NO PODRÁS DETENERLO.', W/2, H/2+18);
    ctx.textAlign='left';
    ctx.restore();
  }

  // Enemy swarm warning
  if(G.enemies.length>35){
    const a=Math.sin(G.time*6)*.3+.4;
    ctx.fillStyle=`rgba(200,40,40,${a})`;
    ctx.font='11px Courier New';
    ctx.fillText(`⚠ ${G.enemies.length} ENEMIGOS`,10,H-16);
  }
}

