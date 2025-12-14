

const $ = (id) => document.getElementById(id);

// UI
const envRow = $("envRow");
const breathPill = $("breathPill");
const timerText = $("timerText");
const statusText = $("statusText");

const btnFullscreen = $("btnFullscreen");
const btnGear = $("btnGear");
const btnBack = $("btnBack");

const btnReset = $("btnReset");
const btnStartStop = $("btnStartStop");
const btnMute = $("btnMute");

const soundType = $("soundType");
const volumeSlider = $("volume");
const speedSlider = $("speed");
const orbSizeSlider = $("orbSize");
const intensitySlider = $("intensity");
const soundSpeedSlider = $("soundSpeed");

const device = $("device");


const THEMES = [
  {
    id: "forest",
    name: "Forest Glade",
    thumb: ["#0b3d2e", "#38d39f"],
    bg: 0x07110e,
    plane: 0x0a2017,
    orb: 0xff3b30,
    emissive: 0x660000,
    rim: 0xff3b30,
    accent: "#0b3d2e",
  },
  {
    id: "beach",
    name: "Sunset Beach",
    thumb: ["#ffb86b", "#6c5ce7"],
    bg: 0x0b0b12,
    plane: 0x130f1a,
    orb: 0xff3b30,
    emissive: 0x660000,
    rim: 0xff3b30,
    accent: "#ffb86b",
  },
  {
    id: "mountain",
    name: "Mountain Peak",
    thumb: ["#9ecbff", "#2f62ff"],
    bg: 0x070b14,
    plane: 0x0b1224,
    orb: 0xff3b30,
    emissive: 0x660000,
    rim: 0xff3b30,
    accent: "#2f62ff",
  },
  {
    id: "night",
    name: "Night Sky",
    thumb: ["#12123a", "#ff3b30"],
    bg: 0x000010,
    plane: 0x050515,
    orb: 0xffffff,
    emissive: 0x330000,
    rim: 0xff3b30,
    accent: "#12123a",
  },
  {
    id: "minimal",
    name: "Minimal",
    thumb: ["#f3f4f6", "#e5e7eb"],
    bg: 0x000000,
    plane: 0x090909,
    orb: 0xff3b30,
    emissive: 0x660000,
    rim: 0xff3b30,
    accent: "#111827",
  },
];

let currentTheme = THEMES[0].id;

// ---------- Build env cards ----------
function makeEnvCards(){
  envRow.innerHTML = "";
  for (const t of THEMES){
    const card = document.createElement("div");
    card.className = "envCard" + (t.id === currentTheme ? " selected" : "");
    card.dataset.theme = t.id;

    const thumb = document.createElement("div");
    thumb.className = "envThumb";
    thumb.style.background = `radial-gradient(120px 80px at 35% 30%, ${t.thumb[1]}55, transparent 60%),
                              linear-gradient(135deg, ${t.thumb[0]}, ${t.thumb[1]})`;

    const name = document.createElement("div");
    name.className = "envName";
    name.textContent = t.name;

    card.appendChild(thumb);
    card.appendChild(name);

    card.addEventListener("click", () => selectTheme(t.id));
    envRow.appendChild(card);
  }
}
makeEnvCards();

// ---------- WebGL ----------
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 0, 6);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.PointLight(0xffffff, 1.1);
keyLight.position.set(5, 5, 7);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xff3b30, 1.0);
rimLight.position.set(-6, 2, 6);
scene.add(rimLight);

// Background plane
const bgPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 30),
  new THREE.MeshBasicMaterial({ color: 0x0b0b0b })
);
bgPlane.position.z = -12;
scene.add(bgPlane);

// Orb
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0x660000,
    roughness: 0.25,
    metalness: 0.12,
  })
);
scene.add(orb);

// Ring glow
const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.35, 2.85, 96),
  new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.12 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = -1.35;
scene.add(ring);

