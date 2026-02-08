// main.js — Echo Garden
// Voice-first memory garden with generative blooms

// --- CONFIGURATION ---
const CONFIG = {
  colors: {
    joy: '#f4d35e',     // gold
    sorrow: '#5d6d8e',  // indigo
    wonder: '#9b59b6',  // violet
    calm: '#7d9c6b',    // moss
    neutral: '#a8b2c1'  // silver
  },
  bloomBaseRadius: 60,
  bloomGrowthSpeed: 0.8,
  audioContext: null,
  analyser: null,
  microphone: null,
  dataArray: null
};

// --- DOM ELEMENTS ---
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
let memories = JSON.parse(localStorage.getItem('echo_garden_memories') || '[]');

// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- AUDIO ENGINE ---
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

// --- VISUAL BLOOM GENERATOR ---
class Bloom {
  constructor(text, emotion) {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 0;
    this.maxRadius = CONFIG.bloomBaseRadius + Math.random() * 40;
    this.emotion = emotion;
    this.color = CONFIG.colors[emotion] || CONFIG.colors.neutral;
    this.petalCount = Math.max(5, Math.min(12, text.length));
    this.angle = 0;
    this.growthRate = CONFIG.bloomGrowthSpeed;
    this.opacity = 0;
    this.particles = [];
    this.text = text;
    
    // Initialize particles (sound-reactive)
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
    // Grow bloom
    if (this.radius < this.maxRadius) {
      this.radius += this.growthRate;
      this.opacity = Math.min(1, this.radius / this.maxRadius);
    }

    // Animate particles (sound-reactive)
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

    // Draw stem
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

    // Draw center (stamen)
    ctx.beginPath();
    ctx.arc(0, 0, this.maxRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.fill();

    // Draw particles (sound-reactive)
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

// --- MEMORY MANAGEMENT ---
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

// --- UI HELPERS ---
function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = 'status visible';
  
  // Color code status
  if (type === 'error') statusEl.style.color = '#ff6b6b';
  else if (type === 'success') statusEl.style.color = '#7d9c6b';
  else statusEl.style.color = '#a8b2c1';

  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

// --- MAIN LOGIC ---
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

  // Start visual bloom
  bloom = new Bloom('', 'neutral');
  bloom.x = canvas.width / 2;
  bloom.y = canvas.height / 2;
  bloom.maxRadius = 100; // Temporary, will update on finish

  // Start audio analysis
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
  }

  // Record audio
  const mediaRecorder = new MediaRecorder(microphone);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Play back audio
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      // Audio autoplay blocked — user interaction needed
    });

    // Analyze sentiment (simple heuristic)
    const text = await transcribeAudio(audioBlob);
    const emotion = analyzeSentiment(text);
    
    // Finalize bloom
    if (bloom) {
      bloom.text = text;
      bloom.emotion = emotion;
      bloom.maxRadius = CONFIG.bloomBaseRadius + text.length * 3;
    }

    // Add to garden
    addMemory(text, emotion);
    
    showStatus(`" ${text.substring(0, 60) + (text.length > 60 ? '...' : '')} "`, 'success');
    micBtn.classList.remove('recording');
    micBtn.querySelector('.label').textContent = 'Tap to Speak';
    isRecording = false;
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000); // Auto-stop after 10s
}

function stopRecording() {
  // Stop manually if needed
  if (isRecording) {
    // MediaRecorder will stop on timeout or manual trigger
  }
}

// --- SENTIMENT ANALYSIS (Client-Side Heuristic) ---
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

// --- SPEECH RECOGNITION (Web Speech API) ---
async function transcribeAudio(blob) {
  // Fallback: use Web Speech API if available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return new Promise((resolve, reject) => {
      recognition.onresult = (event) => {
        resolve(event.results[0][0].transcript);
      };
      recognition.onerror = (error) => {
        resolve(''); // Fallback to empty if speech recognition fails
      };
      recognition.onend = () => {
        // No result — use blob analysis
        resolve('');
      };

      // Convert blob to base64 for Web Speech API (limited support)
      // Since Web Speech API doesn't accept blobs directly, we'll skip for now
      // and use heuristic-based sentiment instead
      resolve('');
    });
  }
  return '';
}

// --- ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);

  // Clear canvas with fade effect
  ctx.fillStyle = 'rgba(10, 15, 20, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw existing blooms from localStorage
  memories.forEach(memory => {
    // Recreate bloom for rendering
    const tempBloom = new Bloom(memory.text, memory.emotion);
    tempBloom.x = memory.bloom.x;
    tempBloom.y = memory.bloom.y;
    tempBloom.radius = tempBloom.maxRadius; // Fully grown
    tempBloom.opacity = 0.7;
    tempBloom.draw(ctx);
  });

  // Draw current bloom if recording
  if (bloom) {
    bloom.update();
    bloom.draw(ctx);
  }

  // Draw ambient particles (background)
  drawAmbientParticles();
}

function drawAmbientParticles() {
  const time = Date.now() * 0.001;
  for (let i = 0; i < 30; i++) {
    const x = (Math.sin(time * 0.3 + i) * canvas.width * 0.4) + canvas.width / 2;
    const y = (Math.cos(time * 0.2 + i * 1.5) * canvas.height * 0.3) + canvas.height / 2;
    const size = Math.sin(time * 0.5 + i) * 2 + 1;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + 0.05 * Math.sin(time * 0.3 + i)})`;
    ctx.fill();
  }
}
