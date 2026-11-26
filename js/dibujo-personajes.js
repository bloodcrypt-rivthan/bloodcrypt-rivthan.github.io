// Blood Crypt — dibujo del jefe, Lilith y los héroes. El orden de carga está en index.html (ver CLAUDE.md).
// ─── BOSS SPRITE ──────────────────────────────────────────────────────────────
function drawBoss(boss,cx,cy,W,H){
  if(!boss.alive && boss.deathT<=0) return;
  if(SPRITES.boss && boss.col!=='#44ffaa'){
    drawBossSprite(boss,cx,cy,W,H);
  } else {
    drawBossProcedural(boss,cx,cy,W,H);
  }
}

function drawBossSprite(boss,cx,cy,W,H){
  const sx=boss.x+cx, sy=boss.y+cy;
  if(sx<-220||sx>W+220||sy<-220||sy>H+220) return;
  const flash=boss.fl>0, t=boss.animT||0, wy=Math.sin(t*1.4)*4, s=boss.sz;
  ctx.save();
  // Sombra
  drawGroundShadow(sx,sy+s*.9,s*1.2,s*.4,.35);
  // Aura pulsante (color según fase)
  if(!flash){
    const auraCol=boss.phase===3?'#ff4400':boss.phase===2?'#aa44ff':'#6622cc';
    ctx.save();
    ctx.globalAlpha=0.3+Math.sin(t*3)*.1;
    ctx.shadowColor=auraCol; ctx.shadowBlur=boss.phase===3?45:boss.phase===2?30:18;
    ctx.fillStyle=auraCol;
    ctx.beginPath(); ctx.arc(sx,sy-s*1.4+wy,s*1.6,0,PI*2); ctx.fill();
    ctx.restore();
  }
  drawSpriteFrame(SPRITES.boss, SPRITE_CFG.boss, boss.sprAnim||'idle', boss.sprFrame||0, sx, sy+s*.95+wy, boss.facingLeft, flash);
  if(boss.alive){
    const hr=boss.hp/boss.mhp, barW=s*3.2, barH=6;
    ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(sx-barW/2-1,sy-s*4.2+wy-1,barW+2,barH+2);
    ctx.fillStyle='#1a0000';ctx.fillRect(sx-barW/2,sy-s*4.2+wy,barW,barH);
    ctx.fillStyle=hr>.5?'#8800cc':hr>.2?'#cc2200':'#ff4400';
    ctx.fillRect(sx-barW/2,sy-s*4.2+wy,barW*hr,barH);
    ctx.fillStyle='#e8c87a';ctx.font=`bold ${Math.floor(s*.55)}px Courier New`;
    ctx.textAlign='center';ctx.fillText('☠ REY LICHE ☠',sx,sy-s*4.5+wy);ctx.textAlign='left';
  }
  ctx.restore();
}

function drawLilith(lilith,cx,cy,W,H){
  const sx=lilith.x+cx, sy=lilith.y+cy;
  if(sx<-220||sx>W+220||sy<-220||sy>H+220) return;
  const flash=lilith.fl>0, t=lilith.animT||0, wy=Math.sin(t*1.4)*4, s=lilith.sz;
  // Intensidad visual escala con lo letal que se volvió su próximo golpe (nunca deja de crecer)
  const danger=Math.min(1, Math.log2(Math.max(1,lilith.atk/6))/6);
  ctx.save();
  drawGroundShadow(sx,sy+s*.9,s*1.2,s*.4,.4);
  if(!flash){
    ctx.save();
    ctx.globalAlpha=0.3+danger*.3+Math.sin(t*(4+danger*6))*.08;
    ctx.shadowColor='#ff1111'; ctx.shadowBlur=20+danger*40;
    ctx.fillStyle='#8a0000';
    ctx.beginPath(); ctx.arc(sx,sy-s*1.2+wy,s*(1.5+danger*.8),0,PI*2); ctx.fill();
    ctx.restore();
  }

  if(SPRITES.lilith){
    drawSpriteFrame(SPRITES.lilith, SPRITE_CFG.lilith, lilith.sprAnim||'idle', lilith.sprFrame||0, sx, sy+s*.95+wy, lilith.facingLeft, flash);
    ctx.restore();
    return;
  }

  // Fallback geométrico (mismo estilo que tenía el Rey Liche antes del sprite) — por si SPRITES.lilith no cargó
  const fx = lilith.facingLeft ? -1 : 1;
  const bodyCol = flash ? '#ffffff' : '#1a0006';
  const edgeCol = flash ? '#ffffff' : '#8a0000';
  const cy0 = sy - s*.9 + wy; // centro vertical del torso

  // Alas triangulares (crecen con danger)
  if(!flash){
    const wspan = s*(1.1+danger*1.1);
    ctx.fillStyle = `rgba(120,0,0,${0.55+danger*.3})`;
    ctx.beginPath();
    ctx.moveTo(sx-fx*s*.15, cy0-s*.3);
    ctx.lineTo(sx-fx*wspan, cy0-s*.9-danger*s*.4);
    ctx.lineTo(sx-fx*wspan*.6, cy0+s*.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx+fx*s*.15, cy0-s*.3);
    ctx.lineTo(sx+fx*wspan, cy0-s*.9-danger*s*.4);
    ctx.lineTo(sx+fx*wspan*.6, cy0+s*.2);
    ctx.closePath(); ctx.fill();
  }

  // Torso: rombo alargado (diamante)
  ctx.fillStyle = bodyCol;
  ctx.strokeStyle = edgeCol; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, cy0-s*.85);
  ctx.lineTo(sx+s*.5, cy0-s*.15);
  ctx.lineTo(sx, cy0+s*.55);
  ctx.lineTo(sx-s*.5, cy0-s*.15);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Falda/manto inferior: triángulo dentado
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.moveTo(sx-s*.45, cy0+s*.35);
  ctx.lineTo(sx+s*.45, cy0+s*.35);
  ctx.lineTo(sx+s*.65, cy0+s*1.1);
  ctx.lineTo(sx+s*.28, cy0+s*.8);
  ctx.lineTo(sx, cy0+s*1.15);
  ctx.lineTo(sx-s*.28, cy0+s*.8);
  ctx.lineTo(sx-s*.65, cy0+s*1.1);
  ctx.closePath();
  ctx.fill();

  // Cabeza: hexágono
  const hy = cy0 - s*1.05;
  ctx.fillStyle = bodyCol; ctx.strokeStyle = edgeCol;
  ctx.beginPath();
  ctx.moveTo(sx-s*.28, hy);
  ctx.lineTo(sx-s*.18, hy-s*.24);
  ctx.lineTo(sx+s*.18, hy-s*.24);
  ctx.lineTo(sx+s*.28, hy);
  ctx.lineTo(sx+s*.16, hy+s*.22);
  ctx.lineTo(sx-s*.16, hy+s*.22);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Cuernos: dos triángulos
  ctx.fillStyle = edgeCol;
  ctx.beginPath();
  ctx.moveTo(sx-s*.2, hy-s*.2); ctx.lineTo(sx-s*.42, hy-s*.62); ctx.lineTo(sx-s*.06, hy-s*.22);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx+s*.2, hy-s*.2); ctx.lineTo(sx+s*.42, hy-s*.62); ctx.lineTo(sx+s*.06, hy-s*.22);
  ctx.closePath(); ctx.fill();

  // Ojos: dos puntos rojos brillantes
  if(!flash){
    ctx.fillStyle='#ff2222'; ctx.shadowColor='#ff2222'; ctx.shadowBlur=10+danger*10;
    ctx.beginPath(); ctx.arc(sx-s*.1, hy-s*.02, s*.055,0,PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+s*.1, hy-s*.02, s*.055,0,PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }

  // Brazos: dos líneas finas terminadas en punta (garras)
  ctx.strokeStyle = edgeCol; ctx.lineWidth = s*.09; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(sx-s*.42, cy0-s*.1); ctx.lineTo(sx-s*.78, cy0+s*.28);
  ctx.moveTo(sx+s*.42, cy0-s*.1); ctx.lineTo(sx+s*.78, cy0+s*.28);
  ctx.stroke();

  // Gema central pulsante (corazón de odio)
  const gemPulse = 0.6+Math.sin(t*(5+danger*4))*.3;
  ctx.fillStyle = `rgba(255,20,20,${0.5+danger*.4})`;
  ctx.shadowColor='#ff0000'; ctx.shadowBlur=8+danger*18*gemPulse;
  ctx.beginPath(); ctx.arc(sx, cy0-s*.1, s*.13*gemPulse,0,PI*2); ctx.fill();
  ctx.shadowBlur=0;

  ctx.restore();
}

