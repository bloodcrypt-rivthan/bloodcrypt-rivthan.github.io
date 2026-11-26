// Blood Crypt — piso, fondo cacheado, niebla, biblioteca y candelabros. El orden de carga está en index.html (ver CLAUDE.md).
// ─── TILE RENDERER ────────────────────────────────────────────────────────────
const WALL_TOP_Y  = -RH/2 * TILE;          // world Y of top wall face
const WALL_BOT_Y  =  RH/2 * TILE;          // world Y of bottom wall face
const WALL_H_PX   = 80;                    // visual wall thickness in pixels

// ─── CACHÉ DEL FONDO ──────────────────────────────────────────────────────────
// El piso y las estanterías son estáticos (solo dependen de la posición en el mundo), así que se
// pre-renderizan en tramos de BG_CW px y cada frame solo se copian con drawImage. Lo animado (velas,
// antorchas, niebla) sigue dibujándose cada frame. El fondo se posiciona con la cámara redondeada a
// píxel entero (evita el desenfoque de copiar un canvas en posiciones fraccionarias).
const BG_CW=960;                 // ancho de cada tramo: múltiplo de TILE (32), plankW (48) y shelfSpacing (96)
const BG_FLOOR_Y0=-RH/2*TILE;    // y de mundo donde empieza el piso visible (entre las dos estanterías)
const BG_FLOOR_H=RH*TILE;
const PARALLAX_BG=.08;            // la pared trasera se mueve un 8% menos que los estantes (0 = sin paralaje)
const BG_DEPTH=110;              // grosor de cada banda de estanterías
const BG_PAD_IN=40, BG_PAD_OUT=8;// margen del tramo de banda hacia el pasillo / hacia afuera (objetos que sobresalen)
const BG_BAND_H=BG_PAD_IN+BG_DEPTH+BG_PAD_OUT;
const BOOK_PAL=[
  '#5a2e0a','#3d1e08','#6b3810','#4a2412',
  '#2a3d1a','#1e2e12','#354a20','#263514',
  '#5e1a10','#4a1208','#6e2218','#3e0e08',
  '#2a2010','#1e1808','#322818','#281a0a',
  '#3e2e08','#4a3a10','#2e2208','#362a0e',
];
const _bgCache=new Map();
// Devuelve el tramo cacheado; si no existe, lo dibuja redirigiendo el ctx global a un canvas nuevo
function _bgChunk(key,k,w,h,build){
  let e=_bgCache.get(key);
  if(!e){
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const main=ctx; ctx=c.getContext('2d');
    try{ build(); } finally { ctx=main; }
    e={c,k,lay:key.replace(/-?\d+$/,'')}; _bgCache.set(key,e);
  }
  return e.c;
}
// Rango de tramos visibles de cada capa en este frame (cada capa tiene el suyo: la pared trasera va desplazada por el paralaje)
const _bgUse={};
function _bgUseRange(lay,lo,hi){ _bgUse[lay]=[lo,hi]; }
// Descarta los tramos que quedaron lejos de la cámara (deja uno de margen a cada lado, por capa)
function _bgEvict(){
  for(const [key,e] of _bgCache){ const r=_bgUse[e.lay]; if(r&&(e.k<r[0]-1||e.k>r[1]+1)) _bgCache.delete(key); }
}

