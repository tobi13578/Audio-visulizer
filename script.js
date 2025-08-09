let fft, amp, mic, mediaEl, source;
let sensitivity = 1.0, angle = 0, t = 0;
let beatHold = 0, thresh = 120, decay = 0.98, holdFrames = 6;
let preset = 'mandala', wakeLock = null; let particles = [];

function setup(){
  pixelDensity(1); createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(60); colorMode(HSB,360,100,100,100); noStroke();
  fft = new p5.FFT(0.8, 1024); amp = new p5.Amplitude();
  document.getElementById('start').onclick = async () => {
    const ac = getAudioContext(); if (ac.state !== 'running') await ac.resume();
    document.getElementById('notice').classList.add('hidden'); try{ await requestWakeLock(); }catch{}
  };
  document.getElementById('file').onchange = handleFile;
  document.getElementById('mic').onclick = startMic;
  document.getElementById('fs').onclick = () => document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  document.getElementById('hide').onclick = () => {
    const ui = document.getElementById('ui'); ui.style.display = ui.style.display==='none'?'flex':'none';
  };
  document.getElementById('preset').onchange = e => preset = e.target.value;
  document.getElementById('sens').oninput = e => sensitivity = parseFloat(e.target.value);
}

async function handleFile(e){
  stopAudio();
  const f = e.target.files[0]; if(!f) return;
  mediaEl = createAudio(URL.createObjectURL(f));
  mediaEl.elt.loop = true; mediaEl.volume(1.0); mediaEl.play();
  source = new p5.MediaElementSource(mediaEl.elt);
  fft.setInput(mediaEl); amp.setInput(mediaEl);
}

async function startMic(){
  stopAudio(); mic = new p5.AudioIn(); await mic.start();
  fft.setInput(mic); amp.setInput(mic);
}

function stopAudio(){
  if (mediaEl){ try{ mediaEl.stop(); mediaEl.remove(); }catch{} mediaEl=null; }
  if (mic){ try{ mic.stop(); }catch{} mic=null; }
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); }

function draw(){
  background(0,0,0,100); t += 0.005; angle += 0.002;
  if (!fft) return;
  const bass=fft.getEnergy(20,150), mid=fft.getEnergy(150,1500), high=fft.getEnergy(3000,8000);
  const isBeat = beat(bass, sensitivity); const zoom = 1.0 + (isBeat ? 0.08 : 0.0);
  scale(zoom,zoom,1); rotateZ(angle*0.6);
  if (preset==='mandala') renderMandala(bass, mid, high, isBeat);
  else if (preset==='particles') renderParticles(bass, mid, high, isBeat);
  else renderWaves(bass, mid, high);
}

function beat(bass, sens){
  if (beatHold>0){ beatHold--; thresh*=decay; return false; }
  if (bass > thresh * sens){ thresh=bass; beatHold=holdFrames; return true; }
  thresh = Math.max(100, thresh*decay); return false;
}

function renderMandala(b,m,h,isBeat){
  const arms=64, rBase=map(b,80,220,120,width*0.36,true), detail=map(h,60,200,0.4,1.8,true);
  for(let i=0;i<arms;i++){ push(); rotateZ((TWO_PI/arms)*i);
    const hue=(i*6+frameCount*0.2+m*0.3)%360; fill(hue,90,90,70);
    beginShape(); for(let a=0;a<1.0;a+=0.05){ const n=noise(i*0.1,a*detail,t);
      const r=rBase*(0.7+0.3*n)+(isBeat?14:0); vertex(r*cos(a*TWO_PI), r*sin(a*TWO_PI), 0);
    } endShape(CLOSE); pop(); }
}

function renderParticles(b,m,h,isBeat){
  const count=isBeat?40:6;
  for(let i=0;i<count;i++){ particles.push({a:random(TWO_PI),r:random(30,width*0.45),sp:random(0.002,0.02)+h*0.00002,hue:random(360),alpha:100,sz:random(2,8)}); }
  particles=particles.filter(p=>p.alpha>4);
  for(let p of particles){ p.a+=p.sp; p.r*=0.999;
    push(); const x=cos(p.a)*p.r,y=sin(p.a)*p.r; fill((p.hue+frameCount*0.4)%360,90,100,p.alpha);
    translate(x,y,0); sphere(p.sz+b*0.01,6,4); pop(); p.alpha*=0.992; }
}

function renderWaves(b,m,h){
  const rows=60, cols=140, ampN=map(m,60,200,8,60,true);
  rotateX(PI/3); translate(-width*0.35,-height*0.15,0);
  for(let y=0;y<rows;y++){ beginShape();
    for(let x=0;x<cols;x++){ const n=noise(x*0.02,y*0.05,t*2); const z=(n-0.5)*ampN*8+(b-120)*0.2;
      const hue=(x+frameCount*0.6)%360; fill(hue,90,90,60); vertex(x*8,y*8,z); }
    endShape(); }
}

async function requestWakeLock(){ try{ if('wakeLock' in navigator) await navigator.wakeLock.request('screen'); }catch{} }
