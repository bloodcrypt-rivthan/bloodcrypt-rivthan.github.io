// Blood Crypt — dibujo de los enemigos comunes. El orden de carga está en index.html (ver CLAUDE.md).
// ─── ENEMY RENDERERS ──────────────────────────────────────────────────────────
function drawEnemy(e,cx,cy,W,H){
  if(!e.alive) return; // muerto este mismo frame (p.ej. por un rayo): se elimina de G.enemies en el próximo update
  const sx=e.x+cx, sy=e.y+cy;
  if(sx<-80||sx>W+80||sy<-80||sy>H+80) return;
  const wy=Math.sin(e.wb)*2.5, flash=e.fl>0, s=e.sz;

  // Ground shadow
  ctx.save();
  drawEnemyShadow(sx,sy,s,e.name);

  if(flash){ctx.shadowColor='#ffffff'; ctx.shadowBlur=20;}

  switch(e.name){
    case 'bat':      SPRITES.bat ? drawSpriteFrame(SPRITES.bat, SPRITE_CFG.bat, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.5+wy, e.facingLeft, flash) : drawBat(sx,sy,e,wy,flash,s);      break;
    case 'zombie':   SPRITES.zombie ? drawSpriteFrame(SPRITES.zombie, SPRITE_CFG.zombie, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.6+wy, e.facingLeft, flash) : drawZombie(sx,sy,e,wy,flash,s);   break;
    case 'skull':    SPRITES.skull ? drawSpriteFrame(SPRITES.skull, SPRITE_CFG.skull, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.8+wy, e.facingLeft, flash) : drawSkull(sx,sy,e,wy,flash,s);    break;
    case 'demon':    SPRITES.demon ? drawSpriteFrame(SPRITES.demon, SPRITE_CFG.demon, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.6+wy, e.facingLeft, flash) : drawDemon(sx,sy,e,wy,flash,s);    break;
    case 'warlock':  SPRITES.warlock ? drawSpriteFrame(SPRITES.warlock, SPRITE_CFG.warlock, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.6+wy, e.facingLeft, flash) : drawWarlock(sx,sy,e,wy,flash,s);  break;
    case 'gargoyle': if(SPRITES.gargoyle){ gargoyleDashAura(sx,sy,wy,s,e.dashing,flash); drawSpriteFrame(SPRITES.gargoyle, SPRITE_CFG.gargoyle, e.sprAnim||'idle', e.sprFrame||0, sx, sy+s*.6+wy, e.facingLeft, flash); } else drawGargoyle(sx,sy,e,wy,flash,s); break;
  }

  ctx.restore();

  if(e.poisonT>0){ // veneno: halo verde en el suelo y burbujas
    const pk=.5+.5*Math.sin((G.time||0)*8+e.x);
    ctx.save(); ctx.globalAlpha=.25+.15*pk; ctx.fillStyle='#7bff4a';
    ctx.beginPath(); ctx.ellipse(sx,sy+s*.6+wy,s*1.1,s*.4,0,0,PI*2); ctx.fill();
    ctx.globalAlpha=.7; ctx.fillStyle='#b6ff8a';
    ctx.beginPath(); ctx.arc(sx+Math.sin((G.time||0)*5+e.y)*s*.6,sy-s*.4-((G.time||0)*14%12)+wy,1.6,0,PI*2); ctx.fill();
    ctx.restore();
  }
  // HP bar — se coloca justo encima de la cabeza de cada enemigo (los sprites nuevos y el demon/gargoyle
  // son más altos que el valor fijo anterior de 2.8·s y la barra les tapaba la cabeza)
  const hr=Math.max(0,Math.min(1,e.hp/e.mhp));
  const topPx=enemyTopPx(e.name,s); // altura visual del enemigo sobre sy
  const by=sy-topPx+wy-6;
  ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(sx-s,by-1,s*2,6);
  ctx.fillStyle='#1a0000'; ctx.fillRect(sx-s,by,s*2,4);
  ctx.fillStyle='#ee2222'; // la vida de los enemigos siempre se ve roja
  ctx.fillRect(sx-s,by,s*2*hr,4);
  ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(sx-s,by,s*2*hr,1);
}
// Offset vertical (en múltiplos de s) con el que cada enemigo ancla los pies de su sprite en drawEnemy()
const SPR_ANCHOR={bat:.5,zombie:.6,skull:.8,warlock:.6,demon:.6,gargoyle:.6};

function col(e,flash,c){ return flash?'#ffffff':c; }

