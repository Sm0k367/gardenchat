// main.js — Echo Garden 3D (Moonlit Edition)
// Voice-first memory garden with procedural 3D flowers, rain, and day/night cycle

// --- CONFIG ---
const CONFIG = {
  bloomBaseRadius: 1.5,
  bloomGrowthSpeed: 0.01,
  colors: {
    joy: 0xf4d35e,     // gold
    sorrow: 0x5d6d8e,  // indigo
    wonder: 0x9b59b6,  // violet
    calm: 0x7d9c6b,    // moss
    neutral: 0xa8b2c1  // silver
  },
  moonColors: {
    night: 0x0f1625,   // deep indigo
    dawn: 0x1a1f35,    // twilight
    day: 0x121a23,     // soft blue
    dusk: 0x1a1f35     // twilight
  },
  particleCount: 200,
  bloomCount: 0
};

// --- DOM ELEMENTS ---
const canvasContainer = document.getElementById('canvas-container');
const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const memoryContainer = document.getElementById('memory-container');

// --- THREE.JS SETUP ---
let scene, camera, renderer, composer;
let bloomPass, renderPass;
let orbitControls;
let clock = new THREE.Clock();
let memories = JSON.parse(localStorage.getItem('echo_garden_memories') || '[]');
let ambientParticles = [];
let bloomGroup = new THREE.Group();
let rainGroup = new THREE.Group();
let sunLight, ambientLight;
let timeOfDay = 0; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight

// Audio
let audioContext = null;
let analyser = null;
let microphone = null;
let dataArray = null;
let panner = null;

// Initialize Three.js
function initThree() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.moonColors.night);
  scene.fog = new THREE.FogExp2(CONFIG.moonColors.night, 0.02);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 15);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  canvasContainer.appendChild(renderer.domElement);

  // Controls
  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 50;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going under ground

  // Postprocessing
  renderPass = new THREE.RenderPass(scene, camera);
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );
  bloomPass.threshold = 0.2;
  bloomPass.strength = 1.2;
  bloomPass.radius = 0.5;

  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffaa00, 0.8);
  sunLight.position.set(10, 20, 10);
  scene.add(sunLight);

  // Ground plane (subtle)
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f14,
    roughness: 1,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  scene.add(ground);

  // Ambient particles (pollen/fireflies)
  initAmbientParticles();

  // Load saved blooms
  memories.forEach(memory => {
    createBloom(memory.text, memory.emotion, memory.bloom.x, memory.bloom.y, memory.bloom.z);
  });

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  animate();
}

// Ambient particles
function initAmbientParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const x = (Math.random() - 0.5) * 40;
    const y = (Math.random() - 0.5) * 20 + 5;
    const z = (Math.random() - 0.5) * 40;
    const color = new THREE.Color(Math.random() > 0.5 ? 0xffffff : 0xf4d35e);
    const size = Math.random() * 0.3 + 0.1;

    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    sizes.push(size);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  ambientParticles.push(particles);
}

// Procedural flower generator
function createBloom(text, emotion, x, y, z) {
  const colorHex = CONFIG.colors[emotion] || CONFIG.colors.neutral;
  const color = new THREE.Color(colorHex);
  const petalCount = Math.max(5, Math.min(12, text.length));
  const maxRadius = CONFIG.bloomBaseRadius + Math.min(3, text.length * 0.2);

  // Create bloom group
  const bloom = new THREE.Group();
  bloom.position.set(x || 0, y || 0, z || 0);

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, maxRadius * 2, 8);
  const stemMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.1
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = maxRadius;
  bloom.add(stem);

  // Petals
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petalGeo = new THREE.ConeGeometry(maxRadius * 0.4, maxRadius, 8, 1, true);
    const petalMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const petal = new THREE.Mesh(petalGeo, petalMat);
    
    petal.position.y = maxRadius * 0.5;
    petal.rotation.x = -Math.PI / 4;
    petal.rotation.z = angle;
    petal.scale.set(1, 1, maxRadius * 0.8);
    
    bloom.add(petal);
  }

  // Center
  const centerGeo = new THREE.SphereGeometry(maxRadius * 0.2, 16, 16);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.5
  });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = maxRadius * 0.5;
  bloom.add(center);

  // Add bloom to scene
  bloomGroup.add(bloom);
  scene.add(bloomGroup);

  // Animate bloom growth
  gsap.from(bloom.scale, {
    x: 0, y: 0, z: 0,
    duration: 2,
    ease: "back.out(1.7)"
  });

  // Animate bloom rotation
  gsap.to(bloom.rotation, {
    y: Math.PI * 2,
    duration: 10,
    repeat: -1,
    ease: "none"
  });

  // Play bloom sound
  playBloomSound(emotion, bloom.position);

  // ✨ NEW: Raindrops for sad memories
  if (emotion === 'sorrow') {
    createRaindrops(bloom.position);
  }

  CONFIG.bloomCount++;
}

// Raindrops for sad memories
function createRaindrops(position) {
  const rainGeo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];

  for (let i = 0; i < 50; i++) {
    const x = position.x + (Math.random() - 0.5) * 2;
    const y = position.y + 3 + Math.random() * 2;
    const z = position.z + (Math.random() - 0.5) * 2;
    const color = new THREE.Color(0x5d6d8e); // indigo
    const size = Math.random() * 0.1 + 0.05;

    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    sizes.push(size);
  }

  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  rainGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  const rain = new THREE.Points(rainGeo, material);
  rain.userData = { velocity: 0.05 }; // Speed of falling
  rainGroup.add(rain);
  scene.add(rainGroup);
}