function _drawTileAt(tx,ty,sx,sy){
      const t=getTile(tx,ty);
      ctx.fillStyle=TPAL[t]; ctx.fillRect(sx,sy,TILE+1,TILE+1);
      if(t===0){
        const seed=(tx*7+ty*13)&3;
        const seed2=(tx*31+ty*17)%100;
        // Base de losa con variación de tono
        ctx.fillStyle=TFLO[seed]; ctx.fillRect(sx+8,sy+8,12,12);
        ctx.fillRect(sx+2,sy+20,6,6);
        if((tx*3+ty*5)%11===0){ctx.fillStyle='#141110';ctx.fillRect(sx+18,sy+4,8,8);}

        // Líneas de junta de losa (más marcadas, estilo piedra cortada)
        ctx.fillStyle='#100d0a';
        ctx.fillRect(sx,sy,TILE,1); ctx.fillRect(sx,sy,1,TILE);
        ctx.fillStyle='rgba(255,255,255,.025)';
        ctx.fillRect(sx,sy+1,TILE,1); ctx.fillRect(sx+1,sy,1,TILE);

        // Grietas finas ocasionales (1 de cada ~9 losas)
        if(seed2<11){
          ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=0.8;
          const cx0=sx+6+((tx*13)%20), cy0=sy+6+((ty*7)%20);
          ctx.beginPath();
          ctx.moveTo(cx0,cy0);
          ctx.lineTo(cx0+((tx%2)?5:-4),cy0+6);
          ctx.lineTo(cx0+((tx%3)?8:-3),cy0+10);
          ctx.stroke();
        }
        // Manchas de humedad/musgo oscuro (raras)
        else if(seed2<16){
          ctx.fillStyle='rgba(20,40,15,.22)';
          ctx.beginPath();
          ctx.ellipse(sx+TILE*.5,sy+TILE*.5,7,4,((tx+ty)%2)*1.4,0,PI*2);
          ctx.fill();
        }
        // Charco pequeño con leve brillo (muy raro)
        else if(seed2<19){
          ctx.fillStyle='rgba(10,15,20,.4)';
          ctx.beginPath();
          ctx.ellipse(sx+TILE*.5,sy+TILE*.55,9,5,0,0,PI*2);
          ctx.fill();
          ctx.fillStyle='rgba(150,180,220,.08)';
          ctx.beginPath();
          ctx.ellipse(sx+TILE*.42,sy+TILE*.48,3,1.5,0,0,PI*2);
          ctx.fill();
        }
        // Manchas oscuras de sangre vieja resecas (poco frecuentes)
        else if(seed2<22){
          ctx.fillStyle='rgba(40,8,8,.18)';
          ctx.beginPath();
          ctx.ellipse(sx+TILE*.4,sy+TILE*.6,5,3,.6,0,PI*2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(sx+TILE*.6,sy+TILE*.45,3,2,.2,0,PI*2);
          ctx.fill();
        }
      }
      if(t===1){
        ctx.fillStyle='#38322a'; ctx.fillRect(sx,sy+TILE-6,TILE,6);
        ctx.fillStyle='#45403a';
        const bw=TILE/3;
        for(let i=0;i<3;i++){
          ctx.fillStyle=i%2===0?'#4a4438':'#42403a';
          ctx.fillRect(sx+i*bw+1,sy+3,bw-2,TILE-10);
        }
        ctx.fillStyle='#2a261e'; ctx.fillRect(sx,sy,TILE,3);
        ctx.fillStyle='#55504a'; ctx.fillRect(sx,sy+1,TILE,1);
      }
      if(t===3){
        ctx.fillStyle='#2a2016'; ctx.fillRect(sx,sy,6,TILE);
        const bookColors=['#7a3c11','#5a2a0a','#8b4513','#6b3010','#993d15'];
        for(let i=0;i<4;i++){
          ctx.fillStyle=bookColors[(tx+i)%bookColors.length];
          ctx.fillRect(sx+1,sy+2+i*7,4,6);
          ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(sx+1,sy+2+i*7,4,1);
        }
      }
}

function drawTiles(W,H,cam){
  const ox=Math.round(W/2-cam.x), oy=Math.round(H/2-cam.y);
  const k0=Math.floor(-ox/BG_CW), k1=Math.floor((W-1-ox)/BG_CW);
  const tpc=BG_CW/TILE, ty0=BG_FLOOR_Y0/TILE;
  for(let k=k0;k<=k1;k++){
    const c=_bgChunk('f'+k,k,BG_CW,BG_FLOOR_H,()=>{
      ctx.lineCap='round'; // el original lo dejaba en 'round' (la escalera de la biblioteca no restauraba el estado)
      for(let ty=ty0;ty<ty0+RH;ty++) for(let tx=k*tpc;tx<(k+1)*tpc;tx++) _drawTileAt(tx,ty,(tx-k*tpc)*TILE,(ty-ty0)*TILE);
    });
    ctx.drawImage(c,ox+k*BG_CW,oy+BG_FLOOR_Y0);
  }
  _bgUseRange('f',k0,k1);
  drawAmbientFog(W,H,cam);
  drawLibraryWalls(W,H,cam);
  _bgEvict();
}

// ─── NIEBLA AMBIENTAL ─────────────────────────────────────────────────────────
function drawAmbientFog(W,H,cam){
  const t=G.time||0;
  ctx.save();
  // 3 bancos de niebla que se desplazan lentamente, dan profundidad al suelo
  for(let i=0;i<3;i++){
    const speed=8+i*3;
    const fogX = ((cam.x*0.3 + t*speed + i*900) % 1400) - 700;
    const fogY = Math.sin(t*0.15+i*2)*40;
    const sx = fogX - cam.x + W/2 + cam.x;
    const sy = H/2 + fogY;
    const r = 220+i*60;
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
    g.addColorStop(0,`rgba(60,55,50,${0.025+i*.008})`);
    g.addColorStop(1,'rgba(60,55,50,0)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}

// ─── BIBLIOTECA GÓTICA ──────────────────────────────────────────────────────────
// Banda de estanterías, capa W (estática): pared trasera y tablones. Se copia con paralaje (PARALLAX_BG).
// Se dibuja en un tramo de W×H con la cámara en camX; innerSY es la y local del borde interior.
function _bandDrawW(isTop,W,H,camX,innerSY){
  const DEPTH=BG_DEPTH;
  const outerSY = isTop ? innerSY - DEPTH : innerSY + DEPTH;
  const topSY   = isTop ? outerSY : innerSY;
  const botSY   = isTop ? innerSY : outerSY;
    // ── 1. Pared trasera de madera oscura ────────────────────────────────────
    const wallGrad=ctx.createLinearGradient(0,topSY,0,botSY);
    if(isTop){
      wallGrad.addColorStop(0,'#080604'); wallGrad.addColorStop(0.6,'#120e08'); wallGrad.addColorStop(1,'#1c1409');
    } else {
      wallGrad.addColorStop(0,'#1c1409'); wallGrad.addColorStop(0.4,'#120e08'); wallGrad.addColorStop(1,'#080604');
    }
    ctx.fillStyle=wallGrad; ctx.fillRect(0,topSY,W,botSY-topSY);

    // ── 2. Tablones de roble oscuro ──────────────────────────────────────────
    const plankW=48;
    const plankShades=['#1c1208','#1a100a','#1e1409','#180e07','#201508','#1b1108'];
    const sPK=Math.floor((camX-W/2)/plankW)-1, ePK=Math.ceil((camX+W/2)/plankW)+1;
    for(let wp=sPK;wp<=ePK;wp++){
      const px=wp*plankW-camX+W/2;
      const ps=(((wp*17)%6)+6)%6;
      ctx.fillStyle=plankShades[ps]; ctx.fillRect(px,topSY,plankW-1,botSY-topSY);
      ctx.fillStyle='rgba(255,200,120,.022)';
      ctx.fillRect(px+plankW*.3,topSY,1,botSY-topSY);
      ctx.fillRect(px+plankW*.65,topSY,1,botSY-topSY);
    }

}

// Banda de estanterías, capa S (estática): montantes, baldas y libros.
function _bandDrawS(isTop,W,H,camX,innerSY){
  const DEPTH=BG_DEPTH;
  const outerSY = isTop ? innerSY - DEPTH : innerSY + DEPTH;
  const topSY   = isTop ? outerSY : innerSY;
  const botSY   = isTop ? innerSY : outerSY;
  const shelfSpacing=96, bookPalette=BOOK_PAL;
  const sSH=Math.floor((camX-W/2)/shelfSpacing)-1, eSH=Math.ceil((camX+W/2)/shelfSpacing)+1;
  for(let wcol=sSH;wcol<=eSH;wcol++){
    const sx=wcol*shelfSpacing-camX+W/2;
    // wcol es el índice de columna anclado al MUNDO (igual que tx/ty en drawTiles):
    // usar SIEMPRE wcol (nunca una variable de loop screen-relative) para
    // cualquier patrón/decisión de decoración, así no "saltan" al caminar.
    const cseed=(((wcol*13)%7)+7)%7;
      // Montante lateral
      ctx.fillStyle='#2e1e08'; ctx.fillRect(sx,topSY,5,botSY-topSY);
      ctx.fillStyle='rgba(255,180,80,.06)'; ctx.fillRect(sx+1,topSY,2,botSY-topSY);
      ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(sx+shelfSpacing-5,topSY,5,botSY-topSY);

      // Filas de libros
      const numRows=Math.floor((botSY-topSY)/22);
      for(let row=0;row<numRows;row++){
        const rowY=isTop?botSY-(row+1)*22-4:topSY+row*22+4;
        if(rowY<topSY||rowY+18>botSY) continue;
        // Balda
        ctx.fillStyle='#3a2410'; ctx.fillRect(sx+4,rowY+17,shelfSpacing-8,3);
        ctx.fillStyle='rgba(255,180,80,.05)'; ctx.fillRect(sx+4,rowY+17,shelfSpacing-8,1);
        // Libros
        let bx=sx+6, bi=(((cseed+row*7+wcol*3)%bookPalette.length)+bookPalette.length)%bookPalette.length, bj=0;
        while(bx<sx+shelfSpacing-8){
          const bw=5+((bi*7+bj)%5), bh=12+((bi*3+row)%6);
          const bc=bookPalette[bi%bookPalette.length];
          ctx.fillStyle=bc; ctx.fillRect(bx,rowY+17-bh,bw,bh);
          // Detalles del lomo
          if(bw>6){ ctx.fillStyle='rgba(255,255,200,.07)'; ctx.fillRect(bx+1,rowY+17-bh+2,bw-2,1); }
          ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(bx,rowY+17-bh,bw,1);
          ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(bx+bw-1,rowY+17-bh,1,bh);
          // Libro sobresaliente
          if((bi+bj)%13===0){ ctx.fillStyle=bc; ctx.fillRect(bx,rowY+17-bh-2,bw,2); }
          // Cinta marcadora
          if((bi*3+bj)%31===0){
            ctx.fillStyle=bi%2===0?'#cc4422':'#224488';
            ctx.fillRect(bx+bw/2-0.5,rowY+17-2,1,5);
          }
          // Polvo
          if((bi+row)%5===0){ ctx.fillStyle='rgba(180,160,120,.10)'; ctx.fillRect(bx,rowY+17-bh,bw,1); }
          bx+=bw; bi=(bi+1)%bookPalette.length; bj++;
        }
      }

  }
}

// Banda de estanterías, capa B (estática): globo, libros apilados, pergamino, tintero, telarañas, escalera
function _bandDrawB(isTop,W,H,camX,innerSY){
  ctx.lineCap='round'; // el original lo dejaba en 'round' (la escalera no restauraba el estado)
  const DEPTH=BG_DEPTH;
  const outerSY = isTop ? innerSY - DEPTH : innerSY + DEPTH;
  const topSY   = isTop ? outerSY : innerSY;
  const botSY   = isTop ? innerSY : outerSY;
  const shelfSpacing=96, bookPalette=BOOK_PAL;
  const sSH=Math.floor((camX-W/2)/shelfSpacing)-1, eSH=Math.ceil((camX+W/2)/shelfSpacing)+1;
  for(let wcol=sSH;wcol<=eSH;wcol++){
    const sx=wcol*shelfSpacing-camX+W/2;
    // wcol es el índice de columna anclado al MUNDO (igual que tx/ty en drawTiles):
    // usar SIEMPRE wcol (nunca una variable de loop screen-relative) para
    // cualquier patrón/decisión de decoración, así no "saltan" al caminar.
    const cseed=(((wcol*13)%7)+7)%7;
    const objSeed=(((wcol*19+77)%100)+100)%100;
      // Globo terráqueo (raro)
      if(objSeed<12){
        const gx=sx+shelfSpacing*.5, gy=isTop?innerSY-20:innerSY+4;
        ctx.fillStyle='#2a3a28'; ctx.beginPath(); ctx.arc(gx,gy,5,0,PI*2); ctx.fill();
        ctx.fillStyle='#1e2e1e'; ctx.beginPath(); ctx.arc(gx-1,gy-1,4,0,PI*2); ctx.fill();
        ctx.strokeStyle='#4a6040'; ctx.lineWidth=.6;
        ctx.beginPath(); ctx.ellipse(gx,gy,5,1.5,0,0,PI*2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(gx,gy,1.5,5,0,0,PI*2); ctx.stroke();
        ctx.fillStyle='rgba(255,255,200,.12)'; ctx.beginPath(); ctx.arc(gx-1.5,gy-2,1.5,0,PI*2); ctx.fill();
        ctx.fillStyle='#3a2810'; ctx.fillRect(gx-1,gy+4,2,6); ctx.fillRect(gx-4,gy+9,8,2);
      }
      // Libros apilados en suelo de estantería
      else if(objSeed<45){
        const stx=sx+6+cseed*4, sty=isTop?innerSY-3:innerSY+1;
        for(let i=0;i<3;i++){
          const bc=bookPalette[(cseed+i*3)%bookPalette.length];
          ctx.fillStyle=bc; ctx.fillRect(stx,sty-(i+1)*(5-i),18+i*3,5-i);
          ctx.fillStyle='rgba(255,255,200,.06)'; ctx.fillRect(stx,sty-(i+1)*(5-i),18+i*3,1);
        }
      }
      // Pergamino
      else if(objSeed<60){
        const px2=sx+shelfSpacing*.4, py=isTop?innerSY-6:innerSY+2;
        ctx.fillStyle='#c8a870'; ctx.fillRect(px2,py,16,10);
        ctx.fillStyle='#b89860'; ctx.fillRect(px2+2,py+1,12,8);
        ctx.strokeStyle='rgba(40,20,0,.3)'; ctx.lineWidth=.5;
        for(let l=0;l<4;l++){ ctx.beginPath(); ctx.moveTo(px2+3,py+2+l*2); ctx.lineTo(px2+13,py+2+l*2); ctx.stroke(); }
        ctx.fillStyle='#a08050'; ctx.fillRect(px2-1,py,3,10); ctx.fillRect(px2+14,py,3,10);
      }
      // Tintero y pluma
      else if(objSeed<72){
        const tx3=sx+shelfSpacing*.6, ty3=isTop?innerSY-7:innerSY+1;
        ctx.fillStyle='#1a1a28'; ctx.beginPath(); ctx.ellipse(tx3,ty3+4,3,4,0,0,PI*2); ctx.fill();
        ctx.fillStyle='rgba(20,40,80,.6)'; ctx.beginPath(); ctx.ellipse(tx3,ty3+3,2,3,0,0,PI*2); ctx.fill();
        ctx.strokeStyle='#c8b870'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(tx3+2,ty3+6); ctx.bezierCurveTo(tx3+5,ty3,tx3+8,ty3-8,tx3+4,ty3-14); ctx.stroke();
      }

      // Telarañas (cada 4)
      if(wcol%4===0){
        const wx=sx+3, wy=isTop?topSY+3:botSY-3, wDir=isTop?1:-1;
        ctx.save(); ctx.globalAlpha=.14; ctx.strokeStyle='#a09080'; ctx.lineWidth=.5;
        for(let r=0;r<4;r++){ ctx.beginPath(); ctx.arc(wx,wy,4+r*6,0,PI/2); ctx.stroke(); }
        for(let a=0;a<5;a++){ const ang=(a/4)*(PI/2); ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(ang)*26,wy+Math.sin(ang)*26*wDir); ctx.stroke(); }
        ctx.restore();
      }
      // Escalera móvil (cada ~8)
      if(wcol%8===5){
        const lx=sx+shelfSpacing*.7;
        const ly1=isTop?topSY+2:botSY, ly2=innerSY;
        ctx.strokeStyle='#5a3c18'; ctx.lineWidth=2.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(lx-4,ly1); ctx.lineTo(lx-8,ly2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx+4,ly1); ctx.lineTo(lx+2,ly2); ctx.stroke();
        for(let s=0;s<5;s++){
          const sp=(s+1)/6;
          ctx.strokeStyle='#6a4c28'; ctx.lineWidth=1.8;
          ctx.beginPath(); ctx.moveTo(lx-4-4*sp,ly1*(1-sp)+ly2*sp); ctx.lineTo(lx+4-2*sp,ly1*(1-sp)+ly2*sp); ctx.stroke();
        }
      }
  }
}

// Candelabros de pared (animados): se dibujan cada frame entre las capas A y B
function _bandCandles(isTop,W,ox,innerSY,t){
  const shelfSpacing=96;
  const sSH=Math.floor(-ox/shelfSpacing)-1, eSH=Math.ceil((W-ox)/shelfSpacing)+1;
  for(let wcol=sSH;wcol<=eSH;wcol++){
    const sx=wcol*shelfSpacing+ox;
    const objY=isTop?innerSY-28:innerSY+6;
      // Candelabro de pared (cada 2 estanterías)
      if(wcol%2===0){
        const cx2=sx+shelfSpacing/2, cy2=objY;
        const fl=0.65+Math.sin(t*8.5+wcol*2.1)*0.2+Math.sin(t*13+wcol*1.7)*0.15;
        const r2=(28+fl*8)*1.0;
        if(FX_HIGH) addLight(cx2,cy2-6,90+fl*40,.85,null);
        const tg=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,r2);
        tg.addColorStop(0,`rgba(255,200,80,${.36*fl})`);
        tg.addColorStop(.4,`rgba(255,140,30,${.15*fl})`);
        tg.addColorStop(.8,`rgba(255,80,10,${.05*fl})`);
        tg.addColorStop(1,'rgba(255,60,0,0)');
        ctx.fillStyle=tg; ctx.fillRect(cx2-r2,cy2-r2,r2*2,r2*2);
        // Soporte
        ctx.fillStyle='#2a2018'; ctx.fillRect(cx2-3,cy2,6,8);
        ctx.fillRect(cx2-8,cy2+2,16,3);
        ctx.fillStyle='#3a3025'; ctx.fillRect(cx2-2,cy2+1,4,6);
        // Vela
        ctx.fillStyle='#e8e0d0'; ctx.fillRect(cx2-2,cy2-8,4,8);
        ctx.fillStyle='rgba(220,210,190,.6)'; ctx.beginPath(); ctx.ellipse(cx2,cy2,3,1.5,0,0,PI*2); ctx.fill();
        // Llama
        ctx.save(); ctx.shadowColor='#ff9900'; ctx.shadowBlur=10;
        const fh=6+fl*4;
        ctx.fillStyle=`rgba(255,200,50,${.88*fl})`;
        ctx.beginPath(); ctx.ellipse(cx2+Math.sin(t*9+wcol)*.6,cy2-8-fh*.35,2,fh*.5,0,0,PI*2); ctx.fill();
        ctx.fillStyle=`rgba(255,255,140,${.5*fl})`;
        ctx.beginPath(); ctx.ellipse(cx2,cy2-9-fh*.38,0.8,fh*.22,0,0,PI*2); ctx.fill();
        if(Math.sin(t*18+wcol*3.7)>0.92){ ctx.fillStyle='rgba(255,220,80,.8)'; ctx.beginPath(); ctx.arc(cx2+(Math.random()-.5)*3,cy2-8-fh-.5*Math.random(),.7,0,PI*2); ctx.fill(); }
        ctx.restore();
      }

  }
}

// Frente de la banda: zócalo y sombra sobre el pasillo. Con FX_HIGH se dibuja DESPUÉS de las entidades,
// así las que se acercan a la pared quedan oscurecidas por ella (oclusión) en vez de pintarse sobre su sombra.
function _bandFront(isTop,W,innerSY){
    // ── 5. Zócalo interior ───────────────────────────────────────────────────
    const baseH=8, baseY=isTop?innerSY-baseH:innerSY;
    ctx.fillStyle='#3a2410'; ctx.fillRect(0,baseY,W,baseH);
    ctx.fillStyle='rgba(255,180,80,.07)'; ctx.fillRect(0,isTop?baseY:baseY+baseH-1,W,1);
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(0,isTop?baseY+baseH-1:baseY,W,1);
    ctx.fillStyle='#2a1808'; ctx.fillRect(0,isTop?baseY-3:baseY+baseH,W,3);
    ctx.fillStyle='rgba(255,150,50,.04)'; ctx.fillRect(0,isTop?baseY-3:baseY+baseH,W,1);

    // ── 6. Sombra sobre el pasillo ───────────────────────────────────────────
    const shadowH=55;
    const sg=ctx.createLinearGradient(0,isTop?innerSY:innerSY-shadowH,0,isTop?innerSY+shadowH:innerSY);
    sg.addColorStop(0,'rgba(0,0,0,.70)');
    sg.addColorStop(0.45,'rgba(0,0,0,.22)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,isTop?innerSY:innerSY-shadowH,W,shadowH);

}

function drawLibraryWalls(W,H,cam){
  const t=G.time||0;
  const ox=Math.round(W/2-cam.x), oy=Math.round(H/2-cam.y);
  const k0=Math.floor(-ox/BG_CW), k1=Math.floor((W-1-ox)/BG_CW);

  function drawShelfBand(wallWorldY, isTop){
    const innerSY = wallWorldY + oy;
  const DEPTH=BG_DEPTH;
  const outerSY = isTop ? innerSY - DEPTH : innerSY + DEPTH;
  const topSY   = isTop ? outerSY : innerSY;
  const botSY   = isTop ? innerSY : outerSY;
    if(botSY<0||topSY>H) return;
    const loc = isTop ? BG_PAD_OUT+BG_DEPTH : BG_PAD_IN; // y local del borde interior dentro del tramo
    const tag = isTop ? 't' : 'b';

    // capa W (pared trasera): con efectos altos se desplaza un poco con la cámara (paralaje: está más lejos que los estantes)
    const sh = FX_HIGH ? Math.round(cam.x*PARALLAX_BG) : 0;
    const w0=Math.floor(-(ox+sh)/BG_CW), w1=Math.floor((W-1-ox-sh)/BG_CW);
    _bgUseRange(tag+'W',w0,w1); _bgUseRange(tag+'S',k0,k1); _bgUseRange(tag+'B',k0,k1);
    for(let k=w0;k<=w1;k++){
      const c=_bgChunk(tag+'W'+k,k,BG_CW,BG_BAND_H,()=>_bandDrawW(isTop,BG_CW,BG_BAND_H,k*BG_CW+BG_CW/2,loc));
      ctx.drawImage(c,ox+sh+k*BG_CW,innerSY-loc);
    }
    // capa S (estantes, cacheada)
    for(let k=k0;k<=k1;k++){
      const c=_bgChunk(tag+'S'+k,k,BG_CW,BG_BAND_H,()=>_bandDrawS(isTop,BG_CW,BG_BAND_H,k*BG_CW+BG_CW/2,loc));
      ctx.drawImage(c,ox+k*BG_CW,innerSY-loc);
    }
    // candelabros (animados)
    _bandCandles(isTop,W,ox,innerSY,t);
    // capa B (estática, cacheada)
    for(let k=k0;k<=k1;k++){
      const c=_bgChunk(tag+'B'+k,k,BG_CW,BG_BAND_H,()=>_bandDrawB(isTop,BG_CW,BG_BAND_H,k*BG_CW+BG_CW/2,loc));
      ctx.drawImage(c,ox+k*BG_CW,innerSY-loc);
    }
    // El original dejaba ctx.lineCap='round' al dibujar una escalera; se conserva para el resto del frame
    const sSH=Math.floor(-ox/96)-1, eSH=Math.ceil((W-ox)/96)+1;
    for(let wcol=sSH;wcol<=eSH;wcol++) if(wcol%8===5){ ctx.lineCap='round'; break; }

    if(!FX_HIGH) _bandFront(isTop,W,innerSY); // con efectos altos se dibuja tras las entidades (drawLibraryFronts)

    // ── 7. Negro absoluto exterior ────────────────────────────────────────────
    ctx.fillStyle='#050402';
    if(isTop) ctx.fillRect(0,0,W,topSY+2);
    else       ctx.fillRect(0,botSY-2,W,H-botSY+2);
  }

  drawShelfBand(WALL_TOP_Y, true);
  drawShelfBand(WALL_BOT_Y, false);
}

// Frentes de las bandas (zócalo + sombra) con efectos altos: se llama después de dibujar las entidades
function drawLibraryFronts(W,H,cam){
  const oy=Math.round(H/2-cam.y);
  for(const [wy,isTop] of [[WALL_TOP_Y,true],[WALL_BOT_Y,false]]){
    const innerSY=wy+oy;
    const outerSY=isTop?innerSY-BG_DEPTH:innerSY+BG_DEPTH;
    const topSY=isTop?outerSY:innerSY, botSY=isTop?innerSY:outerSY;
    if(botSY<0||topSY>H) continue;
    _bandFront(isTop,W,innerSY);
  }
}

// ─── CANDELABROS DE PIE (pasillo de biblioteca) ──────────────────────────────────
function drawTorches(W,H,cam){
  const t=G.time||0;
  for(const tr of TORCHES){
    const sx=tr.ox+Math.round(W/2-cam.x), sy=tr.oy+Math.round(H/2-cam.y); // misma cámara redondeada que el fondo cacheado
    if(sx<-100||sx>W+100) continue;
    const fl=0.6+Math.sin(t*8.5+tr.ph)*0.22+Math.sin(t*13+tr.ph*1.4)*0.14;
    const r=(34+fl*10)*tr.sz;
    if(FX_HIGH) addLight(sx,sy-20,(160+fl*70)*tr.sz,.9,null);
    // Glow cálido
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
    g.addColorStop(0,`rgba(255,200,80,${0.30*fl})`);
    g.addColorStop(0.4,`rgba(255,140,30,${0.12*fl})`);
    g.addColorStop(0.8,`rgba(200,80,10,${0.04*fl})`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(sx-r,sy-r,r*2,r*2);
    // Humo
    for(let i=0;i<2;i++){
      const sp=((t*0.3+tr.ph+i*2.0))%3.5;
      const sa=Math.max(0,0.08*(1-sp/3.5));
      ctx.fillStyle=`rgba(60,55,50,${sa})`;
      ctx.beginPath(); ctx.arc(sx+Math.sin(t*0.6+tr.ph+i)*3,sy-24-sp*10,1.5+sp,0,PI*2); ctx.fill();
    }
    // Pie de hierro forjado
    ctx.fillStyle='#1e1810'; ctx.fillRect(sx-7,sy+2,14,3);
    ctx.fillStyle='#2a2218'; ctx.fillRect(sx-5,sy+3,10,2);
    // Vástago
    ctx.fillStyle='#2a2218'; ctx.fillRect(sx-1.5,sy-24,3,26);
    ctx.fillStyle='rgba(255,200,100,.04)'; ctx.fillRect(sx-0.5,sy-24,1,26);
    // Brazo horizontal
    ctx.fillStyle='#2a2218';
    ctx.fillRect(sx-10,sy-18,20,2);
    ctx.fillRect(sx-7,sy-22,3,4); ctx.fillRect(sx+4,sy-22,3,4); ctx.fillRect(sx-1.5,sy-22,3,4);
    // 3 velas
    [-8,0,8].forEach((cx2,ci)=>{
      const fli=0.6+Math.sin(t*(8.5+ci*.7)+tr.ph+ci*2)*0.2;
      ctx.fillStyle='#e8e0d0'; ctx.fillRect(sx+cx2-1.5,sy-30,3,8);
      ctx.fillStyle='rgba(220,210,190,.5)'; ctx.beginPath(); ctx.ellipse(sx+cx2,sy-22,2.5,1,0,0,PI*2); ctx.fill();
      const fh=4+fli*3;
      ctx.save(); ctx.shadowColor='#ffaa20'; ctx.shadowBlur=8;
      ctx.fillStyle=`rgba(255,200,50,${0.88*fli})`;
      ctx.beginPath(); ctx.ellipse(sx+cx2+Math.sin(t*9+ci)*.4,sy-30-fh*.3,1.5,fh*.5,0,0,PI*2); ctx.fill();
      ctx.fillStyle=`rgba(255,255,140,${0.55*fli})`;
      ctx.beginPath(); ctx.ellipse(sx+cx2,sy-31-fh*.38,.8,fh*.22,0,0,PI*2); ctx.fill();
      ctx.restore();
    });
    // Reflejo en suelo
    ctx.save(); ctx.globalAlpha=0.06*fl;
    ctx.fillStyle='#cc8820';
    ctx.beginPath(); ctx.ellipse(sx,sy+5,14,4,0,0,PI*2); ctx.fill();
    ctx.restore();
  }
}