function drawBossProcedural(boss,cx,cy,W,H){
  if(!boss.alive && boss.deathT<=0) return;
  const sx=boss.x+cx, sy=boss.y+cy;
  if(sx<-200||sx>W+200||sy<-200||sy>H+200) return;
  const s=boss.sz, flash=boss.fl>0;
  const t=boss.animT;
  const wy=Math.sin(t*1.4)*4;
  ctx.save();
  const auraCol=boss.phase===3?'#ff4400':boss.phase===2?'#aa44ff':'#6622cc';
  if(!flash){ctx.shadowColor=auraCol; ctx.shadowBlur=boss.phase===3?45:boss.phase===2?30:18;}
  const c1=flash?'#ffffff':'#c8b8ff', c2=flash?'#ffffff':'#442266', cBone=flash?'#ffffff':'#e8e0d0';
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(sx,sy+s*.7+wy,s*1.2,s*.4,0,0,PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle=flash?'#ffffff':'#2a1144';
  ctx.beginPath();
  ctx.moveTo(sx-s*1.3,sy-s*.5+wy);
  ctx.quadraticCurveTo(sx-s*1.6,sy+s*1.8+wy,sx-s*.6,sy+s*2.4+wy);
  ctx.lineTo(sx+s*.6,sy+s*2.4+wy);
  ctx.quadraticCurveTo(sx+s*1.6,sy+s*1.8+wy,sx+s*1.3,sy-s*.5+wy);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#6633aa'; ctx.lineWidth=1.5; ctx.stroke();
  if(!flash){ctx.fillStyle='#8855cc';
    for(let i=0;i<3;i++){const ry=sy+s*.4+i*s*.55+wy;ctx.fillRect(sx-s*.3,ry,s*.6,s*.06);ctx.fillRect(sx-s*.15,ry-s*.07,s*.06,s*.2);ctx.fillRect(sx+s*.09,ry-s*.07,s*.06,s*.2);}}
  const armSwing=Math.sin(t*2.2)*.12;
  ctx.fillStyle=cBone;
  ctx.save(); ctx.translate(sx-s*.9,sy-s*.4+wy); ctx.rotate(-0.5+armSwing);
  ctx.fillRect(-s*.18,-s*.1,s*.36,s*.9); ctx.fillRect(-s*.2,s*.7,s*.4,s*.15);
  ctx.strokeStyle=cBone; ctx.lineWidth=1.5;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-s*.2+i*s*.13,s*.85);ctx.lineTo(-s*.26+i*s*.13,s*1.25);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle=cBone;
  ctx.save(); ctx.translate(sx+s*.9,sy-s*.4+wy); ctx.rotate(0.5-armSwing);
  ctx.fillRect(-s*.18,-s*.1,s*.36,s*.9); ctx.fillRect(-s*.2,s*.7,s*.4,s*.15);
  ctx.strokeStyle=cBone; ctx.lineWidth=1.5;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-s*.2+i*s*.13,s*.85);ctx.lineTo(-s*.26+i*s*.13,s*1.25);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle=cBone;
  ctx.beginPath(); ctx.ellipse(sx,sy-s*.6+wy,s*.72,s*.95,0,0,PI*2); ctx.fill();
  ctx.fillStyle=flash?'#ffffff':'#1a0a2e';
  ctx.beginPath(); ctx.ellipse(sx,sy-s*.6+wy,s*.55,s*.75,0,0,PI*2); ctx.fill();
  if(!flash){ctx.strokeStyle='#c8b8ff'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){const ry=sy-s*.95+i*s*.22+wy;
      ctx.beginPath();ctx.moveTo(sx-s*.1,ry);ctx.bezierCurveTo(sx-s*.55,ry+s*.06,sx-s*.6,ry+s*.16,sx-s*.5,ry+s*.22);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx+s*.1,ry);ctx.bezierCurveTo(sx+s*.55,ry+s*.06,sx+s*.6,ry+s*.16,sx+s*.5,ry+s*.22);ctx.stroke();}
    ctx.shadowColor='#aa44ff'; ctx.shadowBlur=12;
    ctx.fillStyle='#aa44ff';
    ctx.beginPath();ctx.moveTo(sx,sy-s*1.1+wy);ctx.lineTo(sx-s*.3,sy-s*.6+wy);ctx.lineTo(sx+s*.3,sy-s*.6+wy);ctx.fill();
    ctx.fillStyle='#cc88ff';
    ctx.beginPath();ctx.moveTo(sx,sy-s*.95+wy);ctx.lineTo(sx-s*.18,sy-s*.65+wy);ctx.lineTo(sx+s*.18,sy-s*.65+wy);ctx.fill();
    ctx.shadowBlur=0;}
  ctx.fillStyle=cBone;
  ctx.beginPath(); ctx.ellipse(sx,sy-s*2.1+wy,s*.78,s*.88,0,0,PI*2); ctx.fill();
  ctx.fillStyle=flash?'#ffffff':'#d8c8b8';
  ctx.beginPath();
  ctx.moveTo(sx-s*.5,sy-s*1.72+wy);ctx.quadraticCurveTo(sx,sy-s*1.4+wy,sx+s*.5,sy-s*1.72+wy);
  ctx.lineTo(sx+s*.42,sy-s*1.55+wy);ctx.quadraticCurveTo(sx,sy-s*1.28+wy,sx-s*.42,sy-s*1.55+wy);
  ctx.closePath(); ctx.fill();
  if(!flash){ctx.fillStyle='#e8e0d0';for(let i=0;i<5;i++)ctx.fillRect(sx-s*.38+i*s*.19,sy-s*1.72+wy,s*.13,s*.18);}
  ctx.fillStyle=flash?'#ffffff':'#d8c090';
  ctx.fillRect(sx-s*.72,sy-s*2.82+wy,s*1.44,s*.22);
  const crownSpikes=[{x:-.6,h:1.1},{x:-.3,h:.7},{x:0,h:1.3},{x:.3,h:.7},{x:.6,h:1.1}];
  crownSpikes.forEach(sp=>{
    ctx.beginPath();ctx.moveTo(sx+sp.x*s,sy-s*2.82+wy);
    ctx.lineTo(sx+(sp.x-.12)*s,sy-s*(2.82+sp.h*.5)+wy);ctx.lineTo(sx+sp.x*s,sy-s*(2.82+sp.h*.55)+wy);
    ctx.lineTo(sx+(sp.x+.12)*s,sy-s*(2.82+sp.h*.5)+wy);ctx.fill();});
  if(!flash){ctx.shadowColor='#ff2200';ctx.shadowBlur=18;ctx.fillStyle='#ff3300';ctx.beginPath();ctx.arc(sx,sy-s*3.38+wy,s*.2,0,PI*2);ctx.fill();ctx.fillStyle='#ff8866';ctx.beginPath();ctx.arc(sx-s*.06,sy-s*3.44+wy,s*.08,0,PI*2);ctx.fill();ctx.shadowBlur=0;}
  const eyeCol=boss.phase===3?'#ff4400':boss.phase===2?'#ff00ff':'#cc44ff';
  if(!flash){ctx.shadowColor=eyeCol;ctx.shadowBlur=boss.phase===3?22:14;}
  ctx.fillStyle=flash?'#ffffff':eyeCol;
  ctx.beginPath();ctx.ellipse(sx-s*.28,sy-s*2.2+wy,s*.18,s*.15,-.25,0,PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(sx+s*.28,sy-s*2.2+wy,s*.18,s*.15,.25,0,PI*2);ctx.fill();
  if(!flash){ctx.fillStyle='#ffffff';ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(sx-s*.24,sy-s*2.23+wy,s*.06,0,PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(sx+s*.32,sy-s*2.23+wy,s*.06,0,PI*2);ctx.fill();}
  ctx.shadowBlur=0;
  const hr=boss.hp/boss.mhp, barW=s*3.2, barH=6;
  ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(sx-barW/2-1,sy-s*4.2+wy-1,barW+2,barH+2);
  ctx.fillStyle='#1a0000';ctx.fillRect(sx-barW/2,sy-s*4.2+wy,barW,barH);
  ctx.fillStyle=hr>.5?'#8800cc':hr>.2?'#cc2200':'#ff4400';
  ctx.fillRect(sx-barW/2,sy-s*4.2+wy,barW*hr,barH);
  if(!flash){ctx.fillStyle='#e8c87a';ctx.font=`bold ${Math.floor(s*.55)}px Courier New`;
    ctx.textAlign='center';ctx.fillText('☠ REY LICHE ☠',sx,sy-s*4.5+wy);ctx.textAlign='left';}
  ctx.restore();
}

function drawWarlock(sx,sy,e,wy,flash,s){
  const t=e.animT, hover=Math.sin(t*1.6)*s*.08, mantleFlow=Math.sin(t*1.2)*s*.1, orbPulse=0.7+Math.sin(t*3.5)*.3;
  const c1=col(e,flash,'#00cccc'), c2=col(e,flash,'#005555');
  if(!flash){ctx.save();ctx.globalAlpha=0.12+Math.sin(t*2)*.04;ctx.shadowColor='#00ffff';ctx.shadowBlur=30;ctx.fillStyle='#004455';ctx.beginPath();ctx.arc(sx,sy-s*.8+wy+hover,s*2.2,0,PI*2);ctx.fill();ctx.restore();
    for(let i=0;i<4;i++){const ang=t*.8+i*(PI/2),r=s*1.7;ctx.save();ctx.globalAlpha=0.4+Math.sin(t*2+i)*.2;ctx.shadowColor='#00cccc';ctx.shadowBlur=8;ctx.fillStyle='#00aaaa';ctx.font=`${s*.55}px serif`;ctx.textAlign='center';ctx.fillText(['✦','◈','⬡','✧'][i],sx+Math.cos(ang)*r,sy-s*.8+wy+hover+Math.sin(ang)*r*.4);ctx.restore();}ctx.textAlign='left';}
  ctx.fillStyle=col(e,flash,'#001a1a');
  ctx.beginPath();ctx.moveTo(sx-s*.85,sy-s*.5+wy+hover);ctx.bezierCurveTo(sx-s*(1.1+mantleFlow/s*.5),sy+s*.6+wy+hover,sx-s*.7,sy+s*1.9+wy+hover,sx-s*.35,sy+s*2.3+wy+hover);ctx.lineTo(sx+s*.35,sy+s*2.3+wy+hover);ctx.bezierCurveTo(sx+s*.7,sy+s*1.9+wy+hover,sx+s*(1.1-mantleFlow/s*.5),sy+s*.6+wy+hover,sx+s*.85,sy-s*.5+wy+hover);ctx.closePath();ctx.fill();
  ctx.fillStyle=col(e,flash,'#002233');
  ctx.beginPath();ctx.moveTo(sx-s*.72,sy-s*.45+wy+hover);ctx.bezierCurveTo(sx-s*.9,sy+s*.5+wy+hover,sx-s*.55,sy+s*1.7+wy+hover,sx-s*.25,sy+s*2.1+wy+hover);ctx.lineTo(sx+s*.25,sy+s*2.1+wy+hover);ctx.bezierCurveTo(sx+s*.55,sy+s*1.7+wy+hover,sx+s*.9,sy+s*.5+wy+hover,sx+s*.72,sy-s*.45+wy+hover);ctx.closePath();ctx.fill();
  if(!flash){ctx.fillStyle='#004444';ctx.beginPath();ctx.roundRect(sx-s*.55,sy-s*.05+wy+hover,s*1.1,s*.25,s*.05);ctx.fill();ctx.strokeStyle='#00aaaa';ctx.lineWidth=1.5;ctx.shadowColor='#00cccc';ctx.shadowBlur=6;ctx.strokeRect(sx-s*.14,sy-s*.08+wy+hover,s*.28,s*.3);ctx.shadowBlur=0;}
  ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(sx,sy-s*.55+wy+hover,s*.58,s*.78,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#007777');ctx.beginPath();ctx.ellipse(sx,sy-s*.62+wy+hover,s*.44,s*.6,0,0,PI*2);ctx.fill();
  ctx.fillStyle=c2;
  const handSwingL=Math.sin(t*2+1)*s*.08, handSwingR=Math.sin(t*2)*s*.08;
  ctx.save();ctx.translate(sx-s*.88,sy-s*.28+wy+hover+handSwingL);ctx.rotate(-.25);ctx.beginPath();ctx.ellipse(0,0,s*.28,s*.18,0,0,PI*2);ctx.fill();ctx.strokeStyle=c2;ctx.lineWidth=1.8;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-s*.18+i*s*.12,s*.1);ctx.lineTo(-s*.2+i*s*.13,s*.42);ctx.stroke();}ctx.restore();
  ctx.fillStyle=c2;ctx.save();ctx.translate(sx+s*.88,sy-s*.28+wy+hover+handSwingR);ctx.rotate(.25);ctx.beginPath();ctx.ellipse(0,0,s*.28,s*.18,0,0,PI*2);ctx.fill();ctx.strokeStyle=c2;ctx.lineWidth=1.8;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-s*.06+i*s*.12,s*.1);ctx.lineTo(-s*.08+i*s*.13,s*.42);ctx.stroke();}ctx.restore();
  const orbX=sx+s*.88+Math.sin(t*2.5)*s*.06, orbY=sy-s*.7+wy+hover+Math.cos(t*2.5)*s*.08;
  if(!flash){ctx.save();ctx.globalAlpha=orbPulse*.35;ctx.shadowColor='#00ffff';ctx.shadowBlur=22;ctx.fillStyle='#00cccc';ctx.beginPath();ctx.arc(orbX,orbY,s*.55,0,PI*2);ctx.fill();ctx.restore();}
  if(!flash){ctx.shadowColor='#00ffff';ctx.shadowBlur=14*orbPulse;}
  ctx.globalAlpha=flash?1:0.9;ctx.fillStyle=col(e,flash,'#aaffff');ctx.beginPath();ctx.arc(orbX,orbY,s*.32,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#ffffff');ctx.globalAlpha=0.7;ctx.beginPath();ctx.arc(orbX-s*.1,orbY-s*.1,s*.14,0,PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;
  ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(sx,sy-s*1.1+wy+hover,s*.28,s*.28,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#007777');ctx.beginPath();ctx.ellipse(sx,sy-s*1.85+wy+hover,s*.52,s*.58,0,0,PI*2);ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(sx,sy-s*1.9+wy+hover,s*.45,s*.5,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#00aaaa');ctx.beginPath();ctx.ellipse(sx,sy-s*1.95+wy+hover,s*.38,s*.42,0,0,PI*2);ctx.fill();
  if(!flash){ctx.fillStyle='#003333';ctx.beginPath();ctx.ellipse(sx,sy-s*1.56+wy+hover,s*.28,s*.16,0,0,PI);ctx.fill();}
  ctx.fillStyle=col(e,flash,'#001133');ctx.beginPath();ctx.ellipse(sx,sy-s*1.52+wy+hover,s*.72,s*.16,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#002244');ctx.beginPath();ctx.ellipse(sx,sy-s*1.56+wy+hover,s*.68,s*.13,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#001133');
  ctx.beginPath();ctx.moveTo(sx-s*.5,sy-s*1.52+wy+hover);ctx.bezierCurveTo(sx-s*.45,sy-s*2.0+wy+hover,sx-s*.12,sy-s*2.5+wy+hover,sx,sy-s*2.85+wy+hover);ctx.bezierCurveTo(sx+s*.12,sy-s*2.5+wy+hover,sx+s*.45,sy-s*2.0+wy+hover,sx+s*.5,sy-s*1.52+wy+hover);ctx.fill();
  if(!flash){ctx.fillStyle='#00444f';ctx.fillRect(sx-s*.48,sy-s*1.68+wy+hover,s*.96,s*.18);ctx.shadowColor='#00ffff';ctx.shadowBlur=6;ctx.fillStyle='#00cccc';ctx.beginPath();ctx.arc(sx,sy-s*1.64+wy+hover,s*.09,0,PI*2);ctx.fill();ctx.shadowBlur=0;}
  if(!flash){ctx.save();ctx.shadowColor='#00ffff';ctx.shadowBlur=12;ctx.fillStyle='#aaffff';ctx.beginPath();ctx.arc(sx,sy-s*2.82+wy+hover,s*.1,0,PI*2);ctx.fill();ctx.restore();}
  if(!flash){ctx.shadowColor='#00ffff';ctx.shadowBlur=12;}
  ctx.fillStyle='#001a1a';ctx.beginPath();ctx.ellipse(sx-s*.2,sy-s*1.96+wy+hover,s*.16,s*.13,0,0,PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sx+s*.2,sy-s*1.96+wy+hover,s*.16,s*.13,0,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#00ffff');ctx.beginPath();ctx.arc(sx-s*.2,sy-s*1.96+wy+hover,s*.1,0,PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx+s*.2,sy-s*1.96+wy+hover,s*.1,0,PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.shadowBlur=0;ctx.beginPath();ctx.arc(sx-s*.24,sy-s*2.0+wy+hover,s*.04,0,PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx+s*.16,sy-s*2.0+wy+hover,s*.04,0,PI*2);ctx.fill();
}

function drawGargoyle(sx,sy,e,wy,flash,s){
  const t=e.animT, breathe=Math.sin(t*1.4)*s*.05, wingFlap=Math.sin(t*6)*0.3, isDashing=e.dashing;
  const c1=col(e,flash,'#8899aa'), c2=col(e,flash,'#445566'), c3=col(e,flash,'#2a3a4a');
  if(isDashing&&!flash){ctx.save();ctx.globalAlpha=0.25;ctx.shadowColor='#aabbcc';ctx.shadowBlur=20;ctx.fillStyle='#aabbcc';ctx.beginPath();ctx.arc(sx,sy+wy,s*2.2,0,PI*2);ctx.fill();ctx.restore();}
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,sy+s*.9+wy,s*.9,s*.25,0,0,PI*2);ctx.fill();
  ctx.save();ctx.translate(sx-s*.5,sy-s*.8+wy);ctx.rotate(-0.55+wingFlap+(isDashing?-.3:0));
  ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-s*1.8,-s*.6,-s*2.8,s*.4,-s*2.4,s*1.0);ctx.bezierCurveTo(-s*1.6,s*1.4,-s*.8,s*.8,-s*.3,s*.5);ctx.closePath();ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-s*1.6,-s*.5,-s*2.5,s*.3,-s*2.1,s*.9);ctx.bezierCurveTo(-s*1.4,s*1.2,-s*.7,s*.7,-s*.2,s*.4);ctx.closePath();ctx.fill();ctx.restore();
  ctx.save();ctx.translate(sx+s*.5,sy-s*.8+wy);ctx.rotate(0.55-wingFlap+(isDashing?.3:0));
  ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(s*1.8,-s*.6,s*2.8,s*.4,s*2.4,s*1.0);ctx.bezierCurveTo(s*1.6,s*1.4,s*.8,s*.8,s*.3,s*.5);ctx.closePath();ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(s*1.6,-s*.5,s*2.5,s*.3,s*2.1,s*.9);ctx.bezierCurveTo(s*1.4,s*1.2,s*.7,s*.7,s*.2,s*.4);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=c3;ctx.beginPath();ctx.roundRect(sx-s*.85,sy+s*.4+wy,s*.6,s*.9,s*.08);ctx.fill();ctx.beginPath();ctx.roundRect(sx+s*.25,sy+s*.4+wy,s*.6,s*.9,s*.08);ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.roundRect(sx-s*.82,sy+s*.42+wy,s*.52,s*.8,s*.06);ctx.fill();ctx.beginPath();ctx.roundRect(sx+s*.28,sy+s*.42+wy,s*.52,s*.8,s*.06);ctx.fill();
  ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(sx,sy-s*.35+wy,s*(.88+breathe/s),s*(1.1+breathe/s),0,0,PI*2);ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(sx,sy-s*.4+wy,s*(.78+breathe/s),s*(1.0+breathe/s),0,0,PI*2);ctx.fill();
  ctx.fillStyle=c1;ctx.beginPath();ctx.ellipse(sx,sy-s*.45+wy,s*(.65+breathe/s),s*(.85+breathe/s),0,0,PI*2);ctx.fill();
  if(!flash){ctx.strokeStyle='#334455';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sx-s*.25,sy-s*.9+wy);ctx.lineTo(sx+s*.05,sy-s*.3+wy);ctx.lineTo(sx+s*.2,sy-s*.6+wy);ctx.stroke();}
  ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(sx,sy-s*1.72+wy,s*.62,s*.68,0,0,PI*2);ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(sx,sy-s*1.76+wy,s*.54,s*.60,0,0,PI*2);ctx.fill();
  ctx.fillStyle=c1;ctx.beginPath();ctx.ellipse(sx,sy-s*1.8+wy,s*.46,s*.52,0,0,PI*2);ctx.fill();
  ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(sx-s*.38,sy-s*2.1+wy);ctx.bezierCurveTo(sx-s*.65,sy-s*2.5+wy,sx-s*.8,sy-s*2.85+wy,sx-s*.6,sy-s*2.95+wy);ctx.lineTo(sx-s*.42,sy-s*2.2+wy);ctx.fill();
  ctx.beginPath();ctx.moveTo(sx+s*.38,sy-s*2.1+wy);ctx.bezierCurveTo(sx+s*.65,sy-s*2.5+wy,sx+s*.8,sy-s*2.85+wy,sx+s*.6,sy-s*2.95+wy);ctx.lineTo(sx+s*.42,sy-s*2.2+wy);ctx.fill();
  if(!flash){ctx.shadowColor='#ff3300';ctx.shadowBlur=16;}
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(sx-s*.26,sy-s*1.8+wy,s*.2,s*.16,-.2,0,PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sx+s*.26,sy-s*1.8+wy,s*.2,s*.16,.2,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#ff4400');ctx.beginPath();ctx.ellipse(sx-s*.26,sy-s*1.8+wy,s*.14,s*.11,-.2,0,PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sx+s*.26,sy-s*1.8+wy,s*.14,s*.11,.2,0,PI*2);ctx.fill();
  ctx.fillStyle=col(e,flash,'#ff8800');ctx.shadowBlur=0;ctx.beginPath();ctx.arc(sx-s*.26,sy-s*1.8+wy,s*.07,0,PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx+s*.26,sy-s*1.8+wy,s*.07,0,PI*2);ctx.fill();
  ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(sx,sy-s*1.55+wy,s*.35,s*.2,0,0,PI);ctx.fill();
  if(!flash){ctx.fillStyle='#ddeeff';ctx.beginPath();ctx.moveTo(sx-s*.22,sy-s*1.55+wy);ctx.lineTo(sx-s*.18,sy-s*1.32+wy);ctx.lineTo(sx-s*.08,sy-s*1.55+wy);ctx.fill();ctx.beginPath();ctx.moveTo(sx+s*.08,sy-s*1.55+wy);ctx.lineTo(sx+s*.18,sy-s*1.32+wy);ctx.lineTo(sx+s*.22,sy-s*1.55+wy);ctx.fill();}
}