// Sound
function playBloomSound(emotion, position) {
  if (!audioContext) return;

  // Create spatial audio panner
  panner = audioContext.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.maxDistance = 100;
  panner.rolloffFactor = 1;
  panner.positionX.value = position.x;
  panner.positionY.value = position.y;
  panner.positionZ.value = position.z;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  let freq = 220;
  if (emotion === 'joy') freq = 330;
  if (emotion === 'wonder') freq = 440;
  if (emotion === 'sorrow') freq = 164.81;
  
  osc.frequency.value = freq;
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
  
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 2);
}

// Memory management
function addMemory(text, emotion) {
  const memory = {
    id: Date.now(),
    text,
    emotion,
    timestamp: new Date().toISOString(),
    bloom: {
      x: (Math.random() - 0.5) * 10,
      y: 0,
      z: (Math.random() - 0.5) * 10
    }
  };

  memories.unshift(memory);
  localStorage.setItem('echo_garden_memories', JSON.stringify(memories));
  renderMemories();
  createBloom(text, emotion, memory.bloom.x, memory.bloom.y, memory.bloom.z);
  
  return memory;
}

function renderMemories() {
  if (memories.length === 0) {
    memoryContainer.innerHTML = `
      <div class="empty-state">
        <p>Your garden is quiet. <br>Press the mic to begin.</p>
      </div>
    `;
    return;
  }

  memoryContainer.innerHTML = memories.map(memory => `
    <div class="memory-card" data-id="${memory.id}">
      <p class="memory-text">${escapeHtml(memory.text)}</p>
      <p class="memory-meta">${formatDate(memory.timestamp)} • ${capitalize(memory.emotion)}</p>
    </div>
  `).join('');
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = 'status visible';
  
  if (type === 'error') statusEl.style.color = '#ff6b6b';
  else if (type === 'success') statusEl.style.color = '#7d9c6b';
  else statusEl.style.color = '#a8b2c1';

  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

// Audio init
async function initAudio() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(microphone);
    source.connect(analyser);
  } catch (err) {
    console.error('Audio access denied:', err);
    showStatus('Microphone access denied. Please enable mic in browser settings.', 'error');
    micBtn.disabled = true;
  }
}

// Main logic
micBtn.addEventListener('click', async () => {
  if (!audioContext) await initAudio();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

let isRecording = false;

async function startRecording() {
  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.querySelector('.label').textContent = 'Listening...';
  showStatus('Listening... Speak your memory.');

  const mediaRecorder = new MediaRecorder(microphone);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});

    const text = await transcribeAudio(audioBlob);
    const emotion = analyzeSentiment(text);
    
    addMemory(text, emotion);
    
    showStatus(`" ${text.substring(0, 60) + (text.length > 60 ? '...' : '')} "`, 'success');
    micBtn.classList.remove('recording');
    micBtn.querySelector('.label').textContent = 'Tap to Speak';
    isRecording = false;
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000);
}

function stopRecording() {
  // Not used currently
}

function analyzeSentiment(text) {
  if (!text) return 'neutral';
  
  const positive = ['happy', 'joy', 'love', 'beautiful', 'wonderful', 'peace', 'sun', 'light', 'warm', 'hope'];
  const negative = ['sad', 'pain', 'loss', 'dark', 'cold', 'lonely', 'fear', 'grief', 'angry', 'hurt'];
  
  const lower = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => {
    if (lower.includes(word)) score += 2;
  });
  
  negative.forEach(word => {
    if (lower.includes(word)) score -= 2;
  });
  
  if (score > 2) return 'joy';
  if (score < -2) return 'sorrow';
  if (lower.includes('dream') || lower.includes('sky') || lower.includes('star') || lower.includes('universe')) return 'wonder';
  return 'calm';
}

async function transcribeAudio(blob) {
  return '';
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Update time of day (0-1 cycle over 24 hours simulated)
  timeOfDay = (time * 0.005) % 1;

  // Update sky color based on time of day
  updateSkyColor(timeOfDay);

  // Animate ambient particles
  ambientParticles.forEach(p => {
    p.rotation.y = time * 0.05;
  });

  // Animate blooms gently
  bloomGroup.children.forEach((bloom, i) => {
    bloom.position.y = Math.sin(time * 0.5 + i) * 0.2;
    bloom.rotation.z = Math.sin(time * 0.3 + i) * 0.1;
  });

  // Animate raindrops
  rainGroup.children.forEach(rain => {
    const positions = rain.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= rain.userData.velocity;
      if (positions[i + 1] < -2) {
        positions[i + 1] = 3; // Reset to top
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  });

  // Update panner position for spatial audio
  if (panner) {
    panner.positionX.value = camera.position.x;
    panner.positionY.value = camera.position.y;
    panner.positionZ.value = camera.position.z;
  }

  // Update controls
  orbitControls.update();

  // Render with postprocessing
  composer.render();
}

function updateSkyColor(timeOfDay) {
  let color;
  if (timeOfDay < 0.25) { // Dawn
    color = CONFIG.moonColors.dawn;
  } else if (timeOfDay < 0.5) { // Day
    color = CONFIG.moonColors.day;
  } else if (timeOfDay < 0.75) { // Dusk
    color = CONFIG.moonColors.dusk;
  } else { // Night
    color = CONFIG.moonColors.night;
  }

  scene.background.setHex(color);
  scene.fog.color.setHex(color);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initThree();
  renderMemories();
  
  if (memories.length === 0) {
    setTimeout(() => {
      showStatus('Your garden is quiet. Press the mic to begin.', 'info');
    }, 1000);
  }
});
