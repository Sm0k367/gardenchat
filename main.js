// main.js — Echo Garden 3D (Immersive Voice Memory Realm)

// ────────────────────────────────────────────────
// IMPORTS & CONSTANTS
// ────────────────────────────────────────────────

import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';

// DOM
const sceneContainer = document.getElementById('scene-container');
const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const memoryContainer = document.getElementById('memory-container');
const welcomeEl = document.getElementById('welcome-message');

// State
let scene, camera, renderer, controls;
let terrain, skyLight, ambientLight;
let memories = JSON.parse(localStorage.getItem('echo_garden_memories') || '[]');
let audioRecordings = {}; // id → audio URL
let isRecording = false;
let mediaRecorder, audioChunks = [];
let microphoneStream = null;

// ────────────────────────────────────────────────
// THREE.JS SETUP
// ────────────────────────────────────────────────

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0f1a, 0.0008);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 8, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  sceneContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 8;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI * 0.48;

  // Lights
  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  skyLight = new THREE.DirectionalLight(0xffddaa, 1.2);
  skyLight.position.set(50, 80, 30);
  scene.add(skyLight);

  // Terrain
  createTerrain();

  // Ground plane (subtle reflection)
  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x112233,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  scene.add(ground);

  // Sky gradient
  scene.background = new THREE.Color(0x0a0f1a);

  // Resize handler
  window.addEventListener('resize', onResize);
  onResize();

  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Gentle wind sway on plants (simple sine)
  scene.traverse(obj => {
    if (obj.userData.isPlant) {
      const t = Date.now() * 0.001;
      obj.rotation.z = Math.sin(t + obj.position.x * 0.1) * 0.08;
      obj.rotation.x = Math.cos(t * 1.2 + obj.position.z * 0.15) * 0.06;
    }
  });

  // Day-night cycle (simple time-based)
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 20;
  skyLight.intensity = isNight ? 0.3 : 1.2;
  ambientLight.intensity = isNight ? 0.15 : 0.4;
  scene.fog.color.setHex(isNight ? 0x000814 : 0x88aaff);
  scene.background.setHex(isNight ? 0x000814 : 0x88aaff);

  renderer.render(scene, camera);
}

// ────────────────────────────────────────────────
// PROCEDURAL TERRAIN + PLANTS
// ────────────────────────────────────────────────

function createTerrain() {
  const size = 200;
  const segments = 100;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const vertices = geometry.attributes.position.array;

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const z = vertices[i + 2];
    vertices[i + 1] = Math.sin(x * 0.05) * 2 + Math.cos(z * 0.07) * 1.5 + Math.random() * 0.8;
  }

  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a3c2a,
    roughness: 0.95,
    metalness: 0.05
  });

  terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);
}

function spawnMemoryPlant(memory) {
  const group = new THREE.Group();
  group.userData = { memoryId: memory.id, isPlant: true };

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 3 + Math.random() * 2, 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5c3a });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemGeo.parameters.height / 2;
  group.add(stem);

  // Flower head (simple sphere + petals)
  const headSize = 0.8 + Math.random() * 0.6;
  const headGeo = new THREE.SphereGeometry(headSize, 16, 12);
  let headColor;

  switch (memory.emotion) {
    case 'joy':     headColor = 0xffd93d; break;
    case 'sorrow':  headColor = 0x6ab7f5; break;
    case 'wonder':  headColor = 0xa78bfa; break;
    case 'calm':    headColor = 0x95e1d3; break;
    default:        headColor = 0xe0f0ff;
  }

  const headMat = new THREE.MeshStandardMaterial({ color: headColor, emissive: headColor, emissiveIntensity: 0.3 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = stemGeo.parameters.height + headSize * 0.4;
  group.add(head);

  // Simple petals (torus segments)
  for (let i = 0; i < 8; i++) {
    const petalGeo = new THREE.TorusGeometry(headSize * 0.6, headSize * 0.15, 8, 16);
    const petal = new THREE.Mesh(petalGeo, headMat);
    petal.rotation.x = Math.PI / 2;
    petal.position.y = head.position.y;
    petal.rotation.z = (i / 8) * Math.PI * 2;
    petal.position.x = Math.cos(petal.rotation.z) * headSize * 0.8;
    petal.position.z = Math.sin(petal.rotation.z) * headSize * 0.8;
    group.add(petal);
  }

  // Random position on terrain
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 60;
  group.position.x = Math.cos(angle) * radius;
  group.position.z = Math.sin(angle) * radius;

  // Slight height adjustment from terrain
  group.position.y = 0.5 + Math.random() * 1;

  // Click interaction
  group.userData.clickable = true;

  scene.add(group);
  return group;
}

// ────────────────────────────────────────────────
// AUDIO & MEMORY LOGIC
// ────────────────────────────────────────────────

async function initMic() {
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    showStatus('Microphone access denied.', 'error');
    micBtn.disabled = true;
  }
}

function showStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.classList.add('visible');
  if (type === 'error') statusEl.style.color = '#ff6b6b';
  if (type === 'success') statusEl.style.color = '#7d9c6b';
  setTimeout(() => statusEl.classList.remove('visible'), 4000);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function analyzeSentiment(text) {
  if (!text) return 'neutral';
  const pos = ['happy','joy','love','great','beautiful','peace','light','hope'];
  const neg = ['sad','pain','dark','lonely','fear','hurt','angry'];
  let score = 0;
  const lower = text.toLowerCase();
  pos.forEach(w => { if (lower.includes(w)) score += 2; });
  neg.forEach(w => { if (lower.includes(w)) score -= 2; });
  if (score > 2) return 'joy';
  if (score < -2) return 'sorrow';
  if (lower.includes('dream') || lower.includes('star') || lower.includes('wonder')) return 'wonder';
  return 'calm';
}

function renderMemoriesList() {
  if (memories.length === 0) {
    memoryContainer.innerHTML = '<h2>Your Echo Garden</h2><p>Your garden is quiet. Speak to plant the first seed.</p>';
    return;
  }

  memoryContainer.innerHTML = '<h2>Your Echo Garden</h2>' + memories.map(m => `
    <div class="memory-card ${m.emotion}">
      <div class="memory-text">${escapeHtml(m.text || '[Silent echo]')}</div>
      <div class="memory-meta">${formatDate(m.timestamp)} • ${m.emotion}</div>
    </div>
  `).join('');
}

async function startRecording() {
  if (!microphoneStream) await initMic();
  if (!microphoneStream) return;

  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.querySelector('.label').textContent = 'Listening...';
  showStatus('Speak your memory... (10s max)');

  mediaRecorder = new MediaRecorder(microphoneStream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);

    // Attempt transcription (Web Speech fallback – often limited)
    let text = await attemptTranscription();
    const emotion = analyzeSentiment(text);

    const memory = {
      id: Date.now(),
      text,
      emotion,
      timestamp: new Date().toISOString()
    };

    memories.unshift(memory);
    audioRecordings[memory.id] = url;
    localStorage.setItem('echo_garden_memories', JSON.stringify(memories));

    // Spawn 3D plant
    spawnMemoryPlant(memory);

    // Echo particle burst at random position
    createEchoParticles(memory.position || new THREE.Vector3(0,5,0));

    showStatus(`Memory planted: "${text.slice(0,40)}${text.length>40?'...':''}"`, 'success');
    renderMemoriesList();

    micBtn.classList.remove('recording');
    micBtn.querySelector('.label').textContent = 'Tap to Speak';
    isRecording = false;
  };

  mediaRecorder.start();
  setTimeout(() => {
    if (isRecording) mediaRecorder.stop();
  }, 10000);
}

async function attemptTranscription() {
  // Placeholder: real transcription needs more advanced API or live recognition
  // For now, return placeholder or integrate if SpeechRecognition supports blob playback
  return new Promise(resolve => {
    // Simulate or use very basic live recognition if possible
    setTimeout(() => resolve('Echo of a beautiful moment...'), 500);
  });
}

function createEchoParticles(position) {
  const particleCount = 80;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = 0.2 + Math.random() * 2;
    positions[i]     = position.x + r * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = position.y + r * Math.cos(phi);
    positions[i + 2] = position.z + r * Math.sin(phi) * Math.sin(theta);

    colors[i] = Math.random() * 0.5 + 0.5;
    colors[i+1] = Math.random() * 0.5 + 0.5;
    colors[i+2] = 1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Animate outward burst & fade
  let t = 0;
  const animateBurst = () => {
    t += 0.016;
    particles.scale.setScalar(1 + t * 8);
    material.opacity = Math.max(0, 1 - t * 1.5);
    if (t < 2) requestAnimationFrame(animateBurst);
    else scene.remove(particles);
  };
  animateBurst();
}

// ────────────────────────────────────────────────
// INTERACTION: Click to replay memory
// ────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (let obj of intersects) {
    let target = obj.object;
    while (target && !target.userData.memoryId) {
      target = target.parent;
    }
    if (target && target.userData.memoryId) {
      const id = target.userData.memoryId;
      if (audioRecordings[id]) {
        const audio = new Audio(audioRecordings[id]);
        audio.volume = 0.7;
        audio.play().catch(() => showStatus('Autoplay blocked – tap again', 'info'));
        showStatus('Echo replaying...', 'success');
      }
      break;
    }
  }
}

window.addEventListener('click', onClick);
window.addEventListener('touchstart', e => {
  if (e.touches.length === 1) onClick(e.touches[0]);
});

// ────────────────────────────────────────────────
// INIT & EVENT LISTENERS
// ────────────────────────────────────────────────

micBtn.addEventListener('click', () => {
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  } else {
    startRecording();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initThree();

  // Load existing memories into 3D
  memories.forEach(m => {
    spawnMemoryPlant(m);
    // Note: audio URLs lost on reload – could use IndexedDB for persistence if needed
  });

  renderMemoriesList();

  if (memories.length === 0) {
    welcomeEl.style.opacity = 1;
    setTimeout(() => { welcomeEl.style.opacity = 0; }, 8000);
  }
});
