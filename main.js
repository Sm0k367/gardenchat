// main.js — Echo Garden (Garden-Ready Version)
// Voice-first memory garden with generative blooms

const CONFIG = {
  colors: {
    joy: '#f4d35e',
    sorrow: '#5d6d8e',
    wonder: '#9b59b6',
    calm: '#7d9c6b',
    neutral: '#a8b2c1'
  },
  bloomBaseRadius: 60,
  bloomGrowthSpeed: 0.3, // Slower = more organic
  audioContext: null,
  analyser: null,
  microphone: null,
  dataArray: null
};

// DOM elements
const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');
const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const memoryContainer = document.getElementById('memory-container');

// State
let isRecording = false;
let audioContext = null;
let analyser = null;
let microphone = null;
let dataArray = null;
let bloom = null;
let ambientParticles = [];
let memories = JSON.parse(localStorage.getItem('echo_garden_memories') || '[]');

// ✨ NEW: Initialize ambient particles (pollen, soft light)
function initAmbientParticles() {
  ambientParticles = [];
  for (let i = 0; i < 50; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? '#fff' : '#f4d35e'
    });
  }
}

// ✨ NEW: Play gentle sound when bloom blooms
function playBloomSound(emotion) {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  // Frequency based on emotion
  let freq = 220; // A3
  if (emotion === 'joy') freq = 330; // E4
  if (emotion === 'wonder') freq = 440; // A4
  if (emotion === 'sorrow') freq = 164.81; // E3
  
  osc.frequency.value = freq;
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start();
  osc.stop(audioContext.currentTime + 2);
}

// Bloom class (enhanced for saved memories)
class Bloom {
  constructor(text, emotion, x, y) {
    this.x = x || canvas.width / 2;
    this.y = y || canvas.height / 2;
    this.radius = 0;
    this.maxRadius = CONFIG.bloomBaseRadius + Math.min(100, text.length * 3);
    this.emotion = emotion;
    this.color = CONFIG.colors[emotion] || CONFIG.colors.neutral;
    this.petalCount = Math.max(5, Math.min(12, text.length));
    this.angle = 0;
    this.growthRate = CONFIG.bloomGrowthSpeed;
    this.opacity = 0;
    this.particles = [];
    this.text = text;
    this.createdAt = Date.now();
    
    // Initialize particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * this.maxRadius,
        speed: Math.random() * 0.05 + 0.01,
        offset: Math.random() * Math.PI * 2
      });
    }
  }

  update() {
    // Grow bloom slowly (like real plant)
    if (this.radius < this.maxRadius) {
      this.radius += this.growthRate;
      this.opacity = Math.min(1, this.radius / this.maxRadius);
    }

    // Animate particles
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const intensity = avg / 255;
      
      this.particles.forEach(p => {
        p.angle += p.speed + intensity * 0.1;
        p.radius = this.maxRadius * (0.7 + intensity * 0.6);
      });
    }
  }

  draw(ctx) {
    if (this.opacity <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.opacity;

    // Draw stem (curved)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, -this.maxRadius * 0.5, 0, -this.maxRadius * 1.5);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw leaves
    this.drawLeaf(0, -this.maxRadius * 0.8, -0.5);
    this.drawLeaf(0, -this.maxRadius * 0.8, 0.5);

    // Draw petals
    for (let i = 0; i < this.petalCount; i++) {
      const angle = (i / this.petalCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -this.maxRadius * 0.3);
      ctx.rotate(-Math.PI / 2);

      // Petal shape
      ctx.beginPath();
      ctx.ellipse(0, 0, this.maxRadius * 0.4, this.maxRadius * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Petal gradient
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.maxRadius * 0.8);
      grad.addColorStop(0, this.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
    }

    // Draw center
    ctx.beginPath();
    ctx.arc(0, 0, this.maxRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fill();

    // Draw particles
    ctx.globalAlpha = 0.6;
    this.particles.forEach(p => {
      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });

    ctx.restore();
  }

  drawLeaf(x, y, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
  }
}

// ✨ NEW: Render saved memories as blooms
function renderBloom(memories) {
  memories.forEach(memory => {
    const bloom = new Bloom(memory.text, memory.emotion, memory.bloom.x, memory.bloom.y);
    bloom.radius = bloom.maxRadius; // Fully grown
    bloom.opacity = 0.7;
    bloom.draw(ctx);
  });
}

// ✨ NEW: Draw ambient particles
function drawAmbientParticles() {
  ambientParticles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    
    // Wrap around screen
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Memory management
function addMemory(text, emotion) {
  const memory = {
    id: Date.now(),
    text,
    emotion,
    timestamp: new Date().toISOString(),
    bloom: {
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 200) + 100,
      color: CONFIG.colors[emotion] || CONFIG.colors.neutral
    }
  };

  memories.unshift(memory);
  localStorage.setItem('echo_garden_memories', JSON.stringify(memories));
  renderMemories();
  
  // ✨ NEW: Play bloom sound
  playBloomSound(emotion);
  
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

async function startRecording() {
  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.querySelector('.label').textContent = 'Listening...';
  showStatus('Listening... Speak your memory.');

  bloom = new Bloom('', 'neutral');
  bloom.x = canvas.width / 2;
  bloom.y = canvas.height / 2;
  bloom.maxRadius = 100;

  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
  }

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
    
    if (bloom) {
      bloom.text = text;
      bloom.emotion = emotion;
      bloom.maxRadius = CONFIG.bloomBaseRadius + text.length * 3;
    }

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
  // Fallback to empty if speech recognition fails
  return '';
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Clear canvas with fade
  ctx.fillStyle = 'rgba(10, 15, 20, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ✨ NEW: Draw ambient particles
  drawAmbientParticles();

  // ✨ NEW: Draw saved memory blooms
  renderBloom(memories);

  // Draw current bloom if recording
  if (bloom) {
    bloom.update();
    bloom.draw(ctx);
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initAmbientParticles();
  renderMemories();
  animate();
  
  if (memories.length === 0) {
    setTimeout(() => {
      showStatus('Your garden is quiet. Press the mic to begin.', 'info');
    }, 1000);
  }
});