function drawYoko(sx,sy,p){
  // Si el sprite sheet está cargado, usarlo
  if(SPRITES.yoko){
    if(p.invT>0 && Math.floor(p.invT*16)%2===0) return;
    drawGroundShadow(sx,sy+2,p.charging?18:13,3,.22);
    drawSpriteFrame(SPRITES.yoko, SPRITE_CFG.yoko,
                    p.sprAnim||'idle', p.sprFrame||0,
                    sx, sy, p.facingLeft||false, p.dmgF>0);
    if(p.charging){
      ctx.save(); ctx.globalAlpha=0.18; ctx.shadowColor='#ffbb55'; ctx.shadowBlur=18;
      ctx.strokeStyle='#ffdd88'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(sx+4, sy+2, 30, 14, 0, 0, PI*2); ctx.stroke();
      ctx.restore();
    }
    if(p.bloodlustActive){
      const pulse=0.55+Math.sin((p.animT||0)*10)*.25;
      ctx.save(); ctx.globalAlpha=pulse; ctx.shadowColor='#ff0000'; ctx.shadowBlur=20;
      ctx.strokeStyle='#ff2222'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.ellipse(sx, sy-8, 26, 26, 0, 0, PI*2); ctx.stroke();
      ctx.restore();
    }
    return;
  }

  const t=p.animT||0, charging=p.charging;
  const facing=charging?Math.atan2(p.chargeVy||0,p.chargeVx||1):(p.facingAng||0);
  const facingRight=Math.cos(facing)>=0;
  ctx.save(); ctx.translate(sx,sy); if(!facingRight)ctx.scale(-1,1);
  const speed=charging?14:7, cyc=(t*speed)%(PI*2);
  const bodyBob=Math.sin(cyc*2)*(charging?2.2:1.0);
  const bodyLean=charging?-0.18:0;
  const earTwitch=Math.sin(cyc*1.1)*(charging?0.12:0.06);
  const tailWag=Math.sin(t*(charging?10:3.5))*(charging?0.2:0.45);
  const hindSwing=Math.sin(cyc+0.3)*(charging?0.80:0.50), hindSwing2=Math.sin(cyc+PI+0.3)*(charging?0.80:0.50);
  const foreSwing=Math.sin(cyc+PI+0.5)*(charging?0.75:0.48), foreSwing2=Math.sin(cyc+0.5)*(charging?0.75:0.48);
  const hindBend=Math.max(0,-Math.cos(cyc+0.3))*(charging?0.65:0.40), hindBend2=Math.max(0,-Math.cos(cyc+PI+0.3))*(charging?0.65:0.40);
  const foreBend=Math.max(0,-Math.cos(cyc+PI+0.5))*(charging?0.60:0.35), foreBend2=Math.max(0,-Math.cos(cyc+0.5))*(charging?0.60:0.35);
  const cBase='#cc8844',cLight='#dda055',cDark='#8a5228',cBelly='#e8c898',cPink='rgba(210,160,140,.45)',cNose='#2a1608';
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,17,charging?22:17,3.2,0,0,PI*2); ctx.fill();
  if(charging){for(let i=0;i<5;i++){ctx.save();ctx.globalAlpha=0.06*(5-i);ctx.fillStyle='#cc8844';ctx.beginPath();ctx.ellipse(-(12+i*7),bodyBob,10-i,4-i*.4,0,0,PI*2);ctx.fill();ctx.restore();}}
  ctx.save(); ctx.rotate(bodyLean);
  const drawPaw=(ox,oy,swing,bend,isHind)=>{
    const thigh=isHind?10:8,shin=isHind?9:8,thick=isHind?5:4.2;
    const c1=isHind?cBase:cBelly,c2=isHind?cDark:cBase;
    ctx.save();ctx.translate(ox,oy);ctx.rotate(swing);
    ctx.strokeStyle=c2;ctx.lineWidth=thick+1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,thigh);ctx.stroke();
    ctx.strokeStyle=c1;ctx.lineWidth=thick;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,thigh-0.5);ctx.stroke();
    ctx.save();ctx.translate(0,thigh);ctx.rotate(-swing*0.65+bend*0.85);
    ctx.strokeStyle=c2;ctx.lineWidth=thick-0.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,shin);ctx.stroke();
    ctx.strokeStyle=c1;ctx.lineWidth=thick-1.8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,shin-0.5);ctx.stroke();
    ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(0,shin+1.8,4,2.2,0,0,PI*2);ctx.fill();
    ctx.fillStyle=c1;ctx.beginPath();ctx.ellipse(0,shin+1.2,3.2,1.7,0,0,PI*2);ctx.fill();
    ctx.fillStyle=cNose;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-1.6+i*1.6,shin+3,0.65,1,0,0,PI*2);ctx.fill();}
    ctx.restore();ctx.restore();
  };
  drawPaw(-7,7+bodyBob,hindSwing,hindBend,true); drawPaw(-2,8+bodyBob,hindSwing2,hindBend2,true);
  ctx.save();ctx.translate(-15,1+bodyBob);ctx.rotate(-0.5+tailWag);
  ctx.strokeStyle=cDark;ctx.lineCap='round';ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,-8);ctx.stroke();
  ctx.lineWidth=2.5;ctx.strokeStyle=cBase;ctx.beginPath();ctx.moveTo(-2,-8);ctx.bezierCurveTo(-4,-14,-5,-20,-3,-25);ctx.stroke();
  ctx.lineWidth=1.8;ctx.strokeStyle=cBase;ctx.beginPath();ctx.moveTo(-3,-25);ctx.lineTo(-2,-29);ctx.stroke();ctx.restore();
  ctx.fillStyle=cDark;ctx.beginPath();ctx.moveTo(-15,8+bodyBob);ctx.bezierCurveTo(-17,-1+bodyBob,-12,-12+bodyBob,-2,-12+bodyBob);ctx.bezierCurveTo(8,-12+bodyBob,16,-7+bodyBob,18,0+bodyBob);ctx.bezierCurveTo(18,9+bodyBob,12,13+bodyBob,-2,11+bodyBob);ctx.bezierCurveTo(-8,11+bodyBob,-15,10+bodyBob,-15,8+bodyBob);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.moveTo(-14,7+bodyBob);ctx.bezierCurveTo(-16,-0+bodyBob,-11,-11+bodyBob,-2,-11+bodyBob);ctx.bezierCurveTo(8,-11+bodyBob,15,-6+bodyBob,17,1+bodyBob);ctx.bezierCurveTo(17,9+bodyBob,11,12+bodyBob,-2,10+bodyBob);ctx.bezierCurveTo(-7,10+bodyBob,-14,9+bodyBob,-14,7+bodyBob);ctx.closePath();ctx.fill();
  ctx.fillStyle=cLight;ctx.beginPath();ctx.moveTo(-8,-9+bodyBob);ctx.bezierCurveTo(-3,-13+bodyBob,6,-13+bodyBob,13,-8+bodyBob);ctx.bezierCurveTo(8,-6+bodyBob,0,-6+bodyBob,-8,-9+bodyBob);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBelly;ctx.beginPath();ctx.ellipse(0,10+bodyBob,11,3.5,0,0,PI*2);ctx.fill();
  ctx.fillStyle=cPink;ctx.beginPath();ctx.ellipse(-9,6+bodyBob,5,4,0.3,0,PI*2);ctx.fill();
  drawPaw(10,5+bodyBob,foreSwing,foreBend,false); drawPaw(14,6+bodyBob,foreSwing2,foreBend2,false);
  ctx.fillStyle=cDark;ctx.beginPath();ctx.moveTo(11,-5+bodyBob);ctx.bezierCurveTo(15,-9+bodyBob,22,-9+bodyBob,24,-4+bodyBob);ctx.bezierCurveTo(24,3+bodyBob,19,4+bodyBob,14,3+bodyBob);ctx.bezierCurveTo(10,3+bodyBob,9,-1+bodyBob,11,-5+bodyBob);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.moveTo(12,-4+bodyBob);ctx.bezierCurveTo(16,-8+bodyBob,21,-8+bodyBob,23,-3+bodyBob);ctx.bezierCurveTo(23,3+bodyBob,18,3+bodyBob,14,2+bodyBob);ctx.bezierCurveTo(10,2+bodyBob,10,-1+bodyBob,12,-4+bodyBob);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBelly;ctx.beginPath();ctx.ellipse(17,-1+bodyBob,4,3.5,-0.1,0,PI*2);ctx.fill();
  const hx=26,hy=-5+bodyBob;
  ctx.save();ctx.translate(hx-5,hy-3);ctx.rotate(-0.3+earTwitch);
  ctx.fillStyle=cDark;ctx.beginPath();ctx.moveTo(-2,2);ctx.bezierCurveTo(-4,0,-5,-5,-2,-11);ctx.lineTo(2,-11);ctx.bezierCurveTo(5,-5,4,0,2,2);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.moveTo(-1.5,1.5);ctx.bezierCurveTo(-3,-.5,-3.5,-5,-1,-10);ctx.lineTo(1.5,-10);ctx.bezierCurveTo(3.5,-5,3,-.5,1.5,1.5);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(210,150,130,.4)';ctx.beginPath();ctx.moveTo(-0.5,0);ctx.bezierCurveTo(-2,-2,-2,-6,0,-9);ctx.lineTo(1,-9);ctx.bezierCurveTo(2,-6,2,-2,0.5,0);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=cDark;ctx.beginPath();ctx.ellipse(hx,hy-2,10,9.5,0,0,PI*2);ctx.fill();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.ellipse(hx,hy-2.5,9.2,8.8,0,0,PI*2);ctx.fill();
  ctx.fillStyle=cLight;ctx.beginPath();ctx.ellipse(hx-1,hy-5.5,6,4,-0.15,0,PI*2);ctx.fill();
  ctx.save();ctx.translate(hx+3,hy-7);ctx.rotate(0.2+earTwitch*.8);
  ctx.fillStyle=cDark;ctx.beginPath();ctx.moveTo(-2,1);ctx.bezierCurveTo(-3,-1,-3,-6,-1,-9);ctx.lineTo(2,-9);ctx.bezierCurveTo(4,-6,3,-1,2,1);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.moveTo(-1.5,.8);ctx.bezierCurveTo(-2.2,-1,-2.2,-5,-0.5,-8);ctx.lineTo(1.5,-8);ctx.bezierCurveTo(3,-5,2.8,-1,1.5,.8);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(210,150,130,.35)';ctx.beginPath();ctx.ellipse(0,-4,1.2,3,0,0,PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle=cBase;ctx.beginPath();ctx.moveTo(hx+4,hy+1);ctx.bezierCurveTo(hx+6,hy-2,hx+14,hy-1,hx+16,hy+2);ctx.bezierCurveTo(hx+16,hy+6,hx+13,hy+8,hx+8,hy+7);ctx.bezierCurveTo(hx+4,hy+6,hx+3,hy+4,hx+4,hy+1);ctx.closePath();ctx.fill();
  ctx.fillStyle=cBelly;ctx.beginPath();ctx.moveTo(hx+5,hy+3);ctx.bezierCurveTo(hx+6,hy+2,hx+13,hy+2,hx+15,hy+3.5);ctx.bezierCurveTo(hx+14,hy+7.5,hx+8,hy+7.5,hx+5,hy+6.5);ctx.bezierCurveTo(hx+4.5,hy+6,hx+4.5,hy+4,hx+5,hy+3);ctx.closePath();ctx.fill();
  ctx.fillStyle=cNose;ctx.beginPath();ctx.ellipse(hx+15,hy+2.2,2.8,2,0,0,PI*2);ctx.fill();
  ctx.strokeStyle=cNose;ctx.lineWidth=0.9;ctx.beginPath();ctx.moveTo(hx+15,hy+4);ctx.lineTo(hx+15,hy+5.8);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.arc(hx+13.5,hy+1.4,.9,0,PI*2);ctx.fill();
  ctx.fillStyle=cNose;ctx.beginPath();ctx.ellipse(hx+4.5,hy-2.5,3.2,2.8,-0.1,0,PI*2);ctx.fill();
  ctx.fillStyle='#6a3a12';ctx.beginPath();ctx.ellipse(hx+4.5,hy-2.5,2.2,2.2,-0.1,0,PI*2);ctx.fill();
  ctx.fillStyle=cNose;ctx.beginPath();ctx.ellipse(hx+4.5,hy-2.5,1.1,1.2,-0.1,0,PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.arc(hx+6,hy-3.8,.9,0,PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(hx+3.5,hy-1.5,.45,0,PI*2);ctx.fill();
  if(charging){ctx.strokeStyle='rgba(60,30,10,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hx+8,hy+5.5);ctx.bezierCurveTo(hx+11,hy+7.5,hx+13,hy+7.5,hx+15,hy+6);ctx.stroke();ctx.fillStyle='#f0e8dc';[[hx+9,hy+6],[hx+11,hy+7],[hx+13,hy+6.5]].forEach(([x,y])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.6,y+2);ctx.lineTo(x+1.4,y);ctx.fill();});}
  else{ctx.strokeStyle='rgba(60,30,10,.45)';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(hx+9,hy+6);ctx.quadraticCurveTo(hx+12,hy+7.5,hx+15,hy+5.8);ctx.stroke();}
  ctx.restore();
  if(charging){ctx.save();ctx.globalAlpha=0.18;ctx.shadowColor='#ffbb55';ctx.shadowBlur=18;ctx.strokeStyle='#ffdd88';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(4,2,30,14,bodyLean,0,PI*2);ctx.stroke();ctx.globalAlpha=0.07;ctx.beginPath();ctx.ellipse(4,2,38,18,bodyLean,0,PI*2);ctx.stroke();ctx.restore();}
  if(p.chargeDmgBonus>0){ctx.save();ctx.globalAlpha=0.45+Math.sin(t*8)*.2;ctx.shadowColor='#ffcc00';ctx.shadowBlur=12;ctx.strokeStyle='#ffee44';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.ellipse(4,1,28,13,0,0,PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
  if(p.bloodlustActive){ctx.save();ctx.globalAlpha=0.55+Math.sin(t*10)*.25;ctx.shadowColor='#ff0000';ctx.shadowBlur=20;ctx.strokeStyle='#ff2222';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(4,-2,32,20,bodyLean,0,PI*2);ctx.stroke();ctx.restore();}
  ctx.restore();
}

function drawPlayer(W,H,p){
  const sx=W/2, sy=H/2;
  if(p.invT>0&&Math.floor(p.invT*16)%2===0) return;
  // Muerte animada (ver endGame): sin update() corriendo, el cuadro sale del reloj y se vuelve a pedir draw() hasta el último
  if(p.deathT0!==undefined){
    const [,count,fps]=SPRITE_CFG[p.id].anims.death, f=Math.floor((performance.now()-p.deathT0)/1000*fps);
    p.sprFrame=Math.min(count-1,f);
    if(f<count-1) _redraw=true;
  }

  const bob=Math.sin(p.walkPhase)*.5; // walking bob

  ctx.save();
  // XP aura
  if(p.up.xpm>1){
    const gw=Math.sin(p.animT*3)*.15+.2;
    ctx.shadowColor='#2ecc71'; ctx.shadowBlur=18;
    ctx.strokeStyle=`rgba(46,204,113,${gw})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(sx,sy-8+bob,24,0,PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }
  ctx.restore();

  ctx.save();
  if(p.invisT>0) ctx.globalAlpha=.3+.1*Math.sin(G.time*14); // SIGILO: el héroe se vuelve translúcido
  HEROES[p.id].draw(sx,sy+bob,p);
  ctx.restore();

  // HP bar
  // Si el personaje activo usa sprite PNG (más alto que el procedural), la barra sube
  // para no taparle la cabeza; el resto usa el offset clásico.
  const spriteCfg=!SPRITES[p.id] ? null
                 : (p.melee && KNIGHT_NAT && knightSheetsReady()) ? {drawH:SPRITE_CFG.knS_idle.figH} // Caballero SUAVE: barra sobre la cabeza
                 : SPRITE_CFG[p.id];
  const barY=spriteCfg ? sy-spriteCfg.drawH-6+bob : sy-38+bob;
  const hr=p.hp/p.mhp;
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(sx-16,barY,32,6);
  ctx.fillStyle='#1a0000'; ctx.fillRect(sx-15,barY+1,30,4);
  const hcol=hr>.5?'#22cc66':hr>.25?'#ff8800':'#ee2222';
  ctx.fillStyle=hcol; ctx.fillRect(sx-15,barY+1,30*hr,4);
  ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(sx-15,barY+1,30*hr,1);
}

// Caída por código para hojas sin cuadros de muerte (Caballero ORIGINAL y Arquero): el cuadro de reposo rota hacia
// delante sobre los pies y se apaga un poco. Usa p.sprFrame de la animación 'death' (5 cuadros: 0..4 = de pie..en el piso).
function drawSpriteFall(sheet,cfg,sx,sy,p){
  const t=Math.min(1,(p.sprFrame||0)/4), dir=p.facingLeft?-1:1;
  ctx.save(); ctx.translate(sx,sy); ctx.rotate(dir*t*PI/2); ctx.globalAlpha=1-.25*t;
  drawSpriteFrame(sheet, cfg, 'idle', 0, 0, 0, p.facingLeft||false, false);
  ctx.restore();
}

function drawKnight(sx,sy,p){
  // Si el sprite sheet está cargado, usarlo
  if(SPRITES.knightNew || SPRITES.knight){
    // Parpadeo de invencibilidad
    if(p.invT>0 && Math.floor(p.invT*16)%2===0) return;
    const ks=(KNIGHT_NAT&&knightSheetsReady())?knScale():1; // la sombra crece con el sprite
    drawGroundShadow(sx,sy+2,12*ks,3.5*ks,.25);
    if(SPRITES.knightNew){
      const anim=p.sprAnim||'idle';
      if(KNIGHT_NAT && knightSheetsReady()){
        drawKnightSuave(sx,sy,p);
      } else if(anim==='death'){
        drawSpriteFall(SPRITES.knightNew, SPRITE_CFG.knight, sx, sy, p);
      } else if(KNIGHT_NAT){
        drawKnightNat(sx,sy,p,anim);
      } else if(anim==='attack' && SPRITES.knightAtk){
        drawSpriteFrame(SPRITES.knightAtk, SPRITE_CFG.knightAtk, 'attack', p.sprFrame||0, sx, sy, p.facingLeft||false, p.dmgF>0);
      } else {
        drawSpriteFrame(SPRITES.knightNew, SPRITE_CFG.knight, anim, p.sprFrame||0, sx, sy, p.facingLeft||false, p.dmgF>0);
      }
    } else {
      // respaldo: hoja vieja
      drawSpriteFrame(SPRITES.knight, SPRITE_CFG.knightOld,
                      p.sprAnim||'idle', p.sprFrame||0,
                      sx, sy, p.facingLeft||false, p.dmgF>0);
    }
    return;
  }

  // Fallback: sprite procedural original si la imagen no cargó
  ctx.save();
  const bob=Math.sin(p.walkPhase)*.5;
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(sx,sy+10+bob,12,4,0,0,PI*2); ctx.fill();
  ctx.fillStyle='#1e2d44'; ctx.fillRect(sx-9,sy+2+bob,7,10); ctx.fillRect(sx+2,sy+2+bob,7,10);
  ctx.fillStyle='#152030';
  ctx.beginPath(); ctx.ellipse(sx,sy-8+bob,10,12,0,0,PI*2); ctx.fill();
  ctx.fillStyle='#1e3050';
  ctx.beginPath(); ctx.ellipse(sx,sy-10+bob,9,11,0,0,PI*2); ctx.fill();
  ctx.fillStyle='#aa8833';
  ctx.fillRect(sx-10,sy-18+bob,20,3);
  ctx.fillStyle='#2a3a5a';
  ctx.beginPath(); ctx.ellipse(sx,sy-22+bob,8,9,0,0,PI*2); ctx.fill();
  ctx.fillStyle='#3a4a6a';
  ctx.beginPath(); ctx.ellipse(sx,sy-23+bob,7,8,0,0,PI*2); ctx.fill();
  ctx.fillStyle='#aa8833'; ctx.fillRect(sx-3,sy-20+bob,6,3);
  ctx.fillStyle='rgba(255,0,0,.7)';
  for(let i=0;i<3;i++) ctx.fillRect(sx-1,sy-18+bob+i*1.5,3,1);
  if(!p.dmgF||p.dmgF<0.05){
    ctx.shadowColor='#4488ff'; ctx.shadowBlur=8;
    ctx.fillStyle='#4488ff';
    ctx.beginPath(); ctx.ellipse(sx,sy-23+bob,3,4,0,0,PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.restore();
}

// Arquero (dibujo provisional por código, hasta tener sus sprites): encapuchado verde con arco y carcaj
function drawArcher(sx,sy,p){
  // Con el sprite cargado se usa el sheet; si no, el dibujo procedural de abajo
  if(SPRITES.archer){
    if(p.invT>0 && Math.floor(p.invT*16)%2===0) return;
    drawGroundShadow(sx,sy+2,11,3.5,.25);
    if(p.sprAnim==='death') drawSpriteFall(SPRITES.archer, SPRITE_CFG.archer, sx, sy, p); // la hoja no tiene cuadros de muerte
    else drawSpriteFrame(SPRITES.archer, SPRITE_CFG.archer, p.sprAnim||'idle', p.sprFrame||0, sx, sy, p.facingLeft||false, p.dmgF>0);
    return;
  }
  const flash=p.dmgF>0, f=c=>flash?'#ffffff':c;
  const ph=Math.sin(p.walkPhase||0);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(sx,sy+10,11,3.5,0,0,PI*2); ctx.fill();
  ctx.translate(sx,sy); ctx.scale(p.facingLeft?-1:1,1);
  // piernas y botas
  const l1=ph>0?0:1, l2=ph>0?1:0;
  ctx.fillStyle=f('#3b2a1a'); ctx.fillRect(-6,2+l1,5,9); ctx.fillRect(1,2+l2,5,9);
  ctx.fillStyle=f('#241810'); ctx.fillRect(-6,9+l1,6,3); ctx.fillRect(1,9+l2,6,3);
  // carcaj con flechas (a la espalda)
  ctx.fillStyle=f('#5a3a1e'); ctx.fillRect(-13,-17,5,17);
  ctx.fillStyle=f('#c8d89a'); ctx.fillRect(-12,-21,1,4); ctx.fillRect(-10,-20,1,3);
  // túnica y cinturón
  ctx.fillStyle=f('#2d5a1e'); ctx.beginPath(); ctx.ellipse(0,-6,9,11,0,0,PI*2); ctx.fill();
  ctx.fillStyle=f('#3f7a2a'); ctx.beginPath(); ctx.ellipse(1,-8,6,8,0,0,PI*2); ctx.fill();
  ctx.fillStyle=f('#6b4a22'); ctx.fillRect(-9,-3,18,3);
  // capucha y rostro en sombra
  ctx.fillStyle=f('#1f4016'); ctx.beginPath(); ctx.ellipse(0,-20,8.5,9.5,0,0,PI*2); ctx.fill();
  ctx.fillStyle=f('#0c1a0a'); ctx.beginPath(); ctx.ellipse(2,-19,5,5.5,0,0,PI*2); ctx.fill();
  if(!flash){ ctx.fillStyle='#ffd34d'; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=5; ctx.fillRect(3,-20,2.5,1.6); ctx.shadowBlur=0; }
  // brazo extendido y arco
  ctx.fillStyle=f('#2d5a1e'); ctx.fillRect(3,-10,17,3.2);
  ctx.fillStyle=f('#c9a27a'); ctx.beginPath(); ctx.arc(21,-8.4,2.2,0,PI*2); ctx.fill();
  ctx.strokeStyle=f('#8a5a2e'); ctx.lineWidth=2.4; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(10,-8.4,13,-1.15,1.15); ctx.stroke();
  const bx=10+13*Math.cos(1.15), by=13*Math.sin(1.15);
  ctx.strokeStyle='rgba(235,230,210,.85)'; ctx.lineWidth=.9;
  ctx.beginPath(); ctx.moveTo(bx,-8.4-by); ctx.lineTo(bx,-8.4+by); ctx.stroke();
  ctx.restore();
}

function drawMage(sx,sy,p){
  // Si el sprite sheet está cargado, usarlo
  if(SPRITES.mage){
    if(p.invT>0 && Math.floor(p.invT*16)%2===0) return;
    drawGroundShadow(sx,sy+2,11,3.5,.25);
    drawSpriteFrame(SPRITES.mage, SPRITE_CFG.mage,
                    p.sprAnim||'idle', p.sprFrame||0,
                    sx, sy, p.facingLeft||false, p.dmgF>0);
    return;
  }

  ctx.save();
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(sx,sy+10,10,3,0,0,PI*2); ctx.fill();

  // Boots
  ctx.fillStyle='#2a1040'; ctx.fillRect(sx-7,sy+2,5,10); ctx.fillRect(sx+2,sy+2,5,10);
  ctx.fillStyle='#1a0828'; ctx.fillRect(sx-7,sy+8,5,4);  ctx.fillRect(sx+2,sy+8,5,4);

  // Robe lower
  ctx.fillStyle=p.sc; ctx.fillRect(sx-9,sy-4,18,14);
  ctx.fillStyle=p.col; ctx.fillRect(sx-8,sy-3,16,12);
  // Robe trim – gold
  ctx.fillStyle='#cc9900'; ctx.fillRect(sx-8,sy-3,2,12); ctx.fillRect(sx+6,sy-3,2,12);
  ctx.fillStyle='#ffcc00'; ctx.fillRect(sx-8,sy-3,1,12); ctx.fillRect(sx+7,sy-3,1,12);

  // Robe body
  ctx.fillStyle=p.sc; ctx.fillRect(sx-8,sy-18,16,17);
  ctx.fillStyle=p.col; ctx.fillRect(sx-7,sy-17,14,15);
  ctx.fillStyle='#6611aa'; ctx.fillRect(sx-5,sy-9,10,9);
  // Inner chest rune
  ctx.fillStyle='#aa44ff'; ctx.fillRect(sx-2,sy-7,4,4);
  ctx.fillStyle='#cc66ff'; ctx.fillRect(sx-1,sy-6,2,2);
  // Robe shine
  ctx.fillStyle='rgba(200,150,255,.1)'; ctx.fillRect(sx-7,sy-17,14,3);

  // Sleeves
  ctx.fillStyle=p.col; ctx.fillRect(sx-13,sy-15,6,10); ctx.fillRect(sx+7,sy-15,6,10);
  ctx.fillStyle='#cc9900'; ctx.fillRect(sx-13,sy-6,6,2); ctx.fillRect(sx+7,sy-6,6,2);

  // Hands
  ctx.fillStyle='#ffcc99'; ctx.fillRect(sx-12,sy-7,5,5); ctx.fillRect(sx+7,sy-7,5,5);

  // Orbs (hands)
  ctx.shadowColor='#cc44ff'; ctx.shadowBlur=12;
  ctx.fillStyle='#cc44ff'; ctx.beginPath(); ctx.arc(sx-10,sy-8,4,0,PI*2); ctx.fill();
  ctx.fillStyle='#cc44ff'; ctx.beginPath(); ctx.arc(sx+10,sy-8,4,0,PI*2); ctx.fill();
  ctx.fillStyle='#ffffff88'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(sx-11,sy-9,1.5,0,PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+9,sy-9,1.5,0,PI*2); ctx.fill();

  // Head / face
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffcc99'; ctx.fillRect(sx-5,sy-26,10,11);
  ctx.fillStyle='#ddaa77'; ctx.fillRect(sx-5,sy-16,10,2);
  // Eyes
  ctx.fillStyle='#8800ff'; ctx.fillRect(sx-3,sy-23,2,3); ctx.fillRect(sx+1,sy-23,2,3);
  ctx.fillStyle='#cc66ff'; ctx.fillRect(sx-3,sy-23,2,1); ctx.fillRect(sx+1,sy-23,2,1);

  // Hat brim
  ctx.fillStyle='#330044'; ctx.fillRect(sx-9,sy-29,18,5);
  ctx.fillStyle='#440055'; ctx.fillRect(sx-8,sy-29,16,3);
  // Hat cone
  ctx.fillStyle='#440066'; ctx.fillRect(sx-6,sy-40,12,13);
  ctx.fillStyle='#550077'; ctx.fillRect(sx-5,sy-39,10,11);
  // Hat band
  ctx.fillStyle='#ff44ff'; ctx.fillRect(sx-6,sy-31,12,2);
  ctx.fillStyle='#ff88ff'; ctx.fillRect(sx-6,sy-31,12,1);
  // Star
  ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8;
  ctx.fillRect(sx-1,sy-37,2,6); ctx.fillRect(sx-3,sy-35,6,2);
  ctx.shadowBlur=0;

  // Wand
  ctx.fillStyle='#441100'; ctx.fillRect(sx+11,sy-22,4,18);
  ctx.fillStyle='#663300'; ctx.fillRect(sx+12,sy-22,2,16);
  ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(sx+12,sy-22,1,10);
  // Wand crystal
  ctx.shadowColor='#ff44ff'; ctx.shadowBlur=16;
  ctx.fillStyle='#ff44ff'; ctx.fillRect(sx+9,sy-25,8,7);
  ctx.fillStyle='#ff88ff'; ctx.fillRect(sx+11,sy-24,4,5);
  ctx.fillStyle='#fff'; ctx.shadowBlur=0; ctx.fillRect(sx+12,sy-24,2,2);

  ctx.restore();
}


function drawNecro(sx,sy,p){
  // Si el sprite sheet está cargado, usarlo
  if(SPRITES.necro){
    if(p.invT>0 && Math.floor(p.invT*16)%2===0) return;
    drawGroundShadow(sx,sy+2,11,3.5,.25);
    drawSpriteFrame(SPRITES.necro, SPRITE_CFG.necro,
                    p.sprAnim||'idle', p.sprFrame||0,
                    sx, sy, p.facingLeft||false, p.dmgF>0);
    // Aura de invocación si hay esqueletos
    if(G.skeletons.length>0){
      const gw=Math.sin(p.animT*3)*.2+.25;
      ctx.shadowColor='#44ffaa'; ctx.shadowBlur=20;
      ctx.strokeStyle=`rgba(68,255,170,${gw})`; ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(sx,sy-8,26,0,PI*2);ctx.stroke();
      ctx.shadowBlur=0;
    }
    // Contador de esqueletos activos (mini HUD)
    if(G.skeletons.length>0){
      const maxS=p.up.maxSkeletons||2;
      ctx.fillStyle='rgba(68,255,170,.8)';
      ctx.font=`bold 10px 'Courier New'`;
      ctx.fillText(`💀×${G.skeletons.length}/${maxS}`, sx-14, sy+26);
    }
    return;
  }

  // Fallback: sprite procedural original si la imagen no cargó
  ctx.save();
  // Sombra
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath();ctx.ellipse(sx,sy+10,9,3,0,0,PI*2);ctx.fill();

  // Aura de invocación si hay esqueletos
  if(G.skeletons.length>0){
    const gw=Math.sin(p.animT*3)*.2+.25;
    ctx.shadowColor='#44ffaa'; ctx.shadowBlur=20;
    ctx.strokeStyle=`rgba(68,255,170,${gw})`; ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(sx,sy-8,26,0,PI*2);ctx.stroke();
    ctx.shadowBlur=0;
  }

  // Piernas / túnica inferior
  ctx.fillStyle='#0d1a0d'; ctx.fillRect(sx-8,sy,16,12);
  ctx.fillStyle='#112211'; ctx.fillRect(sx-7,sy+1,14,10);
  // Borde túnica
  ctx.fillStyle='#44ffaa'; ctx.fillRect(sx-8,sy,16,2);

  // Cuerpo túnica
  ctx.fillStyle=p.sc; ctx.fillRect(sx-9,sy-16,18,18);
  ctx.fillStyle=p.col; ctx.fillRect(sx-8,sy-15,16,16);
  ctx.fillStyle='#0a2a1a'; ctx.fillRect(sx-6,sy-8,12,10);
  // Runas en el pecho
  ctx.fillStyle='#44ffaa'; ctx.shadowColor='#44ffaa'; ctx.shadowBlur=6;
  ctx.fillRect(sx-1,sy-6,2,6); ctx.fillRect(sx-3,sy-4,6,2);
  ctx.shadowBlur=0;
  // Bordes túnica
  ctx.fillStyle='#44ffaa';
  ctx.fillRect(sx-8,sy-15,2,15); ctx.fillRect(sx+6,sy-15,2,15);
  ctx.fillRect(sx-6,sy,12,2);

  // Brazos / mangas
  ctx.fillStyle=p.col; ctx.fillRect(sx-14,sy-14,7,9); ctx.fillRect(sx+7,sy-14,7,9);
  ctx.fillStyle='#44ffaa'; ctx.fillRect(sx-14,sy-6,7,2); ctx.fillRect(sx+7,sy-6,7,2);
  // Manos esqueléticas (efecto necro)
  ctx.fillStyle='#ccffee';
  ctx.fillRect(sx-13,sy-7,5,5); ctx.fillRect(sx+8,sy-7,5,5);
  // Dedos hueso
  ctx.strokeStyle='#44ffaa'; ctx.lineWidth=1;
  for(let i=0;i<3;i++){
    ctx.beginPath();ctx.moveTo(sx-11+i*1.5,sy-3);ctx.lineTo(sx-12+i*1.5,sy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(sx+9+i*1.5,sy-3);ctx.lineTo(sx+10+i*1.5,sy);ctx.stroke();
  }

  // Staff (izquierda)
  ctx.fillStyle='#1a3322'; ctx.fillRect(sx-16,sy-28,4,30);
  ctx.fillStyle='#226633'; ctx.fillRect(sx-15,sy-28,2,28);
  // Orbe del staff
  ctx.shadowColor='#44ffaa'; ctx.shadowBlur=16;
  ctx.fillStyle='#44ffaa';
  ctx.beginPath();ctx.arc(sx-14,sy-30,6,0,PI*2);ctx.fill();
  ctx.fillStyle='#aaffdd'; ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(sx-16,sy-32,2.5,0,PI*2);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(sx-16.5,sy-32.5,1,0,PI*2);ctx.fill();
  // Calavera decorativa en el staff
  ctx.fillStyle='#ccffee'; ctx.beginPath();ctx.ellipse(sx-14,sy-30,4,4,0,0,PI*2);ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.arc(sx-15.5,sy-30.5,1,0,PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(sx-12.5,sy-30.5,1,0,PI*2);ctx.fill();

  // Cabeza
  ctx.fillStyle='#ffcc99'; ctx.fillRect(sx-5,sy-24,10,10);
  // Capucha / cowl
  ctx.fillStyle='#0a1a0a'; ctx.fillRect(sx-8,sy-29,16,8);
  ctx.fillStyle='#112211'; ctx.fillRect(sx-7,sy-28,14,6);
  ctx.fillStyle='#0a1a0a'; ctx.fillRect(sx-6,sy-34,12,10);
  ctx.fillStyle='#112211'; ctx.fillRect(sx-5,sy-33,10,8);
  // Borde capucha
  ctx.fillStyle='#44ffaa';
  ctx.fillRect(sx-8,sy-29,16,1);
  // Ojos brillantes
  ctx.shadowColor='#44ffaa'; ctx.shadowBlur=10;
  ctx.fillStyle='#44ffaa';
  ctx.beginPath();ctx.arc(sx-2.5,sy-21,2,0,PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(sx+2.5,sy-21,2,0,PI*2);ctx.fill();
  ctx.fillStyle='#ccffee'; ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(sx-2.5,sy-21.5,0.8,0,PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(sx+2.5,sy-21.5,0.8,0,PI*2);ctx.fill();

  ctx.restore();

  // Contador de esqueletos activos (mini HUD)
  if(G.skeletons.length>0){
    const maxS=p.up.maxSkeletons||2;
    ctx.fillStyle='rgba(68,255,170,.8)';
    ctx.font=`bold 10px 'Courier New'`;
    ctx.fillText(`💀×${G.skeletons.length}/${maxS}`, sx-14, sy+26);
  }
}