function drawBat(sx,sy,e,wy,flash,s){
  const c1=col(e,flash,e.col), c2=col(e,flash,e.sc);
  // Wing membranes
  ctx.fillStyle=c2;
  ctx.beginPath();
  ctx.moveTo(sx,sy-s*.8+wy);
  ctx.lineTo(sx-s*2.8,sy-s*.4+wy);
  ctx.lineTo(sx-s*2.2,sy+s*.3+wy);
  ctx.lineTo(sx-s*.5,sy+wy);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx,sy-s*.8+wy);
  ctx.lineTo(sx+s*2.8,sy-s*.4+wy);
  ctx.lineTo(sx+s*2.2,sy+s*.3+wy);
  ctx.lineTo(sx+s*.5,sy+wy);
  ctx.fill();
  // Wing fingers
  ctx.strokeStyle=c1; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(sx-s*.3,sy-s*.5+wy); ctx.lineTo(sx-s*2.8,sy-s*.4+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx-s*.3,sy-s*.5+wy); ctx.lineTo(sx-s*2,sy-.2+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx+s*.3,sy-s*.5+wy); ctx.lineTo(sx+s*2.8,sy-s*.4+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx+s*.3,sy-s*.5+wy); ctx.lineTo(sx+s*2,sy-.2+wy); ctx.stroke();
  // Body
  ctx.fillStyle=c2; ctx.beginPath(); ctx.ellipse(sx,sy-s*1.1+wy,s*.9,s*1.1,0,0,PI*2); ctx.fill();
  ctx.fillStyle=c1; ctx.beginPath(); ctx.ellipse(sx,sy-s*1.15+wy,s*.8,s,0,0,PI*2); ctx.fill();
  // Ears
  ctx.fillStyle=c2;
  ctx.beginPath(); ctx.moveTo(sx-s*.4,sy-s*1.8+wy); ctx.lineTo(sx-s*.7,sy-s*2.4+wy); ctx.lineTo(sx-.5,sy-s*1.9+wy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx+s*.4,sy-s*1.8+wy); ctx.lineTo(sx+s*.7,sy-s*2.4+wy); ctx.lineTo(sx+.5,sy-s*1.9+wy); ctx.fill();
  // Eyes
  if(!flash){ctx.shadowColor='#ff2222'; ctx.shadowBlur=6;}
  ctx.fillStyle='#ff2222';
  ctx.beginPath(); ctx.arc(sx-s*.35,sy-s*1.1+wy,s*.22,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.35,sy-s*1.1+wy,s*.22,0,PI*2); ctx.fill();
  ctx.fillStyle='#ff8888'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(sx-s*.38,sy-s*1.13+wy,s*.1,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.32,sy-s*1.13+wy,s*.1,0,PI*2); ctx.fill();
  // Fangs
  ctx.fillStyle='#fff';
  ctx.fillRect(sx-s*.3,sy-s*.6+wy,s*.18,s*.3);
  ctx.fillRect(sx+s*.12,sy-s*.6+wy,s*.18,s*.3);
}

