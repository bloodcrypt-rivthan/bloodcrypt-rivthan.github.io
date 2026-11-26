// Blood Crypt — teclado y joystick táctil. El orden de carga está en index.html (ver CLAUDE.md).
// ─── INPUT ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key==='Escape') togglePause();
  ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())&&e.preventDefault();
});
document.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);


// ─── JOYSTICK ─────────────────────────────────────────────────────────────────
let joystickActive=false, joystickTouch=null;
let joyVX=0, joyVY=0;

function toggleJoystick(){
  joystickActive=!joystickActive;
  const btn=document.getElementById('joystick-toggle');
  const wrap=document.getElementById('joystick-wrap');
  btn.textContent='🕹 JOYSTICK: '+(joystickActive?'ACTIVADO':'DESACTIVADO');
  btn.classList.toggle('active',joystickActive);
  wrap.style.display=joystickActive?'block':'none';
}

const jBase=document.getElementById('joystick-base');
const jKnob=document.getElementById('joystick-knob');
const JRADIUS=30;

function joyGetPos(touch){
  const rect=jBase.getBoundingClientRect();
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
  const dx=touch.clientX-cx, dy=touch.clientY-cy;
  const dist=Math.min(JRADIUS,Math.sqrt(dx*dx+dy*dy));
  const angle=Math.atan2(dy,dx);
  return{nx:Math.cos(angle)*(dist/JRADIUS),ny:Math.sin(angle)*(dist/JRADIUS),
         px:Math.cos(angle)*dist,py:Math.sin(angle)*dist};
}

jBase.addEventListener('touchstart',e=>{
  e.preventDefault();
  joystickTouch=e.changedTouches[0];
  const{nx,ny,px,py}=joyGetPos(joystickTouch);
  joyVX=nx; joyVY=ny;
  jKnob.style.transform=`translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  jKnob.style.background='rgba(255,255,255,.4)';
},{passive:false});

jBase.addEventListener('touchmove',e=>{
  e.preventDefault();
  joystickTouch=e.changedTouches[0];
  const{nx,ny,px,py}=joyGetPos(joystickTouch);
  joyVX=nx; joyVY=ny;
  jKnob.style.transform=`translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
},{passive:false});

jBase.addEventListener('touchend',e=>{
  e.preventDefault();
  joystickTouch=null; joyVX=0; joyVY=0;
  jKnob.style.transform='translate(-50%,-50%)';
  jKnob.style.background='rgba(255,255,255,.25)';
},{passive:false});