// Soft vignette feel via a faint overlay plane (optional)
const haze = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 30),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.10 })
);
haze.position.z = -11.5;
scene.add(haze);

function resize(){
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------- Theme apply ----------
function selectTheme(id){
  currentTheme = id;
  makeEnvCards();
  applyTheme();
  statusText.textContent = `Theme: ${THEMES.find(t=>t.id===id)?.name || id}`;
}

function applyTheme(){
  const t = THEMES.find(x=>x.id===currentTheme) || THEMES[0];
  scene.background = new THREE.Color(t.bg);
  bgPlane.material.color.setHex(t.plane);
  orb.material.color.setHex(t.orb);
  orb.material.emissive.setHex(t.emissive);
  rimLight.color.setHex(t.rim);
  ring.material.color.setHex(t.rim);
}
applyTheme();

// ---------- Breathing + timer ----------
let running = false;
let paused = false;
let phase = 0;
let last = performance.now();

let elapsed = 0; // seconds
let timerActive = false;

function fmtTime(s){
  s = Math.max(0, Math.floor(s));
  const mm = String(Math.floor(s / 60)).padStart(2,"0");
  const ss = String(s % 60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function setStartUI(isRunning){
  btnStartStop.textContent = isRunning ? "⏸" : "▶";
}

function setBreathText(txt){
  breathPill.textContent = txt;
}

btnStartStop.addEventListener("click", () => {
  running = true;
  paused = !paused;

  if (paused) {
    timerActive = false;
    setStartUI(false);
    statusText.textContent = "Paused";
  } else {
    timerActive = true;
    setStartUI(true);
    statusText.textContent = "Running";
    // also attempt to unlock audio if user wants it
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
  }

  // if first time starting, ensure not stuck in "paused=true" default
  if (!timerActive && elapsed === 0 && !paused) timerActive = true;
});

btnReset.addEventListener("click", () => {
  elapsed = 0;
  timerText.textContent = "00:00";
  phase = 0;
  paused = true;
  timerActive = false;
  setStartUI(false);
  setBreathText("Breathe In");
  statusText.textContent = "Reset";
});

let muted = true;
btnMute.addEventListener("click", () => {
  muted = !muted;
  btnMute.textContent = muted ? "🔇" : "🔊";
  if (!muted) {
    startAmbience(soundType.value);
    statusText.textContent = "Audio: playing";
  } else {
    stopAmbience();
    statusText.textContent = "Audio: muted";
  }
});
btnMute.textContent = "🔇";

// ---------- Fullscreen ----------
btnFullscreen.addEventListener("click", async () => {
  try{
    if (!document.fullscreenElement) {
      await device.requestFullscreen();
      statusText.textContent = "Fullscreen enabled";
    } else {
      await document.exitFullscreen();
      statusText.textContent = "Fullscreen exited";
    }
  } catch {
    statusText.textContent = "Fullscreen blocked (try Chrome/Edge)";
  }
});

// Small buttons (non-essential)
btnGear.addEventListener("click", () => {
  alert(
    "MindConnect Calm Mode\n\n" +
    "• Swipe themes, tap to select\n" +
    "• ▶ / ⏸ to run breathing\n" +
    "• 🔇 / 🔊 to mute/unmute ambience\n" +
    "• Sliders control speed, size, volume & sound feel\n" +
    "• ⛶ for fullscreen\n"
  );
});
btnBack.addEventListener("click", () => {
  statusText.textContent = "Back (demo button)";
});

// Sliders live affect
speedSlider.addEventListener("input", () => {});
orbSizeSlider.addEventListener("input", () => {});
volumeSlider.addEventListener("input", () => {
  if (masterGain) masterGain.gain.value = parseFloat(volumeSlider.value);
});

// ---------- Animation loop ----------
function tick(now){
  requestAnimationFrame(tick);
  resize();

  const dt = (now - last) / 1000;
  last = now;

  // timer
  if (timerActive && !paused) {
    elapsed += dt;
    timerText.textContent = fmtTime(elapsed);
  }

  if (running && !paused) {
    const speed = parseFloat(speedSlider.value);
    phase += dt * speed * 1.25;

    const s = (Math.sin(phase) + 1) / 2; // 0..1
    const base = parseFloat(orbSizeSlider.value);

    const minS = base * 0.92;
    const maxS = base * 1.60;
    const scale = minS + (maxS - minS) * s;

    orb.scale.set(scale, scale, scale);
    ring.scale.set(scale * 1.10, scale * 1.10, 1);

    // smooth rotation
    orb.rotation.y += dt * 0.22;
    orb.rotation.x += dt * 0.08;

    // breath label
    const d = Math.cos(phase);
    if (d >= 0) setBreathText("Breathe In");
    else setBreathText("Breathe Out");
  }

  renderer.render(scene, camera);
}
requestAnimationFrame((n)=>{ last = n; tick(n); });

// =========================
// WEB AUDIO (synth ambience)
// =========================
let audioCtx = null;
let masterGain = null;

let sourceNode = null;
let filterNode = null;
let lfoOsc = null;
let lfoGain = null;

function ensureAudio(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(volumeSlider.value);
  masterGain.connect(audioCtx.destination);
}

function createNoiseBuffer(ctx, seconds=2){
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sr * seconds, sr);
  const data = buffer.getChannelData(0);
  for (let i=0;i<data.length;i++){
    data[i] = (Math.random()*2 - 1) * 0.9;
  }
  return buffer;
}

function stopAmbience(){
  try { sourceNode?.stop(); } catch {}
  sourceNode?.disconnect?.();
  filterNode?.disconnect?.();
  lfoOsc?.stop?.();
  lfoOsc?.disconnect?.();
  lfoGain?.disconnect?.();

  sourceNode = null;
  filterNode = null;
  lfoOsc = null;
  lfoGain = null;
}

function startAmbience(type){
  ensureAudio();

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(()=>{});
  }

  stopAmbience();

  const intensity = parseFloat(intensitySlider.value);
  const spd = parseFloat(soundSpeedSlider.value);

  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = createNoiseBuffer(audioCtx, 2);
  sourceNode.loop = true;
  sourceNode.playbackRate.value = spd;

  filterNode = audioCtx.createBiquadFilter();

  if (type === "rain") {
    filterNode.type = "highpass";
    filterNode.frequency.value = 950 * intensity;
    filterNode.Q.value = 0.85;
  } else if (type === "forest") {
    filterNode.type = "lowpass";
    filterNode.frequency.value = 560 * intensity;
    filterNode.Q.value = 0.75;
  } else {
    // ocean
    filterNode.type = "lowpass";
    filterNode.frequency.value = 340 * intensity;
    filterNode.Q.value = 0.95;

    lfoOsc = audioCtx.createOscillator();
    lfoGain = audioCtx.createGain();
    lfoOsc.type = "sine";
    lfoOsc.frequency.value = 0.10 * spd;
    lfoGain.gain.value = 180 * intensity;

    lfoOsc.connect(lfoGain).connect(filterNode.frequency);
    lfoOsc.start();
  }

  sourceNode.connect(filterNode).connect(masterGain);
  sourceNode.start();
}

// restart ambience when tuning sliders (only if unmuted)
soundType.addEventListener("change", () => {
  if (!muted) startAmbience(soundType.value);
});
intensitySlider.addEventListener("input", () => {
  if (!muted && sourceNode) startAmbience(soundType.value);
});
soundSpeedSlider.addEventListener("input", () => {
  if (!muted && sourceNode) startAmbience(soundType.value);
});

// cleanup
window.addEventListener("beforeunload", () => {
  stopAmbience();
  audioCtx?.close?.();
});

// Initial text
statusText.textContent = "Tap ▶ to start. Tap 🔇 to enable audio.";