function drawZombie(sx,sy,e,wy,flash,s){
  const c1=col(e,flash,e.col), c2=col(e,flash,e.sc);
  // Legs
  ctx.fillStyle=col(e,flash,'#1a5a1a');
  ctx.fillRect(sx-s*.8,sy+s*.2+wy,s*.6,s*.9);
  ctx.fillRect(sx+s*.2,sy+s*.2+wy,s*.6,s*.9);
  ctx.fillStyle=col(e,flash,'#0d2e0d');
  ctx.fillRect(sx-s*.8,sy+s*.8+wy,s*.6,s*.4);
  ctx.fillRect(sx+s*.2,sy+s*.8+wy,s*.6,s*.4);
  // Body
  ctx.fillStyle=c2; ctx.fillRect(sx-s+1,sy-s*1.5+wy+1,s*2-2,s*1.8-2);
  ctx.fillStyle=c1; ctx.fillRect(sx-s,sy-s*1.5+wy,s*2,s*1.8);
  // Shirt tears
  ctx.fillStyle=col(e,flash,'#1e7a1e'); ctx.fillRect(sx-s*.5,sy-s*.9+wy,s,s*.8);
  ctx.fillStyle=col(e,flash,'#156615'); ctx.fillRect(sx-s*.2,sy-s*.7+wy,s*.15,s*.5);
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(sx-s*.4,sy-s*.5+wy,s*.3,2); // stitches
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(sx+s*.1,sy-s*.3+wy,s*.3,2);
  // Outstretched arms
  ctx.fillStyle=c1;
  ctx.fillRect(sx-s*2,sy-s*1.1+wy,s,s*.5);
  ctx.fillRect(sx+s,  sy-s*1.1+wy,s,s*.5);
  // Clawed hands
  ctx.fillStyle=col(e,flash,'#228833');
  ctx.fillRect(sx-s*2.1,sy-s*1.1+wy,s*.5,s*.6);
  ctx.fillRect(sx+s*1.6,sy-s*1.1+wy,s*.5,s*.6);
  // Claw fingers
  ctx.strokeStyle=col(e,flash,'#1a6622'); ctx.lineWidth=1.5;
  for(let i=0;i<3;i++){
    ctx.beginPath(); ctx.moveTo(sx-s*2.1+i*s*.15,sy-s*.5+wy); ctx.lineTo(sx-s*2.2+i*s*.15,sy-s*.1+wy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+s*1.6+i*s*.15,sy-s*.5+wy); ctx.lineTo(sx+s*1.7+i*s*.15,sy-s*.1+wy); ctx.stroke();
  }
  // Head
  ctx.fillStyle=c2; ctx.fillRect(sx-s*.65,sy-s*2.2+wy+1,s*1.3,s+1);
  ctx.fillStyle=col(e,flash,'#33aa33'); ctx.fillRect(sx-s*.6,sy-s*2.2+wy,s*1.2,s);
  // Hollow eyes
  ctx.fillStyle='#001100';
  ctx.beginPath(); ctx.ellipse(sx-s*.3,sy-s*1.9+wy,s*.22,s*.22,0,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx+s*.3,sy-s*1.9+wy,s*.22,s*.22,0,0,PI*2); ctx.fill();
  if(!flash){ctx.shadowColor='#ff4400'; ctx.shadowBlur=6;}
  ctx.fillStyle='#ff4400';
  ctx.beginPath(); ctx.arc(sx-s*.3,sy-s*1.9+wy,s*.1,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.3,sy-s*1.9+wy,s*.1,0,PI*2); ctx.fill();
  ctx.shadowBlur=0;
  // Mouth stitches
  ctx.strokeStyle=col(e,flash,'#004400'); ctx.lineWidth=1.5;
  for(let i=0;i<5;i++){
    ctx.beginPath();
    ctx.moveTo(sx-s*.4+i*s*.2,sy-s*1.4+wy);
    ctx.lineTo(sx-s*.35+i*s*.2,sy-s*1.25+wy);
    ctx.stroke();
  }
}

function drawSkull(sx,sy,e,wy,flash,s){
  const c1=col(e,flash,e.col), c2=col(e,flash,e.sc);
  // Hood / robe
  ctx.fillStyle=col(e,flash,'#29293d');
  ctx.fillRect(sx-s*1.1,sy-s*2.2+wy,s*2.2,s*.5);
  ctx.fillRect(sx-s+2,sy-s*.5+wy,s*2-4,s*1.6);
  // Robe body
  ctx.fillStyle=col(e,flash,'#333348'); ctx.fillRect(sx-s+1,sy-s*.5+wy+1,s*2-2,s*1.6);
  // Skull head
  ctx.fillStyle=c2; ctx.beginPath(); ctx.ellipse(sx,sy-s*1.4+wy,s*.9,s*1,0,0,PI*2); ctx.fill();
  ctx.fillStyle=c1; ctx.beginPath(); ctx.ellipse(sx,sy-s*1.45+wy,s*.82,s*.92,0,0,PI*2); ctx.fill();
  // Cheekbones
  ctx.fillStyle=c2;
  ctx.beginPath(); ctx.ellipse(sx-s*.6,sy-s*.9+wy,s*.3,s*.2,-.3,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx+s*.6,sy-s*.9+wy,s*.3,s*.2,.3,0,PI*2); ctx.fill();
  // Jaw
  ctx.fillStyle=col(e,flash,'#ccccbb'); ctx.fillRect(sx-s*.75,sy-s*.6+wy,s*1.5,s*.7);
  // Teeth
  ctx.fillStyle=col(e,flash,'#e8e8d0');
  for(let i=0;i<5;i++) ctx.fillRect(sx-s*.6+i*s*.3,sy-s*.6+wy,s*.2,s*.45);
  ctx.fillStyle='rgba(0,0,0,.5)';
  for(let i=0;i<4;i++) ctx.fillRect(sx-s*.5+i*s*.3,sy-s*.6+wy,1,s*.45);
  // Eye sockets
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(sx-s*.35,sy-s*1.55+wy,s*.32,s*.38,-.2,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx+s*.35,sy-s*1.55+wy,s*.32,s*.38,.2,0,PI*2); ctx.fill();
  // Glowing eyes
  if(!flash){ctx.shadowColor='#9900ff'; ctx.shadowBlur=15;}
  ctx.fillStyle='#8800ff';
  ctx.beginPath(); ctx.ellipse(sx-s*.35,sy-s*1.55+wy,s*.22,s*.27,-.2,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx+s*.35,sy-s*1.55+wy,s*.22,s*.27,.2,0,PI*2); ctx.fill();
  ctx.fillStyle='#cc44ff'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(sx-s*.38,sy-s*1.58+wy,s*.1,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.32,sy-s*1.58+wy,s*.1,0,PI*2); ctx.fill();
  // Nose void
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.moveTo(sx,sy-s*1.05+wy); ctx.lineTo(sx-s*.15,sy-s*.8+wy); ctx.lineTo(sx+s*.15,sy-s*.8+wy); ctx.fill();
  // Robe arms with bone hands
  ctx.fillStyle=col(e,flash,'#333348');
  ctx.fillRect(sx-s*1.6,sy-s*.3+wy,s*.7,s*.5); ctx.fillRect(sx+s*.9,sy-s*.3+wy,s*.7,s*.5);
  ctx.fillStyle=c1;
  ctx.fillRect(sx-s*1.7,sy-s*.3+wy,s*.4,s*.4); ctx.fillRect(sx+s*1.3,sy-s*.3+wy,s*.4,s*.4);
}

function drawDemon(sx,sy,e,wy,flash,s){
  const c1=col(e,flash,e.col), c2=col(e,flash,e.sc);
  // Tail
  ctx.strokeStyle=col(e,flash,'#881100'); ctx.lineWidth=s*.35;
  ctx.beginPath();
  ctx.moveTo(sx+s*.4,sy+wy);
  ctx.bezierCurveTo(sx+s*1.2,sy-s*.4+wy,sx+s*1.5,sy+s*.8+wy,sx+s*1.1,sy+s*1.1+wy);
  ctx.stroke();
  // Tail tip
  ctx.fillStyle=col(e,flash,'#cc2200');
  ctx.beginPath(); ctx.moveTo(sx+s*1.1,sy+s*1.1+wy); ctx.lineTo(sx+s*.8,sy+s*.9+wy); ctx.lineTo(sx+s*1.3,sy+s*.9+wy); ctx.fill();
  // Legs
  ctx.fillStyle=col(e,flash,'#880000'); ctx.fillRect(sx-s*.9,sy+s*.3+wy,s*.7,s); ctx.fillRect(sx+s*.2,sy+s*.3+wy,s*.7,s);
  ctx.fillStyle='#220000'; ctx.fillRect(sx-s*.9,sy+s*.9+wy,s*.7,s*.5); ctx.fillRect(sx+s*.2,sy+s*.9+wy,s*.7,s*.5);
  // Hooves
  ctx.fillStyle=col(e,flash,'#cc1100');
  ctx.fillRect(sx-s*.95,sy+s*1.1+wy,s*.4,s*.3); ctx.fillRect(sx-s*.55,sy+s*1.1+wy,s*.4,s*.3);
  ctx.fillRect(sx+s*.15,sy+s*1.1+wy,s*.4,s*.3); ctx.fillRect(sx+s*.55,sy+s*1.1+wy,s*.4,s*.3);
  // Body
  ctx.fillStyle=c2; ctx.beginPath(); ctx.ellipse(sx,sy-s*.8+wy,s*1.1,s*1.5,0,0,PI*2); ctx.fill();
  ctx.fillStyle=c1; ctx.beginPath(); ctx.ellipse(sx,sy-s*.85+wy,s,s*1.4,0,0,PI*2); ctx.fill();
  // Chest rune
  if(!flash){ctx.shadowColor='#ff6600'; ctx.shadowBlur=10;}
  ctx.fillStyle='#ff6600';
  ctx.beginPath(); ctx.moveTo(sx,sy-s*1.1+wy); ctx.lineTo(sx-s*.5,sy-s*.4+wy); ctx.lineTo(sx+s*.5,sy-s*.4+wy); ctx.fill();
  ctx.fillStyle='#ff8800'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.moveTo(sx,sy-s*.9+wy); ctx.lineTo(sx-s*.3,sy-s*.5+wy); ctx.lineTo(sx+s*.3,sy-s*.5+wy); ctx.fill();
  // Wings
  ctx.fillStyle=col(e,flash,'#550000');
  ctx.beginPath();
  ctx.moveTo(sx-s,sy-s*.5+wy);
  ctx.lineTo(sx-s*3,sy-s*2.5+wy);
  ctx.lineTo(sx-s*2.5,sy-s*1+wy);
  ctx.lineTo(sx-s*1.5,sy-s*.2+wy);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx+s,sy-s*.5+wy);
  ctx.lineTo(sx+s*3,sy-s*2.5+wy);
  ctx.lineTo(sx+s*2.5,sy-s*1+wy);
  ctx.lineTo(sx+s*1.5,sy-s*.2+wy);
  ctx.fill();
  // Wing ribs
  ctx.strokeStyle=col(e,flash,'#881100'); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(sx-s,sy-s*.5+wy); ctx.lineTo(sx-s*3,sy-s*2.5+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx-s,sy-s*.5+wy); ctx.lineTo(sx-s*2.5,sy-s*1.5+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx+s,sy-s*.5+wy); ctx.lineTo(sx+s*3,sy-s*2.5+wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx+s,sy-s*.5+wy); ctx.lineTo(sx+s*2.5,sy-s*1.5+wy); ctx.stroke();
  // Arms + claws
  ctx.fillStyle=c1;
  ctx.fillRect(sx-s*1.8,sy-s*1.4+wy,s*.7,s*.6); ctx.fillRect(sx+s*1.1,sy-s*1.4+wy,s*.7,s*.6);
  ctx.strokeStyle=col(e,flash,'#ff2200'); ctx.lineWidth=1.5;
  for(let i=0;i<3;i++){
    ctx.beginPath(); ctx.moveTo(sx-s*1.7+i*s*.2,sy-s*.9+wy); ctx.lineTo(sx-s*1.9+i*s*.2,sy-s*.5+wy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+s*1.2+i*s*.2,sy-s*.9+wy); ctx.lineTo(sx+s*1.4+i*s*.2,sy-s*.5+wy); ctx.stroke();
  }
  // Head
  ctx.fillStyle=col(e,flash,'#cc1100');
  ctx.beginPath(); ctx.ellipse(sx,sy-s*2.4+wy,s*.8,s*.9,0,0,PI*2); ctx.fill();
  ctx.fillStyle=col(e,flash,'#ee1100');
  ctx.beginPath(); ctx.ellipse(sx,sy-s*2.45+wy,s*.72,s*.82,0,0,PI*2); ctx.fill();
  // Horns
  ctx.fillStyle=col(e,flash,'#ff4400');
  ctx.beginPath(); ctx.moveTo(sx-s*.5,sy-s*2.9+wy); ctx.lineTo(sx-s*.9,sy-s*3.6+wy); ctx.lineTo(sx-s*.1,sy-s*3+wy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx+s*.5,sy-s*2.9+wy); ctx.lineTo(sx+s*.9,sy-s*3.6+wy); ctx.lineTo(sx+s*.1,sy-s*3+wy); ctx.fill();
  ctx.fillStyle=col(e,flash,'#ff6600');
  ctx.beginPath(); ctx.moveTo(sx-s*.5,sy-s*2.9+wy); ctx.lineTo(sx-s*.75,sy-s*3.4+wy); ctx.lineTo(sx-s*.25,sy-s*3+wy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx+s*.5,sy-s*2.9+wy); ctx.lineTo(sx+s*.75,sy-s*3.4+wy); ctx.lineTo(sx+s*.25,sy-s*3+wy); ctx.fill();
  // Eyes
  if(!flash){ctx.shadowColor='#ff8800'; ctx.shadowBlur=14;}
  ctx.fillStyle='#ff8800';
  ctx.beginPath(); ctx.ellipse(sx-s*.32,sy-s*2.38+wy,s*.24,s*.2,-.3,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx+s*.32,sy-s*2.38+wy,s*.24,s*.2,.3,0,PI*2); ctx.fill();
  ctx.fillStyle='#ffff00'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(sx-s*.32,sy-s*2.4+wy,s*.1,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.32,sy-s*2.4+wy,s*.1,0,PI*2); ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(sx-s*.32,sy-s*2.4+wy,s*.05,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s*.32,sy-s*2.4+wy,s*.05,0,PI*2); ctx.fill();
  // Mouth
  ctx.strokeStyle='#ff0000'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(sx,sy-s*2.05+wy,s*.35,.15,PI-.15); ctx.stroke();
  ctx.fillStyle='#fff';
  for(let i=0;i<4;i++) ctx.fillRect(sx-s*.28+i*s*.18,sy-s*2.1+wy,s*.1,s*.18);
}

